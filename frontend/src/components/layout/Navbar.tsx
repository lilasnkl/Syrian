import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Menu, Zap, LogOut, User, LayoutDashboard, Sun, Moon, Globe } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SidebarNav } from './SidebarNav';

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { setLoginModalOpen, theme, setTheme } = useUIStore();
  const { t, language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(location.pathname === '/providers' ? params.get('search') ?? '' : '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    const trimmedSearch = search.trim();
    const currentParams = location.pathname === '/providers' ? new URLSearchParams(location.search) : new URLSearchParams();
    const currentSearch = location.pathname === '/providers' ? currentParams.get('search') ?? '' : '';

    if (trimmedSearch === currentSearch) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const nextParams = location.pathname === '/providers' ? new URLSearchParams(location.search) : new URLSearchParams();
      if (trimmedSearch) {
        nextParams.set('search', trimmedSearch);
      } else {
        nextParams.delete('search');
      }

      navigate(
        {
          pathname: '/providers',
          search: nextParams.toString() ? `?${nextParams.toString()}` : '',
        },
        { replace: location.pathname === '/providers' }
      );
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [location.pathname, location.search, navigate, search]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = search.trim();
    const params = location.pathname === '/providers' ? new URLSearchParams(location.search) : new URLSearchParams();
    if (query) {
      params.set('search', query);
    } else {
      params.delete('search');
    }

    navigate(
      {
        pathname: '/providers',
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: location.pathname === '/providers' }
    );
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side={language === 'ar' ? 'right' : 'left'} className="w-72 bg-sidebar border-sidebar-border p-0">
              <div className="p-4 border-b border-sidebar-border">
                <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-foreground">
                  <Zap className="text-primary" size={22} /> {t('app.name')}
                </Link>
              </div>
              <SidebarNav />
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-foreground">
            <Zap className="text-primary" size={22} />
            <span className="hidden sm:inline">{t('app.name')}</span>
          </Link>
        </div>

        <div className="flex-1 max-w-md hidden md:block">
          <form className="flex items-center gap-2" onSubmit={handleSearchSubmit}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" size={16} />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('nav.search_placeholder')}
                className="w-full h-9 rounded-lg border border-input bg-secondary/50 pl-9 pr-4 rtl:pl-4 rtl:pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="gap-2">
              <Search size={16} /> {t('search')}
            </Button>
          </form>
        </div>

        <div className="flex items-center gap-1">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            title={language === 'en' ? 'العربية' : 'English'}
          >
            <Globe size={18} />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </Button>

          {isAuthenticated && user ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full" />
                    <span className="hidden sm:inline text-sm font-medium">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
                  <DropdownMenuItem onClick={() => navigate(user.role === 'provider' ? '/provider/dashboard' : user.role === 'admin' ? '/admin/dashboard' : '/my-requests')}>
                    <LayoutDashboard size={16} className="mr-2 rtl:mr-0 rtl:ml-2" /> {t('nav.dashboard')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User size={16} className="mr-2 rtl:mr-0 rtl:ml-2" /> {t('nav.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={async () => { await logout(); navigate('/'); }}>
                    <LogOut size={16} className="mr-2 rtl:mr-0 rtl:ml-2" /> {t('sign_out')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => setLoginModalOpen(true)} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              {t('sign_in')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
