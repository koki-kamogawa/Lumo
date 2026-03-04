import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { MAX_AUDIO_DURATION_SECONDS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/schemas/http";
import { audioStorage } from "@/lib/services/storage";

const audioResponseSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  durationSec: z.number(),
  mimeType: z.string(),
  filePath: z.string(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;
  const formData = await request.formData();

  const durationValue = Number(formData.get("durationSec"));
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Audio file is required", 422);
  }

  if (!Number.isFinite(durationValue) || durationValue > MAX_AUDIO_DURATION_SECONDS) {
    return jsonError("Audio must be 5 minutes or less", 422);
  }

  const entry = await prisma.entry.findFirst({
    where: {
      id,
      userId: user.id,
      deletedAt: null,
    },
  });

  if (!entry) {
    return jsonError("Entry not found", 404);
  }

  const stored = await audioStorage.save(id, file);
  const audio = await prisma.entryAudio.upsert({
    where: { entryId: id },
    update: {
      storageKey: stored.storageKey,
      filePath: stored.publicPath,
      mimeType: file.type || "audio/webm",
      durationSec: durationValue,
    },
    create: {
      entryId: id,
      storageKey: stored.storageKey,
      filePath: stored.publicPath,
      mimeType: file.type || "audio/webm",
      durationSec: durationValue,
    },
  });

  return jsonOk(audioResponseSchema, {
    id: audio.id,
    entryId: audio.entryId,
    durationSec: audio.durationSec,
    mimeType: audio.mimeType,
    filePath: audio.filePath,
  });
}

