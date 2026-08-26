import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RoleRoute } from './RoleRoute';
import * as authLib from '../lib/auth.js';

// Mock the AuthContext
vi.mock('../lib/auth.js', () => ({
  useAuth: vi.fn(),
}));

describe('RoleRoute Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });
  it('shows loading state when auth is initializing', () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: true,
      session: null,
      user: null,
      roles: [],
    });

    render(
      <MemoryRouter initialEntries={['/ops']}>
        <Routes>
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/ops" element={<div>Ops Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Authorizing...')).toBeDefined();
  });

  it('redirects to login if user is not authenticated', () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: null,
      user: null,
      roles: [],
    });

    render(
      <MemoryRouter initialEntries={['/ops']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/ops" element={<div>Ops Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page')).toBeDefined();
  });

  it('shows Access Denied if user is authenticated but lacks required role', () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: { access_token: '123' } as any,
      user: { id: 'abc' } as any,
      roles: ['candidate'],
    });

    render(
      <MemoryRouter initialEntries={['/ops']}>
        <Routes>
          <Route element={<RoleRoute allowedRoles={['admin']} />}>
            <Route path="/ops" element={<div>Ops Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Denied')).toBeDefined();
    expect(screen.queryByText('Ops Dashboard')).toBeNull();
  });

  it('renders content if user is authenticated and has required role', () => {
    vi.mocked(authLib.useAuth).mockReturnValue({
      loading: false,
      session: { access_token: '123' } as any,
      user: { id: 'abc' } as any,
      roles: ['admin'],
    });

    render(
      <MemoryRouter initialEntries={['/ops']}>
        <Routes>
          <Route element={<RoleRoute allowedRoles={['admin', 'recruiter']} />}>
            <Route path="/ops" element={<div>Ops Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Ops Dashboard')).toBeDefined();
    expect(screen.queryByText('Access Denied')).toBeNull();
  });
});
