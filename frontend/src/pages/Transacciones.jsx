import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import transaccionesService from "../services/transaccionesService";
import creditosService from "../services/creditosService";
import { IconCreditCard, IconCheckCircle, IconFileText, IconExchange, IconSearch, IconInbox, IconDollar, IconAlertTriangle } from "../components/Icons";
import DateFilter from "../components/DateFilter";

const palette = {
  navy:"#1e3a5f", orange:"#e8740e", gold:"#c89b14", beige:"#f3ede1",
  beigeAlt:"#ede6d8", text:"#2c3e50", muted:"#6b7a8d", green:"#1d9e75",
  red:"#c0392b", card:"#ffffff", border:"rgba(30,58,95,0.1)",
};

const fmt = (n) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(n||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-CO",{year:"numeric",month:"short",day:"numeric"}) : "—";
const fmtDateTime = (d) => d ? new Date(d).toLocaleString("es-CO",{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

const TIPOS_TX = {
  desembolso: { label:"Desembolso",  icon:"↓", color:"#1d9e75" },
  pago:       { label:"Pago cuota",  icon:"↑", color:"#1e3a5f" },
  interes:    { label:"Interés",     icon:"↗", color:"#c89b14" },
  mora:       { label:"Mora",        icon:"⚠", color:"#c0392b" },
  ajuste:     { label:"Ajuste",      icon:"⇄", color:"#6b7a8d" },
};

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"3rem"}}><div style={{width:"36px",height:"36px",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
}

// ─── Componentes compartidos ───────────────────────────────────────────────────
function TipoBadge({ tipo }) {
  const t = TIPOS_TX[tipo]||TIPOS_TX.ajuste;
  return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"0.22rem 0.65rem",borderRadius:"99px",fontSize:"0.7rem",fontWeight:"700",background:t.color+"15",color:t.color,whiteSpace:"nowrap"}}>{t.icon} {t.label}</span>;
}

function CanalBadge({ canal }) {
  const map = {PSE:{bg:"#1565c015",color:"#1565c0"},Transferencia:{bg:"#7b1fa215",color:"#7b1fa2"},Efectivo:{bg:"#2e7d3215",color:"#2e7d32"},Sistema:{bg:"#6b7a8d15",color:"#6b7a8d"}};
  const c = map[canal]||map.Sistema;
  return <span style={{display:"inline-flex",padding:"0.18rem 0.55rem",borderRadius:"6px",fontSize:"0.68rem",fontWeight:"600",background:c.bg,color:c.color}}>{canal}</span>;
}

function ModalDetalle({ tx, onClose, esAdmin }) {
  const t = TIPOS_TX[tx.tipo]||TIPOS_TX.ajuste;
  const esCargo = tx.tipo==="interes"||tx.tipo==="mora";
  const esDesembolso = tx.tipo==="desembolso";
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"440px"}} onClick={e=>e.stopPropagation()}>
        <div style={{textAlign:"center",marginBottom:"1.25rem"}}>
          <div style={{width:"52px",height:"52px",borderRadius:"50%",background:t.color+"18",color:t.color,fontSize:"1.3rem",fontWeight:"700",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 0.75rem"}}>{t.icon}</div>
          <h3 style={{fontSize:"1rem",fontWeight:"700",color:palette.navy,margin:"0 0 3px"}}>{t.label}</h3>
          <p style={{fontSize:"0.78rem",color:palette.muted,margin:0}}>{fmtDateTime(tx.fecha)}</p>
        </div>
        <div style={{textAlign:"center",background:palette.beige,borderRadius:"12px",padding:"1rem",marginBottom:"1.25rem"}}>
          <p style={{fontSize:"0.72rem",color:palette.muted,margin:"0 0 4px"}}>{esCargo?"Cargo aplicado":esDesembolso?"Monto desembolsado":"Monto pagado"}</p>
          <p style={{fontSize:"1.5rem",fontWeight:"700",margin:0,color:esCargo?palette.red:esDesembolso?palette.green:palette.navy}}>
            {esCargo?"+ ":esDesembolso?"":"− "}{fmt(tx.monto)}
          </p>
        </div>
        <div style={{display:"flex",flexDirection:"column"}}>
          {[
            {label:"Descripción",   val:tx.descripcion},
            ...(esAdmin&&tx.estudiante?[{label:"Estudiante",val:tx.estudiante_nombre},{label:"Crédito",val:tx.credito_codigo},{label:"Tipo",val:tx.credito_tipo}]:[]),
            {label:"Referencia",    val:tx.referencia},
            {label:"Canal",         val:<CanalBadge key="c" canal={tx.canal}/>},
            {label:"Saldo después", val:<span key="s" style={{fontWeight:"700",color:palette.navy}}>{fmt(tx.saldo_despues)}</span>},
          ].map(r=>(
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.55rem 0",borderBottom:`1px solid rgba(30,58,95,0.08)`}}>
              <span style={{fontSize:"0.78rem",color:palette.muted}}>{r.label}</span>
              <span style={{fontSize:"0.82rem",color:palette.text,fontWeight:"500",textAlign:"right",maxWidth:"65%"}}>{r.val}</span>
            </div>
          ))}
        </div>
        <button style={{...styles.btnPrimary,width:"100%",marginTop:"1.25rem"}} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

function SaldoChart({ transacciones }) {
  if (!transacciones.length) return null;
  const sorted = [...transacciones].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha));
  const puntos = [{fecha:sorted[0].fecha,saldo:0},...sorted.map(t=>({fecha:t.fecha,saldo:t.saldo_despues}))];
  const maxSaldo=Math.max(...puntos.map(p=>p.saldo));
  const minSaldo=Math.min(...puntos.map(p=>p.saldo));
  const rango=maxSaldo-minSaldo||1;
  const W=600,H=100,PAD=10;
  const x=(i)=>PAD+(i/(puntos.length-1))*(W-PAD*2);
  const y=(s)=>PAD+(1-(s-minSaldo)/rango)*(H-PAD*2);
  const linea=puntos.map((p,i)=>`${i===0?"M":"L"}${x(i)},${y(p.saldo)}`).join(" ");
  const relleno=`${linea} L${x(puntos.length-1)},${H} L${x(0)},${H} Z`;
  return (
    <div style={{overflowX:"auto"}}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"80px"}} preserveAspectRatio="none">
        <defs><linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette.navy} stopOpacity="0.15"/><stop offset="100%" stopColor={palette.navy} stopOpacity="0.01"/></linearGradient></defs>
        <path d={relleno} fill="url(#saldoGrad)"/>
        <path d={linea} fill="none" stroke={palette.navy} strokeWidth="2" strokeLinejoin="round"/>
        {puntos.map((p,i)=><circle key={i} cx={x(i)} cy={y(p.saldo)} r="3.5" fill={palette.card} stroke={palette.navy} strokeWidth="2"/>)}
      </svg>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:"0.3rem"}}>
        <span style={{fontSize:"0.68rem",color:palette.muted}}>{fmtDate(puntos[0].fecha)}</span>
        <span style={{fontSize:"0.68rem",color:palette.muted}}>{fmtDate(puntos[puntos.length-1].fecha)}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ESTUDIANTE
// ══════════════════════════════════════════════════════════════════════════════
function TransaccionesEstudiante() {
  const [creditos, setCreditos]     = useState([]);
  const [creditoSel, setCreditoSel] = useState(null);
  const [txBase, setTxBase]         = useState([]);
  const [resumen, setResumen]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda]     = useState("");
  const [modalTx, setModalTx]       = useState(null);
  const [orden, setOrden]           = useState("desc");

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

  const cargar = async () => {
    if (!creditoSel) return;
    setLoading(true);
    try {
      const tipoParam = filtroTipo === "todos" ? null : filtroTipo;
      const data = await transaccionesService.getMisTransacciones(creditoSel, tipoParam, orden);
      setTxBase(data.transacciones || []);
      setResumen(data.resumen || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [creditoSel, filtroTipo, orden]);

  if (loading && creditos.length === 0) return <Spinner/>;

  if (creditos.length === 0) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"0.5rem", padding:"3rem", background:palette.card, borderRadius:"14px" }}>
        <div style={{color:palette.muted}}><IconInbox size={36} strokeWidth={1.5} /></div>
        <p style={{ color:palette.muted, fontSize:"0.9rem" }}>Aún no tienes ningún crédito activo. Crea una solicitud en <strong>Créditos</strong>.</p>
      </div>
    );
  }

  const creditoActual = creditos.find(c=>c.id===creditoSel);
  // La búsqueda por texto no la soporta el backend para este endpoint, se filtra en cliente
  const txFiltradas = txBase.filter(t=>busqueda===""||t.descripcion.toLowerCase().includes(busqueda.toLowerCase())||t.referencia.toLowerCase().includes(busqueda.toLowerCase()));

  const totalPagado    = resumen?.total_pagado        || 0;
  const totalIntereses = resumen?.total_mora_interes  || 0;
  const cantPagos      = resumen?.cant_pagos          || 0;
  const saldoActual    = txBase.length>0 ? txBase.reduce((latest,t)=> !latest || new Date(t.fecha)>new Date(latest.fecha) ? t : latest, null).saldo_despues : 0;

  return (
    <div style={{animation:"fadeIn 0.35s ease"}}>
      <div style={styles.secHeader}>
        <div><h2 style={styles.secTitle}>Transacciones</h2><p style={styles.secSub}>Historial completo de movimientos de tu crédito estudiantil</p></div>
        <select style={styles.creditoSelect} value={creditoSel||""} onChange={e=>setCreditoSel(Number(e.target.value))}>
          {creditos.map(c=><option key={c.id} value={c.id}>{c.codigo} — {c.tipo}</option>)}
        </select>
      </div>

      <div style={styles.statsGrid}>
        {[
          {label:"Saldo actual",     val:fmt(saldoActual),        color:palette.navy,  Icon:IconCreditCard},
          {label:"Total pagado",     val:fmt(totalPagado),         color:palette.green, Icon:IconCheckCircle},
          {label:"Monto crédito",    val:fmt(creditoActual?.monto), color:palette.gold,  Icon:IconFileText},
          {label:"Pagos realizados", val:cantPagos,                color:palette.navy,  Icon:IconExchange},
          {label:"Intereses / Mora", val:fmt(totalIntereses), color:totalIntereses>0?palette.red:palette.muted, Icon:IconAlertTriangle},
        ].map(s=>(
          <div key={s.label} style={{...styles.statCard,borderTop:`3px solid ${s.color}`}}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{...styles.statVal,color:s.color}}>{s.val}</p></div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <p style={{fontSize:"0.85rem",fontWeight:"600",color:palette.navy,margin:"0 0 0.75rem"}}>Evolución del saldo</p>
        <SaldoChart transacciones={txBase}/>
      </div>

      <div style={styles.card}>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem",marginBottom:"1rem",alignItems:"center"}}>
          <div style={styles.searchBox}>
            <IconSearch size={16} style={{color:palette.muted,flexShrink:0}} />
            <input style={styles.searchInput} placeholder="Buscar por descripción o referencia..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
            {busqueda&&<button style={styles.clearBtn} onClick={()=>setBusqueda("")}>✕</button>}
          </div>
          <div style={styles.filtroGroup}>
            {[["todos","Todos"],["pago","↑ Pagos"],["desembolso","↓ Desembolsos"],["interes","↗ Intereses"],["mora","⚠ Mora"]].map(([key,label])=>(
              <button key={key} style={{...styles.filtroBtn,background:filtroTipo===key?palette.navy:"transparent",color:filtroTipo===key?"#fff":palette.muted}} onClick={()=>setFiltroTipo(key)}>{label}</button>
            ))}
          </div>
          <button style={{...styles.filtroBtn,marginLeft:"auto",color:palette.navy}} onClick={()=>setOrden(o=>o==="desc"?"asc":"desc")}>
            {orden==="desc"?"↓ Más reciente":"↑ Más antiguo"}
          </button>
        </div>

        <div style={styles.txLista}>
          {loading ? <Spinner/> : txFiltradas.length===0
            ?<div style={styles.emptyState}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{color:palette.muted,fontSize:"0.85rem"}}>No hay transacciones que coincidan.</p></div>
            :txFiltradas.map((tx,i)=>{
              const t=TIPOS_TX[tx.tipo]||TIPOS_TX.ajuste;
              const esCargo=tx.tipo==="interes"||tx.tipo==="mora";
              const esDesembolso=tx.tipo==="desembolso";
              return (
                <div key={tx.id} style={{...styles.txCard,animation:`fadeUp 0.3s ease ${i*0.05}s both`}} onClick={()=>setModalTx(tx)}>
                  <div style={{width:"40px",height:"40px",borderRadius:"50%",background:t.color+"15",color:t.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",fontWeight:"700",flexShrink:0}}>{t.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"2px"}}><TipoBadge tipo={tx.tipo}/><CanalBadge canal={tx.canal}/></div>
                    <p style={styles.txDesc}>{tx.descripcion}</p>
                    <p style={styles.txMeta}>{fmtDateTime(tx.fecha)} · Ref: {tx.referencia}</p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontSize:"0.95rem",fontWeight:"700",margin:"0 0 2px",color:esCargo?palette.red:esDesembolso?palette.green:palette.navy}}>{esCargo?"+ ":esDesembolso?"":"− "}{fmt(tx.monto)}</p>
                    <p style={{fontSize:"0.7rem",color:palette.muted,margin:0}}>Saldo: {fmt(tx.saldo_despues)}</p>
                  </div>
                </div>
              );
            })
          }
        </div>
        {!loading && txFiltradas.length>0&&<p style={{fontSize:"0.72rem",color:palette.muted,textAlign:"right",marginTop:"0.75rem"}}>{txFiltradas.length} transacción{txFiltradas.length!==1?"es":""} · Haz clic para ver el detalle</p>}
      </div>

      {modalTx&&<ModalDetalle tx={modalTx} onClose={()=>setModalTx(null)} esAdmin={false}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADMIN
// ══════════════════════════════════════════════════════════════════════════════
// ─── Modal admin: todas las transacciones de un mismo estudiante/crédito ─────
function ModalTransaccionesEstudiante({ grupo, onClose, setModalTx }) {
  const primero = grupo.txs[0];
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          {grupo.txs.map(tx => {
            const t = TIPOS_TX[tx.tipo] || TIPOS_TX.ajuste;
            const esCargo = tx.tipo === "interes" || tx.tipo === "mora";
            const esDesembolso = tx.tipo === "desembolso";
            return (
              <div key={tx.id} style={{ ...styles.txCard, cursor: "pointer" }} onClick={() => setModalTx(tx)}>
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: t.color + "15", color: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem", fontWeight: "700", flexShrink: 0 }}>{t.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2px", flexWrap: "wrap" }}>
                    <TipoBadge tipo={tx.tipo} />
                    <CanalBadge canal={tx.canal} />
                  </div>
                  <p style={styles.txMeta}>{fmtDateTime(tx.fecha)} · Ref: {tx.referencia}</p>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <p style={{ fontSize: "0.88rem", fontWeight: "700", margin: "0 0 2px", color: esCargo ? palette.red : esDesembolso ? palette.green : palette.navy }}>{esCargo ? "+ " : esDesembolso ? "" : "− "}{fmt(tx.monto)}</p>
                  <p style={{ fontSize: "0.68rem", color: palette.muted, margin: 0 }}>Saldo: {fmt(tx.saldo_despues)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TransaccionesAdmin() {
  const [transacciones, setTransacciones] = useState([]);
  const [totales, setTotales]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [busqueda, setBusqueda]       = useState("");
  const [filtroTipo, setFiltroTipo]   = useState("todos");
  const [filtroCanal, setFiltroCanal] = useState("todos");
  const [fechas, setFechas]           = useState({ desde:"", hasta:"" });
  const [semestre, setSemestre]       = useState("");
  const [orden, setOrden]             = useState("desc");
  const [modalTx, setModalTx]         = useState(null);
  const [modalEstudianteKey, setModalEstudianteKey] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await transaccionesService.getTodas({
        tipo:  filtroTipo  === "todos" ? "" : filtroTipo,
        canal: filtroCanal === "todos" ? "" : filtroCanal,
        buscar: busqueda,
        desde: fechas.desde,
        hasta: fechas.hasta,
        semestre,
        orden,
      });
      setTransacciones(data.transacciones || []);
      setTotales(data.totales || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, [filtroTipo, filtroCanal, fechas, semestre, orden]);

  // Agrupa por estudiante + crédito — un crédito con muchos movimientos
  // (desembolso, pagos mensuales, intereses...) ya no ocupa una fila cada uno.
  const grupos = [];
  const indicePorClave = {};
  for (const tx of transacciones) {
    const clave = `${tx.estudiante_cc}-${tx.credito_codigo}`;
    if (indicePorClave[clave] === undefined) {
      indicePorClave[clave] = grupos.length;
      grupos.push({ key: clave, txs: [] });
    }
    grupos[indicePorClave[clave]].txs.push(tx);
  }
  const grupoActivo = grupos.find(g => g.key === modalEstudianteKey) || null;

  const handleBuscar = (e) => { e.preventDefault(); cargar(); };

  const totalDesembolsado = totales?.total_desembolsado  || 0;
  const totalRecaudado    = totales?.total_recaudado     || 0;
  const totalMora         = totales?.total_mora_interes  || 0;
  const cantTotal         = totales?.total               || 0;

  return (
    <div style={{animation:"fadeIn 0.35s ease"}}>
      <div style={styles.secHeader}>
        <div><h2 style={styles.secTitle}>Transacciones</h2><p style={styles.secSub}>Historial global de movimientos de todos los créditos de matrícula</p></div>
      </div>

      <div style={{...styles.statsGrid,gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))"}}>
        {[
          {label:"Total desembolsado",val:fmt(totalDesembolsado),color:palette.green,  Icon:IconDollar},
          {label:"Total recaudado",   val:fmt(totalRecaudado),   color:palette.navy,   Icon:IconCheckCircle},
          {label:"Intereses / Mora",  val:fmt(totalMora),        color:totalMora>0?palette.red:palette.muted, Icon:IconAlertTriangle},
          {label:"Total movimientos", val:cantTotal,             color:palette.navy,   Icon:IconExchange},
        ].map(s=>(
          <div key={s.label} style={{...styles.statCard,borderTop:`3px solid ${s.color}`}}>
            <s.Icon size={20} style={{color:s.color}} />
            <div><p style={styles.statLabel}>{s.label}</p><p style={{...styles.statVal,color:s.color}}>{s.val}</p></div>
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem",marginBottom:"1rem",alignItems:"center"}}>
          <form onSubmit={handleBuscar} style={{display:"flex",flex:1,minWidth:"200px",gap:"0.5rem"}}>
            <div style={styles.searchBox}>
              <IconSearch size={16} style={{color:palette.muted,flexShrink:0}} />
              <input style={styles.searchInput} placeholder="Buscar por estudiante, cédula, crédito o referencia..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
              {busqueda&&<button type="button" style={styles.clearBtn} onClick={()=>{setBusqueda("");cargar();}}>✕</button>}
            </div>
            <button type="submit" style={{...styles.btnPrimary,padding:"0.45rem 0.9rem",fontSize:"0.8rem"}}>Buscar</button>
          </form>
          <div style={styles.filtroGroup}>
            {[["todos","Todos"],["pago","↑ Pagos"],["desembolso","↓ Desembolsos"],["interes","↗ Intereses"],["mora","⚠ Mora"]].map(([key,label])=>(
              <button key={key} style={{...styles.filtroBtn,background:filtroTipo===key?palette.navy:"transparent",color:filtroTipo===key?"#fff":palette.muted}} onClick={()=>setFiltroTipo(key)}>{label}</button>
            ))}
          </div>
          <select style={{padding:"0.35rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.78rem",color:palette.text,background:palette.card,cursor:"pointer",fontFamily:"'Inter',sans-serif"}} value={filtroCanal} onChange={e=>setFiltroCanal(e.target.value)}>
            <option value="todos">Todos los canales</option>
            {["PSE","Transferencia","Efectivo","Sistema"].map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <DateFilter value={fechas} onChange={setFechas} />
          <select style={{padding:"0.35rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.78rem",color:palette.text,background:palette.card,cursor:"pointer",fontFamily:"'Inter',sans-serif"}} value={semestre} onChange={e=>setSemestre(e.target.value)}>
            <option value="">Todos los semestres</option>
            {Array.from({length:10},(_,i)=>i+1).map(s=><option key={s} value={s}>Semestre {s}</option>)}
          </select>
          <button style={{...styles.filtroBtn,marginLeft:"auto",color:palette.navy}} onClick={()=>setOrden(o=>o==="desc"?"asc":"desc")}>
            {orden==="desc"?"↓ Más reciente":"↑ Más antiguo"}
          </button>
        </div>

        <div style={styles.txLista}>
          {loading ? <Spinner/> : grupos.length===0
            ?<div style={styles.emptyState}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{color:palette.muted,fontSize:"0.85rem"}}>No hay transacciones que coincidan.</p></div>
            :grupos.map((grupo,i)=>{
              const primero = grupo.txs[0];
              const totalMovido = grupo.txs.reduce((s,tx)=>s+Number(tx.monto),0);
              const saldoActual = grupo.txs[0]?.saldo_despues; // ya viene ordenado por fecha desc/asc según el filtro
              return (
                <div key={grupo.key} style={{...styles.txCard,animation:`fadeUp 0.3s ease ${i*0.04}s both`}} onClick={()=>setModalEstudianteKey(grupo.key)}>
                  <div style={{width:"40px",height:"40px",borderRadius:"50%",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",fontWeight:"700",fontSize:"0.9rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {primero.estudiante_nombre.charAt(0)}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"2px",flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.82rem",fontWeight:"700",color:palette.text}}>{primero.estudiante_nombre}</span>
                      <span style={{fontSize:"0.65rem",fontWeight:"600",color:palette.muted,background:palette.card,padding:"0.1rem 0.5rem",borderRadius:"99px"}}>{grupo.txs.length} movimiento{grupo.txs.length!==1?"s":""}</span>
                    </div>
                    <p style={{fontSize:"0.72rem",color:palette.muted,margin:0}}>C.C. {primero.estudiante_cc} · {primero.credito_codigo} · {primero.credito_tipo}</p>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <p style={{fontSize:"0.7rem",color:palette.muted,margin:"0 0 2px"}}>Saldo actual</p>
                    <p style={{fontSize:"0.95rem",fontWeight:"700",margin:0,color:palette.navy}}>{fmt(saldoActual)}</p>
                  </div>
                </div>
              );
            })
          }
        </div>
        {!loading && grupos.length>0&&<p style={{fontSize:"0.72rem",color:palette.muted,textAlign:"right",marginTop:"0.75rem"}}>{grupos.length} estudiante{grupos.length!==1?"s":""} · {transacciones.length} transacción{transacciones.length!==1?"es":""}</p>}
      </div>

      {grupoActivo && !modalTx && (
        <ModalTransaccionesEstudiante grupo={grupoActivo} onClose={() => setModalEstudianteKey(null)} setModalTx={setModalTx} />
      )}
      {modalTx&&<ModalDetalle tx={modalTx} onClose={()=>setModalTx(null)} esAdmin={true}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Transacciones() {
  const { isAdmin } = useAuth();
  return (
    <Layout>
      {isAdmin?<TransaccionesAdmin/>:<TransaccionesEstudiante/>}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        select { font-family:'Inter',sans-serif; cursor:pointer; }
        select:focus,input:focus { outline:none; border-color:#1e3a5f !important; box-shadow:0 0 0 3px rgba(30,58,95,0.1); }
      `}</style>
    </Layout>
  );
}

const styles = {
  secHeader:    {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"},
  secTitle:     {fontSize:"1.25rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"},
  secSub:       {fontSize:"0.82rem",color:palette.muted,margin:0},
  creditoSelect:{padding:"0.55rem 0.9rem",border:"1.5px solid rgba(30,58,95,0.1)",borderRadius:"9px",fontSize:"0.84rem",color:palette.text,background:palette.card,fontFamily:"'Inter',sans-serif"},
  statsGrid:    {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"0.85rem",marginBottom:"1.25rem"},
  statCard:     {background:palette.card,borderRadius:"12px",padding:"0.9rem 1rem",display:"flex",alignItems:"center",gap:"0.75rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"},
  statLabel:    {fontSize:"0.7rem",color:palette.muted,margin:"0 0 2px"},
  statVal:      {fontSize:"1rem",fontWeight:"700",margin:0},
  card:         {background:palette.card,borderRadius:"14px",padding:"1.25rem 1.5rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",marginBottom:"1.25rem"},
  searchBox:    {display:"flex",alignItems:"center",gap:"0.5rem",background:palette.beige,borderRadius:"9px",padding:"0.45rem 0.9rem",flex:"1",minWidth:"200px",border:`1px solid ${palette.border}`},
  searchInput:  {border:"none",background:"transparent",flex:1,fontSize:"0.82rem",color:palette.text,fontFamily:"'Inter',sans-serif"},
  clearBtn:     {background:"none",border:"none",color:palette.muted,cursor:"pointer",fontSize:"0.75rem",padding:0},
  filtroGroup:  {display:"flex",gap:"4px",flexWrap:"wrap"},
  filtroBtn:    {padding:"0.3rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.75rem",fontWeight:"500",cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"},
  txLista:      {display:"flex",flexDirection:"column",gap:"0.6rem"},
  txCard:       {display:"flex",alignItems:"center",gap:"0.9rem",background:palette.beige,borderRadius:"11px",padding:"0.85rem 1rem",cursor:"pointer",transition:"box-shadow 0.15s"},
  txDesc:       {fontSize:"0.82rem",color:palette.text,fontWeight:"500",margin:"3px 0 0",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},
  txMeta:       {fontSize:"0.7rem",color:palette.muted,margin:"2px 0 0"},
  emptyState:   {display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem",padding:"2rem"},
  modalOverlay: {position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem"},
  modal:        {background:palette.card,borderRadius:"18px",padding:"2rem",width:"100%",maxWidth:"460px",boxShadow:"0 25px 60px rgba(0,0,0,0.3)",animation:"fadeIn 0.25s ease",maxHeight:"90vh",overflowY:"auto"},
  btnPrimary:   {padding:"0.7rem 1.25rem",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",border:"none",borderRadius:"10px",fontSize:"0.88rem",fontWeight:"600",cursor:"pointer",fontFamily:"'Inter',sans-serif",boxShadow:`0 4px 12px rgba(30,58,95,0.25)`},
};