import React from 'react';
import { ChatMessage } from '../types';
import { AgentHeader } from './AgentHeader';
import { TechnicalDetails } from './TechnicalDetails';

interface ChatMessageItemProps {
  message: ChatMessage;
  onActionButtonClick?: (action: string) => void;
}

export function ChatMessageItem({ message, onActionButtonClick }: ChatMessageItemProps) {
  const isUser = message.sender === 'user';

  return (
    <div className={isUser ? 'rounded-lg border border-[#292a32] bg-[#15161b] px-4 py-3' : 'px-1 py-1'}>
      {/* Agent or User Identification */}
      <AgentHeader role={message.sender} isStreaming={message.isStreaming} />

      {/* Main natural text content with pure whitespace hierarchy */}
      <div className={`text-[13.5px] leading-relaxed ${isUser ? 'text-zinc-100 font-medium' : 'border-l-2 border-zinc-600 pl-3 text-zinc-400'}`}>
        <p className="whitespace-pre-wrap max-w-3xl">{message.text}</p>
        {message.isStreaming && <span className="typewriter-cursor" />}
      </div>

      {/* Technical Details: minimal, collapsed by default, nested only when useful */}
      {message.technicalDetails && (
        <TechnicalDetails details={message.technicalDetails} />
      )}

      {/* Inline Action Buttons: plain actions, NOT cards */}
      {message.actionButtons && message.actionButtons.length > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-1">
          {message.actionButtons.map((btn) => (
            <button
              key={btn.id}
              onClick={() => onActionButtonClick && onActionButtonClick(btn.action)}
              className={`text-xs px-3 py-1.5 rounded transition-colors font-medium ${
                btn.primary
                  ? 'bg-zinc-200 text-zinc-950 hover:bg-white'
                  : 'bg-[#181920] text-zinc-300 hover:text-white hover:bg-[#20222a] border border-[#272832]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
