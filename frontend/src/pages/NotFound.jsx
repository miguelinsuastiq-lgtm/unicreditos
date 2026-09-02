import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import logoIcono from "../assets/logo-icono-navy-transparente.png";

const palette = {
  navy: "#1e3a5f", orange: "#e8740e", gold: "#c89b14", beige: "#f3ede1",
  text: "#2c3e50", muted: "#6b7a8d", card: "#ffffff", border: "rgba(30,58,95,0.1)",
};

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div style={{ minHeight: "100vh", background: palette.beige, fontFamily: "'Inter',sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "5rem 1.5rem", textAlign: "center" }}>
        <img src={logoIcono} alt="" style={{ width: "72px", opacity: 0.5, marginBottom: "1.5rem" }} />
        <p style={{ fontFamily: "'Lora',serif", fontSize: "4.5rem", fontWeight: "700", color: palette.navy, margin: 0, lineHeight: 1 }}>404</p>
        <h1 style={{ fontFamily: "'Lora',serif", fontSize: "1.5rem", fontWeight: "700", color: palette.navy, margin: "0.75rem 0 0.5rem" }}>
          Esta página no existe
        </h1>
        <p style={{ fontSize: "0.92rem", color: palette.muted, lineHeight: 1.6, margin: "0 0 2rem" }}>
          Puede que el enlace esté mal escrito o que la página se haya movido. Verifica la dirección o vuelve al inicio.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate(user ? "/dashboard" : "/")}
            style={{ padding: "0.75rem 1.5rem", background: palette.navy, color: "#fff", border: "none", borderRadius: "9px", fontWeight: "600", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
          >
            {user ? "Ir a mi panel" : "Ir al inicio"}
          </button>
          <button
            onClick={() => navigate(-1)}
            style={{ padding: "0.75rem 1.5rem", background: "transparent", color: palette.navy, border: `1.5px solid ${palette.border}`, borderRadius: "9px", fontWeight: "600", fontSize: "0.88rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
          >
            ← Volver atrás
          </button>
        </div>
      </div>
    </div>
  );
}