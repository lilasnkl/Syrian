import { useEffect, useState } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { CardSkeleton } from '@/components/PageSkeleton';
import { ShieldBan, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { User } from '@/types';

const AdminAccountsPage = () => {
  const { users, updateUserStatus, hydrateUsers, user: currentUser } = useAuthStore();
  const { addNotification } = useDataStore();
  const { t } = useLanguage();
  const { isLoading } = useSkeletonLoading();
  const [actionUser, setActionUser] = useState<{ user: User; action: 'block' | 'unblock' } | null>(null);
  const [blockReason, setBlockReason] = useState('');

  const clients = users.filter((u) => u.role === 'client');
  const providers = users.filter((u) => u.role === 'provider');

  useEffect(() => {
    void hydrateUsers();
  }, [hydrateUsers]);

  const handleConfirm = async () => {
    if (!actionUser) return;
    if (actionUser.action === 'block' && !blockReason.trim()) return;

    const newStatus = actionUser.action === 'block' ? 'blocked' : 'active';
    await updateUserStatus(actionUser.user.id, newStatus, actionUser.action === 'block' ? blockReason : undefined);

    if (actionUser.action === 'block') {
      addNotification({
        id: `n${Date.now()}`,
        userId: actionUser.user.id,
        type: 'system',
        title: t('blocked.title'),
        description: `${t('blocked.reason')}: ${blockReason}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    toast.success(
      actionUser.action === 'block'
        ? t('admin_accounts.blocked_success')
        : t('admin_accounts.unblocked_success')
    );
    setActionUser(null);
    setBlockReason('');
  };

  const renderUserCard = (u: User) => {
    const isBlocked = u.status === 'blocked';
    const isSelf = u.id === currentUser?.id;

    return (
      <Card key={u.id} className="border-border bg-card">
        <CardContent className="p-4 flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={u.avatar} />
            <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{u.name}</span>
              <Badge variant={isBlocked ? 'destructive' : 'secondary'}>
                {isBlocked ? t('admin_accounts.status_blocked') : t('admin_accounts.status_active')}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{u.email}</p>
            {isBlocked && u.blockReason && (
              <p className="text-xs text-destructive mt-1">{t('blocked.reason')}: {u.blockReason}</p>
            )}
          </div>
          {!isSelf && (
            <Button
              size="sm"
              variant={isBlocked ? 'outline' : 'destructive'}
              onClick={() => { setActionUser({ user: u, action: isBlocked ? 'unblock' : 'block' }); setBlockReason(''); }}
              className="gap-1.5"
            >
              {isBlocked ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldBan className="h-3.5 w-3.5" />}
              {isBlocked ? t('admin_accounts.unblock') : t('admin_accounts.block')}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <h1 className="text-2xl font-bold">{t('admin_accounts.title')}</h1>
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}</div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('admin_accounts.title')}</h1>
          <p className="text-muted-foreground">{t('admin_accounts.subtitle')}</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">{t('admin_accounts.tab_users')} ({clients.length})</TabsTrigger>
            <TabsTrigger value="providers">{t('admin_accounts.tab_providers')} ({providers.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="space-y-3 mt-4">
            {clients.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t('admin_accounts.no_users')}</p>
              </div>
            ) : clients.map(renderUserCard)}
          </TabsContent>
          <TabsContent value="providers" className="space-y-3 mt-4">
            {providers.length === 0 ? (
              <div className="flex flex-col items-center py-16">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">{t('admin_accounts.no_providers')}</p>
              </div>
            ) : providers.map(renderUserCard)}
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!actionUser} onOpenChange={(open) => !open && setActionUser(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionUser?.action === 'block' ? t('admin_accounts.block_title') : t('admin_accounts.unblock_title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionUser?.action === 'block'
                  ? t('admin_accounts.block_desc')
                  : t('admin_accounts.unblock_desc')}
                {' '}<strong>{actionUser?.user.name}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            {actionUser?.action === 'block' && (
              <div className="space-y-2">
                <Label>{t('admin_complaints.block_reason')}</Label>
                <Textarea
                  placeholder={t('admin_complaints.block_reason_placeholder')}
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction
                  onClick={() => void handleConfirm()}
                  disabled={actionUser?.action === 'block' && !blockReason.trim()}
                >
                {t('confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageTransition>
  );
};

export default AdminAccountsPage;
