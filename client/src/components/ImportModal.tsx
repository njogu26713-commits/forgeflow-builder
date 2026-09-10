import React, { useRef, useState } from 'react';
import { X, Github, Upload, FolderGit2 } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRepo: (url: string) => void;
  onUploadFiles: (files: FileList, sourceName: string) => Promise<void>;
}

export function ImportModal({ isOpen, onClose, onImportRepo, onUploadFiles }: ImportModalProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;
  const handleImportGithub = (event: React.FormEvent) => {
    event.preventDefault();
    if (!repoUrl.trim()) return;
    onImportRepo(repoUrl.trim()); onClose();
  };
  const handleFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    setImporting(true);
    try { await onUploadFiles(files, files[0].name.endsWith('.zip') ? files[0].name : 'Local folder'); onClose(); }
    finally { setImporting(false); event.target.value = ''; }
  };

  return <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-[#111216] border border-[#23242c] rounded-lg p-5 text-zinc-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#1f2026] mb-4"><div className="flex items-center gap-2"><FolderGit2 className="w-4 h-4 text-zinc-300" /><h3 className="text-sm font-semibold text-white">Import Existing Project</h3></div><button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button></div>
      <p className="text-xs text-zinc-400 mb-5 leading-relaxed">Open a GitHub repository, ZIP archive, or local folder. Files will be mounted into the project workspace for the agents and editor.</p>
      <form onSubmit={handleImportGithub} className="space-y-3 mb-6"><label className="text-xs text-zinc-300 font-medium block">Import from GitHub</label><div className="flex gap-2"><Github className="mt-2 h-4 w-4 text-zinc-500" /><input type="text" value={repoUrl} onChange={event => setRepoUrl(event.target.value)} placeholder="https://github.com/owner/repository" className="flex-1 bg-[#16171d] border border-[#272832] rounded px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500" /><button type="submit" disabled={!repoUrl.trim()} className="px-3 py-1.5 bg-white text-black font-medium text-xs rounded hover:bg-zinc-200 disabled:opacity-50">Import</button></div></form>
      <div className="pt-4 border-t border-[#1f2026]"><label className="text-xs text-zinc-300 font-medium block mb-2">Upload ZIP or local folder</label><input ref={inputRef} type="file" accept=".zip,application/zip" multiple onChange={handleFiles} className="hidden" /><input type="file" {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)} multiple onChange={handleFiles} className="hidden" id="folder-upload" /><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => inputRef.current?.click()} className="rounded-lg border border-dashed border-[#292a34] p-4 text-center hover:border-zinc-500"><Upload className="w-5 h-5 mx-auto text-zinc-500 mb-2" /><span className="text-xs text-zinc-300">{importing ? 'Reading…' : 'Choose ZIP'}</span></button><label htmlFor="folder-upload" className="rounded-lg border border-dashed border-[#292a34] p-4 text-center hover:border-zinc-500 cursor-pointer"><FolderGit2 className="w-5 h-5 mx-auto text-zinc-500 mb-2" /><span className="text-xs text-zinc-300">Choose folder</span></label></div></div>
    </div>
  </div>;
}
