import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ShareCardClient } from "@/components/share/share-card-client";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/user";
import { getEntryDetail, getWeeklyReport } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { maskSensitiveText } from "@/lib/utils";

function parseStringArray(value: unknown) {
  let current = value;

  for (let index = 0; index < 3; index += 1) {
    if (typeof current !== "string") {
      break;
    }

    try {
      current = JSON.parse(current);
    } catch {
      break;
    }
  }

  return Array.isArray(current) ? (current as string[]) : [];
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<{ entryId?: string; weeklyId?: string }>;
}) {
  const { entryId, weeklyId } = await searchParams;
  const user = await getCurrentUser();
  const backHref = entryId ? `/entries/${entryId}` : weeklyId ? `/weekly/${weeklyId}` : "/";

  let headline = "洞察共有カード";
  let quote = "まだ共有できる洞察がありません。";
  let emotions: string[] = [];

  if (entryId) {
    const entry = await getEntryDetail(user.id, entryId);
    headline = "今日の鏡";
    quote = maskSensitiveText(entry.analysis?.weekHintLine || entry.analysis?.summaryFacts || entry.title);
    emotions = entry.analysis?.emotionTopJson.map((item) => item.label) ?? [];
  } else if (weeklyId) {
    const weekly = await getWeeklyReport(user.id, weeklyId);
    headline = "今週の鏡";
    quote = maskSensitiveText(weekly.shareLine || weekly.changeSummary);
    emotions = weekly.themeTagsJson.slice(0, 2);
  } else {
    const latest = await prisma.shareCard.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (latest) {
      quote = latest.maskedQuote;
      emotions = parseStringArray(latest.emotionTagsJson);
    }
  }

  const shareText = `${headline}\n${quote}\n${emotions.join(" / ")}\nLumo`;

  return (
    <MobileShell
      withTabBar={false}
      topLeft={
        <Link
          href={backHref}
          aria-label="前の画面へ戻る"
          className="pressable-soft pressable-soft-neutral rounded-full bg-[var(--bg-page)] p-3 text-[var(--text-secondary)] shadow-[6px_6px_14px_var(--shadow-dark),-6px_-6px_14px_var(--shadow-light)]"
        >
          <ArrowLeft className="size-5" />
        </Link>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">共有カード</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            本文は含めず、洞察だけをマスクした状態で共有します。
          </p>
        </div>

        <Card soft className="p-5">
          <p className="text-xs font-semibold tracking-wide text-[var(--accent-dark)]">{headline}</p>
          <p className="mt-4 text-2xl font-semibold leading-10 text-[var(--accent-dark)]">{quote}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {emotions.map((emotion) => (
              <span
                key={emotion}
                className="rounded-full bg-[var(--bg-page)] px-3 py-2 text-xs text-[var(--accent-dark)] shadow-[4px_4px_10px_var(--shadow-dark),-4px_-4px_10px_var(--shadow-light)]"
              >
                {emotion}
              </span>
            ))}
          </div>
          <p className="mt-6 text-xs tracking-[0.2em] text-[var(--accent)]">Lumo</p>
        </Card>

        <ShareCardClient text={shareText} />
      </div>
    </MobileShell>
  );
}
