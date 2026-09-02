import api from "./api";

const pagaresService = {

  // ─── Estudiante: ver mis pagarés ──────────────────────────────────────────
  getMisPagares: async () => {
    const res = await api.get("/pagares.php?accion=mis_pagares");
    return res.data;
  },

  // ─── Admin: ver todos los pagarés ─────────────────────────────────────────
  getTodos: async (filtros = {}) => {
    const params = new URLSearchParams({ accion: "todos", ...filtros });
    const res = await api.get(`/pagares.php?${params}`);
    return res.data;
  },

  // ─── Detalle de un pagaré ─────────────────────────────────────────────────
  getDetalle: async (id) => {
    const res = await api.get(`/pagares.php?accion=detalle&id=${id}`);
    return res.data;
  },

  // ─── Estudiante: solicitar código OTP para firmar ─────────────────────────
  solicitar2FA: async (pagareId) => {
    const res = await api.post("/pagares.php?accion=solicitar_2fa", {
      pagare_id: pagareId,
    });
    return res.data;
  },

  // ─── Estudiante: firmar pagaré con OTP ────────────────────────────────────
  firmar: async (pagareId, codigoOtp) => {
    const res = await api.post("/pagares.php?accion=firmar", {
      pagare_id:  pagareId,
      codigo_otp: codigoOtp,
    });
    return res.data;
  },

  // ─── Admin: generar pagaré para un crédito ────────────────────────────────
  generar: async (creditoId, fechaVencimiento = null) => {
    const res = await api.post("/pagares.php?accion=generar", {
      credito_id:       creditoId,
      fecha_vencimiento: fechaVencimiento,
    });
    return res.data;
  },
};

export default pagaresService;