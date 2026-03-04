import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getEntriesForUser } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/utils";

const emotionOptions = ["うれしさ", "安心", "不安", "疲れ", "達成感", "迷い"];

export default async function EntriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; period?: "all" | "7d" | "30d"; emotion?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const entries = await getEntriesForUser(user.id, params);

  return (
    <MobileShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">過去の自分</h1>
          <p className="text-sm text-[var(--text-secondary)]">必要な時だけ、条件を開いて振り返れます。</p>
        </div>

        <Card inset>
          <form className="space-y-3" action="/entries">
            <label className="flex items-center gap-3 rounded-[20px] bg-[var(--bg-page)] px-4 py-4 shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]">
              <Search className="size-4 text-[var(--text-tertiary)]" />
              <input
                type="search"
                name="q"
                defaultValue={params.q}
                placeholder="タイトルや言葉で検索"
                className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none"
              />
            </label>

            <details className="group rounded-[20px] bg-[var(--bg-page)] px-4 py-1 shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]">
              <summary className="flex min-h-12 list-none items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="size-4" />
                  フィルタ
                </span>
                <span className="text-xs text-[var(--text-tertiary)] group-open:hidden">開く</span>
                <span className="hidden text-xs text-[var(--text-tertiary)] group-open:inline">閉じる</span>
              </summary>
              <div className="space-y-3 pb-4 pt-1">
                <div className="space-y-2">
                  <label htmlFor="period" className="text-xs font-semibold text-[var(--text-tertiary)]">
                    期間
                  </label>
                  <select
                    id="period"
                    name="period"
                    defaultValue={params.period ?? "all"}
                    className="h-11 w-full rounded-[14px] bg-[var(--bg-page)] px-4 text-sm text-[var(--text-primary)] outline-none shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
                  >
                    <option value="all">すべて</option>
                    <option value="7d">7日</option>
                    <option value="30d">30日</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="emotion" className="text-xs font-semibold text-[var(--text-tertiary)]">
                    感情
                  </label>
                  <select
                    id="emotion"
                    name="emotion"
                    defaultValue={params.emotion ?? ""}
                    className="h-11 w-full rounded-[14px] bg-[var(--bg-page)] px-4 text-sm text-[var(--text-primary)] outline-none shadow-[inset_4px_4px_10px_var(--shadow-dark),inset_-4px_-4px_10px_var(--shadow-light)]"
                  >
                    <option value="">指定しない</option>
                    {emotionOptions.map((emotion) => (
                      <option key={emotion} value={emotion}>
                        {emotion}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--text-on-accent)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
                >
                  絞り込む
                </button>
              </div>
            </details>
          </form>
        </Card>

        <div className="space-y-3">
          {entries.map((entry) => (
            <Link key={entry.id} href={`/entries/${entry.id}`}>
              <Card className="rounded-[20px] px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{entry.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-tertiary)]">{formatShortDate(entry.occurredAt)}</p>
                  </div>
                  <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
                    {entry.emotions[0] || "未分析"}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
          {entries.length === 0 ? (
            <Card>
              <p className="text-sm text-[var(--text-secondary)]">条件に合う記録はありませんでした。</p>
            </Card>
          ) : null}
        </div>
      </div>
    </MobileShell>
  );
}
