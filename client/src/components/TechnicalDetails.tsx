import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, Terminal as TerminalIcon, Globe, AlertCircle, ArrowRight } from 'lucide-react';
import { TechnicalDetail } from '../types';

interface TechnicalDetailsProps {
  details: TechnicalDetail;
}

export function TechnicalDetails({ details }: TechnicalDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const hasData = 
    (details.filesModified && details.filesModified.length > 0) ||
    details.command ||
    (details.apiRequests && details.apiRequests.length > 0) ||
    (details.errors && details.errors.length > 0) ||
    details.handoffTo;

  if (!hasData) return null;

  return (
    <div className="mt-2.5 text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 font-mono text-[11px] transition-colors py-0.5 focus:outline-none"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        ) : (
          <ChevronRight className="w-3 h-3 text-zinc-500" />
        )}
        <span>Technical details</span>
      </button>

      {isOpen && (
        <div className="pl-4 mt-2 space-y-3 font-mono text-[11px] text-zinc-400 border-l border-[#1f2026]">
          {details.filesModified && details.filesModified.length > 0 && (
            <div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileCode2 className="w-3 h-3 text-zinc-500" />
                <span>Files modified</span>
              </div>
              <div className="space-y-0.5 pl-4 text-zinc-300">
                {details.filesModified.map((file) => (
                  <div key={file} className="hover:text-white transition-colors cursor-pointer">
                    {file}
                  </div>
                ))}
              </div>
            </div>
          )}

          {details.command && (
            <div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <TerminalIcon className="w-3 h-3 text-zinc-500" />
                <span>Command</span>
              </div>
              <div className="pl-4 text-zinc-300">
                <div>{details.command}</div>
                {details.commandResult && (
                  <div className="text-zinc-500 text-[10px] mt-0.5">{details.commandResult}</div>
                )}
              </div>
            </div>
          )}

          {details.apiRequests && details.apiRequests.length > 0 && (
            <div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-zinc-500" />
                <span>API requests</span>
              </div>
              <div className="space-y-1 pl-4">
                {details.apiRequests.map((req, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-zinc-400">{req.method}</span>
                    <span className="text-zinc-300">{req.path}</span>
                    <span className={req.status >= 400 ? 'text-rose-400' : 'text-zinc-500'}>
                      {req.status}
                    </span>
                    <span className="text-zinc-600 text-[10px]">{req.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {details.errors && details.errors.length > 0 && (
            <div>
              <div className="text-rose-400 text-[10px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>Errors trace</span>
              </div>
              <div className="space-y-1 pl-4 text-rose-300/90">
                {details.errors.map((err, i) => (
                  <div key={i} className="text-[11px] leading-relaxed">
                    {err}
                  </div>
                ))}
              </div>
            </div>
          )}

          {details.handoffTo && (
            <div className="flex items-center gap-2 text-zinc-500 pt-1 text-[10px]">
              <ArrowRight className="w-3 h-3" />
              <span>Handoff to:</span>
              <span className="text-zinc-300">{details.handoffTo}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
