import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth-store';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Search, FileText, MessageSquare, Bell, Scale, AlertTriangle, Sparkles,
  LayoutDashboard, Briefcase, ClipboardList, UserCog,
  Shield, BarChart3, CheckCircle, User, Send, Inbox, Users, PlayCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TranslationKey } from '@/i18n/translations';

type NavItem = { to: string; labelKey: TranslationKey; icon: LucideIcon };

const clientNav: NavItem[] = [
  { to: '/providers', labelKey: 'nav.browse_providers', icon: Search },
  { to: '/my-requests', labelKey: 'nav.my_requests', icon: FileText },
  { to: '/my-bids', labelKey: 'nav.my_bids', icon: ClipboardList },
  { to: '/compare', labelKey: 'nav.compare', icon: Scale },
  { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { to: '/complaints', labelKey: 'nav.complaints', icon: AlertTriangle },
  { to: '/ai-recommend', labelKey: 'nav.ai_recommend', icon: Sparkles },
  { to: '/profile', labelKey: 'nav.profile', icon: User },
];

const providerNav: NavItem[] = [
  { to: '/provider/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/provider/services', labelKey: 'nav.my_services', icon: Briefcase },
  { to: '/provider/requests', labelKey: 'nav.incoming_requests', icon: Inbox },
  { to: '/provider/offers', labelKey: 'nav.sent_offers', icon: Send },
  { to: '/provider/in-progress', labelKey: 'nav.in_progress', icon: PlayCircle },
  { to: '/provider/earnings', labelKey: 'nav.earnings', icon: BarChart3 },
  { to: '/provider/profile', labelKey: 'nav.profile_settings', icon: UserCog },
  { to: '/provider/verification', labelKey: 'nav.verification', icon: Shield },
  { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell },
];

const adminNav: NavItem[] = [
  { to: '/admin/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/admin/verification', labelKey: 'nav.verification', icon: CheckCircle },
  { to: '/admin/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { to: '/admin/complaints', labelKey: 'nav.complaints', icon: Shield },
  { to: '/notifications', labelKey: 'nav.notifications', icon: Bell },
  { to: '/admin/accounts', labelKey: 'nav.accounts', icon: Users },
];

export const SidebarNav = () => {
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const location = useLocation();

  const nav = user?.role === 'admin' ? adminNav : user?.role === 'provider' ? providerNav : clientNav;

  return (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map((item) => {
        const isActive = location.pathname === item.to;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <item.icon size={18} />
            {t(item.labelKey)}
          </NavLink>
        );
      })}
    </nav>
  );
};
