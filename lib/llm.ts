import Anthropic from "@anthropic-ai/sdk";
import { fallbackReply } from "./fallback";
import { redact } from "./redact";

/**
 * ชั้นกลางสำหรับเรียกโมเดลภาษา — ใช้ Claude (Anthropic) และตกไปโหมดสาธิตเมื่อไม่มีคีย์
 * โค้ดส่วนอื่นของแอปไม่ต้องรู้ว่าใช้ผู้ให้บริการรายไหน ถ้าจะเปลี่ยนผู้ให้บริการ แก้ไฟล์นี้ไฟล์เดียว
 *
 * ทำไมไม่ใช้ Gemini แล้ว: เงื่อนไขของ Google ห้ามใช้ Generative AI ในบริการที่ผู้อายุต่ำกว่า 18 ปีเข้าถึง
 * ส่วน Usage Policy ของ Anthropic อนุญาตผลิตภัณฑ์ที่ให้บริการผู้เยาว์เมื่อทำตามแนวทางเพิ่มเติม
 * (ดู README หัวข้อ "ผู้ให้บริการ AI เก็บอะไร") — [ต้องยืนยัน] อ่านเงื่อนไขฉบับปัจจุบันก่อนใช้กับนักเรียนจริง
 *
 * ไฟล์นี้คือ "ประตูออก" บานเดียวของข้อความนักเรียน: ทุกอย่างที่ส่งไปหาผู้ให้บริการภายนอก
 * ผ่าน redact() ตรงนี้ก่อนเสมอ (ชื่อ เบอร์โทร เลขบัตร อีเมล โรงเรียน/ห้อง → ป้ายกำกับ)
 * โหมดสาธิตไม่ส่งอะไรออกนอกเครื่อง จึงใช้ข้อความเดิม
 */

export type Msg = { role: "user" | "assistant"; content: string };
export type Provider = "claude" | "demo";

/** แชท: ต้องอ่านอารมณ์และรักษากฎความปลอดภัยให้อยู่ตลอดบทสนทนา จึงใช้รุ่น Sonnet */
const CLAUDE_CHAT = "claude-sonnet-5-5";
/** สกัดหลักฐาน: งานจับคู่ข้อความเข้าข้อของแบบประเมิน เรียกทุกรอบ จึงใช้รุ่น Haiku ที่เร็วและถูกกว่า */
const CLAUDE_FAST = "claude-haiku-5-5";

/**
 * FORCE_DEMO=1 บังคับโหมดสาธิตแม้จะมีคีย์อยู่ — ใช้วันเดโมถ้าเน็ตหรือ API ไม่นิ่ง
 * ส่วน header X-Force-Demo ใช้กับชุดทดสอบ red-team เพื่อรันสองโหมดบน server ตัวเดียว
 */
export function provider(forceDemo = false): Provider {
  if (forceDemo || process.env.FORCE_DEMO === "1") return "demo";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) return "claude";
  return "demo";
}

function enc() {
  return new TextEncoder();
}

/** พิมพ์ทีละตัวอักษร ใช้กับโหมดสาธิตให้รู้สึกเหมือนกำลังพิมพ์ */
function typeOut(text: string) {
  return new ReadableStream({
    async start(c) {
      const e = enc();
      for (const ch of Array.from(text)) {
        c.enqueue(e.encode(ch));
        await new Promise((r) => setTimeout(r, 12));
      }
      c.close();
    },
  });
}

const FAIL = "ระบบขัดข้องชั่วคราว ลองพิมพ์อีกครั้งนะ ถ้าเร่งด่วนโทร 1323 ได้เลย";
/** ต่อท้ายเมื่อโมเดลหยุดกลางคัน — นักเรียนต้องไม่ถูกทิ้งไว้กับประโยคที่ค้าง */
const CUT = "\n\nขอโทษนะ เราตอบต่อไม่ได้ในตอนนี้ ถ้าอยากคุยกับคนจริง กด “พาไปหาคน” หรือโทร 1323 ได้เลย";

export async function chatStream(messages: Msg[], system: string, forceDemo = false): Promise<ReadableStream> {
  const p = provider(forceDemo);
  if (p === "demo") return typeOut(fallbackReply(messages));

  // จากบรรทัดนี้ลงไปข้อความจะออกนอกระบบ — ใช้ชุดที่ตัดข้อมูลระบุตัวตนแล้วเท่านั้น
  messages = messages.map((m) => (m.role === "user" ? { ...m, content: redact(m.content) } : m));

  const client = new Anthropic();
  return new ReadableStream({
    async start(c) {
      const e = enc();
      let sent = false;
      try {
        const s = client.messages.stream({
          model: CLAUDE_CHAT,
          // โมเดลรุ่นนี้คิดก่อนตอบได้เอง (adaptive thinking) และส่วนที่คิดนับรวมใน max_tokens
          // จึงเผื่อเพดานไว้สูงกว่าความยาวคำตอบจริง ซึ่ง system prompt คุมให้สั้นอยู่แล้ว
          max_tokens: 4096,
          // low = ระดับที่แนะนำสำหรับงานแชท: ข้อความทั่วไปตอบได้ทันที ไม่ต้องรอคิดนาน
          output_config: { effort: "low" },
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          // Messages API ต้องเริ่มที่ฝั่งผู้ใช้ — ตัดข้อความเปิดของระบบ (ที่หน้าแชทแสดงเอง) ออกก่อนส่ง
          messages: messages
            .slice(Math.max(0, messages.findIndex((m) => m.role === "user")))
            .map((m) => ({ role: m.role, content: m.content })),
        });
        for await (const ev of s) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            c.enqueue(e.encode(ev.delta.text));
            sent = true;
          }
        }
        const done = await s.finalMessage();
        /**
         * ตัวกรองความปลอดภัยของผู้ให้บริการอาจปฏิเสธคำขอ (HTTP 200, stop_reason = "refusal")
         * ซึ่งเกิดได้กับเรื่องอ่อนไหวอย่างการทำร้ายตนเอง — เป็นจังหวะที่ห้ามปล่อยให้หน้าจอว่าง
         * ถ้ายังไม่มีข้อความออกไปเลย ใช้คำตอบจากกฎตายตัวใน lib/fallback.ts ซึ่งมีเส้นทางวิกฤตและสายด่วนครบ
         */
        if (!sent) c.enqueue(e.encode(fallbackReply(messages)));
        else if (done.stop_reason === "refusal") c.enqueue(e.encode(CUT));
      } catch {
        c.enqueue(e.encode(sent ? CUT : FAIL));
      }
      c.close();
    },
  });
}

/**
 * สกัดหลักฐานจากบทสนทนา แล้ว map เข้าข้อของแบบประเมินมาตรฐาน + หมวดปัจจัยเสี่ยง
 * จงใจ "ไม่ขอคำพูดอ้างอิง" กลับมาในเส้นทางนี้ — เพื่อให้เป็นไปไม่ได้เชิงโครงสร้าง
 * ที่เนื้อหาบทสนทนาจะรั่วไปถึงครู คืนแค่ id คะแนน และความมั่นใจ
 *
 * domains คืนเป็น unknown โดยตั้งใจ — ผู้เรียกต้องผ่าน cleanDomains() ก่อนใช้เสมอ
 * คืน null เมื่อเรียกโมเดลไม่สำเร็จหรือถูกปฏิเสธ — ผู้เรียกจะตกไปใช้กฎคำสำคัญและบันทึกที่มาเป็น demo
 */
export type Extracted = { id: string; score: number; confidence: number };
export type ExtractResult = { items: Extracted[]; domains: unknown };

export async function extractItems(
  text: string,
  system: string,
  schema: Record<string, unknown>,
  forceDemo = false
): Promise<ExtractResult | null> {
  const p = provider(forceDemo);
  if (p === "demo") return null;

  // ตัดข้อมูลระบุตัวตนก่อน แล้วค่อยตัดความยาว (กันเลขที่ถูกหั่นครึ่งจนจับรูปแบบไม่ได้)
  const safe = redact(text).slice(-4000);

  const parse = (raw: string): ExtractResult | null => {
    const o = JSON.parse(raw);
    return Array.isArray(o.items) ? { items: o.items, domains: o.domains ?? [] } : null;
  };

  try {
    const client = new Anthropic();
    const r = await client.messages.create({
      model: CLAUDE_FAST,
      // ส่วนที่โมเดลคิดนับรวมในเพดานนี้ด้วย — ถ้าตั้งพอดีกับ JSON คำตอบจะถูกตัดกลางทางแล้วตกไปใช้ heuristic เงียบ ๆ
      max_tokens: 4096,
      system,
      // medium = ค่าเริ่มต้นของรุ่นนี้ ระบุไว้ชัดเพราะงานนี้เป็นแกนของการคัดกรอง ไม่ควรเปลี่ยนตามค่าเริ่มต้นของผู้ให้บริการ
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: safe }],
    });
    if (r.stop_reason === "refusal") return null;
    // คำตอบอาจขึ้นต้นด้วยบล็อก thinking — อ่านตามชนิดของบล็อก ไม่อ่านตามตำแหน่ง
    const b = r.content.find((x) => x.type === "text");
    return b && b.type === "text" ? parse(b.text) : null;
  } catch {
    return null;
  }
}
