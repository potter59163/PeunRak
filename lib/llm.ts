import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { fallbackReply } from "./fallback";
import { redact } from "./redact";

/**
 * ชั้นกลางสำหรับสลับผู้ให้บริการโมเดล
 * เลือกอัตโนมัติจากคีย์ที่มีอยู่: Gemini → Claude → โหมดสาธิต
 * โค้ดส่วนอื่นของแอปไม่ต้องรู้ว่าใช้เจ้าไหน
 *
 * ไฟล์นี้คือ "ประตูออก" บานเดียวของข้อความนักเรียน: ทุกอย่างที่ส่งไปหาผู้ให้บริการภายนอก
 * ผ่าน redact() ตรงนี้ก่อนเสมอ (ชื่อ เบอร์โทร เลขบัตร อีเมล โรงเรียน/ห้อง → ป้ายกำกับ)
 * โหมดสาธิตไม่ส่งอะไรออกนอกเครื่อง จึงใช้ข้อความเดิม
 */

export type Msg = { role: "user" | "assistant"; content: string };
export type Provider = "gemini" | "claude" | "demo";

const GEMINI_CHAT = process.env.GEMINI_CHAT_MODEL ?? "gemini-3.5-flash";
const GEMINI_FAST = process.env.GEMINI_FAST_MODEL ?? "gemini-3.5-flash-lite";
const CLAUDE_CHAT = "claude-sonnet-5";
const CLAUDE_FAST = "claude-haiku-4-5";

/**
 * FORCE_DEMO=1 บังคับโหมดสาธิตแม้จะมีคีย์อยู่ — ใช้วันเดโมถ้าเน็ตหรือ API ไม่นิ่ง
 * ส่วน header X-Force-Demo ใช้กับชุดทดสอบ red-team เพื่อรันสองโหมดบน server ตัวเดียว
 */
export function provider(forceDemo = false): Provider {
  if (forceDemo || process.env.FORCE_DEMO === "1") return "demo";
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "claude";
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

export async function chatStream(messages: Msg[], system: string, forceDemo = false): Promise<ReadableStream> {
  const p = provider(forceDemo);
  if (p === "demo") return typeOut(fallbackReply(messages));

  // จากบรรทัดนี้ลงไปข้อความจะออกนอกระบบ — ใช้ชุดที่ตัดข้อมูลระบุตัวตนแล้วเท่านั้น
  messages = messages.map((m) => (m.role === "user" ? { ...m, content: redact(m.content) } : m));

  if (p === "gemini") {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
    });
    return new ReadableStream({
      async start(c) {
        const e = enc();
        try {
          const stream = await ai.interactions.create({
            model: GEMINI_CHAT,
            system_instruction: system,
            stream: true,
            input: messages.map((m) =>
              m.role === "assistant"
                ? { type: "model_output" as const, content: [{ type: "text" as const, text: m.content }] }
                : { type: "user_input" as const, content: [{ type: "text" as const, text: m.content }] }
            ),
          });
          for await (const ev of stream) {
            if (ev.event_type === "step.delta" && ev.delta.type === "text") {
              c.enqueue(e.encode(ev.delta.text));
            }
          }
        } catch {
          c.enqueue(e.encode(FAIL));
        }
        c.close();
      },
    });
  }

  const client = new Anthropic();
  return new ReadableStream({
    async start(c) {
      const e = enc();
      try {
        const s = client.messages.stream({
          model: CLAUDE_CHAT,
          max_tokens: 1024,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          // Messages API ต้องเริ่มที่ฝั่งผู้ใช้ — ตัดข้อความเปิดของระบบ (ที่หน้าแชทแสดงเอง) ออกก่อนส่ง
          messages: messages
            .slice(Math.max(0, messages.findIndex((m) => m.role === "user")))
            .map((m) => ({ role: m.role, content: m.content })),
        });
        for await (const ev of s) {
          if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") {
            c.enqueue(e.encode(ev.delta.text));
          }
        }
      } catch {
        c.enqueue(e.encode(FAIL));
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
    if (p === "gemini") {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
      });
      const r = await ai.interactions.create({
        model: GEMINI_FAST,
        system_instruction: system,
        input: safe,
        response_format: { type: "text", mime_type: "application/json", schema },
      });
      return r.output_text ? parse(r.output_text) : null;
    }

    const client = new Anthropic();
    const r = await client.messages.create({
      model: CLAUDE_FAST,
      // เดิม 128 — ไม่พอเมื่อมีหลักฐานหลายข้อ JSON ถูกตัดกลางทางแล้วตกไปใช้ heuristic เงียบ ๆ
      max_tokens: 1024,
      system,
      output_config: { format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: safe }],
    });
    const b = r.content.find((x) => x.type === "text");
    return b && b.type === "text" ? parse(b.text) : null;
  } catch {
    return null;
  }
}
