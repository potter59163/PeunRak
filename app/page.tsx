"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, Button, Card, Input, Hotline } from "@/components/ui";
import { Mark, Mail, Lock, Person, Users, Hospital, ArrowRight, Check } from "@/components/icons";
import { signIn, type Role } from "@/lib/session";

const ROLES: { id: Role; label: string; Icon: typeof Person; hint: string; to: string }[] = [
  { id: "student", label: "นักเรียน", Icon: Person, hint: "s6512@school.ac.th", to: "/chat" },
  { id: "counselor", label: "ครูแนะแนว", Icon: Users, hint: "guidance@school.ac.th", to: "/counselor" },
  { id: "specialist", label: "ผู้เชี่ยวชาญ", Icon: Hospital, hint: "psych@hospital.go.th", to: "/specialist" },
];

/** สิ่งที่นักเรียนต้องรู้ก่อนพิมพ์คำแรก — สั้น ตรง และเป็นความจริงทุกข้อ */
const CONSENT = [
  "ที่นี่เธอคุยกับ AI ไม่ใช่คนจริง และ AI ไม่ได้มาแทนเพื่อน ครู หรือผู้เชี่ยวชาญ",
  "ระบบไม่เก็บข้อความที่เธอพิมพ์ เก็บเฉพาะคะแนนประเมิน ครูเห็นแค่ระดับความเสี่ยงแบบไม่ระบุชื่อ จนกว่าเธอจะเลือกเปิดเผยเพิ่มเอง",
  "ข้อความถูกส่งไปให้ผู้ให้บริการ AI ภายนอกประมวลผลเพื่อสร้างคำตอบ ระบบตัดชื่อและเบอร์โทรออกก่อนเท่าที่ตรวจเจอ แต่ไม่ครบทุกกรณี จึงไม่ควรพิมพ์ชื่อจริง เบอร์โทร หรือที่อยู่",
];

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [agreed, setAgreed] = useState(false);
  const cfg = ROLES.find((r) => r.id === role)!;
  const needConsent = role === "student";

  function go() {
    if (needConsent && !agreed) return;
    signIn({ role, email: email || cfg.hint, id: "a73", consentAt: needConsent ? Date.now() : undefined });
    router.push(cfg.to);
  }

  return (
    <Shell>
      <main className="rise flex flex-1 flex-col justify-center py-10">
        <div className="mb-8">
          <div className="flex items-center gap-2.5">
            <Mark className="text-accent" size={32} />
            <span className="text-[1.3rem] font-semibold tracking-tight">เพื่อนรัก</span>
          </div>
          <p className="mt-2.5 text-[0.9rem] leading-relaxed text-ink-2">
            คุยได้ก่อนจะบอกใคร แล้วเราพาไปหาคนที่ช่วยได้จริง
            <span className="block text-ink-3">สะพาน ไม่ใช่ปลายทาง</span>
          </p>
        </div>

        <Card className="p-6 shadow-[var(--sh-2)] sm:p-7">
          <div className="mb-6 grid grid-cols-3 gap-1 rounded-full bg-surface-2 p-1.5">
            {ROLES.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-1 text-[0.82rem] font-medium transition ${
                  role === r.id ? "bg-surface text-accent shadow-[var(--sh-1)]" : "text-ink-3 hover:text-ink-2"}`}>
                <r.Icon size={17} />
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); go(); }} className="space-y-4">
            <Input label="อีเมลโรงเรียน" type="email" inputMode="email" placeholder={cfg.hint}
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="รหัสผ่าน" type="password" placeholder="••••••••"
              value={pw} onChange={(e) => setPw(e.target.value)} />
            {needConsent ? (
              <div className="rounded-[var(--r-md)] border border-line bg-surface-2 p-4">
                <p className="text-[0.84rem] font-medium text-ink">ก่อนเริ่ม ขอบอกตรง ๆ 3 ข้อ</p>
                <ol className="mt-2.5 space-y-2">
                  {CONSENT.map((t, i) => (
                    <li key={i} className="flex gap-2.5 text-[0.8rem] leading-relaxed text-ink-2">
                      <span className="mt-px shrink-0 tabular-nums text-ink-3">{i + 1}.</span>
                      {t}
                    </li>
                  ))}
                </ol>
                <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 border-t border-line pt-3.5">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="peer sr-only" />
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${agreed ? "border-accent bg-accent text-accent-ink" : "border-ink-3 bg-surface"}`}>
                    {agreed ? <Check size={13} /> : null}
                  </span>
                  <span className="text-[0.84rem] leading-relaxed text-ink">อ่านแล้ว เข้าใจ และยินดีใช้งานต่อ</span>
                </label>
              </div>
            ) : null}
            <Button type="submit" size="lg" full disabled={needConsent && !agreed}>
              เข้าสู่ระบบ <ArrowRight size={17} />
            </Button>
          </form>

          <div className="mt-5 flex items-center gap-2 border-t border-line-soft pt-4 text-[0.78rem] text-ink-3">
            <Mail size={13} />
            ใช้บัญชีอีเมลของโรงเรียนเท่านั้น
          </div>
        </Card>

        <div className="mt-4 flex items-start gap-2.5 px-1 text-[0.79rem] leading-relaxed text-ink-3">
          <Lock size={14} className="mt-0.5 shrink-0" />
          ครูเห็นเฉพาะระดับความเสี่ยง ไม่เห็นบทสนทนา และไม่มีบทสนทนาถูกบันทึก
        </div>
      </main>
      <Hotline />
    </Shell>
  );
}
