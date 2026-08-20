import { all } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ครูดึงได้เฉพาะตัวเลข — ไม่มี endpoint ไหนคืนบทสนทนาเลย */
export async function GET() {
  return Response.json({ cases: all(), at: Date.now() });
}
