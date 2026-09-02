import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import logoWhite from "../assets/logo-icono-blanco.png";

const palette = {
  navy: "#1e3a5f", brandNavy: "#1d3588", orange: "#e8740e", gold: "#c89b14",
  beige: "#f3ede1", beigeAlt: "#ede6d8", text: "#2c3e50", muted: "#6b7a8d",
  green: "#1d9e75", red: "#c0392b", card: "#ffffff", border: "rgba(30,58,95,0.1)",
};

// ─── Datos reales del procedimiento institucional (9 pasos) ───────────────────
// ─── Slider "Vive la Uniautónoma" — logros y vida universitaria reales ────────
const SLIDES_VIDA = [
  { titulo: "Más de 40 años de trayectoria", desc: "Iniciamos en 1979 como la Corporación UCICA, reconocida oficialmente por el Ministerio de Educación Nacional en 1984. Desde entonces formamos profesionales en el suroccidente colombiano.", Icono: IconGraduationSlide, color1: "#1e3a5f", color2: "#2a5080" },
  { titulo: "8+ programas de pregrado", desc: "Ingeniería de Software, Derecho, Finanzas y Negocios Internacionales, Administración de Empresas, Contaduría Pública, Entrenamiento Deportivo, Licenciatura en Educación Infantil e Ingeniería Electrónica.", Icono: IconBookSlide, color1: "#c89b14", color2: "#a07d10" },
  { titulo: "Bienestar universitario activo", desc: "Actividades deportivas, culturales y de acompañamiento psicosocial para que tu paso por la Universidad sea integral, no solo académico.", Icono: IconMedalSlide, color1: "#1d9e75", color2: "#146b52" },
  { titulo: "En el corazón de Popayán", desc: "Un campus pensado para la vida universitaria completa — clases, laboratorios, espacios de estudio y encuentro con tus compañeros.", Icono: IconCampusSlide, color1: "#e8740e", color2: "#c25f0a" },
];

function VidaUniversitariaSlider() {
  const [activo, setActivo] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;
    const t = setInterval(() => setActivo(a => (a + 1) % SLIDES_VIDA.length), 4500);
    return () => clearInterval(t);
  }, [pausado]);

  const slide = SLIDES_VIDA[activo];

  return (
    <div
      style={{ position: "relative", marginTop: "2rem", borderRadius: "18px", overflow: "hidden", boxShadow: "0 10px 30px rgba(30,58,95,0.15)" }}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div style={{ background: `linear-gradient(135deg,${slide.color1},${slide.color2})`, minHeight: "300px", display: "flex", alignItems: "center", padding: "2.5rem 3rem", position: "relative", transition: "background 0.6s ease" }}>
        {/* Puntos decorativos, mismo lenguaje visual del hero */}
        <div style={{ position: "absolute", top: "-20px", right: "40px", width: "90px", height: "90px", borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
        <div style={{ position: "absolute", bottom: "-30px", right: "120px", width: "60px", height: "60px", borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />

        <div key={activo} style={{ position: "relative", zIndex: 1, maxWidth: "560px", animation: "fadeSlide 0.6s ease" }}>
          <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" }}>
            <slide.Icono />
          </div>
          <h3 style={{ fontFamily: "'Lora',serif", fontSize: "1.5rem", fontWeight: "700", color: "#fff", margin: "0 0 0.6rem" }}>{slide.titulo}</h3>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.85)", lineHeight: 1.6, margin: 0 }}>{slide.desc}</p>
        </div>

        {/* Flechas de navegación manual */}
        <button aria-label="Anterior" onClick={() => setActivo(a => (a - 1 + SLIDES_VIDA.length) % SLIDES_VIDA.length)} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: "1rem", cursor: "pointer", zIndex: 2 }}>‹</button>
        <button aria-label="Siguiente" onClick={() => setActivo(a => (a + 1) % SLIDES_VIDA.length)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: "1rem", cursor: "pointer", zIndex: 2 }}>›</button>
      </div>

      {/* Puntos indicadores */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", padding: "1rem", background: "#fff" }}>
        {SLIDES_VIDA.map((_, i) => (
          <button key={i} aria-label={`Ir a la diapositiva ${i + 1}`} onClick={() => setActivo(i)}
            style={{ width: i === activo ? "22px" : "8px", height: "8px", borderRadius: "99px", border: "none", background: i === activo ? palette.navy : palette.border, cursor: "pointer", transition: "all 0.3s ease" }} />
        ))}
      </div>
    </div>
  );
}


const FAQS = [
  { q: "¿Qué documentos necesito del codeudor?", a: "Copia de cédula, y una carta laboral o certificado de ingresos con fecha de expedición no mayor a 30 días, donde se evidencie un ingreso mensual igual o superior a 2 SMMLV. Si no cuentas con ese certificado, puedes anexar los 2 últimos desprendibles de pago." },
  { q: "¿Todos los documentos deben autenticarse ante notaría?", a: "No. Solo la Carta de Instrucciones requiere autenticación notarial, por el estudiante y el codeudor. El Pagaré expresamente indica NO AUTENTICAR." },
  { q: "¿Cómo entrego mis documentos?", a: "Puedes enviarlos completos al correo financiamiento@uniautonoma.edu.co, o presentarlos físicamente en el Departamento Financiero para validación inmediata." },
  { q: "¿Qué pasa si mi solicitud es devuelta?", a: "Se te notificará por correo con el detalle de los documentos faltantes o inconsistentes, para que puedas corregirlos y volver a presentar la solicitud." },
  { q: "¿Qué pasa si mi solicitud es negada?", a: "Se te informarán las razones generales y tendrás la posibilidad de presentar un nuevo codeudor que cumpla los requisitos institucionales para una nueva evaluación." },
  { q: "Ya fui aprobado, ¿qué sigue?", a: "Si eres estudiante antiguo, se habilita tu acceso en la plataforma académica para matricularte. Si eres de primer ingreso, la Oficina de Admisiones gestiona tu matrícula directamente. Recuerda presentar los documentos originales dentro de los 15 días hábiles siguientes a la aprobación." },
];

// ─── Scroll-reveal: envuelve cualquier bloque y lo anima al entrar en pantalla ─
// Respeta prefers-reduced-motion (igual que el portal real de la universidad,
// que incluye un botón de accesibilidad "Detener animaciones").
const REDUCE_MOTION = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function IconGraduation() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
    </svg>
  );
}
function IconZapCard() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconBankCard() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21" /><line x1="5" y1="21" x2="5" y2="10" /><line x1="19" y1="21" x2="19" y2="10" />
      <polygon points="12 3 21 9 3 9 12 3" /><line x1="9" y1="21" x2="9" y2="10" /><line x1="15" y1="21" x2="15" y2="10" />
    </svg>
  );
}
function IconBookSlide() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h6a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5H2z" /><path d="M22 4h-6a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5H22z" />
    </svg>
  );
}
function IconMedalSlide() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="15" r="6" /><path d="M9 10 6 2h4l2 5" /><path d="M15 10 18 2h-4l-2 5" /><path d="M12 12v6" />
    </svg>
  );
}
function IconCampusSlide() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /><path d="M9 12h.01" /><path d="M15 12h.01" />
    </svg>
  );
}
function IconGraduationSlide() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5" />
    </svg>
  );
}
function IconShieldSlide() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function IconLockSlide() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function IconDocShieldSlide() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8" /><path d="M14 3l6 6" /><path d="M14 3v6h6" />
      <path d="M18 13v3.5c0 2-1.5 3-3 3.5-1.5-.5-3-1.5-3-3.5V13l3-1 3 1Z" />
    </svg>
  );
}
function IconEyeSlide() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconWhatsapp() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.28-1.39a9.9 9.9 0 0 0 4.76 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2Zm5.76 14.15c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.17-1.56-1.17-2.98s.73-2.12.99-2.41c.26-.29.57-.36.76-.36l.55.01c.17.01.41-.06.64.49.24.58.81 2 .88 2.14.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.31.31-.13.61.17.29.77 1.27 1.66 2.06 1.14 1.02 2.1 1.33 2.4 1.48.29.15.46.13.63-.06.17-.19.71-.83.9-1.11.19-.29.38-.24.63-.14.26.1 1.66.79 1.95.93.28.15.48.22.55.34.07.13.07.72-.17 1.41Z"/>
    </svg>
  );
}
function IconPinSlide() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function IconPhoneSlide() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.362 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}
function IconClockSlide() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function Reveal({ children, delay = 0, y = 24, style = {} }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(REDUCE_MOTION);

  useEffect(() => {
    if (REDUCE_MOTION) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} style={{
      ...style,
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : `translateY(${y}px)`,
      transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(.22,1,.36,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

// ─── Contador animado (0 → valor) al entrar en pantalla ───────────────────────
function CountUp({ to, suffix = "", duration = 1200 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(REDUCE_MOTION ? to : 0);

  useEffect(() => {
    if (REDUCE_MOTION) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setVal(Math.round(eased * to));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to, duration]);

  return <strong ref={ref}>{val}{suffix}</strong>;
}

function FAQItem({ item, open, onToggle }) {
  return (
    <div style={styles.faqItem}>
      <button style={styles.faqQuestion} onClick={onToggle}>
        <span>{item.q}</span>
        <span style={{ ...styles.faqChevron, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>⌄</span>
      </button>
      {open && <p style={styles.faqAnswer}>{item.a}</p>}
    </div>
  );
}

// ─── Formulario público de preinscripción ──────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [faqOpen, setFaqOpen] = useState(0);

  return (
    <div style={styles.page}>
      <Navbar />

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section id="inicio" style={styles.hero}>
        <div style={styles.heroGrid} className="ucr-hero-grid">
          {/* Columna izquierda: mensaje + CTA directo */}
          <Reveal>
            <div>
              <span style={styles.heroBadge}>Departamento Financiero · Bienestar Universitario</span>
              <h1 style={styles.heroTitle}>
                No dejes que el <span style={{ color: palette.gold }}>dinero</span><br/>
                detenga tus estudios
              </h1>
              <p style={styles.heroSub}>
                Solicita, sigue y firma tu crédito institucional desde un solo lugar.
                El mismo proceso oficial de la Autónoma del Cauca, ahora en línea.
              </p>
              <div style={styles.heroChecks}>
                {["Sin filas ni papeleo", "100% en línea", "Firma electrónica"].map(t => (
                  <span key={t} style={styles.heroCheckItem}><span style={styles.heroCheckIcon}>✓</span>{t}</span>
                ))}
              </div>

              {/* Una sola acción principal, bien grande y sin competencia visual —
                  reduce la carga de decisión para cualquier persona, sin importar
                  qué tan cómoda esté con sistemas (Ley de Hick + Ley de Fitts). */}
              <button className="ucr-btn" style={styles.btnHero} onClick={() => navigate("/solicitud")}>
                Solicitar mi crédito ahora →
              </button>
              <p style={styles.heroTimeHint}>
                <span style={styles.heroTimeIcon}>◷</span> Toma unos 5 minutos · 3 pasos simples
              </p>

              <button className="ucr-btn" style={styles.heroLoginLink} onClick={() => navigate("/login")}>
                {isAuthenticated ? "Ya tengo cuenta — ir a mi panel →" : "¿Ya tienes cuenta? Inicia sesión aquí"}
              </button>
            </div>
          </Reveal>

          {/* Columna derecha: ilustración institucional */}
          <Reveal delay={0.15} y={16}>
            <div style={styles.heroArt}>
              <svg viewBox="0 0 440 420" style={{ width: "100%", height: "auto", maxWidth: "420px" }} aria-hidden="true" role="presentation">
                {/* Círculo decorativo de fondo */}
                <circle cx="220" cy="210" r="175" fill="rgba(255,255,255,0.04)" />
                <circle cx="220" cy="210" r="130" fill="rgba(200,155,20,0.08)" />

                {/* Diploma / documento */}
                <g stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="120" y="150" width="160" height="115" rx="8" />
                  <line x1="145" y1="180" x2="255" y2="180" />
                  <line x1="145" y1="200" x2="255" y2="200" />
                  <line x1="145" y1="220" x2="215" y2="220" />
                </g>
                {/* Sello del diploma */}
                <circle cx="255" cy="240" r="16" fill="none" stroke="#c89b14" strokeWidth="3" />
                <path d="M248 240 l5 5 l10 -10" stroke="#c89b14" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

                {/* Birrete de graduación */}
                <g stroke="#ffffff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M150 120 L220 95 L290 120 L220 145 Z" />
                  <path d="M175 130 L175 155 Q220 170 265 155 L265 130" />
                  <line x1="290" y1="120" x2="290" y2="155" />
                  <circle cx="290" cy="160" r="4" fill="#c89b14" stroke="none" />
                </g>

                {/* Chispas / detalles decorativos */}
                <circle cx="105" cy="270" r="4" fill="#c89b14" opacity="0.8" />
                <circle cx="320" cy="200" r="3" fill="#ffffff" opacity="0.6" />
                <circle cx="300" cy="290" r="5" fill="#c89b14" opacity="0.5" />
              </svg>
            </div>
          </Reveal>
        </div>

        <div style={styles.heroStats}>
          <div style={styles.heroStat}><CountUp to={9} /><span>pasos claros</span></div>
          <div style={styles.heroStatDivider} />
          <div style={styles.heroStat}><CountUp to={100} suffix="%" /><span>en línea</span></div>
          <div style={styles.heroStatDivider} />
          <div style={styles.heroStat}><strong>Ley 527</strong><span>firma electrónica</span></div>
        </div>
      </section>

      {/* ─── Nuestros créditos ────────────────────────────────────────────── */}
      <section id="creditos" style={{ ...styles.section, background: palette.beige }}>
        <div style={styles.sectionInner}>
          <span style={styles.eyebrow}>Nuestros créditos</span>
          <h2 style={styles.sectionTitle}>Elige el crédito que necesitas</h2>
          <p style={styles.sectionText}>Tres formas de financiar tu matrícula. Solicita la que te sirva y el Departamento Financiero te guía en el resto del proceso.</p>

          <div className="ucr-creditos-grid" style={styles.creditosGrid}>
            <Reveal>
              <div style={styles.creditoCard}>
                <div style={styles.creditoCardIconWrap}><IconGraduation /></div>
                <p style={styles.creditoCardTitle}>Crédito de Matrícula</p>
                <p style={styles.creditoCardDesc}>Facilidad de financiación gestionada directamente por la Universidad. La Universidad recibe tu solicitud, evalúa tu capacidad de pago y define si aplica el crédito interno, con codeudor y estudio de Datacrédito.</p>
                <ul style={styles.creditoCardList}>
                  <li>Respaldo directo de la Universidad</li>
                  <li>Cuotas mensuales según tu plan</li>
                  <li>Firma electrónica del pagaré</li>
                </ul>
                <button className="ucr-btn" style={styles.creditoCardBtn} onClick={() => navigate("/solicitud?tipo=Matrícula")}>
                  Solicitar Matrícula →
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div style={{ ...styles.creditoCard, borderColor: palette.gold + "50" }}>
                <span style={styles.creditoCardBadge}>Aliado externo</span>
                <div style={{ ...styles.creditoCardIconWrap, background: palette.gold + "15", color: palette.gold }}><IconZapCard /></div>
                <p style={styles.creditoCardTitle}>Crédito Brilla</p>
                <p style={styles.creditoCardDesc}>Brilla actúa como aliado externo de financiación según sus propias políticas. Puede financiar tu matrícula, o parte de ella, si cumples las condiciones de aprobación del aliado — la Universidad solo gestiona la matrícula, no la aprobación del crédito.</p>
                <ul style={styles.creditoCardList}>
                  <li>Aliado externo a la Universidad</li>
                  <li>Aprobación propia de Brilla</li>
                  <li>Mismo proceso de preinscripción</li>
                </ul>
                <button className="ucr-btn" style={{ ...styles.creditoCardBtn, background: `linear-gradient(135deg,${palette.gold},#a07d10)` }} onClick={() => navigate("/solicitud?tipo=Brilla")}>
                  Solicitar Brilla →
                </button>
              </div>
            </Reveal>
            <Reveal delay={0.2}>
              <div style={{ ...styles.creditoCard, borderColor: palette.green + "50" }}>
                <span style={{ ...styles.creditoCardBadge, color: palette.green, background: palette.green + "18" }}>Aliado externo</span>
                <div style={{ ...styles.creditoCardIconWrap, background: palette.green + "15", color: palette.green }}><IconBankCard /></div>
                <p style={styles.creditoCardTitle}>Crédito ICETEX</p>
                <p style={styles.creditoCardDesc}>ICETEX actúa como aliado externo para financiación educativa, conforme a sus propios requisitos y líneas vigentes. Puede financiar tu matrícula, o parte de ella, si cumples las condiciones del programa o crédito correspondiente.</p>
                <ul style={styles.creditoCardList}>
                  <li>Aliado externo a la Universidad</li>
                  <li>Aprobación propia de ICETEX</li>
                  <li>Mismo proceso de preinscripción</li>
                </ul>
                <button className="ucr-btn" style={{ ...styles.creditoCardBtn, background: `linear-gradient(135deg,${palette.green},#146b52)` }} onClick={() => navigate("/solicitud?tipo=ICETEX")}>
                  Solicitar ICETEX →
                </button>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── Cómo funciona la evaluación (flujo real del procedimiento) ───── */}
      <section style={{ ...styles.section, background: palette.beige }}>
        <div style={styles.sectionInner}>
          <span style={styles.eyebrow}>Cómo funciona</span>
          <h2 style={styles.sectionTitle}>El camino de tu solicitud, paso a paso</h2>
          <p style={styles.sectionText}>
            Toda solicitud pasa por el mismo proceso de evaluación, sin importar si termina en un crédito
            interno o remitida a un aliado externo como Brilla o ICETEX.
          </p>
          <div className="ucr-flujo-grid" style={styles.flujoGrid}>
            {[
              ["Solicitud", "Presentas tu necesidad de financiación por los canales definidos por la Universidad."],
              ["Recepción y validación", "La Universidad verifica que tu solicitud esté completa y valida tu información y documentos."],
              ["Evaluación financiera", "Se analiza tu capacidad de pago y la de tu codeudor, según los criterios institucionales."],
              ["Determinación de alternativa", "Con el resultado, se decide si procede el crédito interno o si conviene orientarte a un aliado externo."],
              ["Participación del aliado", "Si aplica Brilla o ICETEX, haces el trámite directamente con ellos — su aprobación es independiente de la Universidad."],
              ["Formalización", "Aprobada la alternativa, se formalizan las condiciones de financiación y tus obligaciones de pago."],
              ["Aplicación a matrícula", "Confirmada la financiación, se registra el pago de tu matrícula según el mecanismo acordado."],
              ["Seguimiento", "La Universidad hace seguimiento administrativo y tú cumples el calendario de pagos."],
            ].map(([titulo, desc], i) => (
              <Reveal key={titulo} delay={i * 0.05}>
                <div style={styles.flujoStep}>
                  <div style={styles.flujoNum}>{i + 1}</div>
                  <div>
                    <p style={styles.flujoTitulo}>{titulo}</p>
                    <p style={styles.flujoDesc}>{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <p style={{ ...styles.sectionText, fontSize: "0.8rem", marginTop: "1.5rem" }}>
            La aprobación de Brilla o ICETEX depende exclusivamente de sus propios requisitos y procesos —
            la Universidad gestiona la relación académica y administrativa de tu matrícula, nunca la aprobación
            de un crédito de un aliado externo.
          </p>
        </div>
      </section>

      {/* ─── Qué es UniCréditos ──────────────────────────────────────────── */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <div className="ucr-intro-grid" style={styles.introGrid}>
            <Reveal>
              <div>
                <span style={styles.eyebrow}>Sobre la plataforma</span>
                <h2 style={styles.sectionTitle}>Todo el ciclo del crédito, en un solo lugar</h2>
                <p style={styles.sectionText}>
                  UniCréditos digitaliza el procedimiento oficial de crédito institucional estudiantil
                  de la Corporación Universitaria Autónoma del Cauca: desde la solicitud hasta la firma
                  del pagaré, pasando por la validación de documentos y el estudio financiero.
                </p>
              </div>
            </Reveal>
            <div style={styles.introCards}>
              {[
                { icon: "📝", title: "Solicitud en línea", desc: "Diligencia y sube tus documentos sin salir de casa." },
                { icon: "🔍", title: "Seguimiento real", desc: "Ve el estado de tu solicitud en cada paso del proceso." },
                { icon: "✍️", title: "Firma electrónica", desc: "Firma tu pagaré con verificación en dos pasos por correo." },
              ].map((f, i) => (
                <Reveal key={f.title} delay={i * 0.1}>
                  <div className="ucr-hover-card" style={styles.introCard}>
                    <span style={{ fontSize: "1.4rem" }}>{f.icon}</span>
                    <p style={styles.introCardTitle}>{f.title}</p>
                    <p style={styles.introCardDesc}>{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Vive la Uniautónoma (slider institucional) ────────────────────── */}
      <section id="vida-universitaria" style={{ ...styles.section, background: palette.beige }}>
        <div style={styles.sectionInner}>
          <span style={styles.eyebrow}>Vive la Uniautónoma</span>
          <h2 style={styles.sectionTitle}>Más de 40 años formando talento en el Cauca</h2>
          <p style={styles.sectionText}>Desde 1979, cuando iniciamos como la Corporación UCICA, hasta hoy — conoce un poco de lo que te espera dentro del campus.</p>
          <VidaUniversitariaSlider />
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────────────── */}
      <section id="faq" style={styles.section}>
        <div style={{ ...styles.sectionInner, maxWidth: "760px" }}>
          <span style={styles.eyebrow}>Dudas frecuentes</span>
          <h2 style={styles.sectionTitle}>Preguntas frecuentes</h2>
          <div style={styles.faqList}>
            {FAQS.map((item, i) => (
              <Reveal key={i} delay={Math.min(i * 0.06, 0.3)} y={12}>
                <FAQItem item={item} open={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? -1 : i)} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Seguridad y confianza ──────────────────────────────────────── */}
      <section style={{ ...styles.section, background: palette.beige }}>
        <div style={styles.sectionInner}>
          <span style={styles.eyebrow}>Seguridad y confianza</span>
          <h2 style={styles.sectionTitle}>Tus datos y tu firma, protegidos</h2>
          <p style={styles.sectionText}>
            UniCréditos cumple con la normativa colombiana vigente para trámites financieros y protección de datos personales.
          </p>
          <div className="ucr-seguridad-grid" style={styles.seguridadGrid}>
            {[
              [IconShieldSlide, "Firma con validez legal", "Tu firma electrónica tiene la misma validez que una firma manuscrita, según la Ley 527 de 1999."],
              [IconLockSlide, "Datos cifrados", "Tu información viaja cifrada entre tu navegador y nuestros servidores, y tu contraseña nunca se guarda en texto plano."],
              [IconDocShieldSlide, "Habeas Data", "Tratamos tus datos personales conforme a la Ley 1581 de 2012 — solo para gestionar tu crédito de matrícula."],
              [IconEyeSlide, "Trazabilidad completa", "Cada decisión sobre tu solicitud queda registrada — sabes siempre quién y cuándo la evaluó."],
            ].map(([Icon, titulo, desc], i) => (
              <Reveal key={titulo} delay={i * 0.06}>
                <div style={styles.seguridadCard}>
                  <div style={styles.seguridadIconWrap}><Icon /></div>
                  <p style={styles.seguridadTitulo}>{titulo}</p>
                  <p style={styles.seguridadDesc}>{desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ubicación ──────────────────────────────────────────────────── */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <span style={styles.eyebrow}>Encuéntranos</span>
          <h2 style={styles.sectionTitle}>Visítanos en Popayán</h2>
          <p style={styles.sectionText}>El Departamento Financiero te atiende presencialmente si prefieres resolver tus dudas cara a cara.</p>

          <div className="ucr-ubicacion-grid" style={styles.ubicacionGrid}>
            <Reveal>
              <div style={styles.ubicacionMapaWrap}>
                <iframe
                  title="Ubicación Corporación Universitaria Autónoma del Cauca"
                  src="https://www.google.com/maps?q=Corporaci%C3%B3n+Universitaria+Aut%C3%B3noma+del+Cauca,+Calle+5+%233-85,+Popay%C3%A1n,+Cauca&output=embed"
                  style={{ border: 0, width: "100%", height: "100%" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div style={styles.ubicacionInfo}>
                <div style={styles.ubicacionItem}>
                  <div style={styles.ubicacionIconWrap}><IconPinSlide /></div>
                  <div>
                    <p style={styles.ubicacionLabel}>Dirección</p>
                    <p style={styles.ubicacionValor}>Calle 5 No. 3-85, Popayán, Cauca</p>
                  </div>
                </div>
                <div style={styles.ubicacionItem}>
                  <div style={styles.ubicacionIconWrap}><IconPhoneSlide /></div>
                  <div>
                    <p style={styles.ubicacionLabel}>Departamento Financiero</p>
                    <p style={styles.ubicacionValor}>PBX: 8213000</p>
                  </div>
                </div>
                <div style={styles.ubicacionItem}>
                  <div style={styles.ubicacionIconWrap}><IconClockSlide /></div>
                  <div>
                    <p style={styles.ubicacionLabel}>Atención presencial</p>
                    <p style={styles.ubicacionValor}>Lunes a viernes, horario de oficina</p>
                  </div>
                </div>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=Corporaci%C3%B3n+Universitaria+Aut%C3%B3noma+del+Cauca,+Calle+5+%233-85,+Popay%C3%A1n,+Cauca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ucr-btn"
                  style={styles.ubicacionBtn}
                >
                  Cómo llegar →
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── CTA final ───────────────────────────────────────────────────── */}
      <section style={styles.ctaSection}>
        <div style={styles.sectionInner}>
          <h2 style={styles.ctaTitle}>¿Listo para empezar tu solicitud?</h2>
          <p style={styles.ctaSub}>Solo toma unos minutos — te guiamos paso a paso.</p>
          <button className="ucr-btn" style={styles.btnHero} onClick={() => navigate("/solicitud")}>
            Solicitar mi crédito ahora →
          </button>
          <button className="ucr-btn" style={{ ...styles.heroLoginLink, color: "rgba(255,255,255,0.75)" }} onClick={() => navigate("/login")}>
            {isAuthenticated ? "Ya tengo cuenta — ir a mi panel →" : "¿Ya tienes cuenta? Inicia sesión aquí"}
          </button>
        </div>
      </section>

      {/* ─── Contacto / Footer ───────────────────────────────────────────── */}
      <footer id="contacto" style={styles.footer}>
        <div style={styles.sectionInner}>
          <div style={styles.footerGrid}>
            <div>
              <div style={styles.footerBrand}>
                <img src={logoWhite} alt="Uniautónoma del Cauca" style={styles.footerLogo} />
                <span style={styles.footerBrandName}>UniCréditos</span>
              </div>
              <p style={styles.footerText}>Plataforma de gestión de créditos estudiantiles — Corporación Universitaria Autónoma del Cauca.</p>
            </div>
            <div>
              <p style={styles.footerHeading}>Departamento Financiero</p>
              <p style={styles.footerText}>Calle 5 No. 3-85, Popayán, Cauca</p>
              <p style={styles.footerText}>PBX: 8213000</p>
              <p style={styles.footerText}>financiamiento@uniautonoma.edu.co</p>
            </div>
            <div>
              <p style={styles.footerHeading}>Enlaces</p>
              <p style={styles.footerText}>www.uniautonoma.edu.co</p>
              <p style={styles.footerText}>Autoservicio Estudiantil</p>
            </div>
          </div>
          <div style={styles.footerBottom}>
            <span>© {new Date().getFullYear()} Corporación Universitaria Autónoma del Cauca · NIT 891.501.766-6</span>
          </div>
        </div>
      </footer>

      {/* ─── Botón flotante de contacto (WhatsApp) ──────────────────────── */}
      <a
        href="https://wa.me/573000000000?text=Hola%2C%20tengo%20una%20pregunta%20sobre%20mi%20cr%C3%A9dito%20de%20matr%C3%ADcula"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escríbenos por WhatsApp"
        style={styles.whatsappBtn}
        className="ucr-whatsapp-btn"
      >
        <IconWhatsapp />
      </a>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Inter', sans-serif; margin: 0; }
        @keyframes fadeSlide { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        .ucr-whatsapp-btn { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .ucr-whatsapp-btn:hover { transform: scale(1.08); box-shadow: 0 6px 22px rgba(37,211,102,0.6); }
        .ucr-hover-card { transition: transform 0.22s ease, box-shadow 0.22s ease; }
        .ucr-hover-card:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(30,58,95,0.12); }
        .ucr-btn { transition: transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease; }
        .ucr-btn:hover { transform: translateY(-2px); }
        /* Foco visible para quien navega con teclado (accesibilidad) */
        button:focus-visible, a:focus-visible { outline: 3px solid ${palette.gold}; outline-offset: 2px; }
        .ucr-creditos-grid li { position: relative; padding-left: 1.3rem; }
        .ucr-creditos-grid li::before { content: "✓"; position: absolute; left: 0; color: #1d9e75; font-weight: 700; }
        @media (max-width: 760px) {
          .ucr-intro-grid { grid-template-columns: 1fr !important; }
          .ucr-form-grid, .ucr-form-grid3 { grid-template-columns: 1fr !important; }
          .ucr-hero-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
          .ucr-creditos-grid { grid-template-columns: 1fr !important; }
          .ucr-flujo-grid { grid-template-columns: 1fr !important; }
          .ucr-seguridad-grid { grid-template-columns: 1fr 1fr !important; }
          .ucr-ubicacion-grid { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { background: palette.card, minHeight: "100vh" },

  // Hero
  hero: { background: `linear-gradient(160deg, ${palette.brandNavy} 0%, #142766 100%)`, padding: "4rem 1.5rem 3rem" },
  heroGrid: { maxWidth: "1080px", margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "3rem", alignItems: "center", marginBottom: "3rem" },
  heroBadge: { display: "inline-block", fontSize: "0.75rem", fontWeight: "600", color: palette.gold, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: "1rem" },
  heroTitle: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "2.5rem", color: "#fff", lineHeight: 1.25, marginBottom: "1rem" },
  heroSub: { fontSize: "1rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.6, marginBottom: "1.25rem", maxWidth: "480px" },
  heroChecks: { display: "flex", flexWrap: "wrap", gap: "0.6rem 1.2rem", marginBottom: "1.75rem" },
  heroCheckItem: { display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.9)", fontWeight: "500" },
  heroCheckIcon: { width: "18px", height: "18px", borderRadius: "50%", background: "rgba(255,255,255,0.15)", color: palette.gold, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: "700", flexShrink: 0 },
  heroCtas: { display: "flex", gap: "0.85rem", flexWrap: "wrap" },
  btnPrimaryLight: { padding: "0.85rem 1.6rem", background: "#fff", color: palette.brandNavy, border: "none", borderRadius: "10px", fontSize: "0.92rem", fontWeight: "700", cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" },
  btnGhost: { padding: "0.85rem 1.6rem", background: "rgba(255,255,255,0.08)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)", borderRadius: "10px", fontSize: "0.92rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  // Botón principal del hero: grande (Ley de Fitts, más fácil de acertar en
  // cualquier dispositivo), único en su nivel de contraste (sin competir con
  // otra acción del mismo peso — Ley de Hick, menos decisión = más gente
  // completa la acción).
  btnHero: { display: "block", width: "100%", maxWidth: "360px", padding: "1.15rem 1.8rem", background: "#fff", color: palette.brandNavy, border: "none", borderRadius: "12px", fontSize: "1.05rem", fontWeight: "800", cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 6px 22px rgba(0,0,0,0.2)", marginBottom: "0.6rem" },
  heroTimeHint: { display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)", margin: "0 0 1.1rem" },
  heroTimeIcon: { fontSize: "0.9rem" },
  // Acción secundaria degradada a texto — visible y accesible, pero sin
  // competir visualmente con la acción principal.
  heroLoginLink: { display: "block", background: "none", border: "none", color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif", textDecoration: "underline", textUnderlineOffset: "3px", padding: "0.4rem 0" },
  heroStats: { display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap", justifyContent: "center", maxWidth: "1080px", margin: "0 auto", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.12)" },
  heroStat: { display: "flex", flexDirection: "column", alignItems: "center", color: "#fff" },
  heroStatDivider: { width: "1px", height: "28px", background: "rgba(255,255,255,0.2)" },

  // Tarjeta de crédito (hero, columna derecha)
  heroArt: { display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" },

  // Nuestros créditos
  creditosGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginTop: "2rem" },
  flujoGrid:    { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem", marginTop: "2rem" },
  flujoStep:    { display: "flex", gap: "1rem", alignItems: "flex-start", background: palette.card, borderRadius: "12px", padding: "1.1rem 1.25rem", border: `1px solid ${palette.border}` },
  flujoNum:     { width: "32px", height: "32px", borderRadius: "50%", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", fontWeight: "700", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  flujoTitulo:  { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1rem", color: palette.navy, margin: "0 0 4px" },
  flujoDesc:    { fontSize: "0.85rem", color: palette.muted, lineHeight: 1.5, margin: 0 },

  seguridadGrid:    { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginTop: "2rem" },
  seguridadCard:    { background: palette.card, borderRadius: "14px", padding: "1.5rem 1.25rem", border: `1px solid ${palette.border}`, height: "100%" },
  seguridadIconWrap:{ width: "44px", height: "44px", borderRadius: "12px", background: palette.navy + "12", color: palette.navy, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" },
  seguridadTitulo:  { fontWeight: "700", fontSize: "0.95rem", color: palette.text, margin: "0 0 0.4rem" },
  seguridadDesc:    { fontSize: "0.82rem", color: palette.muted, lineHeight: 1.5, margin: 0 },

  ubicacionGrid:     { display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.75rem", marginTop: "2rem", alignItems: "stretch" },
  ubicacionMapaWrap: { borderRadius: "16px", overflow: "hidden", minHeight: "340px", height: "100%", border: `1px solid ${palette.border}`, boxShadow: "0 4px 16px rgba(30,58,95,0.08)" },
  ubicacionInfo:     { background: palette.beige, borderRadius: "16px", padding: "1.75rem", height: "100%", display: "flex", flexDirection: "column", gap: "1.25rem" },
  ubicacionItem:     { display: "flex", gap: "0.9rem", alignItems: "flex-start" },
  ubicacionIconWrap: { width: "38px", height: "38px", borderRadius: "10px", background: palette.navy + "12", color: palette.navy, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ubicacionLabel:    { fontSize: "0.72rem", fontWeight: "700", color: palette.muted, textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 3px" },
  ubicacionValor:    { fontSize: "0.9rem", color: palette.text, fontWeight: "600", margin: 0 },
  ubicacionBtn:      { marginTop: "auto", display: "inline-block", textAlign: "center", padding: "0.75rem 1.25rem", background: palette.navy, color: "#fff", borderRadius: "9px", fontWeight: "700", fontSize: "0.85rem", textDecoration: "none" },

  whatsappBtn: { position: "fixed", bottom: "24px", right: "24px", width: "58px", height: "58px", borderRadius: "50%", background: "#25D366", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(37,211,102,0.45)", zIndex: 100, textDecoration: "none" },
  creditoCard: { position: "relative", background: palette.card, borderRadius: "18px", padding: "2rem 1.75rem", border: `1px solid ${palette.border}`, display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(30,58,95,0.06)" },
  creditoCardBadge: { position: "absolute", top: "1.25rem", right: "1.25rem", fontSize: "0.65rem", fontWeight: "700", color: palette.gold, background: palette.gold + "18", padding: "0.2rem 0.6rem", borderRadius: "99px", letterSpacing: "0.02em" },
  creditoCardIconWrap: { width: "52px", height: "52px", borderRadius: "14px", background: palette.navy + "12", color: palette.navy, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem" },
  creditoCardTitle: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1.25rem", color: palette.navy, marginBottom: "0.5rem" },
  creditoCardDesc: { fontSize: "0.85rem", color: palette.muted, lineHeight: 1.6, marginBottom: "1rem" },
  creditoCardList: { listStyle: "none", padding: 0, margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.82rem", color: palette.text },
  creditoCardBtn: { marginTop: "auto", padding: "0.75rem 1.2rem", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", fontWeight: "700", cursor: "pointer", fontFamily: "'Inter',sans-serif" },

  // Secciones generales
  section: { padding: "4rem 1.5rem" },
  sectionInner: { maxWidth: "1080px", margin: "0 auto" },
  eyebrow: { fontSize: "0.75rem", fontWeight: "700", color: palette.orange, letterSpacing: "0.06em", textTransform: "uppercase" },
  sectionTitle: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1.7rem", color: palette.navy, margin: "0.5rem 0 0.75rem" },
  sectionText: { fontSize: "0.95rem", color: palette.muted, lineHeight: 1.65, maxWidth: "620px" },

  // Intro
  introGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", alignItems: "start" },
  introCards: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  introCard: { background: palette.beige, borderRadius: "14px", padding: "1.1rem 1.25rem", border: `1px solid ${palette.border}` },
  introCardTitle: { fontWeight: "700", fontSize: "0.92rem", color: palette.navy, margin: "0.5rem 0 0.25rem" },
  introCardDesc: { fontSize: "0.82rem", color: palette.muted, lineHeight: 1.5 },

  // Timeline
  timeline: { marginTop: "2rem", display: "flex", flexDirection: "column" },
  timelineItem: { display: "flex", gap: "1.1rem" },
  timelineMarker: { display: "flex", flexDirection: "column", alignItems: "center" },
  timelineNum: { width: "34px", height: "34px", borderRadius: "50%", background: palette.navy, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "700", fontSize: "0.85rem", flexShrink: 0 },
  timelineLine: { width: "2px", flex: 1, background: palette.border, minHeight: "28px" },
  timelineContent: { paddingBottom: "1.75rem" },
  timelineTitle: { fontWeight: "700", fontSize: "0.98rem", color: palette.text, margin: "0.3rem 0 0.3rem" },
  timelineDesc: { fontSize: "0.85rem", color: palette.muted, lineHeight: 1.55, maxWidth: "560px" },

  // FAQ
  faqList: { marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" },
  faqItem: { border: `1px solid ${palette.border}`, borderRadius: "12px", overflow: "hidden" },
  faqQuestion: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: palette.beige, border: "none", padding: "1rem 1.25rem", fontSize: "0.9rem", fontWeight: "600", color: palette.text, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left" },
  faqChevron: { color: palette.muted, transition: "transform 0.2s ease", flexShrink: 0, marginLeft: "1rem" },
  faqAnswer: { padding: "1rem 1.25rem", fontSize: "0.85rem", color: palette.muted, lineHeight: 1.6, background: palette.card },

  // CTA final
  ctaSection: { background: palette.navy, padding: "3.5rem 1.5rem", textAlign: "center" },
  ctaTitle: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1.6rem", color: "#fff", marginBottom: "0.5rem" },
  ctaSub: { fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", marginBottom: "1.5rem" },

  // Footer
  footer: { background: palette.brandNavy, padding: "3rem 1.5rem 1.5rem" },
  footerGrid: { display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: "2rem", paddingBottom: "2rem", borderBottom: "1px solid rgba(255,255,255,0.12)" },
  footerBrand: { display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" },
  footerLogo: { width: "30px", height: "30px", objectFit: "contain" },
  footerBrandName: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1.05rem", color: "#fff" },
  footerHeading: { fontWeight: "700", fontSize: "0.85rem", color: "#fff", marginBottom: "0.6rem" },
  footerText: { fontSize: "0.8rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, margin: 0 },
  footerBottom: { paddingTop: "1.25rem", textAlign: "center", fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" },
};