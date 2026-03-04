"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useToast } from "@/components/providers/app-providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchJson } from "@/lib/client";

export function EntryDetailClient({
  entryId,
  initialTranscript,
}: {
  entryId: string;
  initialTranscript: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [text, setText] = useState(initialTranscript);
  const [pending, startTransition] = useTransition();

  const rerunAnalyze = (toneOverride?: "gentle" | "logical" | "specific") => {
    startTransition(async () => {
      try {
        await fetchJson(`/api/entries/${entryId}/transcribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overrideText: text }),
        });
        await fetchJson(`/api/entries/${entryId}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toneOverride ? { toneOverride } : {}),
        });
        push({ title: "結果を更新しました" });
        router.refresh();
      } catch (error) {
        push({
          title: "更新に失敗しました",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  const removeEntry = () => {
    if (!window.confirm("この記録を削除しますか？")) {
      return;
    }

    startTransition(async () => {
      try {
        await fetchJson(`/api/entries/${entryId}`, { method: "DELETE" });
        push({ title: "記録を削除しました" });
        router.push("/entries");
        router.refresh();
      } catch (error) {
        push({
          title: "削除に失敗しました",
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card inset className="p-0">
        <details className="group">
          <summary className="flex min-h-14 list-none items-center justify-between px-4 py-4 text-sm font-semibold text-[var(--text-primary)]">
            文字起こしを見る
            <span className="text-xs text-[var(--text-tertiary)] group-open:hidden">開く</span>
            <span className="hidden text-xs text-[var(--text-tertiary)] group-open:inline">閉じる</span>
          </summary>
          <div className="space-y-3 border-t border-[color:rgba(120,120,120,0.08)] px-4 py-4">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-label="文字起こしテキスト"
              className="min-h-40 w-full rounded-[20px] border border-transparent bg-[var(--bg-page)] p-4 text-sm text-[var(--text-primary)] outline-none shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => rerunAnalyze()} disabled={pending}>
                再解析する
              </Button>
              <Button variant="danger" onClick={removeEntry} disabled={pending}>
                削除
              </Button>
            </div>
          </div>
        </details>
      </Card>

      <Card inset className="p-0">
        <details className="group">
          <summary className="flex min-h-14 list-none items-center justify-between px-4 py-4 text-sm font-semibold text-[var(--text-primary)]">
            出力を調整
            <span className="text-xs text-[var(--text-tertiary)] group-open:hidden">開く</span>
            <span className="hidden text-xs text-[var(--text-tertiary)] group-open:inline">閉じる</span>
          </summary>
          <div className="space-y-3 border-t border-[color:rgba(120,120,120,0.08)] px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="secondary"
                className="px-2 text-xs"
                onClick={() => rerunAnalyze("gentle")}
                disabled={pending}
              >
                もっと優しく
              </Button>
              <Button
                variant="secondary"
                className="px-2 text-xs"
                onClick={() => rerunAnalyze("logical")}
                disabled={pending}
              >
                もっと論理的に
              </Button>
              <Button
                variant="secondary"
                className="px-2 text-xs"
                onClick={() => rerunAnalyze("specific")}
                disabled={pending}
              >
                もっと具体的に
              </Button>
            </div>
            <Button className="w-full" onClick={() => rerunAnalyze()} disabled={pending}>
              今の内容で更新する
            </Button>
          </div>
        </details>
      </Card>
    </div>
  );
}
