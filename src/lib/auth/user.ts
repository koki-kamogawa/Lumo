import {
  AdviceIntensity,
  GoalMode,
  MemoryMode,
  ResponseStyle,
} from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function ensureUserSettings(userId: string) {
  return prisma.settings.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      responseStyle: ResponseStyle.EMPATHETIC,
      purpose: GoalMode.SELF_UNDERSTANDING,
      adviceIntensity: AdviceIntensity.MEDIUM,
      memoryMode: MemoryMode.APPROVAL,
      shareByDefault: false,
      reminderFrequency: "weekday",
      reminderTime: "21:00",
    },
  });
}

export async function ensureDemoUser() {
  const user = await prisma.user.upsert({
    where: { email: "demo@lumo.app" },
    update: { name: "Lumo Demo" },
    create: { email: "demo@lumo.app", name: "Lumo Demo" },
  });

  await ensureUserSettings(user.id);

  return user;
}

export async function getCurrentUser() {
  const session = await auth();

  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (user) {
      await ensureUserSettings(user.id);
      return user;
    }
  }

  return ensureDemoUser();
}

