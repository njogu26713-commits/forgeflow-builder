import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ForgeUser } from '../lib/forgeaiApi';

interface AuthModalProps {
  onClose: () => void;
  onAuthenticated: (user: ForgeUser) => void;
}

export function AuthModal({ onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
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
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { name, email, password } : { email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Authentication failed');
      onAuthenticated(body.user);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-lg border border-[#2b2c35] bg-[#111216] p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-sm font-medium text-white">{mode === 'login' ? 'Sign in to ForgeAI' : 'Create your ForgeAI account'}</div>
            <div className="text-xs text-zinc-500 mt-1">Your projects and conversations stay private to your account.</div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white" aria-label="Close"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2 text-sm text-white outline-none focus:border-zinc-500" />}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2 text-sm text-white outline-none focus:border-zinc-500" />
          <input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ characters)" required className="w-full rounded-md border border-[#292a32] bg-[#0c0d0e] px-3 py-2 text-sm text-white outline-none focus:border-zinc-500" />
          {error && <p className="text-xs text-rose-300">{error}</p>}
          <button disabled={busy} className="w-full rounded-md bg-zinc-100 hover:bg-white disabled:opacity-50 px-3 py-2 text-xs font-medium text-zinc-950">{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
        </form>
        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} className="mt-4 text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
          {mode === 'login' ? 'Need an account? Create one' : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
