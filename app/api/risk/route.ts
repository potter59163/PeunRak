import { extractItems, provider, type Extracted } from "@/lib/llm";
import { upsert, ZONE_TO_RISK, type Assessment } from "@/lib/store";
import {
  Q9, GAD7, Q8, INSTRUMENTS, CONFIDENCE_FLOOR, scoreOf, combine, isCrisis,
  type Extraction, type Zone,
} from "@/lib/instruments";
import { DOMAINS, DOMAIN_INFO, cleanDomains, detectDomains, shown } from "@/lib/domains";
import { toLevel } from "@/lib/handoff";
import { IDEATION, mentionsSelfHarm } from "@/lib/fallback";

export const runtime = "nodejs";

/**
 * AI ตัวที่สอง — ประเมินความเสี่ยงจากบทสนทนาแบบ real time
 *
 * สถาปัตยกรรมเดียวกับหน้าสรุปผล: AI ไม่ได้เป็นคนให้คะแนน
 *   1. AI สกัดหลักฐาน  → map เข้าข้อของ 9Q / GAD-7 / 8Q พร้อมความมั่นใจ
 *                        + ชี้หมวดปัจจัยเสี่ยง เพื่อพาไปหาคนที่ช่วยได้ถูกทาง
 *   2. โค้ดคำนวณ       → ตามเกณฑ์กรมสุขภาพจิต (scoreOf ใน lib/instruments.ts)
 *   3. ครูเห็น          → คะแนนที่ตรวจสอบย้อนกลับได้ ไม่ใช่ตัวเลขที่ AI เดา
 *
 * เนื้อหาบทสนทนาไม่ถูกบันทึกที่ไหนเลย ทั้ง prompt และ schema ไม่ขอคำพูดอ้างอิงกลับมา
 * สิ่งที่ออกจากโมเดลมีแค่ id · คะแนน · ความมั่นใจ และถูกกรองซ้ำด้วย sanitise / cleanDomains
 */

/** สร้าง prompt จากนิยามเครื่องมือโดยตรง เพื่อให้ไม่มีวันหลุด sync กับ lib/instruments.ts */
const ITEM_LIST = INSTRUMENTS.flatMap((ins) =>
  ins.items.map((i) => `${i.id} (0-${i.max}) ${i.text}`)
).join("\n");

const DOMAIN_LIST = DOMAINS.map((d) => `${d} — ${DOMAIN_INFO[d].hint}`).join("\n");

const SYSTEM = `อ่านบทสนทนาของนักเรียนไทย แล้วทำสองอย่าง
1) ระบุว่ามีหลักฐานตรงกับข้อใดของแบบประเมินมาตรฐานบ้าง (items)
2) ระบุว่าเรื่องที่ทำให้ทุกข์อยู่ในหมวดปัจจัยเสี่ยงใดบ้าง (domains)

รายการข้อทั้งหมด
${ITEM_LIST}

หมวดปัจจัยเสี่ยง
${DOMAIN_LIST}

กติกา
- ให้คะแนนเฉพาะข้อที่มีหลักฐานจากสิ่งที่นักเรียนพูดจริงเท่านั้น ห้ามเดา ห้ามอนุมานเกินข้อความ
- ข้อที่ไม่มีหลักฐาน ไม่ต้องใส่ในคำตอบ
- score ต้องไม่เกินค่าสูงสุดของข้อนั้น
- confidence 0.0-1.0 ตามความชัดเจนของหลักฐาน ถ้าคลุมเครือให้ต่ำกว่า 0.6
- ข้อกลุ่ม 8Q ให้ระวังเป็นพิเศษ ให้คะแนนเมื่อมีสัญญาณชัดเจนเท่านั้น
- domains ใส่เฉพาะหมวดที่นักเรียนเล่าถึงเองจริง ๆ ใช้ id จากรายการเท่านั้น ไม่มีก็ส่งรายการว่าง
- หมวดเป็นแค่การชี้ทางไปหาคนช่วย ไม่ใช่การวินิจฉัย และไม่มีผลกับคะแนน
- ห้ามส่งข้อความหรือคำพูดของนักเรียนกลับมา ส่งเฉพาะ id คะแนน และความมั่นใจ
- ป้ายในวงเล็บเหลี่ยม เช่น [ชื่อ] [เบอร์โทร] [โรงเรียน] คือข้อมูลส่วนตัวที่ระบบปิดไว้ ไม่ใช่หลักฐานของข้อใด
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
    domains: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: [...DOMAINS] },
          confidence: { type: "number" },
        },
        required: ["id", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["items", "domains"],
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
  { keys: IDEATION, id: "9Q_9", score: 2 },
  { keys: ["กังวล", "ประหม่า", "หงุดหงิด"], id: "GAD_1", score: 2 },
  { keys: ["คิดวน", "หยุดคิดไม่ได้", "หยุดกังวลไม่ได้"], id: "GAD_2", score: 2 },
  { keys: ["เครียด", "กดดัน", "สอบ"], id: "GAD_3", score: 2 },
  { keys: ["ผ่อนคลายไม่ได้", "ไม่รู้สึกผ่อนคลาย"], id: "GAD_4", score: 2 },
  { keys: ["กลัวว่าจะเกิดเรื่อง", "กลัวมาก", "ใจสั่น"], id: "GAD_7", score: 2 },
  { keys: IDEATION, id: "8Q_1", score: 1 },
  { keys: ["ทำร้ายตัวเอง", "กรีดแขน", "กรีดข้อมือ", "ทำร้ายตนเอง"], id: "8Q_2", score: 2 },
  { keys: ["ฆ่าตัวตาย", "จบชีวิต", "โดดตึก", "กระโดดตึก", "ผูกคอ"], id: "8Q_3", score: 6 },
  { keys: ["มีแผน", "วางแผนไว้", "คิดว่าคืนนี้"], id: "8Q_5", score: 8 },
  { keys: ["เตรียมของ", "เตรียมไว้แล้ว", "เตรียมการ", "เตรียมยาไว้", "เขียนจดหมายลา"], id: "8Q_6", score: 9 },
  { keys: ["กรีดแขน", "กรีดข้อมือ"], id: "8Q_7", score: 4 },
  { keys: ["เคยพยายามฆ่าตัวตาย", "เคยกินยาเกินขนาด", "เคยลองฆ่าตัวตาย"], id: "8Q_8", score: 10 },
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
    .filter((e) => e && VALID.has(e.id) && typeof e.score === "number" && typeof e.confidence === "number")
    .map((e) => ({
      itemId: e.id,
      score: Math.max(0, Math.min(Math.round(e.score), VALID.get(e.id)!)),
      confidence: Math.max(0, Math.min(e.confidence, 1)),
      evidence: "", // ไม่เก็บคำพูด โดยตั้งใจ
    }));
}

const UTF8 = { "Content-Type": "application/json; charset=utf-8" };

export async function POST(req: Request) {
  const { id, messages, profile, dry } = (await req.json()) as {
    id?: string;
    messages?: { role: string; content: string }[];
    profile?: { name?: string; room?: string; level?: number };
    /** คำนวณอย่างเดียว ไม่บันทึก — ใช้กับชุดทดสอบ red-team จะได้ไม่มีเคสปลอมไปโผล่บนแดชบอร์ดครู */
    dry?: boolean;
  };

  if (!id || typeof id !== "string" || !Array.isArray(messages)) {
    return Response.json({ error: "invalid" }, { status: 400, headers: UTF8 });
  }

  const forceDemo = req.headers.get("x-force-demo") === "1";
  const users = messages.filter((m) => m.role === "user" && typeof m.content === "string");
  const turns = users.length;
  const joined = users.map((m) => m.content).join("\n");

  const fromAi = await extractItems(joined, SYSTEM, SCHEMA, forceDemo);
  const ex = sanitise(fromAi?.items ?? heuristic(joined));
  const domains = fromAi ? cleanDomains(fromAi.domains) : detectDomains(joined);
  /** ใครเป็นคนสกัดรอบนี้ — ถ้าเรียกโมเดลไม่สำเร็จแล้วตกมาใช้กฎคำสำคัญ ต้องบอกตามจริงว่าเป็น demo */
  const source = fromAi ? provider(forceDemo) : "demo";

  // ชั้นที่ 3 — คำนวณด้วยโค้ด ไม่ใช่ AI
  const s9 = scoreOf(Q9, ex);
  const sG = scoreOf(GAD7, ex);
  const s8 = scoreOf(Q8, ex);

  /**
   * พื้นความปลอดภัย (ไม่แก้คะแนน แก้แค่ไม่ให้เคสหลุด):
   * มีหลักฐานข้อ 9 ของ 9Q หรือข้อใดของ 8Q แม้ระดับน้อย ต้องไม่ถูกจัดเป็น "เสี่ยงต่ำ / ข้อมูลยังไม่พอ"
   * [ต้องยืนยัน] ให้ผู้เชี่ยวชาญตรวจเกณฑ์นี้พร้อมกับจุดตัดใน lib/instruments.ts
   */
  // ถ้าโมเดลไม่ได้สกัดข้อ 9 แต่นักเรียนพิมพ์คำที่สื่อถึงการทำร้ายตัวเองชัด ๆ ก็ถือเป็นสัญญาณเช่นกัน (ตาข่ายด้วยโค้ด)
  const ideation = ex.some((e) => e.itemId === "9Q_9" && e.score > 0 && e.confidence >= CONFIDENCE_FLOOR) || mentionsSelfHarm(joined);
  let zone: Zone = combine([s9.zone, sG.zone, s8.zone], s8.raw);
  if (ideation && zone === "calm") zone = "watch";
  /** ใช้ขึ้นการ์ดสายด่วนในหน้าแชท โดยไม่พึ่งว่าแชทบอทจะพูดถึงเองหรือไม่ */
  const safety = isCrisis(s8.raw) ? "crisis" : s8.raw > 0 || ideation ? "watch" : "none";
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
  const risk = ZONE_TO_RISK[zone];
  /** ข้อที่มั่นใจพอจนถูกนับคะแนน — id + คะแนน + ความมั่นใจ ไม่มีคำพูด */
  const items = [...s9.evidence, ...sG.evidence, ...s8.evidence].map((e) => ({
    id: e.itemId, score: e.score, confidence: Math.round(e.confidence * 100) / 100,
  }));

  if (!dry) {
    // หมวดเรื่องและชื่อจะถูกเก็บหรือไม่ ขึ้นกับระดับที่นักเรียนเลือก — ตัดสินใน store.disclose()
    await upsert(id, assessment, {
      risk,
      turns,
      level: toLevel(profile?.level) ?? undefined,
      name: profile?.name,
      room: profile?.room,
      domains,
      items,
    });
  }

  // คืนเฉพาะตัวเลขกับ id หมวด ไม่มีเนื้อหาใด ๆ — นักเรียนใช้แสดงการ์ดช่องทางช่วยเหลือของตัวเอง
  return Response.json(
    {
      risk,
      q9: assessment.q9, gad7: assessment.gad7, q8: assessment.q8,
      crisis: assessment.crisis,
      safety,
      covered, total,
      /** เก็บหลักฐานได้กี่ข้อของแต่ละแบบประเมิน */
      answered: { q9: s9.answered, gad7: sG.answered, q8: s8.answered },
      provisional,
      domains: shown(domains),
      // นักเรียนใช้ดู "คะแนนมาจากข้อไหน" ของตัวเอง — server เก็บรายข้อเฉพาะเมื่อยินยอมส่งต่อ (L3)
      items,
      source,
    },
    { headers: UTF8 }
  );
}
