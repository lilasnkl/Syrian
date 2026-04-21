import { PageTransition } from '@/components/PageTransition';
import { RequireAuth } from '@/components/RouteGuards';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { RatingStars } from '@/components/RatingStars';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { ChevronDown, Clock, DollarSign, Inbox } from 'lucide-react';
import { toast } from 'sonner';

const MyBidsPage = () => {
  const { user } = useAuthStore();
  const { requests, bids, updateBidStatus } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();

  const myRequests = requests.filter((r) => r.clientId === user?.id);
  const requestsWithBids = myRequests
    .map((r) => ({ ...r, bids: bids.filter((b) => b.requestId === r.id) }))
    .filter((r) => r.bids.length > 0);

  const handleAccept = async (bidId: string) => {
    await updateBidStatus(bidId, 'accepted');
    toast.success(t('offers.accept_success'));
  };

  const handleReject = async (bidId: string) => {
    await updateBidStatus(bidId, 'rejected');
    toast.success(t('offers.reject_success'));
  };

  if (isLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('offers.title')}</h1>
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
          </div>
        </PageTransition>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{t('offers.title')}</h1>
            <p className="text-muted-foreground">{t('offers.subtitle')}</p>
          </div>

          {requestsWithBids.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">{t('offers.no_offers')}</p>
              <p className="text-sm text-muted-foreground/70">{t('offers.no_offers_desc')}</p>
            </div>
          ) : (
            requestsWithBids.map((req) => {
              const hasAccepted = req.bids.some((b) => b.status === 'accepted');
              const isFinalized = req.status === 'completed' || req.status === 'cancelled' || req.status === 'awarded';
              return (
                <Collapsible key={req.id} defaultOpen>
                  <Card className="border-border bg-card">
                    <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-left rtl:text-right hover:bg-muted/30 transition-colors rounded-t-lg">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{req.title}</span>
                        <span className="text-sm text-muted-foreground">({req.bids.length} {t('requests.bids')})</span>
                        <StatusBadge status={req.status} />
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3">
                        {req.bids.map((bid) => (
                          <Card key={bid.id} className="border-border/50 bg-muted/20">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={bid.providerAvatar} />
                                  <AvatarFallback>{bid.providerName[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{bid.providerName}</span>
                                    <RatingStars rating={bid.providerRating} size={12} />
                                    <StatusBadge status={bid.status} />
                                  </div>
                                  {bid.message && <p className="text-sm text-muted-foreground">{bid.message}</p>}
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${bid.amount}</span>
                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{bid.estimatedDuration}</span>
                                  </div>
                                </div>
                                {bid.status === 'pending' && !hasAccepted && !isFinalized && (
                                  <div className="flex gap-2 shrink-0">
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="default">{t('offers.accept')}</Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>{t('offers.accept_title')}</AlertDialogTitle>
                                          <AlertDialogDescription>{t('offers.accept_desc')}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => void handleAccept(bid.id)}>{t('offers.accept')}</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline">{t('offers.reject')}</Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>{t('offers.reject_title')}</AlertDialogTitle>
                                          <AlertDialogDescription>{t('offers.reject_title')}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => void handleReject(bid.id)}>{t('offers.reject')}</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })
          )}
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default MyBidsPage;
