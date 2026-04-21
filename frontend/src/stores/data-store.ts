import { create } from "zustand";

import type {
  Bid,
  BidStatus,
  Complaint,
  Conversation,
  Message,
  Notification,
  Provider,
  RequestStatus,
  Review,
  Service,
  ServiceRequest,
  VerificationRequest,
} from "@/types";
import {
  MOCK_COMPLAINTS,
  MOCK_REVIEWS,
} from "@/data/mock-data";
import { HttpClientError } from "@/api/http-client";
import { createConversation, listConversations, listConversationMessages, sendConversationMessage } from "@/features/chat/api";
import { mapConversation, mapMessage } from "@/features/chat/mapper";
import { listNotifications, markAllNotificationsRead as markAllNotificationsReadApi, markNotificationRead as markNotificationReadApi } from "@/features/notifications/api";
import { mapNotification } from "@/features/notifications/mapper";
import {
  acceptBid,
  createBid,
  listBids,
  rejectBid,
  updateBid as updateBidApi,
  withdrawBid,
} from "@/features/bids/api";
import { mapBidToFrontend } from "@/features/bids/mapper";
import { cancelOrder, completeOrder, createOrder, listOrders, transitionOrder, updateOrder } from "@/features/orders/api";
import { mapOrderToRequest } from "@/features/orders/mapper";
import {
  getMyProvider,
  listProviders,
  listVerificationRequests,
  revokeProviderVerification as revokeProviderVerificationApi,
  revokeVerification,
  reviewVerification,
  submitVerification,
  updateMyProvider,
} from "@/features/providers/api";
import { mapProviderProfile, mapVerificationRequest } from "@/features/providers/mapper";
import { createService, deleteService, listMyServices, listServices, updateService as updateServiceApi } from "@/features/services/api";
import { mapServiceListing } from "@/features/services/mapper";
import { useAuthStore } from "@/stores/auth-store";

function normalizeError(error: unknown): string {
  if (error instanceof HttpClientError) {
    return `${error.status}:${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}

function groupServicesByProvider(services: Service[]): Map<string, Service[]> {
  const grouped = new Map<string, Service[]>();
  for (const service of services) {
    const current = grouped.get(service.providerId) ?? [];
    current.push(service);
    grouped.set(service.providerId, current);
  }
  return grouped;
}

function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((left, right) => right.lastMessageAt.localeCompare(left.lastMessageAt));
}

function upsertConversation(conversations: Conversation[], nextConversation: Conversation): Conversation[] {
  const existingIndex = conversations.findIndex((conversation) => conversation.id === nextConversation.id);
  if (existingIndex === -1) {
    return sortConversations([...conversations, nextConversation]);
  }

  const nextConversations = [...conversations];
  nextConversations[existingIndex] = nextConversation;
  return sortConversations(nextConversations);
}

interface DataState {
  requests: ServiceRequest[];
  bids: Bid[];
  notifications: Notification[];
  complaints: Complaint[];
  conversations: Conversation[];
  messages: Message[];
  providers: Provider[];
  verificationRequests: VerificationRequest[];
  reviews: Review[];
  dismissedRequests: { providerId: string; requestId: string }[];
  isHydrated: boolean;
  isSyncing: boolean;

  hydrateMarketplace: () => Promise<void>;

  addRequest: (req: ServiceRequest) => Promise<boolean>;
  addNotification: (notification: Notification) => void;
  updateRequestStatus: (id: string, status: RequestStatus) => Promise<void>;
  updateBidStatus: (bidId: string, status: BidStatus) => Promise<void>;
  addBid: (bid: Bid) => Promise<boolean>;
  updateBid: (bidId: string, data: Partial<Pick<Bid, "amount" | "estimatedDuration" | "message">>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addComplaint: (c: Complaint) => void;
  startConversation: (participantId: string, orderId?: string) => Promise<string>;
  hydrateConversationMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, text: string) => Promise<void>;
  addService: (providerId: string, service: Service) => Promise<void>;
  updateService: (providerId: string, serviceId: string, data: Partial<Service>) => Promise<void>;
  removeService: (providerId: string, serviceId: string) => Promise<void>;
  updateProvider: (providerId: string, data: Partial<Provider>) => Promise<void>;
  addProvider: (provider: Provider) => void;
  updateVerificationStatus: (id: string, status: "approved" | "rejected" | "revoked", rejectionReason?: string) => Promise<void>;
  revokeProviderVerification: (providerId: string) => Promise<void>;
  updateComplaintStatus: (id: string, status: Complaint["status"], response?: string) => void;
  addVerificationRequest: (vr: VerificationRequest, uploadedFiles?: File[]) => Promise<void>;
  addReview: (review: Review) => void;
  deleteBid: (bidId: string) => Promise<void>;
  markRequestCompleted: (id: string) => Promise<void>;
  updateRequest: (id: string, data: Partial<ServiceRequest>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  dismissRequest: (providerId: string, requestId: string) => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  requests: [],
  bids: [],
  notifications: [],
  complaints: [...MOCK_COMPLAINTS],
  conversations: [],
  messages: [],
  providers: [],
  verificationRequests: [],
  reviews: [...MOCK_REVIEWS],
  dismissedRequests: [],
  isHydrated: false,
  isSyncing: false,

  hydrateMarketplace: async () => {
    if (get().isSyncing) {
      return;
    }

    set({ isSyncing: true });

    try {
      const authState = useAuthStore.getState();
      const [providersPayload, servicesPayload] = await Promise.all([listProviders(), listServices()]);

      const mappedServices = servicesPayload.services.map(mapServiceListing);
      const servicesByProvider = groupServicesByProvider(mappedServices);

      let mappedProviders = providersPayload.providers.map((provider) => {
        const providerId = String(provider.id);
        return mapProviderProfile(provider, servicesByProvider.get(providerId) ?? []);
      });

      if (authState.isAuthenticated && authState.user?.role === "provider") {
        try {
          const [myProviderPayload, myServicesPayload] = await Promise.all([getMyProvider(), listMyServices()]);
          const myProvider = mapProviderProfile(
            myProviderPayload.provider,
            myServicesPayload.services.map(mapServiceListing)
          );

          const existingIndex = mappedProviders.findIndex((provider) => provider.id === myProvider.id);
          if (existingIndex >= 0) {
            const next = [...mappedProviders];
            next[existingIndex] = myProvider;
            mappedProviders = next;
          } else {
            mappedProviders = [...mappedProviders, myProvider];
          }
        } catch (error) {
          console.error("hydrate my provider failed", normalizeError(error));
        }
      }

      let mappedRequests: ServiceRequest[] = [];
      let mappedBids: Bid[] = [];
      let mappedVerificationRequests: VerificationRequest[] = [];
      let mappedConversations: Conversation[] = [];
      let mappedNotifications: Notification[] = [];

      if (authState.isAuthenticated) {
        try {
          const [ordersPayload, bidsPayload] = await Promise.all([listOrders(), listBids()]);
          mappedRequests = ordersPayload.orders.map(mapOrderToRequest);
          mappedBids = bidsPayload.bids.map(mapBidToFrontend);
        } catch (error) {
          console.error("hydrate orders/bids failed", normalizeError(error));
        }

        try {
          const verificationPayload = await listVerificationRequests();
          const providerById = new Map(mappedProviders.map((provider) => [provider.id, provider]));
          mappedVerificationRequests = verificationPayload.verifications.map((request) =>
            mapVerificationRequest(request, providerById.get(String(request.provider_id)))
          );
        } catch {
          mappedVerificationRequests = [];
        }

        try {
          const conversationsPayload = await listConversations();
          mappedConversations = conversationsPayload.conversations.map(mapConversation);
        } catch (error) {
          console.error("hydrate conversations failed", normalizeError(error));
          mappedConversations = [];
        }

        try {
          const notificationsPayload = await listNotifications();
          mappedNotifications = notificationsPayload.notifications.map((notification) =>
            mapNotification(notification, authState.user?.id ?? "")
          );
        } catch (error) {
          console.error("hydrate notifications failed", normalizeError(error));
          mappedNotifications = [];
        }
      }

      const conversationIds = new Set(mappedConversations.map((conversation) => conversation.id));

      set({
        providers: mappedProviders,
        requests: mappedRequests,
        bids: mappedBids,
        notifications: mappedNotifications,
        verificationRequests: mappedVerificationRequests,
        conversations: mappedConversations,
        messages: get().messages.filter((message) => conversationIds.has(message.conversationId)),
        isHydrated: true,
        isSyncing: false,
      });
    } catch (error) {
      console.error("hydrate marketplace failed", normalizeError(error));
      set({ isHydrated: true, isSyncing: false });
    }
  },

  addRequest: async (req) => {
    try {
      await createOrder({
        service: req.serviceId ? Number(req.serviceId) : undefined,
        title: req.title,
        description: req.description,
        category: req.backendCategory ?? req.category,
        budget: req.budget,
        location: req.location,
        urgency: req.urgency,
        preferred_time: req.preferredTime,
      });

      await get().hydrateMarketplace();
      return true;
    } catch (error) {
      console.error("add request failed", normalizeError(error));
      return false;
    }
  },

  addNotification: (notification) => set({ notifications: [notification, ...get().notifications] }),

  updateRequestStatus: async (id, status) => {
    const orderId = Number(id);

    try {
      if (status === "cancelled") {
        await cancelOrder(orderId);
      } else if (status === "completed") {
        await completeOrder(orderId);
      } else {
        await transitionOrder(orderId, status);
      }

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("update request status failed", normalizeError(error));
      throw error;
    }
  },

  updateBidStatus: async (bidId, status) => {
    try {
      const numericBidId = Number(bidId);
      if (status === "accepted") {
        await acceptBid(numericBidId);
      } else if (status === "rejected" || status === "declined") {
        await rejectBid(numericBidId);
      } else if (status === "withdrawn") {
        await withdrawBid(numericBidId);
      }

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("update bid status failed", normalizeError(error));
      throw error;
    }
  },

  addBid: async (bid) => {
    try {
      await createBid(Number(bid.requestId), {
        amount: bid.amount,
        message: bid.message,
        estimated_duration: bid.estimatedDuration,
      });

      await get().hydrateMarketplace();
      return true;
    } catch (error) {
      console.error("add bid failed", normalizeError(error));
      return false;
    }
  },

  updateBid: async (bidId, data) => {
    try {
      await updateBidApi(Number(bidId), {
        amount: data.amount,
        estimated_duration: data.estimatedDuration,
        message: data.message,
      });

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("update bid failed", normalizeError(error));
      throw error;
    }
  },

  markNotificationRead: async (id) => {
    try {
      await markNotificationReadApi(Number(id));
      set({ notifications: get().notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)) });
    } catch (error) {
      console.error("mark notification read failed", normalizeError(error));
      throw error;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      const currentUserId = useAuthStore.getState().user?.id;
      await markAllNotificationsReadApi();
      set({
        notifications: get().notifications.map((notification) =>
          !currentUserId || notification.userId === currentUserId ? { ...notification, read: true } : notification
        ),
      });
    } catch (error) {
      console.error("mark all notifications read failed", normalizeError(error));
      throw error;
    }
  },

  addComplaint: (complaint) => set({ complaints: [complaint, ...get().complaints] }),

  startConversation: async (participantId, orderId) => {
    try {
      const payload = await createConversation({
        participant_ids: [Number(participantId)],
        order_id: orderId ? Number(orderId) : undefined,
      });

      const conversation = mapConversation(payload.conversation);
      set((state) => ({
        conversations: upsertConversation(state.conversations, conversation),
      }));
      return conversation.id;
    } catch (error) {
      console.error("start conversation failed", normalizeError(error));
      throw error;
    }
  },

  hydrateConversationMessages: async (conversationId) => {
    try {
      const payload = await listConversationMessages(Number(conversationId));
      const nextMessages = payload.messages.map(mapMessage);
      set((state) => ({
        messages: [...state.messages.filter((message) => message.conversationId !== conversationId), ...nextMessages],
        conversations: state.conversations.map((conversation) =>
          conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
        ),
      }));
    } catch (error) {
      console.error("hydrate conversation messages failed", normalizeError(error));
      throw error;
    }
  },

  sendMessage: async (conversationId, text) => {
    try {
      const payload = await sendConversationMessage(Number(conversationId), { text });
      const message = mapMessage(payload.message);
      set((state) => {
        const existingConversation = state.conversations.find((conversation) => conversation.id === conversationId);
        if (!existingConversation) {
          return {
            messages: [...state.messages.filter((candidate) => candidate.id !== message.id), message],
          };
        }

        return {
          messages: [...state.messages.filter((candidate) => candidate.id !== message.id), message],
          conversations: upsertConversation(state.conversations, {
            ...existingConversation,
            lastMessage: message.text,
            lastMessageAt: message.createdAt,
            unreadCount: 0,
          }),
        };
      });
    } catch (error) {
      console.error("send message failed", normalizeError(error));
      throw error;
    }
  },

  addService: async (_providerId, service) => {
    try {
      await createService({
        title: service.title,
        description: service.description,
        category: service.category,
        price: service.price,
        price_type: service.priceType,
        duration: service.duration,
      });

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("add service failed", normalizeError(error));
      throw error;
    }
  },

  updateService: async (_providerId, serviceId, data) => {
    try {
      await updateServiceApi(Number(serviceId), {
        title: data.title,
        description: data.description,
        category: data.category,
        price: data.price,
        price_type: data.priceType,
        duration: data.duration,
      });

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("update service failed", normalizeError(error));
      throw error;
    }
  },

  removeService: async (_providerId, serviceId) => {
    try {
      await deleteService(Number(serviceId));
      await get().hydrateMarketplace();
    } catch (error) {
      console.error("remove service failed", normalizeError(error));
      throw error;
    }
  },

  updateProvider: async (_providerId, data) => {
    try {
      await updateMyProvider({
        display_name: data.name,
        bio: data.bio,
        category: data.category,
        location: data.location,
        hourly_rate: data.hourlyRate,
        years_experience: data.yearsExperience,
        skills: data.skills,
        availability: data.availability,
        response_time: data.responseTime,
      });

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("update provider failed", normalizeError(error));
      throw error;
    }
  },

  addProvider: (provider) => set({ providers: [...get().providers, provider] }),

  updateVerificationStatus: async (id, status, rejectionReason) => {
    try {
      if (status === "revoked") {
        await revokeVerification(Number(id));
      } else {
        await reviewVerification(Number(id), {
          approve: status === "approved",
          rejection_reason: status === "rejected" ? rejectionReason : undefined,
        });
      }

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("review verification failed", normalizeError(error));
      throw error;
    }
  },

  revokeProviderVerification: async (providerId) => {
    try {
      await revokeProviderVerificationApi(Number(providerId));
      await get().hydrateMarketplace();
    } catch (error) {
      console.error("revoke provider verification failed", normalizeError(error));
      throw error;
    }
  },

  updateComplaintStatus: (id, status, response) =>
    set({
      complaints: get().complaints.map((complaint) =>
        complaint.id === id ? { ...complaint, status, ...(response ? { response } : {}) } : complaint
      ),
    }),

  addVerificationRequest: async (verificationRequest, uploadedFiles = []) => {
    try {
      await submitVerification({
        documents: verificationRequest.documents,
        description: verificationRequest.description,
        files: uploadedFiles,
        years_experience: verificationRequest.yearsExperience,
        service_areas: verificationRequest.serviceAreas,
      });

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("submit verification failed", normalizeError(error));
      throw error;
    }
  },

  addReview: (review) => {
    const reviews = [review, ...get().reviews];
    const providerReviews = reviews.filter((candidate) => candidate.providerId === review.providerId);
    const avgRating =
      Math.round((providerReviews.reduce((sum, candidate) => sum + candidate.rating, 0) / providerReviews.length) * 10) / 10;

    set({
      reviews,
      providers: get().providers.map((provider) =>
        provider.id === review.providerId
          ? { ...provider, rating: avgRating, reviewCount: providerReviews.length }
          : provider
      ),
    });
  },

  deleteBid: async (bidId) => {
    try {
      await withdrawBid(Number(bidId));
      await get().hydrateMarketplace();
    } catch (error) {
      console.error("delete bid failed", normalizeError(error));
      throw error;
    }
  },

  markRequestCompleted: async (id) => {
    try {
      await completeOrder(Number(id));
      await get().hydrateMarketplace();
    } catch (error) {
      console.error("mark request completed failed", normalizeError(error));
      throw error;
    }
  },

  updateRequest: async (id, data) => {
    try {
      await updateOrder(Number(id), {
        title: data.title,
        description: data.description,
        category: data.category,
        budget: data.budget,
        location: data.location,
        urgency: data.urgency,
        preferred_time: data.preferredTime,
      });

      await get().hydrateMarketplace();
    } catch (error) {
      console.error("update request failed", normalizeError(error));
      throw error;
    }
  },

  deleteRequest: async (id) => {
    try {
      await cancelOrder(Number(id));
      await get().hydrateMarketplace();
    } catch (error) {
      console.error("delete request failed", normalizeError(error));
      throw error;
    }
  },

  dismissRequest: (providerId, requestId) =>
    set({ dismissedRequests: [...get().dismissedRequests, { providerId, requestId }] }),
}));
