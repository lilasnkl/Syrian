import type { User } from "@/types";

import { toFrontendRole } from "./role";

export interface BackendUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: "customer" | "provider" | "admin" | "moderator";
  status: "active" | "blocked";
  phone: string;
  location: string;
  created_at: string;
  blocked_reason?: string;
}

function buildDisplayName(user: BackendUser): string {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  if (fullName) {
    return fullName;
  }

  if (user.username && user.username !== user.email) {
    return user.username;
  }

  return user.email.split("@")[0] ?? "User";
}

function buildAvatarSeed(user: BackendUser): string {
  return user.email || user.username || String(user.id);
}

export function mapBackendUserToFrontend(user: BackendUser): User {
  const name = buildDisplayName(user);

  return {
    id: String(user.id),
    name,
    email: user.email,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(buildAvatarSeed(user))}`,
    role: toFrontendRole(user.role),
    phone: user.phone || undefined,
    location: user.location || undefined,
    createdAt: user.created_at.split("T")[0] ?? user.created_at,
    status: user.status,
    blockReason: user.blocked_reason || undefined,
  };
}

export function splitFullName(name: string): { first_name: string; last_name: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { first_name: "", last_name: "" };
  }

  const [first, ...rest] = trimmed.split(/\s+/);
  return {
    first_name: first ?? "",
    last_name: rest.join(" "),
  };
}