import React, { useState } from 'react';
import { 
  RotateCw, 
  ExternalLink, 
  Terminal, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldCheck,
  Search,
  Star,
  Monitor
} from 'lucide-react';

interface LivePreviewProps {
  url: string;
  projectId: string;
  state: 'ready' | 'building' | 'error' | 'stopped';
  onInspectNetwork?: () => void;
}

export function LivePreview({ url, projectId, state }: LivePreviewProps) {
  const [activeTab, setActiveTab] = useState<'app' | 'console' | 'network'>('app');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [cartCount, setCartCount] = useState(0);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0c0f]">
      {/* Top Preview Bar */}
      <div className="px-3 py-1.5 border-b border-[#1d1e24] bg-[#0d0e12] flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <button 
            onClick={handleRefresh}
            className={`p-1 hover:text-white text-zinc-500 rounded transition-all ${isRefreshing ? 'animate-spin text-white' : ''}`}
            title="Reload preview"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          
          <div className="flex-1 bg-[#15161b] border border-[#23242c] rounded px-2 py-0.5 text-[11px] text-zinc-400 flex items-center justify-between truncate">
            <span className="truncate">{url}</span>
            <span className="text-[10px] text-emerald-400 font-sans ml-2">200 OK</span>
          </div>
        </div>

        {/* View / Inspector Tabs: simple plain text buttons */}
        <div className="flex items-center gap-3 text-xs text-zinc-500 ml-2 font-sans">
          <button
            onClick={() => setActiveTab('app')}
            className={`transition-colors ${activeTab === 'app' ? 'text-white font-medium' : 'hover:text-zinc-300'}`}
          >
            Render
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`transition-colors flex items-center gap-1 ${activeTab === 'console' ? 'text-white font-medium' : 'hover:text-zinc-300'}`}
          >
            <span>Console</span>
            <span className="text-[10px] text-zinc-600 font-mono">2</span>
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`transition-colors flex items-center gap-1 ${activeTab === 'network' ? 'text-white font-medium' : 'hover:text-zinc-300'}`}
          >
            <span>Network</span>
            <span className="text-[10px] text-zinc-600 font-mono">3</span>
          </button>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 overflow-auto bg-[#090a0d] p-3">
        {activeTab === 'app' && (
          <div className="h-full flex flex-col">
            {/* Live Rendered Project Simulation */}
            <div className="w-full border border-[#1f2026] rounded-md bg-[#0e0f14] overflow-hidden flex flex-col text-zinc-200">
              {/* App Navbar */}
              <div className="border-b border-[#1f2026] px-4 py-2.5 flex items-center justify-between bg-[#111217]">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-xs tracking-tight text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
                    TaskForge
                  </span>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span className="text-white">Services</span>
                    <span className="hover:text-white transition-colors cursor-pointer">Freelancers</span>
                    <span className="hover:text-white transition-colors cursor-pointer">Escrow</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCartCount(c => c + 1)}
                    className="text-[11px] bg-zinc-100 text-black font-medium px-2.5 py-1 rounded hover:bg-white transition-colors"
                  >
                    Post Request
                  </button>
                </div>
              </div>

              {/* Hero Banner inside rendered project */}
              <div className="px-4 py-4 border-b border-[#1f2026]">
                <h2 className="text-sm font-semibold text-white mb-0.5">
                  Verified Engineering & Creative Services
                </h2>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Direct contracts, automated milestone escrow, 0% platform deposit fee.
                </p>
              </div>

              {/* Service Cards List / Grid */}
              <div className="p-4 space-y-2.5">
                {[
                  { title: 'Fullstack Next.js & Node Architecture', seller: 'Elena Vance', price: 120, rating: 4.9, reviews: 38 },
                  { title: 'PostgreSQL Schema Design & Tuning', seller: 'Devon Miles', price: 180, rating: 5.0, reviews: 19 },
                  { title: 'Minimal Typography UI/UX Systems', seller: 'Sora Tanaka', price: 95, rating: 4.8, reviews: 52 },
                ]
                  .filter(item => !searchFilter || item.title.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map((svc, i) => (
                    <div 
                      key={i} 
                      className="border border-[#22232a] bg-[#14151b] rounded p-3 hover:border-zinc-500 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] text-zinc-400 mb-1">
                          <span className="flex items-center gap-1 text-emerald-400 font-medium">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            {svc.seller}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-zinc-300">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            {svc.rating} ({svc.reviews})
                          </span>
                        </div>
                        <h4 className="text-xs font-medium text-white truncate">
                          {svc.title}
                        </h4>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-[10px] text-zinc-500 block">Starting</span>
                        <span className="font-semibold text-xs text-white">${svc.price}</span>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="px-4 py-2 border-t border-[#1f2026] text-[10px] text-zinc-500 flex items-center justify-between">
                <span>Active project build · live reload</span>
                <span>ESCROW PROTECTION</span>
              </div>
            </div>
          </div>
        )}

        {/* Console Inspector Tab */}
        {activeTab === 'console' && (
          <div className="p-3 font-mono text-xs space-y-2">
            <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">
              Browser Console Logs
            </div>
            <div className="space-y-1.5 text-zinc-300 text-[11px]">
              <div className="flex items-start gap-2 text-zinc-400">
                <span className="text-zinc-600">[10:41:02]</span>
                <span className="text-emerald-400">[info]</span>
                <span>[vite] connecting...</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-400">
                <span className="text-zinc-600">[10:41:03]</span>
                <span className="text-emerald-400">[info]</span>
                <span>[vite] connected.</span>
              </div>
              <div className="flex items-start gap-2 text-zinc-300">
                <span className="text-zinc-600">[10:43:21]</span>
                <span className="text-zinc-400">[log]</span>
                <span>TaskForge app mounted successfully with 3 initial service fixtures.</span>
              </div>
              <div className="flex items-start gap-2 text-rose-300/90 pt-1">
                <span className="text-zinc-600">[10:44:05]</span>
                <span className="text-rose-400">[error]</span>
                <span>POST /api/auth/login 500 (Internal Server Error) - Handled by Debugger Agent</span>
              </div>
              <div className="flex items-start gap-2 text-emerald-300/90">
                <span className="text-zinc-600">[10:45:10]</span>
                <span className="text-emerald-400">[success]</span>
                <span>POST /api/auth/login 200 OK (Session token issued & verified)</span>
              </div>
            </div>
          </div>
        )}

        {/* Network Inspector Tab */}
        {activeTab === 'network' && (
          <div className="p-3 font-mono text-xs">
            <div className="text-zinc-500 text-[11px] uppercase tracking-wider mb-2">
              HTTP Network Requests
            </div>
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-[#1d1e24] text-zinc-500">
                  <th className="pb-1.5 font-normal">Method</th>
                  <th className="pb-1.5 font-normal">URL</th>
                  <th className="pb-1.5 font-normal">Status</th>
                  <th className="pb-1.5 font-normal">Type</th>
                  <th className="pb-1.5 font-normal">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#17181f] text-zinc-300">
                <tr>
                  <td className="py-1.5 text-zinc-400">GET</td>
                  <td className="py-1.5 text-white">/marketplace</td>
                  <td className="py-1.5 text-emerald-400">200</td>
                  <td className="py-1.5 text-zinc-500">doc</td>
                  <td className="py-1.5 text-zinc-500">28ms</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-zinc-400">GET</td>
                  <td className="py-1.5 text-white">/api/services</td>
                  <td className="py-1.5 text-emerald-400">200</td>
                  <td className="py-1.5 text-zinc-500">fetch</td>
                  <td className="py-1.5 text-zinc-500">12ms</td>
                </tr>
                <tr>
                  <td className="py-1.5 text-zinc-400">POST</td>
                  <td className="py-1.5 text-white">/api/auth/login</td>
                  <td className="py-1.5 text-emerald-400">200</td>
                  <td className="py-1.5 text-zinc-500">fetch</td>
                  <td className="py-1.5 text-zinc-500">41ms</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
