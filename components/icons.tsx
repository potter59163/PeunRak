/**
 * ชุดไอคอน SVG ของโปรเจกต์ — ไม่ใช้อิโมจิที่ไหนเลยในระบบ
 * เส้น 1.5px ปลายมน สืบทอดสีจาก currentColor
 */
type P = { className?: string; size?: number };

function S({
  children,
  className,
  size = 20,
  fill = false,
}: P & { children: React.ReactNode; fill?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"}
      stroke={fill ? "none" : "currentColor"}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/* โลโก้: วงกลมสองวงซ้อนกัน = เพื่อนสองคน ส่วนที่ทับกันคือพื้นที่ปลอดภัยร่วมกัน */
export function Mark({ className, size = 28 }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9.5"
        stroke="currentColor"
        strokeOpacity="0.16"
        strokeWidth="1.5"
      />
      <circle cx="11.6" cy="16" r="6.3" fill="currentColor" fillOpacity="0.3" />
      <circle
        cx="20.4"
        cy="16"
        r="6.3"
        stroke="currentColor"
        strokeWidth="2.1"
      />
    </svg>
  );
}

export const Shield = (p: P) => (
  <S {...p}>
    <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6l7-3z" />
  </S>
);

export const ShieldCheck = (p: P) => (
  <S {...p}>
    <path d="M12 3l7 3v5.5c0 4.3-2.9 8.2-7 9.5-4.1-1.3-7-5.2-7-9.5V6l7-3z" />
    <path d="M9.2 12.2l2 2 3.6-3.8" />
  </S>
);

export const Lock = (p: P) => (
  <S {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 018 0v2.7" />
  </S>
);

export const Eye = (p: P) => (
  <S {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.9" />
  </S>
);

export const EyeOff = (p: P) => (
  <S {...p}>
    <path d="M9.6 6.2A9.6 9.6 0 0112 6c6 0 9.5 6 9.5 6a17 17 0 01-2.7 3.5M6.2 8.1A17 17 0 002.5 12s3.5 6 9.5 6a9.4 9.4 0 003.9-.83" />
    <path d="M10 10a2.9 2.9 0 004 4" />
    <path d="M3.5 3.5l17 17" />
  </S>
);

export const Chat = (p: P) => (
  <S {...p}>
    <path d="M20.5 11.7c0 4-3.8 7.2-8.5 7.2a10 10 0 01-2.6-.34L4.5 20.5l1.2-3.6a6.8 6.8 0 01-2.2-5c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2z" />
  </S>
);

export const Send = (p: P) => (
  <S {...p}>
    <path d="M20 4L3.8 10.4c-.7.3-.66 1.3.06 1.5l6.3 1.9 1.9 6.3c.22.72 1.2.76 1.5.06L20 4z" />
    <path d="M20 4l-9.84 9.84" />
  </S>
);

export const Moon = (p: P) => (
  <S {...p}>
    <path d="M20 14.2A8.2 8.2 0 019.8 4 8.5 8.5 0 1020 14.2z" />
  </S>
);

export const Pulse = (p: P) => (
  <S {...p}>
    <path d="M2.5 12.5h4l2.2-5.8 3.6 11 2.4-7.2 1.6 2h5.2" />
  </S>
);

export const Device = (p: P) => (
  <S {...p}>
    <rect x="7" y="2.8" width="10" height="18.4" rx="2.6" />
    <path d="M10.8 18.4h2.4" />
  </S>
);

export const Cup = (p: P) => (
  <S {...p}>
    <path d="M5 8h11v6.5a4.5 4.5 0 01-4.5 4.5h-2A4.5 4.5 0 015 14.5V8z" />
    <path d="M16 9.5h1.6a2.4 2.4 0 010 4.8H16" />
    <path d="M7.5 4.5v1.4M11 3.8v2.1M14.5 4.5v1.4" />
  </S>
);

export const ArrowRight = (p: P) => (
  <S {...p}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </S>
);

export const ArrowLeft = (p: P) => (
  <S {...p}>
    <path d="M19.5 12h-15M10.5 18l-6-6 6-6" />
  </S>
);

export const Check = (p: P) => (
  <S {...p}>
    <path d="M4.5 12.5l5 5 10-11" />
  </S>
);

export const Phone = (p: P) => (
  <S {...p}>
    <path d="M8.4 4.2l2 .3 1.1 3.4-1.9 1.5a11 11 0 004.9 4.9l1.5-1.9 3.4 1.1.3 2a1.9 1.9 0 01-1.9 2.1A14.9 14.9 0 014.1 6.1 1.9 1.9 0 016.2 4.2h2.2z" />
  </S>
);

export const Users = (p: P) => (
  <S {...p}>
    <circle cx="9.4" cy="8.6" r="3.4" />
    <path d="M3.2 19.4a6.2 6.2 0 0112.4 0" />
    <path d="M16 5.6a3.2 3.2 0 010 6.1M17.6 19.4a5.9 5.9 0 00-1.3-3.7" />
  </S>
);

export const Hospital = (p: P) => (
  <S {...p}>
    <path d="M4 20.5V9.2l8-5 8 5v11.3" />
    <path d="M2.6 20.5h18.8" />
    <path d="M12 9.6v4.8M9.6 12h4.8" />
  </S>
);

export const Doc = (p: P) => (
  <S {...p}>
    <path d="M14 3H7.5A1.5 1.5 0 006 4.5v15A1.5 1.5 0 007.5 21h9a1.5 1.5 0 001.5-1.5V7l-4-4z" />
    <path d="M13.8 3.2V7.2H18" />
    <path d="M9 12.5h6M9 16h4" />
  </S>
);

export const Trend = ({ dir = "flat", ...p }: P & { dir?: "up" | "down" | "flat" }) => (
  <S {...p}>
    {dir === "up" && <path d="M3.5 16.5l5-5.5 3.5 3.5L20.5 6" />}
    {dir === "down" && <path d="M3.5 7.5l5 5.5 3.5-3.5L20.5 18" />}
    {dir === "flat" && <path d="M3.5 12h17" />}
    {dir === "up" && <path d="M15.5 6h5v5" />}
    {dir === "down" && <path d="M15.5 18h5v-5" />}
  </S>
);

export const Clock = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 7.4V12l3 1.8" />
  </S>
);

export const Pin = (p: P) => (
  <S {...p}>
    <path d="M12 21.2s6.6-6 6.6-10.4a6.6 6.6 0 10-13.2 0C5.4 15.2 12 21.2 12 21.2z" />
    <circle cx="12" cy="10.6" r="2.4" />
  </S>
);

export const Info = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="8.6" />
    <path d="M12 11.2v5M12 8.2v.2" />
  </S>
);

export const Quote = (p: P) => (
  <S {...p}>
    <path d="M9.4 6.5C6.6 7.6 5 9.9 5 12.9v4.6h5.2v-5.2H7.9c0-1.9.8-3.2 2.4-4.1l-.9-1.7zM19 6.5c-2.8 1.1-4.4 3.4-4.4 6.4v4.6h5.2v-5.2h-2.3c0-1.9.8-3.2 2.4-4.1L19 6.5z" />
  </S>
);

export const Sprout = (p: P) => (
  <S {...p}>
    <path d="M12 21v-7.5" />
    <path d="M12 13.5C12 10.4 9.6 8 6.5 8H4.8v1.4A5.2 5.2 0 0010 14.6h2z" />
    <path d="M12 13.1a4.7 4.7 0 014.7-4.7h1.6v1.2a4.7 4.7 0 01-4.7 4.7H12" />
  </S>
);

export const Sliders = (p: P) => (
  <S {...p}>
    <path d="M4 8h10M18 8h2M4 16h4M12 16h8" />
    <circle cx="16" cy="8" r="2" />
    <circle cx="10" cy="16" r="2" />
  </S>
);

export const Mail = (p: P) => (
  <S {...p}>
    <rect x="2.8" y="5" width="18.4" height="14" rx="2.6" />
    <path d="M3.4 6.8l7.5 5.2a2 2 0 002.2 0l7.5-5.2" />
  </S>
);

export const Logout = (p: P) => (
  <S {...p}>
    <path d="M14.5 7.5V5.6A1.6 1.6 0 0012.9 4H5.6A1.6 1.6 0 004 5.6v12.8A1.6 1.6 0 005.6 20h7.3a1.6 1.6 0 001.6-1.6v-1.9" />
    <path d="M9.5 12h11M17.5 8.5l3.5 3.5-3.5 3.5" />
  </S>
);

export const Clipboard = (p: P) => (
  <S {...p}>
    <path d="M9 4.5H7.4A1.4 1.4 0 006 5.9v13.2a1.4 1.4 0 001.4 1.4h9.2a1.4 1.4 0 001.4-1.4V5.9a1.4 1.4 0 00-1.4-1.4H15" />
    <rect x="9" y="2.8" width="6" height="3.4" rx="1.2" />
    <path d="M9 11h6M9 14.6h4" />
  </S>
);

export const Bell = (p: P) => (
  <S {...p}>
    <path d="M17.5 10.4a5.5 5.5 0 10-11 0c0 4.2-1.6 5.4-1.6 5.4h14.2s-1.6-1.2-1.6-5.4z" />
    <path d="M13.5 19a1.8 1.8 0 01-3 0" />
  </S>
);

export const ChevronRight = (p: P) => (
  <S {...p}>
    <path d="M9.5 5.5l6.5 6.5-6.5 6.5" />
  </S>
);

export const Person = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="8.4" r="3.7" />
    <path d="M4.8 20a7.2 7.2 0 0114.4 0" />
  </S>
);

export const Bolt = (p: P) => (
  <S {...p}>
    <path d="M13.2 2.8L4.8 13.4h6L10.2 21l8.4-10.6h-6l.6-7.6z" />
  </S>
);
