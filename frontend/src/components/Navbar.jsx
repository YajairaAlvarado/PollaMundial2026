import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Trophy, Calendar, User, LogOut } from 'lucide-react';

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
    { to: '/matches', label: 'Partidos', icon: <Calendar size={16} /> },
    { to: '/leaderboard', label: 'Tabla de Posiciones', icon: <Trophy size={16} /> },
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  // Avatar background colors based on initials
  const avatarColors = [
    'bg-purple-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600',
    'bg-orange-600', 'bg-teal-600', 'bg-indigo-600', 'bg-pink-600',
  ];
  const colorIdx = user ? (user.username.charCodeAt(0) % avatarColors.length) : 0;
  const avatarColor = avatarColors[colorIdx];

  return (
    <nav className="navbar-glass sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <span className="text-2xl group-hover:animate-spin-slow transition-all">⚽</span>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg">Mundial 2026</span>
              <span className="text-yellow-400 font-bold text-lg"> Predictor</span>
            </div>
            <div className="sm:hidden">
              <span className="text-yellow-400 font-bold text-base">M2026</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(link.to)
                    ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>

          {/* User section */}
          <div className="flex items-center gap-3">
            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 hover:bg-white/10 rounded-xl px-3 py-2 transition-all"
              >
                <div className={`avatar-circle ${avatarColor} text-white text-sm`}>
                  {user?.avatarInitials || '??'}
                </div>
                <span className="hidden sm:block text-white text-sm font-medium max-w-[120px] truncate">
                  {user?.displayName}
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 glass-card-dark rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-white font-semibold text-sm truncate">{user?.displayName}</p>
                    <p className="text-white/50 text-xs truncate">{user?.department}</p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/profile"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      onClick={() => setProfileOpen(false)}
                    >
                      <User size={15} />
                      Mi Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <LogOut size={15} />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/10 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive(link.to)
                    ? 'bg-yellow-400/20 text-yellow-400'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Close dropdowns on outside click */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileOpen(false)}
        />
      )}
    </nav>
  );
}
