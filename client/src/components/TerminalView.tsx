import React, { useState } from 'react';
import { TerminalEntry } from '../types';
import { Terminal as TerminalIcon, Play, Trash2 } from 'lucide-react';

interface TerminalViewProps {
  entries: TerminalEntry[];
  onExecuteCommand?: (cmd: string) => void;
  onClear?: () => void;
}

export function TerminalView({ entries, onExecuteCommand, onClear }: TerminalViewProps) {
  const [cmdInput, setCmdInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && cmdInput.trim()) {
      if (onExecuteCommand) {
        onExecuteCommand(cmdInput.trim());
      }
      setCmdInput('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#0b0c0f] font-mono text-xs">
      {/* Header bar: minimal, no giant decorative card */}
      <div className="px-3 py-2 border-b border-[#1d1e24] bg-[#0d0e12] flex items-center justify-between text-zinc-500">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-sans font-medium">
            Terminal
          </span>
          <span className="text-[10px] text-zinc-600">bash · /workspace</span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            title="Clear terminal"
            className="hover:text-zinc-300 transition-colors p-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Output scrollable area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2 select-text">
        {entries.map((entry) => {
          if (entry.type === 'cmd') {
            return (
              <div key={entry.id} className="text-zinc-200 flex items-start gap-2">
                <span className="text-zinc-500 select-none">{entry.timestamp}</span>
                <span className="text-white font-medium">{entry.content}</span>
              </div>
            );
          }
          if (entry.type === 'stderr') {
            return (
              <div key={entry.id} className="text-rose-400/90 whitespace-pre-wrap pl-6">
                {entry.content}
              </div>
            );
          }
          return (
            <div key={entry.id} className="text-zinc-400 whitespace-pre-wrap pl-6 leading-relaxed">
              {entry.content}
            </div>
          );
        })}

        {/* Input prompt */}
        <div className="flex items-center gap-2 pt-2 text-zinc-300">
          <span className="text-zinc-500 select-none">$</span>
          <input
            type="text"
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command (e.g. npm test, git status)..."
            className="w-full bg-transparent focus:outline-none text-xs text-white placeholder-zinc-600"
          />
        </div>
      </div>
    </div>
  );
}
