"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shell, TopBar, Button, BottomNav, Hotline } from "@/components/ui";
import { Mark, Send, Lock, ChevronRight, Bridge, Bell } from "@/components/icons";
import { BridgeSheet, HelpCards, SafetyCard, Nudge, type BridgeStep, type NudgeKind } from "@/components/bridge";
import { me, myId, identity, saveLast, chatStart, type Last } from "@/lib/session";
import { getHandoff, usePoll } from "@/lib/client";
import { reminderOf, thaiDate, TRACK_LABEL, type HandoffState } from "@/lib/handoff";
import type { DomainId } from "@/lib/domains";

type Msg = { role: "user" | "assistant"; content: string };

/** ข้อความแรกต้องบอกว่าเป็น AI และไม่ได้มาแทนคน (APA Health Advisory, 2025) */
const OPENING =
  "สวัสดี เราเป็น AI ผู้ช่วยรับฟัง ไม่ใช่คนจริง และไม่ได้มาแทนเพื่อน ครู หรือผู้เชี่ยวชาญ\n\nช่วงนี้เป็นยังไงบ้าง เล่าเท่าที่อยากเล่าก็ได้ ถ้าอยากคุยกับคนจริงเมื่อไหร่ กดปุ่ม พาไปหาคน ได้เลย";

/** ชวนไปหาคนจริงทุกกี่รอบ */
const NUDGE_EVERY = 8;
/** คุยต่อเนื่องเกินกี่นาทีจึงเตือนพัก — ตั้ง NEXT_PUBLIC_BREAK_MINUTES ให้สั้นลงได้ตอนสาธิต */
const BREAK_MS = (Number(process.env.NEXT_PUBLIC_BREAK_MINUTES) || 30) * 6e4;

const RANK = { low: 0, medium: 1, high: 2 } as const;

/** แถบเตือนจากเส้นทางของตัวเอง: นัดหมาย · เช็กอินหลังนัด · ครูรับเรื่องแล้ว */
function noticeOf(h: HandoffState | null): string | null {
  if (!h) return null;
  const who = h.refTrack ? TRACK_LABEL[h.refTrack] : "ครูแนะแนว";
  const r = reminderOf(h);
  if (r === "today") return `วันนี้มีนัดกับ${who}`;
  if (r === "tomorrow") return `พรุ่งนี้มีนัดกับ${who} (${thaiDate(h.apptAt)})`;
  if (r === "checkin") return "นัดผ่านมาแล้ว ได้ไปไหม บอกเราหน่อยได้นะ";
  if (h.refStatus === "sent") return h.refTrack === "school" ? "ครูแนะแนวชวนเธอมาคุย" : "ครูแนะแนวกำลังประสานผู้เชี่ยวชาญให้";
  if (h.helpAckAt) return "ครูแนะแนวรับเรื่องที่เธอขอไว้แล้ว";
  return null;
}

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: OPENING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [demo, setDemo] = useState(false);
  const [risk, setRisk] = useState<Last | null>(null);
  const [sheet, setSheet] = useState<BridgeStep | null>(null);
  const [nudge, setNudge] = useState<NudgeKind | null>(null);
  const [hidden, setHidden] = useState<DomainId[]>([]);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  /** ระดับความเสี่ยงสูงสุดที่เคยชวนไปแล้ว — ขยับขึ้นเมื่อไหร่ถึงชวนใหม่ */
  const nudgedRank = useRef(0);
  const breaks = useRef(0);
  const started = useRef(0);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy, nudge, risk]);

  const turns = msgs.filter((m) => m.role === "user").length;

  // เส้นทางของตัวเอง (นัดหมาย / ครูรับเรื่อง) — ดึงเป็นระยะ ไม่เกี่ยวกับเนื้อหาแชท
  const loadHandoff = useCallback(async () => {
    const h = await getHandoff();
    if (h) setHandoff(h);
  }, []);
  usePoll(loadHandoff, 15000);

  // เตือนพักเมื่อคุยต่อเนื่องนาน
  useEffect(() => {
    const iv = setInterval(() => {
      if (!started.current) return;
      const due = Math.floor((Date.now() - started.current) / BREAK_MS);
      if (due > breaks.current) { breaks.current = due; setNudge("break"); }
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  /** AI ตัวที่สอง — ยิงเบื้องหลัง ไม่บล็อกการคุย นักเรียนเห็นแค่การ์ดช่องทางช่วยเหลือ ไม่เห็นคะแนน */
  async function scoreInBackground(history: Msg[], n: number) {
    const level = me()?.level;
    // ชื่อกับห้องออกจากเครื่องนี้เฉพาะเมื่อเลือกเปิดชื่อเอง (L2 ขึ้นไป)
    const who = (level ?? 0) >= 2 ? identity() : {};
    try {
      const res = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: myId(),
          messages: history,
          profile: { level, name: who.name, room: who.room },
        }),
      });
      if (!res.ok) return;
      const r = (await res.json()) as Last;
      saveLast(r);
      setRisk(r);

      // สะพานไปหาคนจริง: เมื่อระดับขยับขึ้น หรือคุยมาครบทุก ๆ NUDGE_EVERY รอบ
      if (RANK[r.risk] > nudgedRank.current) {
        nudgedRank.current = RANK[r.risk];
        setNudge("zone");
      } else if (n % NUDGE_EVERY === 0) {
        setNudge((cur) => cur ?? "turns");
      }
    } catch { /* เงียบไว้ การคุยต้องไม่สะดุดเพราะการประเมิน */ }
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    if (taRef.current) taRef.current.style.height = "auto";
    if (!started.current) started.current = chatStart();
    scoreInBackground(next, next.filter((m) => m.role === "user").length);

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      setDemo(res.headers.get("X-Source") === "demo");
      const reader = res.body?.getReader();
      const dec = new TextDecoder();
      let acc = "";
      setMsgs([...next, { role: "assistant", content: "" }]);
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: "ระบบขัดข้องชั่วคราว ลองอีกครั้งนะ ถ้าเร่งด่วนโทร 1323 ได้เลย" }]);
    } finally { setBusy(false); }
  }

  const domains = (risk?.domains ?? []).filter((d) => !hidden.includes(d.id));
  const notice = noticeOf(handoff);

  return (
    <Shell pad>
      <TopBar
        right={
          <>
          {demo ? (
            <span className="rounded-full bg-watch-soft px-2.5 py-1.5 text-[0.72rem] font-medium text-watch">
              โหมดสาธิต
            </span>
          ) : null}
          <button onClick={() => setShowPrivacy((v) => !v)} aria-expanded={showPrivacy}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[0.75rem] text-ink-2 transition hover:text-ink">
            <span className="relative flex size-1.5">
              <span className="ping absolute inline-flex size-1.5 rounded-full bg-calm" />
              <span className="relative inline-flex size-1.5 rounded-full bg-calm" />
            </span>
            คุยกับ AI
          </button>
          </>
        }
      />

      {showPrivacy ? (
        <div className="rise mb-4 rounded-[20px] border border-line bg-surface p-4 shadow-[var(--sh-1)]">
          <div className="flex gap-3">
            <Lock size={16} className="mt-0.5 shrink-0 text-accent" />
            <div className="space-y-1.5 text-[0.84rem] leading-relaxed">
              <p className="text-ink">เธอกำลังคุยกับ AI ไม่ใช่คนจริง และระบบประเมินความเสี่ยงจากบทสนทนาโดยอัตโนมัติ</p>
              <p className="text-ink-3">ข้อความไม่ถูกบันทึก ครูแนะแนวเห็นเฉพาะระดับความเสี่ยงแบบไม่ระบุชื่อ จนกว่าเธอจะเลือกเปิดเผยเพิ่มเอง</p>
              <p className="text-ink-3">ข้อความถูกส่งไปให้ผู้ให้บริการ AI ประมวลผลเพื่อสร้างคำตอบ จึงไม่ควรพิมพ์ชื่อจริง เบอร์โทร หรือที่อยู่</p>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? (
        <Link href="/journey" className="rise lift mb-4 flex items-center gap-3 rounded-[20px] border border-accent/25 bg-accent-soft px-4 py-3">
          <Bell size={17} className="shrink-0 text-accent" />
          <span className="flex-1 text-[0.88rem] text-ink">{notice}</span>
          <ChevronRight size={16} className="shrink-0 text-accent" />
        </Link>
      ) : null}

      <main className="flex flex-1 flex-col">
        <div className="flex-1 space-y-6 pb-4">
          {msgs.map((m, i) =>
            m.role === "assistant" ? (
              <div key={i} className="rise flex gap-3">
                <Mark size={21} className="mt-0.5 shrink-0 text-accent" />
                <p className="whitespace-pre-wrap pt-0.5 text-[0.98rem] leading-[1.85] text-ink">
                  {m.content}
                  {busy && i === msgs.length - 1 && !m.content ? (
                    <span className="inline-flex gap-1 align-middle">
                      <span className="dot size-1.5 rounded-full bg-ink-3" />
                      <span className="dot size-1.5 rounded-full bg-ink-3 [animation-delay:.16s]" />
                      <span className="dot size-1.5 rounded-full bg-ink-3 [animation-delay:.32s]" />
                    </span>
                  ) : null}
                </p>
              </div>
            ) : (
              <div key={i} className="rise flex justify-end">
                <p className="max-w-[84%] whitespace-pre-wrap rounded-[20px] rounded-br-[7px] bg-accent px-4 py-2.5 text-[0.95rem] leading-[1.75] text-accent-ink">
                  {m.content}
                </p>
              </div>
            )
          )}

          {/* ชั้นความปลอดภัยที่ไม่พึ่งคำตอบของแชทบอท — มาจากผลของ AI ตัวที่สอง */}
          {risk && risk.safety !== "none" ? <SafetyCard crisis={risk.safety === "crisis"} onBridge={() => setSheet("who")} /> : null}
          {nudge ? <Nudge kind={nudge} onPick={(s) => { setNudge(null); setSheet(s); }} onDismiss={() => setNudge(null)} /> : null}
          <HelpCards domains={domains} onBridge={() => setSheet("counselor")}
            onHide={(id) => setHidden((h) => [...h, id])} />
          <div ref={endRef} />
        </div>

        <div className="sticky bottom-[92px] -mx-1 rounded-t-[28px] bg-paper/75 px-1 pb-3 pt-2 backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2">
            <button type="button" onClick={() => setSheet("who")}
              className="lift inline-flex min-h-[42px] items-center gap-2 rounded-full border border-accent/25 bg-surface px-4 text-[0.88rem] font-medium text-accent shadow-[var(--sh-1)]">
              <Bridge size={16} /> พาไปหาคน
            </button>
            {turns >= 4 ? (
              <Link href="/result" className="rise lift ml-auto inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-4 text-[0.88rem] font-medium text-accent">
                ดูสรุป <ChevronRight size={15} />
              </Link>
            ) : null}
          </div>
          <div className="flex items-end gap-2 rounded-[26px] border border-line bg-surface p-2 pl-5 shadow-[var(--sh-2)] transition focus-within:border-accent">
            <textarea ref={taRef} rows={1} value={draft} aria-label="ข้อความ"
              onChange={(e) => { setDraft(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 130)}px`; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="พิมพ์ข้อความ"
              className="max-h-[130px] flex-1 resize-none bg-transparent py-2.5 text-[0.96rem] leading-[1.65] text-ink outline-none placeholder:text-ink-3" />
            <Button onClick={send} disabled={!draft.trim() || busy} className="!min-h-[42px] !w-[42px] !px-0">
              <Send size={16} /><span className="sr-only">ส่ง</span>
            </Button>
          </div>
        </div>
      </main>

      <Hotline />
      <BottomNav />

      {sheet ? (
        <BridgeSheet step={sheet} onStep={setSheet} domains={risk?.domains ?? []} onSent={setHandoff} />
      ) : null}
    </Shell>
  );
}
