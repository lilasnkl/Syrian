import { httpRequest } from "@/api/http-client";
import type { BackendUser } from "./mapper";

type AuthPayload = {
  user: BackendUser;
};

type UsersPayload = {
  users: BackendUser[];
};

export async function login(email: string, password: string) {
  return httpRequest<AuthPayload>("/auth/login/", {
    method: "POST",
    body: { email, password },
  });
}

export async function register(input: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: "customer" | "provider";
}) {
  return httpRequest<AuthPayload>("/auth/register/", {
    method: "POST",
    body: input,
  });
}

export async function me() {
  return httpRequest<AuthPayload>("/auth/me/", {
    method: "GET",
  });
}

export async function updateMe(input: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  location?: string;
}) {
  return httpRequest<AuthPayload>("/auth/me/", {
    method: "PATCH",
    body: input,
  });
}

export async function changePassword(input: { current_password: string; new_password: string }) {
  return httpRequest<null>("/auth/me/password/", {
    method: "POST",
    body: input,
  });
}

export async function refresh() {
  return httpRequest<{ access: string }>("/auth/refresh/", {
    method: "POST",
  });
}

export async function logout() {
  return httpRequest<null>("/auth/logout/", {
    method: "POST",
  });
}

export async function listUsers() {
  return httpRequest<UsersPayload>("/auth/users/", {
    method: "GET",
  });
}

export async function updateUserStatus(userId: string | number, input: {
  status: "active" | "blocked";
  blocked_reason?: string;
}) {
  return httpRequest<AuthPayload>(`/auth/users/${userId}/status/`, {
    method: "PATCH",
    body: input,
  });
}
