import React, { useState } from 'react';
import { HashRouter, BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AvatarProvider } from './contexts/AvatarContext';
import { isStandalone } from './utils/api';
import { useVersionCheck, currentVersionLabel } from './hooks/useVersionCheck';
import { usePredictionBroadcast } from './hooks/usePredictionBroadcast';
import { usePresence } from './hooks/usePresence';
import { useNudges } from './hooks/useNudges';
import Navbar from './components/Navbar';
import PredictionToastContainer from './components/PredictionToast';
import NudgePopupContainer from './components/NudgePopup';
import PresenceBar from './components/PresenceBar';
import ConnectionToastContainer from './components/ConnectionToast';
import LoadingSpinner from './components/LoadingSpinner';
import Login from './pages/Login';
import ForcePasswordChange from './pages/ForcePasswordChange';
import Admin from './pages/Admin';
import Dashboard from './pages/Dashboard';
import Matches from './pages/Matches';
import Leaderboard from './pages/Leaderboard';
import Bracket from './pages/Bracket';
import Profile from './pages/Profile';
import Vs from './pages/Vs';

function ProtectedLayout() {
  const { isAuthenticated, loading, user } = useAuth();
  const { toasts, dismiss, unread, markRead } = usePredictionBroadcast(user?.id);
  const canNudge    = !!user; // ahora todos pueden mandar/recibir guiños
  const [nudgeTarget, setNudgeTarget] = useState(null); // abrir envío de guiño desde la notificación
  // Todos mandan heartbeat (para aparecer como conectados); todos observan la lista
  const { onlineUsers, connectionAlerts, dismissAlert } = usePresence(user?.id, canNudge);
  const { incoming, dismiss: dismissNudge, reply: replyNudge, send: sendNudge } = useNudges(canNudge ? user?.id : null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Iniciando aplicación..." />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <Navbar unread={unread} onBellOpen={markRead} />
      <PredictionToastContainer toasts={toasts} onDismiss={dismiss} />
      {canNudge && (
        <>
          <PresenceBar currentUser={user} onlineUsers={onlineUsers} onSendNudge={sendNudge}
            externalTarget={nudgeTarget} onExternalTargetConsumed={() => setNudgeTarget(null)} />
          <NudgePopupContainer nudges={incoming} onDismiss={dismissNudge} onReply={replyNudge} />
          <ConnectionToastContainer alerts={connectionAlerts} onDismiss={dismissAlert}
            onNudge={(a) => { setNudgeTarget(a); dismissAlert(a._alertId); }} />
        </>
      )}
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Iniciando aplicación..." />
      </div>
    );
  }

  // Si está autenticado pero debe cambiar contraseña, bloquear toda la app
  if (isAuthenticated && user?.mustChangePassword) {
    return <ForcePasswordChange />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/bracket" element={<Bracket />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/vs" element={<Vs />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
}

function UpdateBanner() {
  const { updateAvailable, serverVersion } = useVersionCheck();
  if (!updateAvailable) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between px-4 py-2.5 gap-3"
      style={{ background: '#E4002B', boxShadow: '0 2px 12px rgba(228,0,43,0.5)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
        <p className="text-white text-sm font-bold">🚀 Hay una nueva versión disponible</p>
        <p className="text-white/75 text-xs">
          Tu versión: <span className="font-semibold text-white">{currentVersionLabel}</span>
          {serverVersion && (
            <> · Servidor: <span className="font-semibold text-white">{serverVersion}</span></>
          )}
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-black transition-all"
        style={{ background: 'white', color: '#E4002B' }}
      >
        Actualizar ahora
      </button>
    </div>
  );
}

const Router = isStandalone ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <UpdateBanner />
      <AuthProvider>
        <AvatarProvider>
          <AppRoutes />
        </AvatarProvider>
      </AuthProvider>
    </Router>
  );
}
