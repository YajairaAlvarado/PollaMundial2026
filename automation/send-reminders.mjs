// Envía recordatorios push a quienes NO han pronosticado los partidos de hoy (hora Ecuador).
// Se ejecuta por GitHub Actions a las 9am / 12pm / 5pm (Ecuador).
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;
const APP_URL      = (process.env.APP_URL || 'https://yajairaalvarado.github.io/PollaMundial2026/').replace(/\/?$/, '/');

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:daniel.leon@ec.andersen.com',
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// ISO2 -> emoji bandera
const flag = (code) => {
  if (!code) return '';
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
};
const ecDate = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

async function main() {
  const now = new Date();
  const today = ecDate(now);

  // Partidos de HOY (Ecuador) que aún no empiezan
  const { data: matches } = await supabase
    .from('matches')
    .select('id, match_date, home_team, away_team, home_code, away_code')
    .eq('status', 'scheduled');
  const todayMatches = (matches || []).filter((m) => ecDate(new Date(m.match_date)) === today && new Date(m.match_date) > now)
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  if (!todayMatches.length) { console.log('No hay partidos de hoy pendientes. Nada que enviar.'); return; }
  const matchIds = todayMatches.map((m) => m.id);

  // Suscripciones push
  const { data: subs } = await supabase.from('push_subscriptions').select('user_id, endpoint, subscription');
  if (!subs?.length) { console.log('No hay suscripciones push.'); return; }
  const userIds = [...new Set(subs.map((s) => s.user_id))];

  // Predicciones ya hechas por esos usuarios para los partidos de hoy
  const { data: preds } = await supabase
    .from('predictions')
    .select('user_id, match_id')
    .in('match_id', matchIds)
    .in('user_id', userIds);
  const done = {};
  (preds || []).forEach((p) => { (done[p.user_id] ||= new Set()).add(p.match_id); });

  let sent = 0, removed = 0;
  for (const s of subs) {
    const pendientes = todayMatches.filter((m) => !done[s.user_id]?.has(m.id));
    if (!pendientes.length) continue;

    const m = pendientes[0];
    const payload = JSON.stringify({
      title: pendientes.length === 1 ? '⚽ Te falta 1 partido por pronosticar' : `⚽ Te faltan ${pendientes.length} partidos hoy`,
      body:  `${flag(m.home_code)} ${m.home_team} vs ${m.away_team} ${flag(m.away_code)} — ¡entra y pon tu resultado!`,
      url:   `${APP_URL}?predict=${m.id}`,
      tag:   'recordatorio-pronostico',
    });

    try {
      await webpush.sendNotification(s.subscription, payload);
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        removed++;
      } else {
        console.log('Error enviando:', err.statusCode, err.body || err.message);
      }
    }
  }
  console.log(`Enviados: ${sent} · Suscripciones muertas eliminadas: ${removed} · Partidos hoy: ${todayMatches.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
