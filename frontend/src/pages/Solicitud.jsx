import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import FirmaDigital from "../components/FirmaDigital";
import solicitudesPublicasService from "../services/solicitudesPublicasService";
import logoIcono from "../assets/logo-icono-blanco.png";

const palette = {
  navy: "#1e3a5f", brandNavy: "#1d3588", orange: "#e8740e", gold: "#c89b14",
  beige: "#f3ede1", beigeAlt: "#ede6d8", text: "#2c3e50", muted: "#6b7a8d",
  green: "#1d9e75", red: "#c0392b", card: "#ffffff", border: "rgba(30,58,95,0.1)",
};

const PROGRAMAS = [
  "Ingeniería de Software", "Contaduría Pública", "Derecho", "Psicología",
  "Medicina", "Administración de Empresas", "Enfermería", "Arquitectura",
  "Ingeniería Civil", "Comunicación Social",
];
const JORNADAS = ["Diurna", "Nocturna", "Virtual"];

const FORM_VACIO = {
  tipo_credito: "Matrícula",
  es_primiparo: true,
  deudor_nombre: "", deudor_cc: "", deudor_email: "", deudor_telefono: "", deudor_direccion: "",
  deudor_programa: PROGRAMAS[0], deudor_semestre: 1, deudor_jornada: JORNADAS[0],
  codeudor_nombre: "", codeudor_cc: "", codeudor_telefono: "", codeudor_direccion: "", codeudor_ingreso: "",
  mensaje: "",
};

// ─── Formatos oficiales — mismos 5 archivos servidos en /public/formatos ──────
const DOCUMENTOS = [
  { archivo: "solicitud_credito.pdf",            nombre: "Solicitud de Crédito para Matrícula" },
  { archivo: "autorizacion_centrales_riesgo.pdf", nombre: "Autorización Centrales de Riesgo" },
  { archivo: "pagare.pdf",                        nombre: "Pagaré" },
  { archivo: "carta_instrucciones.pdf",           nombre: "Carta de Instrucciones" },
  { archivo: "indicaciones_diligenciamiento.pdf", nombre: "Guía de diligenciamiento" },
];

function SolicitudForm() {
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get("tipo");
  const tipoInicial = ["Brilla", "ICETEX"].includes(tipoParam) ? tipoParam : "Matrícula";
  const [form, setForm]       = useState({ ...FORM_VACIO, tipo_credito: tipoInicial });
  const [firma, setFirma]     = useState("");
  const [archivosBrilla, setArchivosBrilla] = useState({ recibo_matricula: null, recibo_servicio_brilla: null, cedula_titular_recibo: null });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [descargados, setDescargados] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [esBrillaEnviado, setEsBrillaEnviado] = useState(false);
  const [idGenerado, setIdGenerado] = useState(null);
  const [tokenCodeudor, setTokenCodeudor] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setArchivo = (campo, archivo) => setArchivosBrilla(a => ({ ...a, [campo]: archivo }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.tipo_credito === "Brilla") {
      const requeridosBrilla = ["deudor_nombre","deudor_cc","deudor_email","deudor_telefono","deudor_direccion"];
      if (requeridosBrilla.some(k => !String(form[k]).trim())) {
        setError("Completa todos los campos obligatorios.");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(form.deudor_email)) {
        setError("Ingresa un correo electrónico válido.");
        return;
      }
      if (!archivosBrilla.recibo_matricula || !archivosBrilla.recibo_servicio_brilla || !archivosBrilla.cedula_titular_recibo) {
        setError("Adjunta los 3 documentos: recibo de matrícula, recibo de servicio con cupo Brilla, y cédula del titular del recibo.");
        return;
      }

      setLoading(true);
      try {
        const formData = new FormData();
        formData.append("tipo_credito", "Brilla");
        formData.append("es_primiparo", form.es_primiparo ? "1" : "0");
        ["deudor_nombre","deudor_cc","deudor_email","deudor_telefono","deudor_direccion","deudor_programa","deudor_jornada","mensaje"].forEach(k => formData.append(k, form[k]));
        formData.append("deudor_semestre", String(Number(form.deudor_semestre)));
        formData.append("recibo_matricula", archivosBrilla.recibo_matricula);
        formData.append("recibo_servicio_brilla", archivosBrilla.recibo_servicio_brilla);
        formData.append("cedula_titular_recibo", archivosBrilla.cedula_titular_recibo);

        const resp = await solicitudesPublicasService.enviarBrilla(formData);
        setIdGenerado(resp.id);
        setEsBrillaEnviado(true);
        setEnviado(true);
      } catch (err) {
        setError(err.response?.data?.message || "No se pudo enviar la solicitud. Intenta nuevamente.");
      } finally {
        setLoading(false);
      }
      return;
    }

    const requeridos = ["deudor_nombre","deudor_cc","deudor_email","deudor_telefono","deudor_direccion","codeudor_nombre","codeudor_cc","codeudor_telefono","codeudor_direccion","codeudor_ingreso"];
    if (requeridos.some(k => !String(form[k]).trim())) {
      setError("Completa todos los campos obligatorios.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.deudor_email)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    if (Number(form.codeudor_ingreso) <= 0) {
      setError("El ingreso del codeudor debe ser un valor positivo.");
      return;
    }
    if (!firma) {
      setError("Firma en el recuadro antes de enviar — la necesitamos para generar tus documentos.");
      return;
    }
    if (!descargados) {
      setError("Marca la casilla de confirmación de la Carta de Instrucciones antes de enviar.");
      return;
    }

    setLoading(true);
    try {
      const resp = await solicitudesPublicasService.enviar({
        ...form,
        deudor_semestre: Number(form.deudor_semestre),
        codeudor_ingreso: Number(form.codeudor_ingreso),
        firma_deudor: firma,
      });
      setIdGenerado(resp.id);
      setTokenCodeudor(resp.token_codeudor || null);
      setEsBrillaEnviado(false);
      setEnviado(true);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo enviar la solicitud. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    const docsGenerados = [
      { tipo: "solicitud_credito",         nombre: "Solicitud de Crédito" },
      { tipo: "pagare",                     nombre: "Pagaré" },
      { tipo: "autorizacion_datacredito",   nombre: "Autorización Centrales de Riesgo" },
    ];
    return (
      <div style={styles.formSuccessBox}>
        <div style={styles.formSuccessIcon}>✓</div>
        <h3 style={styles.formSuccessTitle}>¡Solicitud enviada!</h3>
        <p style={styles.formSuccessText}>
          {esBrillaEnviado
            ? <>El Departamento Financiero revisará tu recibo y se pondrá en contacto contigo a través del correo <strong>{form.deudor_email}</strong> en los próximos días.</>
            : <>El Departamento Financiero revisará tu información y se pondrá en contacto contigo a través del correo <strong>{form.deudor_email}</strong> en los próximos días.</>
          }
        </p>

        {!esBrillaEnviado && idGenerado && (
          <div style={styles.docsGeneradosBox}>
            <p style={styles.docsGeneradosTitle}>Tus documentos ya quedaron firmados y generados:</p>
            <div style={styles.docsGeneradosGrid}>
              {docsGenerados.map(d => (
                <a key={d.tipo} href={solicitudesPublicasService.urlDocumentoGenerado(idGenerado, d.tipo, form.deudor_email)}
                  target="_blank" rel="noopener noreferrer" style={styles.docGeneradoLink}>
                  <span style={styles.docGeneradoIcon}>↓</span> {d.nombre}
                </a>
              ))}
            </div>
            <p style={styles.docsGeneradosNota}>
              Recuerda: la <strong>Carta de Instrucciones</strong> es la única que debes descargar,
              diligenciar e ir a autenticar ante notaría — por ley, esa no se puede firmar digitalmente.
            </p>
          </div>
        )}

        {!esBrillaEnviado && tokenCodeudor && (
          <div style={styles.codeudorLinkBox}>
            <p style={styles.docsGeneradosTitle}>Falta la firma de tu codeudor</p>
            <p style={{ fontSize: "0.8rem", color: palette.muted, margin: "0 0 0.75rem", lineHeight: 1.5 }}>
              Comparte este enlace con <strong>{form.codeudor_nombre}</strong> — solo él/ella podrá firmar desde
              su propio celular o computador. Cuando lo haga, tus documentos quedarán completos.
            </p>
            <div style={styles.codeudorLinkRow}>
              <input readOnly value={`${window.location.origin}/firmar-codeudor/${tokenCodeudor}`} style={styles.codeudorLinkInput} onFocus={e => e.target.select()} />
              <button type="button" style={styles.codeudorLinkBtn} onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/firmar-codeudor/${tokenCodeudor}`);
                setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000);
              }}>
                {linkCopiado ? "¡Copiado!" : "Copiar enlace"}
              </button>
            </div>
          </div>
        )}

        <button style={styles.btnSecondaryNavy} onClick={() => { setForm(FORM_VACIO); setFirma(""); setArchivosBrilla({ recibo_matricula: null, recibo_servicio_brilla: null, cedula_titular_recibo: null }); setEnviado(false); setEsBrillaEnviado(false); setIdGenerado(null); setTokenCodeudor(null); }}>
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={styles.formCard}>
      <div style={styles.field}>
        <label style={styles.label}>Tipo de crédito</label>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="button" onClick={() => set("tipo_credito", "Matrícula")}
            style={{ flex: "1 1 30%", minWidth: "140px", padding: "0.65rem 0.75rem", borderRadius: "9px", border: `1.5px solid ${form.tipo_credito === "Matrícula" ? palette.navy : palette.border}`, background: form.tipo_credito === "Matrícula" ? palette.navy + "10" : palette.card, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: "700", color: form.tipo_credito === "Matrícula" ? palette.navy : palette.text, margin: 0 }}>Crédito de Matrícula</p>
            <p style={{ fontSize: "0.7rem", color: palette.muted, margin: "2px 0 0" }}>Institucional — proceso estándar</p>
          </button>
          <button type="button" onClick={() => set("tipo_credito", "Brilla")}
            style={{ flex: "1 1 30%", minWidth: "140px", padding: "0.65rem 0.75rem", borderRadius: "9px", border: `1.5px solid ${form.tipo_credito === "Brilla" ? palette.gold : palette.border}`, background: form.tipo_credito === "Brilla" ? palette.gold + "12" : palette.card, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: "700", color: form.tipo_credito === "Brilla" ? palette.gold : palette.text, margin: 0 }}>Crédito Brilla</p>
            <p style={{ fontSize: "0.7rem", color: palette.muted, margin: "2px 0 0" }}>Aliado externo — condiciones próximamente</p>
          </button>
          <button type="button" onClick={() => set("tipo_credito", "ICETEX")}
            style={{ flex: "1 1 30%", minWidth: "140px", padding: "0.65rem 0.75rem", borderRadius: "9px", border: `1.5px solid ${form.tipo_credito === "ICETEX" ? palette.green : palette.border}`, background: form.tipo_credito === "ICETEX" ? palette.green + "12" : palette.card, cursor: "pointer", fontFamily: "'Inter',sans-serif", textAlign: "left" }}>
            <p style={{ fontSize: "0.82rem", fontWeight: "700", color: form.tipo_credito === "ICETEX" ? palette.green : palette.text, margin: 0 }}>Crédito ICETEX</p>
            <p style={{ fontSize: "0.7rem", color: palette.muted, margin: "2px 0 0" }}>Aliado externo — condiciones próximamente</p>
          </button>
        </div>
      </div>

      <p style={styles.formGroupLabel}>Tus datos (deudor)</p>
      <div style={styles.formGrid2} className="ucr-form-grid">
        <div style={styles.field}>
          <label style={styles.label}>Nombre completo *</label>
          <input style={styles.input} value={form.deudor_nombre} onChange={e => set("deudor_nombre", e.target.value)} placeholder="Nombre y apellidos" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Cédula *</label>
          <input style={styles.input} value={form.deudor_cc} onChange={e => set("deudor_cc", e.target.value)} placeholder="Ej: 1002345678" />
        </div>
      </div>
      <div style={styles.formGrid2} className="ucr-form-grid">
        <div style={styles.field}>
          <label style={styles.label}>Correo electrónico *</label>
          <input style={styles.input} type="email" value={form.deudor_email} onChange={e => set("deudor_email", e.target.value)} placeholder="tucorreo@ejemplo.com" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Teléfono *</label>
          <input style={styles.input} value={form.deudor_telefono} onChange={e => set("deudor_telefono", e.target.value)} placeholder="Ej: 3201234567" />
        </div>
      </div>
      <div style={styles.field}>
        <label style={styles.label}>Dirección de residencia *</label>
        <input style={styles.input} value={form.deudor_direccion} onChange={e => set("deudor_direccion", e.target.value)} placeholder="Dirección completa" />
      </div>
      <div style={styles.formGrid3} className="ucr-form-grid3">
        <div style={styles.field}>
          <label style={styles.label}>Programa académico</label>
          <select style={styles.input} value={form.deudor_programa} onChange={e => set("deudor_programa", e.target.value)}>
            {PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Semestre</label>
          <select style={styles.input} value={form.deudor_semestre} onChange={e => set("deudor_semestre", e.target.value)}>
            {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semestre {s}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Jornada</label>
          <select style={styles.input} value={form.deudor_jornada} onChange={e => set("deudor_jornada", e.target.value)}>
            {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
      </div>

      {form.tipo_credito === "Brilla" ? (
        <div style={styles.docsBox}>
          <p style={styles.docsTitle}>Documentos para Brilla</p>
          <p style={styles.docsSub}>
            Brilla evalúa y aprueba directamente sobre el cupo disponible en tu recibo de servicio público —
            la Universidad no interviene en esa decisión, solo la recibe para gestionar tu matrícula.
            Asegúrate de que el recibo tenga cupo suficiente para cubrir el valor de tu matrícula.
          </p>
          {[
            ["recibo_matricula", "Recibo de matrícula (factura de las materias)", "Generado al registrar tus materias — indica el valor exacto a financiar."],
            ["recibo_servicio_brilla", "Recibo de servicio público con cupo Brilla", "El más reciente, con el cupo disponible visible."],
            ["cedula_titular_recibo", "Cédula del titular del recibo", "Debe ser la misma persona a nombre de quien está el recibo."],
          ].map(([campo, titulo, ayuda]) => (
            <div key={campo} style={{ ...styles.field, marginBottom: "1rem" }}>
              <label style={styles.label}>{titulo} *</label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={e => setArchivo(campo, e.target.files[0] || null)}
                style={styles.input}
              />
              <span style={{ fontSize: "0.72rem", color: palette.muted }}>{ayuda}</span>
              {archivosBrilla[campo] && <span style={{ fontSize: "0.75rem", color: palette.green, fontWeight: "600" }}>✓ {archivosBrilla[campo].name}</span>}
            </div>
          ))}
        </div>
      ) : (
        <>
          <p style={{ ...styles.formGroupLabel, marginTop: "0.5rem" }}>Datos del codeudor</p>
          <div style={styles.formGrid2} className="ucr-form-grid">
            <div style={styles.field}>
              <label style={styles.label}>Nombre completo *</label>
              <input style={styles.input} value={form.codeudor_nombre} onChange={e => set("codeudor_nombre", e.target.value)} placeholder="Nombre y apellidos" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Cédula *</label>
              <input style={styles.input} value={form.codeudor_cc} onChange={e => set("codeudor_cc", e.target.value)} placeholder="Ej: 1010234567" />
            </div>
          </div>
          <div style={styles.formGrid2} className="ucr-form-grid">
            <div style={styles.field}>
              <label style={styles.label}>Teléfono *</label>
              <input style={styles.input} value={form.codeudor_telefono} onChange={e => set("codeudor_telefono", e.target.value)} placeholder="Ej: 3109876543" />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Ingreso mensual (≥ 2 SMMLV) *</label>
              <input style={styles.input} type="number" min="0" value={form.codeudor_ingreso} onChange={e => set("codeudor_ingreso", e.target.value)} placeholder="Ej: 2800000" />
            </div>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Dirección de residencia *</label>
            <input style={styles.input} value={form.codeudor_direccion} onChange={e => set("codeudor_direccion", e.target.value)} placeholder="Dirección completa" />
          </div>
        </>
      )}

      <div style={styles.field}>
        <label style={styles.label}>¿Algo más que quieras contarnos? (opcional)</label>
        <textarea style={{ ...styles.input, height: "80px", resize: "vertical", paddingTop: "0.65rem" }} value={form.mensaje} onChange={e => set("mensaje", e.target.value)} placeholder="Preguntas o comentarios adicionales..." />
      </div>

      {form.tipo_credito !== "Brilla" && (
        <>
          <div style={styles.firmaBox}>
            <p style={styles.docsTitle}>Firma digital</p>
            <p style={styles.docsSub}>
              Con esta firma generamos automáticamente tu Solicitud de Crédito, Pagaré y Autorización
              de Centrales de Riesgo — ya diligenciados y firmados, sin que tengas que llenar nada a mano.
            </p>
            <FirmaDigital value={firma} onChange={setFirma} />
          </div>

          <div style={styles.docsBox}>
            <p style={styles.docsTitle}>Solo falta un documento — la Carta de Instrucciones</p>
            <p style={styles.docsSub}>
              Por ley (Art. 622 del Código de Comercio), la Carta de Instrucciones necesita
              autenticación ante notaría por ti y tu codeudor — ese requisito no se puede resolver
              con firma digital. Descárgala, diligénciala y llévala a notaría cuanto antes.
            </p>
            <div style={styles.docsGrid}>
              {DOCUMENTOS.filter(d => d.archivo === "carta_instrucciones.pdf" || d.archivo === "indicaciones_diligenciamiento.pdf").map(d => (
                <a key={d.archivo} href={`/formatos/${d.archivo}`} download style={styles.docLink}>
                  <span style={styles.docLinkIcon}>↓</span>
                  <span>{d.nombre}</span>
                </a>
              ))}
            </div>
            <label style={styles.checkboxRow}>
              <input type="checkbox" checked={descargados} onChange={e => setDescargados(e.target.checked)} style={styles.checkbox} />
              <span>Entiendo que debo descargar, diligenciar y autenticar ante notaría la Carta de Instrucciones.</span>
            </label>
          </div>
        </>
      )}

      {error && <p style={styles.formError}>{error}</p>}

      <button type="submit" style={{ ...styles.btnPrimaryNavy, opacity: loading ? 0.7 : 1 }} disabled={loading}>
        {loading ? "Enviando..." : "Enviar solicitud →"}
      </button>
      <p style={styles.formNote}>
        Esta preinscripción no crea tu crédito automáticamente — el Departamento Financiero
        se comunicará contigo para continuar con el proceso oficial.
      </p>
    </form>
  );
}

export default function Solicitud() {
  const navigate = useNavigate();
  return (
    <div style={styles.page}>
      <Navbar />

      <section style={styles.banner}>
        <div style={styles.bannerInner}>
          <img src={logoIcono} alt="Uniautónoma del Cauca" style={styles.bannerLogo} />
          <span style={styles.eyebrow}>Da el primer paso</span>
          <h1 style={styles.bannerTitle}>Solicita tu crédito de matrícula</h1>
          <p style={styles.bannerSub}>
            Llena tus datos y los de tu codeudor. El Departamento Financiero revisará tu
            preinscripción y se pondrá en contacto contigo para continuar con el proceso oficial.
          </p>
        </div>
      </section>

      <section style={styles.formSection}>
        <div style={styles.formWrap}>
          <SolicitudForm />
          <button style={styles.linkBack} onClick={() => navigate("/")}>← Volver al inicio</button>
        </div>
      </section>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; margin: 0; }
        input:focus, select:focus, textarea:focus { outline: none; border-color: #1e3a5f !important; box-shadow: 0 0 0 3px rgba(30,58,95,0.1); }
        @media (max-width: 640px) {
          .ucr-form-grid, .ucr-form-grid3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  page: { background: palette.card, minHeight: "100vh" },

  banner: { background: `linear-gradient(160deg, ${palette.brandNavy} 0%, #142766 100%)`, padding: "3rem 1.5rem 3.5rem", textAlign: "center" },
  bannerInner: { maxWidth: "560px", margin: "0 auto" },
  bannerLogo: { width: "48px", height: "48px", objectFit: "contain", marginBottom: "1rem" },
  eyebrow: { display: "block", fontSize: "0.75rem", fontWeight: "700", color: palette.gold, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.5rem" },
  bannerTitle: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1.9rem", color: "#fff", marginBottom: "0.75rem" },
  bannerSub: { fontSize: "0.92rem", color: "rgba(255,255,255,0.8)", lineHeight: 1.6 },

  formSection: { padding: "3rem 1.5rem 4rem", background: palette.beige },
  formWrap: { maxWidth: "700px", margin: "-3.5rem auto 0" },
  linkBack: { display: "block", margin: "1.25rem auto 0", background: "none", border: "none", color: palette.navy, fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif" },

  // Formulario
  formCard:     { background: palette.card, border: `1px solid ${palette.border}`, borderRadius: "18px", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", boxShadow: "0 10px 40px rgba(30,53,136,0.1)" },
  formGroupLabel: { fontSize: "0.72rem", fontWeight: "700", color: palette.orange, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem" },
  formGrid2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  formGrid3:    { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" },
  field:        { display: "flex", flexDirection: "column", gap: "5px" },
  label:        { fontSize: "0.8rem", fontWeight: "600", color: palette.text },
  input:        { padding: "0.65rem 0.8rem", border: `1.5px solid ${palette.border}`, borderRadius: "9px", fontSize: "0.88rem", color: palette.text, background: palette.beige, fontFamily: "'Inter',sans-serif" },
  formError:    { fontSize: "0.82rem", color: palette.red, background: "#fdf0ee", border: "1px solid #f5c6c0", borderRadius: "8px", padding: "0.6rem 0.9rem" },
  btnPrimaryNavy: { padding: "0.85rem", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.92rem", fontWeight: "700", cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: "0 4px 14px rgba(30,58,95,0.25)" },
  btnSecondaryNavy: { padding: "0.75rem 1.4rem", background: "none", border: `1.5px solid ${palette.navy}`, color: palette.navy, borderRadius: "10px", fontSize: "0.88rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  formNote:     { fontSize: "0.76rem", color: palette.muted, textAlign: "center", lineHeight: 1.5, margin: 0 },

  // Bloque de descarga de formatos
  docsBox:      { background: palette.beigeAlt, border: `1px solid ${palette.border}`, borderRadius: "12px", padding: "1.25rem" },
  firmaBox:     { background: palette.card, border: `1px solid ${palette.border}`, borderRadius: "12px", padding: "1.25rem" },
  docsGeneradosBox:   { background: palette.beige, border: `1px solid ${palette.border}`, borderRadius: "12px", padding: "1.1rem", marginBottom: "1.5rem", textAlign: "left" },
  docsGeneradosTitle: { fontSize: "0.85rem", fontWeight: "700", color: palette.navy, margin: "0 0 0.6rem" },
  docsGeneradosGrid:  { display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" },
  docGeneradoLink:    { display: "flex", alignItems: "center", gap: "0.5rem", background: palette.card, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.6rem 0.8rem", fontSize: "0.85rem", color: palette.navy, fontWeight: "600", textDecoration: "none" },
  docGeneradoIcon:    { color: palette.green, fontWeight: "700" },
  docsGeneradosNota:  { fontSize: "0.78rem", color: palette.muted, lineHeight: 1.5, margin: 0 },
  codeudorLinkBox:    { background: palette.gold + "12", border: `1px solid ${palette.gold}40`, borderRadius: "12px", padding: "1.1rem", marginBottom: "1.5rem", textAlign: "left" },
  codeudorLinkRow:    { display: "flex", gap: "0.5rem" },
  codeudorLinkInput:  { flex: 1, padding: "0.6rem 0.8rem", borderRadius: "8px", border: `1px solid ${palette.border}`, fontSize: "0.78rem", color: palette.text, background: palette.card, fontFamily: "monospace" },
  codeudorLinkBtn:    { padding: "0.6rem 1rem", background: palette.gold, color: "#fff", border: "none", borderRadius: "8px", fontSize: "0.8rem", fontWeight: "700", cursor: "pointer", whiteSpace: "nowrap" },
  docsTitle:    { fontSize: "0.88rem", fontWeight: "700", color: palette.navy, margin: "0 0 0.35rem" },
  docsSub:      { fontSize: "0.8rem", color: palette.muted, lineHeight: 1.55, margin: "0 0 1rem" },
  docsGrid:     { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.5rem", marginBottom: "1rem" },
  docLink:      { display: "flex", alignItems: "center", gap: "0.5rem", background: palette.card, border: `1px solid ${palette.border}`, borderRadius: "8px", padding: "0.55rem 0.75rem", fontSize: "0.8rem", color: palette.text, textDecoration: "none", fontWeight: "500" },
  docLinkIcon:  { color: palette.orange, fontWeight: "700", flexShrink: 0 },
  checkboxRow:  { display: "flex", alignItems: "flex-start", gap: "0.55rem", fontSize: "0.82rem", color: palette.text, lineHeight: 1.4, cursor: "pointer" },
  checkbox:     { marginTop: "3px", width: "16px", height: "16px", flexShrink: 0, accentColor: palette.navy, cursor: "pointer" },
  formSuccessBox: { background: palette.card, border: `1px solid ${palette.border}`, borderRadius: "18px", padding: "3rem 2rem", textAlign: "center", boxShadow: "0 10px 40px rgba(30,53,136,0.1)" },
  formSuccessIcon: { width: "56px", height: "56px", borderRadius: "50%", background: palette.green + "18", color: palette.green, fontSize: "1.6rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" },
  formSuccessTitle: { fontFamily: "'Lora',serif", fontWeight: "700", fontSize: "1.3rem", color: palette.navy, marginBottom: "0.5rem" },
  formSuccessText: { fontSize: "0.9rem", color: palette.muted, lineHeight: 1.6, marginBottom: "1.5rem", maxWidth: "480px", marginLeft: "auto", marginRight: "auto" },
};