import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Trophy, Calendar, User, LogOut, LayoutDashboard, Network } from 'lucide-react';

const AVATAR_COLORS = [
  'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
  'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Inicio', icon: <LayoutDashboard size={14} /> },
    { to: '/matches', label: 'Partidos', icon: <Calendar size={14} /> },
    { to: '/bracket', label: 'Llaves', icon: <Network size={14} /> },
    { to: '/leaderboard', label: 'Posiciones', icon: <Trophy size={14} /> },
  ];

  const isActive = (path) => location.pathname.startsWith(path);
  const colorIdx = user ? (user.username.charCodeAt(0) % AVATAR_COLORS.length) : 0;
  const avatarColor = AVATAR_COLORS[colorIdx];

  return (
    <nav className="sticky top-0 z-50" style={{ background: '#0D1B30', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <span className="text-lg">⚽</span>
            <div className="hidden sm:flex items-baseline gap-1">
              <span className="text-white font-black text-[15px] tracking-tight">POLLA MUNDIAL</span>
              <span className="font-black text-[15px] tracking-tight" style={{ color: '#F59E0B' }}>2026</span>
            </div>
            <span className="sm:hidden font-black text-sm" style={{ color: '#F59E0B' }}>PM26</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="relative flex items-center gap-1.5 px-4 py-5 text-[13px] font-semibold transition-colors duration-150"
                style={{ color: isActive(link.to) ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
                onMouseEnter={(e) => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                onMouseLeave={(e) => { if (!isActive(link.to)) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
              >
                {link.icon}
                {link.label}
                {isActive(link.to) && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full"
                    style={{ background: '#F59E0B' }}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* User section */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all"
                style={{ background: profileOpen ? 'rgba(255,255,255,0.06)' : 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
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
                  style={{ background: '#0A1628', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    <p className="text-white font-semibold text-sm truncate">{user?.displayName}</p>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{user?.department}</p>
                  </div>
                  <div className="p-1.5">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all"
                      style={{ color: 'rgba(255,255,255,0.65)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                      onClick={() => setProfileOpen(false)}
                    >
                      <User size={14} />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all text-red-400"
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
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

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-2 space-y-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: isActive(link.to) ? 'white' : 'rgba(255,255,255,0.5)',
                  background: isActive(link.to) ? 'rgba(255,255,255,0.05)' : 'transparent',
                  borderLeft: isActive(link.to) ? '2px solid #F59E0B' : '2px solid transparent',
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

      {profileOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
      )}
    </nav>
  );
}
