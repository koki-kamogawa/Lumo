import { z } from "zod";
import { ProposalStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/user";
import { getEntryDetail } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { entryDetailSchema, toneOverrideSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";
import { analyzer } from "@/lib/services/analyze";

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

      if (settings.memoryMode === "AUTO") {
        await Promise.all(
          result.memory_proposals.map((proposal) =>
            tx.memoryItem.create({
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
            }),
          ),
        );

        await tx.memoryProposal.updateMany({
          where: { userId: user.id, entryId: id, status: ProposalStatus.PENDING },
          data: { status: ProposalStatus.APPLIED },
        });
      } else {
        const existing = await tx.memoryProposal.findFirst({
          where: { entryId: id, userId: user.id },
          orderBy: { createdAt: "desc" },
        });

        if (existing) {
          await tx.memoryProposal.update({
            where: { id: existing.id },
            data: {
              proposedItemsJson: JSON.stringify(result.memory_proposals),
              status: ProposalStatus.PENDING,
            },
          });
        } else {
          await tx.memoryProposal.create({
            data: {
              userId: user.id,
              entryId: id,
              proposedItemsJson: JSON.stringify(result.memory_proposals),
              status: ProposalStatus.PENDING,
            },
          });
        }
      }
    });

    const detail = await getEntryDetail(user.id, id);
    return jsonOk(entryDetailSchema, detail);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid analyze payload", 422, error.flatten());
    }

    return jsonError("Failed to analyze entry", 500);
  }
}
