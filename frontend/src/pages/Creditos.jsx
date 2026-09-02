import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import creditosService from "../services/creditosService";
import { IconAlertTriangle, IconCheckCircle, IconCreditCard, IconCalendar, IconFileText, IconDollar, IconSearch, IconFileEmpty, IconInfo } from "../components/Icons";
import DateFilter from "../components/DateFilter";


const palette = {
  navy:"#1e3a5f", orange:"#e8740e", gold:"#c89b14", beige:"#f3ede1",
  beigeAlt:"#ede6d8", text:"#2c3e50", muted:"#6b7a8d", green:"#1d9e75",
  red:"#c0392b", card:"#ffffff", border:"rgba(30,58,95,0.1)",
};

const fmt = (n) => new Intl.NumberFormat("es-CO",{style:"currency",currency:"COP",minimumFractionDigits:0}).format(n||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-CO",{year:"numeric",month:"short",day:"numeric"}) : "—";
// Formatea dígitos con separador de miles mientras el usuario escribe (ej: 3000000 -> 3.000.000)
const formatMiles = (v) => {
  const digits = String(v).replace(/\D/g,"");
  return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g,".") : "";
};

const PROGRAMAS = ["Ingeniería de Sistemas","Administración de Empresas","Contaduría Pública","Derecho","Psicología","Medicina","Enfermería","Arquitectura","Ingeniería Civil","Trabajo Social"];
const JORNADAS  = ["Diurna","Nocturna","Virtual"];
const SMMLV2    = 2847000;

// ─── Componentes compartidos ──────────────────────────────────────────────────
function EstadoBadge({ estado, color }) {
  const map = { green:{bg:"#1d9e7518",text:"#1d9e75"}, red:{bg:"#c0392b18",text:"#c0392b"}, orange:{bg:"#e8740e18",text:"#e8740e"}, gold:{bg:"#c89b1418",text:"#c89b14"}, muted:{bg:"#6b7a8d18",text:"#6b7a8d"} };
  const c = map[color]||map.muted;
  return <span style={{display:"inline-flex",alignItems:"center",gap:"4px",padding:"0.22rem 0.7rem",borderRadius:"99px",fontSize:"0.72rem",fontWeight:"600",background:c.bg,color:c.text,whiteSpace:"nowrap"}}>{estado}</span>;
}

function getEstadoColor(estado) {
  if (["Activo","Aprobado","Remitido a aliado"].includes(estado)) return "green";
  if (["Negado","En mora","Cerrado"].includes(estado)) return "red";
  if (["Pendiente","Devuelta"].includes(estado)) return "orange";
  if (["En validación","En estudio"].includes(estado)) return "gold";
  return "muted";
}

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"3rem"}}><div style={{width:"36px",height:"36px",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;
}

// ─── Campo de formulario del modal de solicitud ────────────────────────────────
// IMPORTANTE: definido fuera del modal (no dentro de la función del componente).
// Si se define adentro, React lo recrea en cada render y el <input> pierde el
// foco después de cada tecla — por eso antes "no dejaba escribir".
function Field({label,value,onChange,placeholder,error,type="text",required=true}) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}{required&&<span style={{color:palette.orange}}> *</span>}</label>
      <input style={{...styles.input,borderColor:error?palette.red:palette.border}} type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>
      {error&&<span style={{fontSize:"0.72rem",color:palette.red}}>{error}</span>}
    </div>
  );
}

function StepBar({ paso }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:"0",marginBottom:"1.5rem"}}>
      {[{n:1,label:"Deudor"},{n:2,label:"Codeudor"},{n:3,label:"Resumen"}].map((s,i)=>(
        <div key={s.n} style={{display:"flex",alignItems:"center",flex:i<2?1:"auto"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
            <div style={{width:"26px",height:"26px",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.72rem",fontWeight:"700",background:paso>s.n?palette.green:paso===s.n?palette.navy:palette.beigeAlt,color:paso>=s.n?"#fff":palette.muted,transition:"all 0.3s"}}>{paso>s.n?"✓":s.n}</div>
            <span style={{fontSize:"0.62rem",color:paso>=s.n?palette.navy:palette.muted,fontWeight:paso===s.n?"700":"400"}}>{s.label}</span>
          </div>
          {i<2&&<div style={{flex:1,height:"2px",background:paso>s.n+0?palette.navy:palette.beigeAlt,margin:"0 6px 16px",transition:"background 0.3s"}}/>}
        </div>
      ))}
    </div>
  );
}

// ─── Modal detalle crédito ─────────────────────────────────────────────────────
function ModalDetalle({ credito, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"500px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Detalle del crédito</h3><p style={styles.modalSub}>{credito.codigo}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={{display:"flex",gap:"0.5rem",marginBottom:"1.25rem"}}>
          <EstadoBadge estado={credito.estado} color={getEstadoColor(credito.estado)}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",background:palette.beige,borderRadius:"12px",padding:"1rem",marginBottom:"1rem"}}>
          <div style={{textAlign:"center"}}><p style={{fontSize:"0.72rem",color:palette.muted,margin:"0 0 4px"}}>Monto aprobado</p><p style={{fontSize:"1.2rem",fontWeight:"700",color:palette.navy,margin:0}}>{fmt(credito.monto)}</p></div>
          <div style={{textAlign:"center",borderLeft:`1px solid ${palette.border}`}}><p style={{fontSize:"0.72rem",color:palette.muted,margin:"0 0 4px"}}>Valor cuota</p><p style={{fontSize:"1.2rem",fontWeight:"700",color:palette.orange,margin:0}}>{fmt(credito.valor_cuota)}</p></div>
        </div>
        <div style={{display:"flex",flexDirection:"column"}}>
          {[
            ["Código",credito.codigo],["Tipo",credito.tipo],
            ["Aprueba",["Brilla","ICETEX"].includes(credito.tipo) ? `${credito.tipo} (aliado externo)` : "Universidad"],
            ["Periodo",credito.periodo],
            ["Cuotas",credito.cuotas],["Tasa interés",credito.tasa_interes?`${credito.tasa_interes}% mensual`:"—"],
            ["Fecha solicitud",fmtDate(credito.fecha_solicitud)],
            ["Fecha evaluación",fmtDate(credito.fecha_evaluacion)],
            ["Fecha aprobación",fmtDate(credito.fecha_aprobacion)],
            ["Fecha desembolso",fmtDate(credito.fecha_desembolso)],
            ["Fecha vencimiento",fmtDate(credito.fecha_vencimiento)],
          ].map(([l,v])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0",borderBottom:`1px solid ${palette.border}`}}>
              <span style={{fontSize:"0.78rem",color:palette.muted}}>{l}</span>
              <span style={{fontSize:"0.82rem",color:palette.text,fontWeight:"500"}}>{v||"—"}</span>
            </div>
          ))}
        </div>
        {credito.observacion&&(
          <div style={{display:"flex",gap:"0.5rem",alignItems:"flex-start",background:palette.red+"08",border:`1px solid ${palette.red}25`,borderRadius:"8px",padding:"0.75rem",marginTop:"1rem"}}>
            <IconAlertTriangle size={16} style={{color:palette.red,flexShrink:0}} /><p style={{fontSize:"0.78rem",color:palette.red,margin:0}}>{credito.observacion}</p>
          </div>
        )}
        <button style={{...styles.btnSecondary,width:"100%",marginTop:"1.25rem"}} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

// ─── Modal gestionar crédito (admin) ──────────────────────────────────────────
function ModalGestionar({ credito, onClose, onActualizado }) {
  const [estado, setEstado]           = useState(credito.estado);
  const [observacion, setObservacion] = useState(credito.observacion||"");
  const [loading, setLoading]         = useState(false);
  const [paso, setPaso]               = useState(1);
  const [error, setError]             = useState("");

  // Datos financieros — solo se piden si el estado elegido los necesita
  const [monto, setMonto]     = useState(credito.monto ? String(credito.monto) : "");
  const [cuotas, setCuotas]   = useState(credito.cuotas ? String(credito.cuotas) : "12");
  const [tasa, setTasa]       = useState(credito.tasa_interes ? String(credito.tasa_interes) : "1.5");
  const [vencimiento, setVencimiento] = useState(credito.fecha_vencimiento || "");

  const estadosDisponibles = [
    {val:"Pendiente",color:"#e8740e",desc:"Solicitud recibida, en espera de revisión"},
    {val:"En validación",color:"#c89b14",desc:"Revisando documentación"},
    {val:"Devuelta",color:"#e8740e",desc:"Documentación incompleta o con errores"},
    {val:"En estudio",color:"#c89b14",desc:"Analizando capacidad de pago / evaluación financiera"},
    {val:"Remitido a aliado",color:"#1d9e75",desc:"No procede crédito interno — se orienta a Brilla o ICETEX"},
    {val:"Aprobado",color:"#1d9e75",desc:"Crédito aprobado — habilitar PowerCampus"},
    {val:"Activo",color:"#1d9e75",desc:"Crédito desembolsado y en curso"},
    {val:"Negado",color:"#c0392b",desc:"No cumple criterios"},
    {val:"En mora",color:"#c0392b",desc:"Presenta cuotas vencidas"},
    {val:"Cerrado",color:"#6b7a8d",desc:"Crédito finalizado"},
  ];

  const requiereDatosFinancieros = estado === "Aprobado" || estado === "Activo";
  const montoNum  = Number(String(monto).replace(/\D/g,""));
  const cuotasNum = Number(cuotas);
  const valorCuota = cuotasNum > 0 ? Math.round(montoNum / cuotasNum) : 0;

  const handleGuardar = async () => {
    if (requiereDatosFinancieros && (!montoNum || !cuotasNum || !vencimiento)) {
      setError("Completa monto, cuotas y fecha de vencimiento para este estado.");
      return;
    }
    setLoading(true); setError("");
    try {
      await creditosService.actualizar(credito.id, estado, observacion||null);
      if (requiereDatosFinancieros) {
        const hoy = new Date().toISOString().split("T")[0];
        await creditosService.completar(credito.id, {
          monto: montoNum,
          cuotas: cuotasNum,
          valor_cuota: valorCuota,
          tasa_interes: Number(tasa) || null,
          fecha_aprobacion: hoy,
          fecha_desembolso: hoy,
          fecha_vencimiento: vencimiento,
        });
      }
      setPaso(2);
    } catch(err) {
      setError(err.response?.data?.message||"Error al actualizar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"500px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>Gestionar crédito</h3><p style={styles.modalSub}>{credito.codigo}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {paso===1&&(<>
          <div style={{display:"flex",alignItems:"center",gap:"0.75rem",background:palette.beige,borderRadius:"10px",padding:"0.75rem 1rem",marginBottom:"1rem"}}>
            <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",fontWeight:"700",fontSize:"0.88rem",display:"flex",alignItems:"center",justifyContent:"center"}}>{(credito.deudor_nombre||credito.estudiante_nombre||"?").charAt(0)}</div>
            <div style={{flex:1}}><p style={{fontSize:"0.88rem",fontWeight:"700",color:palette.navy,margin:0}}>{credito.deudor_nombre||credito.estudiante_nombre}</p><p style={{fontSize:"0.72rem",color:palette.muted,margin:"2px 0 0"}}>{credito.codigo} · {credito.periodo}</p></div>
            <span style={{fontSize:"0.68rem",fontWeight:"700",color:["Brilla","ICETEX"].includes(credito.tipo)?palette.gold:palette.navy,background:(["Brilla","ICETEX"].includes(credito.tipo)?palette.gold:palette.navy)+"15",padding:"0.25rem 0.6rem",borderRadius:"7px",textAlign:"center",whiteSpace:"nowrap"}}>
              Aprueba:<br/>{["Brilla","ICETEX"].includes(credito.tipo) ? credito.tipo : "Universidad"}
            </span>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:"0.4rem",marginBottom:"1rem",maxHeight:"280px",overflowY:"auto"}}>
            {estadosDisponibles.map(e=>(
              <button key={e.val} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.5rem 0.75rem",border:"1.5px solid",borderColor:estado===e.val?e.color:palette.border,borderRadius:"9px",background:estado===e.val?e.color+"10":"transparent",cursor:"pointer",fontFamily:"'Inter',sans-serif",textAlign:"left",transition:"all 0.15s"}} onClick={()=>setEstado(e.val)}>
                <div style={{width:"10px",height:"10px",borderRadius:"50%",background:e.color,flexShrink:0}}/>
                <div><p style={{fontSize:"0.8rem",fontWeight:"600",color:estado===e.val?e.color:palette.text,margin:0}}>{e.val}</p><p style={{fontSize:"0.68rem",color:palette.muted,margin:0}}>{e.desc}</p></div>
                {estado===e.val&&<span style={{marginLeft:"auto",color:e.color,fontWeight:"700",fontSize:"0.8rem"}}>✓</span>}
              </button>
            ))}
          </div>

          {estado === "Remitido a aliado" && (
            <div style={{background:palette.green+"10",border:`1px solid ${palette.green}40`,borderRadius:"10px",padding:"0.75rem 1rem",marginBottom:"1rem"}}>
              <p style={{fontSize:"0.78rem",color:palette.text,margin:0,lineHeight:1.5}}>
                Se le notificará al estudiante que debe continuar el trámite directamente con{" "}
                <strong>{["Brilla","ICETEX"].includes(credito.tipo) ? credito.tipo : "Brilla o ICETEX"}</strong> —
                de aquí en adelante la evaluación, aprobación y desembolso son responsabilidad del aliado, no de la Universidad.
              </p>
            </div>
          )}

          {requiereDatosFinancieros && (
            <div style={{background:palette.beige,border:`1px solid ${palette.border}`,borderRadius:"10px",padding:"0.9rem 1rem",marginBottom:"1rem"}}>
              <p style={{fontSize:"0.78rem",fontWeight:"700",color:palette.navy,margin:"0 0 0.65rem"}}>Datos financieros — obligatorios para {estado}</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"0.6rem"}}>
                <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                  <label style={{...styles.label,fontSize:"0.72rem"}}>Monto total (COP)</label>
                  <input style={styles.input} type="text" inputMode="numeric" placeholder="4.500.000" value={formatMiles(monto)} onChange={e=>setMonto(e.target.value.replace(/\D/g,""))}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                  <label style={{...styles.label,fontSize:"0.72rem"}}>N.° de cuotas</label>
                  <input style={styles.input} type="number" min="1" max="36" value={cuotas} onChange={e=>setCuotas(e.target.value)}/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.6rem",marginBottom:"0.6rem"}}>
                <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                  <label style={{...styles.label,fontSize:"0.72rem"}}>Tasa mensual (%)</label>
                  <input style={styles.input} type="number" step="0.1" value={tasa} onChange={e=>setTasa(e.target.value)}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                  <label style={{...styles.label,fontSize:"0.72rem"}}>Vencimiento del crédito</label>
                  <input style={styles.input} type="date" value={vencimiento} onChange={e=>setVencimiento(e.target.value)}/>
                </div>
              </div>
              {montoNum > 0 && cuotasNum > 0 && (
                <p style={{fontSize:"0.75rem",color:palette.navy,margin:0}}>Valor de cada cuota: <strong>{fmt(valorCuota)}</strong></p>
              )}
            </div>
          )}

          <div style={{display:"flex",flexDirection:"column",gap:"5px",marginBottom:"1rem"}}>
            <label style={styles.label}>Observación para el estudiante</label>
            <textarea style={{...styles.input,height:"70px",resize:"vertical",paddingLeft:"0.9rem"}} placeholder="Notas o motivo..." value={observacion} onChange={e=>setObservacion(e.target.value)} maxLength={300}/>
          </div>
          {error&&<p style={{fontSize:"0.78rem",color:palette.red,marginBottom:"0.5rem"}}>{error}</p>}
          {loading?<div style={{textAlign:"center",padding:"0.75rem 0"}}><div style={styles.spinner}/></div>
          :<div style={{display:"flex",gap:"0.75rem"}}>
            <button style={styles.btnPrimary} onClick={handleGuardar}>Guardar cambios ✓</button>
            <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
          </div>}
        </>)}
        {paso===2&&(
          <div style={{textAlign:"center",padding:"0.5rem 0"}}>
            <div style={styles.successIcon}>✓</div>
            <p style={{color:palette.text,fontSize:"0.88rem",fontWeight:"600",marginBottom:"0.25rem"}}>Crédito actualizado</p>
            <p style={{color:palette.muted,fontSize:"0.78rem",marginBottom:"1.5rem"}}>Estado cambiado a <strong>{estado}</strong>.</p>
            <button style={styles.btnPrimary} onClick={()=>{onActualizado();onClose();}}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal nueva solicitud ────────────────────────────────────────────────────
function ModalNuevaSolicitud({ onClose, onEnviada }) {
  const [paso, setPaso]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  const [tipo, setTipo] = useState("Matrícula");
  const [deudor, setDeudor] = useState({ nombre:"", cc:"", direccion:"", telefono:"", programa:"", semestre:"", jornada:"Diurna", dirOficina:"", telOficina:"" });
  const [codeudor, setCodeudor] = useState({ nombre:"", cc:"", direccion:"", telefono:"", dirOficina:"", telOficina:"", ingresoMensual:"" });

  const setD = (k,v) => setDeudor(d=>({...d,[k]:v}));
  const setC = (k,v) => setCodeudor(c=>({...c,[k]:v}));

  const ingresoNum = Number(String(codeudor.ingresoMensual).replace(/\D/g,""));
  const cumple2SMMLV = ingresoNum >= SMMLV2;

  const validatePaso1 = () => {
    const e = {};
    if (!deudor.nombre.trim())    e.nombre    = "Requerido";
    if (!deudor.cc.trim())        e.cc        = "Requerido";
    if (!deudor.direccion.trim()) e.direccion = "Requerido";
    if (!deudor.telefono.trim())  e.telefono  = "Requerido";
    if (!deudor.programa)         e.programa  = "Requerido";
    if (!deudor.semestre)         e.semestre  = "Requerido";
    return e;
  };

  const validatePaso2 = () => {
    const e = {};
    if (!codeudor.nombre.trim())    e.cnombre    = "Requerido";
    if (!codeudor.cc.trim())        e.ccc        = "Requerido";
    if (!codeudor.direccion.trim()) e.cdireccion = "Requerido";
    if (!codeudor.telefono.trim())  e.ctelefono  = "Requerido";
    if (!codeudor.ingresoMensual)   e.cingreso   = "Requerido";
    if (ingresoNum < SMMLV2)        e.cingreso   = `Mínimo ${fmt(SMMLV2)} (2 SMMLV)`;
    return e;
  };

  const handleSiguiente = async () => {
    if (paso===1) {
      const e = validatePaso1();
      if (Object.keys(e).length>0) { setErrors(e); return; }
      setErrors({}); setPaso(2);
    } else if (paso===2) {
      const e = validatePaso2();
      if (Object.keys(e).length>0) { setErrors(e); return; }
      setErrors({}); setPaso(3);
    } else if (paso===3) {
      setLoading(true); setServerError("");
      try {
        await creditosService.solicitar({
          periodo: `${new Date().getFullYear()}-2`,
          tipo,
          deudor_nombre:       deudor.nombre,
          deudor_cc:           deudor.cc,
          deudor_programa:     deudor.programa,
          deudor_semestre:     deudor.semestre,
          deudor_jornada:      deudor.jornada,
          deudor_direccion:    deudor.direccion,
          deudor_telefono:     deudor.telefono,
          deudor_dir_oficina:  deudor.dirOficina||null,
          deudor_tel_oficina:  deudor.telOficina||null,
          codeudor_nombre:     codeudor.nombre,
          codeudor_cc:         codeudor.cc,
          codeudor_direccion:  codeudor.direccion,
          codeudor_telefono:   codeudor.telefono,
          codeudor_dir_oficina:codeudor.dirOficina||null,
          codeudor_tel_oficina:codeudor.telOficina||null,
          codeudor_ingreso:    ingresoNum,
        });
        setPaso(4);
        onEnviada();
      } catch(err) {
        setServerError(err.response?.data?.message||"Error al enviar la solicitud.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{...styles.modal,maxWidth:"560px"}} onClick={e=>e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>{paso===4?"¡Solicitud enviada!":"Solicitud de crédito"}</h3><p style={styles.modalSub}>{tipo} 2P-2026 · Bienestar Universitario</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {paso<4&&<StepBar paso={paso}/>}

        {paso===1&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              <label style={styles.label}>Tipo de crédito</label>
              <div style={{display:"flex",gap:"0.6rem",flexWrap:"wrap"}}>
                <button type="button" onClick={()=>setTipo("Matrícula")} style={{flex:"1 1 30%",minWidth:"130px",padding:"0.65rem 0.75rem",borderRadius:"9px",border:`1.5px solid ${tipo==="Matrícula"?palette.navy:palette.border}`,background:tipo==="Matrícula"?palette.navy+"10":"transparent",cursor:"pointer",fontFamily:"'Inter',sans-serif",textAlign:"left"}}>
                  <p style={{fontSize:"0.82rem",fontWeight:"700",color:tipo==="Matrícula"?palette.navy:palette.text,margin:0}}>Crédito de Matrícula</p>
                  <p style={{fontSize:"0.7rem",color:palette.muted,margin:"2px 0 0"}}>Institucional — proceso estándar de la Universidad</p>
                </button>
                <button type="button" onClick={()=>setTipo("Brilla")} style={{flex:"1 1 30%",minWidth:"130px",padding:"0.65rem 0.75rem",borderRadius:"9px",border:`1.5px solid ${tipo==="Brilla"?palette.gold:palette.border}`,background:tipo==="Brilla"?palette.gold+"12":"transparent",cursor:"pointer",fontFamily:"'Inter',sans-serif",textAlign:"left"}}>
                  <p style={{fontSize:"0.82rem",fontWeight:"700",color:tipo==="Brilla"?palette.gold:palette.text,margin:0}}>Crédito Brilla</p>
                  <p style={{fontSize:"0.7rem",color:palette.muted,margin:"2px 0 0"}}>Aliado externo — condiciones específicas próximamente</p>
                </button>
                <button type="button" onClick={()=>setTipo("ICETEX")} style={{flex:"1 1 30%",minWidth:"130px",padding:"0.65rem 0.75rem",borderRadius:"9px",border:`1.5px solid ${tipo==="ICETEX"?palette.green:palette.border}`,background:tipo==="ICETEX"?palette.green+"12":"transparent",cursor:"pointer",fontFamily:"'Inter',sans-serif",textAlign:"left"}}>
                  <p style={{fontSize:"0.82rem",fontWeight:"700",color:tipo==="ICETEX"?palette.green:palette.text,margin:0}}>Crédito ICETEX</p>
                  <p style={{fontSize:"0.7rem",color:palette.muted,margin:"2px 0 0"}}>Aliado externo — condiciones específicas próximamente</p>
                </button>
              </div>
            </div>
            <div style={styles.infoBox}><IconInfo size={17} style={{color:palette.navy,flexShrink:0}} /><p style={{fontSize:"0.78rem",color:palette.muted,margin:0,lineHeight:1.5}}>El crédito financia el valor de tu matrícula. <strong>No diligencie fechas ni valores</strong> — el Departamento Financiero los completa.</p></div>
            <p style={{fontSize:"0.82rem",fontWeight:"700",color:palette.navy,margin:0}}>Datos del estudiante (deudor)</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
              <div style={{gridColumn:"1/-1"}}><Field label="Nombre completo" value={deudor.nombre} onChange={v=>setD("nombre",v)} placeholder="Nombre y apellidos" error={errors.nombre}/></div>
              <Field label="Cédula" value={deudor.cc} onChange={v=>setD("cc",v)} placeholder="1.002.345.678" error={errors.cc}/>
              <Field label="Teléfono" value={deudor.telefono} onChange={v=>setD("telefono",v)} placeholder="3001234567" error={errors.telefono}/>
              <div style={{gridColumn:"1/-1"}}><Field label="Dirección de residencia" value={deudor.direccion} onChange={v=>setD("direccion",v)} placeholder="Dirección (debe coincidir con recibo de servicios)" error={errors.direccion}/></div>
              <Field label="Dir. oficina (opcional)" value={deudor.dirOficina} onChange={v=>setD("dirOficina",v)} placeholder="Opcional" required={false}/>
              <Field label="Tel. oficina (opcional)" value={deudor.telOficina} onChange={v=>setD("telOficina",v)} placeholder="Opcional" required={false}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.65rem"}}>
              <div style={{gridColumn:"1/3",display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={styles.label}>Programa <span style={{color:palette.orange}}>*</span></label>
                <select style={{...styles.select,borderColor:errors.programa?palette.red:palette.border}} value={deudor.programa} onChange={e=>{setD("programa",e.target.value);setErrors(ev=>({...ev,programa:undefined}))}}>
                  <option value="">Selecciona...</option>
                  {PROGRAMAS.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
                {errors.programa&&<span style={{fontSize:"0.72rem",color:palette.red}}>{errors.programa}</span>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={styles.label}>Semestre <span style={{color:palette.orange}}>*</span></label>
                <select style={{...styles.select,borderColor:errors.semestre?palette.red:palette.border}} value={deudor.semestre} onChange={e=>{setD("semestre",e.target.value);setErrors(ev=>({...ev,semestre:undefined}))}}>
                  <option value="">--</option>
                  {[1,2,3,4,5,6,7,8,9,10].map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:"4px"}}>
              <label style={styles.label}>Jornada</label>
              <div style={{display:"flex",gap:"0.5rem"}}>
                {JORNADAS.map(j=>(
                  <button key={j} style={{flex:1,padding:"0.5rem",border:"1.5px solid",borderColor:deudor.jornada===j?palette.navy:palette.border,borderRadius:"8px",fontSize:"0.78rem",fontWeight:"600",background:deudor.jornada===j?palette.navy+"08":"transparent",color:deudor.jornada===j?palette.navy:palette.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif"}} onClick={()=>setD("jornada",j)}>{j}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {paso===2&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{...styles.infoBox,background:"#e8740e10",border:`1px solid #e8740e25`}}><IconAlertTriangle size={16} style={{color:palette.red,flexShrink:0}} /><p style={{fontSize:"0.78rem",color:palette.text,margin:0,lineHeight:1.5}}>El codeudor debe tener ingreso mensual igual o superior a <strong>2 SMMLV ({fmt(SMMLV2)})</strong>.</p></div>
            <p style={{fontSize:"0.82rem",fontWeight:"700",color:palette.navy,margin:0}}>Datos del codeudor</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.65rem"}}>
              <div style={{gridColumn:"1/-1"}}><Field label="Nombre completo" value={codeudor.nombre} onChange={v=>setC("nombre",v)} placeholder="Nombre y apellidos" error={errors.cnombre}/></div>
              <Field label="Cédula" value={codeudor.cc} onChange={v=>setC("cc",v)} placeholder="1.005.678.901" error={errors.ccc}/>
              <Field label="Teléfono" value={codeudor.telefono} onChange={v=>setC("telefono",v)} placeholder="3007654321" error={errors.ctelefono}/>
              <div style={{gridColumn:"1/-1"}}><Field label="Dirección de residencia" value={codeudor.direccion} onChange={v=>setC("direccion",v)} placeholder="Dirección completa" error={errors.cdireccion}/></div>
              <Field label="Dir. oficina (opcional)" value={codeudor.dirOficina} onChange={v=>setC("dirOficina",v)} placeholder="Opcional" required={false}/>
              <Field label="Tel. oficina (opcional)" value={codeudor.telOficina} onChange={v=>setC("telOficina",v)} placeholder="Opcional" required={false}/>
              <div style={{gridColumn:"1/-1",display:"flex",flexDirection:"column",gap:"4px"}}>
                <label style={styles.label}>Ingreso mensual (COP) <span style={{color:palette.orange}}>*</span></label>
                <input style={{...styles.input,borderColor:errors.cingreso?palette.red:cumple2SMMLV&&codeudor.ingresoMensual?palette.green:palette.border}} type="text" inputMode="numeric" placeholder={`Mínimo ${fmt(SMMLV2)}`} value={formatMiles(codeudor.ingresoMensual)} onChange={e=>{setC("ingresoMensual",e.target.value.replace(/\D/g,""));setErrors(ev=>({...ev,cingreso:undefined}));}}/>
                {codeudor.ingresoMensual&&<span style={{fontSize:"0.72rem",color:cumple2SMMLV?palette.green:palette.red,fontWeight:"600"}}>{cumple2SMMLV?"✓ Cumple el requisito de 2 SMMLV":"✕ No cumple el mínimo requerido"}</span>}
                {errors.cingreso&&<span style={{fontSize:"0.72rem",color:palette.red}}>{errors.cingreso}</span>}
              </div>
            </div>
          </div>
        )}

        {paso===3&&(
          <div style={{display:"flex",flexDirection:"column",gap:"0.75rem"}}>
            <div style={{...styles.infoBox,background:"#1d9e7510",border:`1px solid #1d9e7530`}}><IconCheckCircle size={16} style={{color:palette.green,flexShrink:0}} /><p style={{fontSize:"0.78rem",color:palette.text,margin:0}}>Revisa la información antes de enviar.</p></div>
            {[["Deudor",[["Nombre",deudor.nombre],["Cédula",deudor.cc],["Dirección",deudor.direccion],["Teléfono",deudor.telefono],["Programa",deudor.programa],["Semestre",`${deudor.semestre}° · ${deudor.jornada}`]]],["Codeudor",[["Nombre",codeudor.nombre],["Cédula",codeudor.cc],["Dirección",codeudor.direccion],["Teléfono",codeudor.telefono],["Ingreso mensual",fmt(ingresoNum)]]]].map(([titulo,campos])=>(
              <div key={titulo}>
                <p style={{fontSize:"0.82rem",fontWeight:"700",color:palette.navy,margin:"0 0 4px"}}>{titulo}</p>
                <div style={{background:palette.beige,borderRadius:"10px",padding:"0.75rem 1rem"}}>
                  {campos.map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"0.35rem 0",borderBottom:`1px solid ${palette.border}`}}>
                      <span style={{fontSize:"0.75rem",color:palette.muted}}>{l}</span>
                      <span style={{fontSize:"0.8rem",color:palette.text,fontWeight:"500",maxWidth:"60%",textAlign:"right"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {serverError&&<p style={{fontSize:"0.78rem",color:palette.red,textAlign:"center"}}>{serverError}</p>}
          </div>
        )}

        {paso===4&&(
          <div style={{textAlign:"center",padding:"0.5rem 0 0.75rem"}}>
            <div style={styles.successIcon}>✓</div>
            <p style={{color:palette.text,fontSize:"0.88rem",fontWeight:"600",marginBottom:"0.25rem"}}>Solicitud enviada correctamente</p>
            <p style={{color:palette.muted,fontSize:"0.78rem",marginBottom:"0.5rem",lineHeight:1.5}}>El Departamento Financiero revisará tu solicitud y te notificará al correo institucional.</p>
            <div style={{background:palette.beige,borderRadius:"10px",padding:"0.85rem 1rem",textAlign:"left",marginBottom:"1.5rem"}}>
              <p style={{fontSize:"0.78rem",fontWeight:"700",color:palette.navy,margin:"0 0 6px"}}>Próximos pasos:</p>
              {["Sube los documentos requeridos en la sección Documentos","El crédito será aprobado una vez se verifique toda la documentación","Recibirás notificación a: financiamiento@uniautonoma.edu.co"].map((s,i)=>(
                <p key={i} style={{fontSize:"0.74rem",color:palette.muted,margin:"3px 0",paddingLeft:"0.75rem"}}>• {s}</p>
              ))}
            </div>
            <button style={styles.btnPrimary} onClick={onClose}>Entendido</button>
          </div>
        )}

        {paso<4&&!loading&&(
          <div style={{display:"flex",gap:"0.75rem",marginTop:"1.25rem"}}>
            <button style={styles.btnPrimary} onClick={handleSiguiente}>{paso===3?"Confirmar y enviar ✓":"Siguiente →"}</button>
            {paso>1?<button style={styles.btnSecondary} onClick={()=>{setPaso(p=>p-1);setErrors({});}}>← Volver</button>
                   :<button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>}
          </div>
        )}
        {loading&&<div style={{textAlign:"center",padding:"0.75rem 0"}}><div style={styles.spinner}/></div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ESTUDIANTE
// ══════════════════════════════════════════════════════════════════════════════
function CreditosEstudiante() {
  const [creditos, setCreditos]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalDetalle, setModalDetalle] = useState(null);
  const [modalNuevo, setModalNuevo]     = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  const cargar = async () => {
    try {
      const data = await creditosService.getMisCreditos();
      setCreditos(data.creditos||[]);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ cargar(); },[]);

  if (loading) return <Layout><Spinner/></Layout>;

  const totalDeuda    = creditos.reduce((s,c)=>s+parseFloat(c.monto||0),0);
  const creditoActivo = creditos.find(c=>c.estado==="Activo");
  const enMora        = creditos.filter(c=>c.estado==="En mora").length;

  return (
    <Layout>
      <div style={{animation:"fadeIn 0.35s ease"}}>
        <div style={styles.secHeader}>
          <div><h2 style={styles.secTitle}>Mis créditos</h2><p style={styles.secSub}>Historial y estado de tus créditos estudiantiles</p></div>
          <button style={styles.btnPrimary} onClick={()=>setModalNuevo(true)}>+ Nueva solicitud</button>
        </div>

        {solicitudEnviada&&(
          <div style={{display:"flex",gap:"0.6rem",alignItems:"center",background:"#1d9e7510",border:"1px solid #1d9e7530",borderRadius:"10px",padding:"0.75rem 1rem",marginBottom:"1.25rem"}}>
            <IconCheckCircle size={16} style={{color:palette.green,flexShrink:0}} /><p style={{fontSize:"0.82rem",color:palette.green,margin:0,fontWeight:"500"}}>Solicitud enviada. Sube los documentos requeridos en la sección <strong>Documentos</strong>.</p>
          </div>
        )}

        <div style={styles.statsGrid}>
          <div style={{...styles.statCard,borderTop:`3px solid ${palette.green}`}}><IconCheckCircle size={20} style={{color:palette.green}} /><div><p style={styles.statLabel}>Créditos activos</p><p style={{...styles.statVal,color:palette.green}}>{creditos.filter(c=>c.estado==="Activo").length}</p></div></div>
          <div style={{...styles.statCard,borderTop:`3px solid ${palette.red}`}}><IconCreditCard size={20} style={{color:palette.red}} /><div><p style={styles.statLabel}>Deuda total</p><p style={{...styles.statVal,color:palette.red}}>{fmt(totalDeuda)}</p></div></div>
          <div style={{...styles.statCard,borderTop:`3px solid ${palette.orange}`}}><IconCalendar size={20} style={{color:palette.orange}} /><div><p style={styles.statLabel}>Cuota mensual</p><p style={{...styles.statVal,color:palette.orange}}>{creditoActivo?fmt(creditoActivo.valor_cuota):"—"}</p></div></div>
          <div style={{...styles.statCard,borderTop:`3px solid ${enMora>0?palette.red:palette.muted}`}}><IconAlertTriangle size={20} style={{color:enMora>0?palette.red:palette.muted}} /><div><p style={styles.statLabel}>En mora</p><p style={{...styles.statVal,color:enMora>0?palette.red:palette.muted}}>{enMora}</p></div></div>
        </div>

        {creditos.length===0
          ? <div style={{background:palette.card,borderRadius:"14px",padding:"3rem",textAlign:"center",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
              <div style={{marginBottom:"0.5rem",color:palette.muted}}><IconFileText size={32} strokeWidth={1.5} /></div>
              <p style={{color:palette.muted,fontSize:"0.88rem"}}>No tienes créditos registrados.</p>
              <button style={{...styles.btnPrimary,marginTop:"1rem"}} onClick={()=>setModalNuevo(true)}>+ Solicitar crédito</button>
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:"0.85rem"}}>
              {creditos.map((c,i)=>{
                const color = getEstadoColor(c.estado);
                const borderColor = color==="green"?palette.green:color==="red"?palette.red:color==="orange"?palette.orange:palette.gold;
                return (
                  <div key={c.id} style={{background:palette.card,borderRadius:"13px",padding:"1.1rem 1.25rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)",borderLeft:`4px solid ${borderColor}`,animation:`fadeUp 0.3s ease ${i*0.08}s both`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.75rem",flexWrap:"wrap",gap:"0.5rem"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"3px"}}>
                          <span style={{fontSize:"0.82rem",fontWeight:"700",color:palette.navy}}>{c.codigo}</span>
                          <EstadoBadge estado={c.estado} color={color}/>
                        </div>
                        <p style={{fontSize:"0.8rem",color:palette.muted,margin:0}}>{c.tipo} · {c.periodo}</p>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <p style={{fontSize:"1rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"}}>{fmt(c.monto)}</p>
                        {c.valor_cuota&&<p style={{fontSize:"0.72rem",color:palette.muted,margin:0}}>Cuota: {fmt(c.valor_cuota)}</p>}
                      </div>
                    </div>
                    {c.observacion&&(
                      <div style={{display:"flex",gap:"0.5rem",alignItems:"flex-start",background:palette.red+"08",border:`1px solid ${palette.red}25`,borderRadius:"8px",padding:"0.6rem 0.75rem",marginBottom:"0.75rem"}}>
                        <IconAlertTriangle size={16} style={{color:palette.red,flexShrink:0}} /><p style={{fontSize:"0.75rem",color:palette.red,margin:0}}>{c.observacion}</p>
                      </div>
                    )}
                    <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
                      <span style={{fontSize:"0.72rem",color:palette.muted}}>Solicitado: {fmtDate(c.fecha_solicitud)}</span>
                      {c.fecha_vencimiento&&<span style={{fontSize:"0.72rem",color:palette.muted}}>· Vence: {fmtDate(c.fecha_vencimiento)}</span>}
                    </div>
                    <button style={{...styles.btnVer,marginTop:"0.75rem"}} onClick={()=>setModalDetalle(c)}>Ver detalle →</button>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {modalDetalle&&<ModalDetalle credito={modalDetalle} onClose={()=>setModalDetalle(null)}/>}
      {modalNuevo&&<ModalNuevaSolicitud onClose={()=>setModalNuevo(false)} onEnviada={()=>setSolicitudEnviada(true)}/>}
      <style>{css}</style>
    </Layout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VISTA ADMIN
// ══════════════════════════════════════════════════════════════════════════════
function CreditosAdmin() {
  const [creditos, setCreditos]   = useState([]);
  const [totales, setTotales]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]   = useState("");
  const [filtro, setFiltro]       = useState("todos");
  const [fechas, setFechas]       = useState({ desde:"", hasta:"" });
  const [semestre, setSemestre]   = useState("");
  const [modalGestionar, setModalGestionar] = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await creditosService.getTodos({ buscar:busqueda, estado:filtro==="todos"?"":filtro, desde:fechas.desde, hasta:fechas.hasta, semestre });
      setCreditos(data.creditos||[]);
      setTotales(data.totales||null);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ cargar(); },[filtro, fechas, semestre]);

  const handleBuscar = (e) => { e.preventDefault(); cargar(); };

  return (
    <Layout>
      <div style={{animation:"fadeIn 0.35s ease"}}>
        <div style={styles.secHeader}>
          <div><h2 style={styles.secTitle}>Gestión de créditos</h2><p style={styles.secSub}>Administra todas las solicitudes y créditos activos</p></div>
        </div>

        {totales&&(
          <div style={{...styles.statsGrid,gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))"}}>
            {[
              {label:"Por revisar",val:totales.por_revisar||0,color:palette.orange,Icon:IconFileText},
              {label:"Aprobados/Activos",val:totales.aprobados||0,color:palette.green,Icon:IconCheckCircle},
              {label:"En mora",val:totales.en_mora||0,color:palette.red,Icon:IconAlertTriangle},
              {label:"Total gestionado",val:fmt(totales.monto_total||0),color:palette.navy,Icon:IconDollar},
            ].map(s=>(
              <div key={s.label} style={{...styles.statCard,borderTop:`3px solid ${s.color}`}}>
                <s.Icon size={20} style={{color:s.color}} />
                <div><p style={styles.statLabel}>{s.label}</p><p style={{...styles.statVal,color:s.color}}>{s.val}</p></div>
              </div>
            ))}
          </div>
        )}

        <div style={{background:palette.card,borderRadius:"14px",padding:"1.25rem 1.5rem",boxShadow:"0 2px 10px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",flexWrap:"wrap",gap:"0.6rem",marginBottom:"1rem",alignItems:"center"}}>
            <form onSubmit={handleBuscar} style={{display:"flex",flex:1,minWidth:"200px",gap:"0.5rem"}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.5rem",background:palette.beige,borderRadius:"9px",padding:"0.45rem 0.9rem",flex:1,border:`1px solid ${palette.border}`}}>
                <IconSearch size={16} style={{color:palette.muted,flexShrink:0}} />
                <input style={{border:"none",background:"transparent",flex:1,fontSize:"0.82rem",color:palette.text,fontFamily:"'Inter',sans-serif"}} placeholder="Buscar por nombre, código o cédula..." value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
                {busqueda&&<button type="button" style={{background:"none",border:"none",color:palette.muted,cursor:"pointer",fontSize:"0.75rem"}} onClick={()=>{setBusqueda("");cargar();}}>✕</button>}
              </div>
              <button type="submit" style={{...styles.btnPrimary,padding:"0.45rem 0.9rem",fontSize:"0.8rem"}}>Buscar</button>
            </form>
            <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
              {[["todos","Todos"],["Pendiente","⏳ Pendientes"],["Aprobado","✓ Aprobados"],["Activo","● Activos"],["En mora","⚠ Mora"],["Negado","✕ Negados"]].map(([k,l])=>(
                <button key={k} style={{padding:"0.3rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.75rem",fontWeight:"500",cursor:"pointer",fontFamily:"'Inter',sans-serif",background:filtro===k?palette.navy:"transparent",color:filtro===k?"#fff":palette.muted}} onClick={()=>setFiltro(k)}>{l}</button>
              ))}
            </div>
            <DateFilter value={fechas} onChange={setFechas} />
            <select style={{padding:"0.35rem 0.75rem",border:`1px solid ${palette.border}`,borderRadius:"7px",fontSize:"0.78rem",color:palette.text,background:palette.card,cursor:"pointer",fontFamily:"'Inter',sans-serif"}} value={semestre} onChange={e=>setSemestre(e.target.value)}>
              <option value="">Todos los semestres</option>
              {Array.from({length:10},(_,i)=>i+1).map(s=><option key={s} value={s}>Semestre {s}</option>)}
            </select>
          </div>

          {loading?<Spinner/>:(
            <div style={{display:"flex",flexDirection:"column",gap:"0.6rem"}}>
              {creditos.length===0
                ?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"0.5rem",padding:"2rem"}}><div style={{color:palette.muted}}><IconFileEmpty size={32} strokeWidth={1.5} /></div><p style={{color:palette.muted,fontSize:"0.85rem"}}>No hay créditos que coincidan.</p></div>
                :creditos.map((c,i)=>{
                  const color=getEstadoColor(c.estado);
                  const borderColor=color==="green"?palette.green:color==="red"?palette.red:color==="orange"?palette.orange:color==="gold"?palette.gold:palette.border;
                  return (
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:"0.85rem",background:palette.beige,borderRadius:"11px",padding:"0.9rem 1rem",flexWrap:"wrap",borderLeft:`4px solid ${borderColor}`,animation:`fadeUp 0.3s ease ${i*0.05}s both`}}>
                      <div style={{width:"36px",height:"36px",borderRadius:"50%",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",fontWeight:"700",fontSize:"0.88rem",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{(c.deudor_nombre||c.estudiante_nombre||"?").charAt(0)}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap",marginBottom:"2px"}}>
                          <span style={{fontSize:"0.85rem",fontWeight:"700",color:palette.text}}>{c.deudor_nombre||c.estudiante_nombre}</span>
                          <EstadoBadge estado={c.estado} color={color}/>
                        </div>
                        <p style={{fontSize:"0.72rem",color:palette.muted,margin:"0 0 3px"}}>{c.codigo} · {c.periodo} · Docs: <span style={{color:c.docs_aprobados<c.docs_total?palette.orange:palette.green,fontWeight:"600"}}>{c.docs_aprobados}/{c.docs_total}</span></p>
                        <div style={{display:"flex",gap:"1rem",flexWrap:"wrap"}}>
                          <span style={{fontSize:"0.72rem",color:palette.muted}}>Monto: <strong style={{color:palette.navy}}>{fmt(c.monto)}</strong></span>
                          <span style={{fontSize:"0.72rem",color:palette.muted}}>Solicitud: {fmtDate(c.fecha_solicitud)}</span>
                        </div>
                      </div>
                      <button style={{padding:"0.4rem 0.9rem",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,border:"none",borderRadius:"7px",fontSize:"0.78rem",fontWeight:"600",color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"}} onClick={()=>setModalGestionar(c)}>Gestionar →</button>
                    </div>
                  );
                })
              }
            </div>
          )}
          {creditos.length>0&&<p style={{fontSize:"0.72rem",color:palette.muted,textAlign:"right",marginTop:"0.75rem"}}>{creditos.length} registro{creditos.length!==1?"s":""}</p>}
        </div>
      </div>

      {modalGestionar&&<ModalGestionar credito={modalGestionar} onClose={()=>setModalGestionar(null)} onActualizado={cargar}/>}
      <style>{css}</style>
    </Layout>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function Creditos() {
  const { isAdmin } = useAuth();
  return isAdmin ? <CreditosAdmin/> : <CreditosEstudiante/>;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  @keyframes spin   { to{transform:rotate(360deg)} }
  select,textarea { font-family:'Inter',sans-serif; }
  select:focus,textarea:focus,input:focus { outline:none; border-color:#1e3a5f !important; box-shadow:0 0 0 3px rgba(30,58,95,0.1); }
`;

const styles = {
  secHeader:   {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.5rem",flexWrap:"wrap",gap:"0.75rem"},
  secTitle:    {fontSize:"1.25rem",fontWeight:"700",color:palette.navy,margin:"0 0 2px"},
  secSub:      {fontSize:"0.82rem",color:palette.muted,margin:0},
  statsGrid:   {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"0.85rem",marginBottom:"1.25rem"},
  statCard:    {background:palette.card,borderRadius:"12px",padding:"0.9rem 1rem",display:"flex",alignItems:"center",gap:"0.75rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"},
  statLabel:   {fontSize:"0.7rem",color:palette.muted,margin:"0 0 2px"},
  statVal:     {fontSize:"1rem",fontWeight:"700",margin:0},
  btnVer:      {padding:"0.4rem 0.9rem",background:palette.navy+"10",border:"none",borderRadius:"7px",fontSize:"0.78rem",fontWeight:"600",color:palette.navy,cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  btnPrimary:  {padding:"0.7rem 1.25rem",background:`linear-gradient(135deg,${palette.navy},#2a5080)`,color:"#fff",border:"none",borderRadius:"10px",fontSize:"0.88rem",fontWeight:"600",cursor:"pointer",fontFamily:"'Inter',sans-serif",boxShadow:`0 4px 12px rgba(30,58,95,0.25)`},
  btnSecondary:{padding:"0.7rem 1.25rem",background:"none",border:`1.5px solid ${palette.border}`,borderRadius:"10px",color:palette.muted,fontSize:"0.88rem",cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  modalOverlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",backdropFilter:"blur(3px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:"1rem"},
  modal:       {background:palette.card,borderRadius:"18px",padding:"2rem",width:"100%",maxWidth:"460px",boxShadow:"0 25px 60px rgba(0,0,0,0.3)",animation:"fadeIn 0.25s ease",maxHeight:"92vh",overflowY:"auto"},
  modalHeader: {display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"1.25rem"},
  modalTitle:  {fontSize:"1.1rem",fontWeight:"700",color:palette.navy,margin:0},
  modalSub:    {fontSize:"0.8rem",color:palette.muted,margin:"3px 0 0"},
  closeBtn:    {background:palette.beige,border:"none",borderRadius:"8px",width:"30px",height:"30px",cursor:"pointer",fontSize:"0.85rem",color:palette.muted,fontFamily:"'Inter',sans-serif"},
  infoBox:     {display:"flex",gap:"0.6rem",alignItems:"flex-start",background:palette.beige,borderRadius:"9px",padding:"0.75rem"},
  field:       {display:"flex",flexDirection:"column",gap:"5px"},
  label:       {fontSize:"0.82rem",fontWeight:"600",color:palette.text},
  input:       {padding:"0.7rem 0.9rem",border:`1.5px solid ${palette.border}`,borderRadius:"9px",fontSize:"0.88rem",color:palette.text,background:palette.beige,fontFamily:"'Inter',sans-serif",transition:"border-color 0.2s"},
  select:      {padding:"0.7rem 0.9rem",border:`1.5px solid ${palette.border}`,borderRadius:"9px",fontSize:"0.88rem",color:palette.text,background:palette.beige,cursor:"pointer",fontFamily:"'Inter',sans-serif"},
  spinner:     {width:"32px",height:"32px",margin:"0 auto",border:`3px solid ${palette.beigeAlt}`,borderTopColor:palette.navy,borderRadius:"50%",animation:"spin 0.8s linear infinite"},
  successIcon: {width:"56px",height:"56px",borderRadius:"50%",background:palette.green+"18",color:palette.green,fontSize:"1.5rem",fontWeight:"700",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 1rem"},
};