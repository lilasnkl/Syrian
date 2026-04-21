import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { MapPin, DollarSign, Calendar, Send, Edit, Inbox, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Bid } from '@/types';
import type { TranslationKey } from '@/i18n/translations';

const ProviderIncomingRequestsPage = () => {
  const { user } = useAuthStore();
  const { providers, requests, bids, addBid, updateBid, dismissedRequests, dismissRequest, updateRequestStatus, addNotification } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();
  const provider = providers.find((p) => p.userId === user?.id);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [message, setMessage] = useState('');
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);

  const incomingRequests = provider
    ? requests
        .filter((r) => r.status === 'open' && r.category === provider.category)
        .filter((r) => !dismissedRequests.some((d) => d.requestId === r.id && d.providerId === provider.id))
    : [];

  const openDialog = (requestId: string) => {
    const existingBid = bids.find((b) => b.requestId === requestId && b.providerId === provider?.id);
    setSelectedRequestId(requestId);
    if (existingBid && existingBid.status === 'pending') {
      setEditingBid(existingBid);
      setPrice(String(existingBid.amount));
      setDuration(existingBid.estimatedDuration);
      setMessage(existingBid.message);
    } else {
      setEditingBid(null);
      setPrice('');
      setDuration('');
      setMessage('');
    }
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!price || !duration || !provider) return;
    const request = requests.find((r) => r.id === selectedRequestId);
    if (!request) return;

    if (editingBid) {
      await updateBid(editingBid.id, {
        amount: Number(price),
        estimatedDuration: duration,
        message: message.trim(),
      });
      toast.success(t('incoming.offer_updated'));
    } else {
      const newBid: Bid = {
        id: `b${Date.now()}`,
        requestId: selectedRequestId,
        requestTitle: request.title,
        providerId: provider.id,
        providerName: provider.name,
        providerAvatar: provider.avatar,
        providerRating: provider.rating,
        amount: Number(price),
        message: message.trim(),
        estimatedDuration: duration,
        status: 'pending',
        createdAt: new Date().toISOString().split('T')[0],
      };
      const added = await addBid(newBid);
      if (!added) {
        toast.error(t('incoming.already_sent'));
        return;
      }
      toast.success(t('incoming.offer_sent'));
    }
    setDialogOpen(false);
  };

  const handleReject = async () => {
    if (!rejectRequestId || !provider) return;
    const request = requests.find((r) => r.id === rejectRequestId);
    dismissRequest(provider.id, rejectRequestId);
    if (request?.serviceId) {
      await updateRequestStatus(rejectRequestId, 'cancelled');
      addNotification({
        id: `n${Date.now()}`,
        userId: request.clientId,
        title: t('incoming.cancel_notification_title'),
        description: `${provider.name} ${t('incoming.cancel_notification_msg')}`,
        type: 'system',
        read: false,
        createdAt: new Date().toISOString().split('T')[0],
      });
    }
    toast.success(t('incoming.reject_success'));
    setRejectRequestId(null);
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">{t('incoming.title')}</h1>
          <div className="space-y-4">{Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('incoming.title')}</h1>
          <p className="text-muted-foreground">{t('incoming.subtitle')}</p>
        </div>

        {incomingRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-muted-foreground">{t('incoming.no_requests')}</p>
            <p className="text-sm text-muted-foreground/70">{t('incoming.no_requests_desc')}</p>
          </div>
        ) : (
          incomingRequests.map((req) => {
            const existingBid = bids.find((b) => b.requestId === req.id && b.providerId === provider?.id);
            const hasOffer = !!existingBid;
            const canEdit = hasOffer && existingBid.status === 'pending';

            return (
              <Card key={req.id} className="border-border bg-card">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-base">{req.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{req.description}</p>
                    </div>
                    <Badge variant="outline" className={
                      req.urgency === 'high' ? 'border-destructive/30 text-destructive shrink-0' :
                      req.urgency === 'medium' ? 'border-amber-500/30 text-amber-400 shrink-0' :
                      'border-emerald-500/30 text-emerald-400 shrink-0'
                    }>{t(`urgency.${req.urgency}` as TranslationKey)}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{req.location}</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{t('requests.field.budget')}: ${req.budget}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{req.createdAt}</span>
                    <span className="text-xs">by {req.clientName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasOffer ? (
                      <Button size="sm" variant="secondary" disabled={!canEdit} onClick={() => openDialog(req.id)} className="gap-1.5">
                        <Edit className="h-3.5 w-3.5" /> {t('incoming.edit_offer')} (${existingBid.amount})
                      </Button>
                    ) : (
                      <>
                        <Button size="sm" onClick={() => openDialog(req.id)} className="gap-1.5">
                          <Send className="h-3.5 w-3.5" /> {t('incoming.send_offer')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => setRejectRequestId(req.id)} className="gap-1.5">
                          <X className="h-3.5 w-3.5" /> {t('incoming.reject_request')}
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBid ? t('incoming.edit_offer') : t('incoming.send_offer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('incoming.field.price')} *</Label>
                <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t('incoming.placeholder.price')} />
              </div>
              <div>
                <Label>{t('incoming.field.duration')} *</Label>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder={t('incoming.placeholder.duration')} />
              </div>
              <div>
                <Label>{t('incoming.field.message')}</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('incoming.placeholder.message')} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
              <Button onClick={() => void handleSubmit()} disabled={!price || !duration}>{editingBid ? t('update') : t('incoming.send_offer')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!rejectRequestId} onOpenChange={(open) => !open && setRejectRequestId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('incoming.reject_confirm_title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('incoming.reject_confirm_desc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleReject()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('incoming.reject_request')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
};

export default ProviderIncomingRequestsPage;
