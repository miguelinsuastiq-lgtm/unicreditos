// ─── Set de íconos de línea (reemplaza emojis en toda la app) ────────────────
// Mismo estilo en todos: stroke=currentColor, grosor 2, esquinas redondeadas.
// Uso: <IconGrid size={18} /> — hereda color del texto por defecto.

const base = (size, strokeWidth) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
});

export const IconGrid = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
);

export const IconCreditCard = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

export const IconFileText = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
  </svg>
);

export const IconReceipt = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M6 2h12v18l-3-2-3 2-3-2-3 2Z" /><line x1="9" y1="7" x2="15" y2="7" /><line x1="9" y1="11" x2="15" y2="11" />
  </svg>
);

export const IconExchange = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M4 8h13" /><path d="M13 4l4 4-4 4" /><path d="M20 16H7" /><path d="M11 12l-4 4 4 4" />
  </svg>
);

export const IconSignature = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M3 17s2-1 3-3 1.5-4 3-4 1 3 2.5 3 2-4 3.5-4 1 4 3 4 2-2 3.5-2" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

export const IconUser = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconUsers = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const IconInbox = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
  </svg>
);

export const IconCheckCircle = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
  </svg>
);

export const IconAlertTriangle = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="m10.29 3.86-8.18 14.14A1.5 1.5 0 0 0 3.4 20h17.2a1.5 1.5 0 0 0 1.29-2L13.71 3.86a1.5 1.5 0 0 0-2.58 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const IconCalendar = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const IconClock = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
  </svg>
);

export const IconPlus = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const IconPower = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

export const IconChevronLeft = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}><polyline points="15 18 9 12 15 6" /></svg>
);

export const IconSearch = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const IconDollar = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const IconXCircle = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const IconFolder = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2Z" />
  </svg>
);

export const IconClipboard = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <line x1="8" y1="11" x2="16" y2="11" /><line x1="8" y1="15" x2="13" y2="15" />
  </svg>
);

export const IconUpload = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const IconMail = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" />
  </svg>
);

export const IconBank = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <line x1="3" y1="21" x2="21" y2="21" /><line x1="5" y1="21" x2="5" y2="10" />
    <line x1="9" y1="21" x2="9" y2="10" /><line x1="15" y1="21" x2="15" y2="10" />
    <line x1="19" y1="21" x2="19" y2="10" /><polygon points="12 3 21 9 3 9" />
  </svg>
);

export const IconCash = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="3" />
    <line x1="6" y1="12" x2="6" y2="12" /><line x1="18" y1="12" x2="18" y2="12" />
  </svg>
);

export const IconZap = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const IconEye = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconShield = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);

export const IconKey = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);

export const IconBan = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

export const IconEdit = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

export const IconInfo = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export const IconBell = ({ size = 18, strokeWidth = 2, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const IconInboxOpen = IconInbox;

export const IconFileEmpty = ({ size = 32, strokeWidth = 1.5, ...p }) => (
  <svg {...base(size, strokeWidth)} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
  </svg>
);