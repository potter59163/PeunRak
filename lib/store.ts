/**
 * ที่เก็บสถานะความเสี่ยงแบบ in-memory สำหรับเดโม
 *
 * ความเป็นส่วนตัว: เก็บ "เฉพาะคะแนน" เท่านั้น
 * ไม่มีข้อความในบทสนทนา และไม่มีคำพูดอ้างอิงถูกบันทึกที่นี่เลย
 * (ของจริงย้ายไป Postgres + Row Level Security)
 */

import { Q9, GAD7, Q8, type Instrument, type Zone } from "./instruments";

export type Risk = "low" | "medium" | "high";

export type Assessment = {
  /** คะแนนดิบตามเครื่องมือมาตรฐาน */
  q9: number;
  gad7: number;
  q8: number;
  /** ชื่อระดับตามเกณฑ์กรมสุขภาพจิต */
  q9Band: string;
  gad7Band: string;
  q8Band: string;
  /** 8Q ตั้งแต่ระดับปานกลางขึ้นไป = เส้นทางฉุกเฉิน ไม่ใช่เรื่องคิว */
  crisis: boolean;
  /** เก็บหลักฐานได้กี่ข้อจากทั้งหมด — บอกว่าประเมินนี้แน่นแค่ไหน */
  covered: number;
  total: number;
  /**
   * หลักฐานยังน้อยเกินกว่าจะสรุปว่าเสี่ยงต่ำ
   * ป้องกัน false reassurance — คะแนนต่ำเพราะยังไม่ได้ถาม ไม่ใช่เพราะไม่มีอาการ
   */
  provisional: boolean;
};

export type Snap = Assessment & {
  id: string;
  code: string;
  name?: string;
  room?: string;
  risk: Risk;
  turns: number;
  updatedAt: number;
  /** ประวัติคะแนน 9Q สำหรับกราฟแนวโน้ม */
  history: number[];
  shared: boolean;
};

type Store = { map: Map<string, Snap> };
const g = globalThis as unknown as { __kw?: Store };
if (!g.__kw) g.__kw = { map: new Map() };
const store = g.__kw;

export const ZONE_TO_RISK: Record<Zone, Risk> = { calm: "low", watch: "medium", care: "high" };

const bandOf = (ins: Instrument, raw: number) =>
  (ins.bands.find((b) => raw >= b.min && raw <= b.max) ?? ins.bands[0]).label;

function seed(
  id: string, code: string, q9: number, gad7: number, q8: number,
  turns: number, minutesAgo: number, history: number[],
  extra: Partial<Snap> = {}
): Snap {
  return {
    id, code, q9, gad7, q8,
    q9Band: bandOf(Q9, q9), gad7Band: bandOf(GAD7, gad7), q8Band: bandOf(Q8, q8),
    crisis: q8 >= 9,
    covered: Math.min(18, Math.ceil(turns * 1.2)),
    total: 24,
    provisional: false,
    risk: q9 >= 13 || gad7 >= 10 || q8 >= 9 ? "high" : q9 >= 7 || gad7 >= 5 ? "medium" : "low",
    turns,
    updatedAt: Date.now() - minutesAgo * 6e4,
    history,
    shared: false,
    ...extra,
  };
}

const SEED: Snap[] = [
  seed("k19", "SCH042-K19", 17, 12, 3, 14, 143, [8, 11, 14, 16, 17], { name: "ปัณณ์ ว.", room: "ม.5/2", shared: true }),
  seed("t21", "SCH042-T21", 11, 8, 1, 18, 7200, [19, 16, 13, 11], { name: "ธนภร ส.", room: "ม.4/6", shared: true }),
  seed("b08", "SCH042-B08", 9, 6, 0, 9, 2880, [14, 12, 10, 9]),
  seed("m55", "SCH042-M55", 8, 5, 0, 6, 4320, [7, 8, 8]),
  seed("p90", "SCH042-P90", 4, 3, 0, 4, 540, [3, 4, 4]),
];
if (store.map.size === 0) SEED.forEach((s) => store.map.set(s.id, s));

export function upsert(
  id: string,
  a: Assessment,
  meta: { risk: Risk; turns: number; name?: string; room?: string; shared?: boolean }
) {
  const prev = store.map.get(id);
  const next: Snap = {
    ...a,
    id,
    code: prev?.code ?? `SCH042-${id.toUpperCase().slice(0, 3)}`,
    name: meta.name ?? prev?.name,
    room: meta.room ?? prev?.room,
    shared: meta.shared ?? prev?.shared ?? false,
    risk: meta.risk,
    turns: meta.turns,
    updatedAt: Date.now(),
    history: [...(prev?.history ?? []), a.q9].slice(-8),
  };
  store.map.set(id, next);
  return next;
}

const ORDER: Record<Risk, number> = { high: 0, medium: 1, low: 2 };

export function all(): Snap[] {
  return [...store.map.values()].sort(
    (a, b) => ORDER[a.risk] - ORDER[b.risk] || b.q9 - a.q9
  );
}
