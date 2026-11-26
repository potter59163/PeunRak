"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Shell, TopBar, Card, Hotline, RiskBadge } from "@/components/ui";
import { Doc, ChevronRight, Hospital, Users } from "@/components/icons";
import { REF_LABEL, TRACK_LABEL, thaiDate } from "@/lib/handoff";
import type { Snap } from "@/lib/store";
import { useMe, usePoll } from "@/lib/client";

/** รายการเอกสารส่งต่อ — หนึ่งฉบับต่อหนึ่งเคสที่ถูกส่งต่อ เปิดดูรายเคสได้ที่ /referral/[id] */
export default function ReferralIndex() {
  const me = useMe();
  const [cases, setCases] = useState<Snap[] | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await (await fetch("/api/monitor", { cache: "no-store" })).json();
      setCases((d.cases as Snap[]).filter((c) => c.refStatus !== "none"));
    } catch { /* รอบถัดไปลองใหม่ */ }
  }, []);
  usePoll(load, 8000);

  const specialist = me?.role === "specialist";
  const shown = (cases ?? []).filter((c) => !specialist || (c.refTrack ?? "external") === "external");

  return (
    <Shell>
      <TopBar back={specialist ? "/specialist" : "/counselor"} label="เอกสารส่งต่อ" />
      <main className="rise flex-1 space-y-2.5 pb-6">
        <p className="pb-2 text-[0.86rem] leading-relaxed text-ink-3">
          เอกสารสร้างจากข้อมูลที่ระบบเก็บจริงของแต่ละเคส ไม่มีข้อความจากการสนทนา
        </p>
        {cases && shown.length === 0 ? (
          <Card className="p-8 text-center">
            <Doc size={26} className="mx-auto text-ink-3" />
            <p className="mt-3 text-[0.93rem] text-ink">ยังไม่มีเคสที่ถูกส่งต่อ</p>
          </Card>
        ) : null}
        <ul className="space-y-2.5">
          {shown.map((c) => (
            <Card as="li" key={c.id} className="lift overflow-hidden">
              <Link href={`/referral/${c.id}`} className="flex items-center gap-3.5 p-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  {c.refTrack === "school" ? <Users size={17} /> : <Hospital size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[0.94rem] text-ink">
                    {c.name ? `${c.name} · ${c.room ?? "—"}` : c.code}
                    <RiskBadge risk={c.risk} />
                  </p>
                  <p className="mt-0.5 text-[0.78rem] text-ink-3">
                    {TRACK_LABEL[c.refTrack ?? "external"]} · {REF_LABEL[c.refStatus]} · ส่งต่อ {thaiDate(c.refSentAt)}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-3" />
              </Link>
            </Card>
          ))}
        </ul>
      </main>
      <Hotline />
    </Shell>
  );
}
