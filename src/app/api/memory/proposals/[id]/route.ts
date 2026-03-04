import { getCurrentUser } from "@/lib/auth/user";
import { getMemoryProposal } from "@/lib/data/queries";
import { proposalSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const proposal = await getMemoryProposal(user.id, id);
    return jsonOk(proposalSchema, proposal);
  } catch {
    return jsonError("Proposal not found", 404);
  }
}

