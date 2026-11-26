"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell, TopBar, Button, Hotline } from "@/components/ui";
import { ChevronRight } from "@/components/icons";
import { TestForm, TestResult, type TestAnswers } from "@/components/test-form";
import { BridgeSheet, type BridgeStep } from "@/components/bridge";
import { byId } from "@/lib/tests";

export default function TakeTest({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const test = byId(id);
  const [ans, setAns] = useState<TestAnswers | null>(null);
  const [sheet, setSheet] = useState<BridgeStep | null>(null);

  if (!test) { router.replace("/tests"); return null; }

  if (ans)
    return (
      <Shell>
        <TopBar back="/tests" label={test.short} />
        <main className="rise flex flex-1 flex-col justify-center py-10">
          <TestResult test={test} ans={ans} onBridge={() => setSheet("who")} />
          <div className="mt-4 space-y-2.5">
            <Button href="/chat" size="lg" full>คุยกับ AI ต่อ <ChevronRight size={16} /></Button>
            <Button href="/tests" variant="line" size="lg" full>กลับ</Button>
          </div>
        </main>
        <Hotline />
        {sheet ? <BridgeSheet step={sheet} onStep={setSheet} /> : null}
      </Shell>
    );

  return (
    <Shell>
      <TopBar back="/tests" label={test.short} />
      <main className="flex flex-1 flex-col">
        <TestForm test={test} onDone={setAns} />
      </main>
      <Hotline />
    </Shell>
  );
}
