import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { RequireAuth } from '@/components/RouteGuards';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { CategoryPill } from '@/components/CategoryPill';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { MapPin, Calendar, DollarSign, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const ProviderInProgressPage = () => {
  const { user } = useAuthStore();
  const { providers, bids, requests, markRequestCompleted, addNotification } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();
  const [completeId, setCompleteId] = useState<string | null>(null);

  const provider = providers.find((p) => p.userId === user?.id);
  const providerBids = provider ? bids.filter((b) => b.providerId === provider.id && b.status === 'accepted') : [];
  const inProgressRequests = requests.filter(
    (r) => r.status === 'in_progress' && providerBids.some((b) => b.requestId === r.id)
  );

  const handleComplete = async () => {
    if (!completeId) return;
    await markRequestCompleted(completeId);
    const req = requests.find((r) => r.id === completeId);
    if (req) {
      addNotification({
        id: `n${Date.now()}`,
        userId: req.clientId,
        type: 'system',
        title: t('provider_in_progress.completed_notification'),
        description: `"${req.title}" ${t('provider_in_progress.has_been_completed')}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
    toast.success(t('provider_in_progress.marked_complete'));
    setCompleteId(null);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">{t('provider_in_progress.title')}</h1>
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <RequireAuth>
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{t('provider_in_progress.title')}</h1>
            <p className="text-muted-foreground">{t('provider_in_progress.subtitle')}</p>
          </div>

          {inProgressRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{t('provider_in_progress.no_requests')}</p>
          ) : (
            <div className="space-y-3">
              {inProgressRequests.map((r) => {
                const bid = providerBids.find((b) => b.requestId === r.id);
                return (
                  <Card key={r.id} className="border-border bg-card">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{r.title}</span>
                          <StatusBadge status={r.status} />
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{r.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <CategoryPill category={r.category} />
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.createdAt}</span>
                          {bid && <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${bid.amount}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">{t('provider_in_progress.client')}: {r.clientName}</p>
                      </div>
                      <Button onClick={() => setCompleteId(r.id)} className="gap-2 shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                        {t('provider_in_progress.mark_complete')}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <AlertDialog open={!!completeId} onOpenChange={(open) => !open && setCompleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('provider_in_progress.confirm_title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('provider_in_progress.confirm_desc')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleComplete()}>{t('confirm')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default ProviderInProgressPage;
