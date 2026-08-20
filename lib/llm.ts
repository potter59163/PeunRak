import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { fallbackReply } from "./fallback";

/**
 * ชั้นกลางสำหรับสลับผู้ให้บริการโมเดล
 * เลือกอัตโนมัติจากคีย์ที่มีอยู่: Gemini → Claude → โหมดสาธิต
 * โค้ดส่วนอื่นของแอปไม่ต้องรู้ว่าใช้เจ้าไหน
 */

export type Msg = { role: "user" | "assistant"; content: string };
export type Provider = "gemini" | "claude" | "demo";

const GEMINI_CHAT = process.env.GEMINI_CHAT_MODEL ?? "gemini-3.5-flash";
const GEMINI_FAST = process.env.GEMINI_FAST_MODEL ?? "gemini-3.5-flash-lite";
const CLAUDE_CHAT = "claude-sonnet-5";
const CLAUDE_FAST = "claude-haiku-4-5";

export function provider(): Provider {
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

export async function chatStream(messages: Msg[], system: string): Promise<ReadableStream> {
  const p = provider();
  if (p === "demo") return typeOut(fallbackReply(messages));

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
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
 * สกัดหลักฐานจากบทสนทนา แล้ว map เข้าข้อของแบบประเมินมาตรฐาน
 * จงใจ "ไม่ขอคำพูดอ้างอิง" กลับมาในเส้นทางนี้ — เพื่อให้เป็นไปไม่ได้เชิงโครงสร้าง
 * ที่เนื้อหาบทสนทนาจะรั่วไปถึงครู คืนแค่ id ข้อ คะแนน และความมั่นใจ
 */
export type Extracted = { id: string; score: number; confidence: number };

export async function extractItems(
  text: string,
  system: string,
  schema: Record<string, unknown>
): Promise<Extracted[] | null> {
  const p = provider();
  if (p === "demo") return null;

  try {
    if (p === "gemini") {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY,
      });
      const r = await ai.interactions.create({
        model: GEMINI_FAST,
        system_instruction: system,
        input: text.slice(-4000),
        response_format: { type: "text", mime_type: "application/json", schema },
      });
      return r.output_text ? (JSON.parse(r.output_text).items ?? null) : null;
    }

    const client = new Anthropic();
    const r = await client.messages.create({
      model: CLAUDE_FAST,
      max_tokens: 128,
      system,
      output_config: { format: { type: "json_schema", schema } },
      messages: [{ role: "user", content: text.slice(-4000) }],
    });
    const b = r.content.find((x) => x.type === "text");
    return b && b.type === "text" ? (JSON.parse(b.text).items ?? null) : null;
  } catch {
    return null;
  }
}
