import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-[#111111] font-sans">
      <header className="bg-[#0B3D2E] text-white p-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link to="/" className="text-xl font-bold tracking-tight">QWERTY</Link>
          <nav className="flex gap-6 items-center">
            <Link to="/jobs" className="hover:text-slate-200 transition-colors font-medium">Jobs</Link>
            <Link to="/career" className="hover:text-slate-200 transition-colors font-medium">Career Hub</Link>
            <div className="w-px h-5 bg-slate-500 mx-2 hidden sm:block"></div>
            <Link to="/login" className="hover:text-slate-200 transition-colors font-medium">Sign In</Link>
            <Link to="/register" className="bg-white text-[#0B3D2E] px-4 py-2 rounded font-semibold hover:bg-slate-100 transition-colors">Get Started</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full bg-white shadow-sm border-x border-slate-200 min-h-full">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-slate-200 p-6 text-center text-sm text-slate-500">
        &copy; 2026 QWERTY
      </footer>
    </div>
  );
}
