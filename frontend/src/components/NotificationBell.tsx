import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { useDataStore } from '@/stores/data-store';
import { useNavigate } from 'react-router-dom';

export const NotificationBell = () => {
  const { user } = useAuthStore();
  const { notifications } = useDataStore();
  const navigate = useNavigate();
  const visibleNotifications = user?.role === 'admin'
    ? notifications.filter((notification) => notification.userId === user.id && ['complaint', 'verification'].includes(notification.type))
    : notifications.filter((notification) => notification.userId === user?.id);
  const unread = visibleNotifications.filter((notification) => !notification.read).length;

  return (
    <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/notifications')}>
      <Bell size={20} />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {unread}
        </span>
      )}
    </Button>
  );
};
