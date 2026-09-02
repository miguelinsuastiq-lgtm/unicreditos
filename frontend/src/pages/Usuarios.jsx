import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import usuariosService from "../services/usuariosService";
import {
  IconShield, IconUser, IconKey, IconBan, IconEdit, IconEye, IconCheckCircle,
  IconClipboard, IconSearch, IconInbox, IconAlertTriangle,
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

const fmtDate = (d) => d ? new Date(d).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric" }) : "—";
const fmt     = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(n||0);

const PROGRAMAS = [
  "Ingeniería de Software", "Contaduría Pública", "Derecho", "Psicología",
  "Medicina", "Administración de Empresas", "Enfermería", "Arquitectura",
  "Ingeniería Civil", "Comunicación Social",
];

const JORNADAS = ["Diurna", "Nocturna", "Virtual"];

function Spinner() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem" }}><div style={{ width: "36px", height: "36px", border: `3px solid ${palette.beigeAlt}`, borderTopColor: palette.navy, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /></div>;
}

// ─── Badges ───────────────────────────────────────────────────────────────────
function EstadoBadge({ estado }) {
  const map = {
    Activo:    { bg: "#1d9e7518", text: "#1d9e75", icon: "●" },
    Inactivo:  { bg: "#6b7a8d18", text: "#6b7a8d", icon: "○" },
  };
  const c = map[estado] || map.Inactivo;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "0.22rem 0.7rem", borderRadius: "99px", fontSize: "0.72rem", fontWeight: "600", background: c.bg, color: c.text, whiteSpace: "nowrap" }}>{c.icon} {estado}</span>;
}

function RolBadge({ rol }) {
  const map = { admin: { bg: palette.gold + "18", text: palette.gold, Icon: IconShield }, estudiante: { bg: palette.navy + "10", text: palette.navy, Icon: IconUser } };
  const c = map[rol] || map.estudiante;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "0.22rem 0.7rem", borderRadius: "99px", fontSize: "0.72rem", fontWeight: "600", background: c.bg, color: c.text, whiteSpace: "nowrap" }}><c.Icon size={12} strokeWidth={2.5} /> {rol.charAt(0).toUpperCase() + rol.slice(1)}</span>;
}

function CreditoEstadoBadge({ estado }) {
  if (!estado) return null;
  const map = { "Activo": palette.green, "Aprobado": palette.green, "Pendiente": palette.orange, "En revisión": palette.gold, "Devuelta": palette.orange, "Negada": palette.red, "En mora": palette.red, "Cerrado": palette.muted };
  const color = map[estado] || palette.muted;
  return <span style={{ fontSize: "0.68rem", fontWeight: "600", color, background: color + "15", padding: "0.15rem 0.5rem", borderRadius: "99px" }}>{estado}</span>;
}

// ─── Modal: Ver detalle completo del usuario ───────────────────────────────────
function ModalDetalleUsuario({ usuario, onClose }) {
  const [detalle, setDetalle]   = useState(null);
  const [creditos, setCreditos] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await usuariosService.getDetalle(usuario.id);
        setDetalle(data.usuario || usuario);
        setCreditos(data.creditos || []);
      } catch (err) { console.error(err); setDetalle(usuario); }
      finally { setLoading(false); }
    })();
  }, [usuario.id]);

  const u = detalle || usuario;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "520px" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>Ficha del usuario</h3>
            <p style={styles.modalSub}>{u.codigo} · {u.cc}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Avatar + nombre */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", background: palette.beige, borderRadius: "12px", padding: "1rem 1.1rem", marginBottom: "1.25rem" }}>
          <div style={{ ...styles.avatar, width: "52px", height: "52px", fontSize: "1.2rem" }}>{u.nombre.charAt(0)}</div>
          <div>
            <p style={{ fontSize: "1rem", fontWeight: "700", color: palette.navy, margin: "0 0 4px" }}>{u.nombre}</p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              <EstadoBadge estado={u.estado} />
              <RolBadge rol={u.rol} />
            </div>
          </div>
        </div>

        {loading ? <Spinner/> : (<>
          {/* Datos académicos */}
          <p style={styles.seccionLabel}>Datos de la cuenta</p>
          <div style={styles.detalleGrid}>
            {[
              { label: "Código",        val: u.codigo },
              { label: "Cédula",        val: u.cc },
              { label: "Correo",        val: u.email },
              { label: "Teléfono",      val: u.telefono || "—" },
              { label: "Dirección",     val: u.direccion || "—" },
              { label: "Programa",      val: u.programa || "—" },
              { label: "Semestre",      val: u.semestre > 0 ? `Semestre ${u.semestre}` : "—" },
              { label: "Jornada",       val: u.jornada || "—" },
              { label: "Registro",      val: fmtDate(u.fecha_registro) },
              { label: "Último acceso", val: fmtDate(u.ultimo_login) },
            ].map(r => (
              <div key={r.label} style={styles.detalleRow}>
                <span style={styles.detalleLabel}>{r.label}</span>
                <span style={styles.detalleVal}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* Créditos del estudiante */}
          {u.rol === "estudiante" && (
            <>
              <p style={{ ...styles.seccionLabel, marginTop: "1rem" }}>Créditos ({creditos.length})</p>
              {creditos.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: palette.muted, margin: 0 }}>Este estudiante aún no tiene créditos registrados.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {creditos.map(c => (
                    <div key={c.id} style={{ background: palette.beige, borderRadius: "9px", padding: "0.6rem 0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <div>
                        <p style={{ fontSize: "0.8rem", fontWeight: "600", color: palette.navy, margin: 0 }}>{c.codigo} — {c.tipo}{c.periodo ? ` (${c.periodo})` : ""}</p>
                        <p style={{ fontSize: "0.72rem", color: palette.muted, margin: "2px 0 0" }}>{fmt(c.monto)} · Solicitado {fmtDate(c.fecha_solicitud)}</p>
                      </div>
                      <CreditoEstadoBadge estado={c.estado} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>)}

        <button style={{ ...styles.btnSecondary, width: "100%", marginTop: "1.25rem" }} onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

// ─── Modal: Editar usuario ─────────────────────────────────────────────────────
function ModalEditarUsuario({ usuario, onClose, onActualizado }) {
  const [nombre,    setNombre]    = useState(usuario.nombre);
  const [email,     setEmail]     = useState(usuario.email);
  const [telefono,  setTelefono]  = useState(usuario.telefono || "");
  const [direccion, setDireccion] = useState(usuario.direccion || "");
  const [programa,  setPrograma]  = useState(usuario.programa || "—");
  const [semestre,  setSemestre]  = useState(usuario.semestre || 0);
  const [jornada,   setJornada]   = useState(usuario.jornada || "—");
  const [rol,       setRol]       = useState(usuario.rol);
  const [estado,    setEstado]    = useState(usuario.estado);
  const [loading,   setLoading]   = useState(false);
  const [paso,      setPaso]      = useState(1);
  const [error,     setError]     = useState("");

  const handleGuardar = async () => {
    if (!email.includes("@uniautonoma.edu.co")) { setError("El correo debe ser institucional (@uniautonoma.edu.co)."); return; }
    setError(""); setLoading(true);
    try {
      await usuariosService.actualizar(usuario.id, { nombre, email, telefono, direccion, programa, semestre, jornada, rol, estado });
      setLoading(false);
      setPaso(2);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "No se pudo actualizar el usuario.");
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "480px" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>{paso === 2 ? "Usuario actualizado" : "Editar usuario"}</h3>
            <p style={styles.modalSub}>{usuario.codigo} · C.C. {usuario.cc}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {paso === 1 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={styles.field}>
                <label style={styles.label}>Nombre completo</label>
                <input style={styles.input} value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Correo institucional</label>
                <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={styles.field}>
                  <label style={styles.label}>Teléfono</label>
                  <input style={styles.input} value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Dirección</label>
                  <input style={styles.input} value={direccion} onChange={e => setDireccion(e.target.value)} />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Programa académico</label>
                <select style={styles.select} value={programa} onChange={e => setPrograma(e.target.value)}>
                  <option value="—">—</option>
                  {PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={styles.field}>
                  <label style={styles.label}>Semestre</label>
                  <select style={styles.select} value={semestre} onChange={e => setSemestre(Number(e.target.value))}>
                    <option value={0}>—</option>
                    {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Semestre {s}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Jornada</label>
                  <select style={styles.select} value={jornada} onChange={e => setJornada(e.target.value)}>
                    <option value="—">—</option>
                    {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={styles.field}>
                  <label style={styles.label}>Rol</label>
                  <select style={styles.select} value={rol} onChange={e => setRol(e.target.value)}>
                    <option value="estudiante">Estudiante</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Estado</label>
                  <select style={styles.select} value={estado} onChange={e => setEstado(e.target.value)}>
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <p style={{ fontSize: "0.78rem", color: palette.red, margin: "0.5rem 0 0" }}>{error}</p>}

            {loading
              ? <div style={{ textAlign: "center", padding: "0.75rem 0" }}><div style={styles.spinner} /></div>
              : <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                  <button style={styles.btnPrimary} onClick={handleGuardar}>Guardar cambios ✓</button>
                  <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
                </div>
            }
          </>
        )}

        {paso === 2 && (
          <div style={{ textAlign: "center", padding: "0.5rem 0 0.75rem" }}>
            <div style={styles.successIcon}>✓</div>
            <p style={{ color: palette.text, fontSize: "0.88rem", marginBottom: "0.25rem", fontWeight: "600" }}>Usuario actualizado</p>
            <p style={{ color: palette.muted, fontSize: "0.78rem", marginBottom: "1.5rem" }}>
              Los cambios se aplicaron a la cuenta de <strong>{nombre}</strong>.
            </p>
            <button style={styles.btnPrimary} onClick={() => { onActualizado(); onClose(); }}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal: Crear usuario ──────────────────────────────────────────────────────
// ─── Modal: Crear usuario ──────────────────────────────────────────────────────
function ModalCrearUsuario({ onClose, onCreado }) {
  const [form, setForm] = useState({
    nombre: "", codigo: "", cc: "", email: "", password: "",
    programa: PROGRAMAS[0], semestre: 1, jornada: "Diurna",
    rol: "estudiante", estado: "Activo",
  });
  const [loading, setLoading] = useState(false);
  const [paso,    setPaso]    = useState(1);
  const [error,   setError]   = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCrear = async () => {
    if (!form.nombre || !form.codigo || !form.cc || !form.email || !form.password) { setError("Completa todos los campos obligatorios."); return; }
    if (!form.email.includes("@uniautonoma.edu.co")) { setError("El correo debe ser institucional (@uniautonoma.edu.co)."); return; }
    if (form.password.length < 8) { setError("La contraseña debe tener mínimo 8 caracteres."); return; }
    setError(""); setLoading(true);
    try {
      await usuariosService.crear(form);
      setLoading(false);
      setPaso(2);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "No se pudo crear el usuario.");
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "480px" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>{paso === 2 ? "Usuario creado" : "Nuevo usuario"}</h3>
            <p style={styles.modalSub}>{paso === 2 ? "" : "Registro en el sistema UniCréditos"}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {paso === 1 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div style={styles.field}>
                  <label style={styles.label}>Código estudiantil *</label>
                  <input style={styles.input} placeholder="Ej: 2024-1011" value={form.codigo} onChange={e => set("codigo", e.target.value)} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Cédula *</label>
                  <input style={styles.input} placeholder="Ej: 1.002.345.678" value={form.cc} onChange={e => set("cc", e.target.value)} />
                </div>
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Nombre completo *</label>
                <input style={styles.input} placeholder="Nombre y apellidos" value={form.nombre} onChange={e => set("nombre", e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Correo institucional *</label>
                <input style={styles.input} type="email" placeholder="usuario@uniautonoma.edu.co" value={form.email} onChange={e => set("email", e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Contraseña provisional *</label>
                <input style={styles.input} type="password" placeholder="Mínimo 8 caracteres" value={form.password} onChange={e => set("password", e.target.value)} />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Programa académico</label>
                <select style={styles.select} value={form.programa} onChange={e => set("programa", e.target.value)}>
                  {PROGRAMAS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div style={styles.field}>
                  <label style={styles.label}>Semestre</label>
                  <select style={styles.select} value={form.semestre} onChange={e => set("semestre", Number(e.target.value))}>
                    {[1,2,3,4,5,6,7,8,9,10].map(s => <option key={s} value={s}>Sem. {s}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Jornada</label>
                  <select style={styles.select} value={form.jornada} onChange={e => set("jornada", e.target.value)}>
                    {JORNADAS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Rol</label>
                  <select style={styles.select} value={form.rol} onChange={e => set("rol", e.target.value)}>
                    <option value="estudiante">Estudiante</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            {error && <p style={{ fontSize: "0.78rem", color: palette.red, margin: "0.5rem 0 0" }}>{error}</p>}

            {loading
              ? <div style={{ textAlign: "center", padding: "0.75rem 0" }}><div style={styles.spinner} /></div>
              : <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                  <button style={styles.btnPrimary} onClick={handleCrear}>Crear usuario ✓</button>
                  <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
                </div>
            }
          </>
        )}

        {paso === 2 && (
          <div style={{ textAlign: "center", padding: "0.5rem 0 0.75rem" }}>
            <div style={styles.successIcon}>✓</div>
            <p style={{ color: palette.text, fontSize: "0.88rem", marginBottom: "0.25rem", fontWeight: "600" }}>Usuario creado correctamente</p>
            <p style={{ color: palette.muted, fontSize: "0.78rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
              <strong>{form.nombre}</strong> fue registrado con el código <strong>{form.codigo}</strong>.<br />
              Comparte la contraseña provisional con el usuario para su primer ingreso.
            </p>
            <button style={styles.btnPrimary} onClick={() => { onCreado(); onClose(); }}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal: Restablecer contraseña ────────────────────────────────────────────
// El backend no tiene envío de enlace por correo — el admin asigna la nueva
// contraseña directamente (usuariosService.cambiarPassword).
function ModalResetPassword({ usuario, onClose }) {
  const [nuevaPass, setNuevaPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [hecho, setHecho]     = useState(false);

  const handleGuardar = async () => {
    if (nuevaPass.length < 8) { setError("La contraseña debe tener mínimo 8 caracteres."); return; }
    setError(""); setLoading(true);
    try {
      await usuariosService.cambiarPassword(usuario.id, nuevaPass);
      setLoading(false);
      setHecho(true);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "No se pudo cambiar la contraseña.");
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>{hecho ? "Contraseña actualizada" : "Restablecer contraseña"}</h3><p style={styles.modalSub}>{usuario.nombre}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        {!hecho ? (
          <>
            <div style={styles.infoBox}>
              <IconKey size={18} style={{color:palette.orange,flexShrink:0}} />
              <p style={{ fontSize: "0.8rem", color: palette.text, margin: 0, lineHeight: 1.5 }}>
                Asigna una nueva contraseña provisional para <strong>{usuario.email}</strong>. Se cerrarán todas sus sesiones activas.
              </p>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Nueva contraseña *</label>
              <input style={styles.input} type="password" placeholder="Mínimo 8 caracteres" value={nuevaPass} onChange={e => { setNuevaPass(e.target.value); setError(""); }} />
            </div>
            {error && <p style={{ fontSize: "0.78rem", color: palette.red, margin: "0.5rem 0 0" }}>{error}</p>}
            {loading
              ? <div style={{ textAlign: "center", padding: "0.75rem 0" }}><div style={styles.spinner} /></div>
              : <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
                  <button style={{ ...styles.btnPrimary, background: `linear-gradient(135deg,${palette.orange},#d4640a)` }} onClick={handleGuardar}>Guardar →</button>
                  <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
                </div>
            }
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "0.5rem 0 0.75rem" }}>
            <div style={{ ...styles.successIcon, background: palette.orange + "18", color: palette.orange }}><IconKey size={22}/></div>
            <p style={{ color: palette.text, fontSize: "0.88rem", marginBottom: "0.25rem", fontWeight: "600" }}>Contraseña actualizada</p>
            <p style={{ color: palette.muted, fontSize: "0.78rem", marginBottom: "1.5rem" }}>Comparte la nueva contraseña con el usuario de forma segura.</p>
            <button style={styles.btnPrimary} onClick={onClose}>Aceptar</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal: Activar / Desactivar ───────────────────────────────────────────────
function ModalCambiarEstado({ usuario, nuevoEstado, onClose, onConfirmado }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const esDesactivar = nuevoEstado === "Inactivo";

  const handleConfirmar = async () => {
    setError(""); setLoading(true);
    try {
      await usuariosService.cambiarEstado(usuario.id, nuevoEstado);
      onConfirmado();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || "No se pudo cambiar el estado.");
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={{ ...styles.modal, maxWidth: "380px" }} onClick={e => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div><h3 style={styles.modalTitle}>{esDesactivar ? "Desactivar usuario" : "Activar usuario"}</h3><p style={styles.modalSub}>{usuario.nombre}</p></div>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.infoBox}>
          {esDesactivar ? <IconAlertTriangle size={20} style={{color:palette.orange}}/> : <IconCheckCircle size={20} style={{color:palette.green}}/>}
          <p style={{ fontSize: "0.82rem", color: palette.text, margin: 0, lineHeight: 1.5 }}>
            {esDesactivar
              ? "El usuario no podrá iniciar sesión mientras esté inactivo. Se cerrarán todas sus sesiones activas. Sus créditos no se ven afectados."
              : "El usuario recuperará el acceso completo al sistema UniCréditos."}
          </p>
        </div>
        {error && <p style={{ fontSize: "0.78rem", color: palette.red, margin: "0.5rem 0 0" }}>{error}</p>}
        {loading
          ? <div style={{ textAlign: "center", padding: "0.75rem 0" }}><div style={styles.spinner} /></div>
          : <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
              <button style={{ ...styles.btnPrimary, background: esDesactivar ? `linear-gradient(135deg,${palette.red},#a93226)` : `linear-gradient(135deg,${palette.green},#16a085)` }}
                onClick={handleConfirmar}>
                {esDesactivar ? "Desactivar" : "Activar"} ✓
              </button>
              <button style={styles.btnSecondary} onClick={onClose}>Cancelar</button>
            </div>
        }
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL — Solo admin
// ══════════════════════════════════════════════════════════════════════════════
export default function Usuarios() {
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios]           = useState([]);
  const [totales, setTotales]             = useState(null);
  const [loading, setLoading]             = useState(true);
  const [busqueda, setBusqueda]           = useState("");
  const [filtroRol, setFiltroRol]         = useState("todos");
  const [filtroEstado, setFiltroEstado]   = useState("todos");
  const [filtroProg, setFiltroProg]       = useState("todos");
  const [fechas, setFechas]               = useState({ desde:"", hasta:"" });
  const [semestre, setSemestre]           = useState("");
  const [modalDetalle, setModalDetalle]   = useState(null);
  const [modalEditar, setModalEditar]     = useState(null);
  const [modalCrear, setModalCrear]       = useState(false);
  const [modalReset, setModalReset]       = useState(null);
  const [modalEstado, setModalEstado]     = useState(null);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await usuariosService.getTodos({
        rol:    filtroRol    === "todos" ? "" : filtroRol,
        estado: filtroEstado === "todos" ? "" : filtroEstado,
        buscar: busqueda,
        desde:  fechas.desde,
        hasta:  fechas.hasta,
        semestre,
      });
      setUsuarios(data.usuarios || []);
      setTotales(data.totales || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) cargar(); }, [filtroRol, filtroEstado, fechas, semestre]);

  if (!isAdmin) {
    return (
      <Layout>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: "1rem" }}>
          <div style={{color:palette.muted}}><IconBan size={48} strokeWidth={1.5} /></div>
          <p style={{ color: palette.navy, fontWeight: "700", fontSize: "1rem" }}>Acceso restringido</p>
          <p style={{ color: palette.muted, fontSize: "0.85rem" }}>Esta sección es solo para administradores.</p>
        </div>
      </Layout>
    );
  }

  const handleBuscar = (e) => { e.preventDefault(); cargar(); };
  const handleActualizado = () => { cargar(); };
  const handleCreado = () => { cargar(); };
  const handleCambiarEstado = () => { cargar(); };

  // La búsqueda por programa no la soporta el backend, se filtra en cliente
  const filtrados = usuarios.filter(u => filtroProg === "todos" || u.programa === filtroProg);
  const programasUnicos = [...new Set(usuarios.filter(u => u.programa && u.programa !== "—").map(u => u.programa))];

  const totalEstudiantes = totales?.estudiantes || 0;
  const totalActivos     = totales?.activos     || 0;
  const totalInactivos   = totales?.inactivos   || 0;
  const totalUsuarios    = totales?.total       || 0;

  return (
    <Layout>
      <div style={{ animation: "fadeIn 0.35s ease" }}>

        <div style={styles.secHeader}>
          <div>
            <h2 style={styles.secTitle}>Gestión de usuarios</h2>
            <p style={styles.secSub}>Administra las cuentas del sistema UniCréditos — Corporación Universitaria Autónoma del Cauca</p>
          </div>
          <button style={styles.btnPrimary} onClick={() => setModalCrear(true)}>+ Nuevo usuario</button>
        </div>

        {/* Stats */}
        <div style={{ ...styles.statsGrid, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          {[
            { label: "Estudiantes",        val: totalEstudiantes, color: palette.navy,   Icon: IconUser },
            { label: "Activos",            val: totalActivos,     color: palette.green,  Icon: IconCheckCircle },
            { label: "Inactivos",          val: totalInactivos,   color: totalInactivos > 0 ? palette.red : palette.muted, Icon: IconBan },
            { label: "Total usuarios",     val: totalUsuarios,    color: palette.navy,   Icon: IconClipboard },
          ].map(s => (
            <div key={s.label} style={{ ...styles.statCard, borderTop: `3px solid ${s.color}` }}>
              <s.Icon size={20} style={{color:s.color}} />
              <div><p style={styles.statLabel}>{s.label}</p><p style={{ ...styles.statVal, color: s.color }}>{s.val}</p></div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          {/* Controles */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginBottom: "1rem", alignItems: "center" }}>
            <form onSubmit={handleBuscar} style={{ display: "flex", flex: 1, minWidth: "220px", gap: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: palette.beige, borderRadius: "9px", padding: "0.45rem 0.9rem", flex: 1, border: `1px solid ${palette.border}` }}>
                <IconSearch size={16} style={{color:palette.muted,flexShrink:0}} />
                <input style={{ border: "none", background: "transparent", flex: 1, fontSize: "0.82rem", color: palette.text, fontFamily: "'Inter',sans-serif" }}
                  placeholder="Buscar por nombre, código, cédula o correo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                {busqueda && <button type="button" style={{ background: "none", border: "none", color: palette.muted, cursor: "pointer", fontSize: "0.75rem" }} onClick={() => { setBusqueda(""); cargar(); }}>✕</button>}
              </div>
              <button type="submit" style={{ ...styles.btnPrimary, padding: "0.45rem 0.9rem", fontSize: "0.8rem" }}>Buscar</button>
            </form>
            <div style={{ display: "flex", gap: "4px" }}>
              {[["todos","Todos"],["estudiante","Estudiantes"],["admin","Admins"]].map(([k,l]) => (
                <button key={k} style={{ ...styles.filtroBtn, background: filtroRol === k ? palette.navy : "transparent", color: filtroRol === k ? "#fff" : palette.muted }} onClick={() => setFiltroRol(k)}>{l}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "4px" }}>
              {[["todos","Todos"],["Activo","Activos"],["Inactivo","Inactivos"]].map(([k,l]) => (
                <button key={k} style={{ ...styles.filtroBtn, background: filtroEstado === k ? palette.navy : "transparent", color: filtroEstado === k ? "#fff" : palette.muted }} onClick={() => setFiltroEstado(k)}>{l}</button>
              ))}
            </div>
            <select style={{ padding: "0.35rem 0.75rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.78rem", color: palette.text, background: palette.card, cursor: "pointer", fontFamily: "'Inter',sans-serif" }} value={filtroProg} onChange={e => setFiltroProg(e.target.value)}>
              <option value="todos">Todos los programas</option>
              {programasUnicos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <DateFilter value={fechas} onChange={setFechas} />
            <select style={{ padding: "0.35rem 0.75rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.78rem", color: palette.text, background: palette.card, cursor: "pointer", fontFamily: "'Inter',sans-serif" }} value={semestre} onChange={e => setSemestre(e.target.value)}>
              <option value="">Todos los semestres</option>
              {Array.from({length:10},(_,i)=>i+1).map(s => <option key={s} value={s}>Semestre {s}</option>)}
            </select>
          </div>

          {/* Lista */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {loading ? <Spinner/> : filtrados.length === 0
              ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", padding: "2rem" }}><div style={{color:palette.muted}}><IconInbox size={32} strokeWidth={1.5} /></div><p style={{ color: palette.muted, fontSize: "0.85rem" }}>Sin usuarios que coincidan.</p></div>
              : filtrados.map((u, i) => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.9rem", background: palette.beige, borderRadius: "11px", padding: "0.9rem 1.1rem", flexWrap: "wrap", animation: `fadeUp 0.3s ease ${i * 0.04}s both`, borderLeft: `4px solid ${u.estado === "Activo" ? palette.green : palette.muted}` }}>

                  {/* Avatar */}
                  <div style={{ ...styles.avatar, background: u.rol === "admin" ? `linear-gradient(135deg,${palette.gold},#a07d10)` : `linear-gradient(135deg,${palette.navy},#2a5080)` }}>
                    {u.nombre.charAt(0)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "2px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.88rem", fontWeight: "700", color: palette.text }}>{u.nombre}</span>
                      <EstadoBadge estado={u.estado} />
                      <RolBadge rol={u.rol} />
                    </div>
                    <p style={{ fontSize: "0.72rem", color: palette.muted, margin: "0 0 3px" }}>
                      {u.codigo} · C.C. {u.cc} · {u.email}
                    </p>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                      {u.programa && u.programa !== "—" && (
                        <span style={{ fontSize: "0.7rem", color: palette.muted }}>
                          {u.programa}{u.semestre > 0 ? ` · Sem. ${u.semestre}` : ""} · {u.jornada}
                        </span>
                      )}
                      {u.creditos_activos > 0 && (
                        <>
                          <span style={{ fontSize: "0.7rem", color: palette.muted }}>|</span>
                          <span style={{ fontSize: "0.7rem", color: palette.navy, fontWeight: "600" }}>
                            {u.creditos_activos} crédito{u.creditos_activos > 1 ? "s" : ""} activo{u.creditos_activos > 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0, flexWrap: "wrap" }}>
                    <button style={{ padding: "0.3rem 0.65rem", background: palette.navy + "10", border: "none", borderRadius: "6px", fontSize: "0.72rem", fontWeight: "600", color: palette.navy, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                      onClick={() => setModalDetalle(u)}><IconEye size={13}/> Ver</button>
                    <button style={{ padding: "0.3rem 0.65rem", background: palette.gold + "15", border: "none", borderRadius: "6px", fontSize: "0.72rem", fontWeight: "600", color: palette.gold, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                      onClick={() => setModalEditar(u)}><IconEdit size={13}/> Editar</button>
                    <button style={{ padding: "0.3rem 0.65rem", background: palette.orange + "12", border: "none", borderRadius: "6px", fontSize: "0.72rem", fontWeight: "600", color: palette.orange, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                      onClick={() => setModalReset(u)}><IconKey size={13}/></button>
                    {u.estado === "Inactivo"
                      ? <button style={{ padding: "0.3rem 0.65rem", background: palette.green + "15", border: "none", borderRadius: "6px", fontSize: "0.72rem", fontWeight: "600", color: palette.green, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                          onClick={() => setModalEstado({ usuario: u, nuevoEstado: "Activo" })}><IconCheckCircle size={13}/> Activar</button>
                      : <button style={{ padding: "0.3rem 0.65rem", background: palette.red + "12", border: "none", borderRadius: "6px", fontSize: "0.72rem", fontWeight: "600", color: palette.red, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                          onClick={() => setModalEstado({ usuario: u, nuevoEstado: "Inactivo" })}><IconBan size={13}/></button>
                    }
                  </div>
                </div>
              ))
            }
          </div>

          {!loading && filtrados.length > 0 && (
            <p style={{ fontSize: "0.72rem", color: palette.muted, textAlign: "right", marginTop: "0.75rem" }}>
              {filtrados.length} usuario{filtrados.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Modales */}
      {modalDetalle && <ModalDetalleUsuario usuario={modalDetalle} onClose={() => setModalDetalle(null)} />}
      {modalEditar  && <ModalEditarUsuario  usuario={modalEditar}  onClose={() => setModalEditar(null)}  onActualizado={handleActualizado} />}
      {modalCrear   && <ModalCrearUsuario   onClose={() => setModalCrear(false)} onCreado={handleCreado} />}
      {modalReset   && <ModalResetPassword  usuario={modalReset}   onClose={() => setModalReset(null)} />}
      {modalEstado  && <ModalCambiarEstado  usuario={modalEstado.usuario} nuevoEstado={modalEstado.nuevoEstado} onClose={() => setModalEstado(null)} onConfirmado={handleCambiarEstado} />}

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
  secHeader:   { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" },
  secTitle:    { fontSize: "1.25rem", fontWeight: "700", color: palette.navy, margin: "0 0 2px" },
  secSub:      { fontSize: "0.82rem", color: palette.muted, margin: 0 },
  statsGrid:   { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "0.85rem", marginBottom: "1.25rem" },
  statCard:    { background: palette.card, borderRadius: "12px", padding: "0.9rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  statLabel:   { fontSize: "0.7rem", color: palette.muted, margin: "0 0 2px" },
  statVal:     { fontSize: "1.1rem", fontWeight: "700", margin: 0 },
  card:        { background: palette.card, borderRadius: "14px", padding: "1.25rem 1.5rem", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", marginBottom: "1.25rem" },
  filtroBtn:   { padding: "0.3rem 0.75rem", border: `1px solid ${palette.border}`, borderRadius: "7px", fontSize: "0.75rem", fontWeight: "500", cursor: "pointer", fontFamily: "'Inter',sans-serif", transition: "all 0.15s" },
  avatar:      { width: "40px", height: "40px", borderRadius: "50%", color: "#fff", fontWeight: "700", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  seccionLabel:{ fontSize: "0.7rem", fontWeight: "700", color: palette.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.4rem" },
  detalleGrid: { display: "flex", flexDirection: "column" },
  detalleRow:  { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: `1px solid ${palette.border}` },
  detalleLabel:{ fontSize: "0.75rem", color: palette.muted },
  detalleVal:  { fontSize: "0.82rem", color: palette.text, fontWeight: "500", textAlign: "right" },
  modalOverlay:{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "1rem" },
  modal:       { background: palette.card, borderRadius: "18px", padding: "2rem", width: "100%", maxWidth: "460px", boxShadow: "0 25px 60px rgba(0,0,0,0.3)", animation: "fadeIn 0.25s ease", maxHeight: "90vh", overflowY: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  modalTitle:  { fontSize: "1.1rem", fontWeight: "700", color: palette.navy, margin: 0 },
  modalSub:    { fontSize: "0.8rem", color: palette.muted, margin: "3px 0 0" },
  closeBtn:    { background: palette.beige, border: "none", borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", fontSize: "0.85rem", color: palette.muted, fontFamily: "'Inter',sans-serif" },
  infoBox:     { display: "flex", gap: "0.6rem", alignItems: "flex-start", background: palette.beige, borderRadius: "9px", padding: "0.75rem", marginBottom: "1rem" },
  field:       { display: "flex", flexDirection: "column", gap: "5px" },
  label:       { fontSize: "0.82rem", fontWeight: "600", color: palette.text },
  input:       { padding: "0.7rem 0.9rem", border: `1.5px solid ${palette.border}`, borderRadius: "9px", fontSize: "0.88rem", color: palette.text, background: palette.beige, fontFamily: "'Inter',sans-serif" },
  select:      { padding: "0.7rem 0.9rem", border: `1.5px solid ${palette.border}`, borderRadius: "9px", fontSize: "0.88rem", color: palette.text, background: palette.beige, cursor: "pointer" },
  spinner:     { width: "32px", height: "32px", margin: "0 auto", border: `3px solid ${palette.beigeAlt}`, borderTopColor: palette.navy, borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  successIcon: { width: "56px", height: "56px", borderRadius: "50%", background: palette.green + "18", color: palette.green, fontSize: "1.5rem", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" },
  btnPrimary:  { padding: "0.7rem 1.25rem", background: `linear-gradient(135deg,${palette.navy},#2a5080)`, color: "#fff", border: "none", borderRadius: "10px", fontSize: "0.88rem", fontWeight: "600", cursor: "pointer", fontFamily: "'Inter',sans-serif", boxShadow: `0 4px 12px rgba(30,58,95,0.25)` },
  btnSecondary:{ padding: "0.7rem 1.25rem", background: "none", border: `1.5px solid ${palette.border}`, borderRadius: "10px", color: palette.muted, fontSize: "0.88rem", cursor: "pointer", fontFamily: "'Inter',sans-serif" },
};