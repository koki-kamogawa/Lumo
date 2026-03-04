import { ProposalStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/user";
import { getMemoryProposal } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { proposalSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  const proposal = await prisma.memoryProposal.findFirst({
    where: { id, userId: user.id },
  });

  if (!proposal) {
    return jsonError("Proposal not found", 404);
  }

  await prisma.memoryProposal.update({
    where: { id: proposal.id },
    data: { status: ProposalStatus.DISMISSED },
  });

  const updated = await getMemoryProposal(user.id, id);
  return jsonOk(proposalSchema, updated);
}

