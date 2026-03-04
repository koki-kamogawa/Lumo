import { NextResponse } from "next/server";
import { ZodSchema } from "zod";

export function jsonOk<T>(schema: ZodSchema<T>, data: unknown, init?: ResponseInit) {
  return NextResponse.json(schema.parse(data), init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: message,
      details,
    },
    { status },
  );
}

export function asIso(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
}

