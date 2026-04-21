import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, TrendingUp, Briefcase } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { PageSkeletonGrid, ChartSkeleton, CardSkeleton } from '@/components/PageSkeleton';
import { getMyProviderEarnings } from '@/features/providers/api';

const emptyEarnings = {
  stats: {
    total_earnings: 0,
    this_month: 0,
    avg_per_job: 0,
  },
  monthly_earnings: [] as Array<{ month: string; earnings: number }>,
  transactions: [] as Array<{ id: number; job: string; amount: number; date: string; status: string }>,
};

const ProviderEarningsPage = () => {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const { isLoading: baseLoading } = useSkeletonLoading();
  const [earnings, setEarnings] = useState(emptyEarnings);
  const [isEarningsLoading, setIsEarningsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadEarnings = async () => {
      try {
        setIsEarningsLoading(true);
        const payload = await getMyProviderEarnings();
        if (!active) {
          return;
        }
        setEarnings(payload.earnings);
      } catch (error) {
        console.error('provider earnings load failed', error);
        if (active) {
          setEarnings(emptyEarnings);
        }
      } finally {
        if (active) {
          setIsEarningsLoading(false);
        }
      }
    };

    if (user?.role === 'provider') {
      void loadEarnings();
    } else {
      setIsEarningsLoading(false);
    }

    return () => {
      active = false;
    };
  }, [user?.role]);

  const isLoading = baseLoading || isEarningsLoading;
  const monthlyData = earnings.monthly_earnings.length > 0 ? earnings.monthly_earnings : emptyEarnings.monthly_earnings;

  if (isLoading) {
    return <PageTransition><div className="space-y-6 p-6"><PageSkeletonGrid count={3} type="stat" /><ChartSkeleton /><CardSkeleton /></div></PageTransition>;
  }

  if (user?.role !== 'provider') {
    return <PageTransition><div className="p-6 text-center text-muted-foreground">{t('services.provider_not_found')}</div></PageTransition>;
  }

  const stats = [
    { label: t('earnings.total'), value: `$${earnings.stats.total_earnings.toLocaleString()}`, icon: DollarSign },
    { label: t('earnings.this_month'), value: `$${earnings.stats.this_month.toLocaleString()}`, icon: TrendingUp },
    { label: t('earnings.avg_per_job'), value: `$${earnings.stats.avg_per_job.toLocaleString()}`, icon: Briefcase },
  ];

  return (
    <PageTransition>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">{t('earnings.title')}</h1>
          <p className="text-muted-foreground">{t('earnings.subtitle')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('earnings.monthly')}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              {monthlyData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{t('earnings.no_transactions')}</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 12% 16%)" />
                    <XAxis dataKey="month" stroke="hsl(220 10% 52%)" fontSize={12} />
                    <YAxis stroke="hsl(220 10% 52%)" fontSize={12} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(220 14% 9%)', border: '1px solid hsl(220 12% 16%)', borderRadius: '8px', color: 'hsl(40 10% 92%)' }}
                      formatter={(value: number) => [`$${value}`, t('earnings.title')]}
                    />
                    <Bar dataKey="earnings" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('earnings.transactions')}</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('earnings.col.job')}</TableHead>
                  <TableHead>{t('earnings.col.amount')}</TableHead>
                  <TableHead>{t('earnings.col.date')}</TableHead>
                  <TableHead>{t('earnings.col.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.job}</TableCell>
                    <TableCell>${transaction.amount}</TableCell>
                    <TableCell className="text-muted-foreground">{transaction.date}</TableCell>
                    <TableCell><StatusBadge status={transaction.status as Parameters<typeof StatusBadge>[0]['status']} /></TableCell>
                  </TableRow>
                ))}
                {earnings.transactions.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{t('earnings.no_transactions')}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ProviderEarningsPage;
