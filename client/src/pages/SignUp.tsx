import React, { useState } from 'react';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { ForgeUser } from '../lib/forgeaiApi';

export default function SignUp() {
  const [, navigate] = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const body = await response.json().catch(() => ({})) as { user?: ForgeUser; error?: string };
      if (!response.ok) throw new Error(body.error || 'Unable to create your account');
      navigate('/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0c0d0e] text-zinc-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white"><span className="h-2 w-2 rounded-full bg-zinc-300" />Forgeflow</Link>
        <div className="text-xs text-zinc-500">Already have an account? <Link href="/login" className="ml-1 text-zinc-200 hover:text-white">Sign in</Link></div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-14 px-6 pb-24 pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10 lg:pt-24">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-600">Create your workspace</div>
          <h1 className="mt-4 max-w-md text-4xl font-medium leading-tight tracking-[-0.04em] text-white sm:text-5xl">Start building with ForgeAI.</h1>
          <p className="mt-5 max-w-md text-sm leading-6 text-zinc-500">Create an account to save your projects, conversations, environment configuration, and agent progress in one private workspace.</p>
          <div className="mt-8 space-y-3 text-xs text-zinc-400">
            {['Private project workspace', 'Persistent AI conversations', 'Securely masked environment secrets'].map(item => <div key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-zinc-500" />{item}</div>)}
          </div>
        </div>

        <div className="rounded-xl border border-[#292a32] bg-[#111216] p-6 shadow-2xl shadow-black/20 sm:p-8">
          <div className="text-sm font-medium text-white">Create your account</div>
          <div className="mt-1 text-xs text-zinc-500">Use at least 8 characters for your password.</div>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block"><span className="mb-1.5 block text-xs text-zinc-400">Name</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-zinc-500" /></label>
            <label className="block"><span className="mb-1.5 block text-xs text-zinc-400">Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-zinc-500" /></label>
            <label className="block"><span className="mb-1.5 block text-xs text-zinc-400">Password</span><input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-zinc-700 focus:border-zinc-500" /></label>
            {error && <p className="rounded-md border border-rose-900/50 bg-rose-950/20 px-3 py-2 text-xs text-rose-300">{error}</p>}
            <button disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Creating account…' : 'Create account'}{!busy && <ArrowRight className="h-4 w-4" />}</button>
          </form>
          <div className="mt-5 flex items-center gap-2 text-[11px] text-zinc-600"><ShieldCheck className="h-3.5 w-3.5" />Your account data is scoped to your authenticated session.</div>
        </div>
      </section>
    </main>
  );
}
