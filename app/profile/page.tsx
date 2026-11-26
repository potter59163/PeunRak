"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Button, Card, Input, BottomNav, Hotline } from "@/components/ui";
import { Person, Logout, Check, Lock } from "@/components/icons";
import { me, patch, signOut, type Me } from "@/lib/session";
import { chooseLevel, getHandoff } from "@/lib/client";
import { LEVELS, type Level } from "@/lib/handoff";

const FIELDS = [
  { k: "name", label: "ชื่อ–สกุล", ph: "ปัณณ์ วรกุล" },
  { k: "room", label: "ห้อง", ph: "ม.5/2" },
  { k: "nick", label: "อยากให้เรียกว่า", ph: "ปัณณ์" },
  { k: "birth", label: "วันเกิด", ph: "2010-04-12", type: "date" },
  { k: "guardian", label: "ผู้ปกครอง (ชื่อ)", ph: "สมพร วรกุล" },
  { k: "phone", label: "เบอร์ติดต่อฉุกเฉิน", ph: "08x-xxx-xxxx", type: "tel" },
  { k: "condition", label: "โรคประจำตัว / ยาที่ใช้", ph: "ไม่มี" },
  { k: "history", label: "เคยพบจิตแพทย์หรือนักจิตวิทยา", ph: "ไม่เคย" },
] as const;

export default function Profile() {
  const router = useRouter();
  const [u, setU] = useState<Me | null>(null);
  const [v, setV] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    // อ่านจากที่เก็บของเบราว์เซอร์หลัง hydrate แล้วค่อยตั้งค่า (ทำใน microtask ไม่ตั้ง state ตรง ๆ ใน effect)
    queueMicrotask(async () => {
      const cur = me();
      if (!cur) { router.replace("/"); return; }
      if (!alive) return;
      setU(cur);
      setV(JSON.parse(localStorage.getItem("kw.profile") ?? "{}"));
      // ระดับการเปิดเผยจริงอยู่ที่ server — ดึงมาให้สวิตช์ตรงกับสิ่งที่ครูเห็นอยู่ตอนนี้
      if (cur.role === "student" && (await getHandoff()) && alive) setU(me());
    });
    return () => { alive = false; };
  }, [router]);

  const level: Level = u?.level ?? 0;
  const open = level >= 2;

  async function save() {
    localStorage.setItem("kw.profile", JSON.stringify(v));
    patch({ name: v.name, room: v.room });
    // ถ้าเปิดชื่อไว้อยู่แล้ว ชื่อใหม่ต้องไปถึงครูด้วย ถ้ายังไม่เปิด ชื่ออยู่ในเครื่องนี้เท่านั้น
    if (open) await chooseLevel(level);
    setU(me());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  /**
   * เปิด = L2 · ปิด = กลับไประดับที่เคยเลือกไว้ก่อนเปิด (ไม่เกิน L1)
   * ชื่อถูกลบออกจากที่เก็บฝั่ง server ทันที ไม่ใช่แค่ซ่อน
   */
  async function toggleShare() {
    if (open) {
      await chooseLevel(Math.min(u?.levelBefore ?? 0, 1) as Level);
    } else {
      patch({ levelBefore: level });
      await chooseLevel(2);
    }
    setU(me());
  }

  return (
    <Shell pad>
      <TopBar label="โปรไฟล์" right={
        <button onClick={() => { signOut(); router.push("/"); }}
          className="grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink" aria-label="ออกจากระบบ">
          <Logout size={17} />
        </button>
      } />

      <main className="rise space-y-4 pb-6">
        <Card className="flex items-center gap-4 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
            <Person size={21} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.96rem] text-ink">{v.name || "ยังไม่ได้กรอกชื่อ"}</p>
            <p className="truncate text-[0.8rem] text-ink-3">{u?.email}</p>
          </div>
        </Card>

        <Card className="divide-y divide-line-soft">
          <button onClick={toggleShare} className="flex w-full items-center gap-3.5 p-4 text-left transition hover:bg-surface-2">
            <Lock size={18} className="shrink-0 text-ink-3" />
            <div className="min-w-0 flex-1">
              <p className="text-[0.92rem] text-ink">เปิดชื่อให้ครูแนะแนว</p>
              <p className="mt-0.5 text-[0.79rem] text-ink-3">
                {LEVELS[level].short} · {open ? "ครูเห็นชื่อและห้อง" : "ครูเห็นเฉพาะรหัสนิรนาม ชื่ออยู่ในเครื่องนี้เท่านั้น"}
              </p>
            </div>
            <span role="switch" aria-checked={open} className={`relative h-6 w-11 shrink-0 rounded-full transition ${open ? "bg-accent" : "bg-line"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${open ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </button>
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          {FIELDS.map((f) => (
            <Input key={f.k} label={f.label} placeholder={f.ph} type={"type" in f ? f.type : "text"}
              value={v[f.k] ?? ""} onChange={(e) => setV((s) => ({ ...s, [f.k]: e.target.value }))} />
          ))}
        </Card>

        <Button size="lg" full onClick={save}>
          {saved ? <><Check size={17} /> บันทึกแล้ว</> : "บันทึก"}
        </Button>
      </main>

      <Hotline />
      <BottomNav />
    </Shell>
  );
}
