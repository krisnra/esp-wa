export async function api<T>(path: string, init: RequestInit = {}) {
  const r = await fetch(path, { credentials: 'include', ...init });
  if (!r.ok) throw new Error(`${r.status}`);
  return (await r.json()) as T;
}

export const auth = {
  me: () => api<{ok:boolean; me?:{uid:number; email:string}} >('/api/auth/me'),
  logout: () => api<{ok:boolean}>('/api/auth/logout', { method: 'POST' }),
};

export const sys = {
  health: () => api<{ok:boolean}>('/api/health'),
};
