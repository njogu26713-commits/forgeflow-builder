import React from 'react';

interface WelcomeStateProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTIONS = [
  { label: 'Build a marketplace where users can sell services', text: 'Build me a marketplace where users can sell services.' },
  { label: 'Build a SaaS dashboard with metrics & subscription gating', text: 'Build a SaaS analytics dashboard with telemetry metrics, user tables, and subscription gating.' },
  { label: 'Build a portfolio with typography-first dark styling', text: 'Create a clean, typography-focused developer portfolio with project showcases and writing list.' },
  { label: 'Build an API webhook incident dispatcher', text: 'Build a fast webhook dispatcher with P1 incident routing, retry queues, and signature verification.' },
];

export function WelcomeState({ onSelectPrompt }: WelcomeStateProps) {
  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-left">
      <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white mb-2">
        What do you want to build?
      </h1>
      <p className="text-sm text-zinc-400 mb-8 leading-relaxed">
        Describe your application, feature, or idea. The autonomous agent team will plan the system architecture, write production code, verify the user experience in preview, and configure deployment.
      </p>

      <div className="space-y-1 mb-8">
        <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block mb-2">
          Suggested starting points
        </span>
        <div className="flex flex-col items-start gap-1.5">
          {SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.text)}
              className="text-left text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors py-1 group flex items-center gap-2"
            >
              <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors">→</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
