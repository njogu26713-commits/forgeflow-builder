import React from 'react';
import { AgentRole } from '../types';
import { AgentHeader } from './AgentHeader';

interface TypingIndicatorProps {
  agent: AgentRole;
}

export function TypingIndicator({ agent }: TypingIndicatorProps) {
  return (
    <div className="py-3">
      <AgentHeader role={agent} isStreaming={true} />
      <div className="flex items-center gap-1.5 py-1 text-zinc-500">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '200ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" style={{ animationDelay: '400ms' }} />
      </div>
    </div>
  );
}
