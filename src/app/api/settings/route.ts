import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { getSettingsForUser } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { patchSettingsSchema, settingsSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function GET() {
  const user = await getCurrentUser();
  const settings = await getSettingsForUser(user.id);
  return jsonOk(settingsSchema, settings);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  try {
    const body = patchSettingsSchema.parse(await request.json());
    const settings = await prisma.settings.update({
      where: { userId: user.id },
      data: body,
    });

    return jsonOk(settingsSchema, {
      ...settings,
      reminderFrequency: settings.reminderFrequency,
      reminderTime: settings.reminderTime,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid settings payload", 422, error.flatten());
    }

    return jsonError("Failed to update settings", 500);
  }
}
