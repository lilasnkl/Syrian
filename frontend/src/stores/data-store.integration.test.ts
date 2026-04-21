import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/stores/auth-store";
import { useDataStore } from "@/stores/data-store";

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

describe("data store integration", () => {
  const fetchMock = vi.fn();
  const defaultAuthUsers = useAuthStore.getState().users;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);

    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isHydrated: true,
      isLoading: false,
      users: [...defaultAuthUsers],
    });

    useDataStore.setState({
      requests: [],
      bids: [],
      notifications: [],
      conversations: [],
      messages: [],
      providers: [],
      verificationRequests: [],
      dismissedRequests: [],
      isHydrated: false,
      isSyncing: false,
    });
  });

  it("hydrates providers and service listings for anonymous users", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockSuccess({
          providers: [
            {
              id: 1,
              user_id: 11,
              display_name: "Provider One",
              bio: "Skilled provider",
              category: "plumbing",
              location: "Damascus",
              hourly_rate: "40.00",
              years_experience: 6,
              is_verified: true,
              skills: ["Pipes"],
              availability: "Mon-Fri",
              response_time: "<1 hour",
              rating: "4.8",
              review_count: 12,
              completed_jobs: 28,
              created_at: "2026-03-10T10:00:00Z",
              updated_at: "2026-03-10T10:00:00Z",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          services: [
            {
              id: 101,
              provider_id: 1,
              provider_name: "Provider One",
              title: "Leak Repair",
              description: "Fast leak fixes",
              category: "plumbing",
              price: "55.00",
              price_type: "fixed",
              duration: "2h",
              is_active: true,
              created_at: "2026-03-10T10:00:00Z",
              updated_at: "2026-03-10T10:00:00Z",
            },
          ],
        })
      );

    await useDataStore.getState().hydrateMarketplace();

    const state = useDataStore.getState();
    expect(state.isHydrated).toBe(true);
    expect(state.providers).toHaveLength(1);
    expect(state.providers[0]?.services).toHaveLength(1);
    expect(state.requests).toHaveLength(0);
    expect(state.bids).toHaveLength(0);
  });

  it("hydrates orders, bids, and verification data for authenticated provider", async () => {
    useAuthStore.setState({
      isAuthenticated: true,
      user: {
        id: "22",
        name: "Provider User",
        email: "provider@example.com",
        avatar: "https://example.com/avatar.png",
        role: "provider",
        createdAt: "2026-03-01",
      },
    });

    fetchMock
      .mockResolvedValueOnce(
        mockSuccess({
          providers: [
            {
              id: 2,
              user_id: 22,
              display_name: "Provider User",
              bio: "Bio",
              category: "cleaning",
              location: "Homs",
              hourly_rate: "25.00",
              years_experience: 3,
              is_verified: false,
              skills: [],
              availability: "Daily",
              response_time: "1h",
              rating: "4.2",
              review_count: 3,
              completed_jobs: 9,
              created_at: "2026-03-10T10:00:00Z",
              updated_at: "2026-03-10T10:00:00Z",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          services: [],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          provider: {
            id: 2,
            user_id: 22,
            display_name: "Provider User",
            bio: "Bio",
            category: "cleaning",
            location: "Homs",
            hourly_rate: "25.00",
            years_experience: 3,
            is_verified: false,
            skills: ["Deep clean"],
            availability: "Daily",
            response_time: "1h",
            rating: "4.2",
            review_count: 3,
            completed_jobs: 9,
            created_at: "2026-03-10T10:00:00Z",
            updated_at: "2026-03-10T10:00:00Z",
          },
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          services: [
            {
              id: 201,
              provider_id: 2,
              provider_name: "Provider User",
              title: "House Cleaning",
              description: "Detailed cleaning",
              category: "cleaning",
              price: "30.00",
              price_type: "hourly",
              duration: "3h",
              is_active: true,
              created_at: "2026-03-11T10:00:00Z",
              updated_at: "2026-03-11T10:00:00Z",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          orders: [
            {
              id: 301,
              customer_id: 99,
              customer_name: "Customer A",
              service: null,
              title: "Cleaning request",
              description: "Need full apartment cleaning",
              category: "cleaning",
              budget: "120.00",
              location: "Damascus",
              urgency: "medium",
              preferred_time: "Tomorrow",
              status: "open",
              awarded_provider_id: null,
              bids_count: 1,
              created_at: "2026-03-12T10:00:00Z",
              updated_at: "2026-03-12T10:00:00Z",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          bids: [
            {
              id: 401,
              order_id: 301,
              order_title: "Cleaning request",
              provider_id: 2,
              provider_name: "Provider User",
              provider_rating: "4.2",
              amount: "115.00",
              message: "Can do it",
              estimated_duration: "4h",
              status: "pending",
              created_at: "2026-03-12T11:00:00Z",
              updated_at: "2026-03-12T11:00:00Z",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          verifications: [
            {
              id: 501,
              provider_id: 2,
              provider_name: "Provider User",
              provider_category: "cleaning",
              documents: ["license.pdf"],
              description: "Verification package",
              status: "pending",
              rejection_reason: "",
              submitted_at: "2026-03-13T10:00:00Z",
              reviewed_at: null,
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          conversations: [
            {
              id: 601,
              order: null,
              participant_ids: [22, 99],
              participants: [
                { id: 22, role: "provider", name: "Provider User", avatar_url: "" },
                { id: 99, role: "customer", name: "Customer A", avatar_url: "" },
              ],
              last_message: "Hello",
              last_message_at: "2026-03-13T11:00:00Z",
              unread_count: 1,
              created_at: "2026-03-13T10:00:00Z",
              updated_at: "2026-03-13T11:00:00Z",
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        mockSuccess({
          notifications: [
            {
              id: 701,
              type: "message",
              title: "New message",
              description: "Hello",
              link: "/chat?conversation=601",
              is_read: false,
              created_at: "2026-03-13T11:05:00Z",
            },
          ],
        })
      );

    await useDataStore.getState().hydrateMarketplace();

    const state = useDataStore.getState();
    expect(state.providers[0]?.services).toHaveLength(1);
    expect(state.requests[0]?.bidsCount).toBe(1);
    expect(state.bids[0]?.requestTitle).toBe("Cleaning request");
    expect(state.verificationRequests[0]?.providerName).toBe("Provider User");
    expect(state.conversations[0]?.lastMessage).toBe("Hello");
    expect(state.notifications[0]?.title).toBe("New message");
  });

  it("starts a conversation and stores the returned thread", async () => {
    fetchMock.mockResolvedValueOnce(
      mockSuccess(
        {
          conversation: {
            id: 700,
            order: null,
            participant_ids: [10, 20],
            participants: [
              { id: 10, role: "customer", name: "Customer", avatar_url: "" },
              { id: 20, role: "provider", name: "Provider", avatar_url: "" },
            ],
            last_message: "",
            last_message_at: "2026-03-20T10:00:00Z",
            unread_count: 0,
            created_at: "2026-03-20T10:00:00Z",
            updated_at: "2026-03-20T10:00:00Z",
          },
        },
        201
      )
    );

    const conversationId = await useDataStore.getState().startConversation("20");

    expect(conversationId).toBe("700");
    expect(useDataStore.getState().conversations[0]?.id).toBe("700");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/chat/conversations/"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends a chat message and updates the conversation preview", async () => {
    useDataStore.setState({
      conversations: [
        {
          id: "700",
          participants: [
            { id: "10", name: "Customer", avatar: "https://example.com/customer.png" },
            { id: "20", name: "Provider", avatar: "https://example.com/provider.png" },
          ],
          lastMessage: "",
          lastMessageAt: "2026-03-20T10:00:00Z",
          unreadCount: 0,
        },
      ],
      messages: [],
    });

    fetchMock.mockResolvedValueOnce(
      mockSuccess(
        {
          message: {
            id: 800,
            conversation: 700,
            sender_id: 10,
            text: "Hello from chat",
            created_at: "2026-03-20T11:00:00Z",
          },
        },
        201
      )
    );

    await useDataStore.getState().sendMessage("700", "Hello from chat");

    const state = useDataStore.getState();
    expect(state.messages[0]?.text).toBe("Hello from chat");
    expect(state.conversations[0]?.lastMessage).toBe("Hello from chat");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/chat/conversations/700/messages/"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("marks a notification read through the backend and updates local state", async () => {
    useDataStore.setState({
      notifications: [
        {
          id: "900",
          userId: "22",
          type: "message",
          title: "Unread",
          description: "Unread notification",
          read: false,
          createdAt: "2026-03-20T10:00:00Z",
        },
      ],
    });

    fetchMock.mockResolvedValueOnce(
      mockSuccess({
        notification: {
          id: 900,
          type: "message",
          title: "Unread",
          description: "Unread notification",
          link: "",
          is_read: true,
          created_at: "2026-03-20T10:00:00Z",
        },
      })
    );

    await useDataStore.getState().markNotificationRead("900");

    expect(useDataStore.getState().notifications[0]?.read).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/notifications/900/read/"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("marks all notifications read through the backend and updates local state", async () => {
    useDataStore.setState({
      notifications: [
        {
          id: "901",
          userId: "22",
          type: "system",
          title: "One",
          description: "Notification one",
          read: false,
          createdAt: "2026-03-20T10:00:00Z",
        },
        {
          id: "902",
          userId: "22",
          type: "bid",
          title: "Two",
          description: "Notification two",
          read: false,
          createdAt: "2026-03-20T11:00:00Z",
        },
      ],
    });

    fetchMock.mockResolvedValueOnce(mockSuccess(null));

    await useDataStore.getState().markAllNotificationsRead();

    expect(useDataStore.getState().notifications.every((notification) => notification.read)).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/notifications/read-all/"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns false when backend rejects duplicate provider bid", async () => {
    fetchMock.mockResolvedValueOnce(mockError("business_rule_violation", "duplicate_bid", 409));

    const added = await useDataStore.getState().addBid({
      id: "b-1",
      requestId: "301",
      requestTitle: "Duplicate request",
      providerId: "2",
      providerName: "Provider",
      providerAvatar: "https://example.com/avatar.png",
      providerRating: 4,
      amount: 50,
      message: "Duplicate",
      estimatedDuration: "2h",
      status: "pending",
      createdAt: "2026-03-10",
    });

    expect(added).toBe(false);
  });

  it("accept bid action triggers backend accept endpoint then store re-hydration", async () => {
    fetchMock
      .mockResolvedValueOnce(mockSuccess({ bid: { id: 1 } }))
      .mockResolvedValueOnce(mockSuccess({ providers: [] }))
      .mockResolvedValueOnce(mockSuccess({ services: [] }));

    await useDataStore.getState().updateBidStatus("1", "accepted");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/bids/1/accept/"),
      expect.objectContaining({ method: "POST" })
    );
    expect(useDataStore.getState().isHydrated).toBe(true);
  });

  it("uses backend service category when creating a direct service request", async () => {
    fetchMock
      .mockResolvedValueOnce(mockSuccess({ order: { id: 1 } }, 201))
      .mockResolvedValueOnce(mockSuccess({ providers: [] }))
      .mockResolvedValueOnce(mockSuccess({ services: [] }));

    const created = await useDataStore.getState().addRequest({
      id: "r-1",
      clientId: "10",
      clientName: "Customer",
      title: "Direct request",
      description: "Need this exact service",
      category: "cleaning",
      backendCategory: "home_services",
      budget: 100,
      location: "Damascus",
      status: "open",
      urgency: "medium",
      createdAt: "2026-03-10",
      bidsCount: 0,
      serviceId: "200",
    });

    expect(created).toBe(true);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/orders/"),
      expect.objectContaining({ method: "POST" })
    );

    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = JSON.parse(String(firstCallOptions?.body ?? "{}"));
    expect(payload).toMatchObject({
      service: 200,
      category: "home_services",
    });
  });

  it("updates a provider service through the backend and rehydrates marketplace", async () => {
    fetchMock
      .mockResolvedValueOnce(mockSuccess({ service: { id: 200 } }))
      .mockResolvedValueOnce(mockSuccess({ providers: [] }))
      .mockResolvedValueOnce(mockSuccess({ services: [] }));

    await useDataStore.getState().updateService("2", "200", {
      title: "Updated service",
      description: "Updated description",
      category: "plumbing",
      price: 80,
      priceType: "fixed",
      duration: "3h",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/services/200/"),
      expect.objectContaining({ method: "PATCH" })
    );

    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    const payload = JSON.parse(String(firstCallOptions?.body ?? "{}"));
    expect(payload).toMatchObject({
      title: "Updated service",
      description: "Updated description",
      category: "plumbing",
      price: 80,
      price_type: "fixed",
      duration: "3h",
    });
    expect(useDataStore.getState().isHydrated).toBe(true);
  });

  it("revokes provider verification through the backend and rehydrates marketplace", async () => {
    fetchMock
      .mockResolvedValueOnce(mockSuccess({ verification: { id: 10 } }))
      .mockResolvedValueOnce(mockSuccess({ providers: [] }))
      .mockResolvedValueOnce(mockSuccess({ services: [] }));

    await useDataStore.getState().revokeProviderVerification("5");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/providers/5/verification/revoke/"),
      expect.objectContaining({ method: "POST" })
    );
    expect(useDataStore.getState().isHydrated).toBe(true);
  });

  it("submits verification details and files through multipart form data", async () => {
    fetchMock
      .mockResolvedValueOnce(mockSuccess({ verification: { id: 12 } }, 201))
      .mockResolvedValueOnce(mockSuccess({ providers: [] }))
      .mockResolvedValueOnce(mockSuccess({ services: [] }));

    const uploadedFile = new File(["verification-body"], "evidence.pdf", { type: "application/pdf" });

    await useDataStore.getState().addVerificationRequest(
      {
        id: "vr-1",
        providerId: "2",
        providerName: "Provider User",
        providerAvatar: "https://example.com/avatar.png",
        category: "cleaning",
        documents: ["license.pdf"],
        files: [{ name: "evidence.pdf", type: "application/pdf", size: uploadedFile.size }],
        description: "Verified profile",
        status: "pending",
        submittedAt: "2026-03-20",
        yearsExperience: 8,
        serviceAreas: ["Damascus", "Homs"],
      },
      [uploadedFile]
    );

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/providers/me/verification/"),
      expect.objectContaining({ method: "POST" })
    );

    const firstCallOptions = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(firstCallOptions?.body).toBeInstanceOf(FormData);
    const formData = firstCallOptions?.body as FormData;
    expect(formData.getAll("documents")).toEqual(["license.pdf"]);
    expect(formData.getAll("service_areas")).toEqual(["Damascus", "Homs"]);
    expect(formData.get("years_experience")).toBe("8");
    expect(formData.getAll("files")).toHaveLength(1);
  });
});
