import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoIcono from "../assets/logo-icono-blanco.png";
import {
  IconGrid, IconCreditCard, IconFileText, IconReceipt, IconExchange,
  IconSignature, IconUsers, IconInbox, IconPower, IconChevronLeft,
} from "./Icons";

const palette = {
  navy:     "#1e3a5f",
  navyDark: "#152c48",
  navyHover:"#243f6a",
  orange:   "#e8740e",
  gold:     "#c89b14",
  beige:    "#f3ede1",
  muted:    "rgba(255,255,255,0.5)",
  text:     "rgba(255,255,255,0.9)",
};

const NAV_ITEMS = [
  { path: "/dashboard",     Icon: IconGrid,       label: "Inicio"        },
  { path: "/creditos",      Icon: IconCreditCard, label: "Créditos"      },
  { path: "/documentos",    Icon: IconFileText,   label: "Documentos"    },
  { path: "/facturacion",   Icon: IconReceipt,    label: "Facturación"   },
  { path: "/transacciones", Icon: IconExchange,   label: "Transacciones" },
  { path: "/pagares",       Icon: IconSignature,  label: "Pagarés"       },
];

const ADMIN_ITEMS = [
  { path: "/usuarios",     Icon: IconUsers, label: "Usuarios" },
  { path: "/solicitudes",  Icon: IconInbox, label: "Solicitudes" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => {
    // Navegar primero y, con un pequeño retraso, limpiar la sesión — así React
    // Router alcanza a desmontar por completo la página protegida actual antes
    // de que el cambio de estado de autenticación pueda disparar su propio
    // redirect a /login (si no, se genera una carrera entre ambas navegaciones
    // y la de /login termina ganando).
    navigate("/", { replace: true });
    setTimeout(() => logout(), 50);
  };

  const NavLink = ({ item }) => {
    const active = location.pathname === item.path;
    return (
      <button
        onClick={() => navigate(item.path)}
        title={collapsed ? item.label : ""}
        style={{
          ...styles.navBtn,
          background: active ? "rgba(255,255,255,0.12)" : "transparent",
          borderLeft: active ? `3px solid ${palette.gold}` : "3px solid transparent",
          color: active ? "#fff" : palette.muted,
        }}
      >
        <span style={styles.navIcon}><item.Icon size={18} /></span>
        {!collapsed && <span style={styles.navLabel}>{item.label}</span>}
        {active && !collapsed && <span style={styles.activeDot} />}
      </button>
    );
  };

  return (
    <aside style={{ ...styles.sidebar, width: collapsed ? "68px" : "240px" }}>
      {/* Logo */}
      <div style={styles.logoArea}>
        <div style={styles.logoBox}>
          <img src={logoIcono} alt="Uniautónoma del Cauca" style={styles.logoImg} />
        </div>
        {!collapsed && (
          <div style={styles.logoText}>
            <span style={styles.logoName}>UniCréditos</span>
            <span style={styles.logoSub}>Uniautónoma del Cauca</span>
          </div>
        )}
        <button onClick={onToggle} style={styles.collapseBtn} title="Colapsar menú">
          <IconChevronLeft size={14} style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>

      {/* Navegación principal */}
      <nav style={styles.nav}>
        {!collapsed && <p style={styles.sectionLabel}>PRINCIPAL</p>}
        {NAV_ITEMS.map(item => <NavLink key={item.path} item={item} />)}

        {isAdmin && (
          <>
            {!collapsed && <p style={{ ...styles.sectionLabel, marginTop: "1rem" }}>ADMINISTRACIÓN</p>}
            {ADMIN_ITEMS.map(item => <NavLink key={item.path} item={item} />)}
          </>
        )}
      </nav>

      {/* Usuario */}
      <div style={styles.userArea}>
        <div style={styles.avatarBox}>
          <span style={styles.avatarLetter}>
            {user?.nombre?.charAt(0) || "U"}
          </span>
        </div>
        {!collapsed && (
          <div style={styles.userInfo}>
            <span style={styles.userName}>{user?.nombre || "Estudiante"}</span>
            <span style={styles.userRole}>{user?.rol === "admin" ? "Administrador" : "Estudiante"}</span>
          </div>
        )}
        <button onClick={handleLogout} style={styles.logoutBtn} title="Cerrar sesión">
          <IconPower size={15} />
        </button>
      </div>

      <style>{`
        aside button:hover { opacity: 1 !important; }
        aside button { transition: all 0.18s ease; }
      `}</style>
    </aside>
  );
}

const styles = {
  sidebar: {
    height: "100vh",
    background: `linear-gradient(180deg, ${palette.navyDark} 0%, ${palette.navy} 100%)`,
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    left: 0, top: 0,
    zIndex: 100,
    transition: "width 0.25s cubic-bezier(.4,0,.2,1)",
    boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
    overflow: "hidden",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "1.25rem 0.9rem",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    minHeight: "72px",
  },
  logoBox: {
    width: "36px", height: "36px",
    borderRadius: "10px",
    background: `linear-gradient(135deg, ${palette.navy}, #2a5080)`,
    border: `1.5px solid ${palette.gold}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  logoImg: { width: "22px", height: "22px", objectFit: "contain" },
  logoText: { display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" },
  logoName: { color: "#fff", fontWeight: "700", fontSize: "0.9rem", whiteSpace: "nowrap" },
  logoSub:  { color: palette.muted, fontSize: "0.65rem", whiteSpace: "nowrap" },
  collapseBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "none", borderRadius: "6px",
    color: palette.muted, cursor: "pointer",
    width: "24px", height: "24px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.1rem", flexShrink: 0, marginLeft: "auto",
  },
  nav: {
    flex: 1, overflowY: "auto", padding: "0.75rem 0.5rem",
    display: "flex", flexDirection: "column", gap: "2px",
  },
  sectionLabel: {
    fontSize: "0.6rem", fontWeight: "700",
    color: "rgba(255,255,255,0.3)",
    letterSpacing: "0.1em",
    padding: "0.25rem 0.6rem 0.4rem",
    margin: 0,
  },
  navBtn: {
    display: "flex", alignItems: "center", gap: "0.7rem",
    width: "100%", padding: "0.65rem 0.75rem",
    border: "none", borderRadius: "8px",
    cursor: "pointer", fontFamily: "'Inter', sans-serif",
    fontSize: "0.87rem", fontWeight: "500",
    textAlign: "left",
  },
  navIcon:  { display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, width: "20px" },
  navLabel: { flex: 1, whiteSpace: "nowrap", overflow: "hidden" },
  activeDot: {
    width: "6px", height: "6px", borderRadius: "50%",
    background: palette.gold, flexShrink: 0,
  },
  userArea: {
    display: "flex", alignItems: "center", gap: "0.6rem",
    padding: "0.9rem",
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  avatarBox: {
    width: "34px", height: "34px", borderRadius: "50%",
    background: `linear-gradient(135deg, ${palette.orange}, #c05a00)`,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  avatarLetter: { color: "#fff", fontWeight: "700", fontSize: "0.9rem" },
  userInfo: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  userName: { color: "#fff", fontSize: "0.82rem", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userRole: { color: palette.muted, fontSize: "0.68rem" },
  logoutBtn: {
    background: "rgba(255,255,255,0.08)", border: "none",
    borderRadius: "6px", color: palette.muted,
    cursor: "pointer", width: "28px", height: "28px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.9rem", flexShrink: 0,
  },
};