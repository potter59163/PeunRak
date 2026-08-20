import type { Zone } from "./instruments";

/** แยกออกจาก components/ui.tsx เพราะไฟล์นั้นเป็น "use client"
 *  ค่าคงที่ที่ server component ต้องอ่านได้ ต้องอยู่นอก client module */
export const zoneClass: Record<Zone, { fg: string; bg: string; ring: string }> = {
  calm: { fg: "text-calm", bg: "bg-calm-soft", ring: "ring-calm/25" },
  watch: { fg: "text-watch", bg: "bg-watch-soft", ring: "ring-watch/25" },
  care: { fg: "text-care", bg: "bg-care-soft", ring: "ring-care/25" },
};
