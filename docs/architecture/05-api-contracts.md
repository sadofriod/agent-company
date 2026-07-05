# API 合同 (API Contracts)

## 总体设计原则

- **RESTful路由**: 使用文件系统自动注册
- **统一响应格式**: `{ ok: boolean, data?: T, error?: ErrorInfo }`
- **版本管理**: API路径中不体现版本 (使用向后兼容设计)
- **错误编码**: 统一的错误码集合

## 响应格式

### 成功响应

```typescript
interface SuccessResponse<T> {
  ok: true;
  data: T;
}

// 示例
GET /team/schema
{
  ok: true,
  data: {
    name: "Engineering Team",
    agents: [...],
    departments: [...]
  }
}
```

### 失败响应

```typescript
interface ErrorResponse {
  ok: false;
  error: {
    code: string;                  // 错误码
    message: string;               // 用户友好消息
    issues?: SchemaIssue[];         // 验证错误详情
  };
}

interface SchemaIssue {
  path: string[];                 // 错误路径 e.g., ['agents', '0', 'name']
  code?: string;                  // 子错误码
  message: string;                // 错误描述
  context?: string;               // 额外上下文
}

// 示例
POST /team/schema
{
  ok: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Schema validation failed',
    issues: [
      {
        path: ['agents', '0', 'department_id'],
        code: 'REFERENCE_ERROR',
        message: 'Department agent not found',
        context: 'Expected agent ID from departments array'
      }
    ]
  }
}
```

## HTTP状态码约定

| 状态码 | 场景 | ok值 |
|--------|------|------|
| 200 | 成功 (GET/POST/PUT/DELETE) | true |
| 201 | 资源已创建 | true |
| 204 | 无内容 (DELETE) | true |
| 400 | 验证失败、参数错误 | false |
| 409 | 冲突 (并发修改) | false |
| 500 | 服务端错误 | false |

## Team Schema API

### 1. GET /team/schema

获取当前team schema

**参数**: 无

**响应**:
```typescript
{
  ok: true,
  data: TeamDefinition  // 完整的schema
}
```

**示例**:
```bash
curl http://localhost:3000/team/schema
{
  ok: true,
  data: {
    name: "Engineering Team",
    agents: [
      { id: "engineer-1", name: "Alice", role: "Frontend Engineer" },
      { id: "engineer-2", name: "Bob", role: "Backend Engineer" }
    ],
    departments: [
      { id: "dept-1", name: "Platform", members: ["engineer-1"] }
    ],
    discussions: [...],
    pipelines: [...],
    layout: { nodes: [...], edges: [...] }
  }
}
```

---

### 2. POST /team/schema

创建新的team schema

**请求体**: TeamDefinition

**验证**:
- Schema需通过Zod类型验证
- Schema需通过引用验证 (validateTeamReferences)

**响应**: 201 Created
```typescript
{
  ok: true,
  data: TeamDefinition  // 保存后的schema
}
```

**错误示例**: 400 Bad Request
```typescript
{
  ok: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Schema validation failed',
    issues: [
      {
        path: ['agents', '0', 'name'],
        message: 'Required field missing'
      }
    ]
  }
}
```

---

### 3. PUT /team/schema

更新当前team schema (替换)

**请求体**: TeamDefinition (完整的新schema)

**验证**: 同POST

**响应**: 200 OK
```typescript
{
  ok: true,
  data: TeamDefinition
}
```

**备注**: 
- 这是覆盖操作, 不是merge
- 必须包含完整的layout信息 (由前端使用 `withWorkflowLayoutDocument()` 提供)

---

### 4. GET /team/schemas

获取所有保存的team schemas (集合)

**参数**: 无

**响应**: 200 OK
```typescript
{
  ok: true,
  data: Array<{
    key: string;
    schema: TeamDefinition;
    updatedAt: string;  // ISO datetime
  }>
}
```

**示例**:
```bash
curl http://localhost:3000/team/schemas
{
  ok: true,
  data: [
    {
      key: "current",
      schema: { name: "Engineering Team", ... },
      updatedAt: "2026-06-27T10:30:00Z"
    },
    {
      key: "backup-2026-06-26",
      schema: { name: "Engineering Team", ... },
      updatedAt: "2026-06-26T15:45:00Z"
    }
  ]
}
```

---

### 5. DELETE /team/schema

删除当前team schema

**参数**: 可选 `?key=current`

**响应**: 204 No Content (或 200 ok: true)

**约束**: 
- 不允许删除 `key='current'` (只能通过创建新schema替换)
- 其他key可以删除

---

### 6. POST /team/validate

验证schema (不保存)

**请求体**: TeamDefinition

**响应**: 200 OK
```typescript
{
  ok: true,
  data: {
    valid: boolean;
    issues?: SchemaIssue[];
  }
}
```

**使用场景**: 用户在编辑过程中实时验证, 不想保存

---

## Runtime Session API

### 1. POST /runtime/session

创建并启动新的runtime session

**请求体**:
```typescript
{
  schema: TeamDefinition;
  workModeKey?: string;  // 可选: 初始work mode
}
```

**前置条件**:
- Schema必须有效
- 所有workflow nodes必须关联到schema agents
- 所有agents必须有metadata.llm

**响应**: 201 Created
```typescript
{
  ok: true,
  data: RuntimeSession
}
```

**示例**:
```bash
curl -X POST http://localhost:3000/runtime/session \
  -H "Content-Type: application/json" \
  -d '{
    "schema": { name: "Team", agents: [...] }
  }'

{
  ok: true,
  data: {
    id: "sess_abc123",
    status: "running",
    state: {
      workModeDecision: null,
      pendingTickets: [...],
      completedTickets: [],
      activePipeline: null,
      discussionResult: null,
      completedStepResults: [],
      generatedHandoffs: [],
      reviewResults: [],
      context: { currentMode: null }
    },
    events: [
      {
        id: "evt_1",
        sessionId: "sess_abc123",
        eventType: "runtime.session.created",
        timestamp: "2026-06-27T10:30:00Z"
      }
    ],
    createdAt: "2026-06-27T10:30:00Z",
    updatedAt: "2026-06-27T10:30:00Z"
  }
}
```

**错误**: 400 Bad Request
```typescript
{
  ok: false,
  error: {
    code: 'UNASSIGNED_NODES',
    message: 'Workflow nodes not assigned to agents',
    issues: [
      {
        path: ['workflow', 'nodes'],
        message: 'Node "workflow-agent:123" is not assigned to any agent',
        context: 'Unassigned nodes: workflow-agent:123, workflow-agent:456'
      }
    ]
  }
}
```

---

### 2. GET /runtime/session/:id

获取runtime session当前状态

**参数**:
- `:id` - Session ID (路径参数)

**响应**: 200 OK
```typescript
{
  ok: true,
  data: RuntimeSession
}
```

---

### 3. POST /runtime/session/:id/advance

推进session到下一个状态

**参数**:
- `:id` - Session ID

**请求体**: 无 (或 `{}`)

**业务逻辑**:
1. 加载当前session
2. 调用 `advanceRuntimeSession(session)`
3. 保存更新后的session
4. 返回新状态

**响应**: 200 OK
```typescript
{
  ok: true,
  data: RuntimeSession  // 推进后的新状态
}
```

**错误**: 400 Bad Request (session不是running状态)
```typescript
{
  ok: false,
  error: {
    code: 'NOT_RUNNING',
    message: 'Session is not running',
    issues: [
      {
        path: ['session', 'status'],
        message: 'Current status is "completed", cannot advance a completed session'
      }
    ]
  }
}
```

---

### 4. GET /runtime/session/:id/stream

获取runtime session的事件流 (SSE)

**参数**:
- `:id` - Session ID

**响应头**:
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**事件格式**:
```
event: update
data: {"session": {...}, "events": [...]}

event: update
data: {"session": {...}, "events": [...]}
```

**使用示例** (前端):
```typescript
const eventSource = new EventSource(`/runtime/session/${sessionId}/stream`);

eventSource.onmessage = (event) => {
  const { session, events } = JSON.parse(event.data);
  updateUI(session);
};

eventSource.onerror = () => eventSource.close();
```

---

## Agent Markdown API

### 1. GET /agent-markdown

获取Agent Markdown文件

**参数**:
- `path` (query) - 文件路径, e.g., `CEO.md`

**响应**: 200 OK
```typescript
{
  ok: true,
  data: {
    path: string;
    frontMatter: Record<string, unknown>;
    summary: string;
    content: string;
  }
}
```

**示例**:
```bash
curl "http://localhost:3000/agent-markdown?path=CEO.md"
{
  ok: true,
  data: {
    path: "CEO.md",
    frontMatter: {
      name: "CEO",
      role: "Chief Executive Officer",
      department: "Leadership"
    },
    summary: "CEO is responsible for overall company strategy and execution...",
    content: "# CEO\n\n## Responsibilities\n..."
  }
}
```

---

### 2. POST /agent-markdown

创建新的Agent Markdown文件

**请求体**:
```typescript
{
  path: string;
  frontMatter?: Record<string, unknown>;
  content: string;
}
```

**验证**:
- `validateAgentMarkdown(content)` 检查front matter和markdown语法

**响应**: 201 Created
```typescript
{
  ok: true,
  data: { path: string }
}
```

---

### 3. PUT /agent-markdown

更新Agent Markdown文件

**请求体**: 同POST

**响应**: 200 OK
```typescript
{
  ok: true,
  data: { path: string, updatedAt: string }
}
```

---

### 4. DELETE /agent-markdown

删除Agent Markdown文件

**参数**:
- `path` (query)

**响应**: 204 No Content

---

## Agent Gateway API

### 1. POST /agent-gateway

调用代理执行某个步骤 (用于测试、模拟)

**请求体**:
```typescript
{
  type: 'discussion' | 'step' | 'review';
  discussionId?: string;
  agents?: string[];
  instructions?: string;
  context?: Record<string, unknown>;
}
```

**响应**: 200 OK
```typescript
{
  ok: true,
  data: {
    type: string;
    result: Record<string, unknown>;
    summary: string;
  }
}
```

**备注**: 这是内部API, 用于runtime引擎调用, 前端一般不直接使用

---

## 错误码参考

| 错误码 | HTTP | 说明 |
|--------|------|------|
| VALIDATION_ERROR | 400 | Schema/输入验证失败 |
| REFERENCE_ERROR | 400 | 对象引用不存在 |
| NOT_FOUND | 404 | 资源不存在 |
| CONFLICT | 409 | 并发修改冲突 |
| NOT_RUNNING | 400 | Session不在running状态 |
| UNASSIGNED_NODES | 400 | Workflow nodes未关联agents |
| INTERNAL_ERROR | 500 | 服务端异常 |

---

## 网络考虑

### 大型Schema传输

Schema可能很大 (数百KB+). 建议:

```bash
# 前端可启用gzip压缩
Accept-Encoding: gzip
```

### SSE连接超时

长连接可能在某些网络环境断开. 前端应实现:

```typescript
let reconnectAttempts = 0;
const maxAttempts = 5;

eventSource.onerror = () => {
  eventSource.close();
  
  if (reconnectAttempts < maxAttempts) {
    setTimeout(() => {
      reconnectAttempts++;
      subscribeToSessionStream(sessionId);  // 重新连接
    }, Math.pow(2, reconnectAttempts) * 1000);  // 指数退避
  }
};
```

### 请求超时

某些操作 (如验证大型schema) 可能耗时. 建议:

```typescript
// RTK Query超时配置
fetchBaseQuery({
  baseUrl: VITE_SERVICE_ORIGIN,
  fetchFn: async (...args) => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      30000  // 30秒超时
    );
    
    const response = await fetch(...args, { 
      signal: controller.signal 
    });
    clearTimeout(timeout);
    return response;
  }
})
```

---

## 下一步阅读

- [状态管理详解](./06-state-management.md)
- [核心函数参考](./07-core-functions-reference.md)
