import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import solicitudesPublicasService from "../services/solicitudesPublicasService";
import { IconInbox, IconCheckCircle, IconClipboard, IconSearch, IconXCircle } from "../components/Icons";
import DateFilter from "../components/DateFilter";

const palette = {
  navy:"#1e3a5f", orange:"#e8740e", gold:"#c89b14", beige:"#f3ede1",
  beigeAlt:"#ede6d8", text:"#2c3e50", muted:"#6b7a8d", green:"#1d9e75",
  red:"#c0392b", card:"#ffffff", border:"rgba(30,58,95,0.1)",
};

const fmt     = (n) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(n||0);
const fmtDate = (d) => d ? new Date(d).toLocaleString("es-CO",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

function getEstadoColor(estado) {
  if (estado === "Nueva") return "orange";
  if (estado === "Contactada") return "green";
  if (estado === "Descartada") return "muted";
  return "muted";
}

function EstadoBadge({ estado }) {
  const map = {
    green:  { bg: "#1d9e7518", text: "#1d9e75" },
    orange: { bg: "#e8740e18", text: "#e8740e" },
    muted:  { bg: "#6b7a8d18", text: "#6b7a8d" },
  };
  const c = map[getEstadoColor(estado)];
  return <span style={{ padding: "0.22rem 0.7rem", borderRadius: "99px", fontSize: "0.72rem", fontWeight: "600", background: c.bg, color: c.text, whiteSpace: "nowrap" }}>{estado}</span>;
}

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"3rem"}}><div style={{width:"36px",height:"36px",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
}

// ─── Modal detalle ─────────────────────────────────────────────────────────────
function ModalDetalle({ sol, onClose, onActualizado }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resultado, setResultado] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [cargandoDocs, setCargandoDocs] = useState(sol.tipo_credito === "Brilla");

  useEffect(() => {
    if (sol.tipo_credito !== "Brilla") return;
    solicitudesPublicasService.getDocumentos(sol.id)
      .then(resp => setDocumentos(resp.documentos || []))
      .catch(() => setDocumentos([]))
      .finally(() => setCargandoDocs(false));
  }, [sol.id, sol.tipo_credito]);

  const NOMBRES_DOC = {
    recibo_matricula: "Recibo de matrícula (factura de las materias)",
    recibo_servicio_brilla: "Recibo de servicio público con cupo Brilla",
    cedula_titular_recibo: "Cédula del titular del recibo",
  };

  const cambiarEstado = async (estado) => {
    setError(""); setLoading(true);
    try {
      await solicitudesPublicasService.actualizarEstado(sol.id, estado);
      onActualizado();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "No se pudo actualizar el estado.");
    }
  };

  const convertirEnCredito = async () => {
    setError(""); setLoading(true);
    try {
      const resp = await solicitudesPublicasService.convertir(sol.id);
      setResultado(resp);
      onActualizado();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo convertir la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Preinscripción #{sol.id}</h3><p style={styles.modalSub}>{fmtDate(sol.fecha_solicitud)}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: "0.5rem", display: "flex", gap: "0.4rem" }}>
          <EstadoBadge estado={sol.estado} />
          {sol.tipo_credito === "Brilla" && <span style={{ fontSize: "0.72rem", fontWeight: "700", color: palette.gold, background: palette.gold + "18", padding: "0.22rem 0.7rem", borderRadius: "99px" }}>Crédito Brilla</span>}
          {sol.tipo_credito === "ICETEX" && <span style={{ fontSize: "0.72rem", fontWeight: "700", color: palette.green, background: palette.green + "18", padding: "0.22rem 0.7rem", borderRadius: "99px" }}>Crédito ICETEX</span>}
        </div>

        <p style={styles.seccionLabel}>Deudor (solicitante)</p>
        <div style={styles.detalleGrid}>
          {[
            { label: "Nombre",    val: sol.deudor_nombre },
            { label: "Cédula",    val: sol.deudor_cc },
            { label: "Correo",    val: sol.deudor_email },
            { label: "Teléfono",  val: sol.deudor_telefono },
            { label: "Dirección", val: sol.deudor_direccion },
            { label: "Programa",  val: `${sol.deudor_programa} · Sem. ${sol.deudor_semestre} · ${sol.deudor_jornada}` },
          ].map(r => (
            <div key={r.label} style={styles.detalleRow}><span style={styles.detalleLabel}>{r.label}</span><span style={styles.detalleVal}>{r.val}</span></div>
          ))}
        </div>

        {sol.tipo_credito === "Brilla" ? (
          <>
            <p style={{ ...styles.seccionLabel, marginTop: "1rem" }}>Documentos adjuntos (Brilla)</p>
            {cargandoDocs ? (
              <p style={{ fontSize: "0.82rem", color: palette.muted }}>Cargando documentos...</p>
            ) : documentos.length === 0 ? (
              <p style={{ fontSize: "0.82rem", color: palette.muted }}>No hay documentos adjuntos todavía.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {documentos.map(doc => (
                  <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.6rem", background: palette.beige, borderRadius: "9px", padding: "0.6rem 0.85rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: "0.82rem", fontWeight: "600", color: palette.text, margin: 0 }}>{NOMBRES_DOC[doc.tipo] || doc.tipo}</p>
                      <p style={{ fontSize: "0.72rem", color: palette.muted, margin: "2px 0 0" }}>{doc.nombre_archivo}</p>
                    </div>
                    <button style={{ padding: "0.35rem 0.75rem", background: palette.navy, border: "none", borderRadius: "7px", fontSize: "0.75rem", fontWeight: "600", color: "#fff", cursor: "pointer", flexShrink: 0 }} onClick={() => window.open(solicitudesPublicasService.urlDocumentoAdmin(doc.id), "_blank")}>
                      ↓ Ver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p style={styles.seccionLabel}>Codeudor</p>
            <div style={styles.detalleGrid}>
              {[
                { label: "Nombre",    val: sol.codeudor_nombre },
                { label: "Cédula",    val: sol.codeudor_cc },
                { label: "Teléfono",  val: sol.codeudor_telefono },
                { label: "Dirección", val: sol.codeudor_direccion },
                { label: "Ingreso",   val: fmt(sol.codeudor_ingreso) },
              ].map(r => (
                <div key={r.label} style={styles.detalleRow}><span style={styles.detalleLabel}>{r.label}</span><span style={styles.detalleVal}>{r.val}</span></div>
              ))}
            </div>
          </>
        )}

        {sol.mensaje && (
          <>
            <p style={{ ...styles.seccionLabel, marginTop: "1rem" }}>Mensaje</p>
            <p style={{ fontSize: "0.85rem", color: palette.text, background: palette.beige, borderRadius: "9px", padding: "0.75rem 0.9rem", lineHeight: 1.5 }}>{sol.mensaje}</p>
          </>
        )}

        {error && <p style={{ fontSize: "0.78rem", color: palette.red, marginTop: "0.75rem" }}>{error}</p>}

        {resultado && (
          <div style={{ background: palette.green + "12", border: `1px solid ${palette.green}30`, borderRadius: "10px", padding: "0.85rem 1rem", marginTop: "0.9rem" }}>
            <p style={{ fontSize: "0.85rem", fontWeight: "700", color: palette.green, margin: "0 0 4px" }}>✓ {resultado.message}</p>
            <p style={{ fontSize: "0.78rem", color: palette.text, margin: 0 }}>
              {resultado.documentos_copiados > 0
                ? `${resultado.documentos_copiados} documento(s) ya están en el módulo de Documentos del estudiante, en revisión.`
                : "No había documentos firmados en la preinscripción para copiar."}
            </p>

            {resultado.usuario_nuevo ? (
              <div style={{ background: palette.card, border: `1px solid ${palette.gold}50`, borderRadius: "9px", padding: "0.75rem 0.9rem", marginTop: "0.75rem" }}>
                <p style={{ fontSize: "0.78rem", fontWeight: "700", color: palette.gold, margin: "0 0 6px" }}>⚠ Copia esto ahora — no se vuelve a mostrar</p>
                <p style={{ fontSize: "0.85rem", margin: "0 0 3px" }}>Código: <strong style={{ fontFamily: "monospace" }}>{resultado.codigo_usuario}</strong></p>
                <p style={{ fontSize: "0.85rem", margin: 0 }}>Contraseña temporal: <strong style={{ fontFamily: "monospace" }}>{resultado.password_temporal}</strong></p>
                <p style={{ fontSize: "0.72rem", color: palette.muted, margin: "6px 0 0" }}>Dale estos datos al estudiante para que inicie sesión. Si los pierdes, resetéala desde Usuarios.</p>
              </div>
            ) : (
              <p style={{ fontSize: "0.78rem", color: palette.muted, marginTop: "0.6rem" }}>
                Se usó una cuenta que ya existía — código: <strong style={{ fontFamily: "monospace" }}>{resultado.codigo_usuario}</strong>.
                Si el estudiante no tiene su contraseña, resetéala desde Usuarios.
              </p>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
          {loading ? <div style={{ padding: "0.7rem" }}><div style={styles.spinner} /></div> : (
            <>
              {!resultado && (
                <button style={styles.btnPrimary} onClick={convertirEnCredito}>+ Convertir en cuenta y crédito</button>
              )}
              {sol.estado !== "Contactada" && (
                <button style={{ ...styles.btnPrimary, background: `linear-gradient(135deg,${palette.green},#16a085)` }} onClick={() => cambiarEstado("Contactada")}>✓ Marcar como contactada</button>
              )}
              {sol.estado !== "Descartada" && (
                <button style={{ ...styles.btnSecondary, color: palette.red, borderColor: palette.red + "50" }} onClick={() => cambiarEstado("Descartada")}>Descartar</button>
              )}
              {sol.estado !== "Nueva" && (
                <button style={styles.btnSecondary} onClick={() => cambiarEstado("Nueva")}>↺ Volver a Nueva</button>
              )}
              <button style={styles.btnSecondary} onClick={onClose}>Cerrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [totales, setTotales]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [fechas, setFechas]           = useState({ desde:"", hasta:"" });
  const [semestre, setSemestre]       = useState("");
  const [modalSol, setModalSol]       = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await solicitudesPublicasService.getTodas({
        estado: filtroEstado === "todos" ? "" : filtroEstado,
        buscar: busqueda,
        desde:  fechas.desde,
        hasta:  fechas.hasta,
        semestre,
      });
      setSolicitudes(data.solicitudes || []);
      setTotales(data.totales || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroEstado, fechas, semestre]);

  const handleBuscar = (e) => { e.preventDefault(); cargar(); };
  const handleActualizado = () => { cargar(); };

  const totalNuevas       = totales?.nuevas       || 0;
  const totalContactadas  = totales?.contactadas  || 0;
  const totalDescartadas  = totales?.descartadas  || 0;
  const totalSolicitudes  = totales?.total        || 0;

  return (
    <Layout>
      <div style={{ animation: "fadeIn 0.35s ease" }}>
        {totalNuevas > 0 && (
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", background: palette.orange + "10", border: `1px solid ${palette.orange}25`, borderRadius: "12px", padding: "0.75rem 1.1rem", marginBottom: "1.25rem" }}>
            <IconInbox size={20} style={{color:palette.orange,flexShrink:0}} />
            <p style={{ fontSize: "0.85rem", fontWeight: "600", color: palette.orange, margin: 0 }}>
              Tienes {totalNuevas} solicitud{totalNuevas > 1 ? "es" : ""} nueva{totalNuevas > 1 ? "s" : ""} sin revisar.
            </p>
          </div>
        )}

        <div style={styles.secHeader}>
          <div><h2 style={styles.secTitle}>Solicitudes públicas</h2><p style={styles.secSub}>Preinscripciones recibidas desde la página informativa</p></div>
        </div>

        <div style={styles.statsGrid}>
          {[
            { label: "Nuevas",       val: totalNuevas,      color: palette.orange, Icon: IconInbox },
            { label: "Contactadas",  val: totalContactadas, color: palette.green,  Icon: IconCheckCircle },
            { label: "Descartadas",  val: totalDescartadas, color: palette.muted,  Icon: IconXCircle },
            { label: "Total",        val: totalSolicitudes, color: palette.navy,   Icon: IconClipboard },
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
                <input style={{ border: "none", background: "transparent", flex: 1, fontSize: "0.82rem", color: palette.text, fontFamily: "'Inter',sans-serif" }} placeholder="Buscar por nombre, cédula o correo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                {busqueda && <button type="button" style={{ background: "none", border: "none", color: palette.muted, cursor: "pointer", fontSize: "0.75rem" }} onClick={() => { setBusqueda(""); cargar(); }}>✕</button>}
              </div>
              <button type="submit" style={{ ...styles.btnPrimary, padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>Buscar</button>
            </form>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {[["todos","Todas"],["Nueva","Nuevas"],["Contactada","✓ Contactadas"],["Descartada","○ Descartadas"]].map(([k,l]) => (
                <button key={k} style={{ ...styles.filtroBtn, background: filtroEstado === k ? palette.navy : "transparent", color: filtroEstado === k ? "#fff" : palette.muted }} onClick={() => setFiltroEstado(k)}>{l}</button>
              ))}
            </div>
            <DateFilter value={fechas} onChange={setFechas} />
            <select style={{ padding: "0.35rem 0.75rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.78rem", color: palette.text, background: palette.card, cursor: "pointer", fontFamily: "'Inter',sans-serif" }} value={semestre} onChange={e => setSemestre(e.target.value)}>
              <option value="">Todos los semestres</option>
              {Array.from({length:10},(_,i)=>i+1).map(s => <option key={s} value={s}>Semestre {s}</option>)}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {loading ? <Spinner /> : solicitudes.length === 0
              ? <div style={styles.emptyState}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{ color: palette.muted, fontSize: "0.85rem" }}>Sin solicitudes que coincidan.</p></div>
              : solicitudes.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "0.9rem", background: palette.beige, borderRadius: "11px", padding: "0.9rem 1.1rem", borderLeft: `4px solid ${getEstadoColor(s.estado) === "green" ? palette.green : getEstadoColor(s.estado) === "orange" ? palette.orange : palette.muted}`, flexWrap: "wrap", animation: `fadeUp 0.3s ease ${i * 0.05}s both`, cursor: "pointer" }} onClick={() => setModalSol(s)}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", fontWeight: "700", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {s.deudor_nombre.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "2px" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "700", color: palette.text }}>{s.deudor_nombre}</span>
                      <EstadoBadge estado={s.estado} />
                      {s.tipo_credito === "Brilla" && <span style={{ fontSize: "0.68rem", fontWeight: "700", color: palette.gold, background: palette.gold + "18", padding: "0.12rem 0.5rem", borderRadius: "99px" }}>Brilla</span>}
                      {s.tipo_credito === "ICETEX" && <span style={{ fontSize: "0.68rem", fontWeight: "700", color: palette.green, background: palette.green + "18", padding: "0.12rem 0.5rem", borderRadius: "99px" }}>ICETEX</span>}
                      {!Number(s.es_primiparo) && <span style={{ fontSize: "0.68rem", fontWeight: "700", color: palette.navy, background: palette.navy + "12", padding: "0.12rem 0.5rem", borderRadius: "99px" }}>Estudiante activo</span>}
                    </div>
                    <p style={{ fontSize: "0.72rem", color: palette.muted, margin: "0 0 3px" }}>C.C. {s.deudor_cc} · {s.deudor_email} · {s.deudor_programa}</p>
                    <p style={{ fontSize: "0.7rem", color: palette.muted, margin: 0 }}>{fmtDate(s.fecha_solicitud)}</p>
                  </div>
                  <button style={styles.btnVer} onClick={(e) => { e.stopPropagation(); setModalSol(s); }}>Ver detalle</button>
                </div>
              ))
            }
          </div>
          {!loading && solicitudes.length > 0 && <p style={{ fontSize: "0.72rem", color: palette.muted, textAlign: "right", marginTop: "0.75rem" }}>{solicitudes.length} solicitud{solicitudes.length !== 1 ? "es" : ""}</p>}
        </div>
      </div>

      {modalSol && <ModalDetalle sol={modalSol} onClose={() => setModalSol(null)} onActualizado={handleActualizado} />}

      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </Layout>
  );
}

const styles = {
  secHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" },
  secTitle:  { fontSize: "1.3rem", fontWeight: "700", color: palette.navy, margin: 0 },
  secSub:    { fontSize: "0.85rem", color: palette.muted, margin: "3px 0 0" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "1rem", marginBottom: "1.5rem" },
  statCard:  { background: palette.card, borderRadius: "12px", padding: "1rem 1.1rem", display: "flex", alignItems: "center", gap: "0.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  statLabel: { fontSize: "0.72rem", color: palette.muted, margin: 0 },
  statVal:   { fontSize: "1.25rem", fontWeight: "700", margin: "2px 0 0" },
  card:      { background: palette.card, borderRadius: "14px", padding: "1.25rem 1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.06)" },
  filtroBtn: { padding: "0.4rem 0.8rem", border: "none", borderRadius: "8px", fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap" },
  emptyState:{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "2rem" },
  btnPrimary:{ padding: "0.6rem 1.1rem", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", border: "none", borderRadius: "9px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  btnSecondary:{ padding: "0.6rem 1.1rem", background: "none", border: `1.5px solid ${palette.border}`, color: palette.text, borderRadius: "9px", fontSize: "0.85rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  btnVer:    { padding: "0.4rem 0.8rem", background: palette.navy + "10", border: "none", borderRadius: "7px", fontSize: "0.75rem", fontWeight: "600", color: palette.navy, cursor: "pointer", fontFamily: "'Inter',sans-serif", flexShrink: 0 },
  spinner:   { width: "24px", height: "24px", border: `2.5px solid ${palette.beigeAlt}`, borderTopColor: palette.navy, borderRadius: "50%", animation: "spin 0.7s linear infinite" },

  modalOverlay: { position: "fixed", inset: 0, background: "rgba(30,58,95,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: "1.5rem" },
  modal:      { background: palette.card, borderRadius: "18px", padding: "1.75rem", width: "100%", maxWidth: "540px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.25)" },
  modalHeader:{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  modalTitle: { fontSize: "1.05rem", fontWeight: "700", color: palette.navy, margin: 0 },
  modalSub:   { fontSize: "0.78rem", color: palette.muted, margin: "3px 0 0" },
  closeBtn:   { background: "none", border: "none", fontSize: "1.1rem", color: palette.muted, cursor: "pointer" },
  seccionLabel: { fontSize: "0.72rem", fontWeight: "700", color: palette.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.5rem" },
  detalleGrid: { display: "flex", flexDirection: "column", gap: "6px" },
  detalleRow: { display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.85rem", padding: "0.35rem 0", borderBottom: `1px solid ${palette.border}` },
  detalleLabel: { color: palette.muted, flexShrink: 0 },
  detalleVal: { color: palette.text, fontWeight: "600", textAlign: "right" },
};