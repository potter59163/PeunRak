import { bump } from "@/lib/store";
import { isEventKind, isEventDomain } from "@/lib/events";

export const runtime = "nodejs";

/**
 * นับเหตุการณ์แบบไม่ระบุตัวตน (การ์ดช่วยเหลือถูกแสดง/ถูกกด · ปุ่มพาไปหาคนถูกใช้)
 * รับแค่ชนิดกับหมวดจากรายการที่กำหนด ไม่รับรหัสนักเรียน — ค่าอื่นถูกปฏิเสธ
 */
export async function POST(req: Request) {
  const { kind, domain = "none" } = (await req.json()) as { kind?: unknown; domain?: unknown };
  if (!isEventKind(kind) || !isEventDomain(domain)) {
    return Response.json({ error: "invalid" }, { status: 400 });
  }
  await bump(kind, domain);
  return new Response(null, { status: 204 });
}
