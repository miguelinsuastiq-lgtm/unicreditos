import api from "./api";

const usuariosService = {

  // ─── Admin: ver todos los usuarios ────────────────────────────────────────
  getTodos: async (filtros = {}) => {
    const params = new URLSearchParams({ accion: "todos", ...filtros });
    const res = await api.get(`/usuarios.php?${params}`);
    return res.data;
  },

  // ─── Cualquier usuario: ver su propio perfil ──────────────────────────────
  getPerfil: async () => {
    const res = await api.get("/usuarios.php?accion=perfil");
    return res.data;
  },

  // ─── Admin: ver detalle de un usuario ─────────────────────────────────────
  getDetalle: async (id) => {
    const res = await api.get(`/usuarios.php?accion=detalle&id=${id}`);
    return res.data;
  },

  // ─── Admin: crear usuario ─────────────────────────────────────────────────
  crear: async (datos) => {
    const res = await api.post("/usuarios.php?accion=crear", datos);
    return res.data;
  },

  // ─── Admin: actualizar datos de un usuario ────────────────────────────────
  actualizar: async (id, datos) => {
    const res = await api.put("/usuarios.php?accion=actualizar", {
      id, ...datos,
    });
    return res.data;
  },

  // ─── Admin: cambiar estado activo/inactivo ────────────────────────────────
  cambiarEstado: async (id, estado) => {
    const res = await api.put("/usuarios.php?accion=cambiar_estado", {
      id, estado,
    });
    return res.data;
  },

  // ─── Cambiar contraseña ───────────────────────────────────────────────────
  cambiarPassword: async (id, nuevaPassword, passwordActual = null) => {
    const res = await api.put("/usuarios.php?accion=cambiar_pass", {
      id,
      nueva_password:  nuevaPassword,
      password_actual: passwordActual,
    });
    return res.data;
  },

  // ─── Admin: eliminar usuario ──────────────────────────────────────────────
  eliminar: async (id) => {
    const res = await api.delete(`/usuarios.php?accion=eliminar&id=${id}`);
    return res.data;
  },
};

export default usuariosService;