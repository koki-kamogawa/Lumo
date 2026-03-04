import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db";
import { transcribeInputSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";
import { transcriber } from "@/lib/services/transcribe";

const transcriptResponseSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  content: z.string(),
  editedContent: z.string().nullable(),
  confidence: z.number().nullable(),
  source: z.string(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const body = transcribeInputSchema.parse(await request.json().catch(() => ({})));
    const entry = await prisma.entry.findFirst({
      where: {
        id,
        userId: user.id,
        deletedAt: null,
      },
      include: {
        transcript: true,
      },
    });

    if (!entry) {
      return jsonError("Entry not found", 404);
    }

    const result = await transcriber.transcribe({
      entryId: id,
      note: entry.note,
      existingTranscript: body.overrideText || entry.transcript?.editedContent || entry.transcript?.content,
    });

    const transcript = await prisma.transcript.upsert({
      where: { entryId: id },
      update: {
        content: result.content,
        source: result.source,
        confidence: result.confidence,
      },
      create: {
        entryId: id,
        content: result.content,
        source: result.source,
        confidence: result.confidence,
      },
    });

    return jsonOk(transcriptResponseSchema, {
      id: transcript.id,
      entryId: transcript.entryId,
      content: transcript.content,
      editedContent: transcript.editedContent,
      confidence: transcript.confidence,
      source: transcript.source,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid transcription payload", 422, error.flatten());
    }

    return jsonError("Failed to transcribe entry", 500);
  }
}

