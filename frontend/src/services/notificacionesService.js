import api from "./api";

const notificacionesService = {
  // ─── Mis notificaciones (según rol, el backend decide qué mostrar) ────────
  getMisNotificaciones: async () => {
    const res = await api.get("/notificaciones.php?accion=mis_notificaciones");
    return res.data;
  },

  marcarLeida: async (id) => {
    const res = await api.put("/notificaciones.php?accion=marcar_leida", { id });
    return res.data;
  },

  marcarTodasLeidas: async () => {
    const res = await api.put("/notificaciones.php?accion=marcar_todas_leidas");
    return res.data;
  },
};

export default notificacionesService;