import { beforeEach, describe, expect, it, vi } from "vitest";

import { listProviders } from "./api";

function mockSuccessResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, message: "ok", data }),
  } as Response;
}

describe("providers api", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends min_rating when rating filter is provided", async () => {
    fetchMock.mockResolvedValueOnce(mockSuccessResponse({ providers: [] }));

    await listProviders({
      category: "plumbing",
      minRating: 4.5,
      verified: true,
      search: "sam",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toContain("/providers/?");
    expect(url).toContain("category=plumbing");
    expect(url).toContain("min_rating=4.5");
    expect(url).toContain("verified=true");
    expect(url).toContain("search=sam");
    expect(options).toEqual(expect.objectContaining({ method: "GET" }));
  });
});
