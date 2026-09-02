import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// ─── Páginas ──────────────────────────────────────────────────────────────────
import Home         from "./pages/Home";
import Solicitud    from "./pages/Solicitud";
import FirmarCodeudor from "./pages/FirmarCodeudor";
import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import Creditos     from "./pages/Creditos";
import Documentos   from "./pages/Documentos";
import Facturacion  from "./pages/Facturacion";
import Transacciones from "./pages/Transacciones";
import Pagares      from "./pages/Pagares";
import Usuarios     from "./pages/Usuarios";
import Solicitudes  from "./pages/Solicitudes";
import NotFound     from "./pages/NotFound";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Ruta pública: Login */}
          <Route path="/login" element={<Login />} />

          {/* Ruta raíz → landing pública informativa */}
          <Route path="/" element={<Home />} />

          {/* Ruta pública: formulario de solicitud de crédito */}
          <Route path="/solicitud" element={<Solicitud />} />
          <Route path="/firmar-codeudor/:token" element={<FirmarCodeudor />} />

          {/* ─── Rutas protegidas (cualquier usuario autenticado) ─────────── */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />

          <Route path="/creditos" element={
            <ProtectedRoute><Creditos /></ProtectedRoute>
          } />

          <Route path="/documentos" element={
            <ProtectedRoute><Documentos /></ProtectedRoute>
          } />

          <Route path="/facturacion" element={
            <ProtectedRoute><Facturacion /></ProtectedRoute>
          } />

          <Route path="/transacciones" element={
            <ProtectedRoute><Transacciones /></ProtectedRoute>
          } />

          <Route path="/pagares" element={
            <ProtectedRoute><Pagares /></ProtectedRoute>
          } />

          {/* ─── Ruta protegida solo para admin ──────────────────────────── */}
          <Route path="/usuarios" element={
            <ProtectedRoute rol="admin"><Usuarios /></ProtectedRoute>
          } />

          <Route path="/solicitudes" element={
            <ProtectedRoute rol="admin"><Solicitudes /></ProtectedRoute>
          } />

          {/* Cualquier ruta desconocida → landing */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;