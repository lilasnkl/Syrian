import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { DollarSign, Clock, Calendar } from 'lucide-react';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import type { BidStatus } from '@/types';

const ProviderBidsPage = () => {
  const { user } = useAuthStore();
  const { providers, bids } = useDataStore();
  const { t } = useLanguage();
  const provider = providers.find((p) => p.userId === user?.id);
  const [tab, setTab] = useState('all');

  const { isLoading } = useSkeletonLoading();

  if (isLoading) {
    return <PageTransition><div className="space-y-6 p-6"><h1 className="text-2xl font-bold">{t('provider_bids.title')}</h1><div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div></div></PageTransition>;
  }

  if (!provider) {
    return <PageTransition><div className="p-6 text-center text-muted-foreground">{t('services.provider_not_found')}</div></PageTransition>;
  }

  const providerBids = bids.filter((b) => b.providerId === provider.id);
  const filtered = tab === 'all' ? providerBids : providerBids.filter((b) => b.status === tab);

  return (
    <PageTransition>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">{t('provider_bids.title')}</h1>
          <p className="text-muted-foreground">{providerBids.length} {t('provider_bids.total')}</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">{t('status.all')} ({providerBids.length})</TabsTrigger>
            <TabsTrigger value="pending">{t('status.pending')} ({providerBids.filter(b => b.status === 'pending').length})</TabsTrigger>
            <TabsTrigger value="accepted">{t('status.accepted')} ({providerBids.filter(b => b.status === 'accepted').length})</TabsTrigger>
            <TabsTrigger value="rejected">{t('status.rejected')} ({providerBids.filter(b => b.status === 'rejected' || b.status === 'declined').length})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            <div className="space-y-3">
              {filtered.map((bid) => (
                <Card key={bid.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="space-y-1">
                      <p className="font-medium">{bid.requestTitle}</p>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />${bid.amount}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{bid.estimatedDuration}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{bid.createdAt}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1">{bid.message}</p>
                    </div>
                    <StatusBadge status={bid.status} />
                  </CardContent>
                </Card>
              ))}
              {filtered.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">{t('provider_bids.no_bids')}</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
};

export default ProviderBidsPage;
