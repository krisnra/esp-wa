import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';   // ?? type-only import
import { Navigate } from 'react-router-dom';
import { auth } from '../api';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading'|'ok'|'no'>('loading');

  useEffect(() => {
    let on = true;
    auth.me()
      .then(j => on && setState(j.ok ? 'ok' : 'no'))
      .catch(() => on && setState('no'));
    return () => { on = false; };
  }, []);

  if (state === 'loading') return <div style={{padding:24}}>Memuat...</div>;
  if (state === 'no') return <Navigate to="/login" replace />;
  return <>{children}</>;
}
