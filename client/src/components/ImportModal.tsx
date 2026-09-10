import React, { useState } from 'react';
import { X, Github, Upload, FolderGit2, Check, ArrowRight } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRepo: (url: string) => void;
  onUploadZip: (name: string) => void;
}

export function ImportModal({ isOpen, onClose, onImportRepo, onUploadZip }: ImportModalProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleImportGithub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    setImporting(true);
    setTimeout(() => {
      onImportRepo(repoUrl.trim());
      setImporting(false);
      onClose();
    }, 700);
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) return;
    setImporting(true);
    setTimeout(() => {
      onUploadZip(uploadName.trim());
      setImporting(false);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      {/* Pure minimal dark dialog without glassmorphism or heavy shadows */}
      <div className="w-full max-w-md bg-[#111216] border border-[#23242c] rounded-lg p-5 text-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-[#1f2026] mb-4">
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-zinc-300" />
            <h3 className="text-sm font-semibold text-white">Import Existing Project</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
          Open a GitHub repository or local codebase. The agent team will inspect the directory structure, dependencies, and entrypoints before making any code modifications.
        </p>

        {/* GitHub Repository Import */}
        <form onSubmit={handleImportGithub} className="space-y-3 mb-6">
          <label className="text-xs text-zinc-300 font-medium block">
            Import from GitHub
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="flex-1 bg-[#16171d] border border-[#272832] rounded px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              type="submit"
              disabled={!repoUrl.trim() || importing}
              className="px-3 py-1.5 bg-white text-black font-medium text-xs rounded hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {importing ? 'Inspecting...' : 'Import'}
            </button>
          </div>
        </form>

        {/* Upload Project Archive */}
        <div className="pt-4 border-t border-[#1f2026]">
          <label className="text-xs text-zinc-300 font-medium block mb-2">
            Upload Code Archive (.zip / folder)
          </label>
          <div className="border border-dashed border-[#292a34] rounded p-4 text-center hover:border-zinc-500 transition-colors cursor-pointer">
            <Upload className="w-5 h-5 mx-auto text-zinc-500 mb-2" />
            <div className="text-xs text-zinc-300">Click or drag folder to upload</div>
            <div className="text-[10px] text-zinc-500 mt-1">Supports Node.js, Python, Rust, Go codebases</div>
          </div>
        </div>
      </div>
    </div>
  );
}
