import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

import { RequireAuth, RequireRole } from './RouteGuards';

const mockUseAuthStore = vi.fn();
const mockSetLoginModalOpen = vi.fn();

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/stores/ui-store', () => ({
  useUIStore: () => ({ setLoginModalOpen: mockSetLoginModalOpen }),
}));

describe('RouteGuards', () => {
  it('renders children when authenticated', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true, isHydrated: true, user: { role: 'client' } });

    render(
      <MemoryRouter>
        <RequireAuth>
          <div>allowed</div>
        </RequireAuth>
      </MemoryRouter>
    );

    expect(screen.getByText('allowed')).toBeInTheDocument();
  });

  it('redirects and opens login modal when unauthenticated', async () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: false, isHydrated: true, user: null });

    render(
      <MemoryRouter>
        <RequireAuth>
          <div>blocked</div>
        </RequireAuth>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockSetLoginModalOpen).toHaveBeenCalledWith(true);
    });
  });

  it('blocks role mismatch', () => {
    mockUseAuthStore.mockReturnValue({ isAuthenticated: true, isHydrated: true, user: { role: 'client' } });

    render(
      <MemoryRouter>
        <RequireRole roles={['admin']}>
          <div>admin-only</div>
        </RequireRole>
      </MemoryRouter>
    );

    expect(screen.queryByText('admin-only')).not.toBeInTheDocument();
  });

  it('redirects blocked authenticated users away from protected routes', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isHydrated: true,
      user: { role: 'client', status: 'blocked' },
    });

    render(
      <MemoryRouter initialEntries={['/profile']}>
        <Routes>
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <div>profile</div>
              </RequireAuth>
            }
          />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('home')).toBeInTheDocument();
    expect(screen.queryByText('profile')).not.toBeInTheDocument();
  });
});
