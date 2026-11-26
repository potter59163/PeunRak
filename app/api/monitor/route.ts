import { all, forStaff, isSeed, storageMode } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ครูดึงได้เฉพาะตัวเลข สถานะ และหมวดเรื่อง (id) — ไม่มี endpoint ไหนคืนบทสนทนาเลย
 * ชื่อออกเฉพาะเคสที่นักเรียนเปิด L2 ขึ้นไป · หมวดเรื่องออกเฉพาะ L1 ขึ้นไป (forStaff)
 * การซ่อนทำที่นี่ ไม่ได้ฝากไว้ที่หน้าจอ — เปิด /api/monitor ตรง ๆ ก็ไม่เห็นเกินระดับที่เด็กเลือก
 */
export async function GET() {
  const cases = (await all()).map(forStaff);
  return Response.json(
    {
      cases,
      at: Date.now(),
      storage: storageMode(),
      /** มีเคสจำลองปนอยู่กี่เคส — แดชบอร์ดใช้ขึ้นป้ายว่าตัวเลขเป็นข้อมูลตัวอย่าง */
      seeded: cases.filter((c) => isSeed(c.id)).length,
    },
    { headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}
