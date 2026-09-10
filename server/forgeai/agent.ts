import { forgeConfig, hasGroq } from "./config";
import { intentSchema, type RequestIntent } from "./agentSchemas";

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

const conversationalPattern = /^(hi|hello|hey|hola|thanks|thank you|good morning|good afternoon|good evening|who are you|what can you do|help|how are you)\b/i;
const developmentPattern = /\b(build|create|make|develop|implement|add|remove|delete|change|update|modify|fix|debug|refactor|integrate|connect|deploy|convert|improve|optimi[sz]e|responsive|authentication|dashboard|saas|app|application|website|feature)\b/i;

export async function classifyForgeIntent(message: string): Promise<RequestIntent> {
  const text = message.trim();
  if (conversationalPattern.test(text) && !developmentPattern.test(text)) return { intent: "conversation", reason: "Greeting or general conversation" };
  if (developmentPattern.test(text)) return { intent: "development", reason: "Request contains a build, change, debugging, or deployment action" };
  if (!hasGroq()) return { intent: "conversation", reason: "No development action was detected" };
  try {
    return await getForgeAgent().completeStructured([
      { role: "system", content: "Classify the user request. Return JSON only with intent conversation or development and a short reason. Choose development only when the user asks to build, modify, debug, test, integrate, or deploy software. General questions, greetings, explanations, and capability questions are conversation." },
      { role: "user", content: text },
    ], value => intentSchema.parse(value));
  } catch {
    return { intent: "conversation", reason: "Unable to confirm a development request" };
  }
}

export const forgeAgentSystemPrompt = `You are ForgeAI, an autonomous software development agent. Understand product requests, debugging tasks, authentication work, dashboards, and UI changes. Respond with a concise implementation plan and concrete next steps. Do not claim to have modified files or deployed anything unless a tool actually performed that operation. Never request, repeat, infer, or include passwords, API keys, tokens, or secret values.`;
