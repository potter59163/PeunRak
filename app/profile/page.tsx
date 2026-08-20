"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Button, Card, Input, BottomNav } from "@/components/ui";
import { Person, Logout, Check, Lock } from "@/components/icons";
import { me, patch, signOut, type Me } from "@/lib/session";

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
    const cur = me();
    if (!cur) { router.replace("/"); return; }
    setU(cur);
    setV(JSON.parse(localStorage.getItem("kw.profile") ?? "{}"));
  }, [router]);

  function save() {
    localStorage.setItem("kw.profile", JSON.stringify(v));
    patch({ name: v.name, room: v.room });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function toggleShare() {
    const next = !u?.shared;
    patch({ shared: next });
    setU((s) => (s ? { ...s, shared: next } : s));
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
              <p className="mt-0.5 text-[0.79rem] text-ink-3">{u?.shared ? "ครูเห็นชื่อและห้อง" : "ครูเห็นเฉพาะรหัสนิรนาม"}</p>
            </div>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${u?.shared ? "bg-accent" : "bg-line"}`}>
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${u?.shared ? "left-[22px]" : "left-0.5"}`} />
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

      <BottomNav />
    </Shell>
  );
}
