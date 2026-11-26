/**
 * Validation mode — AI สกัดคะแนน 9Q ได้ตรงกับที่นักเรียนตอบเองแค่ไหน
 *
 * หลังจบแชท นักเรียนที่ยินยอมทำ 9Q ด้วยตัวเอง ระบบเก็บ "คู่คะแนน" แบบไม่ระบุตัวตน
 * (ไม่มีรหัสนักเรียน เวลาเก็บแค่ระดับสัปดาห์) แล้วสรุปเป็นค่าความสอดคล้องด้านล่าง
 *
 * ไฟล์นี้ไม่ import อะไรเลยโดยตั้งใจ — รัน unit test ได้ตรง ๆ (scripts/unit/agreement.test.mjs)
 * และ unit test ตรวจว่าช่วงคะแนนตรงกับ lib/instruments.ts
 */

/** "gemini" คงไว้สำหรับคู่คะแนนที่เก็บก่อนเปลี่ยนผู้ให้บริการเป็น Claude — ระบบไม่สร้างค่านี้แล้ว */
export const SOURCES = ["demo", "gemini", "claude"] as const;
export type Source = (typeof SOURCES)[number];

export type Pair = {
  /** คะแนน 9Q ที่ระบบสกัดจากบทสนทนา */
  ai: number;
  /** คะแนน 9Q ที่นักเรียนตอบเอง */
  self: number;
  /** AI เก็บหลักฐานได้กี่ข้อจาก 9 — น้อยเกินไปคะแนนของ AI ยังไม่มีความหมาย */
  answered: number;
  /** ตอบเองก่อนเห็นผลของ AI หรือไม่ (เห็นก่อนแล้วคะแนนมักใกล้กันเกินจริง) */
  blind: boolean;
  /** ตัวที่สกัดคะแนน: โมเดลจริง หรือกฎคำสำคัญของโหมดสาธิต */
  source: Source;
};

/** ช่วงคะแนน 9Q — ต้องตรงกับ Q9.bands ใน lib/instruments.ts */
export const Q9_BANDS = [
  { min: 0, max: 6, short: "ไม่มี" },
  { min: 7, max: 12, short: "น้อย" },
  { min: 13, max: 18, short: "ปานกลาง" },
  { min: 19, max: 27, short: "รุนแรง" },
] as const;

/** จุดตัดคัดกรอง: ตั้งแต่ "อาการระดับน้อย" ขึ้นไป */
export const SCREEN_CUTOFF = 7;
/** เก็บหลักฐานได้อย่างน้อยกี่ข้อ จึงนับว่า AI ประเมิน 9Q ได้จริง */
export const MIN_ANSWERED = 5;
/** น้อยกว่านี้ยังไม่ควรสรุปอะไร */
export const MIN_PAIRS = 30;

export const bandOf = (q9: number) => {
  const i = Q9_BANDS.findIndex((b) => q9 >= b.min && q9 <= b.max);
  return i < 0 ? Q9_BANDS.length - 1 : i;
};

const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/**
 * Cohen's kappa จากตารางไขว้ k×k
 * weighted = ถ่วงน้ำหนักแบบกำลังสอง (เหมาะกับระดับที่เรียงลำดับได้: คลาดไปหนึ่งขั้นผิดน้อยกว่าคลาดสามขั้น)
 * คืน null เมื่อคำนวณไม่ได้ (ไม่มีข้อมูล หรือทุกคู่อยู่ช่องเดียวกันจนความสอดคล้องโดยบังเอิญ = 1)
 */
export function kappa(matrix: number[][], weighted = false): number | null {
  const k = matrix.length;
  const n = matrix.flat().reduce((a, b) => a + b, 0);
  if (n === 0) return null;
  const row = matrix.map((r) => r.reduce((a, b) => a + b, 0));
  const col = matrix[0].map((_, j) => matrix.reduce((a, r) => a + r[j], 0));

  let observed = 0;
  let expected = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      // w = ค่าปรับความไม่สอดคล้อง: ไม่ถ่วง = 0/1 · ถ่วง = (ระยะห่าง)² / (k-1)²
      const w = weighted ? ((i - j) * (i - j)) / ((k - 1) * (k - 1)) : i === j ? 0 : 1;
      observed += w * (matrix[i][j] / n);
      expected += w * ((row[i] / n) * (col[j] / n));
    }
  }
  if (expected === 0) return null;
  return round(1 - observed / expected);
}

export function agreement(pairs: Pair[]) {
  const k = Q9_BANDS.length;
  /** แถว = นักเรียนตอบเอง · คอลัมน์ = AI */
  const matrix = Array.from({ length: k }, () => Array<number>(k).fill(0));
  let same = 0;
  let abs = 0;
  let tp = 0, fp = 0, fn = 0, tn = 0;

  for (const p of pairs) {
    const s = bandOf(p.self);
    const a = bandOf(p.ai);
    matrix[s][a]++;
    if (s === a) same++;
    abs += Math.abs(p.ai - p.self);
    const truth = p.self >= SCREEN_CUTOFF;
    const flagged = p.ai >= SCREEN_CUTOFF;
    if (truth && flagged) tp++;
    else if (!truth && flagged) fp++;
    else if (truth && !flagged) fn++;
    else tn++;
  }

  const n = pairs.length;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);
  return {
    n,
    /** พอจะเริ่มอ่านค่าได้หรือยัง */
    enough: n >= MIN_PAIRS,
    sameBand: same,
    pctSameBand: pct(same, n),
    kappa: kappa(matrix),
    kappaWeighted: kappa(matrix, true),
    /** คะแนนคลาดกันเฉลี่ยกี่คะแนน (เต็ม 27) */
    meanAbsDiff: n ? round(abs / n, 1) : null,
    matrix,
    /** ใช้คำตอบของนักเรียนเป็นเกณฑ์: คนที่ตอบเองได้ >= 7 ระบบจับได้กี่ % · คนที่ < 7 ระบบไม่ตื่นตูมกี่ % */
    screen: { tp, fp, fn, tn, sensitivity: pct(tp, tp + fn), specificity: pct(tn, tn + fp) },
  };
}

export type Agreement = ReturnType<typeof agreement>;

/** สัปดาห์ที่เก็บ (จันทร์ 00:00 UTC) — เก็บเวลาหยาบพอที่จะโยงกลับไปหาแถวของนักเรียนคนใดคนหนึ่งไม่ได้ */
export function weekOf(t: number): number {
  const d = new Date(t);
  const day = (d.getUTCDay() + 6) % 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
}

export const isSource = (x: unknown): x is Source => typeof x === "string" && (SOURCES as readonly string[]).includes(x);
const int = (x: unknown, lo: number, hi: number): number | null =>
  typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi ? x : null;

/** รับอะไรก็ได้จาก client แล้วคืนคู่คะแนนที่ถูกต้อง หรือ null — ไม่มีฟิลด์ไหนเป็นข้อความอิสระ */
export function cleanPair(raw: unknown): Pair | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const ai = int(r.ai, 0, 27);
  const self = int(r.self, 0, 27);
  const answered = int(r.answered, 0, 9);
  if (ai === null || self === null || answered === null || typeof r.blind !== "boolean" || !isSource(r.source)) return null;
  return { ai, self, answered, blind: r.blind, source: r.source };
}
