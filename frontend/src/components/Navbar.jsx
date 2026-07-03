import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Trophy, Calendar, User, LogOut, LayoutDashboard, Network, ShieldCheck, BookOpen, Gift } from 'lucide-react';
import { isAlbumBeta } from '../utils/album';
import { useAlbumCtx } from '../contexts/AlbumContext';
import andersenLogo from '../assets/andersen-logo-white-red.png';
import mundialistaLogo from '../assets/mundialista.png';
import { currentVersionLabel } from '../hooks/useVersionCheck';
import BellFeed from './BellFeed';
import Avatar from './Avatar';

const AVATAR_COLORS = [
  'bg-red-800', 'bg-rose-700', 'bg-red-700', 'bg-rose-800',
  'bg-red-900', 'bg-rose-900', 'bg-red-600', 'bg-rose-600',
];

export default function Navbar({ unread = 0, onBellOpen }) {
  const { user, logout } = useAuth();
  const album            = useAlbumCtx();
  const albumAlert       = !!album?.canPlayNow;
  const location         = useLocation();
  const navigate         = useNavigate();
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const navLinks = [
    { to: '/dashboard',   label: 'Inicio',     icon: <LayoutDashboard size={14} /> },
    { to: '/matches',     label: 'Partidos',   icon: <Calendar size={14} /> },
    { to: '/leaderboard', label: 'Posiciones', icon: <Trophy size={14} /> },
    { to: '/vs',          label: 'Vs 👊⚡👊',   icon: null },
    { to: '/bracket',     label: 'Llaves',     icon: <Network size={14} /> },
    { to: '/prizes',      label: 'Premios 🎁', icon: <Gift size={14} />, highlight: true },
    ...(isAlbumBeta(user?.username) ? [
      { to: '/album',   label: 'Álbum 📒', icon: <BookOpen size={14} />, alert: albumAlert },
    ] : []),
    ...(user?.isAdmin ? [
      { to: '/admin',   label: 'Admin',  icon: <ShieldCheck size={14} /> },
    ] : []),
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
          <Link to="/dashboard" className="flex items-center group min-w-0">
            <div className="flex flex-col items-start leading-none">
              <img src={andersenLogo} alt="Andersen" className="h-7 w-auto" />
              <img src={mundialistaLogo} alt="Mundialista" className="h-5 w-auto" style={{ marginTop: '-2px' }} />
            </div>
          </Link>

          {/* ── Desktop nav ── */}
          <div className="hidden md:flex items-center gap-0">
            {/* Versión */}
            <span className="text-[10px] font-mono px-2 py-0.5 rounded mr-2 select-none"
              style={{ color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              title="Versión de la app">
              v {currentVersionLabel}
            </span>
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative flex items-center gap-1.5 px-4 py-5 text-[13px] font-semibold transition-colors duration-150 ${link.highlight ? 'prize-pulse' : ''}`}
                style={{ color: link.highlight ? '#FFD100' : isActive(link.to) ? '#ffffff' : 'rgba(255,255,255,0.42)', fontWeight: link.highlight ? 900 : undefined }}
                onMouseEnter={(e) => { if (!isActive(link.to) && !link.highlight) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
                onMouseLeave={(e) => { if (!isActive(link.to) && !link.highlight) e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
              >
                {link.highlight && <span className="point-finger" aria-hidden="true">👉</span>}
                {link.icon}
                {link.label}
                {link.alert && (
                  <span className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD100', boxShadow: '0 0 8px #FFD100', marginLeft: 2 }} />
                )}
                {isActive(link.to) && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full" style={{ background: '#E4002B' }} />
                )}
              </Link>
            ))}
          </div>

          {/* ── User section ── */}
          <div className="flex items-center gap-1">
            <BellFeed unread={unread} onOpen={onBellOpen} />
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 transition-all"
                style={{ background: profileOpen ? 'rgba(228,0,43,0.1)' : 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(228,0,43,0.08)'; }}
                onMouseLeave={(e) => { if (!profileOpen) e.currentTarget.style.background = 'transparent'; }}
              >
                <Avatar username={user?.username} initials={user?.avatarInitials || '??'} displayName={user?.displayName} size={30} colorClass={avatarColor} clickable={false} />
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
              className="md:hidden p-2 rounded-lg transition-all relative"
              style={{ color: 'rgba(255,255,255,0.5)' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
              {albumAlert && !menuOpen && (
                <span className="live-dot absolute top-1 right-1" style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD100', boxShadow: '0 0 8px #FFD100' }} />
              )}
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
                className={`flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-medium transition-all ${link.highlight ? 'prize-pulse' : ''}`}
                style={{
                  color:      link.highlight ? '#FFD100' : isActive(link.to) ? 'white' : 'rgba(255,255,255,0.48)',
                  fontWeight: link.highlight ? 900 : undefined,
                  background: link.highlight ? undefined : isActive(link.to) ? 'rgba(228,0,43,0.1)' : 'transparent',
                  borderLeft: isActive(link.to) ? '2px solid #E4002B' : '2px solid transparent',
                }}
                onClick={() => setMenuOpen(false)}
              >
                {link.highlight && <span className="point-finger" aria-hidden="true">👉</span>}
                {link.icon}
                {link.label}
                {link.alert && (
                  <span className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFD100', boxShadow: '0 0 8px #FFD100' }} />
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {profileOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />}
    </nav>
  );
}
