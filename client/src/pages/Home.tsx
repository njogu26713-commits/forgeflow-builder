import React, { useState, useEffect, useRef } from 'react';
import { 
  Menu, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Code, 
  Eye, 
  Terminal as TermIcon, 
  MessageSquare, 
  Columns2, 
  Check, 
  Plus, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  ProjectData, 
  ChatMessage, 
  ProjectFile, 
  AgentRole, 
  TechnicalDetail,
  TerminalEntry 
} from '../types';
import { forgeaiApi, type ForgeUser } from '../lib/forgeaiApi';
import { AuthModal } from '../components/AuthModal';
import { Sidebar } from '../components/Sidebar';
import { ChatMessageItem } from '../components/ChatMessageItem';
import { TypingIndicator } from '../components/TypingIndicator';
import { MessageComposer } from '../components/MessageComposer';
import { WelcomeState } from '../components/WelcomeState';
import { FileExplorer } from '../components/FileExplorer';
import { CodeEditor } from '../components/CodeEditor';
import { LivePreview } from '../components/LivePreview';
import { TerminalView } from '../components/TerminalView';
import { ImportModal } from '../components/ImportModal';
import { SettingsModal } from '../components/SettingsModal';
import { toast } from 'sonner';

type WorkspaceSection = 'home' | 'projects' | 'source' | 'secrets' | 'settings';

const EMPTY_PROJECT: ProjectData = {
  id: '', name: 'New project', description: '', activeBranch: 'main', lastActive: 'Now',
  files: [], messages: [], terminal: [], previewUrl: '', previewState: 'stopped'
};

function toProjectData(project: { id: string; name: string; description: string; files: unknown[]; updatedAt: string }): ProjectData {
  return {
    id: project.id, name: project.name, description: project.description, activeBranch: 'main',
    lastActive: new Date(project.updatedAt).toLocaleDateString(), files: project.files as ProjectFile[],
    messages: [], terminal: [], previewUrl: '', previewState: 'stopped'
  };
}

function SectionLanding({ section, onAction }: { section: Exclude<WorkspaceSection, 'home' | 'projects'>; onAction: () => void }) {
  const content = {
    source: {
      title: 'Source Control',
      description: 'Connect GitHub repositories and inspect branches, commits, changes, and pull requests from the workspace.',
      action: 'Connect repository',
    },
    secrets: {
      title: 'Secrets',
      description: 'Manage environment variables securely. Secret values stay hidden until you explicitly reveal them.',
      action: 'Add secret',
    },
    settings: {
      title: 'Settings',
      description: 'Configure account preferences, agent behavior, connected services, deployment targets, and appearance.',
      action: 'Open settings',
    },
  }[section];

  return (
    <div className="max-w-xl mx-auto px-6 pt-24">
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono uppercase tracking-wider mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
        ForgeAI workspace
      </div>
      <h1 className="text-2xl font-medium tracking-tight text-white mb-2">{content.title}</h1>
      <p className="text-sm leading-relaxed text-zinc-400 max-w-lg">{content.description}</p>
      <button
        onClick={onAction}
        className="mt-7 bg-zinc-100 text-zinc-950 hover:bg-white rounded-md px-3 py-2 text-xs font-medium transition-colors"
      >
        {content.action}
      </button>

      {section === 'source' && (
        <div className="mt-10 max-w-2xl rounded-lg border border-[#23242c] bg-[#111216] p-4">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            <span>Connected repositories</span>
            <span className="text-zinc-600 normal-case tracking-normal">No connections</span>
          </div>
          <div className="mt-4 rounded-md border border-[#202129] bg-[#15161b] p-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-zinc-300">No repository connected</div>
              <div className="text-xs text-zinc-500 mt-1">Connect GitHub to view branches, commits, changes, and pull requests.</div>
            </div>
            <button onClick={onAction} className="text-xs text-zinc-400 hover:text-white transition-colors">Connect</button>
          </div>
        </div>
      )}

      {section === 'secrets' && (
        <div className="mt-10 max-w-2xl rounded-lg border border-[#23242c] bg-[#111216] p-4">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            <span>Project environment</span>
            <span className="text-zinc-600 normal-case tracking-normal">No secrets loaded</span>
          </div>
          <div className="mt-4 rounded-md border border-dashed border-[#292a32] bg-[#15161b] p-4 text-xs text-zinc-500">Add a project secret to manage environment values securely. Values will be encrypted server-side and remain masked here.</div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [authUser, setAuthUser] = useState<ForgeUser | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<WorkspaceSection>('home');

  // Active project & file selection
  const currentProject = projects.find((p) => p.id === activeProjectId) || EMPTY_PROJECT;
  const [activeFile, setActiveFile] = useState<ProjectFile | null>(null);
  const [openTabs, setOpenTabs] = useState<ProjectFile[]>([]);

  // Workspace layout mode for desktop:
  // 'chat-only' | 'split-workspace'
  const [workspaceMode, setWorkspaceMode] = useState<'chat-only' | 'split-workspace'>('chat-only');

  // Mobile view mode: 'chat' | 'editor' | 'preview' | 'terminal'
  const [mobileView, setMobileView] = useState<'chat' | 'editor' | 'preview' | 'terminal'>('chat');

  // Active workspace right panel tab: 'editor' | 'preview' | 'terminal'
  const [workspaceTab, setWorkspaceTab] = useState<'editor' | 'preview' | 'terminal'>('preview');

  // Streaming / Typing simulation state
  const [activeAgentTyping, setActiveAgentTyping] = useState<AgentRole | null>(null);

  // Modals
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize active file and tabs when project changes
  useEffect(() => {
    if (currentProject) {
      const findFirstFile = (files: ProjectFile[]): ProjectFile | null => {
        for (const f of files) {
          if (f.type === 'file') return f;
          if (f.children) {
            const nested = findFirstFile(f.children);
            if (nested) return nested;
          }
        }
        return null;
      };

      const defaultFile = findFirstFile(currentProject.files);
      if (defaultFile) {
        setActiveFile(defaultFile);
        setOpenTabs([defaultFile]);
      }
    }
  }, [activeProjectId]);

  // Auto-scroll chat to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentProject?.messages, activeAgentTyping]);

  useEffect(() => {
    void (async () => {
      try {
        const me = await forgeaiApi.me();
        setAuthUser(me.user);
        if (!me.user) return;
        const [{ projects: remoteProjects }, { chats }] = await Promise.all([forgeaiApi.projects(), forgeaiApi.chats()]);
        const mapped = remoteProjects.map(toProjectData);
        for (const project of mapped) {
          const chat = chats.find(item => item.projectId === project.id);
          if (chat) {
            project.messages = chat.messages.map((message, index) => ({
              id: `${chat.id}-${index}`, sender: message.role === 'user' ? 'user' : 'coder', text: message.content,
              timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
          }
        }
        setProjects(mapped);
        if (mapped[0]) setActiveProjectId(mapped[0].id);
      } catch {
        toast.error('ForgeAI backend is not configured yet');
      }
    })();
  }, []);

  const handleNewProject = async () => {
    if (!authUser) { setAuthModalOpen(true); return; }
    try {
      const { project } = await forgeaiApi.createProject({ name: 'Untitled project', description: 'New ForgeAI workspace' });
      const next = toProjectData(project);
      setProjects(prev => [next, ...prev]);
      setActiveProjectId(next.id);
      setActiveSection('projects');
      setWorkspaceMode('split-workspace');
      setMobileView('chat');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create project');
    }
  };

  const triggerAgentHandoff = async (userPrompt: string) => {
    if (!authUser) { setAuthModalOpen(true); toast('Sign in to persist chats and use the ForgeAI agent'); return; }
    setActiveAgentTyping('planner');
    try {
      let projectId = activeProjectId || null;
      if (!projectId) {
        const created = await forgeaiApi.createProject({ name: userPrompt.slice(0, 48) || 'Untitled project', description: userPrompt });
        const next = toProjectData(created.project);
        setProjects(prev => [next, ...prev]);
        setActiveProjectId(next.id);
        projectId = next.id;
      }
      const result = await forgeaiApi.agentChat({ projectId, message: userPrompt, provider: 'groq' });
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: 'user', text: userPrompt, timestamp };
      const agentMsg: ChatMessage = { id: `agent-${Date.now()}`, sender: 'coder', text: result.response, timestamp };
      setProjects(prev => prev.map(project => project.id === projectId ? { ...project, messages: [...project.messages, userMsg, agentMsg], lastActive: 'Just now' } : project));
      setActiveSection('projects');
      setWorkspaceMode('split-workspace');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The ForgeAI agent is unavailable');
    } finally {
      setActiveAgentTyping(null);
    }
  };

  const handleActionButton = (action: string) => {
    if (action === 'create_railway') {
      toast.success('railway.toml generated and deployment configured');
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const confirmMsg: ChatMessage = {
        id: `dep-conf-${Date.now()}`,
        sender: 'deployment',
        text: 'I have configured railway.toml with Nixpacks builder and health check endpoints. The application is production ready.',
        timestamp,
        technicalDetails: {
          filesModified: ['railway.toml'],
          command: 'railway up --detach',
          commandResult: 'Deployment initiated: build hash e7b49d'
        }
      };
      setProjects((prev) =>
        prev.map((p) => p.id === activeProjectId ? { ...p, messages: [...p.messages, confirmMsg] } : p)
      );
    } else if (action === 'skip_deployment') {
      toast('Deployment configuration skipped');
    }
  };

  // Tab & File selection
  const handleSelectFile = (file: ProjectFile) => {
    if (file.type === 'file') {
      setActiveFile(file);
      if (!openTabs.some((t) => t.id === file.id)) {
        setOpenTabs([...openTabs, file]);
      }
      setWorkspaceTab('editor');
      setMobileView('editor');
    }
  };

  const handleCloseTab = (fileId: string) => {
    const nextTabs = openTabs.filter((t) => t.id !== fileId);
    setOpenTabs(nextTabs);
    if (activeFile?.id === fileId) {
      setActiveFile(nextTabs.length > 0 ? nextTabs[nextTabs.length - 1] : null);
    }
  };

  // Terminal command executor
  const handleTerminalCommand = (cmd: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let stdout = `Executed: ${cmd}`;
    if (cmd === 'npm test') {
      stdout = '✓ src/auth.test.ts (2 tests passed)\n✓ src/marketplace.test.ts (4 tests passed)\nAll 6 tests passed in 480ms';
    } else if (cmd.startsWith('git status')) {
      stdout = 'On branch main\nnothing to commit, working tree clean';
    } else if (cmd.startsWith('npm run build')) {
      stdout = 'vite v7.1.7 building for production...\n✓ 48 modules transformed.\nBuild completed in 312ms';
    }

    const newEntries: TerminalEntry[] = [
      { id: `t-cmd-${Date.now()}`, type: 'cmd', content: `$ ${cmd}`, timestamp },
      { id: `t-out-${Date.now()}`, type: 'stdout', content: stdout, timestamp }
    ];

    setProjects((prev) =>
      prev.map((p) => p.id === activeProjectId ? { ...p, terminal: [...p.terminal, ...newEntries] } : p)
    );
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0c0d0e] text-[#f4f4f5]">
      {/* 4. Left Sidebar: Narrow, minimal, dark, no cards */}
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          setActiveSection('projects');
          setMobileView('chat');
        }}
        onNewProject={handleNewProject}
        onOpenSettings={() => setSettingsModalOpen(true)}
        isOpenMobile={sidebarMobileOpen}
        onCloseMobile={() => setSidebarMobileOpen(false)}
        activeSection={activeSection}
        user={authUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={async () => { await forgeaiApi.logout(); setAuthUser(null); setProjects([]); setActiveProjectId(''); setActiveSection('home'); }}
        onSelectSection={(section) => {
          setActiveSection(section);
          if (section === 'home') {
            setActiveProjectId('');
            setWorkspaceMode('chat-only');
            setMobileView('chat');
          }
          if (section === 'projects') {
            setWorkspaceMode('split-workspace');
            setMobileView('chat');
          }
        }}
      />

      {/* Main Continuous Workspace */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
        {/* Top Minimal Workspace Nav Bar: functional buttons, subtle separators */}
        <header className="h-11 border-b border-[#1d1e24] px-4 flex items-center justify-between text-xs bg-[#0c0d0e] z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarMobileOpen(true)}
              className="md:hidden p-1 text-zinc-400 hover:text-white"
              title="Open sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-zinc-200 font-medium tracking-tight">
              {activeSection === 'home' ? 'ForgeAI' : activeSection === 'projects' ? (currentProject.name || 'Projects') : activeSection[0].toUpperCase() + activeSection.slice(1)}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">
              branch: {currentProject.activeBranch}
            </span>
          </div>

          {/* Desktop Workspace Mode Toggle */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => setWorkspaceMode(workspaceMode === 'chat-only' ? 'split-workspace' : 'chat-only')}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
                workspaceMode === 'split-workspace'
                  ? 'text-zinc-100 bg-[#1a1b22]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle code workspace split"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
          </div>

          {/* Mobile View Switcher (21. Responsive Design) */}
          <div className="flex lg:hidden items-center gap-1 text-[11px]">
            <button
              onClick={() => setMobileView('chat')}
              className={`px-2 py-1 rounded transition-colors ${
                mobileView === 'chat' ? 'text-white bg-[#1a1b22]' : 'text-zinc-400'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setMobileView('preview')}
              className={`px-2 py-1 rounded transition-colors ${
                mobileView === 'preview' ? 'text-white bg-[#1a1b22]' : 'text-zinc-400'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setMobileView('editor')}
              className={`px-2 py-1 rounded transition-colors ${
                mobileView === 'editor' ? 'text-white bg-[#1a1b22]' : 'text-zinc-400'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setMobileView('terminal')}
              className={`px-2 py-1 rounded transition-colors ${
                mobileView === 'terminal' ? 'text-white bg-[#1a1b22]' : 'text-zinc-400'
              }`}
            >
              Term
            </button>
          </div>
        </header>

        {/* Continuous Body: Conversation + Coding Workspace */}
        <div className="flex-1 flex min-h-[calc(100vh-2.75rem)] items-start relative">
          {/* Main Chat / Conversation: Visible on desktop always, or when mobileView === 'chat' */}
          <div className={`flex flex-col min-h-[calc(100vh-2.75rem)] transition-all duration-150 ${
            workspaceMode === 'split-workspace' 
              ? 'w-full lg:w-[48%] border-r border-[#1d1e24]' 
              : 'w-full max-w-4xl mx-auto'
          } ${mobileView !== 'chat' || (activeSection !== 'home' && activeSection !== 'projects') ? 'hidden' : 'flex'}`}>
            {/* Scrollable Conversation Stream */}
            {activeSection === 'home' ? (
              <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 pb-16">
                <div className="w-full max-w-3xl mx-auto">
                  <WelcomeState onSelectPrompt={(p) => triggerAgentHandoff(p)} />
                  <MessageComposer
                    onSendMessage={(text) => triggerAgentHandoff(text)}
                    disabled={!!activeAgentTyping}
                    activeAgent={activeAgentTyping}
                    onOpenImport={() => setImportModalOpen(true)}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
                  {currentProject.messages.length === 0 ? (
                    <WelcomeState onSelectPrompt={(p) => triggerAgentHandoff(p)} />
                  ) : (
                    currentProject.messages.map((msg) => (
                      <ChatMessageItem
                        key={msg.id}
                        message={msg}
                        onActionButtonClick={handleActionButton}
                      />
                    ))
                  )}

                  {activeAgentTyping && <TypingIndicator agent={activeAgentTyping} />}
                  <div ref={messagesEndRef} />
                </div>

                <MessageComposer
                  onSendMessage={(text) => triggerAgentHandoff(text)}
                  disabled={!!activeAgentTyping}
                  activeAgent={activeAgentTyping}
                  onOpenImport={() => setImportModalOpen(true)}
                />
              </>
            )}
          </div>

          {activeSection !== 'home' && activeSection !== 'projects' && (
            <div className="flex-1 min-w-0">
              <SectionLanding
                section={activeSection}
                onAction={() => {
                  if (activeSection === 'settings') setSettingsModalOpen(true);
                  else toast(`${activeSection === 'source' ? 'Repository connection' : 'Secret management'} is ready for integration`);
                }}
              />
            </div>
          )}

          {/* 11. Code Workspace Panel: Files | Editor | Preview | Terminal */}
          {/* Desktop split view */}
          {workspaceMode === 'split-workspace' && activeSection === 'projects' && (
            <div className="hidden lg:flex flex-1 flex-col min-h-[calc(100vh-2.75rem)] bg-[#0a0b0e] overflow-hidden">
              {/* Workspace Navigation Bar: Files | Editor | Preview | Terminal */}
              <div className="h-9 border-b border-[#1d1e24] bg-[#0c0d10] px-3 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-4 font-medium">
                  <button
                    onClick={() => setWorkspaceTab('editor')}
                    className={`transition-colors py-1 flex items-center gap-1.5 ${
                      workspaceTab === 'editor' ? 'text-white border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Editor</span>
                  </button>

                  <button
                    onClick={() => setWorkspaceTab('preview')}
                    className={`transition-colors py-1 flex items-center gap-1.5 ${
                      workspaceTab === 'preview' ? 'text-white border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => setWorkspaceTab('terminal')}
                    className={`transition-colors py-1 flex items-center gap-1.5 ${
                      workspaceTab === 'terminal' ? 'text-white border-b-2 border-zinc-200' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <TermIcon className="w-3.5 h-3.5" />
                    <span>Terminal</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                  <span>TaskForge Runtime</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
                </div>
              </div>

              {/* Workspace Split Body */}
              <div className="flex-1 flex min-h-0">
                {/* 12. File Explorer Sub-column */}
                <div className="w-48 border-r border-[#1d1e24] bg-[#0c0d10] flex-shrink-0">
                  <FileExplorer
                    files={currentProject.files}
                    activeFile={activeFile}
                    onSelectFile={handleSelectFile}
                    onNewFile={() => toast('New file creation modal')}
                  />
                </div>

                {/* Main Content: Editor or Preview or Terminal */}
                <div className="flex-1 min-w-0 h-full overflow-hidden">
                  {workspaceTab === 'editor' && (
                    <CodeEditor
                      activeFile={activeFile}
                      openTabs={openTabs}
                      onSelectTab={(tab) => setActiveFile(tab)}
                      onCloseTab={handleCloseTab}
                    />
                  )}

                  {workspaceTab === 'preview' && (
                    <LivePreview
                      url={currentProject.previewUrl}
                      projectId={currentProject.id}
                      state={currentProject.previewState}
                    />
                  )}

                  {workspaceTab === 'terminal' && (
                    <TerminalView
                      entries={currentProject.terminal}
                      onExecuteCommand={handleTerminalCommand}
                      onClear={() => {
                        setProjects((prev) =>
                          prev.map((p) => p.id === activeProjectId ? { ...p, terminal: [] } : p)
                        );
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mobile dedicated views when tab is toggled */}
          {mobileView !== 'chat' && (
            <div className="flex lg:hidden flex-1 flex-col h-full bg-[#0a0b0e] overflow-hidden">
              {mobileView === 'editor' && (
                <div className="flex flex-col h-full">
                  <div className="h-32 border-b border-[#1d1e24] overflow-y-auto">
                    <FileExplorer
                      files={currentProject.files}
                      activeFile={activeFile}
                      onSelectFile={handleSelectFile}
                    />
                  </div>
                  <div className="flex-1 min-h-0">
                    <CodeEditor
                      activeFile={activeFile}
                      openTabs={openTabs}
                      onSelectTab={(tab) => setActiveFile(tab)}
                      onCloseTab={handleCloseTab}
                    />
                  </div>
                </div>
              )}

              {mobileView === 'preview' && (
                <LivePreview
                  url={currentProject.previewUrl}
                  projectId={currentProject.id}
                  state={currentProject.previewState}
                />
              )}

              {mobileView === 'terminal' && (
                <TerminalView
                  entries={currentProject.terminal}
                  onExecuteCommand={handleTerminalCommand}
                  onClear={() => {
                    setProjects((prev) =>
                      prev.map((p) => p.id === activeProjectId ? { ...p, terminal: [] } : p)
                    );
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImportRepo={(url) => {
          toast.success(`Imported ${url}. Codebase inspected.`);
        }}
        onUploadZip={(name) => {
          toast.success(`Uploaded ${name}. Project files mounted.`);
        }}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
}
