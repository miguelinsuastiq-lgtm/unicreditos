import { useState, useRef, useEffect } from "react";
import { IconCalendar } from "./Icons";

const palette = {
  navy: "#1e3a5f", text: "#2c3e50", muted: "#6b7a8d",
  card: "#ffffff", border: "rgba(30,58,95,0.12)", beige: "#f3ede1",
};

const hoy = () => new Date().toISOString().split("T")[0];
const restarDias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split("T")[0]; };
const inicioMes = () => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; };
const inicioAnio = () => { const d = new Date(); d.setMonth(0, 1); return d.toISOString().split("T")[0]; };

const PRESETS = [
  { label: "Todas las fechas", desde: "", hasta: "" },
  { label: "Hoy",              desde: hoy(),         hasta: hoy() },
  { label: "Últimos 7 días",   desde: restarDias(7),  hasta: hoy() },
  { label: "Últimos 30 días",  desde: restarDias(30), hasta: hoy() },
  { label: "Este mes",         desde: inicioMes(),    hasta: hoy() },
  { label: "Este año",         desde: inicioAnio(),   hasta: hoy() },
];

// ─── Filtro de fechas estilo Gmail — presets rápidos + rango personalizado ─────
// Uso: <DateFilter value={{desde,hasta}} onChange={({desde,hasta}) => ...} />
export default function DateFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [desdeTmp, setDesdeTmp] = useState(value?.desde || "");
  const [hastaTmp, setHastaTmp] = useState(value?.hasta || "");
  const ref = useRef();

  useEffect(() => {
    const onClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  useEffect(() => { setDesdeTmp(value?.desde || ""); setHastaTmp(value?.hasta || ""); }, [value?.desde, value?.hasta]);

  const activo = value?.desde || value?.hasta;
  const presetActivo = PRESETS.find(p => p.desde === (value?.desde || "") && p.hasta === (value?.hasta || ""));
  const etiqueta = presetActivo ? presetActivo.label : activo ? `${value.desde || "…"} → ${value.hasta || "…"}` : "Todas las fechas";

  const aplicarPreset = (p) => { onChange({ desde: p.desde, hasta: p.hasta }); setOpen(false); };
  const aplicarPersonalizado = () => { onChange({ desde: desdeTmp, hasta: hastaTmp }); setOpen(false); };
  const limpiar = () => { onChange({ desde: "", hasta: "" }); setOpen(false); };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: "flex", alignItems: "center", gap: "6px", padding: "0.45rem 0.85rem",
        borderRadius: "9px", border: `1px solid ${activo ? palette.navy : palette.border}`,
        background: activo ? palette.navy + "10" : palette.card, color: activo ? palette.navy : palette.text,
        fontSize: "0.78rem", fontWeight: activo ? "600" : "500", cursor: "pointer", fontFamily: "'Inter',sans-serif", whiteSpace: "nowrap",
      }}>
        <IconCalendar size={14} />
        {etiqueta}
        {activo && <span onClick={(e) => { e.stopPropagation(); limpiar(); }} style={{ marginLeft: "2px", color: palette.muted, fontWeight: "700" }}>✕</span>}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 50,
          background: palette.card, border: `1px solid ${palette.border}`, borderRadius: "12px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.12)", padding: "0.6rem", width: "260px",
        }}>
          {PRESETS.map(p => (
            <button key={p.label} type="button" onClick={() => aplicarPreset(p)} style={{
              display: "block", width: "100%", textAlign: "left", padding: "0.5rem 0.6rem", borderRadius: "7px",
              border: "none", background: presetActivo?.label === p.label ? palette.beige : "transparent",
              color: palette.text, fontSize: "0.82rem", cursor: "pointer", fontFamily: "'Inter',sans-serif",
            }}>{p.label}</button>
          ))}
          <div style={{ height: "1px", background: palette.border, margin: "0.5rem 0" }} />
          <p style={{ fontSize: "0.7rem", fontWeight: "700", color: palette.muted, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 0.4rem 0.1rem" }}>Rango personalizado</p>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
            <input type="date" value={desdeTmp} onChange={e => setDesdeTmp(e.target.value)}
              style={{ flex: 1, padding: "0.4rem 0.5rem", borderRadius: "7px", border: `1px solid ${palette.border}`, fontSize: "0.75rem", fontFamily: "'Inter',sans-serif" }} />
            <input type="date" value={hastaTmp} onChange={e => setHastaTmp(e.target.value)}
              style={{ flex: 1, padding: "0.4rem 0.5rem", borderRadius: "7px", border: `1px solid ${palette.border}`, fontSize: "0.75rem", fontFamily: "'Inter',sans-serif" }} />
          </div>
          <button type="button" onClick={aplicarPersonalizado} style={{
            width: "100%", padding: "0.5rem", borderRadius: "8px", border: "none",
            background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff",
            fontSize: "0.8rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif",
          }}>Aplicar rango</button>
        </div>
      )}
    </div>
  );
}