import api from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost/unicreditos/backend/api";

const documentosService = {

  // ─── Estudiante: ver mis documentos por crédito ───────────────────────────
  getMisDocumentos: async (creditoId) => {
    const res = await api.get(`/documentos.php?accion=mis_documentos&credito_id=${creditoId}`);
    return res.data;
  },

  // ─── Admin: ver todos los documentos ──────────────────────────────────────
  getTodos: async (filtros = {}) => {
    const params = new URLSearchParams({ accion: "todos", ...filtros });
    const res = await api.get(`/documentos.php?${params}`);
    return res.data;
  },

  // ─── Estudiante: subir documento ──────────────────────────────────────────
  // Usa FormData porque es una subida de archivo
  // onProgress (opcional): callback(porcentaje) para la barra de progreso
  subir: async (creditoId, tipo, archivo, onProgress) => {
    const formData = new FormData();
    formData.append("credito_id", creditoId);
    formData.append("tipo", tipo);
    formData.append("archivo", archivo);

    const res = await api.post("/documentos.php?accion=subir", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: onProgress
        ? (evt) => onProgress(Math.round((evt.loaded * 100) / evt.total))
        : undefined,
    });
    return res.data;
  },

  // ─── Admin: aprobar o rechazar documento ──────────────────────────────────
  revisar: async (id, estado, observacion = null) => {
    const res = await api.put("/documentos.php?accion=revisar", {
      id, estado, observacion,
    });
    return res.data;
  },

  // ─── Descargar documento ──────────────────────────────────────────────────
  getUrlDescarga: (id) => {
    const token = localStorage.getItem("token");
    return `${API_URL}/documentos.php?accion=descargar&id=${id}&token=${token}`;
  },
};

export default documentosService;