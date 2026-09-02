import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import FirmaDigital from "../components/FirmaDigital";
import solicitudesPublicasService from "../services/solicitudesPublicasService";
import logoIcono from "../assets/logo-icono-blanco.png";

const palette = {
  navy: "#1e3a5f", brandNavy: "#1d3588", orange: "#e8740e", gold: "#c89b14",
  text: "#2c3e50", muted: "#6b7a8d", beige: "#f3ede1", card: "#ffffff",
  border: "rgba(30,58,95,0.12)", green: "#1d9e75", red: "#c0392b",
};

export default function FirmarCodeudor() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [solicitud, setSolicitud] = useState(null);
  const [firma, setFirma] = useState("");
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [firmado, setFirmado] = useState(false);

  useEffect(() => {
    solicitudesPublicasService.obtenerDatosCodeudor(token)
      .then(resp => {
        setSolicitud(resp.solicitud);
        if (Number(resp.solicitud.firmado_codeudor)) setFirmado(true);
      })
      .catch(() => setError("Este enlace no es válido o ya venció. Pídele a tu estudiante que te comparta uno nuevo."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleFirmar = async () => {
    if (!firma) { setError("Firma en el recuadro antes de continuar."); return; }
    setError(""); setEnviando(true);
    try {
      await solicitudesPublicasService.firmarCodeudor(token, firma);
      setFirmado(true);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo registrar tu firma. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: palette.beige, fontFamily: "'Inter',sans-serif" }}>
      <Navbar />
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "2.5rem 1.25rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <img src={logoIcono} alt="" style={{ width: "44px", opacity: 0.85, filter: "invert(0.4)" }} />
          <h1 style={{ fontFamily: "'Lora',serif", fontSize: "1.5rem", color: palette.navy, margin: "0.75rem 0 0" }}>Firma como codeudor</h1>
        </div>

        <div style={{ background: palette.card, borderRadius: "16px", padding: "2rem", boxShadow: "0 4px 20px rgba(30,58,95,0.08)" }}>
          {loading && <p style={{ textAlign: "center", color: palette.muted }}>Cargando...</p>}

          {!loading && error && !solicitud && (
            <p style={{ color: palette.red, fontSize: "0.9rem", textAlign: "center" }}>{error}</p>
          )}

          {!loading && solicitud && firmado && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: palette.green + "18", color: palette.green, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", margin: "0 auto 1rem" }}>✓</div>
              <h3 style={{ color: palette.navy, margin: "0 0 0.5rem" }}>¡Ya quedó tu firma!</h3>
              <p style={{ color: palette.muted, fontSize: "0.88rem", lineHeight: 1.6 }}>
                Los documentos de <strong>{solicitud.deudor_nombre}</strong> ya quedaron completos con tu firma
                como codeudor. No necesitas hacer nada más por aquí.
              </p>
              <button onClick={() => navigate("/")} style={{ marginTop: "1rem", padding: "0.7rem 1.4rem", background: palette.navy, color: "#fff", border: "none", borderRadius: "9px", fontWeight: "600", cursor: "pointer" }}>
                Ir al inicio
              </button>
            </div>
          )}

          {!loading && solicitud && !firmado && (
            <>
              <p style={{ fontSize: "0.9rem", color: palette.text, lineHeight: 1.6, marginBottom: "1.25rem" }}>
                <strong>{solicitud.deudor_nombre}</strong> te registró como codeudor de su crédito de{" "}
                {solicitud.tipo_credito} — {solicitud.deudor_programa}, semestre {solicitud.deudor_semestre}.
                Antes de continuar, confirma que tus datos sean correctos:
              </p>
              <div style={{ background: palette.beige, borderRadius: "10px", padding: "0.9rem 1.1rem", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
                <p style={{ margin: "0 0 4px" }}><strong>Nombre:</strong> {solicitud.codeudor_nombre}</p>
                <p style={{ margin: 0 }}><strong>Cédula:</strong> {solicitud.codeudor_cc}</p>
              </div>
              <p style={{ fontSize: "0.82rem", color: palette.muted, marginBottom: "0.5rem" }}>
                Si estos datos no son tuyos, no continúes — avísale al estudiante que se equivocó de enlace.
              </p>

              <FirmaDigital value={firma} onChange={setFirma} />

              {error && <p style={{ color: palette.red, fontSize: "0.82rem", marginTop: "0.75rem" }}>{error}</p>}

              <button onClick={handleFirmar} disabled={enviando} style={{
                width: "100%", marginTop: "1.25rem", padding: "0.85rem", background: `linear-gradient(135deg,${palette.navy},#2a5080)`,
                color: "#fff", border: "none", borderRadius: "10px", fontWeight: "700", fontSize: "0.92rem",
                cursor: enviando ? "default" : "pointer", opacity: enviando ? 0.7 : 1,
              }}>
                {enviando ? "Enviando..." : "Confirmar mi firma →"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}