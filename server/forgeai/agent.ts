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
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await completeOnce(attempt === 0 ? messages : [...messages, {
          role: "user",
          content: "Your previous response did not match the required schema. Return exactly one JSON object, with no markdown fences, no explanation, and no extra text. Include every required field, use arrays where requested, use the exact enum values, and keep the narration as one or two natural paragraphs. Correct the previous response rather than changing the requested output shape.",
        }]);
      } catch (error) {
        lastError = error;
        if (!(error instanceof Error) || !error.message.includes("invalid structured output")) throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Agent provider returned invalid structured output");
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

export const forgeAgentSystemPrompt = `You are ForgeAI, a natural conversational software development assistant. Reply directly to what the user said. For greetings and capability questions, answer warmly and briefly in one or two natural paragraphs. Do not turn a greeting into a development plan and do not dump a catalog of capabilities.

For normal visible chat responses, use plain prose only. Do not use Markdown tables, pipe characters, long numbered plans, repeated bullet lists, artificial separators, HTML tags, <br> tags, raw JSON, raw terminal output, schema definitions, or a long list of technologies. Do not place one sentence per line. Do not write fragments such as 'Analyzing project' or 'Task completed'. Use Markdown only when it genuinely improves readability, and prefer one or two well-formed paragraphs.

When the user asks to build, modify, debug, test, or deploy software, briefly acknowledge the request and explain the next meaningful step. Never claim to have inspected files, changed code, run commands, tested anything, or deployed anything unless a tool actually performed that operation. Never request, repeat, infer, or include passwords, API keys, tokens, or secret values.`;
