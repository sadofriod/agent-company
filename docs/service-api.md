# Service API

本文档描述 `packages/service` 当前已经落地的 HTTP API。内容以 `packages/service/src` 中的实际实现为准，而不是早期设计稿。

## 基本信息

- 默认服务地址：`http://127.0.0.1:3000`
- 监听端口可通过环境变量 `PORT` 覆盖
- 服务启动时会自动注册 `src/routes/` 下的文件路由
- `DATABASE_URL` 为必需环境变量，当前用于 Prisma/Postgres 持久化
- `AGENT_MARKDOWN_STORAGE` 可选：`local` 或 `vercel_blob`
- `AGENT_MARKDOWN_BLOB_PREFIX` 可选：配置 Vercel Blob 路径前缀

默认存储策略：

- `NODE_ENV=production` 时默认 `vercel_blob`
- 非生产环境默认 `local`

## 通用响应约定

### 成功响应

当前所有成功响应都使用统一 envelope：

```json
{
  "ok": true,
  "data": {}
}
```

### 失败响应

当前所有失败响应都使用统一 envelope：

```json
{
  "ok": false,
  "error": {
    "code": "validation_failed",
    "message": "Request validation failed.",
    "issues": [
      {
        "code": "request_invalid",
        "path": ["path"],
        "message": "Required"
      }
    ]
  }
}
```

### `issues[*]` 字段

- `code`：稳定错误码
- `path`：出错字段路径
- `message`：可读错误信息
- `suggestion`：可选修复建议

### 常见状态码

- `200`：请求成功
- `201`：资源创建成功
- `400`：请求体不合法、Schema 校验失败、Markdown 校验失败
- `404`：路由不存在，或请求的资源不存在
- `409`：当前状态与请求冲突
- `500`：服务内部错误，或已持久化数据无法通过当前运行时校验

### 常见错误码

- `request_invalid`
- `validation_failed`
- `not_found`
- `conflict`
- `schema_invalid`
- `route_not_found`
- `internal_error`

## 数据结构

### `SchemaIssue`

```json
{
  "code": "schema_invalid",
  "path": ["agents", "0", "role"],
  "message": "Invalid enum value",
  "suggestion": "请检查字段取值"
}
```

### `AgentMarkdownValidationDetails`

```json
{
  "hasFrontMatter": true,
  "body": "# Agent title\n\nBody",
  "frontMatter": {
    "name": "FullStackEngineer",
    "capabilities": ["coding", "review"]
  }
}
```

说明：

- 普通 Agent Markdown 必须以 YAML front matter 开头
- `system.md` 是特例，可以没有 front matter
- front matter 存在时，正文不能为空

### `AgentMarkdownFileSummary`

```json
{
  "path": "engineering/FullStackEngineer.md",
  "name": "FullStackEngineer.md",
  "category": "engineering",
  "size": 1024,
  "updatedAt": "2026-06-06T08:00:00.000Z",
  "validation": {
    "ok": true,
    "value": {
      "hasFrontMatter": true,
      "body": "# FullStackEngineer",
      "frontMatter": {
        "name": "FullStackEngineer"
      }
    }
  }
}
```

### `AgentMarkdownFile`

在 `AgentMarkdownFileSummary` 基础上额外包含：

```json
{
  "content": "---\nname: FullStackEngineer\n---\n# FullStackEngineer"
}
```

### Team Schema 顶层结构

`POST /team/validate`、`POST /runtime-plan`、`POST /agent-gateway` 和 `POST /runtime/session` 中的内联 `team` 都要求传入完整 Team Schema JSON。典型顶层结构如下：

```json
{
  "schemaVersion": "1.0.0",
  "teamId": "software-delivery-team",
  "teamName": "Software Delivery Team",
  "departments": [],
  "agents": [],
  "discussionPolicy": {},
  "pipelinePolicy": {},
  "memoryPolicy": {},
  "reviewPolicy": {}
}
```

字段完整约束以 `packages/service/src/schema` 中的运行时校验为准。

### `RuntimeSessionStartRequest`

```json
{
  "task": {
    "title": "Deliver onboarding flow",
    "goal": "Ship MVP onboarding in this sprint",
    "constraints": ["Keep current database schema"],
    "requesterId": "product-manager"
  },
  "traceId": "trace-123",
  "team": {
    "schemaVersion": "1.0.0"
  }
}
```

说明：

- `task.title` 与 `task.goal` 必填
- `task.constraints` 默认为空数组
- `team` 可省略；省略时服务会读取当前持久化的 team schema 文档
- `traceId` 可省略；省略时服务会自动生成

### `RuntimeSession`

`GET /runtime/session/:id` 以及相关生命周期接口返回以下 envelope 数据：

```json
{
  "sessionId": "runtime_123",
  "status": "running",
  "createdAt": "2026-06-07T10:00:00.000Z",
  "updatedAt": "2026-06-07T10:00:05.000Z",
  "runtimePlan": {
    "team": {},
    "departments": [],
    "agents": [],
    "discussionPolicy": {},
    "pipelinePolicy": {},
    "memoryPolicy": {},
    "reviewPolicy": {}
  },
  "state": {
    "context": {
      "runtimeId": "runtime_123",
      "task": {
        "title": "Deliver onboarding flow",
        "goal": "Ship MVP onboarding in this sprint",
        "constraints": []
      },
      "traceId": "trace-123",
      "teamId": "software-delivery-team",
      "currentMode": "discussion",
      "auditTrail": [],
      "memoryScopes": []
    },
    "workModeDecision": {
      "mode": "discussion",
      "reason": "New runtime sessions begin in discussion mode until runtime routing promotes a ticket into pipeline execution.",
      "requiredObjects": ["topic", "decision", "ticket_draft"]
    },
    "pendingTickets": [],
    "completedTickets": [],
    "completedStepResults": [],
    "reviewResults": [],
    "generatedHandoffs": [],
    "nextAction": "Run discussion to produce decisions and ticket drafts."
  }
}
```

## Endpoints

### `GET /health`

用于健康检查。

响应示例：

```json
{
  "ok": true,
  "data": {
    "status": "ok"
  }
}
```

### `GET /agent-markdown`

列出全部 agent markdown 文件摘要。

响应示例：

```json
{
  "ok": true,
  "data": {
    "files": [
      {
        "path": "engineering/FullStackEngineer.md",
        "name": "FullStackEngineer.md",
        "category": "engineering",
        "size": 1024,
        "updatedAt": "2026-06-06T08:00:00.000Z",
        "validation": {
          "ok": true,
          "value": {
            "hasFrontMatter": true,
            "body": "# FullStackEngineer",
            "frontMatter": {
              "name": "FullStackEngineer"
            }
          }
        }
      }
    ]
  }
}
```

### `POST /agent-markdown`

创建新的 agent markdown 文件。

请求体：

```json
{
  "path": "engineering/TestAgent.md",
  "content": "---\nname: TestAgent\n---\n# TestAgent"
}
```

成功响应：

```json
{
  "ok": true,
  "data": {
    "path": "engineering/TestAgent.md",
    "name": "TestAgent.md",
    "category": "engineering",
    "size": 42,
    "updatedAt": "2026-06-06T08:00:00.000Z",
    "validation": {
      "ok": true,
      "value": {
        "hasFrontMatter": true,
        "body": "# TestAgent",
        "frontMatter": {
          "name": "TestAgent"
        }
      }
    },
    "content": "---\nname: TestAgent\n---\n# TestAgent"
  }
}
```

失败语义：

- `400`：请求体缺字段、路径不合法或 Markdown/front matter 校验失败
- `409`：目标文件已存在

### `PUT /agent-markdown`

更新已有 agent markdown 文件。

请求体与 `POST /agent-markdown` 相同。

成功响应结构与创建接口相同。

失败语义：

- `400`：请求体缺字段、路径不合法或 Markdown/front matter 校验失败
- `404`：目标文件不存在

### `DELETE /agent-markdown`

删除指定 agent markdown 文件。

请求体：

```json
{
  "path": "engineering/TestAgent.md"
}
```

成功响应：

```json
{
  "ok": true,
  "data": {
    "path": "engineering/TestAgent.md"
  }
}
```

失败语义：

- `400`：请求体缺少 `path` 或路径不合法
- `404`：文件不存在

### `POST /agent-markdown/read`

读取指定 agent markdown 文件完整内容。

请求体：

```json
{
  "path": "engineering/FullStackEngineer.md"
}
```

成功响应：

```json
{
  "ok": true,
  "data": {
    "path": "engineering/FullStackEngineer.md",
    "name": "FullStackEngineer.md",
    "category": "engineering",
    "size": 1024,
    "updatedAt": "2026-06-06T08:00:00.000Z",
    "validation": {
      "ok": true,
      "value": {
        "hasFrontMatter": true,
        "body": "# FullStackEngineer",
        "frontMatter": {
          "name": "FullStackEngineer"
        }
      }
    },
    "content": "---\nname: FullStackEngineer\n---\n# FullStackEngineer"
  }
}
```

失败语义：

- `400`：请求体缺少 `path` 或路径不合法
- `404`：文件不存在

### `POST /agent-markdown/validate`

仅校验 Markdown 内容，不写入文件。

请求体：

```json
{
  "path": "engineering/TestAgent.md",
  "content": "# Test"
}
```

成功响应：

```json
{
  "ok": true,
  "data": {
    "hasFrontMatter": false,
    "body": "# Test"
  }
}
```

失败语义：

- `400`：请求体缺字段、路径不合法或内容不满足 Markdown/front matter 约束

### `POST /team/validate`

校验传入的 Team Schema，并返回解析后的团队对象。

请求体：完整 Team Schema JSON。

成功响应：

```json
{
  "ok": true,
  "data": {
    "team": {
      "schemaVersion": "1.0.0",
      "teamId": "software-delivery-team"
    }
  }
}
```

失败语义：

- `400`：JSON 结构不合法、字段约束失败或跨对象引用校验失败

### `GET /team/schemas`

列出当前持久化的全部团队 schema 记录。

成功响应：

```json
{
  "ok": true,
  "data": {
    "schemas": [
      {
        "key": "current",
        "schema": {
          "schemaVersion": "1.0.0"
        },
        "updatedAt": "2026-06-06T08:00:00.000Z"
      }
    ]
  }
}
```

### `GET /team/schemas/:id`

读取当前保存的团队 schema 文档，并先做一次运行时校验。

当前实现说明：

- 路由路径带有 `:id`
- 但服务内部当前只管理固定 key `current`
- 因此该接口当前不会按 `:id` 区分不同文档，建议调用时使用 `/team/schemas/current`

成功响应：

```json
{
  "ok": true,
  "data": {
    "schema": {
      "schemaVersion": "1.0.0"
    }
  }
}
```

失败语义：

- `404`：当前尚未创建团队 schema
- `500`：已存储 schema 无法通过 `loadTeamSchema` 校验

### `POST /team/schemas/:id`

创建当前团队 schema。请求体为完整 Team Schema JSON。

当前实现同样只写入固定 key `current`。

成功响应：

```json
{
  "ok": true,
  "data": {
    "schema": {
      "schemaVersion": "1.0.0"
    }
  }
}
```

失败语义：

- `400`：JSON 结构不合法、字段约束失败或跨对象引用校验失败
- `409`：当前团队 schema 已存在

### `PUT /team/schemas/:id`

更新当前团队 schema。请求体为完整 Team Schema JSON。

当前实现同样只更新固定 key `current`。

成功响应：

```json
{
  "ok": true,
  "data": {
    "schema": {
      "schemaVersion": "1.0.0"
    }
  }
}
```

失败语义：

- `400`：JSON 结构不合法、字段约束失败或跨对象引用校验失败
- `404`：当前尚未创建团队 schema

### `DELETE /team/schemas/:id`

删除当前团队 schema。

当前实现同样只删除固定 key `current`。

成功响应：

```json
{
  "ok": true,
  "data": {
    "deleted": true
  }
}
```

失败语义：

- `404`：当前尚未创建团队 schema

### `POST /runtime-plan`

基于 Team Schema 构建运行时计划和 agent 装配结果。

请求体：完整 Team Schema JSON。

成功响应：

```json
{
  "ok": true,
  "data": {
    "runtimePlan": {
      "team": {},
      "departments": [],
      "agents": [],
      "discussionPolicy": {},
      "pipelinePolicy": {},
      "memoryPolicy": {},
      "reviewPolicy": {}
    },
    "agentAssembly": {
      "teamId": "software-delivery-team",
      "agents": []
    }
  }
}
```

说明：

- `runtimePlan.departments` 来自 `departmentsById.values()`
- `runtimePlan.agents` 来自 `agentsById.values()`
- `agentAssembly.agents` 为每个 agent 的装配产物，包含 gateway、memory profile 和 capability 集合

失败语义：

- `400`：Team Schema 校验失败

### `POST /agent-gateway`

基于 Team Schema 直接生成可供上游网关消费的 agent 绑定结果。

请求体：完整 Team Schema JSON。

成功响应：

```json
{
  "ok": true,
  "data": {
    "teamId": "software-delivery-team",
    "agents": [
      {
        "agentId": "executor",
        "departmentId": "engineering",
        "role": "Pipeline Step Executor",
        "model": "default-coding-model",
        "gateway": {
          "agentId": "executor",
          "role": "Pipeline Step Executor",
          "llm": {
            "provider": "default",
            "model": "default-coding-model",
            "apiFormat": "openai_chat",
            "headers": {}
          },
          "tools": [],
          "allowedCommands": [],
          "requiredCommands": []
        },
        "capabilities": {
          "skills": [],
          "mcpServers": [],
          "tools": []
        }
      }
    ]
  }
}
```

`gateway.llm` 的默认解析规则：

- `provider` 缺省时回退到 `default`
- `model` 优先使用 `metadata.llm.model`，否则回退到顶层 `agent.model`
- `apiFormat` 缺省时回退到 `openai_chat`

失败语义：

- `400`：Team Schema 校验失败

### `POST /runtime/session`

创建 runtime session。

请求体：

```json
{
  "task": {
    "title": "Deliver onboarding flow",
    "goal": "Ship MVP onboarding in this sprint",
    "constraints": ["Keep current database schema"]
  }
}
```

说明：

- 如果请求体未提供 `team`，服务会读取当前持久化的 team schema
- session 初始状态固定为 `running`
- 初始工作模式固定为 `discussion`

成功响应：`201 Created`

```json
{
  "ok": true,
  "data": {
    "sessionId": "runtime_123",
    "status": "running",
    "createdAt": "2026-06-07T10:00:00.000Z",
    "updatedAt": "2026-06-07T10:00:00.000Z",
    "runtimePlan": {
      "team": {},
      "departments": [],
      "agents": [],
      "discussionPolicy": {},
      "pipelinePolicy": {},
      "memoryPolicy": {},
      "reviewPolicy": {}
    },
    "state": {
      "pendingTickets": [],
      "completedTickets": [],
      "completedStepResults": [],
      "reviewResults": [],
      "generatedHandoffs": [],
      "nextAction": "Run discussion to produce decisions and ticket drafts."
    }
  }
}
```

失败语义：

- `400`：请求体不合法，或内联 team schema 校验失败
- `404`：未提供 `team` 且当前没有已持久化的 team schema
- `500`：未提供 `team` 且已持久化的 team schema 无法通过当前运行时校验

### `GET /runtime/session/:id`

读取当前 runtime session 快照。

失败语义：

- `400`：缺少 session id
- `404`：session 不存在

### `POST /runtime/session/:id/advance`

推动 runtime session 执行一步。

失败语义：

- `400`：请求非法或执行推进失败
- `404`：session 不存在
- `409`：session 当前不是 `running`

### `POST /runtime/session/:id/pause`

暂停 runtime session。

失败语义：

- `400`：请求非法
- `404`：session 不存在
- `409`：当前状态不允许暂停

### `POST /runtime/session/:id/resume`

恢复 runtime session。

失败语义：

- `400`：请求非法
- `404`：session 不存在
- `409`：当前状态不允许恢复

### `POST /runtime/session/:id/terminate`

终止 runtime session。

失败语义：

- `400`：请求非法
- `404`：session 不存在
- `409`：当前状态不允许终止

## 调用示例

### 校验 Markdown

```bash
curl -sS -X POST http://127.0.0.1:3000/agent-markdown/validate \
  -H 'content-type: application/json' \
  -d '{"path":"engineering/TestAgent.md","content":"# Test"}'
```

### 读取当前团队 schema

```bash
curl -sS http://127.0.0.1:3000/team/schemas/current
```

### 生成 runtime plan

```bash
curl -sS -X POST http://127.0.0.1:3000/runtime-plan \
  -H 'content-type: application/json' \
  --data-binary @docs/examples/software-delivery-team.json
```

### 创建 runtime session

```bash
curl -sS -X POST http://127.0.0.1:3000/runtime/session \
  -H 'content-type: application/json' \
  -d '{
    "task": {
      "title": "Deliver onboarding flow",
      "goal": "Ship MVP onboarding in this sprint",
      "constraints": ["Keep current database schema"]
    }
  }'
```