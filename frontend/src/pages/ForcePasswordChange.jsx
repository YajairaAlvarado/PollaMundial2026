import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import andersenLogo from '../assets/andersen-logo-white-red.png';
import mundialistaLogo from '../assets/mundialista.png';
import canchaBg from '../assets/papelitos2.jpg';

export default function ForcePasswordChange() {
  const { changePassword, updateUser, user } = useAuth();
  const [newPassword, setNewPassword]       = useState('');
  const [confirm, setConfirm]               = useState('');
  const [showNew, setShowNew]               = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const inputStyle = { background: '#F5F5F5', border: '1px solid #DDD', caretColor: '#E4002B', color: '#111' };
  const focusStyle = { borderColor: '#E4002B', boxShadow: '0 0 0 3px rgba(228,0,43,0.15)', background: '#FFF' };
  const blurStyle  = { borderColor: '#DDD', boxShadow: 'none', background: '#F5F5F5' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      // Cambiar contraseña en Supabase Auth (la actual es Mundial2026)
      await changePassword('Mundial2026', newPassword);

      // Marcar must_change_password = false en el perfil
      await supabase.from('users').update({ must_change_password: false }).eq('id', user.id);

      // Actualizar user en contexto para que App.jsx re-evalúe
      updateUser({ ...user, mustChangePassword: false });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña');
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundImage: `url(${canchaBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#1C0000' }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,0,0,0.28) 0%, rgba(10,0,0,0.22) 35%, rgba(10,0,0,0.45) 100%)' }} />

      <div className="w-full max-w-[420px] relative z-10">
        <div className="text-center mb-5 flex flex-col items-center gap-0">
          <img src={andersenLogo} alt="Andersen" className="w-72"
            style={{ filter: 'drop-shadow(0 3px 12px rgba(0,0,0,0.8))', marginBottom: '-8px' }} />
          <img src={mundialistaLogo} alt="Mundialista" className="w-[400px] max-w-full"
            style={{ filter: 'drop-shadow(0 3px 14px rgba(0,0,0,0.7))' }} />
        </div>

        <div className="rounded-2xl p-6"
          style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 8px 40px rgba(0,0,0,0.35)' }}>

          <div className="flex items-center gap-2 mb-4">
            <Lock size={18} style={{ color: '#E4002B' }} />
            <div>
              <h2 className="font-bold text-sm text-gray-800">Cambia tu contraseña</h2>
              <p className="text-xs text-gray-400">Debes elegir una contraseña personal para continuar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(0,0,0,0.45)' }}>
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-gray-800 text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                  onBlur={(e)  => Object.assign(e.target.style, blurStyle)}
                />
                <button type="button" onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0,0,0,0.35)' }}>
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'rgba(0,0,0,0.45)' }}>
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-gray-800 text-sm outline-none transition-all"
                  style={inputStyle}
                  onFocus={(e) => Object.assign(e.target.style, focusStyle)}
                  onBlur={(e)  => Object.assign(e.target.style, blurStyle)}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(0,0,0,0.35)' }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background: 'rgba(228,0,43,0.12)', border: '1px solid rgba(228,0,43,0.3)' }}>
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all mt-2 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #E4002B, #B5001F)', color: '#FFFFFF' }}>
              <CheckCircle size={15} />
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.28)' }}>
            © Andersen Ecuador · Campaña Interna 2026
          </p>
        </div>
      </div>
    </div>
  );
}
