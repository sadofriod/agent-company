import type { AgentDefinition, AgentLlmApiFormat } from '../../domain/organization';

export const DEFAULT_LLM_PROVIDER = 'default';
export const DEFAULT_LLM_API_FORMAT: AgentLlmApiFormat = 'openai_chat';

export type ResolvedAgentLlmBinding = {
  readonly provider: string;
  readonly model: string;
  readonly apiFormat: AgentLlmApiFormat;
  readonly baseUrl?: string;
  readonly apiKeyEnv?: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly topP?: number;
};

export type AgentGatewayBinding = {
  readonly agentId: AgentDefinition['agentId'];
  readonly role: AgentDefinition['role'];
  readonly llm: ResolvedAgentLlmBinding;
  readonly toolPolicy?: string;
  readonly tools: readonly string[];
  readonly allowedCommands: readonly string[];
  readonly requiredCommands: readonly string[];
};

const copyHeaders = (
  headers: Readonly<Record<string, string>> | undefined,
): Readonly<Record<string, string>> => ({ ...(headers ?? {}) });

export const resolveAgentGatewayBinding = (
  agent: AgentDefinition,
): AgentGatewayBinding => {
  const metadata = agent.metadata;
  const llm = metadata?.llm;

  return {
    agentId: agent.agentId,
    role: agent.role,
    llm: {
      provider: llm?.provider ?? DEFAULT_LLM_PROVIDER,
      model: llm?.model ?? agent.model,
      apiFormat: llm?.apiFormat ?? DEFAULT_LLM_API_FORMAT,
      baseUrl: llm?.baseUrl,
      apiKeyEnv: llm?.apiKeyEnv,
      headers: copyHeaders(llm?.headers),
      temperature: llm?.temperature,
      maxTokens: llm?.maxTokens,
      topP: llm?.topP,
    },
    toolPolicy: metadata?.toolPolicy,
    tools: [...(metadata?.tools ?? [])],
    allowedCommands: [...(metadata?.allowedCommands ?? [])],
    requiredCommands: [...(metadata?.requiredCommands ?? [])],
  };
};