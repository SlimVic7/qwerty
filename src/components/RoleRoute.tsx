import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';

interface RoleRouteProps {
  allowedRoles: string[];
}

export function RoleRoute({ allowedRoles }: RoleRouteProps) {
  const { session, roles, loading } = useAuth();

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Authorizing...</div>;
  }

  if (!session) {
    // Treat as totally unauthenticated -> login
    return <Navigate to="/login" replace />;
  }

  const hasAllowedRole = allowedRoles.some(role => roles.includes(role));

  if (!hasAllowedRole) {
    // If authenticated but unauthorized, show an access denied or just redirect
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 font-sans">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 max-w-md text-center">
          <h1 className="text-2xl font-bold text-[#0B3D2E] mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">You do not have permission to access this area.</p>
          <a href="/" className="inline-block bg-[#0B3D2E] text-white px-6 py-2 rounded font-medium hover:bg-[#1E6B50] transition-colors">Return to Home</a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
