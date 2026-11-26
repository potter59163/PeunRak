import { addPair, allPairs } from "@/lib/store";
import { agreement, cleanPair, MIN_ANSWERED } from "@/lib/agreement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UTF8 = { "Content-Type": "application/json; charset=utf-8" };

/**
 * Validation mode — เก็บคู่คะแนน 9Q (AI สกัด vs นักเรียนตอบเอง) แบบไม่ระบุตัวตน
 *
 * POST ไม่รับรหัสนักเรียน ไม่รับคำตอบรายข้อ ไม่รับข้อความ — รับแค่ตัวเลขห้าค่าใน cleanPair()
 * ต้องส่ง consent: true มาด้วย (หน้า /validate ส่งให้หลังนักเรียนกดยินยอมเท่านั้น)
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { consent?: boolean } & Record<string, unknown>;
  if (body.consent !== true) return Response.json({ error: "consent required" }, { status: 400, headers: UTF8 });
  const pair = cleanPair(body);
  if (!pair) return Response.json({ error: "invalid" }, { status: 400, headers: UTF8 });
  await addPair(pair);
  return Response.json({ ok: true }, { headers: UTF8 });
}

/** คืนเฉพาะค่าสรุป ไม่คืนคู่คะแนนรายคน */
export async function GET() {
  const pairs = await allPairs();
  const strict = pairs.filter((p) => p.blind && p.answered >= MIN_ANSWERED && p.source !== "demo");
  return Response.json({ all: agreement(pairs), strict: agreement(strict) }, { headers: UTF8 });
}
