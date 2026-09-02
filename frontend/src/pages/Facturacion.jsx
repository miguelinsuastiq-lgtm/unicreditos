import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import facturasService from "../services/facturasService";
import creditosService from "../services/creditosService";
import {
  IconCheckCircle, IconXCircle, IconClock, IconCreditCard, IconDollar,
  IconReceipt, IconSearch, IconInbox, IconAlertTriangle, IconBank, IconCash, IconZap, IconExchange, IconUpload,
} from "../components/Icons";
import DateFilter from "../components/DateFilter";

const palette = {
  navy:"#1e3a5f", orange:"#e8740e", gold:"#c89b14", beige:"#f3ede1",
  beigeAlt:"#ede6d8", text:"#2c3e50", muted:"#6b7a8d", green:"#1d9e75",
  red:"#c0392b", card:"#ffffff", border:"rgba(30,58,95,0.1)",
};

const fmt     = (n) => new Intl.NumberFormat("es-CO", { style:"currency", currency:"COP", minimumFractionDigits:0 }).format(n||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-CO", { year:"numeric", month:"short", day:"numeric" }) : "—";

function getEstadoColor(estado) {
  if (estado === "Pagada") return "green";
  if (estado === "Vencida") return "red";
  if (estado === "En revisión") return "gold";
  if (estado === "Pendiente") return "orange";
  return "muted";
}

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"3rem"}}><div style={{width:"36px",height:"36px",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
}

// ─── Componentes compartidos ───────────────────────────────────────────────────
function EstadoBadge({ estado, color }) {
  const map = { green:{bg:palette.green+"18",text:palette.green,Icon:IconCheckCircle}, red:{bg:palette.red+"18",text:palette.red,Icon:IconXCircle}, orange:{bg:palette.orange+"18",text:palette.orange,Icon:IconClock}, gold:{bg:palette.gold+"18",text:palette.gold,Icon:IconClock} };
  const c = map[color] || map.green;
  return <span style={{...styles.badge, background:c.bg, color:c.text}}><c.Icon size={12} strokeWidth={2.5} /> {estado}</span>;
}

function ModalDetalle({ factura, onClose, setModalPago }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal, maxWidth:"420px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Detalle de factura</h3><p style={styles.modalSub}>{factura.numero}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.detalleGrid}>
          {[
            ["Número", factura.numero], ["Concepto", factura.concepto],
            ["Fecha emisión", fmtDate(factura.fecha_emision)], ["Fecha venc.", fmtDate(factura.fecha_vencimiento)],
            ["Estado", <EstadoBadge key="e" estado={factura.estado} color={getEstadoColor(factura.estado)}/>],
            ["Monto", fmt(factura.monto)], ["Método", factura.metodo_pago||"—"], ["Referencia", factura.referencia_pago||"—"],
          ].map(([label, val]) => (
            <div key={label} style={styles.detalleRow}><span style={styles.detalleLabel}>{label}</span><span style={styles.detalleVal}>{val}</span></div>
          ))}
        </div>
        <div style={{display:"flex", gap:"0.75rem", marginTop:"1.25rem", flexWrap:"wrap"}}>
          {factura.comprobante_ruta && <button style={styles.btnSecondary} onClick={() => window.open(facturasService.urlComprobante(factura.id), "_blank")}>↓ Ver comprobante</button>}
          {setModalPago && factura.estado!=="Pagada" && (
            <button style={{...styles.btnPrimary, background:`linear-gradient(135deg,${palette.green},#16a085)`}} onClick={() => { onClose(); setModalPago(factura); }}>✓ Registrar pago</button>
          )}
          <button style={styles.btnSecondary} onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

function ModalPagoEstudiante({ factura, onClose, onPagado }) {
  const [metodo, setMetodo] = useState("PSE");
  const [referencia, setReferencia] = useState("");
  const [comprobante, setComprobante] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paso, setPaso] = useState(1);
  const [error, setError] = useState("");
  const metodos = [{id:"PSE",label:"PSE",Icon:IconBank},{id:"Transferencia",label:"Transferencia",Icon:IconExchange},{id:"Efectivo",label:"Pago en caja",Icon:IconCash}];

  const handleSeleccionarArchivo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError("El comprobante supera el límite de 5 MB."); return; }
    setError("");
    setComprobante(f);
  };

  const handlePagar = async () => {
    if (!referencia.trim()) { setError("Ingresa el número de referencia real de tu comprobante."); return; }
    if (!comprobante) { setError("Adjunta una foto o captura de tu comprobante de pago."); return; }
    setError(""); setLoading(true);
    try {
      await facturasService.reportarPago(factura.id, metodo, referencia.trim(), comprobante);
      setLoading(false);
      setPaso(3);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "No se pudo enviar tu comprobante. Intenta nuevamente.");
      setPaso(1);
    }
  };
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>{paso===3?"¡Comprobante enviado!":"Reportar pago"}</h3><p style={styles.modalSub}>{factura.numero}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {paso===1 && (<>
          <div style={styles.resumenPago}>
            <div style={styles.resumenRow}><span style={styles.resumenLabel}>Concepto</span><span style={styles.resumenVal}>{factura.concepto}</span></div>
            <div style={styles.resumenRow}><span style={styles.resumenLabel}>Vence</span><span style={styles.resumenVal}>{fmtDate(factura.fecha_vencimiento)}</span></div>
            <div style={{...styles.resumenRow, borderTop:`1.5px solid ${palette.border}`, paddingTop:"0.75rem", marginTop:"0.25rem"}}>
              <span style={{...styles.resumenLabel, fontWeight:"700", color:palette.navy}}>Total</span>
              <span style={{fontSize:"1.1rem", fontWeight:"700", color:palette.navy}}>{fmt(factura.monto)}</span>
            </div>
          </div>
          <p style={{fontSize:"0.78rem", color:palette.muted, margin:"0.75rem 0 1rem", lineHeight:1.5}}>
            Primero realiza el pago por tu cuenta (PSE, transferencia o en caja) y luego sube aquí el comprobante —
            el Departamento Financiero lo revisa y confirma tu pago.
          </p>
          <p style={{fontSize:"0.82rem", fontWeight:"600", color:palette.text, marginBottom:"0.6rem"}}>¿Cómo pagaste?</p>
          <div style={styles.metodosGrid}>
            {metodos.map(m=>(
              <button key={m.id} style={{...styles.metodoBtn, borderColor:metodo===m.id?palette.navy:palette.border, background:metodo===m.id?palette.navy+"08":"transparent", color:metodo===m.id?palette.navy:palette.muted}} onClick={()=>setMetodo(m.id)}>
                <m.Icon size={19} />
                <span style={{fontSize:"0.78rem", fontWeight:"600"}}>{m.label}</span>
                {metodo===m.id && <span style={{fontSize:"0.65rem", color:palette.green, fontWeight:"700"}}>✓</span>}
              </button>
            ))}
          </div>

          <div style={{marginTop:"1rem", display:"flex", flexDirection:"column", gap:"5px"}}>
            <label style={{fontSize:"0.82rem", fontWeight:"600", color:palette.text}}>Número de referencia *</label>
            <input style={{padding:"0.7rem 0.9rem", border:`1.5px solid ${palette.border}`, borderRadius:"9px", fontSize:"0.88rem", color:palette.text, background:palette.beige, fontFamily:"'Inter',sans-serif"}}
              placeholder="El que aparece en tu comprobante real" value={referencia} onChange={e=>setReferencia(e.target.value)} />
          </div>

          <div style={{marginTop:"1rem", display:"flex", flexDirection:"column", gap:"5px"}}>
            <label style={{fontSize:"0.82rem", fontWeight:"600", color:palette.text}}>Foto o captura del comprobante *</label>
            <label style={{display:"flex",alignItems:"center",gap:"0.6rem",padding:"0.7rem 0.9rem",border:`1.5px dashed ${comprobante?palette.green:palette.border}`,borderRadius:"9px",cursor:"pointer",background:comprobante?palette.green+"08":palette.beige}}>
              <IconUpload size={17} style={{color:comprobante?palette.green:palette.muted,flexShrink:0}}/>
              <span style={{fontSize:"0.82rem",color:comprobante?palette.green:palette.muted,fontWeight:comprobante?"600":"400",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {comprobante ? comprobante.name : "Toca para elegir una imagen o PDF (máx. 5 MB)"}
              </span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{display:"none"}} onChange={handleSeleccionarArchivo}/>
            </label>
          </div>

          <div style={{display:"flex", gap:"0.75rem", marginTop:"1.25rem"}}>
            {loading ? <div style={{padding:"0.7rem"}}><div style={styles.spinner}/></div>
            : <><button style={styles.btnPrimary} onClick={handlePagar}>Enviar comprobante →</button>
              <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button></>}
          </div>
          {error && <p style={{fontSize:"0.78rem",color:palette.red,marginTop:"0.5rem"}}>{error}</p>}
        </>)}
        {paso===3 && (
          <div style={{textAlign:"center", padding:"0.5rem 0 0.75rem"}}>
            <div style={styles.successIcon}>✓</div>
            <p style={{color:palette.text, fontSize:"0.88rem", marginBottom:"0.25rem"}}>Tu comprobante fue enviado.</p>
            <p style={{color:palette.muted, fontSize:"0.78rem", marginBottom:"1.5rem"}}>El Departamento Financiero lo revisará y confirmará tu pago pronto.</p>
            <button style={styles.btnPrimary} onClick={()=>{onPagado();onClose();}}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModalRegistrarPago({ factura, onClose, onPagado }) {
  const [metodo, setMetodo]   = useState(factura.metodo_pago || "Efectivo");
  const [ref, setRef]         = useState(factura.referencia_pago || "");
  const [loading, setLoading] = useState(false);
  const [paso, setPaso]       = useState(1);
  const [error, setError]     = useState("");
  const metodos = [{id:"Efectivo",label:"Efectivo",Icon:IconCash},{id:"Transferencia",label:"Transferencia",Icon:IconExchange},{id:"PSE",label:"PSE",Icon:IconBank}];
  const handleConfirmar = async () => {
    if (!ref.trim()) { setError("Ingresa la referencia del pago."); return; }
    setError(""); setLoading(true);
    try {
      await facturasService.pagar(factura.id, metodo, ref.trim());
      setLoading(false);
      setPaso(2);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "No se pudo registrar el pago. Intenta nuevamente.");
    }
  };
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal, maxWidth:"460px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>{paso===2?"Pago registrado":"Registrar pago"}</h3><p style={styles.modalSub}>{factura.estudiante_nombre} · {factura.numero}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {paso===1 && (<>
          <div style={{display:"flex", alignItems:"center", gap:"0.75rem", background:palette.beige, borderRadius:"10px", padding:"0.75rem 1rem", marginBottom:"1rem"}}>
            <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",fontWeight:"700",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{factura.estudiante_nombre.charAt(0)}</div>
            <div><p style={{fontSize:"0.88rem",fontWeight:"700",color:palette.navy,margin:0}}>{factura.estudiante_nombre}</p><p style={{fontSize:"0.72rem",color:palette.muted,margin:"2px 0 0"}}>C.C. {factura.estudiante_cc} · {factura.credito_codigo}</p></div>
          </div>
          {factura.comprobante_ruta && (
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:"0.6rem", background:palette.gold+"12", border:`1px solid ${palette.gold}40`, borderRadius:"9px", padding:"0.6rem 0.85rem", marginBottom:"1rem"}}>
              <p style={{fontSize:"0.78rem", color:palette.text, margin:0}}>El estudiante ya reportó este pago con comprobante.</p>
              <button style={{padding:"0.35rem 0.7rem", background:palette.card, border:`1px solid ${palette.border}`, borderRadius:"7px", fontSize:"0.72rem", fontWeight:"600", color:palette.navy, cursor:"pointer", whiteSpace:"nowrap"}} onClick={() => window.open(facturasService.urlComprobante(factura.id), "_blank")}>↓ Ver</button>
            </div>
          )}
          <div style={styles.resumenPago}>
            <div style={styles.resumenRow}><span style={styles.resumenLabel}>Factura</span><span style={styles.resumenVal}>{factura.numero}</span></div>
            <div style={styles.resumenRow}><span style={styles.resumenLabel}>Concepto</span><span style={styles.resumenVal}>{factura.concepto}</span></div>
            <div style={styles.resumenRow}><span style={styles.resumenLabel}>Vencimiento</span><span style={{...styles.resumenVal, color:factura.estado==="Vencida"?palette.red:palette.text}}>{fmtDate(factura.fecha_vencimiento)}</span></div>
            <div style={{...styles.resumenRow, borderTop:`1.5px solid ${palette.border}`, paddingTop:"0.75rem", marginTop:"0.25rem"}}>
              <span style={{...styles.resumenLabel, fontWeight:"700", color:palette.navy}}>Total</span>
              <span style={{fontSize:"1.1rem", fontWeight:"700", color:palette.navy}}>{fmt(factura.monto)}</span>
            </div>
          </div>
          <p style={{fontSize:"0.82rem", fontWeight:"600", color:palette.text, marginBottom:"0.6rem"}}>Método de pago</p>
          <div style={styles.metodosGrid}>
            {metodos.map(m=>(
              <button key={m.id} style={{...styles.metodoBtn, borderColor:metodo===m.id?palette.navy:palette.border, background:metodo===m.id?palette.navy+"08":"transparent", color:metodo===m.id?palette.navy:palette.muted}} onClick={()=>setMetodo(m.id)}>
                <m.Icon size={19} />
                <span style={{fontSize:"0.78rem",fontWeight:"600"}}>{m.label}</span>
                {metodo===m.id && <span style={{fontSize:"0.65rem",color:palette.green,fontWeight:"700"}}>✓</span>}
              </button>
            ))}
          </div>
          <div style={{marginTop:"1rem", display:"flex", flexDirection:"column", gap:"5px"}}>
            <label style={{fontSize:"0.82rem", fontWeight:"600", color:palette.text}}>Referencia / comprobante *</label>
            <input style={{padding:"0.7rem 0.9rem", border:`1.5px solid ${error?palette.red:palette.border}`, borderRadius:"9px", fontSize:"0.88rem", color:palette.text, background:palette.beige, fontFamily:"'Inter',sans-serif"}}
              placeholder="Ej: EFC-20240615, TRF-12345..." value={ref} onChange={e=>{setRef(e.target.value);setError("");}}/>
            {error && <span style={{fontSize:"0.75rem",color:palette.red}}>{error}</span>}
          </div>
          {loading ? <div style={{textAlign:"center",padding:"1rem 0"}}><div style={styles.spinner}/></div>
          : <div style={{display:"flex", gap:"0.75rem", marginTop:"1.25rem"}}>
              <button style={{...styles.btnPrimary, background:`linear-gradient(135deg,${palette.green},#16a085)`}} onClick={handleConfirmar}>✓ Registrar pago</button>
              <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            </div>}
        </>)}
        {paso===2 && (
          <div style={{textAlign:"center", padding:"0.5rem 0 0.75rem"}}>
            <div style={{...styles.successIcon, background:palette.green+"18", color:palette.green}}>✓</div>
            <p style={{color:palette.text, fontSize:"0.88rem", marginBottom:"0.25rem", fontWeight:"600"}}>Pago registrado correctamente</p>
            <p style={{color:palette.muted, fontSize:"0.78rem", marginBottom:"1.5rem"}}>Ref: <strong>{ref}</strong> · vía {metodo}</p>
            <button style={styles.btnPrimary} onClick={()=>{onPagado();onClose();}}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ESTUDIANTE
// ══════════════════════════════════════════════════════════════════════════════
function FacturacionEstudiante() {
  const [creditos, setCreditos]     = useState([]);
  const [creditoSel, setCreditoSel] = useState(null);
  const [facturas, setFacturas]     = useState([]);
  const [resumen, setResumen]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState("todas");
  const [modalPago, setModalPago]   = useState(null);
  const [modalDetalle, setModalDetalle] = useState(null);

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

  const cargarFacturas = async () => {
    if (!creditoSel) return;
    setLoading(true);
    try {
      const data = await facturasService.getMisFacturas(creditoSel);
      setFacturas(data.facturas || []);
      setResumen(data.resumen || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargarFacturas(); }, [creditoSel]);

  const handlePagado = () => { cargarFacturas(); };

  if (loading && creditos.length === 0) return <Spinner/>;

  if (creditos.length === 0) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.5rem", padding:"3rem", background:palette.card, borderRadius:"14px" }}>
        <div style={{color:palette.muted}}><IconInbox size={36} strokeWidth={1.5} /></div>
        <p style={{ color:palette.muted, fontSize:"0.9rem" }}>Aún no tienes ningún crédito activo. Crea una solicitud en <strong>Créditos</strong>.</p>
      </div>
    );
  }

  const creditoActual     = creditos.find(c=>c.id===creditoSel);
  const facturasFiltradas = facturas.filter(f=> filtro==="todas"||f.estado.toLowerCase()===filtro);
  const cantPagadas       = resumen?.cant_pagadas    || 0;
  const cantVencidas      = resumen?.cant_vencidas   || 0;
  const totalPagado       = resumen?.total_pagado    || 0;
  const totalPendiente    = resumen?.total_pendiente || 0;
  const progreso          = facturas.length>0 ? (cantPagadas/facturas.length)*100 : 0;

  return (
    <div style={{animation:"fadeIn 0.35s ease"}}>
      {cantVencidas>0 && (
        <div style={{background:palette.red+"12", border:`1px solid ${palette.red}30`, borderRadius:"12px", padding:"0.75rem 1.1rem", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:"0.75rem"}}>
          <IconAlertTriangle size={20} style={{color:palette.red,flexShrink:0}} />
          <div>
            <p style={{fontSize:"0.85rem", fontWeight:"700", color:palette.red, margin:0}}>Tienes {cantVencidas} cuota{cantVencidas>1?"s":""} vencida{cantVencidas>1?"s":""}</p>
            <p style={{fontSize:"0.75rem", color:palette.red, margin:"2px 0 0", opacity:0.8}}>Regulariza tu estado para evitar recargos por mora.</p>
          </div>
        </div>
      )}
      <div style={styles.secHeader}>
        <div><h2 style={styles.secTitle}>Facturación</h2><p style={styles.secSub}>Historial y pago de cuotas</p></div>
        <select style={styles.creditoSelect} value={creditoSel||""} onChange={e=>setCreditoSel(Number(e.target.value))}>
          {creditos.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.tipo}</option>)}
        </select>
      </div>
      <div style={styles.statsGrid}>
        {[
          {label:"Monto crédito", val:fmt(creditoActual?.monto), color:palette.navy,  Icon:IconDollar},
          {label:"Total pagado",  val:fmt(totalPagado),          color:palette.green, Icon:IconCheckCircle},
          {label:"Por pagar",     val:fmt(totalPendiente),       color:palette.orange,Icon:IconClock},
          {label:"Cuotas",        val:`${cantPagadas}/${facturas.length}`, color:palette.gold, Icon:IconReceipt},
          {label:"Vencidas",      val:cantVencidas, color:cantVencidas>0?palette.red:palette.muted, Icon:IconAlertTriangle},
        ].map(s=>(
          <div key={s.label} style={{...styles.statCard, borderTop:`3px solid ${s.color}`}}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{...styles.statVal,color:s.color}}>{s.val}</p></div>
          </div>
        ))}
      </div>
      <div style={styles.card}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:"0.6rem"}}>
          <span style={{fontSize:"0.85rem", fontWeight:"600", color:palette.navy}}>Progreso de pago</span>
          <span style={{fontSize:"0.85rem", fontWeight:"700", color:palette.navy}}>{Math.round(progreso)}%</span>
        </div>
        <div style={styles.progressTrack}><div style={{...styles.progressFill, width:`${progreso}%`}}/></div>
      </div>
      <div style={styles.card}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem", flexWrap:"wrap", gap:"0.5rem"}}>
          <h3 style={{fontSize:"0.95rem", fontWeight:"700", color:palette.navy, margin:0}}>Facturas</h3>
          <div style={styles.filtroGroup}>
            {[["todas","Todas"],["pagada","✓ Pagadas"],["pendiente","Pendientes"],["vencida","✕ Vencidas"]].map(([k,l])=>(
              <button key={k} style={{...styles.filtroBtn, background:filtro===k?palette.navy:"transparent", color:filtro===k?"#fff":palette.muted}} onClick={()=>setFiltro(k)}>{l}</button>
            ))}
          </div>
        </div>
        <div style={styles.facturasList}>
          {loading ? <Spinner/> : facturasFiltradas.length===0
            ? <div style={styles.emptyState}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{color:palette.muted,fontSize:"0.85rem"}}>Sin facturas en esta categoría.</p></div>
            : facturasFiltradas.map((f,i)=>(
              <div key={f.id} style={{...styles.facturaCard, borderLeft:`4px solid ${getEstadoColor(f.estado)==="green"?palette.green:getEstadoColor(f.estado)==="red"?palette.red:palette.orange}`, animation:`fadeUp 0.3s ease ${i*0.06}s both`}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex", alignItems:"center", gap:"0.6rem", marginBottom:"0.25rem"}}>
                    <span style={styles.facturaNum}>{f.numero}</span>
                    <EstadoBadge estado={f.estado} color={getEstadoColor(f.estado)}/>
                  </div>
                  <p style={styles.facturaConcepto}>{f.concepto}</p>
                  <p style={styles.facturaMeta}>Emitida {fmtDate(f.fecha_emision)} · Vence {fmtDate(f.fecha_vencimiento)}{f.metodo_pago&&` · ${f.metodo_pago}`}</p>
                </div>
                <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.5rem", flexShrink:0}}>
                  <span style={styles.facturaMonto}>{fmt(f.monto)}</span>
                  <div style={{display:"flex", gap:"0.4rem"}}>
                    <button style={styles.btnVer} onClick={()=>setModalDetalle(f)}>Ver</button>
                    {(f.estado==="Pendiente"||f.estado==="Vencida") && (
                      <button style={{...styles.btnPagarInline, background:f.estado==="Vencida"?palette.red:`linear-gradient(135deg,${palette.navy},#2a5080)`}} onClick={()=>setModalPago(f)}>
                        {f.estado==="Vencida"?<><IconZap size={13}/> Pagar ahora</>:"Pagar"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
      {modalPago    && <ModalPagoEstudiante factura={modalPago}    onClose={()=>setModalPago(null)}    onPagado={handlePagado}/>}
      {modalDetalle && <ModalDetalle        factura={modalDetalle} onClose={()=>setModalDetalle(null)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADMIN
// ══════════════════════════════════════════════════════════════════════════════
// ─── Modal admin: generar cuotas (facturas) de un crédito ─────────────────────
function ModalGenerarCuotas({ onClose, onGenerado }) {
  const [creditos, setCreditos]   = useState([]);
  const [creditoId, setCreditoId] = useState("");
  const [loadingLista, setLoadingLista] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await creditosService.getTodos();
        // Solo créditos con monto/cuotas ya asignados (paso previo: completar datos financieros)
        setCreditos((data.creditos || []).filter(c => c.monto && c.cuotas));
      } catch (err) { console.error(err); }
      finally { setLoadingLista(false); }
    })();
  }, []);

  const handleGenerar = async () => {
    if (!creditoId) { setError("Selecciona un crédito."); return; }
    setError(""); setLoading(true);
    try {
      await facturasService.generarCuotas(creditoId);
      onGenerado();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron generar las cuotas.");
    } finally { setLoading(false); }
  };

  const creditoSel = creditos.find(c => String(c.id) === String(creditoId));

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"460px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Generar cuotas</h3><p style={styles.modalSub}>Crea las facturas mensuales de un crédito ya aprobado</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {loadingLista ? <Spinner/> : creditos.length === 0 ? (
          <p style={{fontSize:"0.85rem",color:palette.muted}}>No hay créditos con monto y cuotas asignados todavía. Primero completa los datos financieros del crédito en la sección Créditos.</p>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              <label style={styles.label}>Crédito *</label>
              <select style={styles.input} value={creditoId} onChange={e=>setCreditoId(e.target.value)}>
                <option value="">Selecciona un crédito...</option>
                {creditos.map(c => <option key={c.id} value={c.id}>{c.codigo} — {c.estudiante_nombre || c.deudor_nombre} — {fmt(c.monto)}</option>)}
              </select>
            </div>
            {creditoSel && (
              <div style={{background:palette.beige,borderRadius:"9px",padding:"0.75rem 0.9rem",fontSize:"0.8rem",color:palette.text}}>
                Se generarán <strong>{creditoSel.cuotas} cuotas</strong> de <strong>{fmt(Math.round(creditoSel.monto/creditoSel.cuotas))}</strong> cada una.
              </div>
            )}
          </div>
        )}
        {error && <p style={{fontSize:"0.78rem",color:palette.red,margin:"0.75rem 0 0"}}>{error}</p>}
        <div style={{display:"flex",gap:"0.75rem",marginTop:"1.25rem"}}>
          {loading ? <div style={{padding:"0.7rem"}}><div style={styles.spinner}/></div>
          : <><button style={styles.btnPrimary} onClick={handleGenerar} disabled={creditos.length===0}>Generar cuotas</button>
            <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button></>}
        </div>
      </div>
    </div>
  );
}

// ─── Modal admin: todas las facturas de un mismo estudiante/crédito ──────────
function ModalFacturasEstudiante({ grupo, onClose, setModalDetalle, setModalPago }) {
  const primero = grupo.facturas[0];
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "640px", maxHeight: "85vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {primero.estudiante_nombre.charAt(0)}
            </div>
            <div>
              <h3 style={styles.modalTitle}>{primero.estudiante_nombre}</h3>
              <p style={styles.modalSub}>C.C. {primero.estudiante_cc} · {primero.credito_codigo} · {primero.credito_tipo}</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginTop: "0.5rem" }}>
          {grupo.facturas.map(f => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: palette.beige, borderRadius: "10px", padding: "0.75rem 0.9rem", borderLeft: `4px solid ${getEstadoColor(f.estado) === "green" ? palette.green : getEstadoColor(f.estado) === "red" ? palette.red : palette.orange}`, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "160px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={styles.facturaNum}>{f.numero}</span>
                  <EstadoBadge estado={f.estado} color={getEstadoColor(f.estado)} />
                </div>
                <p style={styles.facturaMeta}>{f.concepto} · Vence {fmtDate(f.fecha_vencimiento)}</p>
                {f.referencia_pago && <p style={{ fontSize: "0.7rem", color: palette.muted, margin: "3px 0 0" }}>Ref: {f.referencia_pago} · {f.metodo_pago}</p>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem", flexShrink: 0 }}>
                <span style={{ ...styles.facturaMonto, fontSize: "0.95rem" }}>{fmt(f.monto)}</span>
                <div style={{ display: "flex", gap: "0.4rem" }}>
                  <button style={styles.btnVer} onClick={() => setModalDetalle(f)}>Ver</button>
                  {(f.estado === "Pendiente" || f.estado === "Vencida") && (
                    <button style={{ ...styles.btnPagarInline, background: f.estado === "Vencida" ? `linear-gradient(135deg,${palette.red},#a93226)` : `linear-gradient(135deg,${palette.green},#16a085)` }} onClick={() => setModalPago(f)}>
                      {f.estado === "Vencida" ? <><IconZap size={13} /> Registrar</> : "✓ Registrar pago"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FacturacionAdmin() {
  const [facturas, setFacturas]         = useState([]);
  const [totales, setTotales]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [busqueda, setBusqueda]         = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [fechas, setFechas]             = useState({ desde:"", hasta:"" });
  const [semestre, setSemestre]         = useState("");
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalPago, setModalPago]       = useState(null);
  const [modalCuotas, setModalCuotas]   = useState(false);
  const [modalEstudianteKey, setModalEstudianteKey] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await facturasService.getTodas({
        estado: filtroEstado === "todos" ? "" : filtroEstado,
        buscar: busqueda,
        desde:  fechas.desde,
        hasta:  fechas.hasta,
        semestre,
      });
      setFacturas(data.facturas || []);
      setTotales(data.totales || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroEstado, fechas, semestre]);

  const handleBuscar = (e) => { e.preventDefault(); cargar(); };
  const handlePagado = () => { cargar(); };

  // Agrupa las facturas por estudiante + crédito — evita que un solo
  // estudiante con 12 cuotas ocupe 12 filas en la lista principal.
  const grupos = [];
  const indicePorClave = {};
  for (const f of facturas) {
    const clave = `${f.estudiante_cc}-${f.credito_codigo}`;
    if (indicePorClave[clave] === undefined) {
      indicePorClave[clave] = grupos.length;
      grupos.push({ key: clave, facturas: [] });
    }
    grupos[indicePorClave[clave]].facturas.push(f);
  }
  const grupoActivo = grupos.find(g => g.key === modalEstudianteKey) || null;

  const totalVencidas   = totales?.vencidas         || 0;
  const totalPendientes = totales?.pendientes       || 0;
  const totalPagadas    = totales?.pagadas          || 0;
  const totalEnRevision = totales?.en_revision      || 0;
  const montoPendiente  = totales?.monto_por_cobrar || 0;
  const totalFacturas   = totales?.total            || 0;

  return (
    <div style={{animation:"fadeIn 0.35s ease"}}>
      {(totalVencidas>0||totalPendientes>0) && (
        <div style={{background:palette.orange+"10", border:`1px solid ${palette.orange}25`, borderRadius:"12px", padding:"0.75rem 1.1rem", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:"0.75rem"}}>
          <IconAlertTriangle size={18} style={{color:palette.orange,flexShrink:0}} />
          <p style={{fontSize:"0.82rem", color:palette.orange, fontWeight:"600", margin:0}}>
            {totalVencidas>0&&`${totalVencidas} factura${totalVencidas>1?"s":""} vencida${totalVencidas>1?"s":""}`}
            {totalVencidas>0&&totalPendientes>0&&" · "}
            {totalPendientes>0&&`${totalPendientes} pendiente${totalPendientes>1?"s":""} de pago`}
          </p>
        </div>
      )}

      <div style={styles.secHeader}>
        <div><h2 style={styles.secTitle}>Gestión de facturación</h2><p style={styles.secSub}>Control de pagos de todos los estudiantes</p></div>
        <button style={styles.btnPrimary} onClick={()=>setModalCuotas(true)}>+ Generar cuotas</button>
      </div>

      <div style={styles.statsGrid}>
        {[
          {label:"Por revisar",      val:totalEnRevision,  color:palette.gold,   Icon:IconClock},
          {label:"Pagadas",         val:totalPagadas,     color:palette.green,  Icon:IconCheckCircle},
          {label:"Pendientes",      val:totalPendientes,  color:palette.orange, Icon:IconClock},
          {label:"Vencidas",        val:totalVencidas,    color:palette.red,    Icon:IconAlertTriangle},
          {label:"Por cobrar",      val:fmt(montoPendiente), color:palette.navy, Icon:IconDollar},
          {label:"Total facturas",  val:totalFacturas,    color:palette.gold,   Icon:IconReceipt},
        ].map(s=>(
          <div key={s.label} style={{...styles.statCard, borderTop:`3px solid ${s.color}`}}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{...styles.statVal,color:s.color}}>{s.val}</p></div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={{display:"flex", flexWrap:"wrap", gap:"0.6rem", marginBottom:"1rem", alignItems:"center"}}>
          <form onSubmit={handleBuscar} style={{display:"flex", flex:1, minWidth:"200px", gap:"0.5rem"}}>
            <div style={{display:"flex", alignItems:"center", gap:"0.5rem", background:palette.beige, borderRadius:"9px", padding:"0.45rem 0.9rem", flex:1, border:`1px solid ${palette.border}`}}>
              <IconSearch size={16} style={{color:palette.muted,flexShrink:0}} />
              <input style={{border:"none", background:"transparent", flex:1, fontSize:"0.82rem", color:palette.text, fontFamily:"'Inter',sans-serif"}}
                placeholder="Buscar por estudiante, cédula, crédito o factura..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
              {busqueda && <button type="button" style={{background:"none",border:"none",color:palette.muted,cursor:"pointer",fontSize:"0.75rem"}} onClick={()=>{setBusqueda("");cargar();}}>✕</button>}
            </div>
            <button type="submit" style={{...styles.btnPrimary,padding:"0.45rem 0.9rem",fontSize:"0.8rem"}}>Buscar</button>
          </form>
          <div style={{display:"flex", gap:"4px", flexWrap:"wrap"}}>
            {[["todos","Todos"],["En revisión","⏳ Por revisar"],["Pagada","✓ Pagadas"],["Pendiente","Pendientes"],["Vencida","✕ Vencidas"]].map(([k,l])=>(
              <button key={k} style={{...styles.filtroBtn, background:filtroEstado===k?palette.navy:"transparent", color:filtroEstado===k?"#fff":palette.muted}} onClick={()=>setFiltroEstado(k)}>{l}</button>
            ))}
          </div>
          <DateFilter value={fechas} onChange={setFechas} />
          <select style={{padding:"0.35rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.78rem",color:palette.text,background:palette.card,cursor:"pointer",fontFamily:"'Inter',sans-serif"}} value={semestre} onChange={e=>setSemestre(e.target.value)}>
            <option value="">Todos los semestres</option>
            {Array.from({length:10},(_,i)=>i+1).map(s=><option key={s} value={s}>Semestre {s}</option>)}
          </select>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:"0.65rem"}}>
          {loading ? <Spinner/> : grupos.length===0
            ? <div style={styles.emptyState}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{color:palette.muted,fontSize:"0.85rem"}}>Sin resultados.</p></div>
            : grupos.map((grupo,i)=>{
              const primero = grupo.facturas[0];
              const pagadas   = grupo.facturas.filter(f=>f.estado==="Pagada").length;
              const pendientes= grupo.facturas.filter(f=>f.estado==="Pendiente").length;
              const vencidas  = grupo.facturas.filter(f=>f.estado==="Vencida").length;
              const totalDeuda = grupo.facturas.filter(f=>f.estado!=="Pagada").reduce((s,f)=>s+Number(f.monto),0);
              const bordeColor = vencidas>0?palette.red:pendientes>0?palette.orange:palette.green;
              return (
              <div key={grupo.key} onClick={()=>setModalEstudianteKey(grupo.key)} style={{display:"flex", alignItems:"center", gap:"0.9rem", background:palette.beige, borderRadius:"11px", padding:"0.9rem 1.1rem", borderLeft:`4px solid ${bordeColor}`, flexWrap:"wrap", cursor:"pointer", animation:`fadeUp 0.3s ease ${i*0.05}s both`}}>
                <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",fontWeight:"700",fontSize:"0.85rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  {primero.estudiante_nombre.charAt(0)}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex", alignItems:"center", gap:"0.5rem", flexWrap:"wrap", marginBottom:"2px"}}>
                    <span style={{fontSize:"0.85rem", fontWeight:"700", color:palette.text}}>{primero.estudiante_nombre}</span>
                    {vencidas>0 && <span style={{fontSize:"0.68rem",fontWeight:"700",color:palette.red,background:palette.red+"18",padding:"0.12rem 0.5rem",borderRadius:"99px"}}>{vencidas} vencida{vencidas>1?"s":""}</span>}
                    {pendientes>0 && <span style={{fontSize:"0.68rem",fontWeight:"700",color:palette.orange,background:palette.orange+"18",padding:"0.12rem 0.5rem",borderRadius:"99px"}}>{pendientes} pendiente{pendientes>1?"s":""}</span>}
                    {pagadas>0 && <span style={{fontSize:"0.68rem",fontWeight:"700",color:palette.green,background:palette.green+"18",padding:"0.12rem 0.5rem",borderRadius:"99px"}}>{pagadas} pagada{pagadas>1?"s":""}</span>}
                  </div>
                  <p style={{fontSize:"0.72rem", color:palette.muted, margin:0}}>C.C. {primero.estudiante_cc} · {primero.credito_codigo} · {grupo.facturas.length} factura{grupo.facturas.length!==1?"s":""}</p>
                </div>
                <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:"0.3rem", flexShrink:0}}>
                  {totalDeuda>0 && <span style={{...styles.facturaMonto, fontSize:"0.9rem"}}>{fmt(totalDeuda)} por cobrar</span>}
                  <button style={{padding:"0.4rem 0.9rem",background:palette.navy,border:"none",borderRadius:"7px",fontSize:"0.78rem",fontWeight:"600",color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
                    Ver facturas →
                  </button>
                </div>
              </div>
            );})
          }
        </div>

        {!loading && grupos.length > 0 && (
          <p style={{ fontSize: "0.72rem", color: palette.muted, textAlign: "right", marginTop: "0.75rem" }}>
            {grupos.length} estudiante{grupos.length !== 1 ? "s" : ""} · {facturas.length} factura{facturas.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {grupoActivo && !modalDetalle && !modalPago && (
        <ModalFacturasEstudiante grupo={grupoActivo} onClose={() => setModalEstudianteKey(null)} setModalDetalle={setModalDetalle} setModalPago={setModalPago} />
      )}
      {modalDetalle && <ModalDetalle        factura={modalDetalle} onClose={()=>setModalDetalle(null)} setModalPago={setModalPago}/>}
      {modalPago    && <ModalRegistrarPago  factura={modalPago}    onClose={()=>setModalPago(null)} onPagado={handlePagado}/>}
      {modalCuotas  && <ModalGenerarCuotas  onClose={()=>setModalCuotas(false)} onGenerado={handlePagado}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Facturacion() {
  const { isAdmin } = useAuth();
  return (
    <Layout>
      {isAdmin ? <FacturacionAdmin/> : <FacturacionEstudiante/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        select,input { font-family:'Inter',sans-serif; }
        select:focus,input:focus { outline:none; border-color:#1e3a5f !important; box-shadow:0 0 0 3px rgba(30,58,95,0.1); }
      `}</style>
    </Layout>
  );
}

const styles = {
  secHeader:   {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"},
  secTitle:    {fontSize:"1.25rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"},
  secSub:      {fontSize:"0.82rem",color:palette.muted,margin:0},
  creditoSelect:{padding:"0.55rem 0.9rem",border:`1.5px solid ${palette.border}`,borderRadius:"9px",fontSize:"0.84rem",color:palette.text,background:palette.card,fontFamily:"'Inter',sans-serif"},
  statsGrid:   {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"0.85rem",marginBottom:"1.25rem"},
  statCard:    {background:palette.card,borderRadius:"12px",padding:"0.9rem 1rem",display:"flex",alignItems:"center",gap:"0.75rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"},
  statLabel:   {fontSize:"0.7rem",color:palette.muted,margin:"0 0 2px"},
  statVal:     {fontSize:"1rem",fontWeight:"700",margin:0},
  card:        {background:palette.card,borderRadius:"14px",padding:"1.25rem 1.5rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",marginBottom:"1.25rem"},
  progressTrack:{height:"10px",background:palette.beigeAlt,borderRadius:"99px",overflow:"hidden"},
  progressFill: {height:"100%",borderRadius:"99px",background:`linear-gradient(90deg,${palette.green},#16a085)`,transition:"width 1s cubic-bezier(.4,0,.2,1)"},
  filtroGroup: {display:"flex",gap:"4px",flexWrap:"wrap"},
  filtroBtn:   {padding:"0.3rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.75rem",fontWeight:"500",cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"},
  facturasList:{display:"flex",flexDirection:"column",gap:"0.7rem"},
  facturaCard: {display:"flex",alignItems:"center",gap:"1rem",background:palette.beige,borderRadius:"11px",padding:"0.9rem 1.1rem"},
  facturaNum:  {fontSize:"0.78rem",fontWeight:"700",color:palette.navy,letterSpacing:"0.02em"},
  facturaConcepto:{fontSize:"0.82rem",color:palette.text,fontWeight:"500",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  facturaMeta: {fontSize:"0.72rem",color:palette.muted,margin:"3px 0 0"},
  facturaMonto:{fontSize:"0.95rem",fontWeight:"700",color:palette.navy},
  badge:       {display:"inline-flex",alignItems:"center",gap:"3px",padding:"0.22rem 0.7rem",borderRadius:"99px",fontSize:"0.72rem",fontWeight:"600",whiteSpace:"nowrap"},
  emptyState:  {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem",padding:"2rem"},
  btnVer:      {padding:"0.28rem 0.65rem",background:palette.navy+"10",border:"none",borderRadius:"6px",fontSize:"0.72rem",fontWeight:"600",color:palette.navy,cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  btnPagarInline:{padding:"0.28rem 0.75rem",border:"none",borderRadius:"6px",fontSize:"0.72rem",fontWeight:"600",color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem"},
  modal:       {background:palette.card,borderRadius:"18px",padding:"2rem",width:"100%",maxWidth:"460px",boxShadow:"0 25px 60px rgba(0,0,0,0.3)",animation:"fadeIn 0.25s ease",maxHeight:"90vh",overflowY:"auto"},
  modalHeader: {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"},
  modalTitle:  {fontSize:"1.1rem",fontWeight:"700",color:palette.navy,margin:0},
  modalSub:    {fontSize:"0.8rem",color:palette.muted,margin:"3px 0 0"},
  closeBtn:    {background:palette.beige,border:"none",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"0.85rem",color:palette.muted,fontFamily:"'Inter',sans-serif"},
  resumenPago: {background:palette.beige,borderRadius:"12px",padding:"1rem 1.1rem",marginBottom:"1.25rem"},
  resumenRow:  {display:"flex",justifyContent:"space-between",alignItems:"flex-start",padding:"0.3rem 0"},
  resumenLabel:{fontSize:"0.78rem",color:palette.muted},
  resumenVal:  {fontSize:"0.82rem",color:palette.text,fontWeight:"500",textAlign:"right",maxWidth:"60%"},
  metodosGrid: {display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.6rem"},
  metodoBtn:   {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.3rem",padding:"0.75rem 0.5rem",border:"1.5px solid",borderRadius:"10px",cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"},
  confirmBox:  {background:palette.beige,borderRadius:"12px",padding:"1.5rem",textAlign:"center",marginBottom:"0.5rem"},
  spinner:     {width:"36px",height:"36px",margin:"0 auto",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  successIcon: {width:"56px",height:"56px",borderRadius:"50%",background:palette.green+"18",color:palette.green,fontSize:"1.5rem",fontWeight:"700",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"},
  detalleGrid: {display:"flex",flexDirection:"column",gap:0},
  detalleRow:  {display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.55rem 0",borderBottom:`1px solid ${palette.border}`},
  detalleLabel:{fontSize:"0.78rem",color:palette.muted},
  detalleVal:  {fontSize:"0.82rem",color:palette.text,fontWeight:"500",textAlign:"right"},
  btnPrimary:  {padding:"0.7rem 1.25rem",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",border:"none",borderRadius:"10px",fontSize:"0.88rem",fontWeight:"600",cursor:"pointer",fontFamily:"'Inter',sans-serif",boxShadow:`0 4px 12px rgba(30,58,95,0.25)`},
  btnSecondary:{padding:"0.7rem 1.25rem",background:"none",border:`1.5px solid ${palette.border}`,borderRadius:"10px",color:palette.muted,fontSize:"0.88rem",cursor:"pointer",fontFamily:"'Inter',sans-serif"},
};