import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Trophy, Calendar, User, LogOut, LayoutDashboard, Network } from 'lucide-react';
import andersenLogo from '../assets/andersen-logo-white-red.png';

const AVATAR_COLORS = [
  'bg-red-800', 'bg-rose-700', 'bg-red-700', 'bg-rose-800',
  'bg-red-900', 'bg-rose-900', 'bg-red-600', 'bg-rose-600',
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location         = useLocation();
  const navigate         = useNavigate();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = [
    { to: '/dashboard',   label: 'Inicio',     icon: <LayoutDashboard size={14} /> },
    { to: '/matches',     label: 'Partidos',   icon: <Calendar size={14} /> },
    { to: '/bracket',     label: 'Llaves',     icon: <Network size={14} /> },
    { to: '/leaderboard', label: 'Posiciones', icon: <Trophy size={14} /> },
  ];

  const isActive   = (path) => location.pathname.startsWith(path);
  const colorIdx   = user ? (user.username.charCodeAt(0) % AVATAR_COLORS.length) : 0;
  const avatarColor = AVATAR_COLORS[colorIdx];

  return (
    <nav className="sticky top-0 z-50"
      style={{ background: 'rgba(12, 0, 0, 0.97)', borderBottom: '1px solid rgba(228,0,43,0.2)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">

          {/* ── Logo ── */}
          <Link to="/dashboard" className="flex items-center gap-3 group min-w-0">
            <img src={andersenLogo} alt="Andersen" className="h-10 w-auto flex-shrink-0" />
            <div className="hidden sm:flex flex-col leading-none">
              <span
                className="font-black text-white uppercase text-[17px]"
                style={{ fontFamily: "'Barlow Condensed', Impact, sans-serif", fontStyle: 'italic', letterSpacing: '0.04em', lineHeight: 1 }}
              >
                MUNDIALISTA
              </span>
              <span className="text-[10px] font-bold tracking-widest" style={{ color: '#E4002B' }}>
                2026 🇪🇨
              </span>
            </div>
            <span
              className="sm:hidden font-black text-[14px]"
              style={{ fontFamily: "'Barlow Condensed', Impact, sans-serif", fontStyle: 'italic', color: '#E4002B' }}
            >
              MUNDIALISTA
            </span>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative flex items-center gap-1.5 px-4 py-5 text-[13px] font-semibold transition-colors duration-150"
                style={{ color: isActive(link.to) ? '#ffffff' : 'rgba(255,255,255,0.42)' }}
                onMouseEnter={(e) => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                onMouseLeave={(e) => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
              >
                {link.icon}
                {link.label}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: '#E4002B' }} />
                )}
              </Link>
            ))}
          </div>

          {/* ── User section ── */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all"
                style={{ background: profileOpen ? 'rgba(228,0,43,0.1)' : 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,0,43,0.08)'; }}
                onMouseLeave={(e) => { if (!profileOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                <div className={`avatar-circle ${avatarColor} text-white text-xs`}>
                  {user?.avatarInitials || '??'}
                </div>
                <span className="hidden sm:block text-[13px] font-medium max-w-[90px] truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {user?.displayName?.split(' ')[0]}
                </span>
              </button>

              {profileOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-2xl overflow-hidden z-50"
                  style={{ background: '#1A0000', border: '1px solid rgba(228,0,43,0.22)' }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(228,0,43,0.12)' }}>
                    <p className="text-white font-semibold text-sm truncate">{user?.displayName}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{user?.department}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all"
                      style={{ color: 'rgba(255,255,255,0.62)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,0,43,0.08)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.62)'; }}
                      onClick={() => setProfileOpen(false)}
                    >
                      <User size={14} />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all"
                      style={{ color: '#FF8080' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,0,43,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <LogOut size={14} />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="md:hidden p-2 rounded-lg transition-all"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {menuOpen && (
          <div className="md:hidden py-2 space-y-0.5" style={{ borderTop: '1px solid rgba(228,0,43,0.15)' }}>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  color:      isActive(link.to) ? 'white' : 'rgba(255,255,255,0.48)',
                  background: isActive(link.to) ? 'rgba(228,0,43,0.1)' : 'transparent',
                  borderLeft: isActive(link.to) ? '2px solid #E4002B' : '2px solid transparent',
                }}
                onClick={() => setMenuOpen(false)}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {profileOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />}
    </nav>
  );
}
