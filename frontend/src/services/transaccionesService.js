import api from "./api";

const transaccionesService = {

  // ─── Estudiante: ver mis transacciones ────────────────────────────────────
  getMisTransacciones: async (creditoId = null, tipo = null, orden = "desc") => {
    const params = new URLSearchParams({ accion: "mis_transacciones", orden });
    if (creditoId) params.append("credito_id", creditoId);
    if (tipo)      params.append("tipo", tipo);
    const res = await api.get(`/transacciones.php?${params}`);
    return res.data;
  },

  // ─── Admin: ver todas las transacciones ───────────────────────────────────
  getTodas: async (filtros = {}) => {
    const params = new URLSearchParams({ accion: "todas", ...filtros });
    const res = await api.get(`/transacciones.php?${params}`);
    return res.data;
  },

  // ─── Detalle de una transacción ───────────────────────────────────────────
  getDetalle: async (id) => {
    const res = await api.get(`/transacciones.php?accion=detalle&id=${id}`);
    return res.data;
  },

  // ─── Admin: resumen financiero global ─────────────────────────────────────
  getResumen: async () => {
    const res = await api.get("/transacciones.php?accion=resumen");
    return res.data;
  },
};

export default transaccionesService;