import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoUniautonoma from "../assets/logo-uniautonoma.png";

// ─── Íconos SVG (reemplazan emojis — se ven igual en cualquier sistema) ──────
const IconUser = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IconLock = (props) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEye = (props) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = (props) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 11 8 11 8a18.5 18.5 0 0 1-3.35 4.51M6.61 6.61A18.5 18.5 0 0 0 1 13s4 8 11 8a10.4 10.4 0 0 0 5.39-1.61" />
    <line x1="2" y1="2" x2="22" y2="22" />
  </svg>
);
const IconMail = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);

const palette = {
  navy:      "#1e3a5f",
  brandNavy: "#1d3588", // azul exacto del escudo institucional — el panel usa este, no el navy de la app
  orange:    "#e8740e",
  gold:      "#c89b14",
  beige:     "#f3ede1",
  beigeAlt:  "#ede6d8",
  text:      "#2c3e50",
  muted:     "#6b7a8d",
  card:      "#ffffff",
  border:    "rgba(30,58,95,0.12)",
};

export default function Login() {
  const navigate = useNavigate();
  const { login, verify2FA } = useAuth();

  const [step, setStep]           = useState("credentials");
  const [tempToken, setTempToken] = useState("");
  const [codigo, setCodigo]       = useState("");
  const [password, setPassword]   = useState("");
  const [codigo2fa, setCodigo2fa] = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [shake, setShake]         = useState(false);

  const showError = (msg) => {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // ─── Paso 1: enviar credenciales al backend real ──────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!codigo.trim() || !password.trim()) {
      showError("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await login(codigo, password);
      if (data.requires_2fa) {
        setTempToken(data.temp_token);
        setStep("2fa");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Código o contraseña incorrectos.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ─── Paso 2: verificar código 2FA ────────────────────────────────────────
  const handle2FA = async (e) => {
    e.preventDefault();
    if (codigo2fa.trim().length !== 6) {
      showError("El código debe tener 6 dígitos.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await verify2FA(codigo2fa, tempToken);
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.message || "Código inválido o expirado.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={styles.page}>
      {/* ─── Panel institucional ────────────────────────────────────────── */}
      <div className="login-brand-panel" style={styles.brandPanel}>
        <div className="login-brand-inner" style={styles.brandInner}>
          <img src={logoUniautonoma} alt="Corporación Universitaria Autónoma del Cauca" className="login-logo-img" style={styles.logoImg} />
          <div className="login-brand-divider" style={styles.brandDivider} />
          <div>
            <p className="login-brand-headline" style={styles.brandHeadline}>Plataforma de Gestión de Créditos Estudiantiles</p>
            <p className="login-brand-sub" style={styles.brandSub}>Bienestar Universitario · Departamento Financiero</p>
          </div>
        </div>
        <p className="login-brand-footer" style={styles.brandFooter}>© {new Date().getFullYear()} Corporación Universitaria Autónoma del Cauca</p>
      </div>

      {/* ─── Panel de formulario ─────────────────────────────────────────── */}
      <div className="login-form-panel" style={styles.formPanel}>
        <div style={{ ...styles.card, ...(shake ? styles.shake : {}) }}>
          <h1 style={styles.title}>Iniciar sesión</h1>
          <p style={styles.subtitle}>
            {step === "credentials"
              ? "Ingresa tus credenciales institucionales para continuar."
              : "Verificación de seguridad — te enviamos un código de acceso."}
          </p>

          <div style={styles.steps}>
            <div style={styles.stepItem}>
              <div style={{ ...styles.stepDot, background: palette.navy }}>1</div>
              <span style={{ ...styles.stepLabel, color: palette.navy }}>Credenciales</span>
            </div>
            <div style={{ ...styles.stepLine, background: step === "2fa" ? palette.navy : palette.border }} />
            <div style={styles.stepItem}>
              <div style={{ ...styles.stepDot, background: step === "2fa" ? palette.navy : palette.border, color: step === "2fa" ? "#fff" : palette.muted }}>2</div>
              <span style={{ ...styles.stepLabel, color: step === "2fa" ? palette.navy : palette.muted }}>Verificación</span>
            </div>
          </div>

          {step === "credentials" && (
            <form onSubmit={handleLogin} style={styles.form} noValidate>
              <div style={styles.field}>
                <label style={styles.label}>Código o correo institucional</label>
                <div style={styles.inputWrap}>
                  <IconUser style={styles.inputIcon} />
                  <input style={styles.input} type="text" placeholder="Ingresa tu código o correo institucional"
                    value={codigo} onChange={(e) => setCodigo(e.target.value)} autoFocus autoComplete="username" />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Contraseña</label>
                <div style={styles.inputWrap}>
                  <IconLock style={styles.inputIcon} />
                  <input style={{ ...styles.input, paddingRight: "2.8rem" }}
                    type={showPass ? "text" : "password"} placeholder="Tu contraseña"
                    value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
                  <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                    {showPass ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading}>
                {loading ? <span style={styles.spinner} /> : "Iniciar sesión →"}
              </button>
              <p style={styles.hint}>¿Problemas para acceder? <span style={styles.link}>Contacta a soporte</span></p>
            </form>
          )}

          {step === "2fa" && (
            <form onSubmit={handle2FA} style={styles.form} noValidate>
              <div style={styles.infoBox}>
                <span style={{ color: palette.navy, flexShrink: 0 }}><IconMail /></span>
                <p style={styles.infoText}>
                  Enviamos un código de 6 dígitos a tu correo institucional.
                  En desarrollo local, consúltalo en phpMyAdmin → tabla usuarios → columna codigo_2fa.
                </p>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Código de verificación</label>
                <input
                  style={{ ...styles.input, textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.4rem", paddingLeft: "1rem" }}
                  type="text" placeholder="• • • • • •" maxLength={6}
                  value={codigo2fa} onChange={(e) => setCodigo2fa(e.target.value.replace(/\D/g, ""))}
                  autoFocus inputMode="numeric" />
              </div>
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" style={{ ...styles.btn, opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }} disabled={loading}>
                {loading ? <span style={styles.spinner} /> : "Verificar →"}
              </button>
              <button type="button" style={styles.backBtn}
                onClick={() => { setStep("credentials"); setError(""); setCodigo2fa(""); }}>
                ← Volver
              </button>
            </form>
          )}
        </div>
        <p style={styles.mobileFooter}>© {new Date().getFullYear()} Universidad Autónoma del Cauca</p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeInLeft { from{opacity:0;transform:translateX(-14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        input:focus { outline:none; border-color:#1e3a5f !important; box-shadow:0 0 0 3px rgba(30,58,95,0.12); }
        input::placeholder { color:#b0bac9; }
        button:active { transform:scale(0.98); }

        @media (max-width: 860px) {
          .login-page { flex-direction: column !important; }
          .login-brand-panel { flex: none !important; width: 100% !important; min-height: 0 !important; padding: 2rem 1.5rem 1.75rem !important; }
          .login-brand-inner { flex-direction: row !important; gap: 1rem !important; text-align: left !important; }
          .login-logo-img { width: 64px !important; height: 64px !important; }
          .login-brand-divider { display: none !important; }
          .login-brand-headline { font-size: 0.95rem !important; text-align: left !important; }
          .login-brand-sub { text-align: left !important; }
          .login-brand-footer { display: none !important; }
          .login-form-panel { padding: 1.75rem 1.25rem 2rem !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh", display: "flex", fontFamily: "'Inter',sans-serif",
  },

  // ── Panel institucional (izquierda) ──
  brandPanel: {
    flex: "0 0 40%", minHeight: "100vh", background: palette.brandNavy,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "3rem 2.5rem", position: "relative", gap: "2rem",
  },
  brandInner: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem",
    animation: "fadeInLeft 0.6s ease", maxWidth: "360px",
  },
  logoImg: { width: "156px", height: "156px", objectFit: "contain" },
  brandDivider: { width: "48px", height: "3px", borderRadius: "2px", background: palette.gold },
  brandHeadline: {
    fontFamily: "'Lora',serif", fontWeight: "600", fontSize: "1.3rem", lineHeight: "1.4",
    color: "#ffffff", textAlign: "center", letterSpacing: "-0.01em", marginBottom: "0.5rem",
  },
  brandSub: { fontSize: "0.8rem", color: "rgba(255,255,255,0.65)", textAlign: "center", letterSpacing: "0.02em" },
  brandFooter: { fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textAlign: "center", position: "absolute", bottom: "2rem" },

  // ── Panel de formulario (derecha) ──
  formPanel: {
    flex: "1", minHeight: "100vh", background: palette.beige,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    padding: "2rem", gap: "1rem",
  },
  card: {
    background: palette.card, borderRadius: "20px", padding: "2.75rem 2.5rem", width: "100%", maxWidth: "400px",
    boxShadow: "0 8px 40px rgba(30,53,136,0.1)", border: `1px solid ${palette.border}`,
    animation: "fadeIn 0.5s ease 0.1s both",
  },
  shake: { animation: "shake 0.5s ease" },
  title: { fontFamily: "'Lora',serif", fontSize: "1.6rem", fontWeight: "700", color: palette.text, letterSpacing: "-0.01em", marginBottom: "0.4rem" },
  subtitle: { fontSize: "0.85rem", color: palette.muted, lineHeight: "1.4", marginBottom: "1.75rem" },

  steps:     { display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginBottom: "1.75rem" },
  stepItem:  { display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" },
  stepDot:   { width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "600", color: "#fff", transition: "all 0.3s ease" },
  stepLabel: { fontSize: "0.7rem", fontWeight: "500", transition: "color 0.3s ease" },
  stepLine:  { height: "2px", width: "60px", borderRadius: "2px", marginBottom: "18px", transition: "background 0.3s ease" },

  form:      { display: "flex", flexDirection: "column", gap: "1.1rem" },
  field:     { display: "flex", flexDirection: "column", gap: "6px" },
  label:     { fontSize: "0.82rem", fontWeight: "600", color: palette.text },
  inputWrap: { position: "relative", display: "flex", alignItems: "center" },
  inputIcon: { position: "absolute", left: "0.85rem", color: palette.muted, pointerEvents: "none", display: "flex" },
  input:     { width: "100%", padding: "0.75rem 0.9rem 0.75rem 2.7rem", border: `1.5px solid ${palette.border}`, borderRadius: "10px", fontSize: "0.95rem", color: palette.text, background: palette.beige, transition: "border-color 0.2s,box-shadow 0.2s", fontFamily: "'Inter',sans-serif" },
  eyeBtn:    { position: "absolute", right: "0.75rem", background: "none", border: "none", cursor: "pointer", padding: "0", display: "flex", alignItems: "center", color: palette.muted },
  error:     { fontSize: "0.82rem", color: "#c0392b", background: "#fdf0ee", border: "1px solid #f5c6c0", borderRadius: "8px", padding: "0.6rem 0.9rem", textAlign: "center" },
  btn:       { padding: "0.85rem", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", transition: "opacity 0.2s,transform 0.15s", fontFamily: "'Inter',sans-serif", marginTop: "0.25rem", boxShadow: "0 4px 14px rgba(30,58,95,0.3)" },
  backBtn:   { background: "none", border: `1.5px solid ${palette.border}`, borderRadius: "10px", padding: "0.7rem", fontSize: "0.88rem", color: palette.muted, cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "border-color 0.2s" },
  spinner:   { width: "18px", height: "18px", border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" },
  hint:      { fontSize: "0.78rem", color: palette.muted, textAlign: "center" },
  link:      { color: palette.orange, cursor: "pointer", fontWeight: "500" },
  infoBox:   { display: "flex", gap: "0.75rem", alignItems: "flex-start", background: palette.beige, border: `1px solid ${palette.beigeAlt}`, borderRadius: "10px", padding: "0.9rem 1rem" },
  infoText:  { fontSize: "0.82rem", color: palette.muted, lineHeight: "1.5" },
  mobileFooter: { fontSize: "0.72rem", color: palette.muted, textAlign: "center" },
};