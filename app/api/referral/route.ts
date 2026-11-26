import { advanceReferral, reschedule, escalate, ackHelp, setPriorKnown, getOne, forStaff, isSeed, type Snap } from "@/lib/store";
import { isTrack } from "@/lib/handoff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UTF8 = { "Content-Type": "application/json; charset=utf-8" };
const bad = (error: string, status = 400) => Response.json({ error }, { status, headers: UTF8 });

/**
 * ฝั่งครู / ผู้เชี่ยวชาญ — เลื่อนสถานะการส่งต่อ
 *
 *   to: sent       ครูส่งต่อ เลือกเส้นทางได้ (track: school | external)
 *                  ไม่ระบุ = ตามระดับความเสี่ยง: ปานกลาง → ครูแนะแนวในโรงเรียนก่อน · สูง → ผู้เชี่ยวชาญภายนอก
 *   to: scheduled  มีวันนัดแล้ว ต้องส่ง apptAt (ใช้เตือนนักเรียนก่อนนัด 1 วันและวันนัด)
 *   to: arrived    เด็กมาถึงจริง
 *
 *   action: reschedule  นัดใหม่หลังพลาดนัด (apptAt)
 *   action: escalate    ยกระดับจากในโรงเรียนไปผู้เชี่ยวชาญภายนอก
 *   action: ack         ครูรับเรื่องคำขอ "พาไปหาคน" ของนักเรียน
 *   action: known       ครูระบุว่ารู้จักเคสนี้มาก่อนหรือไม่ (known: true | false)
 *
 * GET ?id=…  ข้อมูลของเคสเดียวสำหรับเอกสารส่งต่อ — กรองตามระดับการเปิดเผยเหมือน /api/monitor
 *
 * endpoint นี้ไม่แตะข้อมูลคะแนนและไม่แตะบทสนทนา แค่เลื่อนสถานะเท่านั้น
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("invalid");
  const snap = await getOne(id);
  if (!snap) return bad("not found", 404);
  return Response.json({ case: forStaff(snap), seeded: isSeed(snap.id) }, { headers: UTF8 });
}

export async function POST(req: Request) {
  const { id, to, note, track, apptAt, action, known } = (await req.json()) as {
    id?: string;
    to?: string;
    note?: string;
    track?: string;
    apptAt?: number;
    action?: "reschedule" | "escalate" | "ack" | "known";
    known?: boolean;
  };

  if (!id || typeof id !== "string") return bad("invalid");
  const when = typeof apptAt === "number" && Number.isFinite(apptAt) && apptAt > 0 ? apptAt : null;

  let snap: Snap | null;
  if (action === "known") {
    if (typeof known !== "boolean") return bad("invalid");
    snap = await setPriorKnown(id, known);
  } else if (action === "ack") {
    snap = await ackHelp(id);
  } else if (action === "escalate") {
    snap = await escalate(id);
  } else if (action === "reschedule") {
    if (!when) return bad("invalid apptAt");
    snap = await reschedule(id, when);
  } else {
    if (to !== "sent" && to !== "scheduled" && to !== "arrived") return bad("invalid");
    if (track !== undefined && !isTrack(track)) return bad("invalid track");
    if (to === "scheduled" && !when) return bad("invalid apptAt");
    snap = await advanceReferral(id, to, {
      note: typeof note === "string" ? note.slice(0, 200) : undefined,
      track: isTrack(track) ? track : undefined,
      apptAt: when ?? undefined,
    });
  }

  if (!snap) return bad("not found", 404);

  const s = forStaff(snap);
  return Response.json(
    {
      id: s.id, refStatus: s.refStatus, refTrack: s.refTrack,
      refSentAt: s.refSentAt, refScheduledAt: s.refScheduledAt, refArrivedAt: s.refArrivedAt,
      apptAt: s.apptAt, helpAckAt: s.helpAckAt, priorKnown: s.priorKnown,
    },
    { headers: UTF8 }
  );
}
