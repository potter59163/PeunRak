"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Card, RiskBadge, Spark, zoneClass, Button } from "@/components/ui";
import { EyeOff, Logout, ChevronRight, Bell, Doc, Phone, Hospital, Check } from "@/components/icons";
import { REF_LABEL, type Snap } from "@/lib/store";
import { signOut } from "@/lib/session";

const KEY = { low: "calm", medium: "watch", high: "care" } as const;
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 6e4);
  if (m < 1) return "เมื่อครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} ชม.ที่แล้ว` : `${Math.round(h / 24)} วันที่แล้ว`;
};

export default function Counselor() {
  const router = useRouter();
  const [cases, setCases] = useState<Snap[]>([]);
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await (await fetch("/api/monitor", { cache: "no-store" })).json();
      setCases(d.cases); setLive(true);
    } catch { setLive(false); }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 3000);
    return () => clearInterval(iv);
  }, [load]);

  async function refer(id: string) {
    setBusy(id);
    await fetch("/api/referral", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, to: "sent" }),
    });
    await load();
    setBusy(null);
  }

  const high = cases.filter((c) => c.risk === "high").length;
  const crisis = cases.filter((c) => c.crisis).length;
  const referred = cases.filter((c) => c.refStatus !== "none");
  const arrived = referred.filter((c) => c.refStatus === "arrived").length;
  const counts = { high, medium: cases.filter((c) => c.risk === "medium").length, low: cases.filter((c) => c.risk === "low").length };

  return (
    <Shell wide>
      <TopBar label="ครูแนะแนว" right={
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[0.74rem] text-ink-2">
            <span className="relative flex size-1.5">
              {live ? <span className="ping absolute inline-flex size-1.5 rounded-full bg-calm" /> : null}
              <span className={`relative inline-flex size-1.5 rounded-full ${live ? "bg-calm" : "bg-ink-3"}`} />
            </span>
            realtime
          </span>
          <button onClick={() => { signOut(); router.push("/"); }}
            className="grid size-9 place-items-center rounded-full text-ink-3 transition hover:bg-surface-2 hover:text-ink" aria-label="ออกจากระบบ">
            <Logout size={17} />
          </button>
        </>
      } />

      <main className="rise space-y-4 pb-8">
        <div className="grid grid-cols-3 gap-2.5">
          {([["สูง", counts.high, "care"], ["ปานกลาง", counts.medium, "watch"], ["ต่ำ", counts.low, "calm"]] as const).map(([l, n, z]) => (
            <Card key={l} className="p-4 sm:p-5">
              <p className="text-[0.79rem] text-ink-3">{l}</p>
              <p className={`mt-1.5 text-[1.8rem] font-semibold leading-none tabular-nums ${zoneClass[z].fg}`}>{n}</p>
            </Card>
          ))}
        </div>

        {crisis > 0 ? (
          <Card className="flex items-center gap-3 border-care/40 bg-care-soft p-4">
            <Phone size={18} className="shrink-0 text-care" />
            <p className="flex-1 text-[0.89rem] text-ink">
              <span className="font-medium text-care">{crisis} เคสเข้าเกณฑ์ฉุกเฉิน (8Q)</span> — เส้นทางฉุกเฉิน ไม่ใช่การรอคิว
            </p>
          </Card>
        ) : null}
        {high > 0 ? (
          <Card className="flex items-center gap-3 p-4">
            <Bell size={18} className="shrink-0 text-watch" />
            <p className="flex-1 text-[0.89rem] text-ink">มี {high} เคสความเสี่ยงสูง ควรติดต่อวันนี้</p>
          </Card>
        ) : null}

        {referred.length > 0 ? (
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-[0.82rem] text-ink-3">ส่งต่อแล้วไปถึงผู้เชี่ยวชาญจริง</p>
                <p className="mt-1 text-[0.86rem] text-ink-2">{arrived} จาก {referred.length} เคส</p>
              </div>
              <p className="text-[1.7rem] font-semibold leading-none tabular-nums text-accent">
                {Math.round((arrived / referred.length) * 100)}%
              </p>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line-soft">
              <div className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${(arrived / referred.length) * 100}%` }} />
            </div>
            <p className="mt-2.5 text-[0.78rem] text-ink-3">ปิด referral loop — เดิมไม่มีใครรู้ตัวเลขนี้</p>
          </Card>
        ) : null}

        <Card className="flex items-start gap-3 p-4">
          <EyeOff size={17} className="mt-0.5 shrink-0 text-ink-3" />
          <p className="text-[0.83rem] leading-relaxed text-ink-2">
            คะแนนคำนวณด้วยเกณฑ์ 9Q / GAD-7 / 8Q ของกรมสุขภาพจิต — AI ทำหน้าที่สกัดหลักฐานเท่านั้น ไม่ได้ให้คะแนนเอง
            <span className="mt-1 block text-ink-3">ไม่มีข้อความหรือคำพูดของนักเรียนถูกส่งมาที่หน้านี้</span>
          </p>
        </Card>

        <ul className="space-y-2.5">
          {cases.map((c) => {
            const z = zoneClass[KEY[c.risk]];
            return (
              <Card as="li" key={c.id} className="lift overflow-hidden p-4">
                <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.93rem] text-ink">{c.shared && c.name ? `${c.name} · ${c.room}` : c.code}</span>
                      {c.provisional ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-[0.76rem] font-medium text-ink-2">
                          <span className="size-1.5 rounded-full bg-ink-3" />
                          ข้อมูลยังไม่พอ
                        </span>
                      ) : (
                        <RiskBadge risk={c.risk} />
                      )}
                      {c.crisis ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-care px-2.5 py-1 text-[0.72rem] font-medium text-white">
                          <Phone size={11} /> ฉุกเฉิน
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[0.78rem] text-ink-3">
                      คุย {c.turns} รอบ · {ago(c.updatedAt)} · เก็บหลักฐานได้ {c.covered}/{c.total} ข้อ
                    </p>
                  </div>
                  <span className={z.fg}><Spark values={c.history} w={64} h={24} /></span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
                  {c.refStatus === "none" ? (
                    <Button size="sm" variant={c.risk === "high" ? "primary" : "line"}
                      disabled={busy === c.id} onClick={() => refer(c.id)}>
                      {busy === c.id ? "กำลังส่ง" : <><Hospital size={15} /> ส่งต่อผู้เชี่ยวชาญ</>}
                    </Button>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8rem] font-medium ${
                      c.refStatus === "arrived" ? "bg-calm-soft text-calm" : "bg-accent-soft text-accent"}`}>
                      {c.refStatus === "arrived" ? <Check size={14} /> : <Hospital size={14} />}
                      {REF_LABEL[c.refStatus]}
                    </span>
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line-soft pt-3">
                  {([["9Q", c.q9, 27, c.q9Band], ["GAD-7", c.gad7, 21, c.gad7Band], ["8Q", c.q8, 20, c.q8Band]] as const).map(
                    ([label, val, max, band]) => (
                      <div key={label}>
                        <p className="text-[0.7rem] text-ink-3">{label}</p>
                        <p className="mt-0.5 text-[1.02rem] font-medium tabular-nums text-ink">
                          {val}<span className="text-[0.72rem] font-normal text-ink-3">/{max}</span>
                        </p>
                        <p className="mt-0.5 truncate text-[0.68rem] text-ink-3" title={band}>{band}</p>
                      </div>
                    )
                  )}
                </div>
              </Card>
            );
          })}
        </ul>

        <Card>
          <Link href="/referral" className="flex items-center gap-3.5 p-4 transition hover:bg-surface-2">
            <Doc size={18} className="shrink-0 text-ink-3" />
            <span className="flex-1 text-[0.92rem] text-ink">เอกสารส่งต่อ</span>
            <ChevronRight size={16} className="text-ink-3" />
          </Link>
        </Card>

        <Button href="/chat" variant="ghost" size="sm">เปิดมุมมองนักเรียนเพื่อทดสอบ realtime</Button>
      </main>
    </Shell>
  );
}
