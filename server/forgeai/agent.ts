import { forgeConfig, hasGroq } from "./config";

export type AgentMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface ForgeAgentProvider {
  complete(messages: AgentMessage[]): Promise<string>;
  completeStructured<T>(messages: AgentMessage[], parser: (value: unknown) => T): Promise<T>;
}

function parseJsonContent(content: string) {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(trimmed) as unknown; } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    throw new Error("Agent provider returned invalid structured output");
  }
}

export class GroqAgentProvider implements ForgeAgentProvider {
  async complete(messages: AgentMessage[]) {
    if (!hasGroq()) throw new Error("Groq is not configured");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${forgeConfig.groqApiKey}` },
      body: JSON.stringify({ model: forgeConfig.groqModel, temperature: 0.2, messages }),
    });
    if (!response.ok) {
      console.error(`[ForgeAI] Groq request failed with status ${response.status}`);
      throw new Error(`Agent provider failed (${response.status})`);
    }
    const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Agent provider returned an empty response");
    return content;
  }

  async completeStructured<T>(messages: AgentMessage[], parser: (value: unknown) => T) {
    if (!hasGroq()) throw new Error("Groq is not configured");
    const completeOnce = async (inputMessages: AgentMessage[]) => {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${forgeConfig.groqApiKey}` },
        body: JSON.stringify({ model: forgeConfig.groqModel, temperature: 0.1, response_format: { type: "json_object" }, messages: inputMessages }),
      });
      if (!response.ok) throw new Error(`Agent provider failed (${response.status})`);
      const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) throw new Error("Agent provider returned an empty response");
      try {
        return parser(parseJsonContent(content));
      } catch {
        throw new Error("Agent provider returned invalid structured output");
      }
    };
    try {
      return await completeOnce(messages);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("invalid structured output")) throw error;
      return completeOnce([...messages, { role: "user", content: "Your previous response was not valid JSON. Return only one JSON object, with no markdown fences, no explanation, and no extra text. Preserve the requested field names and value types." }]);
    }
  }
}

const providers: Record<string, ForgeAgentProvider> = { groq: new GroqAgentProvider() };

export function getForgeAgent(provider = "groq") {
  const selected = providers[provider];
  if (!selected) throw new Error(`Unsupported agent provider: ${provider}`);
  return selected;
}

export const forgeAgentSystemPrompt = `You are ForgeAI, an autonomous software development agent. Understand product requests, debugging tasks, authentication work, dashboards, and UI changes. Respond with a concise implementation plan and concrete next steps. Do not claim to have modified files or deployed anything unless a tool actually performed that operation. Never request, repeat, infer, or include passwords, API keys, tokens, or secret values.`;
