import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import type { UserRole } from "@/types";

export const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const { setLoginModalOpen } = useUIStore();
  const location = useLocation();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      setLoginModalOpen(true);
    }
  }, [isAuthenticated, isHydrated, setLoginModalOpen]);

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (user?.status === "blocked" && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const RequireRole = ({ children, roles }: { children: ReactNode; roles: UserRole[] }) => {
  const { user } = useAuthStore();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
