import { useEffect, useState } from 'react';
import { auth, sys } from '../api';

export default function Dashboard() {
  const [me, setMe] = useState<{ uid: number; email: string } | null>(null);
  const [health, setHealth] = useState<'ok'|'down'|'loading'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let on = true;
    // auth.me().then(j => on && j.ok ? setMe(j.me!) : null).catch(()=>{});
    auth.me().then(j => j.ok ? setMe(j.me!) : null).catch(()=>{});
    sys.health().then(j => on && setHealth(j.ok ? 'ok' : 'down')).catch(()=> on && setHealth('down'));
    return () => { on = false; };
  }, []);

  async function doLogout(){
    try { await auth.logout(); location.href='/login'; }
    catch { setMsg('Gagal logout'); }
  }

  return (
    <div style={{maxWidth:960, margin:'32px auto', padding:'0 16px'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16}}>
        <h2 style={{margin:0}}>Dashboard</h2>
        <div>
          <button onClick={doLogout}>Logout</button>
        </div>
      </header>

      <section style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:12}}>
        <div style={{border:'1px solid #ddd', borderRadius:12, padding:16}}>
          <div style={{fontSize:12, color:'#888'}}>API Health</div>
          <div style={{fontSize:24, marginTop:6}}>
            {health==='loading' ? '...' : health==='ok' ? 'OK' : 'DOWN'}
          </div>
        </div>

        <div style={{border:'1px solid #ddd', borderRadius:12, padding:16}}>
          <div style={{fontSize:12, color:'#888'}}>Email</div>
          <div style={{fontSize:24, marginTop:6}}>
            {me ? me.email : '...'}
          </div>
        </div>
      </section>

      {msg && <div style={{marginTop:12, color:'crimson'}}>{msg}</div>}
    </div>
  );
}
