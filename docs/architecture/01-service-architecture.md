# Service 后端架构

## 概述

Service是Express应用，负责：
- Team Schema CRUD与验证
- Runtime Session调度与执行
- Agent Markdown存储管理
- 数据持久化与查询

## 启动流程

```typescript
// src/index.ts
const createApp = async (options) => {
  const app = express();
  
  // 1. 初始化适配器
  app.locals.agentMarkdownAdapter = 
    createAgentMarkdownAdapter({ agentsDirectory });
  app.locals.runtimeSessionScheduler = 
    createRuntimeSessionScheduler({ observabilityRepository });
  
  // 2. 中间件
  app.use(express.json({ limit: '1mb' }));
  
  // 3. 自动注册路由
  await registerFileRoutes(app, {
    routesDirectory: 'src/routes',
    moduleUrl: import.meta.url
  });
  
  return app;
};
```

## 路由系统 (自动注册)

### 约定

- **目录结构** → **HTTP路由**
  ```
  src/routes/team/schemas/get.ts      → GET /team/schemas
  src/routes/team/schema/post.ts      → POST /team/schema
  src/routes/team/schema/[id]/put.ts  → PUT /team/schema/:id
  src/routes/runtime/session/post.ts  → POST /runtime/session
  ```

- **参数映射**: `[param]` → `:param`
- **支持方法**: get, post, put, delete, patch

### 响应统一格式

所有路由返回HTTP envelope (src/routes/_shared/response.ts)：

```typescript
// 成功
{ ok: true, data: T }

// 失败
{ ok: false, error: { 
    code: string,
    message: string,
    issues?: Array<{ path: string[], message: string }>
  }
}
```

## 模块分层

### 1. Domain (src/domain/)

纯类型定义，**无代码依赖**：

```typescript
// domain/organization.ts
export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  department_id?: string;
  role?: string;
  metadata?: AgentMetadata;
}

export interface TeamDefinition {
  name: string;
  agents: AgentDefinition[];
  departments: DepartmentDefinition[];
  discussions: DiscussionDefinition[];
  pipelines: PipelineDefinition[];
  // ...
}

// domain/base.ts - 统一的验证结果类型
export interface ValidationResult<T> {
  ok: boolean;
  data?: T;
  issues?: SchemaIssue[];
}

// domain/runtime.ts
export interface RuntimeSession {
  id: string;
  status: 'running' | 'completed' | 'failed';
  state: RuntimeState;
  events: RuntimeEvent[];
  createdAt: Date;
}

export interface RuntimeState {
  workModeDecision?: WorkModeDecision;
  pendingTickets: Ticket[];
  completedTickets: Ticket[];
  activePipeline?: PipelineInstance;
  discussionResult?: DiscussionResult;
  completedStepResults: StepResult[];
  // ...
}
```

**要点**:
- 所有类型使用 `readonly` 确保不可变性
- 没有方法或实现
- 支持序列化/反序列化

### 2. Schema (src/schema/)

Schema加载、验证与持久化：

```typescript
// schema/loadTeamSchema.ts
export const loadTeamSchema = (input: string | unknown): 
  ValidationResult<TeamDefinition> => {
  
  // 1. JSON解析
  const rawValue = typeof input === 'string' ? 
    JSON.parse(input) : input;
  
  // 2. Zod类型验证 (snake_case → camelCase)
  const parsed = teamSchema.safeParse(rawValue);
  if (!parsed.success) {
    return { ok: false, issues: mapZodIssues(parsed.error) };
  }
  
  // 3. 引用验证 (cross-object)
  return validateTeamReferences(parsed.data);
};
```

#### Zod Schema (src/schema/teamDefinitionSchema.ts)

```typescript
// 定义字段转换规则
const agentSchema = z.object({
  id: z.string(),
  name: z.string(),
  department_id: z.string().optional(), // snake_case
  metadata: z.object({ llm: z.string() }).optional()
}).strict();

// 启用snake_case自动转换
const withSnakeCaseTransform = z.object({...})
  .transform(obj => camelCaseKeys(obj));

export const teamSchema = withSnakeCaseTransform;
```

#### 引用验证 (src/schema/teamReferenceValidation.ts)

```typescript
export const validateTeamReferences = (team: TeamDefinition): 
  ValidationResult<TeamDefinition> => {
  
  const issues: SchemaIssue[] = [];
  const agentIds = new Set(team.agents.map(a => a.id));
  
  // 检查department_id指向的agent存在
  team.agents.forEach(agent => {
    if (agent.department_id && !agentIds.has(agent.department_id)) {
      issues.push({
        path: ['agents', agent.id, 'department_id'],
        message: `Department agent ${agent.department_id} not found`
      });
    }
  });
  
  // 检查discussion的agents存在
  team.discussions?.forEach(disc => {
    disc.agents?.forEach(id => {
      if (!agentIds.has(id)) {
        issues.push({
          path: ['discussions', disc.id, 'agents'],
          message: `Agent ${id} not found`
        });
      }
    });
  });
  
  return issues.length > 0 ? 
    { ok: false, issues } : 
    { ok: true, data: team };
};
```

### 3. Routes (src/routes/)

HTTP入口点，负责：
- 请求参数提取与验证
- 业务逻辑调用
- 响应格式化

#### 例: Team Schema CRUD

```typescript
// src/routes/team/schema/get.ts
import { getPrismaClient } from '../../../adapter/prismaClient';

export const handler = async (req, res) => {
  const prisma = getPrismaClient();
  const schema = await prisma.teamSchema.findUnique({
    where: { key: 'current' }
  });
  
  res.json({ ok: true, data: schema });
};
```

```typescript
// src/routes/team/schema/post.ts
import { loadTeamSchema } from '../../../schema/loadTeamSchema';
import { getPrismaClient } from '../../../adapter/prismaClient';

export const handler = async (req, res) => {
  const result = loadTeamSchema(req.body);
  
  if (!result.ok) {
    return res.status(400).json({ 
      ok: false, 
      error: { code: 'VALIDATION_ERROR', issues: result.issues }
    });
  }
  
  const prisma = getPrismaClient();
  const updated = await prisma.teamSchema.update({
    where: { key: 'current' },
    data: { document: result.data }
  });
  
  res.json({ ok: true, data: updated.document });
};
```

```typescript
// src/routes/team/schema/put.ts
// 同 POST 的逻辑
```

#### 例: Runtime Session

```typescript
// src/routes/runtime/session/post.ts
// 创建新的runtime session

export const handler = async (req, res) => {
  const { workModeKey } = req.body;
  
  // 1. 加载当前team schema
  const schema = await loadCurrentSchema();
  
  // 2. 验证
  const validation = loadTeamSchema(schema);
  if (!validation.ok) {
    return res.status(400).json({ ok: false, error: validation.issues });
  }
  
  // 3. 创建session
  const session = createRuntimeSession(validation.data, { workModeKey });
  
  // 4. 持久化
  const prisma = getPrismaClient();
  await prisma.runtimeSession.create({
    data: {
      id: session.id,
      document: session,
      status: session.status
    }
  });
  
  res.json({ ok: true, data: session });
};
```

```typescript
// src/routes/runtime/session/[id]/advance.ts
// 推进session到下一步

export const handler = async (req, res) => {
  const { id } = req.params;
  
  const prisma = getPrismaClient();
  const current = await prisma.runtimeSession.findUnique({
    where: { id }
  });
  
  const result = advanceRuntimeSession(current.document);
  
  if (!result.ok) {
    return res.status(400).json({ ok: false, error: result.issues });
  }
  
  await prisma.runtimeSession.update({
    where: { id },
    data: { document: result.data }
  });
  
  res.json({ ok: true, data: result.data });
};
```

### 4. Runtime (src/runtime/)

Runtime引擎，负责会话生命周期与状态推进：

```typescript
// runtime/advanceRuntimeSession.ts
export const advanceRuntimeSession = (
  session: RuntimeSession,
  options?: AdvanceRuntimeSessionOptions
): ValidationResult<RuntimeSession> => {
  
  if (session.status !== 'running') {
    return { ok: false, issues: createNotRunningIssues(session.status) };
  }
  
  // 1. 路由work mode
  const workModeDecision = routeWorkMode(session.state);
  
  let nextSession = updateRuntimeSession(session, 
    { workModeDecision, context: { currentMode: workModeDecision.mode } },
    { eventType: RUNTIME_EVENT_TYPE.RuntimeWorkModeRouted }
  );
  
  // 2. 根据mode执行
  switch (workModeDecision.mode) {
    case WORK_MODE.Discussion:
      nextSession = executeDiscussionStage(nextSession);
      break;
    case WORK_MODE.Pipeline:
      nextSession = executePipelineStage(nextSession);
      break;
    case WORK_MODE.Delivery:
      nextSession = executeDeliveryStage(nextSession);
      break;
  }
  
  // 3. 检查完成条件
  if (isSessionComplete(nextSession)) {
    nextSession.status = 'completed';
    nextSession = appendEvent(nextSession, {
      eventType: RUNTIME_EVENT_TYPE.RuntimeSessionCompleted
    });
  }
  
  return { ok: true, data: nextSession };
};
```

#### Work Mode 路由 (runtime/routeWorkMode.ts)

```typescript
export const routeWorkMode = (state: RuntimeState): WorkModeDecision => {
  // 优先级: Discussion > Pipeline > Delivery
  
  if (hasPendingDiscussions(state)) {
    return { 
      mode: WORK_MODE.Discussion, 
      reason: 'Pending discussions',
      requiredObjects: ['discussion'] 
    };
  }
  
  if (hasActivePipeline(state)) {
    return { 
      mode: WORK_MODE.Pipeline,
      reason: 'Active pipeline steps',
      requiredObjects: ['pipeline']
    };
  }
  
  if (hasPendingDeliveries(state)) {
    return { 
      mode: WORK_MODE.Delivery,
      reason: 'Pending deliverables',
      requiredObjects: ['delivery']
    };
  }
  
  return { 
    mode: WORK_MODE.Idle,
    reason: 'All work completed'
  };
};
```

#### Stage Executors

```typescript
// runtime/advanceRuntimeSession/discussion.ts
export const executeDiscussionStage = (session: RuntimeSession): RuntimeSession => {
  // 1. 查找待执行的discussion
  const discussion = findNextDiscussion(session.state);
  if (!discussion) return session;
  
  // 2. 组装agent gateway payload
  const payload = buildAgentGatewayPayload(session, discussion);
  
  // 3. 调用agent gateway (模拟或真实)
  const result = await callAgentGateway(payload);
  
  // 4. 更新state
  return updateRuntimeSession(session, 
    { discussionResult: result },
    { eventType: RUNTIME_EVENT_TYPE.DiscussionCompleted }
  );
};

// runtime/advanceRuntimeSession/pipeline.ts
export const executePipelineStage = (session: RuntimeSession): RuntimeSession => {
  const pipeline = session.state.activePipeline;
  if (!pipeline) return session;
  
  // 1. 查找ready的steps
  const readySteps = findReadySteps(pipeline);
  
  // 2. 并发执行
  const results = await Promise.all(
    readySteps.map(step => executeStep(session, step))
  );
  
  // 3. 更新completedStepResults
  return updateRuntimeSession(session,
    { completedStepResults: [...session.state.completedStepResults, ...results] },
    { eventType: RUNTIME_EVENT_TYPE.PipelineStepCompleted }
  );
};
```

### 5. Agent (src/agent/)

代理相关功能：

#### Assembly (agent/assembly/)

```typescript
// agent/assembly/index.ts - 组装运行时agent
export const assembleAgent = (agentDef: AgentDefinition): RuntimeAgent => {
  return {
    id: agentDef.id,
    name: agentDef.name,
    metadata: agentDef.metadata,
    capabilities: resolveAgentCapabilities(agentDef),
    memoryProfiles: resolveMemoryProfilesById(agentDef.metadata?.memory_profiles)
  };
};

// agent/assembly/resolveAgentCapabilities.ts
export const resolveAgentCapabilities = (agent: AgentDefinition): Capability[] => {
  if (!agent.metadata?.capability_ids) return [];
  
  return agent.metadata.capability_ids.map(id => 
    loadCapabilityFromRegistry(id)
  );
};
```

#### Markdown (agent/markdown/)

```typescript
// agent/markdown/index.ts
export const loadAgentMarkdown = async (path: string): Promise<AgentMarkdown> => {
  const content = await readFile(path);
  
  // 解析front matter
  const { frontMatter, content: body } = parseFrontMatter(content);
  
  // 提取摘要
  const summary = extractSummary(body);
  
  return {
    path,
    frontMatter,
    summary,
    content: body
  };
};

// agent/markdown/contentValidation.ts
export const validateAgentMarkdown = (content: string): ValidationResult<void> => {
  // 1. 检查front matter
  const fmResult = validateFrontMatter(content);
  if (!fmResult.ok) return fmResult;
  
  // 2. 检查markdown语法
  const mdResult = validateMarkdownSyntax(content);
  if (!mdResult.ok) return mdResult;
  
  return { ok: true };
};
```

### 6. Adapter (src/adapter/)

外部依赖适配层：

```typescript
// adapter/agentMarkdownAdapter.ts - 抽象接口
export interface AgentMarkdownAdapter {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  delete(path: string): Promise<void>;
  list(directory: string): Promise<string[]>;
}

// adapter/localAgentMarkdownAdapter.ts - 本地文件实现
export const createLocalAdapter = (baseDir: string): AgentMarkdownAdapter => ({
  read: (path) => readFile(join(baseDir, path), 'utf-8'),
  write: (path, content) => writeFile(join(baseDir, path), content),
  delete: (path) => unlink(join(baseDir, path)),
  list: (dir) => readdir(join(baseDir, dir))
});

// adapter/vercelBlobAgentMarkdownAdapter.ts - Vercel Blob实现
export const createVercelBlobAdapter = (): AgentMarkdownAdapter => ({
  read: async (path) => {
    const blob = await vercelBlob.get(path);
    return blob.text();
  },
  write: (path, content) => vercelBlob.put(path, content),
  delete: (path) => vercelBlob.delete(path),
  list: (dir) => vercelBlob.list({ prefix: dir })
});

// adapter/createAgentMarkdownAdapter.ts - 工厂
export const createAgentMarkdownAdapter = (options): AgentMarkdownAdapter => {
  const storage = process.env.AGENT_MARKDOWN_STORAGE || 'local';
  return storage === 'vercel_blob' ? 
    createVercelBlobAdapter() : 
    createLocalAdapter(options.agentsDirectory);
};
```

```typescript
// adapter/prismaClient.ts
export const getPrismaClient = (): PrismaClient => {
  if (!globalThis.prismaClient) {
    globalThis.prismaClient = new PrismaClient({
      adapter: new PgAdapter(new Pool({ connectionString: process.env.DATABASE_URL }))
    });
  }
  return globalThis.prismaClient;
};
```

```typescript
// adapter/runtimeObservabilityRepository.ts
export interface RuntimeObservabilityRepository {
  saveEvent(event: RuntimeEvent): Promise<void>;
  queryEvents(sessionId: string): Promise<RuntimeEvent[]>;
}

export const createPrismaRuntimeObservabilityRepository = (
  prisma: PrismaClient
): RuntimeObservabilityRepository => ({
  saveEvent: (event) => 
    prisma.runtimeEvent.create({ data: event }),
  queryEvents: (sessionId) =>
    prisma.runtimeEvent.findMany({ where: { sessionId } })
});
```

## 数据库模式 (Prisma)

```prisma
// prisma/schema.prisma

model TeamSchema {
  id        String   @id @default(cuid())
  key       String   @unique  // 'current' for main schema
  document  Json               // TeamDefinition JSON
  updatedAt DateTime @updatedAt
}

model RuntimeSession {
  id        String   @id @default(cuid())
  document  Json               // RuntimeSession JSON
  status    String   @default("running")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model RuntimeEvent {
  id         String   @id @default(cuid())
  sessionId  String
  eventType  String
  timestamp  DateTime @default(now())
  metadata   Json?
  
  @@index([sessionId])
}

model AgentMarkdownMetadata {
  id        String   @id @default(cuid())
  path      String   @unique
  summary   String?
  frontMatter Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 错误处理

### 统一的错误码

```typescript
// domain/base.ts
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_RUNNING = 'NOT_RUNNING'
}

export interface SchemaIssue {
  path: string[];
  code?: ErrorCode;
  message: string;
  context?: string;
}
```

### 错误映射 (Zod→Domain)

```typescript
// schema/teamSchemaShared.ts
export const mapZodIssue = (zodIssue: ZodIssue): SchemaIssue => ({
  path: zodIssue.path.map(String),
  code: 'VALIDATION_ERROR',
  message: zodIssue.message
});
```

## 性能考虑

### 1. 路由自动注册缓存

路由在启动时一次性注册，避免每次请求的动态查询。

### 2. Prisma查询优化

```typescript
// 使用select减少返回字段
const schema = await prisma.teamSchema.findUnique({
  where: { key: 'current' },
  select: { document: true, updatedAt: true }
});
```

### 3. JSON大小限制

Express配置 `limit: '1mb'` 防止过大的schema请求。

### 4. 并发执行

Pipeline stage执行中使用 `Promise.all()` 实现step级并发。

## 测试策略

```typescript
// 单元测试 - Zod Schema
test('loadTeamSchema validates snake_case conversion', () => {
  const input = { name: 'Team', agents: [{ id: '1', department_id: '2' }] };
  const result = loadTeamSchema(input);
  expect(result.data.agents[0].departmentId).toBe('2');
});

// 集成测试 - 路由
test('POST /team/schema creates schema', async () => {
  const res = await request(app)
    .post('/team/schema')
    .send({ name: 'Test', agents: [] });
  expect(res.body.ok).toBe(true);
});

// Runtime测试
test('advanceRuntimeSession routes to discussion', () => {
  const session = createTestSession();
  const result = advanceRuntimeSession(session);
  expect(result.data.state.workModeDecision.mode).toBe(WORK_MODE.Discussion);
});
```

## 下一步阅读

- [前端编辑器架构](./02-team-schema-editor-architecture.md)
- [Runtime 引擎详解](./04-runtime-engine.md)
- [API 合同](./05-api-contracts.md)
