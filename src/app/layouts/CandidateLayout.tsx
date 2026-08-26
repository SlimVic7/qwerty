import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export function CandidateLayout() {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 bg-[#0B3D2E] text-white">
          <Link to="/" className="text-xl font-bold tracking-tight">QWERTY</Link>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          <Link to="/candidate" className="p-2 rounded hover:bg-slate-100 font-medium">Dashboard</Link>
          <Link to="/candidate/profile" className="p-2 rounded hover:bg-slate-100 font-medium">Profile</Link>
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button onClick={handleSignOut} className="w-full p-2 text-left text-red-600 hover:bg-red-50 rounded font-medium transition-colors">
            Sign Out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-semibold">Candidate Workspace</h2>
        </div>
        <div className="p-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
