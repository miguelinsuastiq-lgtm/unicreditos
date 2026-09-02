import { createContext, useContext, useState, useEffect } from "react";
import authService from "../services/authService";

// ─── Crear el contexto ────────────────────────────────────────────────────────
const AuthContext = createContext(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
// Envuelve toda la app en App.jsx — cualquier componente puede leer el estado de sesión
export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true); // evita parpadeo al recargar

  // Al montar, recupera la sesión guardada en localStorage
  useEffect(() => {
    const savedUser  = authService.getCurrentUser();
    const savedToken = localStorage.getItem("token");

    if (savedUser && savedToken) {
      setUser(savedUser);
      setToken(savedToken);
    }

    setLoading(false);
  }, []);

  // ─── Login ────────────────────────────────────────────────────────────────
  const login = async (codigo, password) => {
    const data = await authService.login(codigo, password);
    // Retorna la respuesta completa del backend
    // Si requires_2fa: true → Login.jsx maneja el paso 2
    // Si requires_2fa: false → Login.jsx navega al dashboard
    return data;
  };

  // ─── Verificar 2FA ────────────────────────────────────────────────────────
  const verify2FA = async (codigo_2fa, temp_token) => {
    const data = await authService.verify2FA(codigo_2fa, temp_token);
    // Aquí sí guardamos token y user — el backend los retorna tras el 2FA
    setUser(data.user);
    setToken(data.token);
    return data;
  };

  // ─── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  // ─── Helpers de rol ───────────────────────────────────────────────────────
  const isAdmin      = user?.rol === "admin";
  const isEstudiante = user?.rol === "estudiante";

  const value = {
    user,
    token,
    loading,
    login,
    verify2FA,
    logout,
    isAdmin,
    isEstudiante,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook personalizado ───────────────────────────────────────────────────────
// Uso: const { user, login, logout, isAdmin } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return context;
}

export default AuthContext;