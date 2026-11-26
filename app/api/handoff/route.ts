import { getOwn, setLevel, requestHelp, setCompanion, checkIn, forStudent, type Disclosure } from "@/lib/store";
import { cleanDomains } from "@/lib/domains";
import { toLevel, isCompanion, isMissReason } from "@/lib/handoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UTF8 = { "Content-Type": "application/json; charset=utf-8" };
const bad = (error: string, status = 400) => Response.json({ error }, { status, headers: UTF8 });

/**
 * ฝั่งนักเรียน — เส้นทางไปหาคนจริงของตัวเอง
 *
 * ทุกอย่างที่รับเข้ามาเป็นตัวเลือก (ระดับ 0–3 · บทบาทผู้ร่วมทาง · ไป/ไม่ได้ไป · เหตุผลแบบเลือกตอบ)
 * ค่าที่อยู่นอกรายการถูกปฏิเสธ ไม่มีช่องไหนรับข้อความอิสระ
 * ยกเว้นชื่อกับห้อง ซึ่งรับเฉพาะเมื่อนักเรียนเลือกเปิดชื่อเอง (L2 ขึ้นไป)
 */

/** นักเรียนดูสถานะของตัวเอง: คำขอถึงครู · การส่งต่อ · วันนัด · เช็กอิน */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("invalid");
  return Response.json(forStudent(await getOwn(id)), { headers: UTF8 });
}

export async function POST(req: Request) {
  const b = (await req.json()) as {
    id?: string;
    action?: "level" | "request" | "companion" | "checkin";
    level?: number;
    name?: string;
    room?: string;
    domains?: unknown;
    companion?: string;
    went?: boolean;
    reason?: string;
  };
  if (!b.id || typeof b.id !== "string") return bad("invalid");

  // หมวดเรื่องที่ client ส่งมาตอนเลื่อนระดับ = id + ความมั่นใจที่ได้จาก /api/risk รอบล่าสุด
  // (L0 ไม่เก็บหมวดไว้ที่ server เลย จึงต้องส่งมาเองเมื่อเลือกเปิด) กรองซ้ำเหมือนข้อมูลจากโมเดล
  const d: Disclosure = {
    name: b.name,
    room: b.room,
    domains: b.domains === undefined ? undefined : cleanDomains(b.domains),
  };

  if (b.action === "level" || b.action === "request") {
    const level = toLevel(b.level);
    if (level === null) return bad("invalid level");
    const snap = b.action === "level" ? await setLevel(b.id, level, d) : await requestHelp(b.id, level, d);
    return Response.json(forStudent(snap), { headers: UTF8 });
  }

  if (b.action === "companion") {
    if (!isCompanion(b.companion)) return bad("invalid companion");
    const snap = await setCompanion(b.id, b.companion);
    return snap ? Response.json(forStudent(snap), { headers: UTF8 }) : bad("no referral", 409);
  }

  if (b.action === "checkin") {
    if (typeof b.went !== "boolean") return bad("invalid");
    const reason = isMissReason(b.reason) ? b.reason : undefined;
    if (!b.went && !reason) return bad("invalid reason");
    const snap = await checkIn(b.id, b.went, b.went ? undefined : reason);
    return snap ? Response.json(forStudent(snap), { headers: UTF8 }) : bad("no appointment", 409);
  }

  return bad("invalid action");
}
