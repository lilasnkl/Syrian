import { httpRequest } from "@/api/http-client";

export interface AdminDashboardPayload {
  dashboard: {
    stats: {
      total_users: number;
      providers: number;
      requests: number;
      complaints: number;
      revenue: number;
    };
    activity: {
      monthly_requests: Array<{
        month: string;
        requests: number;
      }>;
    };
    recent_requests: Array<{
      id: number;
      title: string;
      customer_name: string;
      status: string;
    }>;
    recent_bids: Array<{
      id: number;
      amount: number;
      provider_name: string;
      status: string;
    }>;
    recent_complaints: Array<{
      id: number;
      subject: string;
      complainant_name: string;
      status: string;
    }>;
  };
}

export async function getAdminDashboard() {
  return httpRequest<AdminDashboardPayload>("/admin/dashboard/", {
    method: "GET",
  });
}
