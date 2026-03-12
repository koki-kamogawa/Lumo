import { MemoryMode, ProposalStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { endOfWeek, startOfWeek } from "@/lib/utils";
import {
  serializeAnalysis,
  serializeEntryDetail,
  serializeEntryListItem,
  serializeMemoryItem,
  serializeProposal,
  serializeSettings,
  serializeWeeklyReport,
} from "@/lib/data/serializers";

function normalizeMemoryText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[「」『』（）()［］【】、。,.!！?？:：;；・…ー\-]/g, "");
}

export async function getSettingsForUser(userId: string) {
  const settings = await prisma.settings.findUniqueOrThrow({
    where: { userId },
  });

  return serializeSettings(settings);
}

export async function getEntriesForUser(
  userId: string,
  filters?: { q?: string; period?: "all" | "7d" | "30d"; emotion?: string },
) {
  const now = new Date();
  const from =
    filters?.period === "7d"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : filters?.period === "30d"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : undefined;

  const entries = await prisma.entry.findMany({
    where: {
      userId,
      deletedAt: null,
      occurredAt: from ? { gte: from } : undefined,
      OR: filters?.q
        ? [
            { title: { contains: filters.q } },
            { note: { contains: filters.q } },
            { transcript: { content: { contains: filters.q } } },
          ]
        : undefined,
    },
    include: {
      analysis: {
        select: {
          emotionTopJson: true,
        },
      },
    },
    orderBy: {
      occurredAt: "desc",
    },
  });

  const serialized = entries.map(serializeEntryListItem);
  return filters?.emotion
    ? serialized.filter((entry) => entry.emotions.includes(filters.emotion!))
    : serialized;
}

export async function getEntryDetail(userId: string, entryId: string) {
  const entry = await prisma.entry.findFirstOrThrow({
    where: {
      id: entryId,
      userId,
      deletedAt: null,
    },
    include: {
      transcript: true,
      analysis: true,
      memoryEvidenceLinks: {
        include: {
          memoryItem: {
            select: {
              memoryText: true,
            },
          },
        },
      },
      proposals: {
        where: { status: ProposalStatus.PENDING },
        orderBy: { createdAt: "desc" },
        select: { id: true },
        take: 1,
      },
    },
  });

  return serializeEntryDetail(entry);
}

export async function getMemoryItems(userId: string, status?: string) {
  const items = await prisma.memoryItem.findMany({
    where: {
      userId,
      status: status && status !== "ALL" ? (status as never) : undefined,
    },
    include: {
      evidenceLinks: {
        include: {
          entry: {
            select: {
              title: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const uniqueMap = new Map<string, (typeof items)[number]>();
  const evidenceSeenMap = new Map<string, Set<string>>();

  for (const item of items) {
    const key = normalizeMemoryText(item.memoryText) || item.id;
    const existing = uniqueMap.get(key);

    if (!existing) {
      uniqueMap.set(key, item);
      evidenceSeenMap.set(
        key,
        new Set(item.evidenceLinks.map((link) => `${link.entryId ?? "none"}:${link.quote}`)),
      );
      continue;
    }

    const existingEvidenceKeys = evidenceSeenMap.get(key) ?? new Set<string>();
    for (const link of item.evidenceLinks) {
      const evidenceKey = `${link.entryId ?? "none"}:${link.quote}`;
      if (existingEvidenceKeys.has(evidenceKey)) {
        continue;
      }
      existing.evidenceLinks.push(link);
      existingEvidenceKeys.add(evidenceKey);
    }
    evidenceSeenMap.set(key, existingEvidenceKeys);
  }

  return Array.from(uniqueMap.values()).map(serializeMemoryItem);
}

export async function getMemoryProposal(userId: string, proposalId: string) {
  const proposal = await prisma.memoryProposal.findFirstOrThrow({
    where: {
      id: proposalId,
      userId,
    },
  });

  return serializeProposal(proposal);
}

export async function getWeeklyReports(userId: string) {
  const reports = await prisma.weeklyReport.findMany({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });

  return reports.map(serializeWeeklyReport);
}

export async function getWeeklyReport(userId: string, reportId: string) {
  const report = await prisma.weeklyReport.findFirstOrThrow({
    where: {
      id: reportId,
      userId,
    },
  });

  return serializeWeeklyReport(report);
}

export async function getHomeData(userId: string) {
  const [entries, settings, activeProposalCount] = await Promise.all([
    prisma.entry.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        analysis: true,
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: 4,
    }),
    prisma.settings.findUniqueOrThrow({ where: { userId } }),
    prisma.memoryProposal.count({
      where: { userId, status: ProposalStatus.PENDING },
    }),
  ]);

  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  const weeklyCount = await prisma.entry.count({
    where: {
      userId,
      deletedAt: null,
      occurredAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
  });

  const lastAnalyzed = entries.find((entry) => entry.analysis);
  const yesterdayCard = lastAnalyzed?.analysis
    ? {
        label: "きのうの自分から",
        quote: lastAnalyzed.analysis.praiseEvidenceQuote,
        source: "昨日のあなたの言葉より",
      }
    : null;

  return {
    settings: serializeSettings(settings),
    recentEntries: entries.map(serializeEntryListItem),
    latestAnalysis: serializeAnalysis(lastAnalyzed?.analysis ?? null),
    yesterdayCard,
    weeklyCount,
    activeProposalCount,
    streak: Math.min(entries.length, 7),
  };
}

export async function getDashboardWeeklyReport(userId: string) {
  const report = await prisma.weeklyReport.findFirst({
    where: { userId },
    orderBy: { weekStart: "desc" },
  });

  return report ? serializeWeeklyReport(report) : null;
}

export async function getPendingProposalCount(userId: string) {
  return prisma.memoryProposal.count({
    where: {
      userId,
      status: ProposalStatus.PENDING,
    },
  });
}

export async function getLatestPendingProposal(userId: string) {
  return prisma.memoryProposal.findFirst({
    where: {
      userId,
      status: ProposalStatus.PENDING,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getResultContext(userId: string, entryId: string) {
  const detail = await getEntryDetail(userId, entryId);
  const settings = await getSettingsForUser(userId);
  const pendingCount = settings.memoryMode === MemoryMode.APPROVAL ? await getPendingProposalCount(userId) : 0;

  return {
    detail,
    settings,
    pendingCount,
  };
}
