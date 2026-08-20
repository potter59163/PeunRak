import { extractItems, type Extracted } from "@/lib/llm";
import { upsert, ZONE_TO_RISK, type Assessment } from "@/lib/store";
import {
  Q9, GAD7, Q8, INSTRUMENTS, scoreOf, combine, isCrisis,
  type Extraction,
} from "@/lib/instruments";

export const runtime = "nodejs";

/**
 * AI ตัวที่สอง — ประเมินความเสี่ยงจากบทสนทนาแบบ real time
 *
 * สถาปัตยกรรมเดียวกับหน้าสรุปผล: AI ไม่ได้เป็นคนให้คะแนน
 *   1. AI สกัดหลักฐาน  → map เข้าข้อของ 9Q / GAD-7 / 8Q พร้อมความมั่นใจ
 *   2. โค้ดคำนวณ       → ตามเกณฑ์กรมสุขภาพจิต (scoreOf ใน lib/instruments.ts)
 *   3. ครูเห็น          → คะแนนที่ตรวจสอบย้อนกลับได้ ไม่ใช่ตัวเลขที่ AI เดา
 *
 * เนื้อหาบทสนทนาไม่ถูกบันทึกที่ไหนเลย ทั้ง prompt และ schema ไม่ขอคำพูดอ้างอิงกลับมา
 */

/** สร้าง prompt จากนิยามเครื่องมือโดยตรง เพื่อให้ไม่มีวันหลุด sync กับ lib/instruments.ts */
const ITEM_LIST = INSTRUMENTS.flatMap((ins) =>
  ins.items.map((i) => `${i.id} (0-${i.max}) ${i.text}`)
).join("\n");

const SYSTEM = `อ่านบทสนทนาของนักเรียนไทย แล้วระบุว่ามีหลักฐานตรงกับข้อใดของแบบประเมินมาตรฐานบ้าง

รายการข้อทั้งหมด
${ITEM_LIST}

กติกา
- ให้คะแนนเฉพาะข้อที่มีหลักฐานจากสิ่งที่นักเรียนพูดจริงเท่านั้น ห้ามเดา ห้ามอนุมานเกินข้อความ
- ข้อที่ไม่มีหลักฐาน ไม่ต้องใส่ในคำตอบ
- score ต้องไม่เกินค่าสูงสุดของข้อนั้น
- confidence 0.0-1.0 ตามความชัดเจนของหลักฐาน ถ้าคลุมเครือให้ต่ำกว่า 0.6
- ข้อกลุ่ม 8Q ให้ระวังเป็นพิเศษ ให้คะแนนเมื่อมีสัญญาณชัดเจนเท่านั้น
- ห้ามส่งข้อความหรือคำพูดของนักเรียนกลับมา ส่งเฉพาะ id คะแนน และความมั่นใจ
- ตอบเป็น JSON เท่านั้น`;

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          score: { type: "integer" },
          confidence: { type: "number" },
        },
        required: ["id", "score", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

/** ใช้เมื่อยังไม่มีคีย์ — map คำสำคัญเข้าข้อโดยตรง ให้ได้ผลลัพธ์รูปแบบเดียวกัน */
const CUES: { keys: string[]; id: string; score: number }[] = [
  { keys: ["เบื่อ", "ไม่อยากทำ", "ไม่สนุก", "ไม่มีอะไรน่าสนใจ"], id: "9Q_1", score: 2 },
  { keys: ["เศร้า", "ท้อ", "หดหู่", "ร้องไห้", "ไม่สบายใจ"], id: "9Q_2", score: 2 },
  { keys: ["นอนไม่หลับ", "หลับยาก", "ตีสอง", "ตีสาม", "นอนไม่พอ", "ตื่นกลางดึก"], id: "9Q_3", score: 3 },
  { keys: ["เหนื่อย", "ไม่มีแรง", "เพลีย", "ล้า"], id: "9Q_4", score: 2 },
  { keys: ["เบื่ออาหาร", "ไม่อยากกิน", "กินไม่ลง"], id: "9Q_5", score: 2 },
  { keys: ["ไร้ค่า", "ล้มเหลว", "ไม่ดีพอ", "เกลียดตัวเอง", "โง่"], id: "9Q_6", score: 2 },
  { keys: ["ไม่มีสมาธิ", "ใจลอย", "จดจ่อไม่ได้"], id: "9Q_7", score: 2 },
  { keys: ["อยากตาย", "ไม่อยากอยู่", "หายไปเลย", "ตายไปน่าจะดี", "ไม่อยากตื่น"], id: "9Q_9", score: 2 },
  { keys: ["กังวล", "ประหม่า", "หงุดหงิด"], id: "GAD_1", score: 2 },
  { keys: ["คิดวน", "หยุดคิดไม่ได้", "หยุดกังวลไม่ได้"], id: "GAD_2", score: 2 },
  { keys: ["เครียด", "กดดัน", "สอบ"], id: "GAD_3", score: 2 },
  { keys: ["ผ่อนคลายไม่ได้", "ไม่รู้สึกผ่อนคลาย"], id: "GAD_4", score: 2 },
  { keys: ["อยากตาย", "ไม่อยากอยู่", "ตายไปน่าจะดี"], id: "8Q_1", score: 1 },
  { keys: ["ทำร้ายตัวเอง", "กรีดแขน", "ทำร้ายตนเอง"], id: "8Q_2", score: 2 },
  { keys: ["ฆ่าตัวตาย", "จบชีวิต"], id: "8Q_3", score: 6 },
  { keys: ["มีแผน", "วางแผนไว้", "คิดว่าคืนนี้"], id: "8Q_5", score: 8 },
  { keys: ["เตรียมของ", "เตรียมไว้แล้ว", "เตรียมการ"], id: "8Q_6", score: 9 },
];

function heuristic(text: string): Extracted[] {
  const seen = new Set<string>();
  const out: Extracted[] = [];
  for (const c of CUES) {
    if (seen.has(c.id)) continue;
    if (c.keys.some((k) => text.includes(k))) {
      seen.add(c.id);
      out.push({ id: c.id, score: c.score, confidence: 0.7 });
    }
  }
  return out;
}

const VALID = new Map(INSTRUMENTS.flatMap((i) => i.items).map((i) => [i.id, i.max]));

/** กันโมเดลส่งข้อที่ไม่มีจริง หรือคะแนนเกินเพดานของข้อนั้น */
function sanitise(raw: Extracted[]): Extraction[] {
  return raw
    .filter((e) => VALID.has(e.id))
    .map((e) => ({
      itemId: e.id,
      score: Math.max(0, Math.min(e.score, VALID.get(e.id)!)),
      confidence: Math.max(0, Math.min(e.confidence, 1)),
      evidence: "", // ไม่เก็บคำพูด โดยตั้งใจ
    }));
}

export async function POST(req: Request) {
  const { id, messages, profile } = (await req.json()) as {
    id: string;
    messages: { role: string; content: string }[];
    profile?: { name?: string; room?: string; shared?: boolean };
  };

  const users = messages.filter((m) => m.role === "user");
  const turns = users.length;
  const joined = users.map((m) => m.content).join("\n");

  const fromAi = await extractItems(joined, SYSTEM, SCHEMA);
  const ex = sanitise(fromAi ?? heuristic(joined));

  // ชั้นที่ 3 — คำนวณด้วยโค้ด ไม่ใช่ AI
  const s9 = scoreOf(Q9, ex);
  const sG = scoreOf(GAD7, ex);
  const s8 = scoreOf(Q8, ex);

  const zone = combine([s9.zone, sG.zone], s8.raw);
  const total = INSTRUMENTS.reduce((n, i) => n + i.items.length, 0);
  const covered = s9.answered + sG.answered + s8.answered;

  /**
   * คะแนนต่ำจากหลักฐานบาง ๆ ไม่ได้แปลว่าเด็กปลอดภัย
   * ถ้าเก็บ 9Q ได้ไม่ถึงครึ่ง ให้ทำเครื่องหมายว่ายังสรุปไม่ได้
   */
  const provisional = zone === "calm" && s9.answered < 5;

  const assessment: Assessment = {
    q9: s9.raw, gad7: sG.raw, q8: s8.raw,
    q9Band: s9.band, gad7Band: sG.band, q8Band: s8.band,
    crisis: isCrisis(s8.raw),
    covered,
    total,
    provisional,
  };

  const snap = upsert(id, assessment, {
    risk: ZONE_TO_RISK[zone],
    turns,
    ...profile,
  });

  // คืนเฉพาะตัวเลข ไม่มีเนื้อหาใด ๆ
  return Response.json({
    risk: snap.risk,
    q9: snap.q9, gad7: snap.gad7, q8: snap.q8,
    crisis: snap.crisis,
    covered: snap.covered, total: snap.total,
    provisional: snap.provisional,
  });
}
