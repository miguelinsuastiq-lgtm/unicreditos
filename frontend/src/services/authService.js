import api from "./api";

const authService = {
  // ─── Login ────────────────────────────────────────────────────────────────
  login: async (codigo, password) => {
    const response = await api.post("/auth.php", {
      action: "login",
      codigo,
      password,
    });
    // Retorna la respuesta completa — Login.jsx maneja el flujo 2FA
    return response.data;
  },

  // ─── Verificar 2FA ────────────────────────────────────────────────────────
  verify2FA: async (codigo_2fa, temp_token) => {
    const response = await api.post("/auth.php", {
      action: "verify_2fa",
      codigo_2fa,
      temp_token,
    });

    const { token, user } = response.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));

    return { token, user };
  },

  // ─── Logout ───────────────────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  // ─── Obtener usuario actual ───────────────────────────────────────────────
  getCurrentUser: () => {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  },

  // ─── Verificar si está autenticado ───────────────────────────────────────
  isAuthenticated: () => {
    return !!localStorage.getItem("token");
  },

  // ─── Obtener rol del usuario ──────────────────────────────────────────────
  getRole: () => {
    const user = authService.getCurrentUser();
    return user?.rol || null;
  },
};

export default authService;