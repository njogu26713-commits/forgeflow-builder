import React, { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { ForgeUser } from '../lib/forgeaiApi';

export default function Login() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const body = await response.json().catch(() => ({})) as { user?: ForgeUser; error?: string };
      if (!response.ok) throw new Error(body.error || 'Unable to sign in');
      navigate('/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0c0d0e] text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10"><Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white"><span className="h-2 w-2 rounded-full bg-zinc-300" />Forgeflow</Link><div className="text-xs text-zinc-500">New to ForgeAI? <Link href="/signup" className="ml-1 text-zinc-200 hover:text-white">Create an account</Link></div></header>
      <section className="mx-auto max-w-md px-6 pb-24 pt-20 lg:pt-28">
        <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600">Welcome back</div>
        <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] text-white">Sign in to ForgeAI.</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-500">Continue working on your projects and conversations.</p>
        <form onSubmit={submit} className="mt-8 rounded-xl border border-[#292a32] bg-[#111216] p-6 sm:p-8">
          <div className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs text-zinc-400">Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500" /></label><label className="block"><span className="mb-1.5 block text-xs text-zinc-400">Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-zinc-500" /></label></div>
          {error && <p className="mt-4 rounded-md border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">{error}</p>}
          <button disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 hover:bg-white disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}{!busy && <ArrowRight className="h-4 w-4" />}</button>
          <div className="mt-5 flex items-center gap-2 text-[11px] text-zinc-600"><ShieldCheck className="h-3.5 w-3.5" />Secure HTTP-only session</div>
        </form>
      </section>
    </main>
  );
}
