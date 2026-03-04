import Link from "next/link";
import { MobileShell } from "@/components/layout/mobile-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getWeeklyReport, getWeeklyReports } from "@/lib/data/queries";
import { formatShortDate } from "@/lib/utils";

export default async function WeeklyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [report, reports] = await Promise.all([getWeeklyReport(user.id, id), getWeeklyReports(user.id)]);
  const currentIndex = reports.findIndex((item) => item.id === id);
  const prev = currentIndex >= 0 ? reports[currentIndex + 1] : null;
  const next = currentIndex > 0 ? reports[currentIndex - 1] : null;

  return (
    <MobileShell>
      <div className="space-y-5">
        <Card>
          <div className="flex items-center justify-between">
            <Button variant="secondary" asChild>
              <Link href={prev ? `/weekly/${prev.id}` : "/weekly"}>先週</Link>
            </Button>
            <div className="text-center">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Weekly Detail</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {formatShortDate(report.weekStart)} - {formatShortDate(report.weekEnd)}
              </p>
            </div>
            <Button variant="secondary" asChild>
              <Link href={next ? `/weekly/${next.id}` : "/weekly"}>来週</Link>
            </Button>
          </div>
        </Card>
        <Card soft>
          <p className="text-sm text-[var(--accent-dark)]">{report.shareLine}</p>
        </Card>
        <Card>
          <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
            {JSON.stringify(report, null, 2)}
          </pre>
        </Card>
      </div>
    </MobileShell>
  );
}

