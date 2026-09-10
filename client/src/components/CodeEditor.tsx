import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  Copy, 
  Check, 
  Code, 
  FileCode2, 
  FoldVertical, 
  Sparkles,
  Save
} from 'lucide-react';
import { ProjectFile } from '../types';

interface CodeEditorProps {
  activeFile: ProjectFile | null;
  openTabs: ProjectFile[];
  onSelectTab: (file: ProjectFile) => void;
  onCloseTab: (fileId: string) => void;
  onUpdateContent?: (fileId: string, newContent: string) => void;
}

export function CodeEditor({
  activeFile,
  openTabs,
  onSelectTab,
  onCloseTab,
  onUpdateContent
}: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [localContent, setLocalContent] = useState('');

  useEffect(() => {
    setLocalContent(activeFile?.content || '');
  }, [activeFile?.id, activeFile?.content]);

  if (!activeFile) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">
        Select a file from the explorer to view and edit code.
      </div>
    );
  }

  const handleCopy = () => {
    if (!localContent) return;
    navigator.clipboard.writeText(localContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = localContent.split('\n');

  return (
    <div className="h-full flex flex-col rounded-lg border border-[#292a32] bg-[#0f1014] text-xs font-mono overflow-hidden">
      {/* Editor Tabs */}
      <div className="flex items-center justify-between border-b border-[#1d1e24] bg-[#0c0d10] px-1 overflow-x-auto">
        <div className="flex items-center">
          {openTabs.map((tab) => {
            const isActive = tab.id === activeFile.id;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab)}
                className={`flex items-center gap-2 px-3 py-2 text-xs border-r border-[#1d1e24] cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-[#0f1014] text-white border-t border-t-zinc-400 font-medium'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#13141a]'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-zinc-500" />
                <span>{tab.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="hover:text-white text-zinc-600 ml-1 p-0.5 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Editor utilities */}
        <div className="flex items-center gap-2 px-3 text-zinc-500">
          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Search file"
            className="hover:text-zinc-300 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleCopy}
            title="Copy file content"
            className="hover:text-zinc-300 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* In-editor search bar */}
      {showSearch && (
        <div className="px-3 py-1.5 bg-[#14151b] border-b border-[#202129] flex items-center gap-2">
          <Search className="w-3 h-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in file..."
            className="bg-transparent text-xs text-white focus:outline-none w-full"
            autoFocus
          />
          <button 
            onClick={() => setShowSearch(false)}
            className="text-zinc-500 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Editor Body: Line numbers + Code with readable dark typography */}
      <div className="flex-1 overflow-auto flex text-[12px] leading-relaxed select-text">
        {/* Line numbers column */}
        <div className="py-3 px-3 select-none text-zinc-600 text-right font-mono bg-[#0c0d10] border-r border-[#1a1b22] min-w-[42px]">
          {lines.map((_, i) => (
            <div key={i} className="leading-relaxed">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code editor content */}
        <div className="flex-1 py-3 px-4 overflow-x-auto">
          <textarea
            value={localContent}
            onChange={(e) => {
              setLocalContent(e.target.value);
              if (onUpdateContent && activeFile) {
                onUpdateContent(activeFile.id, e.target.value);
              }
            }}
            spellCheck={false}
            className="w-full h-full bg-transparent text-zinc-300 font-mono text-[12px] leading-relaxed resize-none focus:outline-none selection:bg-[#282a36] whitespace-pre"
          />
        </div>
      </div>

      {/* Editor Footer Status Bar */}
      <div className="px-3 py-1 bg-[#0c0d10] border-t border-[#1d1e24] flex items-center justify-between text-[11px] text-zinc-500 font-mono">
        <div className="flex items-center gap-4">
          <span>{activeFile.path}</span>
          {activeFile.lastModifiedBy && (
            <span className="text-zinc-400">
              Edited by {activeFile.lastModifiedBy} agent
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>UTF-8</span>
          <span>{activeFile.language || 'text'}</span>
          <span>{lines.length} lines</span>
        </div>
      </div>
    </div>
  );
}
