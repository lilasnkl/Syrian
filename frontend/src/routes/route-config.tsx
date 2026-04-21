import { lazy } from "react";
import type { ReactElement } from "react";
import type { UserRole } from "@/types";

const Index = lazy(() => import("@/pages/Index"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ProvidersPage = lazy(() => import("@/pages/ProvidersPage"));
const ProviderProfilePage = lazy(() => import("@/pages/ProviderProfilePage"));
const MyRequestsPage = lazy(() => import("@/pages/MyRequestsPage"));
const MyBidsPage = lazy(() => import("@/pages/MyBidsPage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const ComplaintsPage = lazy(() => import("@/pages/ComplaintsPage"));
const AIRecommendPage = lazy(() => import("@/pages/AIRecommendPage"));
const SignUpPage = lazy(() => import("@/pages/SignUpPage"));
const ServiceDetailPage = lazy(() => import("@/pages/ServiceDetailPage"));
const ProfileSettingsPage = lazy(() => import("@/pages/ProfileSettingsPage"));
const ProviderDashboardPage = lazy(() => import("@/pages/provider/ProviderDashboardPage"));
const ProviderServicesPage = lazy(() => import("@/pages/provider/ProviderServicesPage"));
const ProviderBidsPage = lazy(() => import("@/pages/provider/ProviderBidsPage"));
const ProviderIncomingRequestsPage = lazy(() => import("@/pages/provider/ProviderIncomingRequestsPage"));
const ProviderSentOffersPage = lazy(() => import("@/pages/provider/ProviderSentOffersPage"));
const ProviderInProgressPage = lazy(() => import("@/pages/provider/ProviderInProgressPage"));
const ProviderEarningsPage = lazy(() => import("@/pages/provider/ProviderEarningsPage"));
const ProviderProfileSettingsPage = lazy(() => import("@/pages/provider/ProviderProfilePage"));
const ProviderVerificationPage = lazy(() => import("@/pages/provider/ProviderVerificationPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminVerificationPage = lazy(() => import("@/pages/admin/AdminVerificationPage"));
const AdminAnalyticsPage = lazy(() => import("@/pages/admin/AdminAnalyticsPage"));
const AdminComplaintsPage = lazy(() => import("@/pages/admin/AdminComplaintsPage"));
const AdminAccountsPage = lazy(() => import("@/pages/admin/AdminAccountsPage"));

export interface AppRouteConfig {
  path: string;
  element: ReactElement;
  requiresAuth?: boolean;
  roles?: UserRole[];
}

export const appRoutes: AppRouteConfig[] = [
  { path: "/", element: <Index /> },
  { path: "/signup", element: <SignUpPage /> },
  { path: "/providers", element: <ProvidersPage /> },
  { path: "/providers/:id", element: <ProviderProfilePage /> },
  { path: "/services/:providerId/:serviceId", element: <ServiceDetailPage /> },
  { path: "/my-requests", element: <MyRequestsPage /> },
  { path: "/my-bids", element: <MyBidsPage /> },
  { path: "/compare", element: <ComparePage /> },
  { path: "/chat", element: <ChatPage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/complaints", element: <ComplaintsPage /> },
  { path: "/ai-recommend", element: <AIRecommendPage /> },
  { path: "/profile", element: <ProfileSettingsPage />, requiresAuth: true },
  { path: "/provider/dashboard", element: <ProviderDashboardPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/services", element: <ProviderServicesPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/bids", element: <ProviderBidsPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/requests", element: <ProviderIncomingRequestsPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/offers", element: <ProviderSentOffersPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/in-progress", element: <ProviderInProgressPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/earnings", element: <ProviderEarningsPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/profile", element: <ProviderProfileSettingsPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/provider/verification", element: <ProviderVerificationPage />, requiresAuth: true, roles: ["provider"] },
  { path: "/admin/dashboard", element: <AdminDashboardPage />, requiresAuth: true, roles: ["admin"] },
  { path: "/admin/verification", element: <AdminVerificationPage />, requiresAuth: true, roles: ["admin"] },
  { path: "/admin/analytics", element: <AdminAnalyticsPage />, requiresAuth: true, roles: ["admin"] },
  { path: "/admin/complaints", element: <AdminComplaintsPage />, requiresAuth: true, roles: ["admin"] },
  { path: "/admin/accounts", element: <AdminAccountsPage />, requiresAuth: true, roles: ["admin"] },
  { path: "*", element: <NotFound /> },
];
