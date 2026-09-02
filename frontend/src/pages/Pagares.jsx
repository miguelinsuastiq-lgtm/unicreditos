import { useState, useRef, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import pagaresService from "../services/pagaresService";
import creditosService from "../services/creditosService";
import {
  IconCheckCircle, IconXCircle, IconClock, IconSignature, IconEye,
  IconMail, IconDollar, IconAlertTriangle, IconClipboard, IconSearch, IconInbox,
} from "../components/Icons";
import DateFilter from "../components/DateFilter";

const palette = {
  navy:"#1e3a5f", orange:"#e8740e", gold:"#c89b14", beige:"#f3ede1",
  beigeAlt:"#ede6d8", text:"#2c3e50", muted:"#6b7a8d", green:"#1d9e75",
  red:"#c0392b", card:"#ffffff", border:"rgba(30,58,95,0.1)",
};

const fmt          = (n) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(n||0);
const fmtDate       = (d) => d ? new Date(d).toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"}) : "—";
const fmtDateShort  = (d) => d ? new Date(d).toLocaleDateString("es-CO",{year:"numeric",month:"short",day:"numeric"}) : "—";

function getEstadoColor(estado) {
  if (estado === "Vigente") return "green";
  if (estado === "Vencido") return "red";
  if (estado === "Pendiente firma") return "orange";
  return "muted";
}

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"3rem"}}><div style={{width:"36px",height:"36px",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
}

// ─── Componentes compartidos ───────────────────────────────────────────────────
function EstadoBadge({ estado, color }) {
  const map = { green:{bg:palette.green+"18",text:palette.green,Icon:IconCheckCircle}, red:{bg:palette.red+"18",text:palette.red,Icon:IconXCircle}, orange:{bg:palette.orange+"18",text:palette.orange,Icon:IconClock}, gold:{bg:palette.gold+"18",text:palette.gold,Icon:IconSignature} };
  const c = map[color]||map.green;
  return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"0.22rem 0.7rem",borderRadius:"99px",fontSize:"0.72rem",fontWeight:"600",background:c.bg,color:c.text,whiteSpace:"nowrap"}}><c.Icon size={12} strokeWidth={2.5} /> {estado}</span>;
}

// ─── Documento pagaré — texto real de la Uniautónoma del Cauca ────────────────
function DocumentoPagare({ pagare }) {
  const nombre    = pagare.deudor_nombre || pagare.estudiante_nombre || "";
  const codeudor  = pagare.codeudor_nombre || "";
  const montoNum  = pagare.monto || 0;
  const cuotas    = pagare.cuotas || "—";
  const diaPago   = pagare.dia_pago || "—";

  return (
    <>
      {/* Membrete */}
      <div style={styles.membrete}>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <div style={styles.logoPlaceholder}>UC</div>
          <div>
            <p style={styles.membreteNombre}>Corporación Universitaria Autónoma del Cauca</p>
            <p style={styles.membreteSubtitle}>NIT 891501766-6 · Departamento Financiero</p>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <p style={{fontSize:"0.78rem",fontWeight:"700",color:palette.navy,margin:0}}>{pagare.numero}</p>
          <p style={styles.membreteSubtitle}>MATRÍCULAS 2P-2026 · NO AUTENTICAR</p>
        </div>
      </div>
      <div style={styles.divider}/>

      <h2 style={styles.docTitle}>PAGARÉ</h2>

      {/* Datos encabezado */}
      <div style={{background:palette.beige,borderRadius:"10px",padding:"0.75rem 1rem",marginBottom:"1rem"}}>
        <p style={{fontSize:"0.78rem",color:palette.text,margin:"0 0 4px"}}>
          <strong>Fecha de vencimiento:</strong> {fmtDate(pagare.fecha_vencimiento)}
        </p>
        <p style={{fontSize:"0.78rem",color:palette.text,margin:"0 0 4px"}}>
          <strong>Valor:</strong> {fmt(montoNum)} · <strong>Lugar de pago:</strong> Popayán · <strong>N.° cuotas:</strong> {cuotas} · <strong>Día de vencimiento de cuota:</strong> {diaPago}
        </p>
      </div>

      {/* Cuerpo legal */}
      <p style={styles.docIntro}>
        Deudores, yo: <strong>{nombre}</strong>, identificado(a) con la cédula de ciudadanía N.°{" "}
        <strong>{pagare.deudor_cc}</strong>, obrando en nombre propio y en calidad de <strong>DEUDOR</strong>,
        y yo <strong>{codeudor}</strong>, identificado con cédula de ciudadanía N.°{" "}
        <strong>{pagare.codeudor_cc}</strong>, obrando en nombre propio en calidad de <strong>CODEUDOR</strong>.
      </p>

      <p style={styles.docIntro}>
        Yo (nosotros) deudores, <strong>{nombre}</strong> y <strong>{codeudor}</strong>,
        identificados como aparece al pie de mi (nuestras) firma(s), aceptamos que debemos y nos
        obligamos a pagar solidaria e incondicionalmente a la orden de la{" "}
        <strong>Corporación Universitaria Autónoma del Cauca</strong>, con NIT N.° 891501766-6,
        o a quien represente sus derechos o al tenedor legítimo del presente título valor, en la
        ciudad de <strong>Popayán</strong>, la suma de:
      </p>

      <div style={styles.montoBox}>
        <p style={styles.montoVal}>{fmt(montoNum)}</p>
        <p style={styles.montoLabel}>Pesos moneda corriente — Valor total del crédito</p>
      </div>

      {/* Datos del pagaré */}
      <div style={styles.datosGrid}>
        {[
          ["Tipo de crédito",      pagare.credito_tipo],
          ["Código de crédito",    pagare.credito_codigo],
          ["Fecha de emisión",     fmtDate(pagare.fecha_emision)],
          ["Fecha de vencimiento", fmtDate(pagare.fecha_vencimiento)],
          ["Estado",               <EstadoBadge key="e" estado={pagare.estado} color={getEstadoColor(pagare.estado)}/>],
        ].map(([label,val])=>(
          <div key={label} style={styles.datoRow}><span style={styles.datoLabel}>{label}</span><span style={styles.datoVal}>{val}</span></div>
        ))}
      </div>
      <div style={styles.divider}/>

      {/* Texto legal completo */}
      <h4 style={styles.clausulasTitle}>Condiciones del título valor</h4>
      <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
        {[
          "En caso de mora pagaremos a la orden de la CORPORACIÓN UNIVERSITARIA AUTÓNOMA DEL CAUCA intereses moratorios a la tasa máxima legal autorizada por la Superintendencia Bancaria desde el día siguiente a la exigibilidad del presente pagaré y hasta cuando su pago se efectúe.",
          "Autorizo (amos) irrevocablemente a CORPORACIÓN UNIVERSITARIA AUTÓNOMA DEL CAUCA o a quien represente sus derechos o al tenedor legítimo del presente título valor para declarar de plazo vencido el presente pagaré, y para que en evento proceda inmediatamente al cobro judicial o extrajudicial del mismo, sin necesidad de requerimiento alguno en caso de: a) Incumplimiento en el pago de una o más cuotas de capital, intereses pactados o de cualquier otra clase de obligación existente con la CORPORACIÓN UNIVERSITARIA AUTÓNOMA DEL CAUCA; b) Fallecimiento, inhabilidad o incapacidad de uno o varios de quienes firmamos el presente documento; c) Incumplimiento en el pago de otra(s) obligación(es) adquirida(s) con la Corporación o giro de cheques a favor de la misma sin la suficiente provisión de fondos; d) Incumplimiento de cualquiera de las obligaciones pactadas en el presente pagaré; e) Señalamiento público o judicial de cualquiera de nosotros como autores o partícipes de actividades ilícitas o delitos; f) La existencia de cualquier causal establecida en la ley.",
          "Serán a mi (nuestro) cargo el valor de los honorarios profesionales por la cobranza judicial y extrajudicial, los cuales en ningún caso pueden ser inferiores al diez por ciento (10%) de la suma total adeudada, al igual que todos los demás gastos en que incurra la CORPORACIÓN UNIVERSITARIA AUTÓNOMA DEL CAUCA por motivo de la cobranza.",
          "Así mismo acepto (amos) expresamente y autorizo (amos) de manera permanente e irrevocable a la CORPORACIÓN UNIVERSITARIA AUTÓNOMA DEL CAUCA para conceder cualquier prórroga. La solidaridad e indivisibilidad subsisten en caso de prórroga o cualquier modificación a lo aquí estipulado, aunque se pacte con uno solo de los firmantes.",
          "La mera ampliación del plazo no constituye novación ni me (nos) exonera de la obligación de pagar la totalidad de las sumas adeudadas. Declaro (amos) que en mi (nuestro) poder ha quedado copia del presente instrumento.",
          "Este pagaré presta mérito ejecutivo sin necesidad de requerimiento previo.",
          "El deudor declara conocer y aceptar el reglamento de créditos estudiantiles de la Corporación Universitaria Autónoma del Cauca, así como las condiciones del plan de pagos aprobado, cuyas cuotas son pagaderas mensualmente.",
          "El deudor autoriza a la institución a reportar la información a las centrales de riesgo (Datacrédito Experian S.A.) en caso de incumplimiento de las obligaciones contraídas.",
        ].map((c,i)=>(
          <div key={i} style={{display:"flex",gap:"0.5rem",alignItems:"flex-start"}}>
            <span style={{fontSize:"0.72rem",fontWeight:"700",color:palette.navy,flexShrink:0,marginTop:"1px"}}>{i+1}.</span>
            <p style={{fontSize:"0.76rem",color:palette.text,lineHeight:"1.65",margin:0}}>{c}</p>
          </div>
        ))}
      </div>
      <div style={styles.divider}/>

      {/* Firmas */}
      <h4 style={{...styles.clausulasTitle,marginBottom:"0.75rem"}}>Para constancia se firma en la ciudad de Popayán</h4>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",marginBottom:"0.5rem"}}>
        {/* Deudor */}
        <div style={{background:pagare.firmado?palette.green+"08":palette.orange+"08",border:`1px solid ${pagare.firmado?palette.green+"25":palette.orange+"40"}`,borderRadius:"10px",padding:"0.85rem 1rem"}}>
          <p style={{fontSize:"0.68rem",fontWeight:"700",color:palette.muted,textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 0.5rem"}}>Deudor</p>
          <div style={{height:"28px",borderBottom:`1px solid ${pagare.firmado?palette.green:palette.border}`,marginBottom:"0.5rem",display:"flex",alignItems:"center"}}>
            {pagare.firmado&&<span style={{fontSize:"0.75rem",color:palette.green,fontWeight:"600"}}>✓ Firmado digitalmente</span>}
          </div>
          <p style={{fontSize:"0.75rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"}}>{nombre}</p>
          <p style={{fontSize:"0.7rem",color:palette.muted,margin:"0 0 1px"}}>C.C. {pagare.deudor_cc}</p>
          <p style={{fontSize:"0.7rem",color:palette.muted,margin:"0 0 1px"}}>Domiciliado en: {pagare.domicilio||"Popayán, Cauca"}</p>
          {pagare.firmado&&<p style={{fontSize:"0.68rem",color:palette.green,margin:"3px 0 0"}}>Fecha: {fmtDate(pagare.fecha_firma)}</p>}
        </div>
        {/* Codeudor */}
        <div style={{background:pagare.firmado?palette.green+"08":palette.orange+"08",border:`1px solid ${pagare.firmado?palette.green+"25":palette.orange+"40"}`,borderRadius:"10px",padding:"0.85rem 1rem"}}>
          <p style={{fontSize:"0.68rem",fontWeight:"700",color:palette.muted,textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 0.5rem"}}>Codeudor</p>
          <div style={{height:"28px",borderBottom:`1px solid ${pagare.firmado?palette.green:palette.border}`,marginBottom:"0.5rem",display:"flex",alignItems:"center"}}>
            {pagare.firmado&&<span style={{fontSize:"0.75rem",color:palette.green,fontWeight:"600"}}>✓ Firmado digitalmente</span>}
          </div>
          <p style={{fontSize:"0.75rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"}}>{codeudor||"—"}</p>
          <p style={{fontSize:"0.7rem",color:palette.muted,margin:"0 0 1px"}}>C.C. {pagare.codeudor_cc||"—"}</p>
          <p style={{fontSize:"0.7rem",color:palette.muted,margin:"0 0 1px"}}>Domiciliado en: {pagare.domicilioCodeudor||"Popayán, Cauca"}</p>
          {pagare.firmado&&<p style={{fontSize:"0.68rem",color:palette.green,margin:"3px 0 0"}}>Fecha: {fmtDate(pagare.fecha_firma)}</p>}
        </div>
      </div>
      {!pagare.firmado&&(
        <div style={{...styles.firmaBox,background:palette.orange+"08",border:`1px dashed ${palette.orange}40`}}>
          <div style={{...styles.firmaIcono,background:palette.orange+"18",color:palette.orange}}>✎</div>
          <div>
            <p style={{...styles.firmaTexto,color:palette.orange}}>Pendiente de firma digital</p>
            <p style={styles.firmaNombre}>{nombre} y {codeudor||"codeudor"}</p>
            <p style={styles.firmaMeta}>Deben firmar deudor y codeudor para que el pagaré tenga validez.</p>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Modal ver pagaré ──────────────────────────────────────────────────────────
function ModalVerPagare({ pagare, onClose, onFirmar }) {
  const [scrolled, setScrolled] = useState(false);
  const [detalle, setDetalle]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const contentRef = useRef();
  const handleScroll = () => {
    const el = contentRef.current;
    if (!el) return;
    if (el.scrollTop+el.clientHeight>=el.scrollHeight-10) setScrolled(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await pagaresService.getDetalle(pagare.id);
        setDetalle(data.pagare || pagare);
      } catch (err) { console.error(err); setDetalle(pagare); }
      finally { setLoading(false); }
    })();
  }, [pagare.id]);

  const docData = detalle || pagare;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"600px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Pagaré Digital</h3><p style={styles.modalSub}>{pagare.numero} · NO AUTENTICAR</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div ref={contentRef} onScroll={handleScroll} style={styles.documentoScroll}>
          {loading ? <Spinner/> : <DocumentoPagare pagare={docData}/>}
          {!pagare.firmado&&!scrolled&&<p style={{fontSize:"0.75rem",color:palette.muted,textAlign:"center",marginTop:"0.75rem"}}>↓ Desplázate hasta el final para habilitar la firma</p>}
        </div>
        <div style={{display:"flex",gap:"0.75rem",marginTop:"1.25rem",flexShrink:0}}>
          {!pagare.firmado ? (
            <button style={{...styles.btnPrimary,background:`linear-gradient(135deg,${palette.orange},#d4640a)`,boxShadow:scrolled?`0 4px 12px ${palette.orange}40`:"none",opacity:scrolled?1:0.45,cursor:scrolled?"pointer":"not-allowed"}}
              disabled={!scrolled} onClick={()=>{onFirmar&&onFirmar(pagare.id);onClose();}}>✎ Firmar pagaré</button>
          ):(
            <button style={styles.btnPrimary} disabled title="Descarga en PDF pendiente de implementar en el backend">↓ Descargar PDF</button>
          )}
          <button style={styles.btnSecondary} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal firmar ──────────────────────────────────────────────────────────────
function ModalFirmar({ pagare, onClose, onConfirmado }) {
  const [paso, setPaso]       = useState(1);
  const [codigo, setCodigo]   = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [mensajeEnvio, setMensajeEnvio] = useState("");

  const handleSolicitarCodigo = async () => {
    setError(""); setLoading(true);
    try {
      const data = await pagaresService.solicitar2FA(pagare.id);
      setMensajeEnvio(data.message || "Código enviado a tu correo institucional.");
      setPaso(2);
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo enviar el código. Intenta nuevamente.");
    } finally { setLoading(false); }
  };

  const handleVerificar = async () => {
    setError(""); setLoading(true);
    try {
      await pagaresService.firmar(pagare.id, codigo);
      setPaso(3);
    } catch (err) {
      setError(err.response?.data?.message || "Código incorrecto o expirado. Intenta de nuevo.");
    } finally { setLoading(false); }
  };
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"420px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>{paso===3?"¡Pagaré firmado!":"Firma digital"}</h3><p style={styles.modalSub}>{pagare.numero}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {paso===1&&(<>
          <div style={styles.infoBox}>
            <span>⚠️</span>
            <p style={{fontSize:"0.8rem",color:palette.text,margin:0,lineHeight:1.5}}>
              Al firmar aceptas las condiciones del crédito por <strong>{fmt(pagare.monto)}</strong>.
              Esta acción tiene <strong>validez legal</strong> como título ejecutivo según el Art. 622 del Código de Comercio.
            </p>
          </div>
          <div style={styles.resumenFirma}>
            {[
              ["Pagaré",    pagare.numero],
              ["Deudor",    pagare.deudor_nombre||pagare.estudiante_nombre],
              ["C.C.",      pagare.deudor_cc],
              ["Codeudor",  pagare.codeudor_nombre||"—"],
              ["C.C. codeudor", pagare.codeudor_cc||"—"],
              ["Monto",     fmt(pagare.monto)],
              ["Cuotas",    pagare.cuotas||"—"],
            ].map(([l,v])=>(
              <div key={l} style={styles.datoRow}><span style={styles.datoLabel}>{l}</span><span style={styles.datoVal}>{v}</span></div>
            ))}
          </div>
          <div style={{display:"flex",gap:"0.75rem",marginTop:"1.25rem"}}>
            <button style={styles.btnPrimary} onClick={handleSolicitarCodigo} disabled={loading}>{loading?"Enviando...":"Continuar →"}</button>
            <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
          </div>
          {error&&<p style={{fontSize:"0.78rem",color:palette.red,marginTop:"0.5rem"}}>{error}</p>}
        </>)}
        {paso===2&&(<>
          <div style={styles.infoBox}>
            <IconMail size={18} style={{color:palette.navy,flexShrink:0}} />
            <p style={{fontSize:"0.8rem",color:palette.text,margin:0,lineHeight:1.5}}>{mensajeEnvio}</p>
          </div>
          <input style={styles.codigoInput} type="text" maxLength={6} placeholder="_ _ _ _ _ _" value={codigo} onChange={e=>{setCodigo(e.target.value.replace(/\D/g,""));setError("");}}/>
          {error&&<p style={{fontSize:"0.78rem",color:palette.red,margin:"0.25rem 0 0"}}>{error}</p>}
          {loading
            ?<div style={{textAlign:"center",padding:"1rem 0"}}><div style={styles.spinner}/><p style={{color:palette.navy,fontSize:"0.82rem",marginTop:"0.5rem"}}>Procesando firma...</p></div>
            :<div style={{display:"flex",gap:"0.75rem",marginTop:"1.25rem"}}>
              <button style={{...styles.btnPrimary,background:`linear-gradient(135deg,${palette.orange},#d4640a)`}} onClick={handleVerificar} disabled={codigo.length!==6}>✎ Firmar ahora</button>
              <button style={styles.btnSecondary} onClick={()=>setPaso(1)}>← Volver</button>
            </div>
          }
        </>)}
        {paso===3&&(
          <div style={{textAlign:"center",padding:"0.5rem 0 0.75rem"}}>
            <div style={styles.successIcon}>✓</div>
            <p style={{color:palette.text,fontSize:"0.88rem",marginBottom:"0.25rem",fontWeight:"600"}}>Pagaré firmado correctamente</p>
            <p style={{color:palette.muted,fontSize:"0.78rem",marginBottom:"1.5rem",lineHeight:1.5}}>
              Recibirás una copia en tu correo institucional. Recuerda que también debes entregar los documentos originales al Departamento Financiero.
            </p>
            <button style={styles.btnPrimary} onClick={()=>{onConfirmado();onClose();}}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal admin: generar pagaré ──────────────────────────────────────────────
// El backend (pagares.php → generarPagare) solo acepta credito_id + fecha_vencimiento:
// los datos de deudor/codeudor/monto ya viven en el crédito, no se piden de nuevo.
function ModalGenerarPagare({ onClose, onGenerado }) {
  const [creditos, setCreditos]   = useState([]);
  const [creditoId, setCreditoId] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [loadingLista, setLoadingLista] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await creditosService.getTodos();
        setCreditos((data.creditos || []).filter(c => c.monto));
      } catch (err) { console.error(err); }
      finally { setLoadingLista(false); }
    })();
  }, []);

  const handleGenerar = async () => {
    if (!creditoId) { setError("Selecciona un crédito."); return; }
    setError(""); setLoading(true);
    try {
      await pagaresService.generar(creditoId, vencimiento || null);
      onGenerado();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo generar el pagaré.");
    } finally { setLoading(false); }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"460px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Generar pagaré</h3><p style={styles.modalSub}>Nuevo documento de obligación — NO AUTENTICAR</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {loadingLista ? <Spinner/> : creditos.length === 0 ? (
            <p style={{fontSize:"0.85rem",color:palette.muted,lineHeight:1.6}}>
              No hay créditos con monto asignado todavía. Primero ve a <strong>Créditos → Gestionar</strong>,
              cambia el estado a <strong>Aprobado</strong> o <strong>Activo</strong>, y completa los datos financieros (monto, cuotas, tasa).
              Recién ahí el crédito aparecerá aquí para poder generarle el pagaré.
            </p>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={styles.formLabel}>Crédito *</label>
                <select style={styles.formInput} value={creditoId} onChange={e=>setCreditoId(e.target.value)}>
                  <option value="">Selecciona un crédito con monto asignado...</option>
                  {creditos.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.estudiante_nombre || c.tipo} — {fmt(c.monto)}</option>)}
                </select>
                <span style={{fontSize:"0.7rem",color:palette.muted}}>Solo se listan créditos con monto ya asignado por el Departamento Financiero.</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={styles.formLabel}>Fecha de vencimiento</label>
                <input style={styles.formInput} type="date" value={vencimiento} onChange={e=>setVencimiento(e.target.value)}/>
                <span style={{fontSize:"0.7rem",color:palette.muted}}>Si la dejas vacía, se usa la del crédito o un año a partir de hoy.</span>
              </div>
            </div>
          )}

          {error && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", background: palette.red + "12", border: `1px solid ${palette.red}40`, borderRadius: "9px", padding: "0.7rem 0.9rem", margin: "0.9rem 0 0" }}>
              <IconAlertTriangle size={16} style={{ color: palette.red, flexShrink: 0, marginTop: "1px" }} />
              <p style={{ fontSize: "0.8rem", color: palette.red, fontWeight: "600", margin: 0 }}>{error}</p>
            </div>
          )}
          <div style={{display:"flex",gap:"0.75rem",marginTop:"1.25rem"}}>
            {loading?<div style={{padding:"0.7rem"}}><div style={styles.spinner}/></div>
            :<>{creditos.length>0 && <button style={styles.btnPrimary} onClick={handleGenerar}><IconSignature size={15}/> Generar pagaré</button>}
              <button style={styles.btnSecondary} onClick={onClose}>{creditos.length>0?"Cancelar":"Entendido"}</button></>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ESTUDIANTE
// ══════════════════════════════════════════════════════════════════════════════
function PagaresEstudiante() {
  const [pagares, setPagares]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modalVer, setModalVer]       = useState(null);
  const [modalFirmar, setModalFirmar] = useState(null);
  const [filtro, setFiltro]           = useState("todos");

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await pagaresService.getMisPagares();
      setPagares(data.pagares || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const handleConfirmadoFirma = () => { cargar(); };

  const filtrados = pagares.filter(p=>
    filtro==="todos"||
    (filtro==="vigente"&&p.estado==="Vigente")||
    (filtro==="pendiente"&&p.estado==="Pendiente firma")||
    (filtro==="vencido"&&p.estado==="Vencido")
  );

  const totalVigentes   = pagares.filter(p=>p.estado==="Vigente").length;
  const totalPendientes = pagares.filter(p=>p.estado==="Pendiente firma").length;
  const totalVencidos   = pagares.filter(p=>p.estado==="Vencido").length;
  const montoTotal      = pagares.reduce((s,p)=>s+parseFloat(p.monto||0),0);

  if (loading) return <Spinner/>;

  return (
    <div style={{animation:"fadeIn 0.35s ease"}}>
      <div style={styles.secHeader}>
        <div><h2 style={styles.secTitle}>Pagarés</h2><p style={styles.secSub}>Documentos de obligación financiera de tus créditos estudiantiles</p></div>
      </div>

      {totalPendientes>0&&(
        <div style={styles.alertaBanner}>
          <span style={{fontSize:"1.2rem"}}>⚠️</span>
          <div>
            <p style={{fontWeight:"700",color:palette.orange,margin:"0 0 2px",fontSize:"0.88rem"}}>Tienes {totalPendientes} pagaré{totalPendientes>1?"s":""} pendiente{totalPendientes>1?"s":""} de firma</p>
            <p style={{color:palette.text,margin:0,fontSize:"0.78rem"}}>El crédito no será desembolsado hasta que firmes el pagaré junto con tu codeudor.</p>
          </div>
        </div>
      )}

      <div style={styles.statsGrid}>
        {[
          {label:"Monto total",         val:fmt(montoTotal),    color:palette.navy,  Icon:IconDollar},
          {label:"Vigentes",            val:totalVigentes,      color:palette.green, Icon:IconCheckCircle},
          {label:"Pendientes de firma", val:totalPendientes,    color:palette.orange,Icon:IconSignature},
          {label:"Vencidos",            val:totalVencidos,      color:totalVencidos>0?palette.red:palette.muted,Icon:IconAlertTriangle},
        ].map(s=>(
          <div key={s.label} style={{...styles.statCard,borderTop:`3px solid ${s.color}`}}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{...styles.statVal,color:s.color}}>{s.val}</p></div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:"4px",marginBottom:"1rem",flexWrap:"wrap"}}>
        {[["todos","Todos"],["vigente","✓ Vigentes"],["pendiente","Pendientes"],["vencido","✕ Vencidos"]].map(([k,l])=>(
          <button key={k} style={{...styles.filtroBtn,background:filtro===k?palette.navy:"transparent",color:filtro===k?"#fff":palette.muted}} onClick={()=>setFiltro(k)}>{l}</button>
        ))}
      </div>

      <div style={styles.pagaresList}>
        {filtrados.length===0
          ?<div style={{...styles.emptyState,background:palette.card,borderRadius:"14px",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{color:palette.muted,fontSize:"0.85rem"}}>Sin pagarés en esta categoría.</p></div>
          :filtrados.map((p,i)=>(
            <div key={p.id} style={{...styles.pagareCard,borderLeft:`4px solid ${getEstadoColor(p.estado)==="green"?palette.green:getEstadoColor(p.estado)==="red"?palette.red:palette.orange}`,animation:`fadeUp 0.3s ease ${i*0.08}s both`}}>
              <div style={styles.docIcono}><IconSignature size={20} style={{color:palette.navy}} /></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.6rem",marginBottom:"4px",flexWrap:"wrap"}}>
                  <span style={styles.pagareNum}>{p.numero}</span>
                  <EstadoBadge estado={p.estado} color={getEstadoColor(p.estado)}/>
                  {p.firmado&&<span style={{fontSize:"0.68rem",fontWeight:"600",color:palette.green,background:palette.green+"12",padding:"0.15rem 0.5rem",borderRadius:"99px"}}>✓ Firmado</span>}
                </div>
                <p style={styles.pagareTipo}>{p.credito_codigo} — {p.credito_tipo}{p.periodo?` (${p.periodo})`:""}</p>
                <div style={{display:"flex",gap:"1.5rem",marginTop:"0.4rem",flexWrap:"wrap"}}>
                  <span style={styles.pagareMetaItem}><span style={styles.pagareMetaLabel}>Monto:</span><span style={{fontWeight:"600",color:palette.navy}}>{fmt(p.monto)}</span></span>
                  <span style={styles.pagareMetaItem}><span style={styles.pagareMetaLabel}>Emisión:</span>{fmtDateShort(p.fecha_emision)}</span>
                  <span style={styles.pagareMetaItem}><span style={styles.pagareMetaLabel}>Vence:</span>{fmtDateShort(p.fecha_vencimiento)}</span>
                </div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"0.45rem",flexShrink:0}}>
                <button style={styles.btnVer} onClick={()=>setModalVer(p)}><IconEye size={14}/> Ver pagaré</button>
                {!p.firmado&&<button style={{...styles.btnFirmar,background:`linear-gradient(135deg,${palette.orange},#d4640a)`}} onClick={()=>setModalFirmar(p)}>✎ Firmar</button>}
                {p.firmado==1&&<button style={styles.btnDescargar} disabled title="Descarga en PDF pendiente de implementar en el backend">↓ Descargar</button>}
              </div>
            </div>
          ))
        }
      </div>

      {modalVer&&<ModalVerPagare pagare={modalVer} onClose={()=>setModalVer(null)} onFirmar={(id)=>{setModalVer(null);setModalFirmar(pagares.find(p=>p.id===id));}}/>}
      {modalFirmar&&<ModalFirmar pagare={modalFirmar} onClose={()=>setModalFirmar(null)} onConfirmado={handleConfirmadoFirma}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADMIN
// ══════════════════════════════════════════════════════════════════════════════
function PagaresAdmin() {
  const [pagares, setPagares]           = useState([]);
  const [totales, setTotales]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [busqueda, setBusqueda]         = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroTipo, setFiltroTipo]     = useState("todos");
  const [fechas, setFechas]             = useState({ desde:"", hasta:"" });
  const [semestre, setSemestre]         = useState("");
  const [modalVer, setModalVer]         = useState(null);
  const [modalGenerar, setModalGenerar] = useState(false);

  const ESTADO_REAL = { todos:"", vigente:"Vigente", pendiente:"Pendiente firma", vencido:"Vencido" };

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await pagaresService.getTodos({ estado: ESTADO_REAL[filtroEstado], buscar: busqueda, desde: fechas.desde, hasta: fechas.hasta, semestre });
      setPagares(data.pagares || []);
      setTotales(data.totales || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroEstado, fechas, semestre]);

  const handleBuscar = (e) => { e.preventDefault(); cargar(); };
  const handleGenerado = () => { cargar(); };

  // El backend no filtra por tipo de crédito, así que ese filtro se aplica en cliente
  const filtrados = pagares.filter(p=>filtroTipo==="todos"||p.credito_tipo===filtroTipo);
  const tiposUnicos = [...new Set(pagares.map(p=>p.credito_tipo))];

  const totalVigentes   = totales?.vigentes    || 0;
  const totalPendientes = totales?.pendientes  || 0;
  const totalVencidos   = totales?.vencidos    || 0;
  const montoTotal      = totales?.monto_total || 0;
  const totalPagares    = totales?.total       || 0;

  return (
    <div style={{animation:"fadeIn 0.35s ease"}}>
      {totalPendientes>0&&(
        <div style={styles.alertaBanner}>
          <span style={{fontSize:"1.2rem"}}>⚠️</span>
          <div>
            <p style={{fontWeight:"700",color:palette.orange,margin:"0 0 2px",fontSize:"0.88rem"}}>{totalPendientes} pagaré{totalPendientes>1?"s":""} pendiente{totalPendientes>1?"s":""} de firma</p>
            <p style={{color:palette.text,margin:0,fontSize:"0.78rem"}}>Los créditos no serán desembolsados hasta que el estudiante y el codeudor firmen el pagaré.</p>
          </div>
        </div>
      )}

      <div style={styles.secHeader}>
        <div><h2 style={styles.secTitle}>Gestión de pagarés</h2><p style={styles.secSub}>Control de documentos de obligación — Corporación Universitaria Autónoma del Cauca · NIT 891501766-6</p></div>
        <button style={styles.btnPrimary} onClick={()=>setModalGenerar(true)}><IconSignature size={15}/> Generar pagaré</button>
      </div>

      <div style={styles.statsGrid}>
        {[
          {label:"Monto total",      val:fmt(montoTotal),    color:palette.navy,  Icon:IconDollar},
          {label:"Vigentes",         val:totalVigentes,      color:palette.green, Icon:IconCheckCircle},
          {label:"Pend. de firma",   val:totalPendientes,    color:palette.orange,Icon:IconSignature},
          {label:"Vencidos",         val:totalVencidos,      color:totalVencidos>0?palette.red:palette.muted,Icon:IconAlertTriangle},
          {label:"Total pagarés",    val:totalPagares,       color:palette.gold,  Icon:IconClipboard},
        ].map(s=>(
          <div key={s.label} style={{...styles.statCard,borderTop:`3px solid ${s.color}`}}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{...styles.statVal,color:s.color}}>{s.val}</p></div>
          </div>
        ))}
      </div>

      <div style={{background:palette.card,borderRadius:"14px",padding:"1.25rem 1.5rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",marginBottom:"1.25rem"}}>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem",marginBottom:"1rem",alignItems:"center"}}>
          <form onSubmit={handleBuscar} style={{display:"flex",flex:1,minWidth:"200px",gap:"0.5rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.5rem",background:palette.beige,borderRadius:"9px",padding:"0.45rem 0.9rem",flex:1,border:`1px solid ${palette.border}`}}>
              <IconSearch size={16} style={{color:palette.muted,flexShrink:0}} />
              <input style={{border:"none",background:"transparent",flex:1,fontSize:"0.82rem",color:palette.text,fontFamily:"'Inter',sans-serif"}} placeholder="Buscar por estudiante, cédula o número..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
              {busqueda&&<button type="button" style={{background:"none",border:"none",color:palette.muted,cursor:"pointer",fontSize:"0.75rem"}} onClick={()=>{setBusqueda("");cargar();}}>✕</button>}
            </div>
            <button type="submit" style={{...styles.btnPrimary,padding:"0.45rem 0.9rem",fontSize:"0.8rem"}}>Buscar</button>
          </form>
          <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
            {[["todos","Todos"],["vigente","✓ Vigentes"],["pendiente","Pendientes"],["vencido","✕ Vencidos"]].map(([k,l])=>(
              <button key={k} style={{...styles.filtroBtn,background:filtroEstado===k?palette.navy:"transparent",color:filtroEstado===k?"#fff":palette.muted}} onClick={()=>setFiltroEstado(k)}>{l}</button>
            ))}
          </div>
          <select style={{padding:"0.35rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.78rem",color:palette.text,background:palette.card,cursor:"pointer",fontFamily:"'Inter',sans-serif"}} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
            <option value="todos">Todos los tipos</option>
            {tiposUnicos.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          <DateFilter value={fechas} onChange={setFechas} />
          <select style={{padding:"0.35rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.78rem",color:palette.text,background:palette.card,cursor:"pointer",fontFamily:"'Inter',sans-serif"}} value={semestre} onChange={e=>setSemestre(e.target.value)}>
            <option value="">Todos los semestres</option>
            {Array.from({length:10},(_,i)=>i+1).map(s=><option key={s} value={s}>Semestre {s}</option>)}
          </select>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:"0.65rem"}}>
          {loading ? <Spinner/> : filtrados.length===0
            ?<div style={styles.emptyState}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{color:palette.muted,fontSize:"0.85rem"}}>Sin pagarés que coincidan.</p></div>
            :filtrados.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:"0.9rem",background:palette.beige,borderRadius:"11px",padding:"0.9rem 1.1rem",borderLeft:`4px solid ${getEstadoColor(p.estado)==="green"?palette.green:getEstadoColor(p.estado)==="red"?palette.red:palette.orange}`,flexWrap:"wrap",animation:`fadeUp 0.3s ease ${i*0.05}s both`}}>
                <div style={{width:"38px",height:"38px",borderRadius:"50%",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",fontWeight:"700",fontSize:"0.85rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {p.estudiante_nombre.charAt(0)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap",marginBottom:"2px"}}>
                    <span style={{fontSize:"0.85rem",fontWeight:"700",color:palette.text}}>{p.estudiante_nombre}</span>
                    <EstadoBadge estado={p.estado} color={getEstadoColor(p.estado)}/>
                    {p.firmado==1&&<span style={{fontSize:"0.65rem",fontWeight:"600",color:palette.green,background:palette.green+"12",padding:"0.12rem 0.45rem",borderRadius:"99px"}}>✓ Firmado</span>}
                  </div>
                  <p style={{fontSize:"0.7rem",color:palette.muted,margin:"0 0 3px"}}>C.C. {p.estudiante_cc} · {p.credito_codigo} · {p.credito_tipo}</p>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"}}>
                    <span style={{fontSize:"0.78rem",fontWeight:"700",color:palette.navy,letterSpacing:"0.02em"}}>{p.numero}</span>
                    <span style={{fontSize:"0.72rem",color:palette.muted}}>Emisión: {fmtDateShort(p.fecha_emision)} · Vence: {fmtDateShort(p.fecha_vencimiento)}</span>
                  </div>
                  {p.fecha_firma&&<p style={{fontSize:"0.7rem",color:palette.green,margin:"3px 0 0"}}>Firmado el {fmtDateShort(p.fecha_firma)}</p>}
                </div>
                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"0.4rem",flexShrink:0}}>
                  <span style={{fontSize:"0.95rem",fontWeight:"700",color:palette.navy}}>{fmt(p.monto)}</span>
                  <div style={{display:"flex",gap:"0.4rem"}}>
                    <button style={styles.btnVer} onClick={()=>setModalVer(p)}><IconEye size={14}/> Ver</button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
        {!loading && filtrados.length>0&&<p style={{fontSize:"0.72rem",color:palette.muted,textAlign:"right",marginTop:"0.75rem"}}>{filtrados.length} pagaré{filtrados.length!==1?"s":""}</p>}
      </div>

      {modalVer&&<ModalVerPagare pagare={modalVer} onClose={()=>setModalVer(null)}/>}
      {modalGenerar&&<ModalGenerarPagare onClose={()=>setModalGenerar(false)} onGenerado={handleGenerado}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Pagares() {
  const { isAdmin } = useAuth();
  return (
    <Layout>
      {isAdmin ? <PagaresAdmin/> : <PagaresEstudiante/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        select,input,textarea { font-family:'Inter',sans-serif; }
        select:focus,input:focus { outline:none; border-color:#1e3a5f !important; box-shadow:0 0 0 3px rgba(30,58,95,0.1); }
      `}</style>
    </Layout>
  );
}

const styles = {
  secHeader:   {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.75rem"},
  secTitle:    {fontSize:"1.25rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"},
  secSub:      {fontSize:"0.82rem",color:palette.muted,margin:0},
  alertaBanner:{display:"flex",alignItems:"flex-start",gap:"0.75rem",background:palette.orange+"10",border:`1.5px solid ${palette.orange}30`,borderRadius:"12px",padding:"1rem 1.25rem",marginBottom:"1.25rem"},
  statsGrid:   {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:"0.85rem",marginBottom:"1.25rem"},
  statCard:    {background:palette.card,borderRadius:"12px",padding:"0.9rem 1rem",display:"flex",alignItems:"center",gap:"0.75rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"},
  statLabel:   {fontSize:"0.7rem",color:palette.muted,margin:"0 0 2px"},
  statVal:     {fontSize:"1.1rem",fontWeight:"700",margin:0},
  filtroBtn:   {padding:"0.3rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.75rem",fontWeight:"500",cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"},
  pagaresList: {display:"flex",flexDirection:"column",gap:"0.85rem"},
  pagareCard:  {background:palette.card,borderRadius:"13px",padding:"1.1rem 1.25rem",display:"flex",alignItems:"center",gap:"1rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",flexWrap:"wrap"},
  docIcono:    {width:"48px",height:"48px",borderRadius:"12px",background:palette.beige,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  pagareNum:   {fontSize:"0.82rem",fontWeight:"700",color:palette.navy,letterSpacing:"0.02em"},
  pagareTipo:  {fontSize:"0.8rem",color:palette.text,margin:0,fontWeight:"500"},
  pagareMetaItem:{fontSize:"0.75rem",color:palette.muted,display:"flex",gap:"0.3rem",alignItems:"center"},
  pagareMetaLabel:{fontWeight:"600",color:palette.text},
  btnVer:      {padding:"0.35rem 0.9rem",background:palette.navy+"10",border:"none",borderRadius:"7px",fontSize:"0.75rem",fontWeight:"600",color:palette.navy,cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  btnFirmar:   {padding:"0.35rem 0.9rem",border:"none",borderRadius:"7px",fontSize:"0.75rem",fontWeight:"600",color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  btnDescargar:{padding:"0.35rem 0.9rem",background:palette.green+"12",border:"none",borderRadius:"7px",fontSize:"0.75rem",fontWeight:"600",color:palette.green,cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  emptyState:  {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem",padding:"2.5rem"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem"},
  modal:       {background:palette.card,borderRadius:"18px",padding:"2rem",width:"100%",maxWidth:"460px",boxShadow:"0 25px 60px rgba(0,0,0,0.3)",animation:"fadeIn 0.25s ease",maxHeight:"90vh",display:"flex",flexDirection:"column"},
  modalHeader: {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem",flexShrink:0},
  modalTitle:  {fontSize:"1.1rem",fontWeight:"700",color:palette.navy,margin:0},
  modalSub:    {fontSize:"0.8rem",color:palette.muted,margin:"3px 0 0"},
  closeBtn:    {background:palette.beige,border:"none",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"0.85rem",color:palette.muted,fontFamily:"'Inter',sans-serif"},
  documentoScroll:{flex:1,overflowY:"auto",padding:"0.25rem 0.1rem",scrollBehavior:"smooth"},
  membrete:    {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:"0.75rem"},
  logoPlaceholder:{width:"40px",height:"40px",borderRadius:"10px",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",fontWeight:"700",fontSize:"0.85rem",display:"flex",alignItems:"center",justifyContent:"center"},
  membreteNombre:{fontSize:"0.75rem",fontWeight:"700",color:palette.navy,margin:0},
  membreteSubtitle:{fontSize:"0.65rem",color:palette.muted,margin:"2px 0 0"},
  divider:     {height:"1px",background:palette.border,margin:"1rem 0"},
  docTitle:    {fontSize:"1rem",fontWeight:"700",color:palette.navy,textAlign:"center",letterSpacing:"0.1em",margin:"0 0 0.75rem"},
  docIntro:    {fontSize:"0.79rem",color:palette.text,lineHeight:"1.65",margin:"0 0 0.85rem"},
  montoBox:    {background:`linear-gradient(135deg,${palette.navy}08,${palette.navy}12)`,border:`1.5px solid ${palette.navy}20`,borderRadius:"12px",padding:"1rem",textAlign:"center",marginBottom:"1rem"},
  montoVal:    {fontSize:"1.4rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"},
  montoLabel:  {fontSize:"0.72rem",color:palette.muted,margin:0},
  datosGrid:   {display:"flex",flexDirection:"column",marginBottom:"0.5rem"},
  datoRow:     {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.45rem 0",borderBottom:`1px solid ${palette.border}`},
  datoLabel:   {fontSize:"0.75rem",color:palette.muted},
  datoVal:     {fontSize:"0.8rem",color:palette.text,fontWeight:"500",textAlign:"right"},
  clausulasTitle:{fontSize:"0.85rem",fontWeight:"700",color:palette.navy,margin:"0 0 0.6rem"},
  firmaBox:    {display:"flex",alignItems:"center",gap:"0.75rem",background:palette.green+"08",border:`1px solid ${palette.green}25`,borderRadius:"10px",padding:"0.85rem 1rem"},
  firmaIcono:  {width:"36px",height:"36px",borderRadius:"50%",background:palette.green+"18",color:palette.green,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",fontWeight:"700",flexShrink:0},
  firmaTexto:  {fontSize:"0.72rem",color:palette.muted,margin:"0 0 2px"},
  firmaNombre: {fontSize:"0.85rem",fontWeight:"700",color:palette.navy,margin:0},
  firmaMeta:   {fontSize:"0.7rem",color:palette.muted,margin:"2px 0 0"},
  infoBox:     {display:"flex",gap:"0.6rem",alignItems:"flex-start",background:palette.beige,borderRadius:"9px",padding:"0.75rem",marginBottom:"1rem"},
  resumenFirma:{background:palette.beige,borderRadius:"10px",padding:"0.75rem 1rem"},
  codigoInput: {width:"100%",textAlign:"center",letterSpacing:"0.5em",fontSize:"1.4rem",fontWeight:"700",color:palette.navy,border:`2px solid ${palette.border}`,borderRadius:"10px",padding:"0.75rem",fontFamily:"'Inter',sans-serif",background:palette.beige,boxSizing:"border-box"},
  spinner:     {width:"32px",height:"32px",margin:"0 auto",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.orange,borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  successIcon: {width:"56px",height:"56px",borderRadius:"50%",background:palette.green+"18",color:palette.green,fontSize:"1.5rem",fontWeight:"700",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"},
  formLabel:   {fontSize:"0.82rem",fontWeight:"600",color:palette.text},
  formInput:   {padding:"0.65rem 0.9rem",border:`1.5px solid ${palette.border}`,borderRadius:"9px",fontSize:"0.85rem",color:palette.text,background:palette.beige,fontFamily:"'Inter',sans-serif"},
  btnPrimary:  {padding:"0.7rem 1.25rem",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",border:"none",borderRadius:"10px",fontSize:"0.88rem",fontWeight:"600",cursor:"pointer",fontFamily:"'Inter',sans-serif",boxShadow:`0 4px 12px rgba(30,58,95,0.25)`},
  btnSecondary:{padding:"0.7rem 1.25rem",background:"none",border:`1.5px solid ${palette.border}`,borderRadius:"10px",color:palette.muted,fontSize:"0.88rem",cursor:"pointer",fontFamily:"'Inter',sans-serif"},
};