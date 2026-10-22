import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';

export function CandidateLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/candidate/dashboard', label: 'Dashboard' },
    { to: '/candidate/saved-jobs', label: 'Saved Jobs' },
    { to: '/candidate/job-alerts', label: 'Job Alerts' },
    { to: '/candidate/career', label: 'Career Hub' },
    { to: '/candidate/profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 w-full overflow-x-hidden">
      {/* Mobile Top App Header Bar (< md) */}
      <header className="md:hidden bg-[#0B3D2E] text-white p-4 flex items-center justify-between border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90">
            QWERTY
          </Link>
          <span className="text-xs bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded font-medium">
            Candidate Workspace
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          className="p-2 rounded-md hover:bg-emerald-900 focus:outline-none focus:ring-2 focus:ring-white transition-colors text-white"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Drawer / Sheet Backdrop (< md) */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Menu (< md) */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 transform transition-transform duration-200 ease-in-out flex flex-col border-r border-slate-200 shadow-xl ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-label="Mobile Candidate Navigation"
        aria-modal="true"
      >
        <div className="p-4 bg-[#0B3D2E] text-white flex items-center justify-between">
          <Link to="/" className="text-xl font-bold tracking-tight text-white">
            QWERTY
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 rounded text-emerald-100 hover:text-white hover:bg-emerald-800"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`p-3 rounded-md font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-[#0B3D2E] font-semibold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={handleSignOut}
            className="w-full p-3 text-left text-red-600 hover:bg-red-50 rounded-md font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>

      {/* Desktop Sidebar (>= md) */}
      <aside className="hidden md:flex md:w-64 bg-white border-r border-slate-200 flex-col shrink-0 min-h-screen sticky top-0 h-screen">
        <div className="p-4 bg-[#0B3D2E] text-white">
          <Link to="/" className="text-xl font-bold tracking-tight text-white hover:opacity-90">
            QWERTY
          </Link>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`p-2 rounded font-medium transition-colors ${
                  isActive ? 'bg-emerald-50 text-[#0B3D2E] font-semibold' : 'hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleSignOut}
            className="w-full p-2 text-left text-red-600 hover:bg-red-50 rounded font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Workspace Content Area */}
      <main className="flex-1 min-w-0 w-full overflow-x-hidden">
        <div className="hidden md:block p-4 border-b border-slate-200 bg-white">
          <h2 className="text-lg font-semibold">Candidate Workspace</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8 w-full min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

