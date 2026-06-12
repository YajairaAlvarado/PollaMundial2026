import { useEffect, useState } from 'react';

const CURRENT_VERSION = __APP_VERSION__;
const CHECK_INTERVAL  = 5 * 60 * 1000;

function fmtVersion(v) {
  if (!v) return '—';
  const d = new Date(Number(v));
  if (isNaN(d)) return v;
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Guayaquil' });
}

export const currentVersionLabel = fmtVersion(CURRENT_VERSION);

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [serverVersion,   setServerVersion]   = useState(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    async function check() {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res  = await fetch(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const { version } = await res.json();
        if (version) {
          setServerVersion(fmtVersion(version));
          if (version !== CURRENT_VERSION) setUpdateAvailable(true);
        }
      } catch {
        // silencioso
      }
    }

    const firstCheck = setTimeout(check, 60 * 1000);
    const interval   = setInterval(check, CHECK_INTERVAL);

    return () => { clearTimeout(firstCheck); clearInterval(interval); };
  }, []);

  return { updateAvailable, serverVersion };
}
