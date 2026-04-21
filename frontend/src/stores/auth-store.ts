import { create } from "zustand";

import { HttpClientError } from "@/api/http-client";
import { MOCK_USERS } from "@/data/mock-data";
import type { User } from "@/types";

import { changePassword as changePasswordApi, listUsers, login, logout, me, refresh, register, updateMe, updateUserStatus as updateUserStatusApi } from "@/features/auth/api";
import { mapBackendUserToFrontend, splitFullName } from "@/features/auth/mapper";
import { toCanonicalRole } from "@/features/auth/role";

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  role?: "client" | "provider";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  isLoading: boolean;
  blockedNotice: { reason?: string } | null;
  users: User[];
  bootstrapSession: () => Promise<void>;
  hydrateUsers: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
  register: (input: RegisterInput) => Promise<boolean>;
  loginAsRole: (role: "client" | "provider" | "admin") => void;
  registerUser: (user: User) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateUserStatus: (userId: string, status: "active" | "blocked", blockReason?: string) => Promise<void>;
  clearBlockedNotice: () => void;
}

function normalizeError(error: unknown): string {
  if (error instanceof HttpClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}

function getApiErrorDetails(error: unknown): { code?: string; details?: Record<string, unknown> } {
  if (!(error instanceof HttpClientError) || typeof error.payload !== "object" || error.payload === null) {
    return {};
  }

  const payload = error.payload as {
    error?: {
      code?: string;
      details?: Record<string, unknown>;
    };
  };

  return {
    code: payload.error?.code,
    details: payload.error?.details,
  };
}

function syncUserInCollection(users: User[], user: User): User[] {
  const exists = users.some((candidate) => candidate.id === user.id);
  if (!exists) {
    return users;
  }

  return users.map((candidate) => (candidate.id === user.id ? { ...candidate, ...user } : candidate));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  isLoading: false,
  blockedNotice: null,
  users: [...MOCK_USERS],

  bootstrapSession: async () => {
    if (get().isLoading) {
      return;
    }

    set({ isLoading: true });
    try {
      const payload = await me();
      const mapped = mapBackendUserToFrontend(payload.user);
      set((state) => ({
        user: mapped,
        isAuthenticated: true,
        isHydrated: true,
        isLoading: false,
        blockedNotice: null,
        users: syncUserInCollection(state.users, mapped),
      }));
    } catch {
      set({ user: null, isAuthenticated: false, isHydrated: true, isLoading: false, blockedNotice: null });
    }
  },

  hydrateUsers: async () => {
    const current = get().user;
    if (!current || (current.role !== "admin" && current.role !== "moderator")) {
      return;
    }

    try {
      const payload = await listUsers();
      set({ users: payload.users.map(mapBackendUserToFrontend) });
    } catch (error) {
      console.error("hydrate users failed", normalizeError(error));
      throw error;
    }
  },

  login: async (email, password) => {
    try {
      const payload = await login(email, password);
      const mapped = mapBackendUserToFrontend(payload.user);
      set((state) => ({
        user: mapped,
        isAuthenticated: true,
        isHydrated: true,
        blockedNotice: null,
        users: syncUserInCollection(state.users, mapped),
      }));
      return true;
    } catch (error) {
      console.error("login failed", normalizeError(error));
      const { code, details } = getApiErrorDetails(error);
      const blockedReason = typeof details?.blocked_reason === "string" ? details.blocked_reason : undefined;
      set({
        user: null,
        isAuthenticated: false,
        isHydrated: true,
        blockedNotice: code === "account_blocked" ? { reason: blockedReason || undefined } : null,
      });
      return false;
    }
  },

  register: async (input) => {
    try {
      const { first_name, last_name } = splitFullName(input.name ?? "");
      const payload = await register({
        email: input.email,
        password: input.password,
        first_name,
        last_name,
        role: input.role ? toCanonicalRole(input.role) : "customer",
      });
      const mapped = mapBackendUserToFrontend(payload.user);
      set((state) => ({
        user: mapped,
        isAuthenticated: true,
        isHydrated: true,
        blockedNotice: null,
        users: syncUserInCollection(state.users, mapped),
      }));
      return true;
    } catch (error) {
      console.error("register failed", normalizeError(error));
      return false;
    }
  },

  logout: async () => {
    try {
      await logout();
    } catch (error) {
      console.error("logout failed", normalizeError(error));
    } finally {
      set({ user: null, isAuthenticated: false, isHydrated: true, blockedNotice: null });
    }
  },

  refresh: async () => {
    try {
      await refresh();
      const payload = await me();
      const mapped = mapBackendUserToFrontend(payload.user);
      set((state) => ({
        user: mapped,
        isAuthenticated: true,
        isHydrated: true,
        blockedNotice: null,
        users: syncUserInCollection(state.users, mapped),
      }));
      return true;
    } catch (error) {
      console.error("refresh failed", normalizeError(error));
      const { code, details } = getApiErrorDetails(error);
      const blockedReason = typeof details?.blocked_reason === "string" ? details.blocked_reason : undefined;
      set({
        user: null,
        isAuthenticated: false,
        isHydrated: true,
        blockedNotice: code === "account_blocked" ? { reason: blockedReason || undefined } : null,
      });
      return false;
    }
  },

  // Temporary compatibility for legacy demos until all admin/account flows are server-backed.
  loginAsRole: (role) => {
    const user = get().users.find((candidate) => candidate.role === role);
    if (user) {
      set({ user, isAuthenticated: true, isHydrated: true });
    }
  },

  // Temporary compatibility helper used by legacy screens.
  registerUser: async (user) => {
    set({ user, isAuthenticated: true, isHydrated: true });
  },

  updateUser: async (data) => {
    const current = get().user;
    if (!current) {
      return;
    }

    const nextName = data.name ?? current.name;
    const split = splitFullName(nextName);

    const payload = {
      first_name: split.first_name,
      last_name: split.last_name,
      phone: data.phone ?? current.phone,
      location: data.location ?? current.location,
    };

    try {
      const updated = await updateMe(payload);
      const mapped = mapBackendUserToFrontend(updated.user);
      set((state) => ({
        user: mapped,
        isAuthenticated: true,
        users: syncUserInCollection(state.users, mapped),
      }));
    } catch (error) {
      console.error("profile update failed", normalizeError(error));
      throw error;
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      await changePasswordApi({
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (error) {
      console.error("change password failed", normalizeError(error));
      throw error;
    }
  },

  updateUserStatus: async (userId, status, blockReason) => {
    try {
      const payload = await updateUserStatusApi(userId, {
        status,
        blocked_reason: status === "blocked" ? blockReason : undefined,
      });
      const mapped = mapBackendUserToFrontend(payload.user);
      set((state) => ({
        users: syncUserInCollection(state.users, mapped),
        user: state.user?.id === mapped.id ? mapped : state.user,
      }));
    } catch (error) {
      console.error("update user status failed", normalizeError(error));
      throw error;
    }
  },

  clearBlockedNotice: () => set({ blockedNotice: null }),
}));
