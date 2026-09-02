import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import notificacionesService from "../services/notificacionesService";
import { IconBell, IconCheckCircle } from "./Icons";

const palette = {
  navy: "#1e3a5f", orange: "#e8740e", text: "#2c3e50", muted: "#6b7a8d",
  card: "#ffffff", beige: "#f3ede1", border: "rgba(30,58,95,0.12)", red: "#c0392b",
};

// ─── Íconos por tipo de notificación (coherentes con el resto del set) ────────
const ICONO_POR_TIPO = {
  documento_aprobado: "✓", documento_rechazado: "✕", documento_subido: "↑",
  credito_actualizado: "●", nueva_solicitud_credito: "＋",
  pagare_generado: "✎", pagare_firmado: "✓", nueva_solicitud_publica: "✉",
};

function tiempoRelativo(fecha) {
  const diffMs = Date.now() - new Date(fecha).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  const cargar = async () => {
    try {
      const data = await notificacionesService.getMisNotificaciones();
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(data.no_leidas || 0);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 30000); // refresco cada 30s
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const onClickFuera = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const handleClickNotificacion = async (n) => {
    if (!n.leida) {
      try { await notificacionesService.marcarLeida(n.id); } catch (err) { console.error(err); }
      setNotificaciones(prev => prev.map(x => x.id === n.id ? { ...x, leida: 1 } : x));
      setNoLeidas(prev => Math.max(0, prev - 1));
    }
    setAbierto(false);
    if (n.enlace) navigate(n.enlace);
  };

  const handleMarcarTodas = async () => {
    setLoading(true);
    try {
      await notificacionesService.marcarTodasLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 })));
      setNoLeidas(0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setAbierto(o => !o)} style={styles.botonCampana} title="Notificaciones">
        <IconBell size={19} style={{ color: palette.navy }} />
        {noLeidas > 0 && <span style={styles.badge}>{noLeidas > 9 ? "9+" : noLeidas}</span>}
      </button>

      {abierto && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <p style={styles.panelTitle}>Notificaciones</p>
            {noLeidas > 0 && (
              <button onClick={handleMarcarTodas} disabled={loading} style={styles.marcarTodasBtn}>
                {loading ? "..." : "Marcar todas como leídas"}
              </button>
            )}
          </div>

          <div style={styles.lista}>
            {notificaciones.length === 0 ? (
              <div style={styles.vacio}>
                <IconBell size={28} style={{ color: palette.muted, marginBottom: "0.5rem" }} />
                <p style={{ fontSize: "0.82rem", color: palette.muted }}>Sin notificaciones por ahora.</p>
              </div>
            ) : (
              notificaciones.map(n => (
                <button key={n.id} onClick={() => handleClickNotificacion(n)} style={{ ...styles.item, background: n.leida ? palette.card : palette.orange + "0c" }}>
                  <span style={{ ...styles.itemIcono, background: n.leida ? palette.muted + "15" : palette.orange + "18", color: n.leida ? palette.muted : palette.orange }}>
                    {ICONO_POR_TIPO[n.tipo] || "•"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ ...styles.itemTitulo, fontWeight: n.leida ? "500" : "700" }}>{n.titulo}</p>
                    <p style={styles.itemMensaje}>{n.mensaje}</p>
                    <p style={styles.itemFecha}>{tiempoRelativo(n.created_at)}</p>
                  </div>
                  {!n.leida && <span style={styles.puntoNoLeido} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  botonCampana: {
    position: "relative", width: "36px", height: "36px", borderRadius: "50%",
    background: palette.beige, border: "none", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  badge: {
    position: "absolute", top: "-2px", right: "-2px", minWidth: "16px", height: "16px",
    borderRadius: "99px", background: palette.red, color: "#fff", fontSize: "0.62rem",
    fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px",
  },
  panel: {
    position: "absolute", top: "calc(100% + 10px)", right: 0, width: "340px", maxHeight: "440px",
    background: palette.card, borderRadius: "14px", border: `1px solid ${palette.border}`,
    boxShadow: "0 14px 40px rgba(0,0,0,0.14)", overflow: "hidden", zIndex: 100,
    display: "flex", flexDirection: "column",
  },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1rem", borderBottom: `1px solid ${palette.border}` },
  panelTitle: { fontSize: "0.9rem", fontWeight: "700", color: palette.navy },
  marcarTodasBtn: { background: "none", border: "none", color: palette.navy, fontSize: "0.72rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif" },
  lista: { overflowY: "auto", flex: 1 },
  vacio: { display: "flex", flexDirection: "column", alignItems: "center", padding: "2.5rem 1rem" },
  item: {
    display: "flex", gap: "0.65rem", width: "100%", textAlign: "left", padding: "0.75rem 1rem",
    border: "none", borderBottom: `1px solid ${palette.border}`, cursor: "pointer", fontFamily: "'Inter',sans-serif",
  },
  itemIcono: {
    width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: "700",
  },
  itemTitulo: { fontSize: "0.82rem", color: palette.text, margin: "0 0 2px" },
  itemMensaje: { fontSize: "0.76rem", color: palette.muted, margin: "0 0 3px", lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  itemFecha: { fontSize: "0.68rem", color: palette.muted, margin: 0 },
  puntoNoLeido: { width: "8px", height: "8px", borderRadius: "50%", background: palette.orange, flexShrink: 0, marginTop: "4px" },
};