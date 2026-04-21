import { useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { MapPin, DollarSign, Clock, Edit, Trash2, SendHorizonal } from 'lucide-react';
import { toast } from 'sonner';
import type { Bid, BidStatus } from '@/types';

const ProviderSentOffersPage = () => {
  const { user } = useAuthStore();
  const { providers, requests, bids, updateBid, deleteBid } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();
  const provider = providers.find((p) => p.userId === user?.id);

  const [editOpen, setEditOpen] = useState(false);
  const [editingBid, setEditingBid] = useState<Bid | null>(null);
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [message, setMessage] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const myOffers = provider ? bids.filter((b) => b.providerId === provider.id) : [];

  const filterOffers = (status?: BidStatus) =>
    status ? myOffers.filter((b) => b.status === status || (status === 'rejected' && b.status === 'declined')) : myOffers;

  const openEdit = (bid: Bid) => {
    setEditingBid(bid);
    setPrice(String(bid.amount));
    setDuration(bid.estimatedDuration);
    setMessage(bid.message);
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingBid || !price || !duration) return;
    await updateBid(editingBid.id, {
      amount: Number(price),
      estimatedDuration: duration,
      message: message.trim(),
    });
    toast.success(t('incoming.offer_updated'));
    setEditOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteBid(deleteId);
    toast.success(t('sent_offers.deleted'));
    setDeleteId(null);
  };

  const renderOfferCard = (bid: Bid) => {
    const request = requests.find((r) => r.id === bid.requestId);
    const canEdit = bid.status === 'pending' && request?.status === 'open';

    return (
      <Card key={bid.id} className="border-border bg-card">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{bid.requestTitle}</h3>
              {request && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{request.location}</span>
                  <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" />{t('requests.field.budget')}: ${request.budget}</span>
                </div>
              )}
            </div>
            <StatusBadge status={bid.status} />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-primary font-medium"><DollarSign className="h-3.5 w-3.5" />${bid.amount}</span>
            <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3.5 w-3.5" />{bid.estimatedDuration}</span>
          </div>
          {bid.message && <p className="text-sm text-muted-foreground line-clamp-2">{bid.message}</p>}
          {canEdit && (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => openEdit(bid)} className="gap-1.5">
                <Edit className="h-3.5 w-3.5" /> {t('sent_offers.edit_offer')}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setDeleteId(bid.id)} className="gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> {t('sent_offers.delete_offer')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ tab }: { tab: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <SendHorizonal className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-muted-foreground">{t('sent_offers.no_offers')}</p>
    </div>
  );

  if (isLoading) {
    return (
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">{t('sent_offers.title')}</h1>
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('sent_offers.title')}</h1>
          <p className="text-muted-foreground">{t('sent_offers.subtitle')}</p>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">{t('status.all')} ({myOffers.length})</TabsTrigger>
            <TabsTrigger value="pending">{t('status.pending')} ({filterOffers('pending').length})</TabsTrigger>
            <TabsTrigger value="accepted">{t('status.accepted')} ({filterOffers('accepted').length})</TabsTrigger>
            <TabsTrigger value="rejected">{t('status.rejected')} ({filterOffers('rejected').length})</TabsTrigger>
          </TabsList>
          {(['all', 'pending', 'accepted', 'rejected'] as const).map((tab) => {
            const offers = tab === 'all' ? myOffers : filterOffers(tab as BidStatus);
            return (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                {offers.length === 0 ? <EmptyState tab={tab} /> : offers.map(renderOfferCard)}
              </TabsContent>
            );
          })}
        </Tabs>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('sent_offers.edit_offer')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('incoming.field.price')} *</Label>
                <Input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
              <div>
                <Label>{t('incoming.field.duration')} *</Label>
                <Input value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
              <div>
                <Label>{t('incoming.field.message')}</Label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>{t('cancel')}</Button>
              <Button onClick={() => void handleUpdate()} disabled={!price || !duration}>{t('update')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('sent_offers.delete_title')}</AlertDialogTitle>
              <AlertDialogDescription>{t('sent_offers.delete_desc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleDelete()}>{t('delete')}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
};

export default ProviderSentOffersPage;
