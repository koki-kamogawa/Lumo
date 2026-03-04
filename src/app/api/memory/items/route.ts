import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/user";
import { getMemoryItems } from "@/lib/data/queries";
import { memoryItemSchema } from "@/lib/schemas/domain";
import { jsonOk } from "@/lib/schemas/http";

const responseSchema = z.array(memoryItemSchema);

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const items = await getMemoryItems(user.id, status);
  return jsonOk(responseSchema, items);
}

