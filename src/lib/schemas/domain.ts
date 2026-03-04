import {
  AdviceIntensity,
  GoalMode,
  MemoryMode,
  MemoryStatus,
  ProposalStatus,
  ResponseStyle,
  SourceMode,
} from "@prisma/client";
import { z } from "zod";

export const emotionSchema = z.object({
  label: z.string(),
  score: z.number().min(0).max(1),
});

export const memoryProposalItemSchema = z.object({
  memory_text: z.string().min(1),
  confidence: z.number().min(0).max(1),
  stability: z.number().min(0).max(1),
  sensitivity: z.enum(["LOW", "MEDIUM", "HIGH"]),
  evidence_quote: z.string().min(1),
});

export const analysisOutputSchema = z.object({
  summary_facts: z.string().min(1),
  emotion_top: z.array(emotionSchema).max(2),
  energy_peak_quote: z.string().min(1),
  followup_question: z.string().min(1),
  week_hint_line: z.string(),
  praise_line: z.string(),
  praise_evidence_quote: z.string(),
  micro_badge: z.string().nullable(),
  next_teaser: z.string().min(1),
  memory_proposals: z.array(memoryProposalItemSchema).max(3),
});

export const settingsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  responseStyle: z.nativeEnum(ResponseStyle),
  purpose: z.nativeEnum(GoalMode),
  adviceIntensity: z.nativeEnum(AdviceIntensity),
  memoryMode: z.nativeEnum(MemoryMode),
  shareByDefault: z.boolean(),
  reminderFrequency: z.string().nullable(),
  reminderTime: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createEntryInputSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  note: z.string().max(1000).optional().nullable(),
  occurredAt: z.string().datetime().optional(),
});

export const transcribeInputSchema = z.object({
  overrideText: z.string().max(5000).optional(),
});

export const toneOverrideSchema = z.object({
  toneOverride: z.enum(["gentle", "logical", "specific"]).optional(),
});

export const patchSettingsSchema = z.object({
  responseStyle: z.nativeEnum(ResponseStyle).optional(),
  purpose: z.nativeEnum(GoalMode).optional(),
  adviceIntensity: z.nativeEnum(AdviceIntensity).optional(),
  memoryMode: z.nativeEnum(MemoryMode).optional(),
  shareByDefault: z.boolean().optional(),
  reminderFrequency: z.string().max(50).nullable().optional(),
  reminderTime: z.string().max(20).nullable().optional(),
});

export const patchMemoryItemSchema = z.object({
  memoryText: z.string().min(1).max(300).optional(),
  category: z.string().max(50).nullable().optional(),
  status: z.nativeEnum(MemoryStatus).optional(),
  sensitivity: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export const exportInputSchema = z.object({
  format: z.enum(["json", "md"]),
});

export const applyProposalInputSchema = z.object({
  selectedIndexes: z.array(z.number().int().min(0).max(2)).optional(),
});

export const queryEntriesSchema = z.object({
  q: z.string().optional(),
  period: z.enum(["all", "7d", "30d"]).optional(),
  emotion: z.string().optional(),
});

export const memoryItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  category: z.string().nullable(),
  memoryText: z.string(),
  confidence: z.number(),
  stability: z.number(),
  sensitivity: z.string(),
  status: z.nativeEnum(MemoryStatus),
  sourceMode: z.nativeEnum(SourceMode),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: z.string().nullable(),
  evidenceLinks: z
    .array(
      z.object({
        id: z.string(),
        quote: z.string(),
        entryId: z.string().nullable(),
        entryTitle: z.string().nullable(),
      }),
    )
    .optional(),
});

export const proposalSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  userId: z.string(),
  status: z.nativeEnum(ProposalStatus),
  proposedItemsJson: z.array(memoryProposalItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const analysisSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  summaryFacts: z.string(),
  emotionTopJson: z.array(emotionSchema),
  energyPeakQuote: z.string(),
  followupQuestion: z.string(),
  weekHintLine: z.string(),
  praiseLine: z.string(),
  praiseEvidenceQuote: z.string(),
  microBadge: z.string().nullable(),
  nextTeaser: z.string(),
  temporaryTone: z.string().nullable(),
  crisisDetected: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const entryListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  note: z.string().nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
  emotions: z.array(z.string()),
});

export const entryDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  note: z.string().nullable(),
  occurredAt: z.string(),
  createdAt: z.string(),
  transcript: z
    .object({
      id: z.string(),
      content: z.string(),
      editedContent: z.string().nullable(),
      source: z.string(),
      confidence: z.number().nullable(),
    })
    .nullable(),
  analysis: analysisSchema.nullable(),
  memoryLinks: z.array(
    z.object({
      id: z.string(),
      memoryItemId: z.string(),
      quote: z.string(),
      memoryText: z.string(),
    }),
  ),
  proposalId: z.string().nullable(),
});

export const weeklyReportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  weekStart: z.string(),
  weekEnd: z.string(),
  emotionFlowJson: z.array(z.object({ day: z.string(), value: z.number() })),
  themeTagsJson: z.array(z.string()),
  changeSummary: z.string(),
  loopSummary: z.string(),
  recoveryListJson: z.array(z.string()),
  shareLine: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

