import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/i18n/LanguageContext';
import { useDataStore } from '@/stores/data-store';
import { CATEGORIES } from '@/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Target, Star } from 'lucide-react';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { PageSkeletonGrid, ChartSkeleton } from '@/components/PageSkeleton';

const CHART_COLORS = [
  'hsl(38 92% 50%)',
  'hsl(200 80% 50%)',
  'hsl(150 60% 45%)',
  'hsl(0 72% 51%)',
  'hsl(280 60% 55%)',
  'hsl(30 80% 55%)',
  'hsl(170 60% 40%)',
  'hsl(330 60% 50%)',
];

const growthData = [
  { month: 'Sep', users: 45, requests: 12, providers: 20 },
  { month: 'Oct', users: 62, requests: 19, providers: 28 },
  { month: 'Nov', users: 78, requests: 15, providers: 33 },
  { month: 'Dec', users: 95, requests: 22, providers: 40 },
  { month: 'Jan', users: 120, requests: 28, providers: 48 },
  { month: 'Feb', users: 150, requests: 34, providers: 55 },
];

const tooltipStyle = {
  backgroundColor: 'hsl(220 14% 9%)',
  border: '1px solid hsl(220 12% 16%)',
  borderRadius: '8px',
  color: 'hsl(40 10% 92%)',
};

const AdminAnalyticsPage = () => {
  const { requests, bids } = useDataStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();

  if (isLoading) {
    return (
        <PageTransition>
          <div className="space-y-6">
          <h1 className="text-2xl font-bold">{t('admin_analytics.title')}</h1>
          <PageSkeletonGrid count={4} type="stat" />
          <div className="grid gap-4 md:grid-cols-2"><ChartSkeleton /><ChartSkeleton /></div>
          <ChartSkeleton />
        </div>
      </PageTransition>
    );
  }

  const categoryData = CATEGORIES.map((cat) => ({
    name: t(`cat.${cat.value}` as const),
    count: requests.filter((r) => r.category === cat.value).length,
  })).filter((d) => d.count > 0);

  const bidStatusData = [
    { name: t('status.pending'), value: bids.filter((b) => b.status === 'pending').length },
    { name: t('status.accepted'), value: bids.filter((b) => b.status === 'accepted').length },
    { name: t('status.declined'), value: bids.filter((b) => b.status === 'declined').length },
  ].filter((d) => d.value > 0);

  const avgBid = bids.length ? Math.round(bids.reduce((s, b) => s + b.amount, 0) / bids.length) : 0;
  const acceptanceRate = bids.length ? Math.round((bids.filter((b) => b.status === 'accepted').length / bids.length) * 100) : 0;
  const mostPopular = categoryData.sort((a, b) => b.count - a.count)[0]?.name || '-';

  const metrics = [
    { label: t('admin_analytics.avg_bid'), value: `$${avgBid}`, icon: DollarSign },
    { label: t('admin_analytics.acceptance_rate'), value: `${acceptanceRate}%`, icon: Target },
    { label: t('admin_analytics.most_popular'), value: mostPopular, icon: Star },
    { label: t('admin_analytics.total_bids'), value: bids.length, icon: TrendingUp },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin_analytics.title')}</h1>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {metrics.map((m) => (
            <Card key={m.label} className="border-border bg-card">
              <CardContent className="flex items-center gap-3 p-4">
                <m.icon className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-xl font-bold">{m.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base">{t('admin_analytics.by_category')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 16%)" />
                    <XAxis dataKey="name" stroke="hsl(220 10% 52%)" fontSize={11} />
                    <YAxis stroke="hsl(220 10% 52%)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader><CardTitle className="text-base">{t('admin_analytics.bid_status')}</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bidStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {bidStatusData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">{t('admin_analytics.growth')}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 16%)" />
                  <XAxis dataKey="month" stroke="hsl(220 10% 52%)" fontSize={12} />
                  <YAxis stroke="hsl(220 10% 52%)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="users" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="requests" stroke="hsl(200 80% 50%)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="providers" stroke="hsl(150 60% 45%)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex justify-center gap-6 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(38 92% 50%)' }} /> {t('admin.total_users')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(200 80% 50%)' }} /> {t('admin.requests')}</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: 'hsl(150 60% 45%)' }} /> {t('admin.providers')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default AdminAnalyticsPage;
