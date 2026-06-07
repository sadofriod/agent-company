# JSON Schema Driven Loading

## 设计目标

运行时不应依赖硬编码的部门数量、Agent 名称或固定流程。Team Schema 是系统装配的事实来源，用于决定组织、讨论、能力和执行策略。

## 装配顺序

1. Load Team Schema。
2. Validate Schema version and required fields。
3. Resolve departments and agents。
4. Resolve discussion policy。
5. Resolve capability policy。
6. Resolve memory policy and retrieval profiles。
7. Resolve review policy。
8. Create runtime plan。
9. Execute discussion or Pipeline。
10. Write audit events, scoped memory and memory indexes。

## Team Schema 示例

```json
{
  "schema_version": "0.1.0",
  "team_id": "software-delivery-team",
  "team_name": "Software Delivery Team",
  "departments": [
    {
      "department_id": "product",
      "name": "Product",
      "mission": "Clarify user goals and define acceptance criteria.",
      "decision_scope": ["requirements", "priority", "acceptance"],
      "agents": ["product_owner"],
      "handoff_contracts": ["ticket_draft", "acceptance_criteria"]
    },
    {
      "department_id": "engineering",
      "name": "Engineering",
      "mission": "Design and execute technical implementation plans.",
      "decision_scope": ["technical_plan", "implementation", "verification"],
      "agents": ["tech_lead", "executor"],
      "handoff_contracts": ["implementation_plan", "pipeline_result"]
    }
  ],
  "agents": [
    {
      "agent_id": "product_owner",
      "department_id": "product",
      "role": "Topic Owner",
      "model": "default-reasoning-model",
      "responsibilities": ["clarify_goal", "define_ticket", "acceptance_review"],
      "input_contract": "user_request_or_topic",
      "output_contract": "ticket_draft",
      "skills": ["requirements_breakdown"],
      "mcp_servers": [],
      "tools": [],
      "memory_access_policy": "topic_owner_policy",
      "metadata": {
        "name": "Product Owner",
        "description": "Clarifies goals and decides acceptance.",
        "llm": {
          "provider": "openai-compatible",
          "api_format": "openai_chat",
          "api_key_env": "OPENAI_API_KEY",
          "temperature": 0.2
        }
      }
    },
    {
      "agent_id": "executor",
      "department_id": "engineering",
      "role": "Pipeline Step Executor",
      "model": "default-coding-model",
      "responsibilities": ["execute_step", "produce_handoff", "report_failure"],
      "input_contract": "pipeline_step_input",
      "output_contract": "pipeline_step_output",
      "skills": ["implementation"],
      "mcp_servers": ["repository"],
      "tools": ["search", "read_file", "edit_file", "run_tests"],
      "memory_access_policy": "ticket_executor_policy",
      "metadata": {
        "name": "Executor",
        "description": "Executes pipeline steps through the coding gateway.",
        "llm": {
          "provider": "openai-compatible",
          "model": "default-coding-model",
          "api_format": "openai_responses",
          "base_url": "https://gateway.internal.example/v1",
          "api_key_env": "AGENT_GATEWAY_KEY",
          "headers": {
            "x-agent-team": "software-delivery-team"
          },
          "temperature": 0.1,
          "max_tokens": 4000
        }
      }
    }
  ],
  "discussion_policy": {
    "mode": "supervisor_led",
    "max_rounds": 3,
    "supervisor_agent_id": "product_owner",
    "conflict_resolution": "supervisor_decision",
    "required_outputs": ["topic", "decision", "ticket_draft"]
  },
  "pipeline_policy": {
    "one_pipeline_per_ticket": true,
    "dag_required": true,
    "step_owner_required": true,
    "review_before_handoff": true
  },
  "memory_policy": {
    "retrieval_mode": "hybrid_vector_graph",
    "vector_store": "pgvector",
    "graph_store": "local_graph",
    "indexed_object_types": ["memory_object", "decision", "ticket", "handoff", "review_result"],
    "retrieval_profiles": [
      {
        "profile_id": "topic_owner_policy",
        "allowed_scopes": ["system", "session", "topic"],
        "max_results": 12,
        "max_graph_hops": 2,
        "require_reviewed_memory": false
      },
      {
        "profile_id": "ticket_executor_policy",
        "allowed_scopes": ["system", "ticket"],
        "max_results": 8,
        "max_graph_hops": 1,
        "require_reviewed_memory": true
      }
    ],
    "evidence_required_for_outputs": ["decision", "ticket", "handoff", "review_result"],
    "conflict_strategy": "return_conflicts_to_review"
  },
  "review_policy": {
    "ticket_admission": ["logic_review", "quality_review"],
    "step_completion": ["logic_review", "quality_review"],
    "allowed_results": ["pass", "revise", "block"]
  }
}
```

## 最小 JSON Schema 草案

可执行版本见 [../schemas/team.schema.json](../schemas/team.schema.json)。下方保留核心结构，便于阅读设计意图。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://agents-company.local/schemas/team.schema.json",
  "type": "object",
  "required": ["schema_version", "team_id", "departments", "agents", "discussion_policy", "pipeline_policy", "review_policy"],
  "properties": {
    "schema_version": { "type": "string" },
    "team_id": { "type": "string", "minLength": 1 },
    "team_name": { "type": "string" },
    "departments": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/department" }
    },
    "agents": {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/agent" }
    },
    "discussion_policy": { "$ref": "#/$defs/discussion_policy" },
    "pipeline_policy": { "$ref": "#/$defs/pipeline_policy" },
    "memory_policy": { "$ref": "#/$defs/memory_policy" },
    "review_policy": { "$ref": "#/$defs/review_policy" }
  },
  "$defs": {
    "department": {
      "type": "object",
      "required": ["department_id", "name", "mission", "decision_scope", "agents"],
      "properties": {
        "department_id": { "type": "string" },
        "name": { "type": "string" },
        "mission": { "type": "string" },
        "decision_scope": { "type": "array", "items": { "type": "string" } },
        "agents": { "type": "array", "items": { "type": "string" } },
        "handoff_contracts": { "type": "array", "items": { "type": "string" } }
      }
    },
    "agent": {
      "type": "object",
      "required": ["agent_id", "department_id", "role", "model", "responsibilities", "input_contract", "output_contract"],
      "properties": {
        "agent_id": { "type": "string" },
        "department_id": { "type": "string" },
        "role": { "type": "string" },
        "model": { "type": "string" },
        "responsibilities": { "type": "array", "items": { "type": "string" } },
        "input_contract": { "type": "string" },
        "output_contract": { "type": "string" },
        "skills": { "type": "array", "items": { "type": "string" } },
        "mcp_servers": { "type": "array", "items": { "type": "string" } },
        "tools": { "type": "array", "items": { "type": "string" } },
        "memory_access_policy": { "type": "string" },
        "metadata": {
          "type": "object",
          "properties": {
            "name": { "type": "string" },
            "description": { "type": "string" },
            "profile": { "type": "string" },
            "tool_policy": { "type": "string" },
            "partials": { "type": "array", "items": { "type": "string" } },
            "tools": { "type": "array", "items": { "type": "string" } },
            "allowed_commands": { "type": "array", "items": { "type": "string" } },
            "required_commands": { "type": "array", "items": { "type": "string" } },
            "llm": {
              "type": "object",
              "required": ["provider"],
              "properties": {
                "provider": { "type": "string" },
                "model": { "type": "string" },
                "api_format": {
                  "enum": [
                    "openai_chat",
                    "openai_responses",
                    "anthropic_messages",
                    "google_generate_content",
                    "custom"
                  ]
                },
                "base_url": { "type": "string" },
                "api_key_env": { "type": "string" },
                "headers": {
                  "type": "object",
                  "additionalProperties": { "type": "string" }
                },
                "temperature": { "type": "number", "minimum": 0, "maximum": 2 },
                "max_tokens": { "type": "integer", "minimum": 1 },
                "top_p": { "type": "number", "exclusiveMinimum": 0, "maximum": 1 }
              }
            }
          }
        }
      }
    },
    "discussion_policy": {
      "type": "object",
      "required": ["mode", "max_rounds", "conflict_resolution", "required_outputs"],
      "properties": {
        "mode": { "enum": ["supervisor_led", "sequential_handoff", "parallel_review"] },
        "max_rounds": { "type": "integer", "minimum": 1, "maximum": 10 },
        "supervisor_agent_id": { "type": "string" },
        "conflict_resolution": { "enum": ["supervisor_decision", "owner_decision", "block_and_escalate"] },
        "required_outputs": { "type": "array", "items": { "type": "string" } }
      }
    },
    "pipeline_policy": {
      "type": "object",
      "required": ["one_pipeline_per_ticket", "dag_required", "step_owner_required", "review_before_handoff"],
      "properties": {
        "one_pipeline_per_ticket": { "const": true },
        "dag_required": { "const": true },
        "step_owner_required": { "type": "boolean" },
        "review_before_handoff": { "type": "boolean" }
      }
    },
    "memory_policy": {
      "type": "object",
      "required": ["retrieval_mode", "indexed_object_types", "retrieval_profiles", "evidence_required_for_outputs", "conflict_strategy"],
      "properties": {
        "retrieval_mode": { "enum": ["standard_rag", "hybrid_vector_graph"] },
        "vector_store": { "type": "string" },
        "graph_store": { "type": "string" },
        "indexed_object_types": {
          "type": "array",
          "items": { "enum": ["memory_object", "topic", "decision", "ticket", "pipeline", "handoff", "review_result", "audit_event"] }
        },
        "retrieval_profiles": {
          "type": "array",
          "items": { "$ref": "#/$defs/memory_retrieval_profile" }
        },
        "evidence_required_for_outputs": {
          "type": "array",
          "items": { "enum": ["decision", "ticket", "handoff", "review_result"] }
        },
        "conflict_strategy": { "enum": ["return_conflicts_to_review", "prefer_reviewed_latest", "block_on_conflict"] }
      }
    },
    "memory_retrieval_profile": {
      "type": "object",
      "required": ["profile_id", "allowed_scopes", "max_results", "max_graph_hops", "require_reviewed_memory"],
      "properties": {
        "profile_id": { "type": "string" },
        "allowed_scopes": {
          "type": "array",
          "items": { "enum": ["system", "session", "topic", "ticket"] }
        },
        "max_results": { "type": "integer", "minimum": 1, "maximum": 50 },
        "max_graph_hops": { "type": "integer", "minimum": 0, "maximum": 3 },
        "require_reviewed_memory": { "type": "boolean" }
      }
    },
    "review_policy": {
      "type": "object",
      "required": ["ticket_admission", "step_completion", "allowed_results"],
      "properties": {
        "ticket_admission": { "type": "array", "items": { "enum": ["logic_review", "quality_review"] } },
        "step_completion": { "type": "array", "items": { "enum": ["logic_review", "quality_review"] } },
        "allowed_results": { "type": "array", "items": { "enum": ["pass", "revise", "block"] } }
      }
    }
  }
}
```

## 加载规则

- Department 必须至少有一个 Agent。
- Agent 的 `department_id` 必须引用已存在的 Department。
- Department 中声明的 Agent ID 必须能在 `agents` 中解析。
- `discussion_policy.mode` 决定讨论拓扑，不由 Agent 临时改变。
- Pipeline 必须在 Ticket 通过准入审查后创建。
- Tool 只能在当前 Agent、当前步骤和当前 Schema 都允许时加载。
- 若 Schema 声明的能力不存在，运行时必须中断并报告 `capability_missing`。
- Agent 的 `metadata.llm` 决定该 Agent 绑定到哪个 provider / gateway，以及使用什么请求协议、base URL 和采样参数。
- 若 `metadata.llm.model` 缺失，则回退到顶层 `agent.model` 作为最终装配模型。
- Agent 的 `memory_access_policy` 必须能解析到 `memory_policy.retrieval_profiles.profile_id`，或由运行时默认 profile 显式兜底。
- MemoryRetriever 必须先执行治理过滤，再做向量召回或图遍历。
- 若检索结果存在冲突、过期或被替代标记，必须按 `memory_policy.conflict_strategy` 处理。
- 需要证据支撑的输出类型必须携带 `retrieved_memory_ids`、`source_refs` 或等价证据字段。

## 审计事件

每次动态加载都必须产生审计事件：

```json
{
  "event_type": "capability_loaded",
  "runtime_id": "run_001",
  "agent_id": "executor",
  "scope": "pipeline_step",
  "target_id": "step_002",
  "capability_type": "tool",
  "capability_id": "read_file",
  "reason": "Required by output contract pipeline_step_output.",
  "expires_when": "step_completed"
}
```
