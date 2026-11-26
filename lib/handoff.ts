import type { DomainHit } from "./domains";

/**
 * Warm handoff — ค่าคงที่และการคำนวณที่ใช้ร่วมกันทั้งฝั่ง server และ client
 * ไฟล์นี้ต้องไม่ import อะไรที่เป็น server-only (หน้า client ดึงไปใช้ตรง ๆ)
 *
 * ทุกอย่างที่นักเรียนตอบในเส้นทางนี้เป็น "ตัวเลือก" ทั้งหมด ไม่มีช่องให้พิมพ์
 * ค่าที่เก็บจึงเป็น enum ล้วน และ API ปฏิเสธค่าที่อยู่นอกรายการ
 */

/* ---------------- บันไดการเปิดเผย (นักเรียนเลือกเอง) --------------------- */

export type Level = 0 | 1 | 2 | 3;

export const LEVELS: { short: string; title: string; sub: string }[] = [
  { short: "L0", title: "เก็บไว้ดูเอง", sub: "ครูเห็นแค่ระดับความเสี่ยงแบบนิรนาม ไม่เห็นว่าเป็นเรื่องอะไร" },
  { short: "L1", title: "ให้ครูรู้แบบไม่ระบุตัวตน", sub: "ครูเห็นระดับความเสี่ยงกับหมวดเรื่อง ไม่เห็นชื่อ ไม่เห็นแชท" },
  { short: "L2", title: "เปิดชื่อให้ครู", sub: "ครูเห็นชื่อและห้อง ติดต่อกลับได้" },
  { short: "L3", title: "ยินยอมให้ส่งต่อผู้เชี่ยวชาญ", sub: "ครูประสานนัดหมายให้ และเอกสารส่งต่อมีคะแนนรายข้อ ไม่มีข้อความในแชท" },
];

export const toLevel = (x: unknown): Level | null =>
  x === 0 || x === 1 || x === 2 || x === 3 ? x : null;

/* ---------------- สถานะการส่งต่อ ----------------------------------------- */

/**
 * ไล่ทีละขั้น ไม่ข้าม ไม่ถอยหลัง
 * none → sent (ครูส่ง) → scheduled (มีวันนัด) → arrived (เด็กไปถึงจริง)
 * ขั้น arrived คือตัวชี้วัดที่สำคัญที่สุด เพราะ referral leakage คือปัญหาที่ระบบเดิมวัดไม่ได้เลย
 */
export type RefStatus = "none" | "sent" | "scheduled" | "arrived";
export const REF_FLOW: RefStatus[] = ["none", "sent", "scheduled", "arrived"];
export const REF_LABEL: Record<RefStatus, string> = {
  none: "ยังไม่ส่งต่อ",
  sent: "ส่งต่อแล้ว",
  scheduled: "นัดหมายแล้ว",
  arrived: "เข้าพบแล้ว",
};
export const isRefStatus = (x: unknown): x is RefStatus =>
  typeof x === "string" && (REF_FLOW as string[]).includes(x);

/**
 * เส้นทางสองชั้น
 * school   = ครูแนะแนวในโรงเรียน — เด็กไปถึงง่ายกว่า ใช้กับเคสเริ่มหนักขึ้น (watch)
 * external = ผู้เชี่ยวชาญภายนอก — ใช้กับเคสที่ควรมีผู้เชี่ยวชาญดูแล (care)
 */
export const TRACKS = ["school", "external"] as const;
export type RefTrack = (typeof TRACKS)[number];
export const TRACK_LABEL: Record<RefTrack, string> = {
  school: "ครูแนะแนวในโรงเรียน",
  external: "ผู้เชี่ยวชาญภายนอก",
};
export const isTrack = (x: unknown): x is RefTrack =>
  typeof x === "string" && (TRACKS as readonly string[]).includes(x);

export const defaultTrack = (risk: "low" | "medium" | "high"): RefTrack =>
  risk === "high" ? "external" : "school";

/* ---------------- ผู้ร่วมทาง / เช็กอิน / เหตุผลที่ไม่ได้ไป ---------------- */

/** เก็บแค่ "บทบาท" ของคนที่ไปด้วย ไม่เก็บชื่อ */
export const COMPANIONS = ["none", "friend", "teacher", "family"] as const;
export type Companion = (typeof COMPANIONS)[number];
export const COMPANION_LABEL: Record<Companion, string> = {
  none: "ไปคนเดียว",
  friend: "เพื่อน",
  teacher: "ครูที่ไว้ใจ",
  family: "คนในครอบครัว",
};
export const isCompanion = (x: unknown): x is Companion =>
  typeof x === "string" && (COMPANIONS as readonly string[]).includes(x);

export const CHECKINS = ["went", "missed"] as const;
export type Checkin = (typeof CHECKINS)[number];

export const MISS_REASONS = ["fear", "time", "transport", "guardian", "cost", "other"] as const;
export type MissReason = (typeof MISS_REASONS)[number];
export const MISS_LABEL: Record<MissReason, string> = {
  fear: "กลัวหรืออาย",
  time: "ไม่มีเวลา",
  transport: "เดินทางไม่สะดวก",
  guardian: "ผู้ปกครองไม่ให้ไป",
  cost: "ค่าใช้จ่าย",
  other: "เหตุผลอื่น",
};
export const isMissReason = (x: unknown): x is MissReason =>
  typeof x === "string" && (MISS_REASONS as readonly string[]).includes(x);

/* ---------------- สิ่งที่นักเรียนเห็นเกี่ยวกับเส้นทางของตัวเอง ------------ */

export type HandoffState = {
  code: string;
  level: Level;
  refStatus: RefStatus;
  refTrack?: RefTrack;
  refSentAt?: number;
  refArrivedAt?: number;
  apptAt?: number;
  companion?: Companion;
  checkin?: Checkin;
  missReason?: MissReason;
  helpRequestedAt?: number;
  helpAckAt?: number;
};

/* ---------------- เตือนนัด ------------------------------------------------ */

const startOfDay = (t: number) => new Date(t).setHours(0, 0, 0, 0);

/** ต่างกันกี่วันตามปฏิทิน (ไม่ใช่ 24 ชม.) — 1 = พรุ่งนี้, 0 = วันนี้, ติดลบ = ผ่านมาแล้ว */
export const daysUntil = (at: number, now = Date.now()) =>
  Math.round((startOfDay(at) - startOfDay(now)) / 864e5);

export type Reminder = "upcoming" | "tomorrow" | "today" | "checkin" | null;

/**
 * เตือนก่อนนัด 1 วัน และวันนัด · หลังวันนัดถามว่าได้ไปไหม (จนกว่าจะตอบ หรือผู้เชี่ยวชาญยืนยันว่ามาแล้ว)
 */
export function reminderOf(s: Pick<HandoffState, "refStatus" | "apptAt" | "checkin">, now = Date.now()): Reminder {
  if (s.refStatus !== "scheduled" || !s.apptAt) return null;
  const d = daysUntil(s.apptAt, now);
  if (d > 1) return "upcoming";
  if (d === 1) return "tomorrow";
  if (d === 0) return "today";
  return s.checkin ? null : "checkin";
}

/** วันที่จากช่อง <input type="date"> → เที่ยงวันตามเวลาเครื่อง กันเขตเวลาพาข้ามวัน */
export function dateInputToTime(v: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return null;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
  return Number.isNaN(t) ? null : t;
}

export function timeToDateInput(t: number): string {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const thaiDate = (t?: number) =>
  t ? new Date(t).toLocaleDateString("th-TH", { day: "numeric", month: "short" }) : "—";

/* ---------------- ตัวชี้วัดการปิดวงจรส่งต่อ ------------------------------ */

type StatCase = {
  risk: "low" | "medium" | "high";
  refStatus: RefStatus;
  refTrack?: RefTrack;
  refSentAt?: number;
  refArrivedAt?: number;
  missReason?: MissReason;
  domains?: DomainHit[];
};

const reached = (c: StatCase, s: RefStatus) => REF_FLOW.indexOf(c.refStatus) >= REF_FLOW.indexOf(s);
const pct = (n: number, of: number) => (of > 0 ? Math.round((n / of) * 100) : 0);

export function handoffStats(cases: StatCase[]) {
  /** เข้าเกณฑ์ควรดูแล = เสี่ยงปานกลางขึ้นไป หรือถูกส่งต่อไปแล้ว */
  const pool = cases.filter((c) => c.risk !== "low" || c.refStatus !== "none");
  const sent = pool.filter((c) => reached(c, "sent"));
  const scheduled = sent.filter((c) => reached(c, "scheduled"));
  const arrived = sent.filter((c) => reached(c, "arrived"));

  const days = arrived
    .filter((c) => c.refSentAt && c.refArrivedAt)
    .map((c) => (c.refArrivedAt! - c.refSentAt!) / 864e5);
  const avgDays = days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null;

  const byTrack = TRACKS.map((t) => {
    const s = sent.filter((c) => (c.refTrack ?? "external") === t);
    const a = s.filter((c) => reached(c, "arrived")).length;
    return { track: t, sent: s.length, arrived: a, rate: pct(a, s.length) };
  });

  const missed = sent.filter((c) => c.missReason);
  const reasons = MISS_REASONS.map((r) => {
    const n = missed.filter((c) => c.missReason === r).length;
    return { reason: r, n, share: pct(n, missed.length) };
  }).filter((r) => r.n > 0).sort((a, b) => b.n - a.n);

  return {
    pool: pool.length,
    waiting: pool.length - sent.length,
    steps: [
      { status: "sent" as RefStatus, n: sent.length, of: pool.length, pct: pct(sent.length, pool.length), base: "ของเคสที่เข้าเกณฑ์" },
      { status: "scheduled" as RefStatus, n: scheduled.length, of: sent.length, pct: pct(scheduled.length, sent.length), base: "ของที่ส่งต่อ" },
      { status: "arrived" as RefStatus, n: arrived.length, of: sent.length, pct: pct(arrived.length, sent.length), base: "ของที่ส่งต่อ" },
    ],
    arrivalRate: pct(arrived.length, sent.length),
    avgDays,
    byTrack,
    missed: missed.length,
    reasons,
  };
}
