import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { getWeeklyReports } from "@/lib/data/queries";
import { weeklyReportSchema } from "@/lib/schemas/domain";
import { jsonOk } from "@/lib/schemas/http";

const responseSchema = z.array(weeklyReportSchema);

export async function GET() {
  const user = await getCurrentUser();
  const reports = await getWeeklyReports(user.id);
  return jsonOk(responseSchema, reports);
}

