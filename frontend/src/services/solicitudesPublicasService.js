import api from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost/unicreditos/backend/api";

// ─── Servicio de solicitudes públicas (preinscripción desde la landing) ──────
// "enviar" es la única acción que NO requiere autenticación.
const solicitudesPublicasService = {
  // ─── Pública: enviar preinscripción ──────────────────────────────────────
  enviar: async (datos) => {
    const res = await api.post("/solicitudes_publicas.php?accion=enviar", datos);
    return res.data;
  },

  // ─── Pública: enviar preinscripción Brilla (con archivos, sin codeudor) ──
  enviarBrilla: async (formData) => {
    const res = await api.post("/solicitudes_publicas.php?accion=enviar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ─── Admin: listar solicitudes ───────────────────────────────────────────
  getTodas: async (filtros = {}) => {
    const params = new URLSearchParams({ accion: "listar", ...filtros });
    const res = await api.get(`/solicitudes_publicas.php?${params}`);
    return res.data;
  },

  // ─── Admin: actualizar estado ────────────────────────────────────────────
  actualizarEstado: async (id, estado) => {
    const res = await api.put("/solicitudes_publicas.php?accion=actualizar_estado", { id, estado });
    return res.data;
  },

  // ─── Admin: convertir la preinscripción en cuenta + crédito real ─────────
  convertir: async (id) => {
    const res = await api.post("/solicitudes_publicas.php?accion=convertir", { id });
    return res.data;
  },

  // ─── Admin: ver los documentos adjuntos de una solicitud (Brilla, etc.) ──
  getDocumentos: async (solicitudId) => {
    const res = await api.get(`/solicitudes_publicas.php?accion=documentos&solicitud_id=${solicitudId}`);
    return res.data;
  },

  // ─── Admin: URL para ver/descargar un documento adjunto ──────────────────
  urlDocumentoAdmin: (documentoId) => {
    const token = localStorage.getItem("token");
    return `${API_URL}/solicitudes_publicas.php?accion=descargar_documento_admin&documento_id=${documentoId}&token=${token}`;
  },

  // ─── Pública (por token): datos mínimos para el codeudor ─────────────────
  obtenerDatosCodeudor: async (token) => {
    const res = await api.get(`/solicitudes_publicas.php?accion=datos_codeudor&token=${token}`);
    return res.data;
  },

  // ─── Pública (por token): el codeudor firma ──────────────────────────────
  firmarCodeudor: async (token, firmaCodeudor) => {
    const res = await api.post("/solicitudes_publicas.php?accion=firmar_codeudor", { token, firma_codeudor: firmaCodeudor });
    return res.data;
  },

  // ─── Pública (con verificación de correo): URL del documento generado ────
  // Se usa directo en un <a href=...> — no requiere sesión, solo que el
  // correo coincida con el de la solicitud (verificado en el backend).
  urlDocumentoGenerado: (solicitudId, tipo, email) => {
    const params = new URLSearchParams({ accion: "descargar_generado", solicitud_id: solicitudId, tipo, email });
    return `${API_URL}/solicitudes_publicas.php?${params}`;
  },
};

export default solicitudesPublicasService;