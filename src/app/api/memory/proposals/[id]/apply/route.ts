import { z } from "zod";
import { ProposalStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/user";
import { getMemoryProposal } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { applyProposalInputSchema, proposalSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const body = applyProposalInputSchema.parse(await request.json().catch(() => ({})));
    const proposal = await prisma.memoryProposal.findFirst({
      where: { id, userId: user.id },
    });

    if (!proposal) {
      return jsonError("Proposal not found", 404);
    }

    const items = JSON.parse(proposal.proposedItemsJson) as Array<{
      memory_text: string;
      confidence: number;
      stability: number;
      sensitivity: "LOW" | "MEDIUM" | "HIGH";
      evidence_quote: string;
    }>;
    const indexes = body.selectedIndexes?.length ? body.selectedIndexes : items.map((_, index) => index);

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        indexes.map((index) =>
          tx.memoryItem.create({
            data: {
              userId: user.id,
              memoryText: items[index].memory_text,
              confidence: items[index].confidence,
              stability: items[index].stability,
              sensitivity: items[index].sensitivity,
              status: "ACTIVE",
              sourceMode: "APPROVAL",
              evidenceLinks: {
                create: {
                  entryId: proposal.entryId,
                  quote: items[index].evidence_quote,
                },
              },
            },
          }),
        ),
      );

      await tx.memoryProposal.update({
        where: { id: proposal.id },
        data: { status: ProposalStatus.APPLIED },
      });
    });

    const updated = await getMemoryProposal(user.id, id);
    return jsonOk(proposalSchema, updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid proposal payload", 422, error.flatten());
    }

    return jsonError("Failed to apply proposal", 500);
  }
}
