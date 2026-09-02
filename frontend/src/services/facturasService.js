import api from "./api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost/unicreditos/backend/api";

const facturasService = {

  // ─── Estudiante: ver mis facturas ─────────────────────────────────────────
  getMisFacturas: async (creditoId = null, estado = null) => {
    const params = new URLSearchParams({ accion: "mis_facturas" });
    if (creditoId) params.append("credito_id", creditoId);
    if (estado)    params.append("estado", estado);
    const res = await api.get(`/facturacion.php?${params}`);
    return res.data;
  },

  // ─── Admin: ver todas las facturas ────────────────────────────────────────
  getTodas: async (filtros = {}) => {
    const params = new URLSearchParams({ accion: "todas", ...filtros });
    const res = await api.get(`/facturacion.php?${params}`);
    return res.data;
  },

  // ─── Detalle de una factura ───────────────────────────────────────────────
  getDetalle: async (id) => {
    const res = await api.get(`/facturacion.php?accion=detalle&id=${id}`);
    return res.data;
  },

  // ─── Registrar pago de una factura ────────────────────────────────────────
  pagar: async (facturaId, metodoPago, referencia = null) => {
    const res = await api.post("/facturacion.php?accion=pagar", {
      factura_id:  facturaId,
      metodo_pago: metodoPago,
      referencia,
    });
    return res.data;
  },

  // ─── Estudiante: reportar pago con comprobante (foto/PDF) ─────────────────
  // Usa FormData porque incluye la subida del archivo del comprobante.
  reportarPago: async (facturaId, metodoPago, referencia, archivoComprobante) => {
    const formData = new FormData();
    formData.append("factura_id", facturaId);
    formData.append("metodo_pago", metodoPago);
    formData.append("referencia", referencia);
    formData.append("comprobante", archivoComprobante);
    const res = await api.post("/facturacion.php?accion=reportar_pago", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ─── Ver el comprobante subido (estudiante dueño o admin) ─────────────────
  urlComprobante: (facturaId) => {
    const token = localStorage.getItem("token");
    return `${API_URL}/facturacion.php?accion=descargar_comprobante&factura_id=${facturaId}&token=${token}`;
  },

  // ─── Admin: generar cuotas de un crédito ──────────────────────────────────
  generarCuotas: async (creditoId) => {
    const res = await api.post("/facturacion.php?accion=generar_cuotas", {
      credito_id: creditoId,
    });
    return res.data;
  },

  // ─── Admin: marcar facturas vencidas ──────────────────────────────────────
  marcarVencidas: async () => {
    const res = await api.put("/facturacion.php?accion=marcar_vencida");
    return res.data;
  },
};

export default facturasService;