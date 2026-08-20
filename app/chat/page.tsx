"use client";

import { useEffect, useRef, useState } from "react";
import { Shell, TopBar, Button, BottomNav, Hotline } from "@/components/ui";
import { Mark, Send, Lock, ChevronRight } from "@/components/icons";
import { me } from "@/lib/session";
import Link from "next/link";

type Msg = { role: "user" | "assistant"; content: string };
const OPENING = "สวัสดี ช่วงนี้เป็นยังไงบ้าง เล่าเท่าที่อยากเล่าก็ได้";

export default function Chat() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: OPENING }]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [demo, setDemo] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);

  /** AI ตัวที่สอง — ยิงเบื้องหลัง ไม่บล็อกการคุย และไม่แสดงผลให้นักเรียนเห็น */
  function scoreInBackground(history: Msg[]) {
    const u = me();
    fetch("/api/risk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: u?.id ?? "a73",
        messages: history,
        profile: { name: u?.name, room: u?.room, shared: u?.shared },
      }),
    }).catch(() => {});
  }

  async function send() {
    const text = draft.trim();
    if (!text || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(next);
    setDraft("");
    setBusy(true);
    if (taRef.current) taRef.current.style.height = "auto";
    scoreInBackground(next);

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
      setMsgs([...next, { role: "assistant", content: "ระบบขัดข้องชั่วคราว ลองอีกครั้งนะ" }]);
    } finally { setBusy(false); }
  }

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
          <button onClick={() => setShowPrivacy((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1.5 text-[0.75rem] text-ink-2 transition hover:text-ink">
            <span className="relative flex size-1.5">
              <span className="ping absolute inline-flex size-1.5 rounded-full bg-calm" />
              <span className="relative inline-flex size-1.5 rounded-full bg-calm" />
            </span>
            ปลอดภัย
          </button>
          </>
        }
      />

      {showPrivacy ? (
        <div className="rise mb-4 rounded-[20px] border border-line bg-surface p-4 shadow-[var(--sh-1)]">
          <div className="flex gap-3">
            <Lock size={16} className="mt-0.5 shrink-0 text-accent" />
            <div className="space-y-1.5 text-[0.84rem] leading-relaxed">
              <p className="text-ink">ระบบประเมินความเสี่ยงจากบทสนทนาโดยอัตโนมัติ</p>
              <p className="text-ink-3">ครูแนะแนวเห็นเฉพาะระดับความเสี่ยง ไม่เห็นข้อความที่เธอพิมพ์</p>
            </div>
          </div>
        </div>
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
          <div ref={endRef} />
        </div>

        {msgs.filter((m) => m.role === "user").length >= 4 ? (
          <Link href="/result" className="rise lift mb-3 flex items-center gap-3 rounded-full border border-accent/20 bg-accent-soft px-5 py-3.5">
            <span className="flex-1 text-[0.9rem] font-medium text-accent">ดูสรุป</span>
            <ChevronRight size={16} className="text-accent" />
          </Link>
        ) : null}

        <div className="sticky bottom-[92px] -mx-1 rounded-t-[28px] bg-paper/75 px-1 pb-3 pt-2 backdrop-blur-md">
          <div className="flex items-end gap-2 rounded-[26px] border border-line bg-surface p-2 pl-5 shadow-[var(--sh-2)] transition focus-within:border-accent">
            <textarea ref={taRef} rows={1} value={draft}
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
    </Shell>
  );
}
