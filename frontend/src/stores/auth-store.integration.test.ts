import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";

function mockSuccess(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ success: true, message: "ok", data }),
  } as Response;
}

function mockError(type = "business_rule_violation", code = "error", status = 409): Response {
  return {
    ok: false,
    status,
    json: async () => ({
      success: false,
      error: {
        type,
        code,
        details: {},
      },
    }),
  } as Response;
}

describe("auth store integration", () => {
  const fetchMock = vi.fn();
  const defaultUsers = useAuthStore.getState().users;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isHydrated: false,
      isLoading: false,
      blockedNotice: null,
      users: [...defaultUsers],
    });
  });

  it("bootstraps session from /auth/me and maps backend customer role to frontend client", async () => {
    fetchMock.mockResolvedValueOnce(
      mockSuccess({
        user: {
          id: 10,
          email: "customer@example.com",
          username: "customer@example.com",
          first_name: "Sam",
          last_name: "Client",
          role: "customer",
          status: "active",
          blocked_reason: "",
          phone: "",
          location: "Aleppo",
          created_at: "2026-03-20T10:00:00Z",
        },
      })
    );

    await useAuthStore.getState().bootstrapSession();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.isHydrated).toBe(true);
    expect(state.user?.role).toBe("client");
    expect(state.user?.name).toBe("Sam Client");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/me/"),
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns false on invalid login and keeps unauthenticated state", async () => {
    fetchMock.mockResolvedValueOnce(mockError("business_rule_violation", "invalid_credentials", 409));

    const loggedIn = await useAuthStore.getState().login("x@example.com", "bad-password");

    expect(loggedIn).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("stores blocked notice reason when login is rejected for blocked account", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        error: {
          type: "business_rule_violation",
          code: "account_blocked",
          details: {
            blocked_reason: "Abusive conduct",
          },
        },
      }),
    } as Response);

    const loggedIn = await useAuthStore.getState().login("blocked@example.com", "StrongPass123");

    expect(loggedIn).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().blockedNotice?.reason).toBe("Abusive conduct");
  });

  it("changes password through the backend endpoint", async () => {
    fetchMock.mockResolvedValueOnce(mockSuccess(null));

    await useAuthStore.getState().changePassword("StrongPass123", "NewStrongPass456");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/me/password/"),
      expect.objectContaining({ method: "POST" })
    );
  });
});
