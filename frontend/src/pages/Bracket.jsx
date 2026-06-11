import React, { useEffect, useState, useMemo } from 'react';
import { Network } from 'lucide-react';
import api from '../utils/api';
import canchaBg from '../assets/andersen-cancha.jpg';

const CARD_W = 160;
const CARD_H = 72;
const BASE = 80; // CARD_H + 8px gap
const COL_GAP = 52;
const LABEL_H = 44;

// firstTop: top offset of first match card in this round (within content area)
// stepH: vertical distance between consecutive match tops in this round
const ROUND_CONFIG = [
  { key: 'r32',   label: 'Ronda de 32',     firstTop: 0,   stepH: 80,  count: 16 },
  { key: 'r16',   label: 'Octavos de Final', firstTop: 40,  stepH: 160, count: 8  },
  { key: 'qf',    label: 'Cuartos de Final', firstTop: 120, stepH: 320, count: 4  },
  { key: 'sf',    label: 'Semifinales',      firstTop: 280, stepH: 640, count: 2  },
  { key: 'final', label: 'Gran Final',       firstTop: 600, stepH: 0,   count: 1  },
];

const BRACKET_CONTENT_H = 16 * BASE - 8; // 1272px (last R32 match bottom)
const TOTAL_W = ROUND_CONFIG.length * (CARD_W + COL_GAP) - COL_GAP; // 992px

function TeamRow({ team, code, score, isWinner, label, isTop }) {
  const hasTeam = !!team;
  return (
    <div
      style={{
        height: 35,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 8,
        paddingRight: 8,
        background: isWinner ? 'rgba(245,158,11,0.1)' : 'transparent',
        borderBottom: isTop ? '1px solid rgba(255,255,255,0.07)' : 'none',
      }}
    >
      {code ? (
        <img
          src={`https://flagcdn.com/16x12/${code}.png`}
          alt={team}
          style={{ width: 16, height: 12, borderRadius: 1, flexShrink: 0 }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      ) : (
        <div
          style={{
            width: 16, height: 12,
            background: 'rgba(255,255,255,0.07)',
            borderRadius: 1, flexShrink: 0,
          }}
        />
      )}
      <span
        style={{
          flex: 1, fontSize: 10,
          fontWeight: hasTeam ? 600 : 400,
          color: hasTeam
            ? (isWinner ? '#F59E0B' : 'rgba(255,255,255,0.9)')
            : 'rgba(255,255,255,0.25)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontStyle: hasTeam ? 'normal' : 'italic',
        }}
      >
        {team || label || 'Por definir'}
      </span>
      {score !== null && score !== undefined && (
        <span
          style={{
            fontSize: 12, fontWeight: 800,
            color: isWinner ? '#F59E0B' : 'rgba(255,255,255,0.45)',
            minWidth: 16, textAlign: 'center',
          }}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match, top, left }) {
  const finished = match.status === 'finished';
  const homeWinner = finished && match.home_score !== null && match.home_score > match.away_score;
  const awayWinner = finished && match.away_score !== null && match.away_score > match.home_score;

  return (
    <div
      style={{
        position: 'absolute',
        top: LABEL_H + top,
        left,
        width: CARD_W,
        height: CARD_H,
        background: '#0A1628',
        border: `1px solid ${finished ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <TeamRow
        team={match.home_team}
        code={match.home_code}
        score={match.home_score}
        isWinner={homeWinner}
        label={match.home_label}
        isTop
      />
      <TeamRow
        team={match.away_team}
        code={match.away_code}
        score={match.away_score}
        isWinner={awayWinner}
        label={match.away_label}
        isTop={false}
      />
    </div>
  );
}

function ThirdPlaceCard({ match }) {
  const finished = match.status === 'finished';
  const homeWinner = finished && match.home_score !== null && match.home_score > match.away_score;
  const awayWinner = finished && match.away_score !== null && match.away_score > match.home_score;

  return (
    <div
      style={{
        width: 240,
        height: CARD_H,
        background: '#0A1628',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <TeamRow
        team={match.home_team}
        code={match.home_code}
        score={match.home_score}
        isWinner={homeWinner}
        label={match.home_label}
        isTop
      />
      <TeamRow
        team={match.away_team}
        code={match.away_code}
        score={match.away_score}
        isWinner={awayWinner}
        label={match.away_label}
        isTop={false}
      />
    </div>
  );
}

export default function Bracket() {
  const [bracket, setBracket] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bracket')
      .then((r) => { setBracket(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Build all SVG connector paths between consecutive rounds
  const connectorPaths = useMemo(() => {
    const paths = [];
    for (let r = 0; r < ROUND_CONFIG.length - 1; r++) {
      const curr = ROUND_CONFIG[r];
      const next = ROUND_CONFIG[r + 1];
      const currRight = r * (CARD_W + COL_GAP) + CARD_W;
      const nextLeft = (r + 1) * (CARD_W + COL_GAP);
      const midX = currRight + COL_GAP / 2;

      for (let i = 0; i < next.count; i++) {
        // Centers of the two feeder matches in current round (in SVG coords, offset by LABEL_H)
        const topY    = LABEL_H + curr.firstTop + (2 * i)     * curr.stepH + CARD_H / 2;
        const bottomY = LABEL_H + curr.firstTop + (2 * i + 1) * curr.stepH + CARD_H / 2;
        // Center of the destination match in next round (equals midpoint of topY/bottomY)
        const midY    = LABEL_H + next.firstTop + i           * next.stepH + CARD_H / 2;

        paths.push(`M ${currRight} ${topY} H ${midX}`);
        paths.push(`M ${currRight} ${bottomY} H ${midX}`);
        paths.push(`M ${midX} ${topY} V ${bottomY}`);
        paths.push(`M ${midX} ${midY} H ${nextLeft}`);
      }
    }
    return paths;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando llaves...</p>
      </div>
    );
  }

  if (!bracket) return null;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]"
      style={{ backgroundImage: `url(${canchaBg})`, backgroundSize: 'cover', backgroundPosition: 'center top', backgroundAttachment: 'fixed' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(10,0,0,0.72) 0%, rgba(10,0,0,0.78) 100%)' }} />
    <div className="px-4 py-6 max-w-7xl mx-auto relative z-10">
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-white font-black text-xl flex items-center gap-2">
          <Network size={20} style={{ color: '#F59E0B' }} />
          Llaves · FIFA World Cup 2026™
        </h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Fase eliminatoria · 32 equipos clasificados — los slots se actualizan al finalizar grupos
        </p>
      </div>

      {/* Bracket container */}
      <div
        className="rounded-2xl"
        style={{ background: '#0D1B30', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 20px 24px' }}
      >
        <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: 4 }}>
          <div
            style={{
              position: 'relative',
              width: TOTAL_W,
              height: LABEL_H + BRACKET_CONTENT_H,
              minWidth: TOTAL_W,
            }}
          >
            {/* Round column labels */}
            {ROUND_CONFIG.map((rc, r) => (
              <div
                key={rc.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: r * (CARD_W + COL_GAP),
                  width: CARD_W,
                  height: LABEL_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    color: rc.key === 'final' ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.28)',
                  }}
                >
                  {rc.label}
                </span>
              </div>
            ))}

            {/* SVG connector lines */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              width={TOTAL_W}
              height={LABEL_H + BRACKET_CONTENT_H}
            >
              {connectorPaths.map((d, i) => (
                <path key={i} d={d} stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
              ))}
            </svg>

            {/* Match cards */}
            {ROUND_CONFIG.map((rc, r) => {
              const matches = bracket[rc.key] || [];
              return matches.map((match, i) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  top={rc.firstTop + i * rc.stepH}
                  left={r * (CARD_W + COL_GAP)}
                />
              ));
            })}
          </div>
        </div>
      </div>

      {/* Third place match */}
      {bracket.thirdPlace && (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            Tercer Puesto · 3er y 4to lugar
          </p>
          <ThirdPlaceCard match={bracket.thirdPlace} />
        </div>
      )}

      {/* Info footer */}
      <p className="text-center text-xs mt-4" style={{ color: 'rgba(255,255,255,0.15)' }}>
        Fase eliminatoria: 28 jun – 19 jul · Final: 19 jul · Los equipos clasificados aparecerán automáticamente
      </p>
    </div>
    </div>
  );
}
