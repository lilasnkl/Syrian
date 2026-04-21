import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Briefcase, FileText, AlertTriangle, DollarSign, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StatusBadge } from '@/components/StatusBadge';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { PageSkeletonGrid, ChartSkeleton, CardSkeleton } from '@/components/PageSkeleton';
import { getAdminDashboard } from '@/features/admin/api';

const emptyDashboard = {
  stats: {
    total_users: 0,
    providers: 0,
    requests: 0,
    complaints: 0,
    revenue: 0,
  },
  activity: {
    monthly_requests: [] as Array<{ month: string; requests: number }>,
  },
  recent_requests: [] as Array<{ id: number; title: string; customer_name: string; status: string }>,
  recent_bids: [] as Array<{ id: number; amount: number; provider_name: string; status: string }>,
  recent_complaints: [] as Array<{ id: number; subject: string; complainant_name: string; status: string }>,
};

function normalizeDashboard(input: unknown) {
  const dashboard = (input && typeof input === 'object' ? input : {}) as Partial<typeof emptyDashboard> & {
    stats?: Partial<typeof emptyDashboard.stats>;
    activity?: { monthly_requests?: Array<{ month: string; requests: number }> };
  };

  return {
    stats: {
      total_users: dashboard.stats?.total_users ?? 0,
      providers: dashboard.stats?.providers ?? 0,
      requests: dashboard.stats?.requests ?? 0,
      complaints: dashboard.stats?.complaints ?? 0,
      revenue: dashboard.stats?.revenue ?? 0,
    },
    activity: {
      monthly_requests: dashboard.activity?.monthly_requests ?? [],
    },
    recent_requests: dashboard.recent_requests ?? [],
    recent_bids: dashboard.recent_bids ?? [],
    recent_complaints: dashboard.recent_complaints ?? [],
  };
}

const AdminDashboardPage = () => {
  const { isLoading: baseLoading } = useSkeletonLoading();
  const { t } = useLanguage();
  const [dashboard, setDashboard] = useState(emptyDashboard);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        const payload = await getAdminDashboard();
        if (!active) {
          return;
        }
        setDashboard(normalizeDashboard(payload.dashboard));
      } catch (error) {
        console.error('admin dashboard load failed', error);
        if (active) {
          setDashboard(emptyDashboard);
        }
      }
    };

    void loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  const isLoading = baseLoading;
  const monthlyActivity = dashboard.activity.monthly_requests.length > 0 ? dashboard.activity.monthly_requests : emptyDashboard.activity.monthly_requests;

  if (isLoading) {
    return (
        <PageTransition>
          <div className="space-y-6">
          <h1 className="text-2xl font-bold">{t('admin.dashboard')}</h1>
          <PageSkeletonGrid count={5} type="stat" />
          <ChartSkeleton />
          <div className="grid gap-4 md:grid-cols-3">
            <CardSkeleton /><CardSkeleton /><CardSkeleton />
          </div>
        </div>
      </PageTransition>
    );
  }

  const stats = [
    { label: t('admin.total_users'), value: dashboard.stats.total_users, icon: Users, color: 'text-primary' },
    { label: t('admin.providers'), value: dashboard.stats.providers, icon: Briefcase, color: 'text-blue-400' },
    { label: t('admin.requests'), value: dashboard.stats.requests, icon: FileText, color: 'text-emerald-400' },
    { label: t('admin.complaints'), value: dashboard.stats.complaints, icon: AlertTriangle, color: 'text-red-400' },
    { label: t('admin.revenue'), value: `$${dashboard.stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-primary' },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin.dashboard')}</h1>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <Card key={s.label} className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className={`h-8 w-8 ${s.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> {t('admin.activity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {monthlyActivity.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('notifications.no_notifications')}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 16%)" />
                    <XAxis dataKey="month" stroke="hsl(220 10% 52%)" fontSize={12} />
                    <YAxis stroke="hsl(220 10% 52%)" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 16%)', borderRadius: '8px', color: 'hsl(40 10% 92%)' }} />
                    <Area type="monotone" dataKey="requests" stroke="hsl(38 92% 50%)" fill="hsl(38 92% 50% / 0.2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base">{t('admin.recent_requests')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {dashboard.recent_requests.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.customer_name}</p>
                  </div>
                  <StatusBadge status={r.status as Parameters<typeof StatusBadge>[0]['status']} />
                </div>
              ))}
              {dashboard.recent_requests.length === 0 && <p className="text-sm text-muted-foreground">-</p>}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base">{t('admin.recent_bids')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {dashboard.recent_bids.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">${b.amount}</p>
                    <p className="text-xs text-muted-foreground">{b.provider_name}</p>
                  </div>
                  <StatusBadge status={b.status as Parameters<typeof StatusBadge>[0]['status']} />
                </div>
              ))}
              {dashboard.recent_bids.length === 0 && <p className="text-sm text-muted-foreground">-</p>}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base">{t('admin.recent_complaints')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {dashboard.recent_complaints.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{c.subject}</p>
                    <p className="text-xs text-muted-foreground">{c.complainant_name}</p>
                  </div>
                  <StatusBadge status={c.status as Parameters<typeof StatusBadge>[0]['status']} />
                </div>
              ))}
              {dashboard.recent_complaints.length === 0 && <p className="text-sm text-muted-foreground">-</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default AdminDashboardPage;
