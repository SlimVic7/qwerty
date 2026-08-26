import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';

export function ProtectedRoute() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading profile...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
