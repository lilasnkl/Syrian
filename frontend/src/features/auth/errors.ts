import { HttpClientError } from "@/api/http-client";

export function extractFirstApiErrorMessage(error: unknown): string | undefined {
  if (!(error instanceof HttpClientError) || typeof error.payload !== "object" || error.payload === null) {
    return undefined;
  }

  const payload = error.payload as {
    error?: {
      details?: Record<string, unknown>;
    };
  };

  const details = payload.error?.details ?? {};
  for (const value of Object.values(details)) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }

    if (Array.isArray(value)) {
      const firstString = value.find((item) => typeof item === "string" && item.trim()) as string | undefined;
      if (firstString) {
        return firstString;
      }
    }
  }

  return undefined;
}
