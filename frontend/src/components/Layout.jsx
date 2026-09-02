import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import NotificationBell from "./NotificationBell";
import { useAuth } from "../context/AuthContext";

const PAGE_TITLES = {
  "/dashboard":     "Inicio",
  "/creditos":      "Gestión de Créditos",
  "/documentos":    "Documentos",
  "/facturacion":   "Facturación",
  "/transacciones": "Transacciones",
  "/pagares":       "Pagarés Digitales",
  "/usuarios":      "Gestión de Usuarios",
  "/solicitudes":   "Solicitudes Públicas",
};

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  const sidebarW = collapsed ? 68 : 240;
  const title = PAGE_TITLES[location.pathname] || "UniCréditos";

  return (
    <div style={styles.root}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      <div style={{ ...styles.main, marginLeft: `${sidebarW}px`, transition: "margin-left 0.25s cubic-bezier(.4,0,.2,1)" }}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h1 style={styles.pageTitle}>{title}</h1>
            <span style={styles.breadcrumb}>UniCréditos / {title}</span>
          </div>
          <div style={styles.headerRight}>
            {/* Fecha */}
            <span style={styles.dateText}>
              {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
            {/* Notificaciones */}
            <NotificationBell />
            {/* Avatar */}
            <div style={styles.headerAvatar}>
              <span style={styles.headerAvatarLetter}>{user?.nombre?.charAt(0) || "U"}</span>
            </div>
          </div>
        </header>

        {/* Contenido de la página */}
        <main style={styles.content}>
          {children}
        </main>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f3ede1; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(30,58,95,0.2); border-radius: 99px; }
      `}</style>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#f3ede1",
    fontFamily: "'Inter', sans-serif",
  },
  main: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid rgba(30,58,95,0.1)",
    padding: "0 1.75rem",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 50,
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
  },
  headerLeft: { display: "flex", flexDirection: "column", gap: "2px" },
  pageTitle: { fontSize: "1.1rem", fontWeight: "700", color: "#1e3a5f", lineHeight: 1 },
  breadcrumb: { fontSize: "0.72rem", color: "#6b7a8d" },
  headerRight: { display: "flex", alignItems: "center", gap: "1rem" },
  dateText: { fontSize: "0.78rem", color: "#6b7a8d", textTransform: "capitalize" },
  headerAvatar: {
    width: "34px", height: "34px", borderRadius: "50%",
    background: "linear-gradient(135deg, #e8740e, #c05a00)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  headerAvatarLetter: { color: "#fff", fontWeight: "700", fontSize: "0.88rem" },
  content: {
    flex: 1,
    padding: "1.75rem",
    overflowY: "auto",
  },
};