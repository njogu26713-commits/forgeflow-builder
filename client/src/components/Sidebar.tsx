import React from 'react';
import { Plus, FolderGit2, Settings, Code, Sparkles, Terminal as TermIcon, ExternalLink, Home, GitBranch, KeyRound } from 'lucide-react';
import { ProjectData } from '../types';
import type { ForgeUser } from '../lib/forgeaiApi';

interface SidebarProps {
  projects: ProjectData[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeSection: 'home' | 'projects' | 'source' | 'secrets' | 'settings';
  onSelectSection: (section: 'home' | 'projects' | 'source' | 'secrets' | 'settings') => void;
  user: ForgeUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export function Sidebar({
  projects,
  activeProjectId,
  onSelectProject,
  onNewProject,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
  activeSection,
  onSelectSection,
  user,
  onOpenAuth,
  onLogout
}: SidebarProps) {
  const navigation = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'projects' as const, label: 'Projects', icon: FolderGit2 },
    { id: 'source' as const, label: 'Source Control', icon: GitBranch },
    { id: 'secrets' as const, label: 'Secrets', icon: KeyRound },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
        />
      )}

      <aside className={`
        fixed md:static inset-y-0 left-0 z-40
        w-60 bg-[#0e0f13] border-r border-[#1d1e24]
        flex flex-col justify-between
        transition-transform duration-200 ease-out
        ${isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Top: Logo & New Project */}
        <div className="p-3">
          {/* Logo / App Name: Simple, clean, no colorful badges */}
          <div className="flex items-center justify-between px-2 py-1.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                Forgeflow
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              v1.2
            </span>
          </div>

          {/* New Project Button */}
          <button
            onClick={() => {
              onNewProject();
              onCloseMobile();
            }}
            className="w-full flex items-center gap-2 text-xs text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-md hover:bg-[#181920] transition-colors font-medium text-left"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-400" />
            <span>New project</span>
          </button>

          <nav className="mt-4 space-y-0.5" aria-label="Primary navigation">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  onSelectSection(id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                  activeSection === id
                    ? 'bg-[#1b1c23] text-white font-medium'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15161c]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 text-zinc-500" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          {/* Projects Section */}
          <div className="mt-4">
            <div className="px-2 mb-1.5 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
              Projects
            </div>
            <div className="space-y-0.5">
              {projects.map((proj) => {
                const isActive = proj.id === activeProjectId;
                return (
                  <button
                    key={proj.id}
                    onClick={() => {
                      onSelectProject(proj.id);
                      onCloseMobile();
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between group ${
                      isActive
                        ? 'bg-[#1b1c23] text-white font-medium'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#15161c]'
                    }`}
                  >
                    <span className="truncate">{proj.name}</span>
                    <span className="text-[10px] text-zinc-600 group-hover:text-zinc-400 font-mono transition-colors">
                      {proj.lastActive}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom: authenticated account status */}
        <div className="p-3 border-t border-[#1d1e24] space-y-1">
          {user ? (
            <button onClick={onLogout} className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#181920] transition-colors">
              <div className="text-xs text-zinc-200 truncate">{user.name}</div>
              <div className="text-[10px] text-zinc-500 truncate mt-0.5">{user.email} · Log out</div>
            </button>
          ) : (
            <button onClick={onOpenAuth} className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-zinc-300 hover:text-white hover:bg-[#181920] transition-colors">
              Sign in to save your workspace
            </button>
          )}
          <div className="px-2.5 pt-2 text-[10px] text-zinc-600 font-mono flex items-center justify-between">
            <span>{user ? 'Persistent workspace' : 'Local session only'}</span>
            <span className="flex items-center gap-1 text-zinc-400">
              <span className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500/80' : 'bg-amber-500/80'}`} />
              {user ? 'online' : 'unsigned'}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
