import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MessageSquare, ShieldBan, User } from 'lucide-react';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { useLanguage } from '@/i18n/LanguageContext';
import type { ComplaintStatus } from '@/types';

const AdminComplaintsPage = () => {
  const { complaints, updateComplaintStatus, addNotification } = useDataStore();
  const { updateUserStatus, hydrateUsers, users } = useAuthStore();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [tab, setTab] = useState('all');
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('in_review');
  const [blockTarget, setBlockTarget] = useState<{ id: string; name: string; type: 'user' | 'provider' } | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const { isLoading } = useSkeletonLoading();

  useEffect(() => {
    void hydrateUsers();
  }, [hydrateUsers]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold">{t('admin_complaints.title')}</h1>
          <div className="space-y-4">{Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        </div>
      </PageTransition>
    );
  }

  const filtered = tab === 'all' ? complaints : complaints.filter((c) => c.status === tab);
  const respondingComplaint = complaints.find((c) => c.id === respondingId);

  const handleSubmitResponse = () => {
    if (!respondingId) return;
    updateComplaintStatus(respondingId, newStatus, responseText || undefined);
    toast({ title: t('admin_complaints.updated'), description: `${t('admin_complaints.updated_desc')} ${newStatus.replace('_', ' ')}.` });
    setRespondingId(null);
    setResponseText('');
  };

  const getUserForComplaint = (complaint: typeof complaints[0], type: 'user' | 'provider') => {
    if (type === 'user') {
      return users.find((u) => u.id === complaint.userId);
    }
    // Find provider's user account
    const provider = useDataStore.getState().providers.find((p) => p.id === complaint.providerId);
    return provider ? users.find((u) => u.id === provider.userId) : undefined;
  };

  const handleBlock = async () => {
    if (!blockTarget || !blockReason.trim()) return;

    // Find the actual user ID to block
    let userIdToBlock = blockTarget.id;
    if (blockTarget.type === 'provider') {
      const provider = useDataStore.getState().providers.find((p) => p.id === blockTarget.id);
      if (provider) userIdToBlock = provider.userId;
    }

    await updateUserStatus(userIdToBlock, 'blocked', blockReason);

    // Add system notification to the blocked user
    addNotification({
      id: `n${Date.now()}`,
      userId: userIdToBlock,
      type: 'system',
      title: t('blocked.title'),
      description: `${t('blocked.reason')}: ${blockReason}`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    toast({ title: t('admin_accounts.blocked_success'), description: `${blockTarget.name} has been blocked.` });
    setBlockTarget(null);
    setBlockReason('');
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t('admin_complaints.title')}</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">{t('status.all')}</TabsTrigger>
            <TabsTrigger value="open">{t('status.open')}</TabsTrigger>
            <TabsTrigger value="in_review">{t('status.in_review')}</TabsTrigger>
            <TabsTrigger value="resolved">{t('status.resolved')}</TabsTrigger>
            <TabsTrigger value="dismissed">{t('status.dismissed')}</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-4 space-y-4">
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">{t('complaints.no_complaints')}</p>
            )}
            {filtered.map((c) => {
              const complainantUser = users.find((u) => u.id === c.userId);
              const isUserBlocked = complainantUser?.status === 'blocked';
              const providerUser = c.providerId
                ? (() => {
                    const prov = useDataStore.getState().providers.find((p) => p.id === c.providerId);
                    return prov ? users.find((u) => u.id === prov.userId) : undefined;
                  })()
                : undefined;
              const isProviderBlocked = providerUser?.status === 'blocked';

              return (
                <Card key={c.id} className="border-border bg-card">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold">{c.subject}</p>
                          <StatusBadge status={c.status} />
                          {c.issueType && (
                            <Badge variant="outline" className="text-xs">{c.issueType.replace('_', ' ')}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{c.description}</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>{t('admin_complaints.by')} <strong>{c.userName}</strong></span>
                          {c.providerName && (
                            <span>{t('complaints.against_provider')}: <strong>{c.providerName}</strong></span>
                          )}
                          <span>{c.createdAt}</span>
                        </div>
                        {c.response && (
                          <div className="mt-2 rounded-lg border border-border bg-secondary p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t('complaints.admin_response')}</p>
                            <p className="text-sm">{c.response}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => {
                            setRespondingId(c.id);
                            setNewStatus(c.status);
                            setResponseText(c.response || '');
                          }}
                        >
                          <MessageSquare className="h-4 w-4" /> {t('admin_complaints.respond')}
                        </Button>
                        {c.providerId && !isProviderBlocked && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => setBlockTarget({ id: c.providerId!, name: c.providerName || '', type: 'provider' })}
                          >
                            <ShieldBan className="h-3.5 w-3.5" /> {t('admin_complaints.block_provider')}
                          </Button>
                        )}
                        {c.providerId && isProviderBlocked && (
                          <Badge variant="destructive" className="text-xs">{t('admin_complaints.provider_blocked')}</Badge>
                        )}
                        {!isUserBlocked && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => setBlockTarget({ id: c.userId, name: c.userName, type: 'user' })}
                          >
                            <ShieldBan className="h-3.5 w-3.5" /> {t('admin_complaints.block_user')}
                          </Button>
                        )}
                        {isUserBlocked && (
                          <Badge variant="destructive" className="text-xs">{t('admin_complaints.user_blocked')}</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Respond Dialog */}
        <Dialog open={!!respondingId} onOpenChange={(open) => !open && setRespondingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('admin_complaints.respond_title')}</DialogTitle>
              <DialogDescription>{respondingComplaint?.subject}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('admin_complaints.status')}</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ComplaintStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('status.open')}</SelectItem>
                    <SelectItem value="in_review">{t('status.in_review')}</SelectItem>
                    <SelectItem value="resolved">{t('status.resolved')}</SelectItem>
                    <SelectItem value="dismissed">{t('status.dismissed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('admin_complaints.response')}</Label>
                <Textarea
                  placeholder={t('admin_complaints.response_placeholder')}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRespondingId(null)}>{t('cancel')}</Button>
              <Button onClick={handleSubmitResponse}>{t('update')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block Confirmation Dialog */}
        <AlertDialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {blockTarget?.type === 'provider' ? t('admin_complaints.block_provider_title') : t('admin_complaints.block_user_title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin_complaints.block_confirm_desc')} <strong>{blockTarget?.name}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label>{t('admin_complaints.block_reason')}</Label>
              <Textarea
                placeholder={t('admin_complaints.block_reason_placeholder')}
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleBlock()}
                disabled={!blockReason.trim()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('admin_accounts.block')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
};

export default AdminComplaintsPage;
