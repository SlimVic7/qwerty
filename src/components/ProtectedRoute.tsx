import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';

export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
  }

  if (!session) {
    const returnTo = location.pathname + location.search;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} state={{ from: returnTo }} replace />;
  }

  return <Outlet />;
}
