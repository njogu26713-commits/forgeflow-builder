import React, { useState } from 'react';
import { X, Key, ShieldCheck, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [anthropicKey, setAnthropicKey] = useState('sk-ant-api03-••••••••••••••••');
  const [railwayToken, setRailwayToken] = useState('rw_live_••••••••••••••••');
  const [autoHandoff, setAutoHandoff] = useState(true);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111216] border border-[#23242c] rounded-lg p-5 text-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2026] mb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-zinc-300" />
            <h3 className="text-sm font-semibold text-white">Settings & Provider Credentials</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-300 font-medium block mb-1">
              AI Provider Token
            </label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              className="w-full bg-[#16171d] border border-[#272832] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Autonomous agent orchestration runtime
            </span>
          </div>

          <div>
            <label className="text-xs text-zinc-300 font-medium block mb-1">
              Railway Deployment Token
            </label>
            <input
              type="password"
              value={railwayToken}
              onChange={(e) => setRailwayToken(e.target.value)}
              className="w-full bg-[#16171d] border border-[#272832] rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-zinc-500 font-mono"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Used by Deployment Agent for live production push
            </span>
          </div>

          <div className="pt-2 border-t border-[#1f2026] flex items-center justify-between">
            <div>
              <span className="text-xs text-zinc-300 block font-medium">Automatic Agent Handoff</span>
              <span className="text-[10px] text-zinc-500 block">Agents autonomously loop Planner → Coder → Preview</span>
            </div>
            <input
              type="checkbox"
              checked={autoHandoff}
              onChange={(e) => setAutoHandoff(e.target.checked)}
              className="rounded bg-[#1a1b22] border-[#292a34] text-white focus:ring-0 w-4 h-4"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-white text-black font-medium text-xs rounded hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
            >
              {saved && <Check className="w-3.5 h-3.5" />}
              <span>{saved ? 'Saved' : 'Save changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
