import React, { useState } from 'react';
import { Activity, ExternalLink, Monitor, RefreshCw, ShieldCheck, Terminal } from 'lucide-react';

interface LivePreviewProps {
  url: string;
  projectId: string;
  state: 'ready' | 'building' | 'error' | 'stopped';
  onInspectNetwork?: () => void;
}

const stateCopy: Record<LivePreviewProps['state'], { label: string; tone: string }> = {
  ready: { label: 'Ready', tone: 'text-emerald-400' },
  building: { label: 'Building', tone: 'text-amber-400' },
  error: { label: 'Build error', tone: 'text-rose-400' },
  stopped: { label: 'Stopped', tone: 'text-zinc-500' },
};

export function LivePreview({ url, projectId, state, onInspectNetwork }: LivePreviewProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'console' | 'network'>('app');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const status = stateCopy[state];

  const handleRefresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => setIsRefreshing(false), 400);
  };

  return (
    <div className="h-full flex flex-col rounded-lg border border-[#292a32] bg-[#0b0c0f] overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1d1e24] bg-[#0d0e12] flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={handleRefresh} className={`p-1 text-zinc-500 hover:text-white rounded ${isRefreshing ? 'animate-spin text-white' : ''}`} title="Refresh preview">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-0 rounded border border-[#23242c] bg-[#15161b] px-2 py-1 text-[11px] text-zinc-400 truncate">
            {url || 'Preview URL will appear after a successful build'}
          </div>
          <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] ${status.tone}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-500">
          <button onClick={() => setActiveTab('app')} className={activeTab === 'app' ? 'text-white' : 'hover:text-zinc-300'}>Preview</button>
          <button onClick={() => setActiveTab('console')} className={activeTab === 'console' ? 'text-white' : 'hover:text-zinc-300'}>Console</button>
          <button onClick={() => { setActiveTab('network'); onInspectNetwork?.(); }} className={activeTab === 'network' ? 'text-white' : 'hover:text-zinc-300'}>Network</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#090a0d] p-4">
        {activeTab === 'app' && (
          <div className="h-full min-h-[260px] flex items-center justify-center rounded-lg border border-dashed border-[#2a2b33] bg-[#0e0f13] p-6 text-center">
            <div className="max-w-sm space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#343640] bg-[#15161b] text-zinc-400">
                <Monitor className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-medium text-zinc-200">{state === 'ready' ? 'Your project preview will appear here' : `Preview ${status.label.toLowerCase()}`}</h3>
              <p className="text-xs leading-relaxed text-zinc-500">
                {state === 'ready' ? 'ForgeAI will render the current project here when a preview runtime is connected.' : 'The preview reflects the current project build state.'}
              </p>
              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Project {projectId || 'not selected'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'console' && (
          <div className="rounded-lg border border-[#292a32] bg-[#0e0f13] p-4 font-mono text-xs text-zinc-500">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400"><Terminal className="h-3.5 w-3.5" /> Console</div>
            <p>No preview runtime logs are available yet.</p>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="rounded-lg border border-[#292a32] bg-[#0e0f13] p-4 font-mono text-xs text-zinc-500">
            <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-wider text-zinc-400"><Activity className="h-3.5 w-3.5" /> Network</div>
            <p>No preview requests have been captured.</p>
            {url && <a href={url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-zinc-300 hover:text-white"><ExternalLink className="h-3 w-3" /> Open preview URL</a>}
          </div>
        )}
      </div>
    </div>
  );
}
