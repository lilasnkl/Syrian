import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { PageSkeletonGrid, CardSkeleton } from '@/components/PageSkeleton';
import { DollarSign, Briefcase, ClipboardList, Star, ArrowRight, Inbox, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

const ProviderDashboardPage = () => {
  const { user } = useAuthStore();
  const { providers, bids, requests, reviews } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();
  const provider = providers.find((p) => p.userId === user?.id);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6 p-6">
          <PageSkeletonGrid count={4} type="stat" />
          <div className="grid gap-6 lg:grid-cols-2"><CardSkeleton /><CardSkeleton /></div>
        </div>
      </PageTransition>
    );
  }

  if (!provider) {
    return <PageTransition><div className="p-6 text-center text-muted-foreground">{t('profile.not_found')}</div></PageTransition>;
  }

  const providerBids = bids.filter((b) => b.providerId === provider.id);
  const acceptedBids = providerBids.filter((b) => b.status === 'accepted');
  const pendingBids = providerBids.filter((b) => b.status === 'pending');
  const totalEarnings = acceptedBids.reduce((sum, b) => sum + b.amount, 0);
  const providerReviews = reviews.filter((r) => r.providerId === provider.id);
  const incomingCount = requests.filter((r) => r.status === 'open' && r.category === provider.category).length;

  const stats = [
    { label: t('dashboard.total_earnings'), value: `$${totalEarnings.toLocaleString()}`, icon: DollarSign },
    { label: t('dashboard.completed_jobs'), value: provider.completedJobs, icon: Briefcase },
    { label: t('dashboard.active_offers'), value: pendingBids.length, icon: ClipboardList },
    { label: t('dashboard.avg_rating'), value: provider.rating.toFixed(1), icon: Star },
  ];

  return (
    <PageTransition>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.welcome')} {provider.name}</h1>
          <p className="text-muted-foreground">{t('dashboard.overview')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Inbox className="h-5 w-5" /> {t('dashboard.incoming_requests')}
                {incomingCount > 0 && <span className="text-sm font-normal text-muted-foreground">({incomingCount} {t('dashboard.open_count')})</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incomingCount === 0 ? (
                <p className="text-sm text-muted-foreground">{t('dashboard.no_requests')}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-3">{incomingCount} {t('dashboard.requests_waiting')}</p>
              )}
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/provider/requests">{t('dashboard.view_incoming')} <ArrowRight className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="h-5 w-5" /> {t('dashboard.sent_offers')}
                <span className="text-sm font-normal text-muted-foreground">({pendingBids.length} {t('dashboard.pending')})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {providerBids.slice(0, 3).map((bid) => (
                <div key={bid.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{bid.requestTitle}</p>
                    <p className="text-xs text-muted-foreground">${bid.amount} · {bid.estimatedDuration}</p>
                  </div>
                  <StatusBadge status={bid.status} />
                </div>
              ))}
              {providerBids.length === 0 && <p className="text-sm text-muted-foreground">{t('dashboard.no_offers')}</p>}
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/provider/offers">{t('dashboard.view_offers')} <ArrowRight className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4" /></Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">{t('dashboard.recent_reviews')}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {providerReviews.slice(0, 3).map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.clientName}</p>
                  <div className="flex items-center gap-1 text-primary text-xs">
                    <Star className="h-3 w-3 fill-current" /> {r.rating}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.comment}</p>
              </div>
            ))}
            {providerReviews.length === 0 && <p className="text-sm text-muted-foreground">{t('dashboard.no_reviews')}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-wrap gap-3 p-5">
            <Button asChild><Link to="/provider/services">{t('dashboard.manage_services')}</Link></Button>
            <Button variant="outline" asChild><Link to="/provider/earnings">{t('dashboard.view_earnings')}</Link></Button>
            <Button variant="outline" asChild><Link to="/provider/profile">{t('dashboard.edit_profile')}</Link></Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
};

export default ProviderDashboardPage;
