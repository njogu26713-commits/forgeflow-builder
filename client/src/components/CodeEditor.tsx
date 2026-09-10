import React, { useEffect, useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import { X, Copy, Check, FileCode2, Search } from 'lucide-react';
import { ProjectFile } from '../types';

interface CodeEditorProps {
  activeFile: ProjectFile | null;
  openTabs: ProjectFile[];
  onSelectTab: (file: ProjectFile) => void;
  onCloseTab: (fileId: string) => void;
  onUpdateContent?: (fileId: string, newContent: string) => void;
}

function languageFor(file: ProjectFile) {
  const extension = (file.name.split('.').pop() ?? '').toLowerCase();
  const languages: Record<string, string> = { ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', json: 'json', css: 'css', scss: 'scss', html: 'html', md: 'markdown', py: 'python', go: 'go', rs: 'rust', sql: 'sql', yaml: 'yaml', yml: 'yaml', vue: 'html', svelte: 'html', sh: 'shell' };
  return languages[extension] ?? file.language ?? 'plaintext';
}

export function CodeEditor({ activeFile, openTabs, onSelectTab, onCloseTab, onUpdateContent }: CodeEditorProps) {
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [content, setContent] = useState(activeFile?.content ?? '');
  useEffect(() => setContent(activeFile?.content ?? ''), [activeFile?.id, activeFile?.content]);
  const matches = useMemo(() => search ? content.split('\n').filter(line => line.toLowerCase().includes(search.toLowerCase())).length : 0, [content, search]);

  if (!activeFile) return <div className="h-full flex items-center justify-center text-xs text-zinc-600 font-mono">Select a file from the explorer to view and edit code.</div>;
  const copy = async () => { await navigator.clipboard.writeText(content); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };

  return <div className="h-full flex flex-col rounded-lg border border-[#292a32] bg-[#0f1014] text-xs overflow-hidden">
    <div className="flex items-center justify-between border-b border-[#1d1e24] bg-[#0c0d10] px-1 overflow-x-auto">
      <div className="flex items-center">{openTabs.map(tab => <div key={tab.id} onClick={() => onSelectTab(tab)} className={`flex items-center gap-2 px-3 py-2 text-xs border-r border-[#1d1e24] cursor-pointer ${tab.id === activeFile.id ? 'bg-[#0f1014] text-white border-t border-t-zinc-400' : 'text-zinc-500 hover:text-zinc-300'}`}><FileCode2 className="w-3.5 h-3.5 text-zinc-500" /><span>{tab.name}</span><button onClick={event => { event.stopPropagation(); onCloseTab(tab.id); }} className="text-zinc-600 hover:text-white"><X className="w-3 h-3" /></button></div>)}</div>
      <div className="flex items-center gap-3 px-3 text-zinc-500"><button onClick={() => setSearchOpen(value => !value)} title="Search file"><Search className="w-3.5 h-3.5" /></button><button onClick={copy} title="Copy file content">{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}</button></div>
    </div>
    {searchOpen && <div className="flex items-center gap-2 border-b border-[#202129] bg-[#14151b] px-3 py-1.5"><Search className="h-3 w-3 text-zinc-500" /><input autoFocus value={search} onChange={event => setSearch(event.target.value)} placeholder="Search in file..." className="w-full bg-transparent text-xs text-white outline-none" />{search && <span className="text-[10px] text-zinc-500">{matches} matches</span>}</div>}
    <div className="min-h-0 flex-1"><Editor height="100%" theme="vs-dark" language={languageFor(activeFile)} value={content} onChange={value => { const next = value ?? ''; setContent(next); onUpdateContent?.(activeFile.id, next); }} options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 13, lineHeight: 20, padding: { top: 12, bottom: 12 }, scrollBeyondLastLine: false, tabSize: 2, wordWrap: 'off', renderWhitespace: 'selection', smoothScrolling: true }} /></div>
    <div className="px-3 py-1 bg-[#0c0d10] border-t border-[#1d1e24] flex items-center justify-between text-[11px] text-zinc-500 font-mono"><span>{activeFile.path}</span><span className="flex items-center gap-3"><span>UTF-8</span><span>{languageFor(activeFile)}</span><span>{content.split('\n').length} lines</span></span></div>
  </div>;
}
