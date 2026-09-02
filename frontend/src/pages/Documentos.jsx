import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import documentosService from "../services/documentosService";
import creditosService from "../services/creditosService";
import {
  IconCheckCircle, IconXCircle, IconClock, IconFileText, IconFolder,
  IconClipboard, IconUpload, IconMail, IconInbox, IconSearch, IconAlertTriangle,
} from "../components/Icons";
import DateFilter from "../components/DateFilter";

const palette = {
  navy:     "#1e3a5f",
  orange:   "#e8740e",
  gold:     "#c89b14",
  beige:    "#f3ede1",
  beigeAlt: "#ede6d8",
  text:     "#2c3e50",
  muted:    "#6b7a8d",
  green:    "#1d9e75",
  red:      "#c0392b",
  card:     "#ffffff",
  border:   "rgba(30,58,95,0.1)",
};

const fmtDate = (d) => new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" });
const fmtSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

// ─── Tipos de documento reales — deben coincidir EXACTO con TIPOS_VALIDOS en documentos.php ───
const TIPOS_REQUERIDOS = [
  { id: "solicitud_credito",       nombre: "Solicitud de Crédito",                  descripcion: "Formato diligenciado — solo campos de deudor y codeudor, sin fechas ni valores", requerido: true, grupo: "Formatos" },
  { id: "pagare",                  nombre: "Pagaré",                                 descripcion: "No autenticar. Firma, nombre, C.C., dirección y huella del deudor y codeudor",     requerido: true, grupo: "Formatos" },
  { id: "carta_instrucciones",     nombre: "Carta de Instrucciones",                 descripcion: "Autenticada ante notaría por estudiante y codeudor",                                requerido: true, grupo: "Formatos" },
  { id: "autorizacion_datacredito",nombre: "Autorización Centrales de Riesgo",       descripcion: "Formato F-AD-FI-OI — firmas de deudor y codeudor según cédula",                     requerido: true, grupo: "Formatos" },
  { id: "cedula_deudor",           nombre: "Cédula del estudiante (deudor)",         descripcion: "Copia legible ambas caras",                                                          requerido: true, grupo: "Soportes" },
  { id: "cedula_codeudor",         nombre: "Cédula del codeudor",                    descripcion: "Copia legible ambas caras",                                                          requerido: true, grupo: "Soportes" },
  { id: "ingresos_codeudor",       nombre: "Carta laboral / Certificado de ingresos", descripcion: "No mayor a 30 días, ingreso ≥ 2 SMMLV (o 2 últimos desprendibles de pago)",     requerido: true, grupo: "Soportes" },
  { id: "servicio_publico",        nombre: "Recibo de servicio público",             descripcion: "Del estudiante — dirección debe coincidir con la solicitud",                        requerido: true, grupo: "Soportes" },
  { id: "pago_datacredito",        nombre: "Soporte de pago — consulta Datacrédito", descripcion: "Pago de la consulta en centrales de riesgo (PSE o Davivienda)",                      requerido: true, grupo: "Soportes" },
];
// Nota: se retiró el tipo "otro" — el backend (TIPOS_VALIDOS en documentos.php) no lo acepta
// y rechazaría la subida con error 400. Si se necesita, hay que agregarlo primero en el backend.

const GRUPOS = ["Formatos", "Soportes"];

// ─── Deriva el color de un estado — mismo patrón que Creditos.jsx ─────────────
function getEstadoColor(estado) {
  if (estado === "Aprobado") return "green";
  if (estado === "Rechazado") return "red";
  if (estado === "En revisión") return "orange";
  return "muted";
}

// ─── Componentes compartidos ───────────────────────────────────────────────────
function Spinner() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}><div style={{ width: "36px", height: "36px", border: `3px solid ${palette.beigeAlt}`, borderTopColor: palette.navy, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>;
}

function EstadoBadge({ estado, color }) {
  const map = {
    green:  { bg: "#1d9e7518", text: "#1d9e75", Icon: IconCheckCircle },
    red:    { bg: "#c0392b18", text: "#c0392b", Icon: IconXCircle },
    orange: { bg: "#e8740e18", text: "#e8740e", Icon: IconClock },
    gold:   { bg: "#c89b1418", text: "#c89b14", Icon: IconClock },
    muted:  { bg: "#6b7a8d18", text: "#6b7a8d", Icon: null },
  };
  const c = map[color] || map.muted;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "0.22rem 0.7rem", borderRadius: "99px", fontSize: "0.72rem", fontWeight: "600", whiteSpace: "nowrap", background: c.bg, color: c.text }}>
      {c.Icon && <c.Icon size={12} strokeWidth={2.5} />} {estado}
    </span>
  );
}

function FileIcon({ nombre }) {
  const ext  = nombre?.split(".").pop()?.toLowerCase();
  const map  = { pdf: { color: "#e53935", label: "PDF" }, jpg: { color: "#f57c00", label: "IMG" }, jpeg: { color: "#f57c00", label: "IMG" }, png: { color: "#0288d1", label: "PNG" }, doc: { color: "#1565c0", label: "DOC" }, docx: { color: "#1565c0", label: "DOC" } };
  const info = map[ext] || { color: palette.muted, label: ext?.toUpperCase() || "?" };
  return (
    <div style={{ width: "38px", height: "38px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: info.color + "15", border: `1.5px solid ${info.color}30` }}>
      <span style={{ fontSize: "0.6rem", fontWeight: "700", color: info.color }}>{info.label}</span>
    </div>
  );
}

function DropZone({ onFile, inputRef }) {
  const [drag, setDrag] = useState(false);
  const handleDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); };
  return (
    <div style={{ border: `2px dashed rgba(30,58,95,${drag ? "0.5" : "0.2"})`, borderRadius: "12px", padding: "2rem 1.5rem", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: drag ? "rgba(30,58,95,0.04)" : palette.beige, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={handleDrop} onClick={() => inputRef.current.click()}>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <div style={{color:palette.muted}}><IconFolder size={32} strokeWidth={1.5} /></div>
      <p style={{ fontSize: "0.85rem", color: palette.text, margin: 0 }}>Arrastra aquí o <span style={{ color: palette.navy, fontWeight: "600" }}>haz clic para seleccionar</span></p>
      <p style={{ fontSize: "0.75rem", color: palette.muted, margin: 0 }}>PDF, JPG, PNG, DOC · Máximo 5 MB</p>
    </div>
  );
}

// ─── Modal subida (estudiante) ─────────────────────────────────────────────────
function ModalSubida({ tipo, creditoId, onClose, onSubido }) {
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError]       = useState("");
  const fileInputRef            = useRef();
  const tipoInfo = TIPOS_REQUERIDOS.find(t => t.id === tipo);

  const handleFile = (f) => { if (f.size > 5 * 1024 * 1024) { setError("El archivo supera los 5 MB."); return; } setFile(f); setError(""); };
  const handleSubir = async () => {
    if (!file) { setError("Selecciona un archivo."); return; }
    setError(""); setLoading(true); setProgreso(0);
    try {
      await documentosService.subir(creditoId, tipo, file, (pct) => setProgreso(pct));
      setLoading(false);
      onSubido();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || "No se pudo subir el documento. Intenta nuevamente.");
    }
  };

  // El botón principal hace una de dos cosas según el estado:
  // sin archivo → abre el selector; con archivo → sube de verdad.
  // Así no importa qué parte del modal toque la persona, siempre pasa algo.
  const handleBotonPrincipal = () => {
    if (!file) { fileInputRef.current?.click(); return; }
    handleSubir();
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Subir documento</h3><p style={styles.modalSub}>{tipoInfo?.nombre}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.infoBox}><span>ℹ️</span><p style={{ fontSize: "0.8rem", color: palette.muted, margin: 0, lineHeight: 1.5 }}>{tipoInfo?.descripcion}</p></div>
        {!loading ? (
          <>
            <DropZone onFile={handleFile} inputRef={fileInputRef} />
            {file && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: palette.beige, borderRadius: "9px", padding: "0.65rem 0.9rem", marginTop: "0.75rem" }}>
                <FileIcon nombre={file.name} />
                <div style={{ flex: 1, overflow: "hidden" }}><p style={styles.fileName}>{file.name}</p><p style={styles.fileMeta}>{fmtSize(file.size)}</p></div>
                <button style={{ background: "none", border: "none", color: palette.muted, cursor: "pointer" }} onClick={() => setFile(null)}>✕</button>
              </div>
            )}
            {error && <p style={{ fontSize: "0.78rem", color: palette.red, margin: "0.3rem 0 0" }}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button style={styles.btnPrimary} onClick={handleBotonPrincipal}>
                {file ? "↑ Subir documento" : "Seleccionar archivo"}
              </button>
              <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <p style={{ color: palette.navy, fontWeight: "600", marginBottom: "0.75rem" }}>Subiendo archivo...</p>
            <div style={{ height: "8px", background: palette.beigeAlt, borderRadius: "99px", overflow: "hidden" }}>
              <div style={{ height: "100%", background: `linear-gradient(90deg, ${palette.navy}, #2a5080)`, borderRadius: "99px", width: `${progreso}%`, transition: "width 0.2s" }} />
            </div>
            <p style={{ color: palette.muted, fontSize: "0.8rem", marginTop: "0.5rem" }}>{Math.round(progreso)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal revisar documento (admin) ──────────────────────────────────────────
function ModalRevisarDoc({ doc, onClose, onActualizado }) {
  const tipoInfo   = TIPOS_REQUERIDOS.find(t => t.id === doc.tipo);
  const [accion, setAccion]       = useState("");
  const [observacion, setObservacion] = useState(doc.observacion || "");
  const [loading, setLoading]     = useState(false);
  const [paso, setPaso]           = useState(1);
  const [error, setError]         = useState("");

  const ESTADO_REAL = { aprobar: "Aprobado", rechazar: "Rechazado", revision: "En revisión" };

  const handleGuardar = async () => {
    if (!accion) { setError("Selecciona una acción."); return; }
    if (accion === "rechazar" && !observacion.trim()) { setError("Escribe el motivo del rechazo."); return; }
    setError(""); setLoading(true);
    try {
      await documentosService.revisar(doc.id, ESTADO_REAL[accion], observacion.trim() || null);
      setLoading(false);
      setPaso(2);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || "No se pudo guardar la revisión. Intenta nuevamente.");
    }
  };

  const colorAccion = accion === "aprobar" ? palette.green : accion === "rechazar" ? palette.red : palette.orange;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "500px" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>{paso === 2 ? "Revisión guardada" : "Revisar documento"}</h3>
            <p style={styles.modalSub}>{doc.estudiante_nombre} · {tipoInfo?.nombre}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {paso === 1 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: palette.beige, borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "1rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2a5080)", color: "#fff", fontWeight: "700", fontSize: "0.88rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {doc.estudiante_nombre.charAt(0)}
              </div>
              <div>
                <p style={{ fontSize: "0.88rem", fontWeight: "700", color: palette.navy, margin: 0 }}>{doc.estudiante_nombre}</p>
                <p style={{ fontSize: "0.72rem", color: palette.muted, margin: "2px 0 0" }}>C.C. {doc.estudiante_cc} · {doc.credito_codigo}</p>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: palette.beige, borderRadius: "10px", padding: "0.75rem 1rem", marginBottom: "0.75rem" }}>
              <FileIcon nombre={doc.nombre_archivo} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <p style={{ fontSize: "0.8rem", fontWeight: "600", color: palette.text, margin: 0 }}>{tipoInfo?.nombre}</p>
                <p style={styles.fileName}>{doc.nombre_archivo}</p>
                <p style={styles.fileMeta}>{fmtSize(doc.tamanio_bytes)} · Subido {fmtDate(doc.fecha_subida)}</p>
              </div>
              <button style={{ ...styles.btnSecondary, padding: "0.3rem 0.7rem", fontSize: "0.75rem" }} onClick={() => window.open(documentosService.getUrlDescarga(doc.id), "_blank")}>↓ Ver</button>
            </div>

            {/* Checklist de validación según el procedimiento institucional */}
            <div style={{ background: palette.navy + "06", border: `1px dashed ${palette.navy}25`, borderRadius: "9px", padding: "0.7rem 0.9rem", marginBottom: "1.25rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: "700", color: palette.navy, margin: "0 0 0.4rem" }}>Verificar antes de aprobar:</p>
              <p style={{ fontSize: "0.74rem", color: palette.text, margin: "0 0 3px" }}>· Correcto diligenciamiento del formato</p>
              <p style={{ fontSize: "0.74rem", color: palette.text, margin: "0 0 3px" }}>· Firmas de deudor y codeudor coinciden con cédula</p>
              <p style={{ fontSize: "0.74rem", color: palette.text, margin: "0 0 3px" }}>· Autenticación notarial (si aplica — Carta de Instrucciones)</p>
              <p style={{ fontSize: "0.74rem", color: palette.text, margin: 0 }}>· Correspondencia con la información de la solicitud</p>
            </div>

            <p style={{ fontSize: "0.82rem", fontWeight: "600", color: palette.text, marginBottom: "0.6rem" }}>Decisión</p>
            <div style={{ display: "flex", gap: "0.6rem", marginBottom: "1rem" }}>
              {[
                { key: "aprobar",   label: "✓ Aprobar",   color: palette.green  },
                { key: "revision",  label: "En revisión", color: palette.orange },
                { key: "rechazar",  label: "✕ Rechazar",  color: palette.red    },
              ].map(a => (
                <button key={a.key} style={{
                  flex: 1, padding: "0.6rem", border: "1.5px solid",
                  borderColor: accion === a.key ? a.color : palette.border,
                  borderRadius: "9px", fontSize: "0.78rem", fontWeight: "600",
                  background: accion === a.key ? a.color + "12" : "transparent",
                  color: accion === a.key ? a.color : palette.muted,
                  cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                }} onClick={() => { setAccion(a.key); setError(""); }}>
                  {a.label}
                </button>
              ))}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>
                {accion === "rechazar" ? "Documentos faltantes / inconsistencias *" : "Observación (opcional)"}
              </label>
              <textarea
                style={{ ...styles.input, height: "75px", resize: "vertical", paddingLeft: "0.9rem" }}
                placeholder={accion === "rechazar" ? "Relaciona lo que el estudiante debe corregir o subsanar..." : "Notas adicionales..."}
                value={observacion}
                onChange={e => setObservacion(e.target.value)}
                maxLength={300}
              />
              <span style={{ fontSize: "0.68rem", color: palette.muted, alignSelf: "flex-end" }}>{observacion.length}/300</span>
            </div>

            {error && <p style={{ fontSize: "0.78rem", color: palette.red, margin: "0.25rem 0 0" }}>{error}</p>}

            {loading ? (
              <div style={{ textAlign: "center", padding: "0.75rem 0" }}><div style={styles.spinner} /></div>
            ) : (
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                <button style={{
                  ...styles.btnPrimary,
                  background: accion === "aprobar" ? `linear-gradient(135deg, ${palette.green}, #16a085)` :
                               accion === "rechazar" ? `linear-gradient(135deg, ${palette.red}, #a93226)` :
                               `linear-gradient(135deg, ${palette.navy}, #2a5080)`,
                }} onClick={handleGuardar}>
                  Guardar decisión ✓
                </button>
                <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
              </div>
            )}
          </>
        )}

        {paso === 2 && (
          <div style={{ textAlign: "center", padding: "0.5rem 0 0.75rem" }}>
            <div style={{ ...styles.successIcon, background: colorAccion + "18", color: colorAccion }}>✓</div>
            <p style={{ color: palette.text, fontSize: "0.88rem", marginBottom: "0.25rem", fontWeight: "600" }}>
              Documento {accion === "aprobar" ? "aprobado" : accion === "rechazar" ? "rechazado" : "marcado en revisión"}
            </p>
            <p style={{ color: palette.muted, fontSize: "0.78rem", marginBottom: "1.5rem" }}>
              {accion === "rechazar" ? "La solicitud será devuelta al estudiante para corrección." : "El expediente del estudiante ha sido actualizado."}
            </p>
            <button style={styles.btnPrimary} onClick={() => { onActualizado(); onClose(); }}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ESTUDIANTE
// ══════════════════════════════════════════════════════════════════════════════
function DocumentosEstudiante() {
  const [creditos, setCreditos]     = useState([]);
  const [creditoSel, setCreditoSel] = useState(null);
  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalTipo, setModalTipo]   = useState(null);
  const [filtro, setFiltro]         = useState("todos");

  // ─── Cargar los créditos del estudiante (para el selector) ─────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await creditosService.getMisCreditos();
        const lista = data.creditos || [];
        setCreditos(lista);
        if (lista.length > 0) setCreditoSel(lista[0].id);
        else setLoading(false);
      } catch (err) { console.error(err); setLoading(false); }
    })();
  }, []);

  // ─── Cargar los documentos del crédito seleccionado ────────────────────────
  const cargarDocs = async () => {
    if (!creditoSel) return;
    setLoading(true);
    try {
      const data = await documentosService.getMisDocumentos(creditoSel);
      setDocs(data.documentos || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarDocs(); }, [creditoSel]);

  const getDocDeTipo = (tipoId) => docs.find(d => d.tipo === tipoId);

  const handleSubido = () => { cargarDocs(); };

  if (loading && docs.length === 0 && creditos.length === 0) return <Spinner />;

  if (creditos.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "3rem", background: palette.card, borderRadius: "14px" }}>
        <div style={{color:palette.muted}}><IconInbox size={36} strokeWidth={1.5} /></div>
        <p style={{ color: palette.muted, fontSize: "0.9rem" }}>Aún no tienes ninguna solicitud de crédito. Crea una en la sección <strong>Créditos</strong> para poder subir documentos.</p>
      </div>
    );
  }

  const total      = TIPOS_REQUERIDOS.filter(t => t.requerido).length;
  const aprobados  = docs.filter(d => d.estado === "Aprobado").length;
  const rechazados = docs.filter(d => d.estado === "Rechazado").length;
  const revision   = docs.filter(d => d.estado === "En revisión").length;
  const pendientes = TIPOS_REQUERIDOS.filter(t => t.requerido && !getDocDeTipo(t.id)).length;
  const subidos    = total - pendientes; // documentos ya cargados, sin importar el estado

  const docsFiltrados = filtro === "todos" ? docs : docs.filter(d => {
    if (filtro === "aprobado")  return d.estado === "Aprobado";
    if (filtro === "revision")  return d.estado === "En revisión";
    if (filtro === "rechazado") return d.estado === "Rechazado";
    return true;
  });

  return (
    <div style={{ animation: "fadeIn 0.35s ease" }}>
      <div style={styles.secHeader}>
        <div>
          <h2 style={styles.secTitle}>Documentos</h2>
          <p style={styles.secSub}>Formatos y soportes requeridos para tu solicitud de crédito</p>
        </div>
        <select style={styles.creditoSelect} value={creditoSel || ""} onChange={e => setCreditoSel(Number(e.target.value))}>
          {creditos.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.tipo}</option>)}
        </select>
      </div>

      <div style={{ ...styles.infoBox, marginBottom: "1.25rem" }}>
        <IconMail size={18} style={{color:palette.navy,flexShrink:0}} />
        <p style={{ fontSize: "0.78rem", color: palette.text, margin: 0, lineHeight: 1.5 }}>
          Cuando tengas todo aprobado, recuerda que también puedes enviar el paquete completo a <strong>financiamiento@uniautonoma.edu.co</strong> o entregarlo físicamente en el Departamento Financiero.
        </p>
      </div>

      <div style={styles.statsGrid}>
        {[
          { label: "Requeridos",  val: total,      color: palette.navy,   Icon: IconClipboard },
          { label: "Aprobados",   val: aprobados,  color: palette.green,  Icon: IconCheckCircle },
          { label: "En revisión", val: revision,   color: palette.orange, Icon: IconClock },
          { label: "Rechazados",  val: rechazados, color: palette.red,    Icon: IconXCircle },
          { label: "Pendientes",  val: pendientes, color: palette.gold,   Icon: IconUpload },
        ].map(s => (
          <div key={s.label} style={{ ...styles.statCard, borderTop: `3px solid ${s.color}` }}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{ ...styles.statVal, color: s.color }}>{s.val}</p></div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: palette.navy }}>Completitud del expediente</span>
          <span style={{ fontSize: "0.85rem", fontWeight: "700", color: palette.navy }}>{subidos}/{total} subidos · {aprobados}/{total} aprobados</span>
        </div>
        <div style={{ position: "relative", height: "10px", background: palette.beigeAlt, borderRadius: "99px", overflow: "hidden" }}>
          {/* Capa naranja: documentos ya subidos (en revisión o rechazados), se llena apenas subes algo */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "99px", background: palette.orange + "80", width: `${total > 0 ? (subidos / total) * 100 : 0}%`, transition: "width 0.6s ease" }} />
          {/* Capa verde: documentos ya aprobados de verdad, va por encima */}
          <div style={{ position: "absolute", inset: 0, borderRadius: "99px", background: `linear-gradient(90deg, ${palette.green}, #16a085)`, width: `${total > 0 ? (aprobados / total) * 100 : 0}%`, transition: "width 0.6s ease" }} />
        </div>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.72rem", color: palette.muted, display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: palette.green, display: "inline-block" }} /> Aprobado
          </span>
          <span style={{ fontSize: "0.72rem", color: palette.muted, display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: palette.orange, display: "inline-block" }} /> Subido, en revisión
          </span>
          <span style={{ fontSize: "0.72rem", color: palette.muted, display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: palette.beigeAlt, border: `1px solid ${palette.border}`, display: "inline-block" }} /> Sin subir
          </span>
        </div>
        {pendientes > 0 && (
          <p style={{ fontSize: "0.78rem", color: palette.orange, marginTop: "0.6rem", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
            <IconAlertTriangle size={14} /> Faltan {pendientes} documento{pendientes > 1 ? "s" : ""} por subir.
          </p>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
        {/* Tipos requeridos agrupados */}
        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: palette.navy, marginBottom: "1rem" }}>Documentos requeridos</h3>
          {GRUPOS.map(grupo => {
            const tiposGrupo = TIPOS_REQUERIDOS.filter(t => t.grupo === grupo);
            if (tiposGrupo.length === 0) return null;
            return (
              <div key={grupo} style={{ marginBottom: "1.25rem" }}>
                <p style={{ fontSize: "0.7rem", fontWeight: "700", color: palette.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.6rem" }}>{grupo}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {tiposGrupo.map(tipo => {
                    const doc = getDocDeTipo(tipo.id);
                    const borderColor = doc?.estadoColor === "green" ? palette.green : doc?.estadoColor === "red" ? palette.red : doc?.estadoColor === "orange" ? palette.orange : tipo.requerido ? palette.gold : palette.border;
                    return (
                      <div key={tipo.id} style={{ background: palette.card, borderRadius: "12px", padding: "1rem 1.1rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", gap: "0.6rem", borderLeft: `4px solid ${borderColor}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.75rem" }}>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: "0.85rem", fontWeight: "600", color: palette.text, margin: 0 }}>{tipo.nombre}{tipo.requerido && <span style={{ color: palette.orange, fontWeight: "700" }}> *</span>}</p>
                            <p style={{ fontSize: "0.73rem", color: palette.muted, margin: "2px 0 0" }}>{tipo.descripcion}</p>
                          </div>
                          {doc ? <EstadoBadge estado={doc.estado} color={getEstadoColor(doc.estado)} /> : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "0.22rem 0.7rem", borderRadius: "99px", fontSize: "0.72rem", fontWeight: "600", background: tipo.requerido ? palette.gold + "18" : palette.beigeAlt, color: tipo.requerido ? palette.gold : palette.muted }}>
                              {tipo.requerido ? "Pendiente" : "Opcional"}
                            </span>
                          )}
                        </div>
                        {doc && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", background: palette.beige, borderRadius: "8px", padding: "0.5rem 0.75rem" }}>
                            <FileIcon nombre={doc.nombre_archivo} />
                            <div style={{ flex: 1, overflow: "hidden" }}><p style={styles.fileName}>{doc.nombre_archivo}</p><p style={styles.fileMeta}>{fmtSize(doc.tamanio_bytes)} · {fmtDate(doc.fecha_subida)}</p></div>
                          </div>
                        )}
                        {doc?.observacion && (
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", background: palette.red + "08", border: `1px solid ${palette.red}25`, borderRadius: "8px", padding: "0.6rem 0.75rem" }}>
                            <span>⚠️</span><p style={{ fontSize: "0.78rem", color: palette.red, margin: 0 }}>{doc.observacion}</p>
                          </div>
                        )}
                        <button style={{ padding: "0.45rem 0.9rem", border: "none", borderRadius: "7px", fontSize: "0.78rem", fontWeight: "600", fontFamily: "'Inter', sans-serif", alignSelf: "flex-start", cursor: doc?.estado === "Aprobado" ? "default" : "pointer", background: doc?.estado === "Aprobado" ? palette.green + "12" : palette.navy + "10", color: doc?.estado === "Aprobado" ? palette.green : palette.navy }}
                          onClick={() => doc?.estado !== "Aprobado" && setModalTipo(tipo.id)} disabled={doc?.estado === "Aprobado"}>
                          {!doc ? "↑ Subir documento" : doc.estado === "Aprobado" ? "✓ Aprobado" : doc.estado === "Rechazado" ? "↑ Volver a subir" : "↑ Reemplazar"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Historial */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", color: palette.navy, margin: 0 }}>Historial</h3>
            <div style={{ display: "flex", gap: "4px" }}>
              {[["todos","Todos"],["aprobado","✓ OK"],["revision","En revisión"],["rechazado","✕"]].map(([key, label]) => (
                <button key={key} style={{ padding: "0.3rem 0.7rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.75rem", fontWeight: "500", cursor: "pointer", fontFamily: "'Inter', sans-serif", background: filtro === key ? palette.navy : "transparent", color: filtro === key ? "#fff" : palette.muted }} onClick={() => setFiltro(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {docsFiltrados.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "2rem", background: palette.card, borderRadius: "12px" }}>
                <div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div>
                <p style={{ color: palette.muted, fontSize: "0.85rem" }}>No hay documentos en esta categoría.</p>
              </div>
            ) : docsFiltrados.map((doc, i) => {
              const tipoInfo = TIPOS_REQUERIDOS.find(t => t.id === doc.tipo);
              return (
                <div key={doc.id} style={{ background: palette.card, borderRadius: "11px", padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", boxShadow: "0 2px 6px rgba(0,0,0,0.05)", animation: `fadeUp 0.3s ease ${i * 0.06}s both` }}>
                  <FileIcon nombre={doc.nombre_archivo} />
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{ fontSize: "0.72rem", color: palette.muted, fontWeight: "600", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.03em" }}>{tipoInfo?.nombre || doc.tipo}</p>
                    <p style={styles.fileName}>{doc.nombre_archivo}</p>
                    <p style={styles.fileMeta}>{fmtSize(doc.tamanio_bytes)} · {fmtDate(doc.fecha_subida)}</p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
                    <EstadoBadge estado={doc.estado} color={getEstadoColor(doc.estado)} />
                    <button style={{ padding: "0.25rem 0.65rem", background: palette.navy + "10", border: "none", borderRadius: "6px", fontSize: "0.72rem", fontWeight: "600", color: palette.navy, cursor: "pointer", fontFamily: "'Inter', sans-serif" }} onClick={() => window.open(documentosService.getUrlDescarga(doc.id), "_blank")}>↓ Ver</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {modalTipo && <ModalSubida tipo={modalTipo} creditoId={creditoSel} onClose={() => setModalTipo(null)} onSubido={handleSubido} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADMIN
// ══════════════════════════════════════════════════════════════════════════════
// ─── Modal admin: todos los documentos de un mismo estudiante/crédito ────────
function ModalDocumentosEstudiante({ grupo, onClose, onActualizado, setModalDoc }) {
  const primero = grupo.docs[0];
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "620px", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2a5080)", color: "#fff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {primero.estudiante_nombre.charAt(0)}
            </div>
            <div>
              <h3 style={styles.modalTitle}>{primero.estudiante_nombre}</h3>
              <p style={styles.modalSub}>C.C. {primero.estudiante_cc} · {primero.credito_codigo}</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.5rem" }}>
          {grupo.docs.map(doc => {
            const tipoInfo = TIPOS_REQUERIDOS.find(t => t.id === doc.tipo);
            const borderColor = getEstadoColor(doc.estado) === "green" ? palette.green : getEstadoColor(doc.estado) === "red" ? palette.red : palette.orange;
            return (
              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: palette.beige, borderRadius: "10px", padding: "0.75rem 0.9rem", borderLeft: `4px solid ${borderColor}`, flexWrap: "wrap" }}>
                <FileIcon nombre={doc.nombre_archivo} />
                <div style={{ flex: 1, minWidth: "160px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: "700", color: palette.navy, margin: 0 }}>{tipoInfo?.nombre}</p>
                    <EstadoBadge estado={doc.estado} color={getEstadoColor(doc.estado)} />
                  </div>
                  <p style={styles.fileMeta}>{doc.nombre_archivo} · {fmtSize(doc.tamanio_bytes)} · {fmtDate(doc.fecha_subida)}</p>
                  {doc.observacion && <p style={{ fontSize: "0.72rem", color: palette.red, margin: "3px 0 0" }}>{doc.observacion}</p>}
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  <button style={{ padding: "0.32rem 0.65rem", background: palette.navy + "10", border: "none", borderRadius: "7px", fontSize: "0.72rem", fontWeight: "600", color: palette.navy, cursor: "pointer", fontFamily: "'Inter', sans-serif" }} onClick={() => window.open(documentosService.getUrlDescarga(doc.id), "_blank")}>↓ Ver</button>
                  <button style={{ padding: "0.32rem 0.65rem", background: doc.estado === "En revisión" ? `linear-gradient(135deg, ${palette.orange}, #d4640a)` : palette.navy + "10", border: "none", borderRadius: "7px", fontSize: "0.72rem", fontWeight: "600", color: doc.estado === "En revisión" ? "#fff" : palette.navy, cursor: "pointer", fontFamily: "'Inter', sans-serif" }} onClick={() => setModalDoc(doc)}>
                    {doc.estado === "En revisión" ? "Revisar →" : "Editar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DocumentosAdmin() {
  const [docs, setDocs]             = useState([]);
  const [totales, setTotales]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [busqueda, setBusqueda]     = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [fechas, setFechas]         = useState({ desde:"", hasta:"" });
  const [semestre, setSemestre]     = useState("");
  const [modalDoc, setModalDoc]     = useState(null);
  const [modalEstudianteKey, setModalEstudianteKey] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await documentosService.getTodos({
        estado: filtroEstado === "todos" ? "" : filtroEstado,
        tipo:   filtroTipo   === "todos" ? "" : filtroTipo,
        buscar: busqueda,
        desde:  fechas.desde,
        hasta:  fechas.hasta,
        semestre,
      });
      setDocs(data.documentos || []);
      setTotales(data.totales || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroEstado, filtroTipo, fechas, semestre]);

  // Agrupa los documentos sueltos por estudiante + crédito — así la lista
  // muestra una sola tarjeta por persona en vez de una fila por documento,
  // que se vuelve interminable apenas hay varios estudiantes.
  const grupos = [];
  const indicePorClave = {};
  for (const doc of docs) {
    const clave = `${doc.estudiante_id}-${doc.credito_codigo}`;
    if (indicePorClave[clave] === undefined) {
      indicePorClave[clave] = grupos.length;
      grupos.push({ key: clave, docs: [] });
    }
    grupos[indicePorClave[clave]].docs.push(doc);
  }
  const grupoActivo = grupos.find(g => g.key === modalEstudianteKey) || null;

  const handleBuscar = (e) => { e.preventDefault(); cargar(); };
  const handleActualizado = () => { cargar(); };

  const porRevisar = totales?.por_revisar || 0;
  const aprobados  = totales?.aprobados   || 0;
  const rechazados = totales?.rechazados  || 0;
  const totalDocs  = totales?.total       || 0;

  return (
    <div style={{ animation: "fadeIn 0.35s ease" }}>
      <div style={styles.secHeader}>
        <div>
          <h2 style={styles.secTitle}>Validación documental</h2>
          <p style={styles.secSub}>Revisa formatos y soportes según el procedimiento institucional de crédito</p>
        </div>
        {porRevisar > 0 && (
          <div style={{ background: palette.orange + "12", border: `1px solid ${palette.orange}30`, borderRadius: "10px", padding: "0.5rem 0.9rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: "700", color: palette.orange }}>{porRevisar} documento{porRevisar > 1 ? "s" : ""} por revisar</span>
          </div>
        )}
      </div>

      <div style={{ ...styles.statsGrid, gridTemplateColumns: "repeat(auto-fit, minmax(155px,1fr))" }}>
        {[
          { label: "Por revisar", val: porRevisar, color: palette.orange, Icon: IconClock },
          { label: "Aprobados",   val: aprobados,  color: palette.green,  Icon: IconCheckCircle },
          { label: "Rechazados",  val: rechazados, color: palette.red,    Icon: IconXCircle },
          { label: "Total",       val: totalDocs,   color: palette.navy,  Icon: IconClipboard },
        ].map(s => (
          <div key={s.label} style={{ ...styles.statCard, borderTop: `3px solid ${s.color}` }}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{ ...styles.statVal, color: s.color }}>{s.val}</p></div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1rem", alignItems: "center" }}>
          <form onSubmit={handleBuscar} style={{ display: "flex", flex: 1, minWidth: "200px", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: palette.beige, borderRadius: "9px", padding: "0.45rem 0.9rem", flex: 1, border: `1px solid ${palette.border}` }}>
              <IconSearch size={16} style={{color:palette.muted,flexShrink:0}} />
              <input style={{ border: "none", background: "transparent", flex: 1, fontSize: "0.82rem", color: palette.text, fontFamily: "'Inter', sans-serif" }} placeholder="Buscar por estudiante, cédula o crédito..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
              {busqueda && <button type="button" style={{ background: "none", border: "none", color: palette.muted, cursor: "pointer", fontSize: "0.75rem" }} onClick={() => { setBusqueda(""); cargar(); }}>✕</button>}
            </div>
            <button type="submit" style={{ ...styles.btnPrimary, padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>Buscar</button>
          </form>

          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {[["todos","Todos"],["En revisión","Pendientes"],["Aprobado","✓ Aprobados"],["Rechazado","✕ Rechazados"]].map(([key, label]) => (
              <button key={key} style={{ padding: "0.3rem 0.75rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.75rem", fontWeight: "500", cursor: "pointer", fontFamily: "'Inter', sans-serif", background: filtroEstado === key ? palette.navy : "transparent", color: filtroEstado === key ? "#fff" : palette.muted }} onClick={() => setFiltroEstado(key)}>{label}</button>
            ))}
          </div>

          <select style={{ padding: "0.35rem 0.75rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.78rem", color: palette.text, background: palette.card, cursor: "pointer", fontFamily: "'Inter', sans-serif" }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {GRUPOS.map(g => (
              <optgroup key={g} label={g}>
                {TIPOS_REQUERIDOS.filter(t => t.grupo === g).map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </optgroup>
            ))}
          </select>
          <DateFilter value={fechas} onChange={setFechas} />
          <select style={{ padding: "0.35rem 0.75rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.78rem", color: palette.text, background: palette.card, cursor: "pointer", fontFamily: "'Inter', sans-serif" }} value={semestre} onChange={e => setSemestre(e.target.value)}>
            <option value="">Todos los semestres</option>
            {Array.from({length:10},(_,i)=>i+1).map(s => <option key={s} value={s}>Semestre {s}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {loading ? (
            <Spinner />
          ) : grupos.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "2rem" }}>
              <div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div>
              <p style={{ color: palette.muted, fontSize: "0.85rem" }}>No hay documentos que coincidan.</p>
            </div>
          ) : grupos.map((grupo, i) => {
            const primero = grupo.docs[0];
            const porRevisar = grupo.docs.filter(d => d.estado === "En revisión").length;
            const aprobados  = grupo.docs.filter(d => d.estado === "Aprobado").length;
            const rechazados = grupo.docs.filter(d => d.estado === "Rechazado").length;
            const bordeColor = porRevisar > 0 ? palette.orange : rechazados > 0 ? palette.red : palette.green;
            return (
              <div key={grupo.key} onClick={() => setModalEstudianteKey(grupo.key)} style={{ display: "flex", alignItems: "center", gap: "0.9rem", background: palette.beige, borderRadius: "11px", padding: "0.9rem 1rem", borderLeft: `4px solid ${bordeColor}`, flexWrap: "wrap", cursor: "pointer", animation: `fadeUp 0.3s ease ${i * 0.05}s both` }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(135deg, #1e3a5f, #2a5080)", color: "#fff", fontWeight: "700", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {primero.estudiante_nombre.charAt(0)}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: palette.text }}>{primero.estudiante_nombre}</span>
                    {porRevisar > 0 && <span style={{ fontSize: "0.68rem", fontWeight: "700", color: palette.orange, background: palette.orange + "18", padding: "0.12rem 0.5rem", borderRadius: "99px" }}>{porRevisar} por revisar</span>}
                    {aprobados > 0 && <span style={{ fontSize: "0.68rem", fontWeight: "700", color: palette.green, background: palette.green + "18", padding: "0.12rem 0.5rem", borderRadius: "99px" }}>{aprobados} aprobado{aprobados > 1 ? "s" : ""}</span>}
                    {rechazados > 0 && <span style={{ fontSize: "0.68rem", fontWeight: "700", color: palette.red, background: palette.red + "18", padding: "0.12rem 0.5rem", borderRadius: "99px" }}>{rechazados} rechazado{rechazados > 1 ? "s" : ""}</span>}
                  </div>
                  <p style={{ fontSize: "0.72rem", color: palette.muted, margin: 0 }}>C.C. {primero.estudiante_cc} · {primero.credito_codigo} · {grupo.docs.length} documento{grupo.docs.length !== 1 ? "s" : ""}</p>
                </div>

                <button style={{ padding: "0.4rem 0.9rem", background: palette.navy, border: "none", borderRadius: "7px", fontSize: "0.78rem", fontWeight: "600", color: "#fff", cursor: "pointer", fontFamily: "'Inter', sans-serif", flexShrink: 0 }}>
                  Ver documentos →
                </button>
              </div>
            );
          })}
        </div>

        {!loading && grupos.length > 0 && (
          <p style={{ fontSize: "0.72rem", color: palette.muted, textAlign: "right", marginTop: "0.75rem" }}>
            {grupos.length} estudiante{grupos.length !== 1 ? "s" : ""} · {docs.length} documento{docs.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {grupoActivo && !modalDoc && (
        <ModalDocumentosEstudiante grupo={grupoActivo} onClose={() => setModalEstudianteKey(null)} onActualizado={handleActualizado} setModalDoc={setModalDoc} />
      )}
      {modalDoc && <ModalRevisarDoc doc={modalDoc} onClose={() => setModalDoc(null)} onActualizado={handleActualizado} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Documentos() {
  const { isAdmin } = useAuth();
  return (
    <Layout>
      {isAdmin ? <DocumentosAdmin /> : <DocumentosEstudiante />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        select,textarea { font-family:'Inter',sans-serif; }
        select:focus,input:focus,textarea:focus { outline:none; border-color:#1e3a5f !important; box-shadow:0 0 0 3px rgba(30,58,95,0.1); }
      `}</style>
    </Layout>
  );
}

const styles = {
  secHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" },
  secTitle:   { fontSize: "1.25rem", fontWeight: "700", color: palette.navy, margin: "0 0 2px" },
  secSub:     { fontSize: "0.82rem", color: palette.muted, margin: 0 },
  creditoSelect: { padding: "0.55rem 0.9rem", border: `1.5px solid ${palette.border}`, borderRadius: "9px", fontSize: "0.84rem", color: palette.text, background: palette.card, fontFamily: "'Inter', sans-serif" },
  statsGrid:  { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: "0.85rem", marginBottom: "1.25rem" },
  statCard:   { background: palette.card, borderRadius: "12px", padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  statLabel:  { fontSize: "0.7rem", color: palette.muted, margin: "0 0 2px" },
  statVal:    { fontSize: "1.2rem", fontWeight: "700", margin: 0 },
  card:       { background: palette.card, borderRadius: "14px", padding: "1.25rem 1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: "1.25rem" },
  fileName:   { fontSize: "0.8rem", fontWeight: "500", color: palette.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  fileMeta:   { fontSize: "0.7rem", color: palette.muted, margin: "2px 0 0" },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
  modal:        { background: palette.card, borderRadius: "18px", padding: "2rem", width: "100%", maxWidth: "480px", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", animation: "fadeIn 0.25s ease", maxHeight: "90vh", overflowY: "auto" },
  modalHeader:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  modalTitle:   { fontSize: "1.1rem", fontWeight: "700", color: palette.navy, margin: 0 },
  modalSub:     { fontSize: "0.8rem", color: palette.muted, margin: "3px 0 0" },
  closeBtn:     { background: palette.beige, border: "none", borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", fontSize: "0.85rem", color: palette.muted, fontFamily: "'Inter', sans-serif" },
  infoBox:      { display: "flex", gap: "0.6rem", alignItems: "flex-start", background: palette.beige, border: `1px solid ${palette.beigeAlt}`, borderRadius: "9px", padding: "0.75rem" },
  field:        { display: "flex", flexDirection: "column", gap: "5px" },
  label:        { fontSize: "0.82rem", fontWeight: "600", color: palette.text },
  input:        { padding: "0.7rem 0.9rem", border: `1.5px solid ${palette.border}`, borderRadius: "9px", fontSize: "0.88rem", color: palette.text, background: palette.beige, fontFamily: "'Inter', sans-serif" },
  spinner:      { width: "32px", height: "32px", margin: "0 auto", border: `3px solid ${palette.beigeAlt}`, borderTopColor: palette.navy, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  successIcon:  { width: "56px", height: "56px", borderRadius: "50%", fontSize: "1.5rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" },
  btnPrimary:   { padding: "0.7rem 1.25rem", background: "linear-gradient(135deg, #1e3a5f, #2a5080)", color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter', sans-serif", boxShadow: "0 4px 12px rgba(30,58,95,0.25)" },
  btnSecondary: { padding: "0.7rem 1.25rem", background: "none", border: `1.5px solid ${palette.border}`, borderRadius: "10px", color: palette.muted, fontSize: "0.88rem", cursor: "pointer", fontFamily: "'Inter', sans-serif" },
};