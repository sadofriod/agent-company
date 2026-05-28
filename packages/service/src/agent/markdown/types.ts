import type { ValidationResult } from '../../domain/base';

export type AgentMarkdownFrontMatterValue = string | readonly string[];

export type AgentMarkdownFrontMatter = Readonly<Record<string, AgentMarkdownFrontMatterValue>>;

export type AgentMarkdownWriteMode = 'create' | 'update';

export type AgentMarkdownValidationDetails = {
  readonly hasFrontMatter: boolean;
  readonly body: string;
  readonly frontMatter?: AgentMarkdownFrontMatter;
};

export type AgentMarkdownFileSummary = {
  readonly path: string;
  readonly name: string;
  readonly category: string;
  readonly size: number;
  readonly updatedAt: string;
  readonly validation: ValidationResult<AgentMarkdownValidationDetails>;
};

export type AgentMarkdownFile = AgentMarkdownFileSummary & {
  readonly content: string;
};

export type AgentMarkdownListResponse = {
  readonly ok: true;
  readonly files: readonly AgentMarkdownFileSummary[];
};

export type AgentMarkdownFileResponse = ValidationResult<AgentMarkdownFile>;

export type AgentMarkdownValidationResponse = ValidationResult<AgentMarkdownValidationDetails>;

export type AgentMarkdownDeleteResponse = ValidationResult<{ readonly path: string }>;