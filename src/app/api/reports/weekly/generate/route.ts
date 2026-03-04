import { getCurrentUser } from "@/lib/auth/user";
import { getWeeklyReport } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { weeklyReportSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";
import { endOfWeek, startOfWeek } from "@/lib/utils";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const weekStartParam = url.searchParams.get("week_start");
  const anchor = weekStartParam ? new Date(weekStartParam) : new Date();

  if (Number.isNaN(anchor.getTime())) {
    return jsonError("Invalid week_start", 422);
  }

  const weekStart = startOfWeek(anchor);
  const weekEnd = endOfWeek(anchor);

  const entries = await prisma.entry.findMany({
    where: {
      userId: user.id,
      deletedAt: null,
      occurredAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    include: {
      analysis: true,
    },
    orderBy: {
      occurredAt: "asc",
    },
  });

  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const emotionFlow = labels.map((day, index) => {
    const entry = entries[index];
    const score = entry?.analysis ? 35 + index * 5 : 24 + index * 4;
    return { day, value: score };
  });

  const themeTags = Array.from(
    new Set(
      entries.flatMap((entry) =>
        [entry.title, entry.note ?? ""]
          .join(" ")
          .split(/[、。\s]/)
          .filter((word) => word.length >= 2)
          .slice(0, 3),
      ),
    ),
  ).slice(0, 4);

  const report = await prisma.weeklyReport.create({
    data: {
      userId: user.id,
      weekStart,
      weekEnd,
      emotionFlowJson: JSON.stringify(emotionFlow),
      themeTagsJson: JSON.stringify(themeTags.length ? themeTags : ["継続", "気づき", "安心"]),
      changeSummary: "前週より、感情をそのまま言葉にするスピードが上がっています。",
      loopSummary: "焦りが出ても、人に話すと少し回復しやすい流れが見えます。",
      recoveryListJson: JSON.stringify(["短い散歩", "友人との会話", "書き出して整理する"]),
      shareLine: "今週は『焦りの自覚』から『整え方の発見』へ少し進んでいました。",
    },
  });

  const detail = await getWeeklyReport(user.id, report.id);
  return jsonOk(weeklyReportSchema, detail);
}
