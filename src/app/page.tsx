import { Leaf, Sparkles } from "lucide-react";
import Link from "next/link";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getDashboardWeeklyReport, getHomeData } from "@/lib/data/queries";
import { formatDateJP } from "@/lib/utils";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [home, weeklyReport] = await Promise.all([
    getHomeData(user.id),
    getDashboardWeeklyReport(user.id),
  ]);

  const todayHint = home.yesterdayCard
    ? {
        label: home.yesterdayCard.label,
        body: home.yesterdayCard.quote,
        source: home.yesterdayCard.source,
      }
    : {
        label: "今週",
        body:
          home.latestAnalysis?.weekHintLine ||
          weeklyReport?.shareLine ||
          "今週の傾向は、次の記録が増えるほどくっきり見えてきます。",
        source: home.weeklyCount > 0 ? `今週 ${home.weeklyCount}/7 回` : "まだ記録はありません",
      };

  return (
    <MobileShell>
      <div className="space-y-6 pt-2">
        <header className="space-y-3">
          <p className="text-sm font-medium text-[var(--text-tertiary)]">{formatDateJP(new Date())}</p>
          <div className="space-y-2">
            <h1 className="text-[30px] font-bold leading-tight text-[var(--text-primary)]">
              今日のことを、
              <br />
              ひとつだけ話そう。
            </h1>
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-page)] px-4 py-2 text-sm text-[var(--accent-dark)] shadow-[5px_5px_12px_var(--shadow-dark),-5px_-5px_12px_var(--shadow-light)]">
              <Leaf className="size-4 text-[var(--accent)]" />
              {home.streak}日つづけて記録中
            </div>
          </div>
        </header>

        <Button asChild className="min-h-16 w-full text-base">
          <Link href="/record">今日話す</Link>
        </Button>

        <Card soft className="p-5">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-page)] text-[var(--accent)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]">
              <Sparkles className="size-4" />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-wide text-[var(--accent)]">{todayHint.label}</p>
              <p className="text-sm leading-7 text-[var(--accent-dark)]">{todayHint.body}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{todayHint.source}</p>
            </div>
          </div>
        </Card>
      </div>
    </MobileShell>
  );
}
