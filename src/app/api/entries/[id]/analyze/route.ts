import { z } from "zod";
import { ProposalStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/user";
import { getEntryDetail } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { entryDetailSchema, toneOverrideSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";
import { analyzer } from "@/lib/services/analyze";

function normalizeMemoryText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[「」『』（）()［］【】、。,.!！?？:：;；・…ー\-]/g, "");
}

function mergeSensitivity(current: string, next: string) {
  const rank = { LOW: 1, MEDIUM: 2, HIGH: 3 } as const;
  return rank[next as keyof typeof rank] > rank[current as keyof typeof rank] ? next : current;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const body = toneOverrideSchema.parse(await request.json().catch(() => ({})));
    const [entry, settings, memoryItems, analyzedCount] = await Promise.all([
      prisma.entry.findFirst({
        where: {
          id,
          userId: user.id,
          deletedAt: null,
        },
        include: {
          transcript: true,
          analysis: true,
        },
      }),
      prisma.settings.findUniqueOrThrow({ where: { userId: user.id } }),
      prisma.memoryItem.findMany({
        where: {
          userId: user.id,
          status: "ACTIVE",
        },
      }),
      prisma.analysisResult.count({
        where: {
          entry: {
            userId: user.id,
          },
        },
      }),
    ]);

    if (!entry) {
      return jsonError("Entry not found", 404);
    }

    const transcript = entry.transcript?.editedContent || entry.transcript?.content || entry.note;

    if (!transcript) {
      return jsonError("Transcript is required before analysis", 422);
    }

    const result = await analyzer.analyze({
      transcript,
      settings,
      memoryItems,
      analyzedCount,
      toneOverride: body.toneOverride,
    });

    await prisma.$transaction(async (tx) => {
      await tx.analysisResult.upsert({
        where: { entryId: id },
        update: {
          summaryFacts: result.summary_facts,
          emotionTopJson: JSON.stringify(result.emotion_top),
          energyPeakQuote: result.energy_peak_quote,
          followupQuestion: result.followup_question,
          weekHintLine: result.week_hint_line,
          praiseLine: result.praise_line,
          praiseEvidenceQuote: result.praise_evidence_quote,
          microBadge: result.micro_badge,
          nextTeaser: result.next_teaser,
          temporaryTone: body.toneOverride ?? null,
          crisisDetected: result.crisisDetected,
        },
        create: {
          entryId: id,
          summaryFacts: result.summary_facts,
          emotionTopJson: JSON.stringify(result.emotion_top),
          energyPeakQuote: result.energy_peak_quote,
          followupQuestion: result.followup_question,
          weekHintLine: result.week_hint_line,
          praiseLine: result.praise_line,
          praiseEvidenceQuote: result.praise_evidence_quote,
          microBadge: result.micro_badge,
          nextTeaser: result.next_teaser,
          temporaryTone: body.toneOverride ?? null,
          crisisDetected: result.crisisDetected,
        },
      });

      const autoMemoryForEntry = await tx.memoryItem.findMany({
        where: {
          userId: user.id,
          sourceMode: "AUTO",
          evidenceLinks: {
            some: {
              entryId: id,
            },
          },
        },
        select: { id: true },
      });

      if (autoMemoryForEntry.length > 0) {
        await tx.memoryItem.deleteMany({
          where: {
            id: {
              in: autoMemoryForEntry.map((item) => item.id),
            },
          },
        });
      }

      const uniqueProposals = result.memory_proposals.filter((proposal, index, list) => {
        const key = normalizeMemoryText(proposal.memory_text);
        return list.findIndex((item) => normalizeMemoryText(item.memory_text) === key) === index;
      });

      const existingMemory = await tx.memoryItem.findMany({
        where: { userId: user.id },
        select: {
          id: true,
          memoryText: true,
          confidence: true,
          stability: true,
          sensitivity: true,
          status: true,
        },
      });

      const existingByKey = new Map<string, (typeof existingMemory)[number]>();
      for (const item of existingMemory) {
        const key = normalizeMemoryText(item.memoryText);
        if (!key) {
          continue;
        }

        const current = existingByKey.get(key);
        if (!current || (current.status !== "ACTIVE" && item.status === "ACTIVE")) {
          existingByKey.set(key, item);
        }
      }

      for (const proposal of uniqueProposals) {
        const key = normalizeMemoryText(proposal.memory_text);
        const matched = existingByKey.get(key);

        if (matched) {
          await tx.memoryItem.update({
            where: { id: matched.id },
            data: {
              confidence: Math.max(matched.confidence, proposal.confidence),
              stability: Math.max(matched.stability, proposal.stability),
              sensitivity: mergeSensitivity(matched.sensitivity, proposal.sensitivity),
              status: "ACTIVE",
              archivedAt: null,
            },
          });

          const hasEvidence = await tx.memoryEvidenceLink.findFirst({
            where: {
              memoryItemId: matched.id,
              entryId: id,
              quote: proposal.evidence_quote,
            },
            select: { id: true },
          });

          if (!hasEvidence) {
            await tx.memoryEvidenceLink.create({
              data: {
                memoryItemId: matched.id,
                entryId: id,
                quote: proposal.evidence_quote,
              },
            });
          }
          continue;
        }

        const created = await tx.memoryItem.create({
          data: {
            userId: user.id,
            memoryText: proposal.memory_text,
            confidence: proposal.confidence,
            stability: proposal.stability,
            sensitivity: proposal.sensitivity,
            status: "ACTIVE",
            sourceMode: "AUTO",
            evidenceLinks: {
              create: {
                entryId: id,
                quote: proposal.evidence_quote,
              },
            },
          },
        });
        existingByKey.set(key, {
          id: created.id,
          memoryText: created.memoryText,
          confidence: created.confidence,
          stability: created.stability,
          sensitivity: created.sensitivity,
          status: created.status,
        });
      }

      await tx.memoryProposal.updateMany({
        where: { userId: user.id, entryId: id, status: ProposalStatus.PENDING },
        data: { status: ProposalStatus.APPLIED },
      });
    });

    const detail = await getEntryDetail(user.id, id);
    return jsonOk(entryDetailSchema, detail);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid analyze payload", 422, error.flatten());
    }

    const message = error instanceof Error ? error.message : "Failed to analyze entry";
    return jsonError(message, 500);
  }
}
