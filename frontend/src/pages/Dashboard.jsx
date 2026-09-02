import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import creditosService from "../services/creditosService";
import facturasService from "../services/facturasService";
import transaccionesService from "../services/transaccionesService";
import logoIconoNavy from "../assets/logo-icono-navy.png";
import { IconAlertTriangle, IconFileText, IconClipboard, IconCheckCircle, IconZap, IconDollar, IconCreditCard, IconExchange } from "../components/Icons";

const palette = {
  navy:"#1e3a5f", orange:"#e8740e", gold:"#c89b14", beige:"#f3ede1",
  beigeAlt:"#ede6d8", text:"#2c3e50", muted:"#6b7a8d", green:"#1d9e75",
  red:"#c0392b", card:"#ffffff", border:"rgba(30,58,95,0.1)",
};

const fmt = (n) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(n||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-CO",{year:"numeric",month:"short",day:"numeric"}) : "—";

function StatCard({ icon, label, value, sub, color, delay=0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setVisible(true),delay); return ()=>clearTimeout(t); },[delay]);
  return (
    <div style={{...styles.statCard, background:`linear-gradient(160deg,#fff,${color}0c)`, borderTop:`3px solid ${color}`, boxShadow:visible?`0 3px 12px ${color}22`:"none", opacity:visible?1:0, transform:visible?"translateY(0)":"translateY(16px)", transition:"opacity 0.4s ease, transform 0.4s ease, box-shadow 0.4s ease"}}>
      <div style={{...styles.statIcon, background:`linear-gradient(135deg,${color}22,${color}12)`, color, boxShadow:`inset 0 0 0 1px ${color}25`}}>{icon}</div>
      <div style={styles.statBody}>
        <p style={styles.statLabel}>{label}</p>
        <p style={{...styles.statVal, color}}>{value}</p>
        {sub&&<p style={styles.statSub}>{sub}</p>}
      </div>
    </div>
  );
}

function ProgressBar({ value, total, color }) {
  const pct = total>0 ? Math.round((value/total)*100) : 0;
  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressTrack}><div style={{...styles.progressFill, width:`${pct}%`, background:color}}/></div>
      <span style={styles.progressPct}>{pct}%</span>
    </div>
  );
}

function BarChart({ data, labels, montos }) {
  const max = Math.max(...data, 1);
  // Ciclo de colores para que cada barra se distinga — más vivo que un solo
  // tono navy plano, sin salirse de la paleta institucional.
  const coloresBarra = [
    [palette.navy, "#2a5080"],
    [palette.gold, "#e0b02a"],
    [palette.green, "#16a085"],
    [palette.orange, "#f0904a"],
  ];
  return (
    <div style={styles.chartWrap}>
      <div style={styles.chartBars}>
        {data.map((val,i)=>{
          const [c1,c2] = coloresBarra[i % coloresBarra.length];
          return (
          <div key={i} style={styles.barCol}>
            {val>0 && <span style={styles.barMonto}>{fmtCorto(montos?.[i] ?? val)}</span>}
            <div style={styles.barTrack}>
              <div style={{...styles.barFill, height:`${(val/max)*100}%`, background:val>0?`linear-gradient(180deg,${c1},${c2})`:palette.beige, boxShadow:val>0?`0 4px 10px ${c1}40`:"none", transition:`height 0.7s cubic-bezier(.22,1,.36,1) ${i*0.08}s`}}/>
            </div>
            <span style={styles.barLabel}>{labels[i]}</span>
          </div>
        );})}
      </div>
    </div>
  );
}

// Formato corto para las etiquetas de monto sobre cada barra: 375.000 -> $375K
function fmtCorto(n) {
  const v = Number(n)||0;
  if (v >= 1000000) return `$${(v/1000000).toFixed(1).replace(/\.0$/,"")}M`;
  if (v >= 1000) return `$${Math.round(v/1000)}K`;
  return `$${v}`;
}

// ── Vista Estudiante ──────────────────────────────────────────────────────────
function DashboardEstudiante() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creditos, setCreditos]         = useState([]);
  const [facturas, setFacturas]         = useState([]);
  const [transacciones, setTransacciones] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(()=>{
    const cargar = async () => {
      try {
        const [cData, fData, tData] = await Promise.all([
          creditosService.getMisCreditos(),
          facturasService.getMisFacturas(),
          transaccionesService.getMisTransacciones(),
        ]);
        setCreditos(cData.creditos || []);
        setFacturas(fData.facturas || []);
        setTransacciones(tData.transacciones || []);
      } catch (err) {
        console.error("Error cargando dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  },[]);

  if (loading) return (
    <Layout>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh"}}>
        <div style={styles.spinner}/>
      </div>
    </Layout>
  );

  const creditoActivo    = creditos.find(c=>c.estado==="Activo");
  const saldoPendiente   = creditos.reduce((s,c)=>s+(parseFloat(c.monto||0)-parseFloat(c.monto||0)*((c.cuotas_pagadas||0)/( c.cuotas||1))),0);
  const cuotasPagadas    = facturas.filter(f=>f.estado==="Pagada").length;
  const totalCuotas      = facturas.length;
  const proximaCuota     = facturas.find(f=>f.estado==="Pendiente"||f.estado==="Vencida");
  const cantVencidas     = facturas.filter(f=>f.estado==="Vencida").length;
  const totalPagado      = facturas.filter(f=>f.estado==="Pagada").reduce((s,f)=>s+parseFloat(f.monto||0),0);

  // Últimas 6 transacciones de pago para la gráfica
  const pagos = transacciones.filter(t=>t.tipo==="pago").slice(0,6);
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const datosPagos = pagos.map(p=>parseFloat(p.monto||0)).reverse();
  const labelesPagos = pagos.map(p=>meses[new Date(p.fecha).getMonth()]).reverse();

  return (
    <Layout>
      {creditos.length === 0 && (
        <div style={styles.bannerSolicitar}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
            <div style={styles.bannerSolicitarIcon}><IconFileText size={22} /></div>
            <div>
              <p style={styles.bannerSolicitarTitle}>Todavía no tienes un crédito registrado</p>
              <p style={styles.bannerSolicitarSub}>Solicita tu crédito de matrícula desde aquí — el mismo proceso oficial, en línea.</p>
            </div>
          </div>
          <button style={styles.bannerSolicitarBtn} onClick={() => navigate("/creditos")}>+ Solicitar crédito</button>
        </div>
      )}

      {cantVencidas>0&&(
        <div style={{display:"flex",gap:"0.6rem",alignItems:"center",background:palette.red+"12",border:`1px solid ${palette.red}30`,borderRadius:"12px",padding:"0.75rem 1.1rem",marginBottom:"1.25rem"}}>
          <IconAlertTriangle size={18} style={{color:palette.red,flexShrink:0}} />
          <p style={{fontSize:"0.85rem",fontWeight:"700",color:palette.red,margin:0}}>
            Tienes {cantVencidas} cuota{cantVencidas>1?"s":""} vencida{cantVencidas>1?"s":""} — regulariza tu estado para evitar recargos.
          </p>
        </div>
      )}

      <div style={styles.greeting}>
        <div style={styles.greetWithLogo}>
          <img src={logoIconoNavy} alt="Uniautónoma del Cauca" style={styles.greetLogo} />
          <div>
            <h2 style={styles.greetTitle}>Hola, {user?.nombre?.split(" ")[0]||"Estudiante"} 👋</h2>
            <p style={styles.greetSub}>Aquí está el resumen de tu crédito estudiantil.</p>
          </div>
        </div>
        {creditoActivo&&(
          <div style={styles.statusBadge}>
            <span style={styles.statusDot}/>
            {creditoActivo.estado}
          </div>
        )}
      </div>

      <div style={styles.statsGrid}>
        <StatCard icon={<IconCreditCard size={22}/>} label="Crédito activo" color={palette.navy}   value={creditoActivo?fmt(creditoActivo.monto):"Sin crédito"} sub={creditoActivo?`${creditoActivo.cuotas} cuotas totales`:""} delay={0}/>
        <StatCard icon={<IconZap size={22}/>} label="Saldo pendiente" color={palette.orange} value={fmt(proximaCuota ? parseFloat(proximaCuota.monto) * (totalCuotas - cuotasPagadas) : 0)} sub={`${totalCuotas - cuotasPagadas} cuotas restantes`} delay={80}/>
        <StatCard icon={<IconClipboard size={22}/>} label="Próxima cuota" color={palette.gold}   value={proximaCuota?fmt(proximaCuota.monto):"—"} sub={proximaCuota?`Vence: ${fmtDate(proximaCuota.fecha_vencimiento)}`:""} delay={160}/>
        <StatCard icon={<IconCheckCircle size={22}/>} label="Total pagado" color={palette.green}  value={fmt(totalPagado)} sub={`${cuotasPagadas} cuotas pagadas`} delay={240}/>
      </div>

      <div style={styles.midGrid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Progreso del crédito</h3>
          <p style={styles.cardSub}>Cuotas pagadas vs total</p>
          <div style={{margin:"1.25rem 0"}}>
            <div style={styles.progressMeta}>
              <span style={styles.progressMetaLabel}>Cuotas pagadas</span>
              <span style={{...styles.progressMetaVal,color:palette.navy}}>{cuotasPagadas}/{totalCuotas}</span>
            </div>
            <ProgressBar value={cuotasPagadas} total={totalCuotas} color={`linear-gradient(90deg,${palette.navy},#2a5080)`}/>
          </div>
          <div style={styles.infoRow}>
            {creditoActivo&&<>
              <div style={styles.infoItem}><span style={styles.infoLabel}>Tasa de interés</span><span style={styles.infoVal}>{creditoActivo.tasa_interes||"—"}% mensual</span></div>
              <div style={styles.infoItem}><span style={styles.infoLabel}>Modalidad</span><span style={styles.infoVal}>Cuotas fijas</span></div>
              <div style={styles.infoItem}><span style={styles.infoLabel}>Estado</span><span style={{...styles.infoVal,color:palette.green,fontWeight:"600"}}>{creditoActivo.estado}</span></div>
            </>}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Historial de pagos</h3>
          <p style={styles.cardSub}>Últimos pagos realizados</p>
          {datosPagos.length>0
            ? <BarChart data={datosPagos} labels={labelesPagos} montos={datosPagos}/>
            : <div style={{textAlign:"center",padding:"2rem",color:palette.muted,fontSize:"0.85rem"}}>Sin pagos registrados aún</div>
          }
        </div>
      </div>

      <div style={{...styles.card,marginTop:"1.25rem"}}>
        <div style={styles.tableHeader}>
          <div><h3 style={styles.cardTitle}>Últimas transacciones</h3><p style={styles.cardSub}>Movimientos recientes</p></div>
        </div>
        <div style={styles.tableWrap}>
          {transacciones.length===0
            ? <p style={{color:palette.muted,fontSize:"0.85rem",textAlign:"center",padding:"1.5rem"}}>Sin transacciones registradas.</p>
            : <table style={styles.table}>
                <thead>
                  <tr>{["Fecha","Concepto","Monto","Saldo"].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {transacciones.slice(0,5).map((t,i)=>(
                    <tr key={t.id} style={{background:i%2===0?"#fff":"#fafaf9"}}>
                      <td style={styles.td}>{fmtDate(t.fecha)}</td>
                      <td style={styles.td}>{t.descripcion}</td>
                      <td style={{...styles.td,fontWeight:"600",color:t.tipo==="mora"||t.tipo==="interes"?palette.red:palette.navy}}>{fmt(t.monto)}</td>
                      <td style={{...styles.td,color:palette.muted}}>{fmt(t.saldo_despues)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
      </div>
    </Layout>
  );
}

// ── Vista Admin ───────────────────────────────────────────────────────────────
function DashboardAdmin() {
  const { user } = useAuth();
  const [creditos, setCreditos]       = useState([]);
  const [facturas, setFacturas]       = useState([]);
  const [resumen, setResumen]         = useState(null);
  const [loading, setLoading]         = useState(true);

  useEffect(()=>{
    const cargar = async () => {
      try {
        const [cData, fData, rData] = await Promise.all([
          creditosService.getTodos(),
          facturasService.getTodas(),
          transaccionesService.getResumen(),
        ]);
        setCreditos(cData.creditos||[]);
        setFacturas(fData.facturas||[]);
        setResumen(rData);
      } catch(err) {
        console.error("Error dashboard admin:", err);
      } finally {
        setLoading(false);
      }
    };
    cargar();
  },[]);

  if (loading) return (
    <Layout>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh"}}>
        <div style={styles.spinner}/>
      </div>
    </Layout>
  );

  const porRevisar  = creditos.filter(c=>["Pendiente","En validación","En estudio","Devuelta"].includes(c.estado)).length;
  const activos     = creditos.filter(c=>["Activo","Aprobado"].includes(c.estado)).length;
  const enMora      = creditos.filter(c=>c.estado==="En mora").length;
  const vencidas    = facturas.filter(f=>f.estado==="Vencida").length;
  const porCobrar   = facturas.filter(f=>f.estado!=="Pagada").reduce((s,f)=>s+parseFloat(f.monto||0),0);

  return (
    <Layout>
      <div style={styles.bannerAdmin}>
        <div style={styles.bannerAdminDot1}/>
        <div style={styles.bannerAdminDot2}/>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", position:"relative", zIndex:1 }}>
          <img src={logoIconoNavy} alt="" style={{ width: "50px", height: "50px", borderRadius: "13px", objectFit: "cover", boxShadow: "0 3px 10px rgba(0,0,0,0.2)" }} />
          <div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#fff", margin: 0 }}>Bienvenido, {user?.nombre?.split(" ")[0]||"Admin"} 👋</h2>
            <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", margin: "4px 0 0" }}>Panel de administración — UniCréditos 2P-2026</p>
          </div>
        </div>
        {enMora + vencidas > 0 && (
          <div style={{...styles.bannerAdminAlerta, position:"relative", zIndex:1}}>
            <IconAlertTriangle size={16} /> {enMora + vencidas} caso{enMora+vencidas!==1?"s":""} requiere{enMora+vencidas===1?"":"n"} atención
          </div>
        )}
      </div>

      <div style={{...styles.statsGrid,gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))"}}>
        <StatCard icon={<IconClipboard size={22}/>} label="Por revisar"       color={palette.orange} value={porRevisar}       sub="Solicitudes pendientes" delay={0}/>
        <StatCard icon={<IconCheckCircle size={22}/>} label="Créditos activos"  color={palette.green}  value={activos}          sub="Aprobados o activos"    delay={80}/>
        <StatCard icon={<IconAlertTriangle size={22}/>} label="En mora"           color={palette.red}    value={enMora}           sub="Requieren atención"     delay={160}/>
        <StatCard icon={<IconZap size={22}/>} label="Cuotas vencidas"   color={palette.gold}    value={vencidas}         sub="Sin pagar"              delay={240}/>
        <StatCard icon={<IconDollar size={22}/>} label="Por cobrar"        color={palette.navy}   value={fmt(porCobrar)}   sub="Saldo pendiente total"  delay={320}/>
      </div>

      <div style={styles.midGrid}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Solicitudes recientes</h3>
          <p style={styles.cardSub}>Últimos créditos en el sistema</p>
          <div style={{marginTop:"1rem",display:"flex",flexDirection:"column",gap:"0.5rem"}}>
            {creditos.slice(0,5).map((c,i)=>{
              const nombre = c.deudor_nombre||c.estudiante_nombre||"—";
              const colorEstado = c.estado==="Activo"?palette.green:c.estado==="Pendiente"?palette.orange:c.estado==="En mora"?palette.red:palette.muted;
              const coloresAvatar = [palette.navy, palette.gold, palette.green, palette.orange];
              const colorAv = coloresAvatar[i % coloresAvatar.length];
              return (
              <div key={c.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.6rem 0.5rem",borderRadius:"9px",borderLeft:`3px solid ${colorEstado}`,background:palette.beige+"90"}}>
                <div style={{width:"34px",height:"34px",borderRadius:"50%",background:`linear-gradient(135deg,${colorAv},${colorAv}cc)`,color:"#fff",fontWeight:"700",fontSize:"0.82rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 2px 6px ${colorAv}50`}}>
                  {nombre.charAt(0)}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:"0.82rem",fontWeight:"600",color:palette.text,margin:0}}>{nombre}</p>
                  <p style={{fontSize:"0.72rem",color:palette.muted,margin:"2px 0 0"}}>{c.codigo} · {c.periodo}</p>
                </div>
                <span style={{display:"inline-flex",padding:"0.2rem 0.65rem",borderRadius:"99px",fontSize:"0.7rem",fontWeight:"600",background:colorEstado+"18",color:colorEstado,flexShrink:0}}>
                  {c.estado}
                </span>
              </div>
            );})}
            {creditos.length===0&&<p style={{color:palette.muted,fontSize:"0.85rem",textAlign:"center",padding:"1rem"}}>Sin solicitudes registradas.</p>}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Resumen financiero</h3>
          <p style={styles.cardSub}>Movimientos del sistema</p>
          <div style={{marginTop:"1rem"}}>
            {resumen?.por_tipo?.map(t=>{
              const iconos = { desembolso:{Icon:IconDollar,color:palette.green}, pago:{Icon:IconCheckCircle,color:palette.navy}, interes:{Icon:IconZap,color:palette.gold}, mora:{Icon:IconAlertTriangle,color:palette.red} };
              const { Icon, color } = iconos[t.tipo] || {Icon:IconExchange,color:palette.muted};
              const maxTotal = Math.max(...(resumen.por_tipo.map(x=>parseFloat(x.total))), 1);
              const pct = (parseFloat(t.total)/maxTotal)*100;
              return (
              <div key={t.tipo} style={{padding:"0.65rem 0",borderBottom:`1px solid ${palette.border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:"0.7rem",marginBottom:"6px"}}>
                  <div style={{width:"32px",height:"32px",borderRadius:"9px",background:color+"18",color,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon size={16}/></div>
                  <span style={{fontSize:"0.82rem",color:palette.text,textTransform:"capitalize",flex:1,fontWeight:"600"}}>{t.tipo}</span>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontSize:"0.85rem",fontWeight:"700",color}}>{fmt(t.total)}</span>
                    <span style={{fontSize:"0.7rem",color:palette.muted,marginLeft:"0.5rem"}}>({t.cantidad})</span>
                  </div>
                </div>
                <div style={{height:"6px",borderRadius:"99px",background:palette.beige,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,borderRadius:"99px",background:`linear-gradient(90deg,${color},${color}99)`,transition:"width 0.8s ease"}}/>
                </div>
              </div>
            );})||<p style={{color:palette.muted,fontSize:"0.85rem",textAlign:"center",padding:"1rem"}}>Sin datos financieros.</p>}
          </div>
        </div>
      </div>
    </Layout>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { isAdmin } = useAuth();
  return isAdmin ? <DashboardAdmin/> : <DashboardEstudiante/>;
}

const styles = {
  bannerSolicitar:     {display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"1rem",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,borderRadius:"14px",padding:"1.25rem 1.5rem",marginBottom:"1.5rem",boxShadow:"0 4px 16px rgba(30,58,95,0.25)"},
  bannerSolicitarIcon: {width:"44px",height:"44px",borderRadius:"12px",background:"rgba(255,255,255,0.15)",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  bannerSolicitarTitle:{fontSize:"0.95rem",fontWeight:"700",color:"#fff",margin:0},
  bannerSolicitarSub:  {fontSize:"0.8rem",color:"rgba(255,255,255,0.75)",margin:"3px 0 0"},
  bannerSolicitarBtn:  {padding:"0.7rem 1.3rem",background:"#fff",color:palette.navy,border:"none",borderRadius:"9px",fontSize:"0.85rem",fontWeight:"700",cursor:"pointer",fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"},
  greeting:     {display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"},
  greetWithLogo:{display:"flex",alignItems:"center",gap:"0.9rem"},
  greetLogo:    {width:"46px",height:"46px",borderRadius:"12px",objectFit:"cover",boxShadow:"0 3px 10px rgba(29,53,136,0.3)",flexShrink:0},
  greetTitle:   {fontSize:"1.4rem",fontWeight:"700",color:palette.navy,margin:0},
  greetSub:     {fontSize:"0.85rem",color:palette.muted,margin:"4px 0 0"},
  statusBadge:  {display:"flex",alignItems:"center",gap:"6px",background:palette.green+"18",color:palette.green,padding:"0.4rem 0.9rem",borderRadius:"99px",fontSize:"0.82rem",fontWeight:"600"},
  statusDot:    {width:"7px",height:"7px",borderRadius:"50%",background:palette.green,flexShrink:0},
  statsGrid:    {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"1rem",marginBottom:"1.25rem"},
  statCard:     {background:palette.card,borderRadius:"14px",padding:"1.25rem",display:"flex",alignItems:"flex-start",gap:"1rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"},
  statIcon:     {width:"44px",height:"44px",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  statBody:     {display:"flex",flexDirection:"column",gap:"2px"},
  bannerAdmin:      {display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"0.85rem",background:`linear-gradient(135deg,${palette.navy},#2a5080 60%,${palette.gold}30)`,borderRadius:"14px",padding:"1.1rem 1.4rem",marginBottom:"1.5rem",boxShadow:"0 4px 16px rgba(30,58,95,0.25)",position:"relative",overflow:"hidden"},
  bannerAdminDot1:  {position:"absolute",top:"-30px",right:"60px",width:"110px",height:"110px",borderRadius:"50%",background:"rgba(255,255,255,0.08)"},
  bannerAdminDot2:  {position:"absolute",bottom:"-40px",right:"-10px",width:"140px",height:"140px",borderRadius:"50%",background:`${palette.gold}25`},
  bannerAdminAlerta:{display:"flex",alignItems:"center",gap:"0.4rem",background:"rgba(255,255,255,0.15)",color:"#fff",fontSize:"0.8rem",fontWeight:"600",padding:"0.5rem 0.9rem",borderRadius:"9px"},
  statLabel:    {fontSize:"0.75rem",color:palette.muted,fontWeight:"500",margin:0},
  statVal:      {fontSize:"1.15rem",fontWeight:"700",margin:0},
  statSub:      {fontSize:"0.72rem",color:palette.muted,margin:0},
  midGrid:      {display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1.25rem"},
  card:         {background:palette.card,borderRadius:"14px",padding:"1.5rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"},
  cardTitle:    {fontSize:"0.95rem",fontWeight:"700",color:palette.text,margin:"0 0 2px"},
  cardSub:      {fontSize:"0.75rem",color:palette.muted,margin:0},
  progressWrap: {display:"flex",alignItems:"center",gap:"0.75rem"},
  progressTrack:{flex:1,height:"8px",background:palette.beigeAlt,borderRadius:"99px",overflow:"hidden"},
  progressFill: {height:"100%",borderRadius:"99px",transition:"width 0.8s cubic-bezier(.4,0,.2,1)"},
  progressPct:  {fontSize:"0.78rem",fontWeight:"600",color:palette.navy,width:"36px",textAlign:"right"},
  progressMeta: {display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"},
  progressMetaLabel:{fontSize:"0.8rem",color:palette.muted},
  progressMetaVal:  {fontSize:"0.85rem",fontWeight:"600"},
  infoRow:      {display:"flex",gap:"1rem",marginTop:"1.25rem",flexWrap:"wrap"},
  infoItem:     {display:"flex",flexDirection:"column",gap:"2px"},
  infoLabel:    {fontSize:"0.7rem",color:palette.muted},
  infoVal:      {fontSize:"0.85rem",fontWeight:"600",color:palette.text},
  chartWrap:    {marginTop:"1.25rem",height:"180px"},
  chartBars:    {display:"flex",alignItems:"flex-end",gap:"0.75rem",height:"100%",paddingBottom:"24px"},
  barCol:       {flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"6px",height:"100%",maxWidth:"64px"},
  barMonto:     {fontSize:"0.72rem",fontWeight:"700",color:palette.navy,whiteSpace:"nowrap"},
  barTrack:     {flex:1,width:"100%",display:"flex",alignItems:"flex-end",background:`linear-gradient(180deg,transparent,${palette.beige}80)`,borderRadius:"8px 8px 0 0",overflow:"hidden",borderBottom:`2px solid ${palette.border}`},
  barFill:      {width:"100%",borderRadius:"8px 8px 0 0",minHeight:"4px"},
  barLabel:     {fontSize:"0.7rem",fontWeight:"600",color:palette.muted,textAlign:"center"},
  tableHeader:  {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1rem"},
  tableWrap:    {overflowX:"auto"},
  table:        {width:"100%",borderCollapse:"collapse"},
  th:           {textAlign:"left",padding:"0.6rem 1rem",fontSize:"0.72rem",fontWeight:"700",color:palette.muted,textTransform:"uppercase",letterSpacing:"0.05em",background:palette.beige,borderBottom:`1px solid ${palette.border}`},
  td:           {padding:"0.85rem 1rem",fontSize:"0.85rem",color:palette.text,borderBottom:`1px solid rgba(30,58,95,0.06)`},
  spinner:      {width:"40px",height:"40px",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"},
};