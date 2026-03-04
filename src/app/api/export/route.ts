import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { getEntriesForUser, getMemoryItems, getSettingsForUser, getWeeklyReports } from "@/lib/data/queries";
import { exportInputSchema } from "@/lib/schemas/domain";
import { jsonError } from "@/lib/schemas/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();

  try {
    const body = exportInputSchema.parse(await request.json());
    const [settings, entries, memories, weeklyReports] = await Promise.all([
      getSettingsForUser(user.id),
      getEntriesForUser(user.id),
      getMemoryItems(user.id),
      getWeeklyReports(user.id),
    ]);

    if (body.format === "json") {
      return Response.json(
        {
          settings,
          entries,
          memories,
          weeklyReports,
        },
        {
          headers: {
            "Content-Disposition": 'attachment; filename="lumo-export.json"',
          },
        },
      );
    }

    const markdown = [
      "# Lumo Export",
      "",
      "## Settings",
      `- Response Style: ${settings.responseStyle}`,
      `- Purpose: ${settings.purpose}`,
      `- Memory Mode: ${settings.memoryMode}`,
      "",
      "## Entries",
      ...entries.map((entry) => `- ${entry.title} (${entry.occurredAt}) [${entry.emotions.join(", ")}]`),
      "",
      "## Memory",
      ...memories.map((memory) => `- ${memory.memoryText} (${memory.status})`),
      "",
      "## Weekly Reports",
      ...weeklyReports.map((report) => `- ${report.weekStart} / ${report.shareLine ?? ""}`),
      "",
    ].join("\n");

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="lumo-export.md"',
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return jsonError("Invalid export payload", 422, error.flatten());
    }

    return jsonError("Failed to export data", 500);
  }
}
