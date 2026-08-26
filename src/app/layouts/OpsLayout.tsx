import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export function OpsLayout() {
  const navigate = useNavigate();

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
          <Link to="/0ps26/jobs" className="p-2 rounded hover:bg-slate-800 hover:text-white font-medium transition-colors">Jobs</Link>
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
