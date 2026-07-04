import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { APIRequestContext, APIResponse, Page } from '@playwright/test';
import { expect } from '@playwright/test';

type JsonRecord = Record<string, unknown>;

type RuntimeSessionSnapshot = {
  sessionId: string;
  status: string;
  runtimePlan: JsonRecord;
  state: {
    nextAction?: string;
    interruption?: JsonRecord;
    context?: {
      auditTrail?: Array<{
        eventType?: string;
        targetId?: string;
        reason?: string;
      }>;
    };
    discussionResult?: {
      conflicts?: unknown[];
      pendingItems?: unknown[];
      maxRoundsReached?: boolean;
    };
    pendingTickets?: unknown[];
    completedStepResults?: unknown[];
    reviewResults?: unknown[];
  };
};

type RuntimeSessionTestScenarios = {
  readonly pipelineCycle?: boolean;
  readonly capabilityMissing?: boolean;
  readonly ragEvidenceMissing?: boolean;
  readonly handoffFieldMissing?: boolean;
  readonly memoryScopePollution?: boolean;
  readonly memoryConflictEscalation?: boolean;
  readonly unauthorizedRetrieval?: boolean;
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
const docsExamplesDir = resolve(repoRoot, 'docs/examples');

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const toObject = (value: unknown): JsonRecord =>
  typeof value === 'object' && value !== null ? (value as JsonRecord) : {};

const unwrapEnvelope = <T>(value: unknown): T => {
  const payload = toObject(value);

  if (payload.ok === true && 'data' in payload) {
    return payload.data as T;
  }

  return value as T;
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const readJsonResponse = async <T>(response: APIResponse, context: string): Promise<T> => {
  const status = response.status();
  const text = await response.text();
  const payload = text.length === 0 ? {} : JSON.parse(text) as unknown;

  expect(
    response.ok(),
    `${context} failed with status ${status} and payload: ${text}`,
  ).toBeTruthy();

  return unwrapEnvelope<T>(payload);
};

export const buildWorkspaceKey = (prefix: string): string => `${prefix}-${Date.now()}`;

export const loadExampleSchema = async (fileName: string): Promise<JsonRecord> => {
  const filePath = resolve(docsExamplesDir, fileName);
  const content = await readFile(filePath, 'utf8');

  return JSON.parse(content) as JsonRecord;
};

export const listSchemaKeys = async (request: APIRequestContext): Promise<string[]> => {
  const response = await request.get('/team/schemas');
  const data = await readJsonResponse<{ schemas: Array<{ key: string }> }>(response, 'list schema keys');

  return data.schemas.map((entry) => entry.key);
};

export const upsertSchema = async (
  request: APIRequestContext,
  key: string,
  schema: JsonRecord,
): Promise<void> => {
  const schemaKeys = await listSchemaKeys(request);
  const method = schemaKeys.includes(key) ? 'put' : 'post';
  const response = await request.fetch(`/team/schemas/${encodeURIComponent(key)}`, {
    method,
    data: schema,
  });

  await readJsonResponse(response, `upsert schema ${key}`);
};

export const deleteSchemaIfExists = async (
  request: APIRequestContext,
  key: string,
): Promise<void> => {
  const schemaKeys = await listSchemaKeys(request);

  if (!schemaKeys.includes(key)) {
    return;
  }

  const response = await request.delete(`/team/schemas/${encodeURIComponent(key)}`);
  await readJsonResponse(response, `delete schema ${key}`);
};

export const createDepartmentVariant = (
  baseSchema: JsonRecord,
  departmentCount: number,
): JsonRecord => {
  const schema = deepClone(baseSchema);
  const departments = Array.isArray(schema.departments) ? deepClone(schema.departments as JsonRecord[]) : [];
  const agents = Array.isArray(schema.agents) ? deepClone(schema.agents as JsonRecord[]) : [];

  if (departments.length === 0 || agents.length === 0) {
    throw new Error('Fixture must include at least one department and one agent.');
  }

  const firstDepartment = deepClone(departments[0]);
  const firstAgent = deepClone(agents[0]);
  const selectedDepartments = departments.slice(0, Math.min(departmentCount, departments.length));

  while (selectedDepartments.length < departmentCount) {
    const nextIndex = selectedDepartments.length + 1;
    selectedDepartments.push({
      ...deepClone(firstDepartment),
      department_id: `e2e-department-${nextIndex}`,
      name: `E2E Department ${nextIndex}`,
      mission: `E2E mission ${nextIndex}`,
      agents: [firstAgent.agent_id],
    });
  }

  const selectedDepartmentIds = new Set(selectedDepartments.map((entry) => String(entry.department_id)));
  const requiredAgentIds = new Set(
    selectedDepartments.flatMap((entry) => (
      Array.isArray(entry.agents) ? entry.agents.map((agentId) => String(agentId)) : []
    )),
  );

  const selectedAgents = agents.filter((agent) => requiredAgentIds.has(String(agent.agent_id))).map((agent) => {
    const departmentId = String(agent.department_id);

    if (selectedDepartmentIds.has(departmentId)) {
      return agent;
    }

    return {
      ...agent,
      department_id: String(selectedDepartments[0].department_id),
    };
  });

  schema.team_id = `e2e-team-${departmentCount}`;
  schema.team_name = `E2E Team ${departmentCount} Departments`;
  schema.departments = selectedDepartments;
  schema.agents = selectedAgents;

  if (toObject(schema.discussion_policy).supervisor_agent_id !== undefined && selectedAgents.length > 0) {
    const supervisorAgentId = selectedAgents[0]?.agent_id;

    if (typeof supervisorAgentId === 'string' && supervisorAgentId.length > 0) {
      (schema.discussion_policy as JsonRecord).supervisor_agent_id = supervisorAgentId;
    }
  }

  return schema;
};

export const createOwnerConflictSchema = (baseSchema: JsonRecord): JsonRecord => {
  const schema = deepClone(baseSchema);
  const departments = Array.isArray(schema.departments) ? deepClone(schema.departments as JsonRecord[]) : [];

  if (departments.length < 2) {
    throw new Error('Owner conflict fixture requires at least 2 departments.');
  }

  schema.team_id = 'e2e-owner-conflict-team';
  schema.team_name = 'E2E Owner Conflict Team';
  (schema.discussion_policy as JsonRecord) = {
    ...(toObject(schema.discussion_policy)),
    mode: 'parallel_review',
    conflict_resolution: 'block_and_escalate',
    max_rounds: 3,
  };

  return schema;
};

export const createMaxRoundsSchema = (baseSchema: JsonRecord): JsonRecord => {
  const schema = createOwnerConflictSchema(baseSchema);
  (schema.discussion_policy as JsonRecord).max_rounds = 1;
  schema.team_id = 'e2e-max-rounds-team';
  schema.team_name = 'E2E Max Rounds Team';

  return schema;
};

export const createDiscussionModeSchema = (
  baseSchema: JsonRecord,
  mode: 'supervisor_led' | 'sequential_handoff' | 'parallel_review',
): JsonRecord => {
  const schema = deepClone(baseSchema);
  const agents = Array.isArray(schema.agents) ? (schema.agents as JsonRecord[]) : [];
  const firstAgentId = agents[0]?.agent_id;

  schema.team_id = `e2e-mode-${mode}`;
  schema.team_name = `E2E Discussion Mode ${mode}`;
  schema.discussion_policy = {
    ...(toObject(schema.discussion_policy)),
    mode,
    max_rounds: 4,
    conflict_resolution: 'supervisor_decision',
    required_outputs: ['topic', 'decision', 'ticket_draft'],
    ...(typeof firstAgentId === 'string' && firstAgentId.length > 0
      ? { supervisor_agent_id: firstAgentId }
      : {}),
  };

  return schema;
};

export const openWorkspace = async (page: Page, key: string): Promise<void> => {
  await page.goto('/');

  const workspaceItem = page.getByRole('button', {
    name: new RegExp(`^${escapeRegExp(key)}\\b`),
  });

  await expect(workspaceItem).toBeVisible();
  await workspaceItem.click();
  await page.waitForURL(new RegExp(`/workspaces/${escapeRegExp(key)}`));
  await expect(page.getByText('Loading from service')).not.toBeVisible();
};

export const startRuntimeSession = async (
  request: APIRequestContext,
  schema: JsonRecord,
  goal: string,
  testScenarios?: RuntimeSessionTestScenarios,
): Promise<RuntimeSessionSnapshot> => {
  const response = await request.post('/runtime/session', {
    data: {
      task: {
        title: `E2E ${goal}`,
        goal,
        constraints: [],
      },
      team: schema,
      traceId: `e2e-${Date.now()}`,
      ...(testScenarios === undefined ? {} : { testScenarios }),
    },
  });

  return readJsonResponse<RuntimeSessionSnapshot>(response, 'start runtime session');
};

export const advanceRuntimeSession = async (
  request: APIRequestContext,
  sessionId: string,
): Promise<RuntimeSessionSnapshot> => {
  const response = await request.post(`/runtime/session/${sessionId}/advance`);

  return readJsonResponse<RuntimeSessionSnapshot>(response, `advance runtime session ${sessionId}`);
};

export const getRuntimeSession = async (
  request: APIRequestContext,
  sessionId: string,
): Promise<RuntimeSessionSnapshot> => {
  const response = await request.get(`/runtime/session/${sessionId}`);

  return readJsonResponse<RuntimeSessionSnapshot>(response, `get runtime session ${sessionId}`);
};

const delay = async (milliseconds: number): Promise<void> => {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
};

export const waitForRuntimeSession = async (
  request: APIRequestContext,
  sessionId: string,
  predicate: (session: RuntimeSessionSnapshot) => boolean,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
  },
): Promise<RuntimeSessionSnapshot> => {
  const maxAttempts = options?.maxAttempts ?? 24;
  const intervalMs = options?.intervalMs ?? 500;

  let latestSession = await getRuntimeSession(request, sessionId);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (predicate(latestSession)) {
      return latestSession;
    }

    await delay(intervalMs);
    latestSession = await getRuntimeSession(request, sessionId);
  }

  return latestSession;
};

export const advanceUntilStable = async (
  request: APIRequestContext,
  initialSession: RuntimeSessionSnapshot,
  maxSteps = 12,
): Promise<RuntimeSessionSnapshot> => {
  let session = initialSession;

  for (let index = 0; index < maxSteps; index += 1) {
    const hasInterruption = session.state.interruption !== undefined;
    const statusDone = session.status !== 'running';
    const nextAction = session.state.nextAction?.toLowerCase() ?? '';
    const looksComplete = nextAction.includes('completed') || nextAction.includes('requires conflict resolution');

    if (hasInterruption || statusDone || looksComplete) {
      return session;
    }

    session = await advanceRuntimeSession(request, session.sessionId);
  }

  return session;
};

export const postRuntimePlan = async (
  request: APIRequestContext,
  schema: JsonRecord,
): Promise<JsonRecord> => {
  const response = await request.post('/runtime-plan', { data: schema });

  return readJsonResponse<JsonRecord>(response, 'build runtime plan');
};
