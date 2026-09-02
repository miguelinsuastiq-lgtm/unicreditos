import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoIcono from "../assets/logo-icono-navy-transparente.png";

const palette = {
  navy: "#1e3a5f", brandNavy: "#1d3588", orange: "#e8740e",
  gold: "#c89b14", text: "#2c3e50", muted: "#6b7a8d",
};

const LINKS = [
  { href: "#creditos",label: "Créditos",             type: "anchor" },
  { href: "#faq",     label: "Preguntas frecuentes", type: "anchor" },
  { href: "#contacto",label: "Contacto",             type: "anchor" },
  { href: "/solicitud", label: "Solicitar",          type: "route" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (link) => {
    setMenuOpen(false);
    if (link.type === "route") { navigate(link.href); return; }
    if (location.pathname === "/") {
      document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      navigate(`/${link.href}`);
    }
  };

  return (
    <header className="ucr-navbar" style={{ ...styles.nav, boxShadow: scrolled ? "0 2px 16px rgba(30,53,136,0.1)" : "none", borderBottom: scrolled ? "1px solid rgba(30,58,95,0.08)" : "1px solid transparent" }}>
      <div style={styles.inner}>
        <button style={styles.brand} onClick={() => location.pathname === "/" ? document.querySelector("#inicio")?.scrollIntoView({behavior:"smooth"}) : navigate("/")}>
          <img src={logoIcono} alt="Uniautónoma del Cauca" style={styles.brandIcon} />
          <div style={styles.brandText}>
            <span style={styles.brandName}>UniCréditos</span>
            <span style={styles.brandSub}>Uniautónoma del Cauca</span>
          </div>
        </button>

        <nav className="ucr-links-desktop" style={styles.linksDesktop}>
          {LINKS.map(l => (
            <button key={l.href} style={styles.link} onClick={() => goTo(l)}>{l.label}</button>
          ))}
        </nav>

        <div className="ucr-right-desktop" style={styles.rightDesktop}>
          <button style={styles.btnLogin} onClick={() => navigate("/login")}>
            {isAuthenticated ? "Ir a mi panel →" : "Iniciar sesión"}
          </button>
        </div>

        <button className="ucr-burger" style={styles.burger} onClick={() => setMenuOpen(o => !o)} aria-label="Abrir menú">
          <span style={styles.burgerBar} />
          <span style={styles.burgerBar} />
          <span style={styles.burgerBar} />
        </button>
      </div>

      {menuOpen && (
        <div style={styles.mobileMenu}>
          {LINKS.map(l => (
            <button key={l.href} style={styles.mobileLink} onClick={() => goTo(l)}>{l.label}</button>
          ))}
          <button style={{ ...styles.btnLogin, width: "100%", marginTop: "0.5rem" }} onClick={() => navigate("/login")}>
            {isAuthenticated ? "Ir a mi panel →" : "Iniciar sesión"}
          </button>
        </div>
      )}

      <style>{`
        @media (max-width: 860px) {
          .ucr-links-desktop, .ucr-right-desktop { display: none !important; }
          .ucr-burger { display: flex !important; }
        }
      `}</style>
    </header>
  );
}

const styles = {
  nav: {
    position: "sticky", top: 0, zIndex: 200, background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(8px)", transition: "box-shadow 0.2s,border-color 0.2s",
  },
  inner: {
    maxWidth: "1180px", margin: "0 auto", padding: "0 1.5rem", height: "68px",
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
  },
  brand: { display: "flex", alignItems: "center", gap: "0.6rem", background: "none", border: "none", cursor: "pointer", padding: 0 },
  brandIcon: { width: "34px", height: "34px", objectFit: "contain" },
  brandText: { display: "flex", flexDirection: "column", alignItems: "flex-start" },
  brandName: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1.05rem", color: palette.navy, lineHeight: 1.1 },
  brandSub: { fontSize: "0.66rem", color: palette.muted },
  linksDesktop: { display: "flex", alignItems: "center", gap: "1.75rem" },
  link: { background: "none", border: "none", cursor: "pointer", fontSize: "0.86rem", fontWeight: "500", color: palette.text, fontFamily: "'Inter',sans-serif", padding: 0 },
  rightDesktop: { display: "flex", alignItems: "center" },
  btnLogin: {
    padding: "0.55rem 1.3rem", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff",
    border: "none", borderRadius: "9px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer",
    fontFamily: "'Inter',sans-serif", boxShadow: "0 3px 10px rgba(30,58,95,0.25)",
  },
  burger: { display: "none", flexDirection: "column", gap: "5px", background: "none", border: "none", cursor: "pointer", padding: "0.4rem" },
  burgerBar: { width: "22px", height: "2px", background: palette.navy, borderRadius: "2px" },
  mobileMenu: { display: "flex", flexDirection: "column", gap: "0.25rem", padding: "0.5rem 1.5rem 1.25rem", borderTop: "1px solid rgba(30,58,95,0.08)" },
  mobileLink: { background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "0.65rem 0.25rem", fontSize: "0.9rem", color: palette.text, fontFamily: "'Inter',sans-serif", borderBottom: "1px solid rgba(30,58,95,0.06)" },
};