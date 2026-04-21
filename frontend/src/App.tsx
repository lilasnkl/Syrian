import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { LoginRequiredModal } from "@/components/LoginRequiredModal";
import { BlockedAccountNotice } from "@/components/BlockedAccountNotice";
import { RequireAuth, RequireRole } from "@/components/RouteGuards";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { Suspense, useEffect } from "react";
import { queryClient } from "@/app/query-client";
import { appRoutes, type AppRouteConfig } from "@/routes/route-config";
import { useAuthStore } from "@/stores/auth-store";
import { useDataStore } from "@/stores/data-store";

const Loading = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

function wrapWithGuards(route: AppRouteConfig) {
  let element = route.element;

  if (route.roles && route.roles.length > 0) {
    element = <RequireRole roles={route.roles}>{element}</RequireRole>;
  }

  if (route.requiresAuth) {
    element = <RequireAuth>{element}</RequireAuth>;
  }

  return element;
}

const App = () => {
  const bootstrapSession = useAuthStore((state) => state.bootstrapSession);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hydrateMarketplace = useDataStore((state) => state.hydrateMarketplace);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    void hydrateMarketplace();
  }, [hydrateMarketplace, isAuthenticated, isHydrated, user?.id]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LoginRequiredModal />
            <BlockedAccountNotice />
            <AnimatePresence mode="wait">
              <Suspense fallback={<Loading />}>
                {!isHydrated ? (
                  <Loading />
                ) : (
                  <Routes>
                    <Route element={<AppLayout />}>
                      {appRoutes.map((route) => (
                        <Route key={route.path} path={route.path} element={wrapWithGuards(route)} />
                      ))}
                    </Route>
                  </Routes>
                )}
              </Suspense>
            </AnimatePresence>
          </BrowserRouter>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

