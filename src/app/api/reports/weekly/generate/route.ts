import { getCurrentUser } from "@/lib/auth/user";
import { upsertWeeklyReportForWeek } from "@/lib/data/queries";
import { weeklyReportSchema } from "@/lib/schemas/domain";
import { jsonError, jsonOk } from "@/lib/schemas/http";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const weekStartParam = url.searchParams.get("week_start");
  const anchor = weekStartParam ? new Date(weekStartParam) : new Date();

  if (Number.isNaN(anchor.getTime())) {
    return jsonError("Invalid week_start", 422);
  }

  const report = await upsertWeeklyReportForWeek(user.id, anchor);
  if (!report) {
    return jsonError("No entries found for the requested week", 422);
  }

  return jsonOk(weeklyReportSchema, report);
}
