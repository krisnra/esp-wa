import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { auth } from '../api';

export default function GuestRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading'|'guest'|'authed'>('loading');

  useEffect(() => {
    let on = true;
    auth.me()
      .then(j => on && setState(j.ok ? 'authed' : 'guest'))
      .catch(() => on && setState('guest'));
    return () => { on = false; };
  }, []);

  if (state === 'loading') return <div style={{padding:24}}>Memuat...</div>;
  if (state === 'authed') return <Navigate to="/" replace />; 
  return <>{children}</>;
}
