"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark, Phone, ArrowLeft, Chat, Clipboard, Person, Signpost } from "./icons";
import { zoneClass } from "@/lib/zone";
export { zoneClass };

export function Shell({ children, wide = false, pad = false }: { children: React.ReactNode; wide?: boolean; pad?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className={`mx-auto flex w-full flex-1 flex-col px-5 sm:px-6 ${wide ? "max-w-6xl" : "max-w-[34rem]"} ${pad ? "pb-28" : ""}`}>
        {children}
      </div>
    </div>
  );
}

export function TopBar({ back, right, label = "เพื่อนรัก" }: { back?: string; right?: React.ReactNode; label?: string }) {
  return (
    <header className="flex items-center gap-2.5 py-4">
      {back ? (
        <Link href={back} className="grid size-9 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2" aria-label="ย้อนกลับ">
          <ArrowLeft size={18} />
        </Link>
      ) : (
        <Mark className="text-accent" size={26} />
      )}
      <span className="text-[1.02rem] font-medium tracking-tight text-ink">{label}</span>
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </header>
  );
}

type BtnProps = {
  children: React.ReactNode; onClick?: () => void; href?: string;
  variant?: "primary" | "soft" | "line" | "ghost"; size?: "sm" | "md" | "lg";
  full?: boolean; disabled?: boolean; type?: "button" | "submit"; className?: string;
};

export function Button({ children, onClick, href, variant = "primary", size = "md", full, disabled, type = "button", className = "" }: BtnProps) {
  const sizes = { sm: "px-4 min-h-[38px] text-[0.86rem]", md: "px-5 min-h-[46px] text-[0.93rem]", lg: "px-7 min-h-[54px] text-[1rem]" }[size];
  const variants = {
    primary: "btn-grad text-accent-ink",
    soft: "bg-accent-soft text-accent hover:bg-[#DDE9FD] active:translate-y-px",
    line: "border border-line bg-surface text-ink shadow-[var(--sh-1)] hover:bg-surface-2 active:translate-y-px",
    ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
  }[variant];
  const cls = `inline-flex items-center justify-center gap-2 rounded-full font-medium transition select-none disabled:opacity-35 disabled:shadow-none disabled:pointer-events-none ${sizes} ${variants} ${full ? "w-full" : ""} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function Card({ children, className = "", as: Tag = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "section" | "li" | "article" }) {
  return <Tag className={`rounded-[var(--r-lg)] border border-line bg-surface shadow-[var(--sh-1)] ${className}`}>{children}</Tag>;
}

export function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const m = { low: ["ต่ำ", "calm"], medium: ["ปานกลาง", "watch"], high: ["สูง", "care"] } as const;
  const [label, key] = m[risk];
  const c = zoneClass[key];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.76rem] font-medium ${c.bg} ${c.fg}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function Spark({ values: given, className = "", w = 88, h = 28 }: { values: number[]; className?: string; w?: number; h?: number }) {
  const values = given.length < 2 ? [given[0] ?? 0, given[0] ?? 0] : given;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1, pad = 3;
  const pts = values.map((v, i) => [pad + (i * (w - pad * 2)) / (values.length - 1), h - pad - ((v - min) / span) * (h - pad * 2)] as const);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} className={className} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity=".6" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" />
    </svg>
  );
}

const TABS = [
  { href: "/chat", label: "คุย", Icon: Chat },
  { href: "/journey", label: "ไปหาคน", Icon: Signpost },
  { href: "/tests", label: "แบบทดสอบ", Icon: Clipboard },
  { href: "/profile", label: "โปรไฟล์", Icon: Person },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="no-print fixed bottom-5 left-1/2 z-30 -translate-x-1/2">
      <div className="flex gap-1 rounded-full border border-line bg-surface/85 p-1.5 shadow-[var(--sh-2)] backdrop-blur-xl">
        {TABS.map(({ href, label, Icon }) => {
          const on = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={`flex min-w-[70px] flex-col items-center gap-0.5 whitespace-nowrap rounded-full px-2.5 py-2 text-[0.72rem] transition sm:min-w-[82px] sm:px-3.5 ${
                on ? "bg-accent-soft font-medium text-accent" : "text-ink-3 hover:bg-surface-2 hover:text-ink-2"}`}>
              <Icon size={19} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** ต้องอยู่ทุกหน้า — 1323 สุขภาพจิต · 1669 ฉุกเฉิน */
export function Hotline() {
  const link = "font-medium text-ink-2 underline-offset-2 hover:underline";
  return (
    <div className="no-print flex flex-wrap items-center gap-x-2 gap-y-1 py-3 text-[0.78rem] text-ink-3">
      <Phone size={13} />
      ไม่ไหว โทร
      <a href="tel:1323" className={link}>1323</a>
      <span aria-hidden="true">·</span>
      ฉุกเฉิน
      <a href="tel:1669" className={link}>1669</a>
      <span aria-hidden="true">·</span>
      ตลอด 24 ชม.
    </div>
  );
}

export function Choice({ options, value, onChange }: { options: { v: number; label: string }[]; value: number | null; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={`min-h-[44px] rounded-full border px-4.5 text-[0.89rem] transition active:translate-y-px ${on ? "border-transparent btn-grad text-accent-ink" : "border-line bg-surface-2 text-ink-2 hover:border-accent/40 hover:bg-surface"}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Input({ label, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.84rem] text-ink-2">{label}</span>
      <input {...rest}
        className="w-full rounded-2xl border border-line bg-surface-2 px-4 py-3 text-[0.95rem] text-ink outline-none transition placeholder:text-ink-3 focus:border-accent focus:bg-surface" />
    </label>
  );
}
