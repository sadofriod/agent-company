import type { ValidationResult } from '../domain/base';
import type {
  AgentMarkdownFile,
  AgentMarkdownFileSummary,
  AgentMarkdownValidationDetails,
  AgentMarkdownWriteMode,
} from '../agent/markdown';

export type AgentMarkdownStorageProvider = 'local' | 'vercel_blob';

export type AgentMarkdownWriteInput = {
  readonly path: string;
  readonly content: string;
  readonly mode: AgentMarkdownWriteMode;
};

export type AgentMarkdownAdapter = {
  readonly list: () => Promise<readonly AgentMarkdownFileSummary[]>;
  readonly read: (path: string) => Promise<ValidationResult<AgentMarkdownFile>>;
  readonly validate: (path: string, content: string) => ValidationResult<AgentMarkdownValidationDetails>;
  readonly write: (input: AgentMarkdownWriteInput) => Promise<ValidationResult<AgentMarkdownFile>>;
  readonly delete: (path: string) => Promise<ValidationResult<{ readonly path: string }>>;
};