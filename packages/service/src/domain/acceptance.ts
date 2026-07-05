import type { MemoryObject } from './memory';
import type { TeamDefinition } from './organization';
import type { ReviewStatus } from './review';

/**
 * 表示一组 Team Schema 测试夹具。
 */
export type TeamSchemaFixture = {
  /** 夹具名称。 */
  readonly name: string;
  /** 夹具用途说明。 */
  readonly description: string;
  /** 夹具对应的团队定义。 */
  readonly schema: TeamDefinition;
  /** 预期出现的问题码集合。 */
  readonly expectedIssueCodes?: readonly string[];
};

/**
 * 表示 Pipeline 相关测试夹具。
 */
export type PipelineFixture = {
  /** 夹具名称。 */
  readonly name: string;
  /** 夹具说明。 */
  readonly description: string;
  /** 对应的 Pipeline 标识。 */
  readonly pipelineId: string;
  /** 预期结果。 */
  readonly expectedOutcome: ReviewStatus | PipelineFixtureExpectedOutcome;
};

export enum PipelineFixtureExpectedOutcome {
  CapabilityMissing = 'capability_missing',
  PipelineCycleDetected = 'pipeline_cycle_detected',
}

export enum MemoryFixtureExpectedOutcome {
  Retrieved = 'retrieved',
  Filtered = 'filtered',
  MemoryConflict = 'memory_conflict',
  PromotionDenied = 'promotion_denied',
}

/**
 * 表示记忆模块测试夹具。
 */
export type MemoryFixture = {
  /** 夹具名称。 */
  readonly name: string;
  /** 夹具说明。 */
  readonly description: string;
  /** 夹具包含的记忆对象。 */
  readonly objects: readonly MemoryObject[];
  /** 预期结果。 */
  readonly expectedOutcome: MemoryFixtureExpectedOutcome;
};

export enum ReleaseChecklistArea {
  Organization = 'organization',
  Discussion = 'discussion',
  Pipeline = 'pipeline',
  Capability = 'capability',
  Memory = 'memory',
  Review = 'review',
  Runtime = 'runtime',
  Acceptance = 'acceptance',
}

/**
 * 表示一条 MVP 验收场景定义。
 */
export type AcceptanceScenario = {
  /** 场景编号。 */
  readonly code: string;
  /** 场景标题。 */
  readonly title: string;
  /** 场景描述。 */
  readonly description: string;
  /** 场景断言。 */
  readonly assertion: string;
};

/**
 * 表示发布前检查项。
 */
export type ReleaseChecklistItem = {
  /** 检查项所属领域。 */
  readonly area: ReleaseChecklistArea;
  /** 检查项描述。 */
  readonly description: string;
  /** 是否为必须满足项。 */
  readonly required: boolean;
};