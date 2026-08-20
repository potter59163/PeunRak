/**
 * เครื่องมือประเมินและตัวคำนวณคะแนน
 *
 * หลักการสำคัญของโปรเจกต์: AI ไม่ได้เป็นคนให้คะแนน
 * AI ทำหน้าที่แค่ "สกัดหลักฐาน" ว่าประโยคไหนตรงกับข้อไหน
 * แล้วไฟล์นี้ (โค้ดธรรมดา ตรวจสอบย้อนกลับได้) เป็นคนคำนวณตามเกณฑ์
 *
 * [ต้องยืนยัน] เกณฑ์จุดตัดด้านล่างอ้างอิงเกณฑ์ที่เผยแพร่ทั่วไป
 * ต้องให้จิตแพทย์/นักจิตวิทยาที่ปรึกษาตรวจสอบก่อนใช้กับผู้ใช้จริง
 * และต้องตรวจสอบเงื่อนไขลิขสิทธิ์การใช้แบบประเมินแต่ละตัว
 */

export const INSTRUMENT_VERSION = "2026.08.1";

export type ItemId = string;

export type Instrument = {
  id: string;
  name: string;
  source: string;
  items: { id: ItemId; text: string; max: number }[];
  bands: { min: number; max: number; label: string; zone: Zone }[];
};

export type Zone = "calm" | "watch" | "care";

/* ---------------- 9Q — แบบประเมินโรคซึมเศร้า (กรมสุขภาพจิต) --------------- */
export const Q9: Instrument = {
  id: "9Q",
  name: "แบบประเมินภาวะซึมเศร้า 9Q",
  source: "กรมสุขภาพจิต กระทรวงสาธารณสุข",
  items: [
    { id: "9Q_1", text: "เบื่อ ไม่สนใจอยากทำอะไร", max: 3 },
    { id: "9Q_2", text: "ไม่สบายใจ ซึมเศร้า ท้อแท้", max: 3 },
    { id: "9Q_3", text: "หลับยาก หลับ ๆ ตื่น ๆ หรือหลับมากไป", max: 3 },
    { id: "9Q_4", text: "เหนื่อยง่าย ไม่ค่อยมีแรง", max: 3 },
    { id: "9Q_5", text: "เบื่ออาหาร หรือกินมากเกินไป", max: 3 },
    { id: "9Q_6", text: "รู้สึกไม่ดีกับตัวเอง คิดว่าตัวเองล้มเหลว", max: 3 },
    { id: "9Q_7", text: "สมาธิไม่ดีเวลาทำอะไร", max: 3 },
    { id: "9Q_8", text: "พูดช้า ทำอะไรช้าลง หรือกระสับกระส่าย", max: 3 },
    { id: "9Q_9", text: "คิดทำร้ายตนเอง หรือคิดว่าตายไปน่าจะดีกว่า", max: 3 },
  ],
  bands: [
    { min: 0, max: 6, label: "ไม่มีอาการซึมเศร้า", zone: "calm" },
    { min: 7, max: 12, label: "อาการซึมเศร้าระดับน้อย", zone: "watch" },
    { min: 13, max: 18, label: "อาการซึมเศร้าระดับปานกลาง", zone: "care" },
    { min: 19, max: 27, label: "อาการซึมเศร้าระดับรุนแรง", zone: "care" },
  ],
};

/* ---------------- GAD-7 — ความวิตกกังวล ---------------------------------- */
export const GAD7: Instrument = {
  id: "GAD-7",
  name: "แบบประเมินความวิตกกังวล GAD-7",
  source: "ฉบับภาษาไทย",
  items: [
    { id: "GAD_1", text: "รู้สึกประหม่า วิตกกังวล หรือหงุดหงิด", max: 3 },
    { id: "GAD_2", text: "หยุดกังวลหรือควบคุมความกังวลไม่ได้", max: 3 },
    { id: "GAD_3", text: "กังวลมากเกินไปกับหลาย ๆ เรื่อง", max: 3 },
    { id: "GAD_4", text: "ผ่อนคลายได้ยาก", max: 3 },
    { id: "GAD_5", text: "กระสับกระส่ายจนนั่งนิ่ง ๆ ไม่ได้", max: 3 },
    { id: "GAD_6", text: "รำคาญใจหรือโมโหง่าย", max: 3 },
    { id: "GAD_7", text: "รู้สึกกลัวเหมือนจะมีเรื่องร้ายเกิดขึ้น", max: 3 },
  ],
  bands: [
    { min: 0, max: 4, label: "แทบไม่มีความวิตกกังวล", zone: "calm" },
    { min: 5, max: 9, label: "วิตกกังวลระดับน้อย", zone: "watch" },
    { min: 10, max: 14, label: "วิตกกังวลระดับปานกลาง", zone: "care" },
    { min: 15, max: 21, label: "วิตกกังวลระดับรุนแรง", zone: "care" },
  ],
};

/* ---------------- 8Q — ความเสี่ยงการฆ่าตัวตาย ---------------------------- */
export const Q8: Instrument = {
  id: "8Q",
  name: "แบบประเมินความเสี่ยงต่อการฆ่าตัวตาย 8Q",
  source: "กรมสุขภาพจิต กระทรวงสาธารณสุข",
  items: [
    { id: "8Q_1", text: "คิดอยากตาย หรือคิดว่าตายไปจะดีกว่า", max: 1 },
    { id: "8Q_2", text: "อยากทำร้ายตัวเอง หรือให้ตัวเองบาดเจ็บ", max: 2 },
    { id: "8Q_3", text: "คิดเรื่องการฆ่าตัวตาย", max: 6 },
    { id: "8Q_4", text: "สามารถควบคุมความคิดอยากฆ่าตัวตายได้หรือไม่", max: 8 },
    { id: "8Q_5", text: "มีแผนการที่จะฆ่าตัวตาย", max: 8 },
    { id: "8Q_6", text: "ได้เตรียมการที่จะทำร้ายตนเอง", max: 9 },
    { id: "8Q_7", text: "ได้ทำให้ตนเองบาดเจ็บแต่ไม่ตั้งใจให้เสียชีวิต", max: 4 },
    { id: "8Q_8", text: "เคยพยายามฆ่าตัวตายโดยตั้งใจให้เสียชีวิต", max: 10 },
  ],
  bands: [
    { min: 0, max: 0, label: "ไม่พบความเสี่ยง", zone: "calm" },
    { min: 1, max: 8, label: "เสี่ยงระดับน้อย", zone: "watch" },
    { min: 9, max: 16, label: "เสี่ยงระดับปานกลาง", zone: "care" },
    { min: 17, max: 99, label: "เสี่ยงระดับสูง", zone: "care" },
  ],
};

export const INSTRUMENTS = [Q9, GAD7, Q8];

/* ---------------- หลักฐานที่ AI สกัดออกมา -------------------------------- */
export type Extraction = {
  itemId: ItemId;
  score: number;
  /** คำพูดจริงของเด็กที่เป็นที่มาของคะแนนข้อนี้ */
  evidence: string;
  /** ต่ำกว่าเกณฑ์ = ระบบจะถามตรง ไม่เดา */
  confidence: number;
};

export const CONFIDENCE_FLOOR = 0.62;

export function scoreOf(instrument: Instrument, ex: Extraction[]) {
  const ids = new Set(instrument.items.map((i) => i.id));
  const used = ex.filter(
    (e) => ids.has(e.itemId) && e.confidence >= CONFIDENCE_FLOOR
  );
  const raw = used.reduce((sum, e) => sum + e.score, 0);
  const band =
    instrument.bands.find((b) => raw >= b.min && raw <= b.max) ??
    instrument.bands[0];
  const answered = used.length;
  return {
    instrument: instrument.id,
    version: INSTRUMENT_VERSION,
    raw,
    band: band.label,
    zone: band.zone,
    answered,
    total: instrument.items.length,
    /** ข้อที่ AI ไม่มั่นใจพอ ระบบต้องถามตรงกับเด็ก */
    needsDirectAsk: instrument.items
      .filter((i) => !used.some((u) => u.itemId === i.id))
      .map((i) => i.id),
    evidence: used,
  };
}

/* ---------------- ปัจจัยกายภาพ (behavioural vital signs) ----------------- */
export type Vitals = {
  sleepHours: number;
  /** 1 = แย่มาก, 5 = ดีมาก */
  sleepQuality: number;
  /** จำนวนวันต่อสัปดาห์ที่ขยับร่างกาย >= 60 นาที (เกณฑ์ WHO วัยรุ่น) */
  activityDays: number;
  screenHours: number;
  /** 1 = แย่มาก, 5 = ดีมาก */
  mood: number;
};

export function readVitals(v: Vitals) {
  return [
    {
      key: "sleep",
      label: "การนอน",
      value: `${v.sleepHours} ชม.`,
      note:
        v.sleepHours < 6
          ? "น้อยกว่าที่ร่างกายวัยนี้ต้องการ"
          : v.sleepHours < 8
            ? "ยังน้อยกว่าเกณฑ์เล็กน้อย"
            : "อยู่ในเกณฑ์",
      flag: v.sleepHours < 6 ? "care" : v.sleepHours < 8 ? "watch" : "calm",
    },
    {
      key: "quality",
      label: "คุณภาพการนอน",
      value: `${v.sleepQuality}/5`,
      note: v.sleepQuality <= 2 ? "หลับยาก ตื่นแล้วไม่สดชื่น" : "พอใช้ได้",
      flag: v.sleepQuality <= 2 ? "care" : v.sleepQuality <= 3 ? "watch" : "calm",
    },
    {
      key: "activity",
      label: "ได้ขยับร่างกาย",
      value: `${v.activityDays} วัน/สัปดาห์`,
      note:
        v.activityDays <= 1
          ? "แทบไม่ได้ขยับเลย"
          : v.activityDays < 4
            ? "ยังห่างจากเกณฑ์ WHO"
            : "อยู่ในเกณฑ์",
      flag: v.activityDays <= 1 ? "care" : v.activityDays < 4 ? "watch" : "calm",
    },
    {
      key: "screen",
      label: "เวลาหน้าจอ",
      value: `${v.screenHours} ชม./วัน`,
      note: v.screenHours >= 8 ? "สูง และมักใช้ก่อนนอน" : "อยู่ในเกณฑ์ปกติ",
      flag: v.screenHours >= 8 ? "watch" : "calm",
    },
  ] as const;
}

/* ---------------- รวมเป็นโซนเดียว ---------------------------------------- */
export type Summary = {
  zone: Zone;
  headline: string;
  topics: string[];
  crisis: boolean;
};

const ORDER: Record<Zone, number> = { calm: 0, watch: 1, care: 2 };

export function combine(zones: Zone[], q8Raw: number): Zone {
  if (q8Raw >= 9) return "care";
  return zones.reduce<Zone>(
    (worst, z) => (ORDER[z] > ORDER[worst] ? z : worst),
    "calm"
  );
}

/** 8Q ตั้งแต่ระดับปานกลางขึ้นไป = เส้นทางฉุกเฉิน ไม่ใช่เรื่องคิว */
export function isCrisis(q8Raw: number) {
  return q8Raw >= 9;
}

export const ZONE_COPY: Record<
  Zone,
  { label: string; tone: string; lead: string }
> = {
  calm: {
    label: "พอไปไหว",
    tone: "calm",
    lead: "ยังอยู่ในระดับที่พอรับมือเองได้",
  },
  watch: {
    label: "เริ่มหนักขึ้น",
    tone: "watch",
    lead: "เริ่มกระทบชีวิตประจำวันแล้ว ไม่ควรแบกไว้คนเดียว",
  },
  care: {
    label: "ควรมีคนช่วยดู",
    tone: "care",
    lead: "ควรมีผู้เชี่ยวชาญช่วยดูแล",
  },
};

/** ข้อความนี้ต้องไม่หายไปจากทุกหน้าจอ */
export const HOTLINES = [
  { name: "สายด่วนสุขภาพจิต", number: "1323", note: "ฟรี 24 ชั่วโมง" },
  { name: "เจ็บป่วยฉุกเฉิน", number: "1669", note: "ฟรี 24 ชั่วโมง" },
];
