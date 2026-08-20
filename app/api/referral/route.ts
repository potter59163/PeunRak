import { advanceReferral, type RefStatus } from "@/lib/store";

export const runtime = "nodejs";

const UTF8 = { "Content-Type": "application/json; charset=utf-8" };

/**
 * เลื่อนสถานะการส่งต่อ
 * ครูส่ง → sent · ผู้เชี่ยวชาญนัด → scheduled · เด็กมาถึงจริง → arrived
 *
 * endpoint นี้ไม่แตะข้อมูลคะแนนและไม่แตะบทสนทนา แค่เลื่อนสถานะเท่านั้น
 */
export async function POST(req: Request) {
  const { id, to, note } = (await req.json()) as {
    id: string;
    to: RefStatus;
    note?: string;
  };

  if (!id || !["sent", "scheduled", "arrived"].includes(to)) {
    return Response.json({ error: "invalid" }, { status: 400, headers: UTF8 });
  }

  const snap = await advanceReferral(id, to, note);
  if (!snap) return Response.json({ error: "not found" }, { status: 404, headers: UTF8 });

  return Response.json(
    { id: snap.id, refStatus: snap.refStatus, refSentAt: snap.refSentAt,
      refScheduledAt: snap.refScheduledAt, refArrivedAt: snap.refArrivedAt },
    { headers: UTF8 }
  );
}
