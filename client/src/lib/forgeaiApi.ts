export type ForgeUser = { id: string; name: string; email: string; createdAt: string };

export type ForgeApiProject = {
  id: string;
  name: string;
  description: string;
  files: unknown[];
  repository?: Record<string, unknown> | null;
  deployment?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ForgeApiChat = {
  id: string;
  title: string;
  projectId: string | null;
  messages: Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
  return body as T;
}

export const forgeaiApi = {
  me: () => request<{ user: ForgeUser | null; configured: boolean }>('/auth/me'),
  projects: () => request<{ projects: ForgeApiProject[] }>('/projects'),
  createProject: (input: { name: string; description?: string }) => request<{ project: ForgeApiProject }>('/projects', { method: 'POST', body: JSON.stringify(input) }),
  chats: () => request<{ chats: ForgeApiChat[] }>('/chats'),
  agentChat: (input: { chatId?: string; projectId?: string | null; message: string; provider?: string }) => request<{ chat: ForgeApiChat; response: string }>('/agent/chat', { method: 'POST', body: JSON.stringify(input) }),
  logout: () => request<{ success: true }>('/auth/logout', { method: 'POST' }),
};
