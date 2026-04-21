import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpRequest } from "@/api/http-client";

function mockSuccessResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, message: "ok", data }),
  } as Response;
}

describe("httpRequest", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    document.cookie = "";
  });

  it("does not force Content-Type for GET requests", async () => {
    fetchMock.mockResolvedValueOnce(mockSuccessResponse({ value: 1 }));

    await httpRequest<{ value: number }>("/auth/me/", { method: "GET" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);

    expect(headers.has("Content-Type")).toBe(false);
    expect(options.credentials).toBe("include");
    expect(options.body).toBeUndefined();
  });

  it("adds JSON and CSRF headers for mutating JSON requests", async () => {
    document.cookie = "csrftoken=test-token";
    fetchMock.mockResolvedValueOnce(mockSuccessResponse({ user: { id: 1 } }));

    await httpRequest("/auth/login/", {
      method: "POST",
      body: { email: "admin@local.syrianservices", password: "Admin12345!" },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(options.headers);

    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-CSRFToken")).toBe("test-token");
    expect(options.credentials).toBe("include");
    expect(typeof options.body).toBe("string");
  });
});
