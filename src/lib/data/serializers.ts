import type {
  AnalysisResult,
  Entry,
  MemoryItem,
  MemoryProposal,
  Settings,
  WeeklyReport,
} from "@prisma/client";
import { asIso } from "@/lib/schemas/http";

function parseJson<T>(value: unknown): T {
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

  return current as T;
}

function parseJsonArray<T>(value: unknown): T[] {
  const parsed = parseJson<unknown>(value);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

export function serializeSettings(settings: Settings) {
  return {
    ...settings,
    shareByDefault: false,
    reminderFrequency: settings.reminderFrequency ?? null,
    reminderTime: settings.reminderTime ?? null,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export function serializeAnalysis(analysis: AnalysisResult | null) {
  if (!analysis) {
    return null;
  }

  return {
    ...analysis,
    emotionTopJson: parseJsonArray<{ label: string; score: number }>(analysis.emotionTopJson),
    temporaryTone: analysis.temporaryTone ?? null,
    microBadge: analysis.microBadge ?? null,
    createdAt: analysis.createdAt.toISOString(),
    updatedAt: analysis.updatedAt.toISOString(),
  };
}

export function serializeEntryListItem(
  entry: Entry & { analysis: Pick<AnalysisResult, "emotionTopJson"> | null },
) {
  const emotions = entry.analysis?.emotionTopJson
    ? parseJsonArray<{ label: string }>(entry.analysis.emotionTopJson).map((item) => item.label)
    : [];

  return {
    id: entry.id,
    title: entry.title,
    note: entry.note ?? null,
    occurredAt: entry.occurredAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    emotions,
  };
}

export function serializeEntryDetail(
  entry: Entry & {
    transcript:
      | {
          id: string;
          content: string;
          editedContent: string | null;
          source: string;
          confidence: number | null;
        }
      | null;
    analysis: AnalysisResult | null;
    memoryEvidenceLinks: Array<{
      id: string;
      memoryItemId: string;
      quote: string;
      memoryItem: { memoryText: string };
    }>;
    proposals: Array<{ id: string }>;
  },
) {
  return {
    id: entry.id,
    title: entry.title,
    note: entry.note ?? null,
    occurredAt: entry.occurredAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    transcript: entry.transcript
      ? {
          ...entry.transcript,
          editedContent: entry.transcript.editedContent ?? null,
          confidence: entry.transcript.confidence ?? null,
        }
      : null,
    analysis: serializeAnalysis(entry.analysis),
    memoryLinks: entry.memoryEvidenceLinks.map((link) => ({
      id: link.id,
      memoryItemId: link.memoryItemId,
      quote: link.quote,
      memoryText: link.memoryItem.memoryText,
    })),
    proposalId: entry.proposals[0]?.id ?? null,
  };
}

export function serializeMemoryItem(
  item: MemoryItem & {
    evidenceLinks?: Array<{
      id: string;
      quote: string;
      entryId: string | null;
      entry: { title: string } | null;
    }>;
  },
) {
  return {
    id: item.id,
    userId: item.userId,
    category: item.category ?? null,
    memoryText: item.memoryText,
    confidence: item.confidence,
    stability: item.stability,
    sensitivity: item.sensitivity,
    status: item.status,
    sourceMode: item.sourceMode,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    archivedAt: asIso(item.archivedAt),
    evidenceLinks: item.evidenceLinks?.map((link) => ({
      id: link.id,
      quote: link.quote,
      entryId: link.entryId ?? null,
      entryTitle: link.entry?.title ?? null,
    })),
  };
}

export function serializeProposal(proposal: MemoryProposal) {
  return {
    id: proposal.id,
    entryId: proposal.entryId,
    userId: proposal.userId,
    status: proposal.status,
    proposedItemsJson: parseJsonArray<{
      memory_text: string;
      confidence: number;
      stability: number;
      sensitivity: "LOW" | "MEDIUM" | "HIGH";
      evidence_quote: string;
    }>(proposal.proposedItemsJson),
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };
}

export function serializeWeeklyReport(report: WeeklyReport) {
  return {
    id: report.id,
    userId: report.userId,
    weekStart: report.weekStart.toISOString(),
    weekEnd: report.weekEnd.toISOString(),
    emotionFlowJson: parseJsonArray<{ day: string; value: number }>(report.emotionFlowJson),
    themeTagsJson: parseJsonArray<string>(report.themeTagsJson),
    changeSummary: report.changeSummary,
    loopSummary: report.loopSummary,
    recoveryListJson: parseJsonArray<string>(report.recoveryListJson),
    shareLine: report.shareLine ?? null,
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
