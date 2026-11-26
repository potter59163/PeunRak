"use client";

import { useState } from "react";
import { Button, Card } from "./ui";
import { Calendar, EyeOff, Eye, Users, Hospital } from "./icons";
import { shown, type DomainHit } from "@/lib/domains";
import { domainTag } from "@/lib/resources";
import {
  REF_LABEL, LEVELS, COMPANION_LABEL, MISS_LABEL,
  handoffStats, thaiDate, dateInputToTime, timeToDateInput, daysUntil,
  type Level, type RefStatus, type RefTrack, type Companion, type Checkin, type MissReason,
} from "@/lib/handoff";

/** ชิ้นส่วนหน้าจอของเส้นทางส่งต่อ ใช้ร่วมกันทั้งครู ผู้เชี่ยวชาญ และนักเรียน */

const STEPS = ["sent", "scheduled", "arrived"] as const;

export function Timeline({ status, track, sentAt, apptAt, arrivedAt }: {
  status: RefStatus; track?: RefTrack; sentAt?: number; apptAt?: number; arrivedAt?: number;
}) {
  const at = { sent: sentAt, scheduled: apptAt, arrived: arrivedAt };
  const done = (STEPS as readonly string[]).indexOf(status);
  const label = (s: (typeof STEPS)[number]) =>
    s === "arrived" && track === "school" ? "พบครูแนะแนวแล้ว" : s === "scheduled" ? "วันนัด" : REF_LABEL[s];
  return (
    <div className="flex items-start gap-1.5">
      {STEPS.map((s, i) => {
        const on = i <= done;
        return (
          <div key={s} className="min-w-0 flex-1">
            <div className={`h-1.5 rounded-full ${on ? "bg-accent" : "bg-line"}`} />
            <p className={`mt-1.5 truncate text-[0.7rem] ${on ? "text-ink-2" : "text-ink-3"}`}>{label(s)}</p>
            <p className="text-[0.68rem] text-ink-3">{on && at[s] ? thaiDate(at[s]) : "—"}</p>
          </div>
        );
      })}
    </div>
  );
}

/** แท็กหมวดเรื่อง — server ส่งมาเฉพาะเคสที่นักเรียนเปิด L1 ขึ้นไป (forStaff) */
export function DomainTags({ domains }: { domains: DomainHit[] }) {
  const xs = shown(domains);
  if (xs.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {xs.map((d) => (
        <span key={d.id} className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[0.74rem] text-ink-2">
          {domainTag(d.id)}
        </span>
      ))}
    </div>
  );
}

const LEVEL_ICON = [EyeOff, Users, Eye, Hospital] as const;

export function LevelChip({ level }: { level: Level }) {
  const I = LEVEL_ICON[level];
  return (
    <span title={LEVELS[level].sub}
      className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.72rem] text-ink-3">
      <I size={12} /> {LEVELS[level].short} {LEVELS[level].title}
    </span>
  );
}

/** เลือกวันนัดแล้วบันทึก — ใช้ทั้งนัดครั้งแรกและนัดใหม่หลังพลาดนัด */
export function Schedule({ label, busy, initial, onSave }: {
  label: string; busy?: boolean; initial?: number; onSave: (apptAt: number) => void;
}) {
  const [v, setV] = useState(() => timeToDateInput(initial ?? Date.now() + 864e5));
  const t = dateInputToTime(v);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[0.84rem] text-ink-2 focus-within:border-accent">
        <Calendar size={15} className="text-ink-3" />
        <span className="sr-only">วันนัด</span>
        <input type="date" value={v} onChange={(e) => setV(e.target.value)}
          className="bg-transparent text-[0.86rem] text-ink outline-none" />
      </label>
      <Button size="sm" disabled={busy || !t} onClick={() => t && onSave(t)}>
        {busy ? "กำลังบันทึก" : label}
      </Button>
    </div>
  );
}

/** สิ่งที่นักเรียนตอบเองในเส้นทาง: ผู้ร่วมทาง และเช็กอินหลังนัด (ตัวเลือกล้วน ไม่มีข้อความ) */
export function HandoffNotes({ c }: {
  c: { refStatus: RefStatus; apptAt?: number; companion?: Companion; checkin?: Checkin; missReason?: MissReason };
}) {
  const overdue = c.refStatus === "scheduled" && c.apptAt !== undefined && daysUntil(c.apptAt) < 0;
  const notes: { text: string; tone: "calm" | "watch" | "plain" }[] = [];
  if (c.companion && c.companion !== "none") notes.push({ text: `ไปกับ${COMPANION_LABEL[c.companion]}`, tone: "plain" });
  if (c.refStatus === "scheduled" && c.checkin === "went") notes.push({ text: "นักเรียนแจ้งว่าไปแล้ว รอยืนยัน", tone: "calm" });
  if (c.refStatus === "scheduled" && c.checkin === "missed")
    notes.push({ text: `นักเรียนแจ้งว่ายังไม่ได้ไป · ${MISS_LABEL[c.missReason ?? "other"]}`, tone: "watch" });
  else if (overdue && !c.checkin) notes.push({ text: "เลยวันนัดแล้ว ยังไม่มีการยืนยัน", tone: "watch" });
  if (notes.length === 0) return null;
  const cls = { calm: "bg-calm-soft text-calm", watch: "bg-watch-soft text-watch", plain: "bg-surface-2 text-ink-2" };
  return (
    <div className="flex flex-wrap gap-1.5">
      {notes.map((n) => (
        <span key={n.text} className={`rounded-full px-2.5 py-1 text-[0.74rem] font-medium ${cls[n.tone]}`}>{n.text}</span>
      ))}
    </div>
  );
}

/* ---------------- funnel ปิดวงจรส่งต่อ ------------------------------------ */

export function Funnel({ cases, seeded = 0 }: { cases: Parameters<typeof handoffStats>[0]; seeded?: number }) {
  const s = handoffStats(cases);
  if (s.pool === 0) return null;
  const rows = [
    { label: "เข้าเกณฑ์ควรดูแล", n: s.pool, w: 100, note: "เสี่ยงปานกลางขึ้นไป" },
    ...s.steps.map((x) => ({
      label: REF_LABEL[x.status], n: x.n, w: s.pool ? (x.n / s.pool) * 100 : 0, note: `${x.pct}% ${x.base}`,
    })),
  ];
  return (
    <Card as="section" className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[0.95rem] font-medium text-ink">เส้นทางการส่งต่อ</h2>
          <p className="mt-0.5 text-[0.8rem] text-ink-3">ส่งต่อแล้วไปถึงคนที่ช่วยได้จริงกี่เคส</p>
        </div>
        <div className="text-right">
          <p className="text-[1.7rem] font-semibold leading-none tabular-nums text-accent">{s.arrivalRate}%</p>
          <p className="mt-1 text-[0.74rem] text-ink-3">ไปถึงจริง</p>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5">
        {rows.map((r, i) => (
          <li key={r.label} className="grid grid-cols-[7.4rem_1fr] items-center gap-x-3 sm:grid-cols-[8.5rem_1fr_9.5rem]">
            <span className="text-[0.82rem] text-ink-2">{r.label}</span>
            <div className="flex items-center gap-2.5">
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                <div className={`h-full rounded-full transition-[width] duration-500 ${i === rows.length - 1 ? "bg-accent" : "bg-accent/45"}`}
                  style={{ width: `${Math.max(r.w, r.n ? 3 : 0)}%` }} />
              </div>
              <span className="w-6 text-right text-[0.9rem] font-medium tabular-nums text-ink">{r.n}</span>
            </div>
            <span className="col-start-2 text-[0.72rem] text-ink-3 sm:col-start-3 sm:text-right">{r.note}</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line-soft pt-4 sm:grid-cols-4">
        <Stat label="ยังไม่ส่งต่อ" value={`${s.waiting} เคส`} />
        <Stat label="เฉลี่ยจากส่งต่อถึงพบ" value={s.avgDays === null ? "—" : `${s.avgDays} วัน`} />
        {s.byTrack.map((t) => (
          <Stat key={t.track} label={`ไปถึงจริง · ${t.track === "school" ? "ในโรงเรียน" : "ภายนอก"}`}
            value={t.sent ? `${t.rate}% (${t.arrived}/${t.sent})` : "—"} />
        ))}
      </dl>

      {s.reasons.length > 0 ? (
        <div className="mt-4 border-t border-line-soft pt-4">
          <p className="text-[0.82rem] text-ink-2">เหตุผลที่ไม่ได้ไปตามนัด <span className="text-ink-3">· {s.missed} เคส นักเรียนเลือกตอบเอง</span></p>
          <ul className="mt-2.5 space-y-1.5">
            {s.reasons.map((r) => (
              <li key={r.reason} className="flex items-center gap-3 text-[0.8rem]">
                <span className="w-[8.5rem] shrink-0 text-ink-2">{MISS_LABEL[r.reason]}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                  <div className="h-full rounded-full bg-watch/60" style={{ width: `${r.share}%` }} />
                </div>
                <span className="w-[4.2rem] shrink-0 text-right tabular-nums text-ink-3">{r.n} · {r.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {seeded > 0 ? (
        <p className="mt-4 rounded-[var(--r-sm)] bg-watch-soft px-3 py-2 text-[0.76rem] leading-relaxed text-watch">
          มีเคสจำลองสำหรับสาธิตปนอยู่ {seeded} เคส ตัวเลขชุดนี้ยังไม่ใช่ผลจากการใช้งานจริง
        </p>
      ) : null}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[0.72rem] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-[0.95rem] font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}

