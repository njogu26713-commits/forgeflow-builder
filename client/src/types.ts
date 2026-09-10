export type AgentRole = 
  | 'planner' 
  | 'coder' 
  | 'preview' 
  | 'debugger' 
  | 'deployment' 
  | 'security';

export interface TechnicalDetail {
  filesModified?: string[];
  command?: string;
  commandResult?: string;
  apiRequests?: { method: string; path: string; status: number; duration: string }[];
  buildOutput?: string;
  errors?: string[];
  handoffTo?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | AgentRole;
  text: string;
  timestamp: string;
  technicalDetails?: TechnicalDetail;
  actionButtons?: { id: string; label: string; action: string; primary?: boolean }[];
  isStreaming?: boolean;
  blocks?: import('./components/NativeBlocks').NativeBlock[];
}

export interface ProjectFile {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'folder';
  children?: ProjectFile[];
  content?: string;
  language?: string;
  lastModifiedBy?: AgentRole;
  isModifiedRecently?: boolean;
}

export interface TerminalEntry {
  id: string;
  type: 'cmd' | 'stdout' | 'stderr' | 'system';
  content: string;
  timestamp: string;
}

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  activeBranch: string;
  lastActive: string;
  files: ProjectFile[];
  messages: ChatMessage[];
  terminal: TerminalEntry[];
  previewUrl: string;
  previewState: 'ready' | 'building' | 'error' | 'stopped';
}
