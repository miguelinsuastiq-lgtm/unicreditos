import api from "./api";

const creditosService = {

  // ─── Estudiante: ver mis créditos ─────────────────────────────────────────
  getMisCreditos: async () => {
    const res = await api.get("/creditos.php?accion=mis_creditos");
    return res.data;
  },

  // ─── Estudiante/Admin: ver detalle de un crédito ──────────────────────────
  getDetalle: async (id) => {
    const res = await api.get(`/creditos.php?accion=detalle&id=${id}`);
    return res.data;
  },

  // ─── Estudiante: solicitar nuevo crédito ──────────────────────────────────
  solicitar: async (datos) => {
    const res = await api.post("/creditos.php?accion=solicitar", datos);
    return res.data;
  },

  // ─── Admin: ver todos los créditos ────────────────────────────────────────
  getTodos: async (filtros = {}) => {
    const params = new URLSearchParams({ accion: "todos", ...filtros });
    const res = await api.get(`/creditos.php?${params}`);
    return res.data;
  },

  // ─── Admin: actualizar estado de un crédito ───────────────────────────────
  actualizar: async (id, estado, observacion = null) => {
    const res = await api.put("/creditos.php?accion=actualizar", {
      id, estado, observacion,
    });
    return res.data;
  },

  // ─── Admin: completar datos financieros ───────────────────────────────────
  completar: async (id, datos) => {
    const res = await api.put("/creditos.php?accion=completar", {
      id, ...datos,
    });
    return res.data;
  },
};

export default creditosService;