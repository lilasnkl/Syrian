import type { UserRole } from "@/types";

export type CanonicalRole = "customer" | "provider" | "admin" | "moderator";

export function toCanonicalRole(role: UserRole): CanonicalRole {
  if (role === "client") {
    return "customer";
  }
  return role;
}

export function toFrontendRole(role: CanonicalRole): UserRole {
  if (role === "customer") {
    return "client";
  }
  if (role === "moderator") {
    return "admin";
  }
  return role;
}
