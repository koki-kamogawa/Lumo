import Link from "next/link";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getWeeklyReports } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/utils";

export default async function WeeklyPage() {
  const user = await getCurrentUser();
  const reports = await getWeeklyReports(user.id);
  const report = reports[0];

  if (!report) {
    return (
      <MobileShell>
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">まだ週次レポートはありません。</p>
          <Button asChild className="mt-4 w-full">
            <Link href="/record">まずは記録する</Link>
          </Button>
        </Card>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">今週のふりかえり</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {formatShortDate(report.weekStart)} - {formatShortDate(report.weekEnd)}
          </p>
        </div>

        <Card inset>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">今週の詳細</p>

            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">感情の流れ</p>
              <div className="mt-3 flex items-end justify-between gap-2">
                {report.emotionFlowJson.map((item) => (
                  <div key={item.day} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-full bg-[var(--accent)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
                      style={{ height: `${Math.max(item.value, 24)}px` }}
                    />
                    <span className="text-xs text-[var(--text-secondary)]">{item.day}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">よく出たテーマ</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.themeTagsJson.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--bg-page)] px-3 py-2 text-xs text-[var(--accent-dark)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)]">先週からの変化</p>
              <p className="mt-2 text-sm leading-7 text-[var(--text-primary)]">{report.changeSummary}</p>
            </div>
          </div>
        </Card>

        <Card soft>
          <p className="text-xs font-semibold tracking-wide text-[var(--accent)]">今週の結論</p>
          <p className="mt-3 text-sm leading-7 text-[var(--accent-dark)]">
            {report.shareLine ?? report.changeSummary}
          </p>
        </Card>

        <Card inset className="p-0">
          <details className="group">
            <summary className="flex min-h-14 list-none items-center justify-between px-4 py-4 text-sm font-semibold text-[var(--text-primary)]">
              パターンと回復のきっかけ
              <span className="text-xs text-[var(--text-tertiary)] group-open:hidden">開く</span>
              <span className="hidden text-xs text-[var(--text-tertiary)] group-open:inline">閉じる</span>
            </summary>
            <div className="space-y-4 border-t border-[color:rgba(120,120,120,0.08)] px-4 py-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">繰り返しパターン</p>
                <p className="mt-2 text-sm leading-7 text-[var(--text-primary)]">{report.loopSummary}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">回復のきっかけ</p>
                <ul className="mt-2 space-y-2 text-sm text-[var(--text-primary)]">
                  {report.recoveryListJson.slice(0, 3).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        </Card>

        <Button asChild className="w-full">
          <Link href={`/share?weeklyId=${report.id}`}>今週のまとめを共有</Link>
        </Button>
      </div>
    </MobileShell>
  );
}
