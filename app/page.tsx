"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, Button, Card, Input, Hotline } from "@/components/ui";
import { Mark, Mail, Lock, Person, Users, ArrowRight } from "@/components/icons";
import { signIn, type Role } from "@/lib/session";

const ROLES: { id: Role; label: string; Icon: typeof Person; hint: string }[] = [
  { id: "student", label: "นักเรียน", Icon: Person, hint: "s6512@school.ac.th" },
  { id: "counselor", label: "ครูแนะแนว", Icon: Users, hint: "guidance@school.ac.th" },
];

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const cfg = ROLES.find((r) => r.id === role)!;

  function go() {
    signIn({ role, email: email || cfg.hint, id: "a73" });
    router.push(role === "student" ? "/chat" : "/counselor");
  }

  return (
    <Shell>
      <main className="rise flex flex-1 flex-col justify-center py-10">
        <div className="mb-8 flex items-center gap-2.5">
          <Mark className="text-accent" size={32} />
          <span className="text-[1.3rem] font-semibold tracking-tight">เพื่อนรัก</span>
        </div>

        <Card className="p-6 shadow-[var(--sh-2)] sm:p-7">
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1.5">
            {ROLES.map((r) => (
              <button key={r.id} onClick={() => setRole(r.id)}
                className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full text-[0.9rem] font-medium transition ${
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
            <Button type="submit" size="lg" full>
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
          ครูเห็นเฉพาะระดับความเสี่ยง ไม่เห็นบทสนทนา
        </div>
      </main>
      <Hotline />
    </Shell>
  );
}
