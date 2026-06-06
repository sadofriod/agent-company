# Service API

本文档描述 `packages/service` 当前对外提供的 HTTP API。除特别说明外，请求与响应均为 `application/json`。

## 基本信息

- 默认服务地址：`http://127.0.0.1:3000`
- 可通过环境变量 `PORT` 覆盖监听端口
- 团队 schema 默认读取：`docs/examples/software-delivery-team.json`
- 可通过环境变量 `TEAM_SCHEMA_PATH` 覆盖团队 schema 文件路径

## 通用响应约定

### 成功响应

大部分接口返回以下两种成功结构之一：

```json
{
  "ok": true,
  "value": {}
}
```

或：

```json
{
  "ok": true,
  "files": []
}
```

`/health` 与 `/team/schema`、`/runtime-plan` 这类聚合接口会返回各自的业务字段，但都会包含 `ok: true`。

### 校验失败响应

统一结构如下：

```json
{
  "ok": false,
  "issues": [
    {
      "code": "request_invalid",
      "path": ["path"],
      "message": "Required"
    }
  ]
}
```

`issues[*]` 字段含义：

- `code`: 稳定错误码，便于前端或调用方分支处理
- `path`: 出错字段路径
- `message`: 可读错误信息
- `suggestion`: 可选修复建议

### 常见状态码

- `200`: 请求成功
- `400`: 请求体不合法、schema 校验失败、Markdown 校验失败
- `404`: 路由不存在，或读取/删除的 Markdown 文件不存在
- `409`: 创建 Markdown 文件时路径冲突
- `500`: 服务内部错误，或服务启动后读取默认 team schema 失败

## 数据结构

### SchemaIssue

```json
{
  "code": "schema_invalid",
  "path": ["agents", "0", "role"],
  "message": "Invalid enum value",
  "suggestion": "请检查字段取值"
}
```

### AgentMarkdownValidationDetails

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

### AgentMarkdownFileSummary

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

### AgentMarkdownFile

在 `AgentMarkdownFileSummary` 基础上额外包含：

```json
{
  "content": "---\nname: FullStackEngineer\n---\n# FullStackEngineer"
}
```

### TeamDefinition 顶层结构

`/team/validate` 与 `/runtime-plan` 的请求体都要求是完整 Team Schema JSON，对象顶层至少包含：

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

字段的完整约束以 `packages/service/src/schema` 中的运行时校验为准。

## Endpoints

### `GET /health`

用于健康检查。

响应示例：

```json
{
  "ok": true
}
```

### `GET /agent-markdown`

列出全部 agent markdown 文件摘要。

响应示例：

```json
{
  "ok": true,
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
  "value": {
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

- `400`: 请求体缺字段或 Markdown/front matter 校验失败
- `409`: `path` 对应文件已存在

### `PUT /agent-markdown`

更新已有 agent markdown 文件。

请求体与 `POST /agent-markdown` 相同。

失败语义：

- `400`: 请求体缺字段或 Markdown/front matter 校验失败
- `404`: `path` 对应文件不存在

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
  "value": {
    "path": "engineering/TestAgent.md"
  }
}
```

失败语义：

- `400`: 请求体缺少 `path`
- `404`: 文件不存在

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
  "value": {
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

- `400`: 请求体缺少 `path`
- `404`: 文件不存在

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
  "value": {
    "hasFrontMatter": false,
    "body": "# Test"
  }
}
```

失败语义：

- `400`: 请求体缺字段或内容不满足 Markdown/front matter 约束

### `GET /team/schema`

读取服务当前保存的团队 schema 文档，并先做一次运行时校验。

### `GET /team/schemas`

列出服务当前持久化的全部团队 schema 记录。

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

- `404`: 当前尚未创建团队 schema
- `500`: 已存储的 schema 内容未通过 `loadTeamSchema` 校验

### `POST /team/schema`

创建当前团队 schema。请求体为完整 Team Schema JSON。

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

- `400`: JSON 结构不合法、字段约束失败、跨对象引用校验失败
- `409`: 当前团队 schema 已存在

### `PUT /team/schema`

更新当前团队 schema。请求体为完整 Team Schema JSON。

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

- `400`: JSON 结构不合法、字段约束失败、跨对象引用校验失败
- `404`: 当前尚未创建团队 schema

### `DELETE /team/schema`

删除当前团队 schema。

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

- `404`: 当前尚未创建团队 schema

### `POST /team/validate`

校验传入的 Team Schema，并返回解析后的团队对象。

请求体：完整 Team Schema JSON。

成功响应：

```json
{
  "ok": true,
  "team": {
    "schemaVersion": "1.0.0",
    "teamId": "software-delivery-team"
  }
}
```

失败语义：

- `400`: JSON 结构不合法、字段约束失败、跨对象引用校验失败

### `POST /runtime-plan`

基于 Team Schema 构建运行时计划和 agent 装配结果。

请求体：完整 Team Schema JSON。

成功响应：

```json
{
  "ok": true,
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
```

`runtimePlan` 与 `agentAssembly` 都是面向运行时消费的展开结果：

- `runtimePlan.departments` 来自 `departmentsById.values()`
- `runtimePlan.agents` 来自 `agentsById.values()`
- `agentAssembly.agents` 为每个 agent 的装配产物，包含 role、model、contracts、metadata、memoryProfile、capabilities 等字段

失败语义：

- `400`: Team Schema 校验失败

## 调用示例

### 校验 Markdown

```bash
curl -sS -X POST http://127.0.0.1:3000/agent-markdown/validate \
  -H 'content-type: application/json' \
  -d '{"path":"engineering/TestAgent.md","content":"# Test"}'
```

### 读取团队 schema

```bash
curl -sS http://127.0.0.1:3000/team/schema
```

### 生成 runtime plan

```bash
curl -sS -X POST http://127.0.0.1:3000/runtime-plan \
  -H 'content-type: application/json' \
  --data-binary @docs/examples/software-delivery-team.json
```