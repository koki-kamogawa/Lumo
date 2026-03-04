import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { getEntriesForUser } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import {
  createEntryInputSchema,
  entryListItemSchema,
  queryEntriesSchema,
} from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

const entriesResponseSchema = z.array(entryListItemSchema);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const filters = queryEntriesSchema.parse({
    q: url.searchParams.get("q") ?? undefined,
    period: url.searchParams.get("period") ?? undefined,
    emotion: url.searchParams.get("emotion") ?? undefined,
  });

  const entries = await getEntriesForUser(user.id, filters);
  return jsonOk(entriesResponseSchema, entries);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  try {
    const body = createEntryInputSchema.parse(await request.json());
    const entry = await prisma.entry.create({
      data: {
        userId: user.id,
        title: body.title ?? "無題の日記",
        note: body.note ?? null,
        occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date(),
      },
      include: {
        analysis: {
          select: {
            emotionTopJson: true,
          },
        },
      },
    });

    return jsonOk(entryListItemSchema, {
      id: entry.id,
      title: entry.title,
      note: entry.note,
      occurredAt: entry.occurredAt.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      emotions: [],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid entry payload", 422, error.flatten());
    }

    return jsonError("Failed to create entry", 500);
  }
}

