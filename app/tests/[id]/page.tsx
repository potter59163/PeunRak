"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Button, Card, Choice, zoneClass, Hotline } from "@/components/ui";
import { Check, ChevronRight } from "@/components/icons";
import { byId } from "@/lib/tests";

export default function TakeTest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const test = byId(id);
  const [ans, setAns] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  if (!test) { router.replace("/tests"); return null; }

  const items = test.instrument.items;
  const filled = Object.keys(ans).length;
  const raw = items.reduce((s, i) => s + (test.weighted ? (ans[i.id] ? i.max : 0) : (ans[i.id] ?? 0)), 0);
  const band = test.instrument.bands.find((b) => raw >= b.min && raw <= b.max) ?? test.instrument.bands[0];
  const c = zoneClass[band.zone];

  if (done)
    return (
      <Shell>
        <TopBar back="/tests" label={test.short} />
        <main className="rise flex flex-1 flex-col justify-center py-10">
          <Card className="p-6 text-center">
            <p className="text-[0.84rem] text-ink-3">{test.name}</p>
            <p className={`mt-3 text-[3rem] font-semibold leading-none tabular-nums ${c.fg}`}>{raw}</p>
            <p className="mt-3 text-[1rem] text-ink">{band.label}</p>
            <p className="mt-4 border-t border-line-soft pt-4 text-[0.8rem] leading-relaxed text-ink-3">
              เป็นการคัดกรองเบื้องต้น ไม่ใช่การวินิจฉัย
            </p>
          </Card>
          <div className="mt-4 space-y-2.5">
            <Button href="/chat" size="lg" full>คุยกับ AI ต่อ <ChevronRight size={16} /></Button>
            <Button href="/tests" variant="line" size="lg" full>กลับ</Button>
          </div>
        </main>
        <Hotline />
      </Shell>
    );

  return (
    <Shell>
      <TopBar back="/tests" label={test.short} />
      <div className="flex items-center gap-3 pb-5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${(filled / items.length) * 100}%` }} />
        </div>
        <span className="text-[0.78rem] tabular-nums text-ink-3">{filled}/{items.length}</span>
      </div>

      <main className="rise flex-1 space-y-3 pb-6">
        {items.map((it, n) => (
          <Card key={it.id} className="p-4">
            <p className="mb-3 text-[0.94rem] leading-relaxed text-ink">
              <span className="mr-2 text-ink-3">{n + 1}.</span>{it.text}
            </p>
            <Choice options={test.scale} value={ans[it.id] ?? null} onChange={(v) => setAns((s) => ({ ...s, [it.id]: v }))} />
          </Card>
        ))}
        <Button size="lg" full disabled={filled < items.length} onClick={() => setDone(true)}>
          {filled < items.length ? `เหลืออีก ${items.length - filled} ข้อ` : <><Check size={17} /> ดูผล</>}
        </Button>
      </main>
      <Hotline />
    </Shell>
  );
}
