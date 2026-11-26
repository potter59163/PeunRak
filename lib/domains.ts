/**
 * หมวดปัจจัยเสี่ยง — "ประตูบานเดียว"
 *
 * แบบประเมิน 9Q / GAD-7 / 8Q บอกได้ว่าทุกข์แค่ไหน แต่ไม่บอกว่าทุกข์จากเรื่องอะไร
 * หมวดด้านล่างใช้ "ชี้ทาง" ว่าควรพาไปหาใคร ไม่ได้ใช้ให้คะแนน และไม่ใช่การวินิจฉัย
 *
 * สิ่งที่ออกจากไฟล์นี้มีแค่ id ของหมวดกับค่าความมั่นใจ — ไม่มีข้อความของนักเรียน
 */

export const DOMAINS = [
  "academic_pressure",
  "bullying",
  "online_threat",
  "vaping_alcohol",
  "gambling",
  "family_violence",
  "sleep",
  "relationship",
] as const;

export type DomainId = (typeof DOMAINS)[number];
export type DomainHit = { id: DomainId; confidence: number };

/** ต่ำกว่านี้ไม่แสดงการ์ด ไม่แสดงแท็ก — เดาไม่ได้ ต้องมีหลักฐาน */
export const DOMAIN_FLOOR = 0.6;

export const DOMAIN_INFO: Record<
  DomainId,
  {
    /** ป้ายสั้นฝั่งครู */
    tag: string;
    /** คำอธิบายให้ AI ตัวที่สองใช้จับหมวด */
    hint: string;
    /** เรื่องที่อาจมีอันตรายต่อตัวเด็กขึ้นก่อน */
    priority: number;
  }
> = {
  family_violence: { tag: "ความรุนแรงในบ้าน", hint: "ถูกทำร้ายร่างกาย ถูกข่มขู่ หรือไม่ปลอดภัยในบ้าน รวมถึงถูกล่วงละเมิด", priority: 0 },
  online_threat: { tag: "ภัยออนไลน์", hint: "ถูกหลอกลวง ข่มขู่ แบล็กเมล์ หลอกโอนเงิน ชวนเปิดบัญชีม้า หรือมีคนอ้างเป็นเจ้าหน้าที่", priority: 1 },
  bullying: { tag: "ถูกกลั่นแกล้ง", hint: "ถูกแกล้ง ล้อ กีดกัน หรือประจาน ทั้งต่อหน้าและในออนไลน์", priority: 2 },
  gambling: { tag: "การพนัน", hint: "เล่นพนัน พนันออนไลน์ หรือมีหนี้จากการพนัน", priority: 3 },
  vaping_alcohol: { tag: "บุหรี่ไฟฟ้า/แอลกอฮอล์", hint: "ใช้บุหรี่ไฟฟ้า บุหรี่ แอลกอฮอล์ หรือสารเสพติดอื่น", priority: 4 },
  academic_pressure: { tag: "เรื่องเรียน", hint: "กดดันจากการเรียน การสอบ เกรด หรือความคาดหวังเรื่องผลการเรียน", priority: 5 },
  relationship: { tag: "ความสัมพันธ์", hint: "ปัญหากับเพื่อนหรือแฟน ทะเลาะ เลิกรา ถูกทิ้ง รู้สึกโดดเดี่ยว", priority: 6 },
  sleep: { tag: "การนอน", hint: "นอนไม่หลับ นอนไม่พอ หรือการนอนรวนต่อเนื่อง", priority: 7 },
};

const VALID = new Set<string>(DOMAINS);
export const isDomain = (x: unknown): x is DomainId => typeof x === "string" && VALID.has(x);

/**
 * รับอะไรก็ได้จากภายนอก (โมเดล / client) แล้วคืนเฉพาะ id ที่มีจริงกับตัวเลข
 * ฟิลด์อื่นที่ติดมาถูกทิ้งทั้งหมด — ต่อให้โมเดลแอบส่งข้อความมา ก็ไม่มีทางผ่านจุดนี้
 */
export function cleanDomains(raw: unknown): DomainHit[] {
  if (!Array.isArray(raw)) return [];
  const best = new Map<DomainId, number>();
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const { id, confidence } = r as { id?: unknown; confidence?: unknown };
    if (!isDomain(id) || typeof confidence !== "number" || Number.isNaN(confidence)) continue;
    const c = Math.round(Math.max(0, Math.min(confidence, 1)) * 100) / 100;
    if (c > (best.get(id) ?? -1)) best.set(id, c);
  }
  return [...best].map(([id, confidence]) => ({ id, confidence }));
}

/** หมวดที่มั่นใจพอจะแสดง เรียงเรื่องความปลอดภัยขึ้นก่อน */
export function shown(hits: DomainHit[] | undefined, limit = 8): DomainHit[] {
  return (hits ?? [])
    .filter((h) => h.confidence >= DOMAIN_FLOOR)
    .sort((a, b) => DOMAIN_INFO[a.id].priority - DOMAIN_INFO[b.id].priority || b.confidence - a.confidence)
    .slice(0, limit);
}

/* ---------------- โหมดสาธิต: จับหมวดจากคำสำคัญ --------------------------- */

/**
 * strong = คำที่ชี้หมวดชัดเจนคำเดียวก็พอ
 * weak   = คำกว้าง ๆ ต้องเจออย่างน้อยสองคำถึงจะนับ
 * ระวังคำสั้นที่ไปซ้อนกับคำอื่น เช่น "ตี" (ตีสอง) "พอต" (พอตัว) "เตะ" (เตะบอล)
 */
const CUES: { id: DomainId; strong: string[]; weak: string[] }[] = [
  {
    id: "online_threat",
    strong: [
      "ฟอกเงิน", "บัญชีม้า", "แบล็กเมล", "แบล็คเมล", "ข่มขู่", "ขู่ว่าจะ", "ขู่จะ", "หลอกให้โอน", "หลอกโอน",
      "โดนหลอก", "ถูกหลอก", "มิจฉาชีพ", "คอลเซ็นเตอร์", "แก๊งคอล", "อายัดบัญชี", "เปิดบัญชีให้", "รับจ้างเปิดบัญชี",
      "รูปหลุด", "คลิปหลุด", "ปล่อยรูป", "ปล่อยคลิป", "ขอรูปโป๊", "ส่งรูปโป๊", "พัวพัน", "อ้างเป็นตำรวจ", "ตำรวจโทรมา", "โดนแฮก",
    ],
    weak: ["โอนเงิน", "คนแปลกหน้า", "ในเน็ต", "ออนไลน์", "ลิงก์", "ห้ามบอกพ่อแม่"],
  },
  {
    id: "family_violence",
    strong: [
      "พ่อตี", "แม่ตี", "โดนตี", "ถูกตี", "ตีผม", "ตีหนู", "ตีเรา", "ทุบตี", "โดนตบ", "ตบหน้า", "โดนเตะ", "ทำร้ายร่างกาย",
      "พ่อทำร้าย", "แม่ทำร้าย", "โดนทำร้าย", "ไล่ออกจากบ้าน", "ไม่กล้ากลับบ้าน", "กลัวพ่อ", "กลัวแม่", "ลวนลาม", "ล่วงละเมิด",
      "ลงไม้ลงมือ", "ขว้างของใส่",
    ],
    weak: ["ที่บ้านทะเลาะ", "พ่อแม่ทะเลาะ", "พ่อเมา", "โดนด่าทุกวัน", "ไม่อยากกลับบ้าน"],
  },
  {
    id: "bullying",
    strong: [
      "โดนแกล้ง", "ถูกแกล้ง", "กลั่นแกล้ง", "บูลลี่", "โดนล้อ", "ล้อเลียน", "เพื่อนแบน", "โดนแบน", "โดนรุม",
      "ไม่มีใครคบ", "ประจาน", "โดนแอนตี้", "ไม่ให้เข้ากลุ่ม",
    ],
    weak: ["แกล้ง", "ล้อ", "นินทา", "หัวเราะเยาะ"],
  },
  {
    id: "gambling",
    strong: ["พนัน", "แทงบอล", "บาคาร่า", "สล็อต", "หวยออนไลน์", "เล่นไพ่กินเงิน"],
    weak: ["ติดหนี้", "เสียเงิน", "ยืมเงิน", "หมดตัว"],
  },
  {
    id: "vaping_alcohol",
    strong: [
      "บุหรี่ไฟฟ้า", "ดูดพอต", "สูบพอต", "ติดพอต", "สูบบุหรี่", "ดูดบุหรี่", "กินเหล้า", "ดื่มเหล้า", "เมาเหล้า",
      "กัญชา", "กระท่อม", "ยาบ้า", "เสพยา", "ยาเสพติด",
    ],
    weak: ["เหล้า", "เบียร์", "บุหรี่", "เมา"],
  },
  {
    id: "academic_pressure",
    strong: [
      "เครียดเรื่องเรียน", "เครียดเรื่องสอบ", "กดดันเรื่องเรียน", "สอบตก", "สอบไม่ผ่าน", "กลัวสอบ", "สอบเข้า",
      "เกรดตก", "เกรดไม่ดี", "เรียนไม่ทัน", "การบ้านเยอะ", "ติวหนัก", "ติดศูนย์", "ซ้ำชั้น",
    ],
    weak: ["สอบ", "เรียน", "การบ้าน", "เกรด", "คะแนน", "ติว"],
  },
  {
    id: "relationship",
    strong: [
      "เลิกกับแฟน", "แฟนทิ้ง", "แฟนบอกเลิก", "อกหัก", "แฟนนอกใจ", "ทะเลาะกับแฟน", "ทะเลาะกับเพื่อน",
      "เพื่อนทิ้ง", "เพื่อนไม่คุย", "เพื่อนเลิกคบ",
    ],
    weak: ["แฟน", "เพื่อน", "ทะเลาะ", "เหงา"],
  },
  {
    id: "sleep",
    strong: ["นอนไม่หลับ", "หลับยาก", "นอนไม่พอ", "ตื่นกลางดึก", "ไม่ได้นอน", "อดนอน", "ฝันร้าย"],
    weak: ["ตีสอง", "ตีสาม", "ง่วง", "นอนดึก", "นอน"],
  },
];

export function detectDomains(text: string): DomainHit[] {
  const out: DomainHit[] = [];
  for (const c of CUES) {
    const strong = c.strong.some((k) => text.includes(k));
    const weak = c.weak.filter((k) => text.includes(k)).length;
    const confidence = strong ? 0.8 : weak >= 2 ? 0.65 : weak === 1 ? 0.4 : 0;
    if (confidence > 0) out.push({ id: c.id, confidence });
  }
  return out;
}
