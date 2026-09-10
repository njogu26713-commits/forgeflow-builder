import React from 'react';
import { 
  Brain, 
  Code2, 
  MonitorCheck, 
  Bug, 
  Rocket, 
  ShieldCheck, 
  User 
} from 'lucide-react';
import { AgentRole } from '../types';

interface AgentHeaderProps {
  role: AgentRole | 'user';
  isStreaming?: boolean;
}

export const AGENT_CONFIG: Record<AgentRole, { name: string; icon: React.ElementType }> = {
  planner: {
    name: 'Planner Agent',
    icon: Brain,
  },
  coder: {
    name: 'Code Writer Agent',
    icon: Code2,
  },
  preview: {
    name: 'Preview Agent',
    icon: MonitorCheck,
  },
  debugger: {
    name: 'Debugger Agent',
    icon: Bug,
  },
  deployment: {
    name: 'Deployment Agent',
    icon: Rocket,
  },
  security: {
    name: 'Security Agent',
    icon: ShieldCheck,
  },
};

export function AgentHeader({ role, isStreaming }: AgentHeaderProps) {
  if (role === 'user') {
    return (
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-zinc-400">
        <User className="w-3.5 h-3.5 text-zinc-400" />
        <span>You</span>
      </div>
    );
  }

  const agent = AGENT_CONFIG[role];
  const Icon = agent.icon;

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* Lucide white/gray icon with zero colorful background or colored borders */}
      <Icon className="w-3.5 h-3.5 text-zinc-300" />
      <span className="text-xs font-medium text-zinc-200 tracking-tight">
        {agent.name}
      </span>
      {isStreaming && (
        <span className="flex items-center gap-1 text-[11px] text-zinc-500 font-mono ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 agent-live-dot inline-block" />
          <span>thinking</span>
        </span>
      )}
    </div>
  );
}
