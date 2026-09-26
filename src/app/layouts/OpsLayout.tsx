import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth.js';

export function OpsLayout() {
  const navigate = useNavigate();
  const { roles } = useAuth();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans">
      <aside className="w-64 bg-[#111111] text-slate-300 flex flex-col shadow-lg z-10">
        <div className="p-4 bg-[#0B3D2E] text-white">
          <Link to="/0ps26" className="text-xl font-bold tracking-tight">QWERTY Ops</Link>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link to="/0ps26" className="p-2 rounded hover:bg-slate-800 hover:text-white font-medium transition-colors">Overview</Link>
          <div className="flex flex-col gap-1 mt-2">
            <div className="p-2 font-medium text-slate-400 text-sm uppercase tracking-wider">Jobs</div>
            <Link to="/0ps26/jobs" className="p-2 ml-2 rounded hover:bg-slate-800 hover:text-white font-medium transition-colors text-sm">All Jobs</Link>
            <Link to="/0ps26/jobs/new" className="p-2 ml-2 rounded hover:bg-slate-800 hover:text-white font-medium transition-colors text-sm">New Job</Link>
            <Link to="/0ps26/jobs/imports" className="p-2 ml-2 rounded hover:bg-slate-800 hover:text-white font-medium transition-colors text-sm">Bulk Import</Link>
          </div>
          {roles.includes('recruiter') && (
            <div className="flex flex-col gap-1 mt-2">
              <div className="p-2 font-medium text-slate-400 text-sm uppercase tracking-wider">Recruitment</div>
              <Link to="/0ps26/talent" className="p-2 ml-2 rounded hover:bg-slate-800 hover:text-white font-medium transition-colors text-sm">Talent Pool</Link>
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleSignOut} className="w-full p-2 text-left text-red-400 hover:bg-slate-800 rounded font-medium transition-colors">
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="p-4 border-b border-slate-200 bg-white shadow-sm shrink-0">
          <h2 className="text-lg font-semibold">Operations Workspace</h2>
        </div>
        <div className="p-6 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
