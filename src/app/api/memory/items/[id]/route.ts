import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { getMemoryItems } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { memoryItemSchema, patchMemoryItemSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const items = await getMemoryItems(user.id);
  const item = items.find((value) => value.id === id);

  if (!item) {
    return jsonError("Memory item not found", 404);
  }

  return jsonOk(memoryItemSchema, item);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const body = patchMemoryItemSchema.parse(await request.json());
    const existing = await prisma.memoryItem.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return jsonError("Memory item not found", 404);
    }

    const item = await prisma.memoryItem.update({
      where: { id },
      data: {
        memoryText: body.memoryText,
        category: body.category === undefined ? undefined : body.category,
        status: body.status,
        sensitivity: body.sensitivity,
        archivedAt: body.status === "ARCHIVED" ? new Date() : body.status === "ACTIVE" ? null : undefined,
      },
      include: {
        evidenceLinks: {
          include: {
            entry: {
              select: { title: true },
            },
          },
        },
      },
    });

    return jsonOk(memoryItemSchema, {
      id: item.id,
      userId: item.userId,
      category: item.category,
      memoryText: item.memoryText,
      confidence: item.confidence,
      stability: item.stability,
      sensitivity: item.sensitivity,
      status: item.status,
      sourceMode: item.sourceMode,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      archivedAt: item.archivedAt?.toISOString() ?? null,
      evidenceLinks: item.evidenceLinks.map((link) => ({
        id: link.id,
        quote: link.quote,
        entryId: link.entryId ?? null,
        entryTitle: link.entry?.title ?? null,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid memory payload", 422, error.flatten());
    }

    return jsonError("Failed to update memory item", 500);
  }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  const item = await prisma.memoryItem.findFirst({
    where: { id, userId: user.id },
  });

  if (!item) {
    return jsonError("Memory item not found", 404);
  }

  await prisma.memoryItem.delete({
    where: { id },
  });

  return new Response(null, { status: 204 });
}
