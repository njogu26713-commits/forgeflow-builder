import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Sparkles } from 'lucide-react';
import { AgentRole } from '../types';

interface MessageComposerProps {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
  activeAgent?: AgentRole | null;
  onOpenImport?: () => void;
}

export function MessageComposer({
  onSendMessage,
  disabled,
  activeAgent,
  onOpenImport
}: MessageComposerProps) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'build' | 'edit' | 'debug'>('build');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!input.trim() || disabled) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-4 pt-2">
      {/* Subtle dark surface and minimal border, avoiding a heavy card */}
      <div className="relative bg-[#131418] border border-[#23242c] rounded-xl p-3 focus-within:border-zinc-500 transition-colors">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Describe what you want to build or change..."
          rows={2}
          className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 resize-none focus:outline-none leading-relaxed min-h-[44px] max-h-[180px]"
        />

        <div className="flex items-center justify-between pt-2 border-t border-[#1a1b22] text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenImport}
              title="Import repository or files"
              className="hover:text-zinc-300 transition-colors flex items-center gap-1 text-[11px]"
            >
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Attach</span>
            </button>

            <label className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'build' | 'edit' | 'debug')}
                className="bg-transparent text-zinc-400 hover:text-zinc-200 focus:outline-none appearance-none cursor-pointer"
                aria-label="AI agent mode"
              >
                <option value="build" className="bg-[#15161a]">Build mode</option>
                <option value="edit" className="bg-[#15161a]">Edit mode</option>
                <option value="debug" className="bg-[#15161a]">Debug mode</option>
              </select>
            </label>

            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-zinc-600 font-mono">
              <span className="w-1 h-1 rounded-full bg-zinc-600" />
              new project context
            </span>
            
            {activeAgent && (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 agent-live-dot" />
                <span className="capitalize">{activeAgent}</span> working
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600 hidden md:inline">Return to send</span>
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled}
              className={`p-1.5 rounded-lg transition-all ${
                input.trim() && !disabled
                  ? 'bg-zinc-100 text-zinc-950 hover:bg-white cursor-pointer'
                  : 'bg-[#1e1f26] text-zinc-600 cursor-not-allowed'
              }`}
              title="Send prompt"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
