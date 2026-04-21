import { PageTransition } from '@/components/PageTransition';
import { RequireAuth } from '@/components/RouteGuards';
import { useDataStore } from '@/stores/data-store';
import { useAuthStore } from '@/stores/auth-store';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSkeletonLoading } from '@/hooks/use-skeleton-loading';
import { ListItemSkeleton } from '@/components/PageSkeleton';
import { Bell, MessageSquare, CalendarCheck, Star, Shield, Info, CheckCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Notification as NotificationType } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';

const typeIcons: Record<NotificationType['type'], LucideIcon> = {
  bid: Bell,
  booking: CalendarCheck,
  order: CalendarCheck,
  message: MessageSquare,
  review: Star,
  complaint: Shield,
  system: Info,
  verification: Shield,
};

const NotificationsPage = () => {
  const { user } = useAuthStore();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDataStore();
  const { isLoading } = useSkeletonLoading();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const myNotifs = notifications.filter((n) => n.userId === user?.id);
  const visibleNotifs = user?.role === 'admin'
    ? myNotifs.filter((notification) => notification.type === 'complaint' || notification.type === 'verification')
    : myNotifs;

  const filterByType = (type: string) =>
    type === 'all' ? visibleNotifs : visibleNotifs.filter((n) => n.type === type);

  const handleClick = async (id: string, link?: string) => {
    await markNotificationRead(id);
    if (link) navigate(link);
  };

  const handleMarkAll = async () => {
    if (user) {
      await markAllNotificationsRead();
      toast.success(t('notifications.marked_all'));
    }
  };

  const tabs: Array<'all' | NotificationType['type']> = user?.role === 'admin'
    ? ['all', 'complaint', 'verification']
    : ['all', 'bid', 'order', 'message', 'review', 'complaint', 'verification', 'system'];

  if (isLoading) {
    return (
      <RequireAuth>
        <PageTransition>
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}</div>
          </div>
        </PageTransition>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <PageTransition>
        <div className="p-6 max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
            <Button variant="outline" size="sm" onClick={() => void handleMarkAll()}>
              <CheckCheck className="mr-2 h-4 w-4" />{t('notifications.mark_all')}
            </Button>
          </div>

          <Tabs defaultValue="all">
            <TabsList>
              {tabs.map((tabKey) => (
                <TabsTrigger key={tabKey} value={tabKey} className="capitalize">{tabKey === 'all' ? t('notifications.tab.all') : t(`notifications.tab.${tabKey}` as const)}</TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-2 mt-4">
                {filterByType(tab).length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">{t('notifications.no_notifications')}</p>
                ) : (
                  filterByType(tab).map((n) => {
                    const Icon = typeIcons[n.type] || Bell;
                    return (
                      <Card
                        key={n.id}
                        className={cn(
                          'border-border cursor-pointer transition-colors hover:bg-muted/30',
                          !n.read && 'bg-primary/5 border-primary/20'
                        )}
                         onClick={() => void handleClick(n.id, n.link)}
                      >
                        <CardContent className="p-4 flex items-start gap-3">
                          <div className={cn('p-2 rounded-lg shrink-0', !n.read ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn('font-medium text-sm', !n.read && 'text-foreground')}>{n.title}</span>
                              <span className="text-xs text-muted-foreground shrink-0">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">{n.description}</p>
                          </div>
                          {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </PageTransition>
    </RequireAuth>
  );
};

export default NotificationsPage;
