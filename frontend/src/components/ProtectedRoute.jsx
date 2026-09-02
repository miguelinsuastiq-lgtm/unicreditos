import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Uso en App.jsx:
//   <ProtectedRoute>           → solo requiere estar autenticado
//   <ProtectedRoute rol="admin"> → solo permite el rol indicado
function ProtectedRoute({ children, rol }) {
  const { isAuthenticated, user, loading } = useAuth();

  // Mientras verifica la sesión guardada, no renderiza nada
  if (loading) return null;

  // Si no está autenticado, va al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si se requiere un rol específico y el usuario no lo tiene
  if (rol && user?.rol !== rol) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;