"use client";

import Link from "next/link";
import { Shell, TopBar, Card, BottomNav, Hotline } from "@/components/ui";
import { Clipboard, ChevronRight, Clock } from "@/components/icons";
import { TESTS } from "@/lib/tests";

export default function Tests() {
  return (
    <Shell pad>
      <TopBar label="แบบทดสอบ" />
      <main className="rise">
        <p className="pb-4 text-[0.86rem] text-ink-3">ทำเองได้ ไม่มีใครเห็นผลถ้าเธอไม่ส่ง</p>
        <ul className="space-y-2.5">
          {TESTS.map((t) => (
            <Card as="li" key={t.id} className="lift overflow-hidden">
              <Link href={`/tests/${t.id}`} className="flex items-center gap-3.5 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent">
                  <Clipboard size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.95rem] text-ink">{t.name}</p>
                  <p className="mt-0.5 flex items-center gap-3 text-[0.79rem] text-ink-3">
                    <span>{t.short}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={12} />{t.minutes} นาที</span>
                    <span>{t.instrument.items.length} ข้อ</span>
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-ink-3" />
              </Link>
            </Card>
          ))}
        </ul>
      </main>
      <Hotline />
      <BottomNav />
    </Shell>
  );
}
