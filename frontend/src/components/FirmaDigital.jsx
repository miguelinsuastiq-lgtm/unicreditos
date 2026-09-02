import { useRef, useEffect, useState } from "react";

const palette = { navy: "#1e3a5f", border: "rgba(30,58,95,0.25)", muted: "#6b7a8d", card: "#ffffff" };

// ─── Panel de firma digital (canvas) ───────────────────────────────────────────
// Exporta SIEMPRE un PNG con fondo blanco sólido (sin transparencia) — así el
// backend no depende de que el servidor PHP tenga GD/Imagick instalado, algo
// que no se puede garantizar en cualquier XAMPP.
export default function FirmaDigital({ value, onChange }) {
  const canvasRef = useRef(null);
  const dibujando = useRef(false);
  const [vacio, setVacio] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = palette.navy;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const coordsDesdeEvento = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const escalaX = canvas.width / rect.width;
    const escalaY = canvas.height / rect.height;
    const punto = e.touches ? e.touches[0] : e;
    return { x: (punto.clientX - rect.left) * escalaX, y: (punto.clientY - rect.top) * escalaY };
  };

  const iniciar = (e) => {
    e.preventDefault();
    dibujando.current = true;
    const { x, y } = coordsDesdeEvento(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const mover = (e) => {
    if (!dibujando.current) return;
    e.preventDefault();
    const { x, y } = coordsDesdeEvento(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    if (vacio) setVacio(false);
  };

  const terminar = () => {
    if (!dibujando.current) return;
    dibujando.current = false;
    // JPEG en vez de PNG: los navegadores exportan el canvas SIEMPRE con canal
    // alfa en PNG (aunque el fondo sea blanco sólido), y eso obliga a que el
    // servidor tenga GD o Imagick instalados para poder leerlo. JPEG no tiene
    // canal alfa nunca, así que funciona en cualquier XAMPP sin configurar nada.
    onChange(canvasRef.current.toDataURL("image/jpeg", 0.95));
  };

  const limpiar = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setVacio(true);
    onChange("");
  };

  return (
    <div>
      <div style={{ position: "relative", border: `2px dashed ${vacio ? palette.border : palette.navy}`, borderRadius: "10px", overflow: "hidden", background: palette.card }}>
        <canvas
          ref={canvasRef} width={600} height={180}
          style={{ width: "100%", height: "150px", display: "block", cursor: "crosshair", touchAction: "none" }}
          onMouseDown={iniciar} onMouseMove={mover} onMouseUp={terminar} onMouseLeave={terminar}
          onTouchStart={iniciar} onTouchMove={mover} onTouchEnd={terminar}
        />
        {vacio && (
          <p style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: palette.muted, fontSize: "0.85rem", pointerEvents: "none", margin: 0 }}>
            Firma aquí con el mouse o el dedo
          </p>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
        <span style={{ fontSize: "0.72rem", color: palette.muted }}>Esta firma se usará en los 3 documentos generados</span>
        <button type="button" onClick={limpiar} style={{ background: "none", border: "none", color: palette.navy, fontSize: "0.78rem", fontWeight: "600", cursor: "pointer", textDecoration: "underline" }}>
          Borrar y firmar de nuevo
        </button>
      </div>
    </div>
  );
}