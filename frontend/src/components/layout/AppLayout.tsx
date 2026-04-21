import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { SidebarNav } from './SidebarNav';
import { useAuthStore } from '@/stores/auth-store';

export const AppLayout = () => {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex">
        {isAuthenticated && user?.status !== 'blocked' && (
          <aside className="hidden lg:block w-64 shrink-0 border-r border-border bg-sidebar sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
            <SidebarNav />
          </aside>
        )}
        <main className="flex-1 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
