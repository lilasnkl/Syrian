import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/i18n/LanguageContext';
import { Button } from '@/components/ui/button';
import { ShieldBan } from 'lucide-react';

export const BlockedAccountNotice = () => {
  const { user, logout, blockedNotice, clearBlockedNotice } = useAuthStore();
  const { t } = useLanguage();

  const isBlockedSession = user?.status === 'blocked';
  const blockedReason = isBlockedSession ? user?.blockReason : blockedNotice?.reason;

  if (!isBlockedSession && !blockedNotice) return null;

  const handleDismiss = async () => {
    if (isBlockedSession) {
      await logout();
      return;
    }

    clearBlockedNotice();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-md w-full mx-4 p-8 rounded-xl border border-destructive/30 bg-card text-center space-y-4">
        <ShieldBan className="h-16 w-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-bold">{t('blocked.title')}</h1>
        <p className="text-muted-foreground">{t('blocked.description')}</p>
        {blockedReason && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-start">
            <p className="text-xs font-semibold text-destructive mb-1">{t('blocked.reason')}</p>
            <p className="text-sm">{blockedReason}</p>
          </div>
        )}
        <Button variant="outline" onClick={() => void handleDismiss()} className="mt-4">
          {isBlockedSession ? t('sign_out') : t('close')}
        </Button>
      </div>
    </div>
  );
};
