import React, { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  ChevronRight, 
  ChevronDown, 
  Sparkles,
  Plus,
  RefreshCw
} from 'lucide-react';
import { ProjectFile } from '../types';

interface FileExplorerProps {
  files: ProjectFile[];
  activeFile: ProjectFile | null;
  onSelectFile: (file: ProjectFile) => void;
  onNewFile?: () => void;
}

interface FileTreeItemProps {
  file: ProjectFile;
  level: number;
  activeFileId?: string;
  onSelectFile: (file: ProjectFile) => void;
}

function FileTreeItem({ file, level, activeFileId, onSelectFile }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isFolder = file.type === 'folder';
  const isSelected = activeFileId === file.id;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile(file);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        className={`flex items-center justify-between py-1 pr-2 text-xs cursor-pointer select-none transition-colors group ${
          isSelected
            ? 'bg-[#1b1c23] text-white font-medium'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15161c]'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {isFolder ? (
            <>
              {isOpen ? (
                <ChevronDown className="w-3 h-3 text-zinc-500" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              )}
              {isOpen ? (
                <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-zinc-500" />
              )}
            </>
          ) : (
            <>
              <span className="w-3" />
              <FileCode className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400" />
            </>
          )}
          <span className="truncate">{file.name}</span>
        </div>

        {/* Activity indicator: subtle dot when modified by an agent recently */}
        {file.isModifiedRecently && (
          <span 
            title="Modified by agent" 
            className="w-1.5 h-1.5 rounded-full bg-zinc-400 agent-live-dot flex-shrink-0" 
          />
        )}
      </div>

      {isFolder && isOpen && file.children && (
        <div>
          {file.children.map((child) => (
            <FileTreeItem
              key={child.id}
              file={child}
              level={level + 1}
              activeFileId={activeFileId}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileExplorer({ files, activeFile, onSelectFile, onNewFile }: FileExplorerProps) {
  return (
    <div className="h-full flex flex-col font-mono text-xs">
      <div className="px-3 py-2 border-b border-[#1d1e24] flex items-center justify-between text-zinc-400">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-sans font-medium">
          Files
        </span>
        <div className="flex items-center gap-1">
          {onNewFile && (
            <button
              onClick={onNewFile}
              title="New file"
              className="p-1 hover:text-white hover:bg-[#1a1b22] rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {files.map((file) => (
          <FileTreeItem
            key={file.id}
            file={file}
            level={0}
            activeFileId={activeFile?.id}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </div>
  );
}
