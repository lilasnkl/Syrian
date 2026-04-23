import { beforeEach, describe, expect, it, vi } from "vitest";

import { recommendProviders } from "./api";

function mockRawResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  } as Response;
}

describe("recommendations api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("auto-detects Arabic text and posts a structured recommendation payload", async () => {
    fetchMock.mockResolvedValueOnce(
      mockRawResponse({
        analysis: {
          service_category: "plumbing",
          provider_type: "plumber",
          likely_issue: "pipe leak",
          urgency: "medium",
          keywords: ["leak"],
          suggested_solution: "Stop using the sink.",
          quick_tips: ["Place a bucket under the leak"],
        },
        top_providers: [],
      })
    );

    await recommendProviders({
      problem_description: "عندي تسريب ماء تحت المغسلة والماء عم ينزل على الأرض",
      user_lat: null,
      user_lng: null,
      budget: null,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe("http://localhost:8000/recommend-providers/");
    expect(options).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          problem_description: "عندي تسريب ماء تحت المغسلة والماء عم ينزل على الأرض",
          language: "ar",
          user_lat: null,
          user_lng: null,
          budget: null,
        }),
      })
    );
  });
});
