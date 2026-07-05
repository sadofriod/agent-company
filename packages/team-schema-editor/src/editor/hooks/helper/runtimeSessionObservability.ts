import type {
  RuntimeEventEnvelope,
  RuntimeEventFeedItem,
  RuntimeEventToolCall,
  RuntimeNodeInsight,
} from './runtimeSession.types';

const MAX_EVENT_FEED_ITEMS = 120;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const toRuntimeNodeId = (
  eventType: string,
  payload: Readonly<Record<string, unknown>>,
): string | undefined => {
  if (eventType.startsWith('discussion.')) {
    return 'discussion';
  }

  if (eventType.startsWith('pipeline.')) {
    return 'pipeline';
  }

  if (eventType.startsWith('review.')) {
    return 'review';
  }

  if (eventType.startsWith('memory.')) {
    return asString(payload.stepId) === undefined ? 'memory:discussion' : 'memory:session';
  }

  if (eventType.startsWith('runtime.')) {
    return 'goal';
  }

  return undefined;
};

const toConclusion = (
  payload: Readonly<Record<string, unknown>>,
  fallbackSummary: string,
): string => {
  const conclusion =
    asString(payload.conclusion)
    ?? asString(payload.responseSummary)
    ?? asString(payload.summary)
    ?? asString(payload.reason)
    ?? fallbackSummary;

  return conclusion;
};

const toRuntimeToolCalls = (
  payload: Readonly<Record<string, unknown>>,
): readonly RuntimeEventToolCall[] => {
  const toolCalls = payload.toolCalls;

  if (!Array.isArray(toolCalls)) {
    return [];
  }

  return toolCalls
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const capabilityId = asString(entry.capabilityId);
      const status = asString(entry.status);

      if (capabilityId === undefined || status === undefined) {
        return null;
      }

      return {
        capabilityId,
        status,
        ...(asString(entry.callId) === undefined ? {} : { callId: asString(entry.callId) }),
        ...(asString(entry.inputSummary) === undefined ? {} : { inputSummary: asString(entry.inputSummary) }),
        ...(asString(entry.outputSummary) === undefined ? {} : { outputSummary: asString(entry.outputSummary) }),
      };
    })
    .filter((entry): entry is RuntimeEventToolCall => entry !== null);
};

type RuntimeHighlightInput = {
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
  actor?: RuntimeEventEnvelope['actor'];
  resolveDepartmentIdByAgentId: (agentId: string) => string | undefined;
};

const toRuntimeNodeIds = ({
  eventType,
  payload,
  actor,
}: RuntimeHighlightInput): readonly string[] => {
  const nodeIds = new Set<string>();
  const agentId = asString(actor?.agentId) ?? asString(payload.agentId);
  const departmentId = asString(actor?.departmentId) ?? asString(payload.departmentId);

  if (agentId !== undefined) {
    nodeIds.add(`agent:${agentId}`);
  }

  if (departmentId !== undefined) {
    nodeIds.add(`department:${departmentId}`);
  }

  const runtimeNodeId = toRuntimeNodeId(eventType, payload);

  if (runtimeNodeId !== undefined) {
    nodeIds.add(runtimeNodeId);
  }

  if (eventType === 'runtime.work_mode_routed') {
    const mode = asString(payload.mode);

    if (mode === 'discussion') {
      nodeIds.add('discussion');
    }

    if (mode === 'pipeline') {
      nodeIds.add('pipeline');
    }
  }

  return [...nodeIds];
};

const toRuntimeEdgeIds = ({
  eventType,
  payload,
  actor,
  resolveDepartmentIdByAgentId,
}: RuntimeHighlightInput): readonly string[] => {
  const edgeIds = new Set<string>();
  const agentId = asString(actor?.agentId) ?? asString(payload.agentId);

  if (eventType.startsWith('discussion.') || eventType === 'runtime.work_mode_routed') {
    edgeIds.add('goal-discussion');
  }

  if (eventType.startsWith('pipeline.')) {
    edgeIds.add('goal-pipeline');
  }

  if (eventType.startsWith('memory.')) {
    if (asString(payload.stepId) === undefined) {
      edgeIds.add('discussion-memory-discussion');
    } else {
      edgeIds.add('pipeline-memory-session');
    }
  }

  if (eventType === 'discussion.turn_recorded') {
    edgeIds.add('discussion-supervisor');
  }

  if (agentId !== undefined) {
    const departmentId = asString(actor?.departmentId) ?? asString(payload.departmentId) ?? resolveDepartmentIdByAgentId(agentId);

    if (departmentId !== undefined) {
      edgeIds.add(`department-agent:${departmentId}:${agentId}`);
    }
  }

  return [...edgeIds];
};

export const parseRuntimeEvent = (raw: string): RuntimeEventEnvelope | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isRecord(parsed)) {
      return null;
    }

    if (typeof parsed.eventType !== 'string' || !isRecord(parsed.payload)) {
      return null;
    }

    return parsed as RuntimeEventEnvelope;
  } catch {
    return null;
  }
};

export const appendRuntimeEventFeed = (
  feed: readonly RuntimeEventFeedItem[],
  event: RuntimeEventFeedItem,
): readonly RuntimeEventFeedItem[] => [event, ...feed].slice(0, MAX_EVENT_FEED_ITEMS);

export const deriveRuntimeObservabilityState = (
  event: RuntimeEventEnvelope,
  resolveDepartmentIdByAgentId: (agentId: string) => string | undefined,
): {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
  readonly feedItem: RuntimeEventFeedItem;
  readonly nodeInsights: Readonly<Record<string, RuntimeNodeInsight>>;
} => {
  const payload = isRecord(event.payload) ? event.payload : {};
  const summary = asString(payload.reason) ?? event.eventType;
  const conclusion = toConclusion(payload, summary);
  const toolCalls = toRuntimeToolCalls(payload);
  const highlightInput: RuntimeHighlightInput = {
    eventType: event.eventType,
    payload,
    actor: event.actor,
    resolveDepartmentIdByAgentId,
  };
  const nodeIds = toRuntimeNodeIds(highlightInput);
  const edgeIds = toRuntimeEdgeIds(highlightInput);
  const nodeInsights = Object.fromEntries(
    nodeIds.map((nodeId) => [
      nodeId,
      {
        nodeId,
        eventType: event.eventType,
        updatedAt: event.ts,
        summary,
        conclusion,
        toolCalls,
      } satisfies RuntimeNodeInsight,
    ]),
  );

  return {
    nodeIds,
    edgeIds,
    nodeInsights,
    feedItem: {
      eventId: event.eventId,
      eventType: event.eventType,
      ts: event.ts,
      level: event.level,
      summary,
      conclusion,
      nodeIds,
      edgeIds,
      toolCalls,
    },
  };
};
