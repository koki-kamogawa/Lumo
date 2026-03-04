import { getCurrentUser } from "@/lib/auth/user";
import { getEntryDetail } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { entryDetailSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const detail = await getEntryDetail(user.id, id);
    return jsonOk(entryDetailSchema, detail);
  } catch {
    return jsonError("Entry not found", 404);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  const existing = await prisma.entry.findFirst({
    where: {
      id,
      userId: user.id,
      deletedAt: null,
    },
  });

  if (!existing) {
    return jsonError("Entry not found", 404);
  }

  await prisma.$transaction([
    prisma.memoryEvidenceLink.updateMany({
      where: { entryId: id },
      data: { entryId: null },
    }),
    prisma.entry.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);

  return new Response(null, { status: 204 });
}

