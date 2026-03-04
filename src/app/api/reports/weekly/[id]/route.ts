import { getCurrentUser } from "@/lib/auth/user";
import { getWeeklyReport } from "@/lib/data/queries";
import { weeklyReportSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await context.params;

  try {
    const report = await getWeeklyReport(user.id, id);
    return jsonOk(weeklyReportSchema, report);
  } catch {
    return jsonError("Weekly report not found", 404);
  }
}

