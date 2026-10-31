'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  async function login(e: FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const response = await fetch('/api/admin/metrics/login',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password}) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không thể đăng nhập.');
      setPassword(''); router.replace('/admin/metrics'); router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : 'Không thể kết nối.'); }
    finally { setBusy(false); }
  }
  return <main className="container-wide min-h-[60vh] py-14"><div className="mx-auto max-w-md rounded-3xl border border-ink/10 bg-white p-7 shadow-soft"><LockKeyhole className="text-moss"/><p className="eyebrow mt-5">Dành cho quản trị viên</p><h1 className="mt-2 font-display text-3xl font-bold">Đăng nhập Dashboard</h1><p className="mt-3 text-sm text-ink/60">Sử dụng mật khẩu phân tích được quản trị viên cấp.</p>{!configured ? <p className="mt-5 text-sm" role="alert">Chưa cấu hình ADMIN_METRICS_PASSWORD phía server (tối thiểu 12 ký tự).</p> : <form onSubmit={login} className="mt-6 space-y-4"><label className="block text-sm font-semibold">Mật khẩu quản trị<input type="password" name="password" required maxLength={256} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-ink/20 p-3"/></label><button className="btn-primary w-full disabled:opacity-50" disabled={busy}>{busy ? 'Đang đăng nhập…' : 'Mở Dashboard'}</button></form>}{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</div></main>;
}
