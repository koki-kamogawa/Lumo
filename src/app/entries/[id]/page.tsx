import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { EntryDetailClient } from "@/components/entries/entry-detail-client";
import { ProposalActionsClient } from "@/components/memory/proposal-actions-client";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getResultContext } from "@/lib/data/queries";
import { formatDateJP } from "@/lib/utils";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const { detail, settings } = await getResultContext(user.id, id);
  const emotions = detail.analysis?.emotionTopJson ?? [];
  const primaryEmotion = emotions[0];
  const secondaryEmotion = emotions[1];

  return (
    <MobileShell
      topAction={
        <details className="relative">
          <summary className="flex list-none cursor-pointer items-center justify-center rounded-full bg-[var(--bg-page)] p-3 text-[var(--text-secondary)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]">
            <span className="sr-only">その他の操作を開く</span>
            <MoreHorizontal className="size-5" />
          </summary>
          <div className="absolute right-0 top-14 w-44 rounded-[18px] bg-[var(--bg-page)] p-2 shadow-[10px_10px_22px_var(--shadow-dark),-10px_-10px_22px_var(--shadow-light)]">
            <Link
              href={`/share?entryId=${detail.id}`}
              className="flex min-h-11 items-center rounded-[14px] px-3 text-sm text-[var(--text-primary)]"
            >
              共有カードを作る
            </Link>
          </div>
        </details>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-[var(--text-tertiary)]">{formatDateJP(detail.occurredAt)}</p>
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">今日の鏡</h1>
        </div>

        {detail.analysis ? (
          <>
            <Card soft>
              <p className="text-xs font-semibold tracking-wide text-[var(--accent)]">今日のあなたの良さ</p>
              <p className="mt-3 text-lg font-semibold leading-8 text-[var(--accent-dark)]">
                {detail.analysis.praiseLine}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">「{detail.analysis.praiseEvidenceQuote}」</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-[var(--bg-page)] px-3 py-1 text-xs font-semibold text-[var(--accent)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
                  {detail.analysis.microBadge ?? "MIRROR"}
                </span>
                <span className="text-right text-xs text-[var(--accent-dark)]">{detail.analysis.nextTeaser}</span>
              </div>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">今日の要約</p>
              <p className="mt-3 line-clamp-2 whitespace-pre-line text-sm leading-7 text-[var(--text-primary)]">
                {detail.analysis.summaryFacts}
              </p>
            </Card>

            <Card>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">感情</p>
              {primaryEmotion ? (
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-2xl font-semibold text-[var(--text-primary)]">{primaryEmotion.label}</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">今日いちばん大きかった感情</p>
                  </div>
                  <p className="text-xl font-semibold text-[var(--accent-dark)]">
                    {Math.round(primaryEmotion.score * 100)}%
                  </p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">まだ感情の解析はありません。</p>
              )}
            </Card>

            <Card inset className="p-0">
              <details className="group">
                <summary className="flex min-h-14 list-none items-center justify-between px-4 py-4 text-sm font-semibold text-[var(--text-primary)]">
                  もっと見る
                  <span className="text-xs text-[var(--text-tertiary)] group-open:hidden">開く</span>
                  <span className="hidden text-xs text-[var(--text-tertiary)] group-open:inline">閉じる</span>
                </summary>
                <div className="space-y-4 border-t border-[color:rgba(120,120,120,0.08)] px-4 py-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-tertiary)]">エネルギーピーク</p>
                    <p className="text-sm leading-7 text-[var(--text-primary)]">「{detail.analysis.energyPeakQuote}」</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--text-tertiary)]">今日の問い</p>
                    <p className="text-sm leading-7 text-[var(--text-primary)]">{detail.analysis.followupQuestion}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">答えなくても大丈夫です。</p>
                  </div>
                  {secondaryEmotion ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-tertiary)]">ほかの感情</p>
                      <p className="text-sm text-[var(--text-primary)]">
                        {secondaryEmotion.label} {Math.round(secondaryEmotion.score * 100)}%
                      </p>
                    </div>
                  ) : null}
                </div>
              </details>
            </Card>
          </>
        ) : (
          <Card>
            <p className="text-sm text-[var(--text-secondary)]">解析結果はまだありません。</p>
          </Card>
        )}

        <Button asChild className="w-full">
          <Link href="/record">追加で1分話す</Link>
        </Button>

        <EntryDetailClient
          entryId={detail.id}
          initialTranscript={detail.transcript?.editedContent || detail.transcript?.content || detail.note || ""}
        />

        {settings.memoryMode === "APPROVAL" && detail.proposalId ? (
          <Card soft>
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[var(--accent-dark)]">メモリ候補</p>
              <p className="text-sm leading-6 text-[var(--accent-dark)]">
                あとで見返しやすい記憶候補を最大3件まで用意しました。
              </p>
              <ProposalActionsClient proposalId={detail.proposalId} />
            </div>
          </Card>
        ) : null}

        {settings.memoryMode === "AUTO" ? (
          <Card soft>
            <p className="text-sm font-semibold text-[var(--accent-dark)]">メモリ保存</p>
            <p className="mt-2 text-sm leading-6 text-[var(--accent-dark)]">
              候補は自動で保存されます。不要なものは Memory であとから整理できます。
            </p>
          </Card>
        ) : null}

        <Card>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">関連メモリ</p>
            {detail.memoryLinks.length > 0 ? (
              detail.memoryLinks.map((memory) => (
                <div
                  key={memory.id}
                  className="rounded-[18px] bg-[var(--bg-page)] px-4 py-4 shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{memory.memoryText}</p>
                  <p className="mt-1 text-xs text-[var(--text-tertiary)]">根拠: 「{memory.quote}」</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">まだ関連メモリはありません。</p>
            )}
          </div>
        </Card>
      </div>
    </MobileShell>
  );
}
