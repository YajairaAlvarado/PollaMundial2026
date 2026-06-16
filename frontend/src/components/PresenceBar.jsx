import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { Minus, Plus } from 'lucide-react';
import { CARITAS } from '../utils/caritas';

const AVATAR_COLORS = [
  'bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600',
  'bg-orange-600','bg-teal-600','bg-indigo-600','bg-pink-600',
  'bg-cyan-600','bg-amber-600','bg-lime-600','bg-red-600',
];

// ── Paso 1: elegir tipo de guiño ──────────────────────────────────────────────
function StepType({ target, onSelect, onClose }) {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${AVATAR_COLORS[(target.display_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]}`}>
          {target.avatar_initials}
        </div>
        <p className="text-white text-sm font-bold flex-1 truncate">{target.display_name}</p>
        <button onClick={onClose}><X size={14} style={{ color: 'rgba(255,255,255,0.3)' }} /></button>
      </div>
      <div className="p-3 space-y-2">
        <button onClick={() => onSelect('free')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-xl">💬</span>
          <div>
            <p className="text-white text-sm font-semibold">Mensaje libre</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Escríbele lo que quieras</p>
          </div>
        </button>
        <button onClick={() => onSelect('match_wink')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all hover:bg-white/5"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <span className="text-xl">⚽</span>
          <div>
            <p className="text-white text-sm font-semibold">Guiño por partido</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>Partidos que aún no ha pronosticado</p>
          </div>
        </button>
      </div>
    </div>
  );
}

// ── Paso 2a: mensaje libre ────────────────────────────────────────────────────
function StepFree({ onSend, onBack }) {
  const [text, setText]     = useState('');
  const [carita, setCarita] = useState(CARITAS[0].e);
  return (
    <div className="p-3 space-y-3">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe tu mensaje..."
        rows={3}
        className="w-full rounded-xl px-3 py-2 text-sm text-white outline-none resize-none"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
      />
      <CaritaSelector value={carita} onChange={setCarita} />
      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>← Atrás</button>
        <button
          onClick={() => text.trim() && onSend({ type: 'free', message: text.trim(), tone: carita })}
          disabled={!text.trim()}
          className="flex-1 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
          style={{ background: 'rgba(167,139,250,0.25)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' }}>
          Enviar {carita}
        </button>
      </div>
    </div>
  );
}

// ── Paso 2b: elegir partido no pronosticado ───────────────────────────────────
function StepMatchPick({ target, onSelect, onBack }) {
  const [matches, setMatches] = useState(null);

  useEffect(() => {
    async function load() {
      // Partidos pendientes
      const { data: scheduled } = await supabase
        .from('matches')
        .select('id, home_team, away_team, home_code, away_code, match_date')
        .eq('status', 'scheduled')
        .order('match_date');

      if (!scheduled?.length) { setMatches([]); return; }

      // Predicciones ya hechas por el target
      const { data: preds } = await supabase
        .from('predictions')
        .select('match_id')
        .eq('user_id', target.id);

      const done = new Set((preds || []).map((p) => p.match_id));
      setMatches(scheduled.filter((m) => !done.has(m.id)));
    }
    load();
  }, [target.id]);

  if (matches === null) return <p className="text-center py-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Cargando...</p>;

  return (
    <div>
      <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>
          ⚽ Partidos sin pronosticar de {target.display_name.split(' ')[0]}
        </p>
      </div>
      <div className="max-h-48 overflow-y-auto">
        {matches.length === 0
          ? <p className="text-center py-6 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>¡Ya pronosticó todos los partidos!</p>
          : matches.map((m) => {
            const dt = new Date(m.match_date).toLocaleDateString('es-EC', { day: 'numeric', month: 'short' });
            return (
              <button key={m.id} onClick={() => onSelect(m)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-all hover:bg-white/5"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {m.home_code && <img src={`https://flagcdn.com/16x12/${m.home_code}.png`} alt="" className="rounded flex-shrink-0" />}
                <span className="text-white text-xs font-semibold truncate flex-1">{m.home_team} vs {m.away_team}</span>
                {m.away_code && <img src={`https://flagcdn.com/16x12/${m.away_code}.png`} alt="" className="rounded flex-shrink-0" />}
                <span className="text-[10px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{dt}</span>
              </button>
            );
          })
        }
      </div>
      <div className="p-2">
        <button onClick={onBack} className="w-full py-1.5 rounded-lg text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>← Atrás</button>
      </div>
    </div>
  );
}

// ── Selector de caritas ───────────────────────────────────────────────────────
function CaritaSelector({ value, onChange }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
        Elige una carita
      </p>
      <div className="grid grid-cols-5 gap-1.5">
        {CARITAS.map((c) => (
          <button key={c.e} onClick={() => onChange(c.e)}
            title={c.label}
            className="flex items-center justify-center rounded-xl transition-all"
            style={{
              fontSize: 22, padding: '6px 0',
              background: value === c.e ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${value === c.e ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.08)'}`,
              transform: value === c.e ? 'scale(1.12)' : 'scale(1)',
            }}>
            {c.e}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepScore({ match, onSend, onBack }) {
  const [home, setHome]     = useState(1);
  const [away, setAway]     = useState(0);
  const [carita, setCarita] = useState(CARITAS[0].e);
  const [msg,  setMsg]      = useState('');

  return (
    <div className="p-3 space-y-3">
      <p className="text-center text-xs font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {match.home_team} vs {match.away_team}
      </p>
      {/* Score picker */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setHome(Math.max(0, home - 1))} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><Minus size={11} className="text-white" /></button>
          <span className="text-white font-black text-2xl w-6 text-center">{home}</span>
          <button onClick={() => setHome(home + 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><Plus size={11} className="text-white" /></button>
        </div>
        <span className="text-white/30 font-black text-xl">–</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setAway(Math.max(0, away - 1))} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><Minus size={11} className="text-white" /></button>
          <span className="text-white font-black text-2xl w-6 text-center">{away}</span>
          <button onClick={() => setAway(away + 1)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}><Plus size={11} className="text-white" /></button>
        </div>
      </div>
      <input value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Mensaje opcional..." className="w-full rounded-xl px-3 py-2 text-xs text-white outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
      <CaritaSelector value={carita} onChange={setCarita} />
      <div className="flex gap-2">
        <button onClick={onBack} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}>← Atrás</button>
        <button onClick={() => onSend({ type: 'match_wink', match_id: match.id, home_team: match.home_team, away_team: match.away_team, home_code: match.home_code, away_code: match.away_code, suggested_home: home, suggested_away: away, tone: carita, message: msg.trim() || null })}
          className="flex-1 py-2 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(167,139,250,0.25)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)' }}>
          Enviar {carita}
        </button>
      </div>
    </div>
  );
}

// ── Panel de envío ────────────────────────────────────────────────────────────
function NudgeSender({ target, currentUser, onSend, onClose }) {
  const [step,  setStep]  = useState('type');   // 'type' | 'free' | 'match_pick' | 'score'
  const [match, setMatch] = useState(null);

  const handleSend = async (payload) => {
    await onSend({
      from_user_id:   currentUser.id,
      to_user_id:     target.id,
      from_name:      currentUser.displayName,
      from_initials:  currentUser.avatarInitials,
      ...payload,
    });
    onClose();
  };

  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ width: 280, background: '#0f172a', border: '1px solid rgba(167,139,250,0.3)', boxShadow: '0 16px 48px rgba(0,0,0,0.8)' }}>
      {step === 'type'       && <StepType target={target} onSelect={(t) => setStep(t === 'free' ? 'free' : 'match_pick')} onClose={onClose} />}
      {step === 'free'       && <StepFree onSend={handleSend} onBack={() => setStep('type')} />}
      {step === 'match_pick' && <StepMatchPick target={target} onSelect={(m) => { setMatch(m); setStep('score'); }} onBack={() => setStep('type')} />}
      {step === 'score'      && match && <StepScore match={match} onSend={handleSend} onBack={() => setStep('match_pick')} />}
    </div>
  );
}

// ── Barra principal ───────────────────────────────────────────────────────────
export default function PresenceBar({ currentUser, onlineUsers, onSendNudge }) {
  const [open,   setOpen]   = useState(false);
  const [target, setTarget] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setTarget(null); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const count = onlineUsers.length;
  const sortedOnline = [...onlineUsers].sort((a, b) =>
    (a.display_name || '').localeCompare(b.display_name || '', 'es', { sensitivity: 'base' })
  );

  return (
    <div ref={ref} className="fixed bottom-4 left-1/2 z-[9970]" style={{ transform: 'translateX(-50%)' }}>
      {/* Panel flotante */}
      {open && (
        <div className="mb-2 rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: '#0f172a', border: '1px solid rgba(167,139,250,0.25)', minWidth: 220 }}>
          {target ? (
            <NudgeSender target={target} currentUser={currentUser} onSend={onSendNudge} onClose={() => setTarget(null)} />
          ) : (
            <div>
              <p className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                🟢 Conectados ahora
              </p>
              {count === 0
                ? <p className="px-4 py-4 text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Nadie más conectado</p>
                : sortedOnline.map((u) => {
                  const ci = (u.display_name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length;
                  return (
                    <button key={u.id} onClick={() => setTarget(u)}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left transition-all hover:bg-white/5"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="relative flex-shrink-0">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white ${AVATAR_COLORS[ci]}`}>
                          {u.avatar_initials}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#0f172a]" />
                      </div>
                      <span className="text-white text-xs font-semibold truncate">{u.display_name}</span>
                      <span className="ml-auto text-[10px]" style={{ color: 'rgba(167,139,250,0.7)' }}>guiñar →</span>
                    </button>
                  );
                })
              }
            </div>
          )}
        </div>
      )}

      {/* Botón toggle */}
      <button
        onClick={() => { setOpen((o) => !o); setTarget(null); }}
        className="flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl transition-all"
        style={{
          background: open ? 'rgba(167,139,250,0.25)' : 'rgba(15,23,42,0.95)',
          border: `1px solid ${open ? 'rgba(167,139,250,0.5)' : 'rgba(167,139,250,0.2)'}`,
          color: open ? '#a78bfa' : 'rgba(255,255,255,0.6)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
        }}>
        <span className="text-xs">🟢</span>
        <span className="text-xs font-bold">
          {count === 0 ? 'Nadie conectado' : `${count} conectado${count > 1 ? 's' : ''}`}
        </span>
        {open ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>
    </div>
  );
}
