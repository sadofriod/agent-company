# Event-Driven Readonly Hooks And Observability (SSE)

## 实现目标

本文定义 Runtime 在事件驱动模式下的 Readonly Hook 类 API 蓝图，并把可观测性作为一等能力。所有 Hook 类 API 必须通过 SSE (Server-Sent Events) 提供，不提供同语义的写接口。

目标是让消费方（执行模式 UI、运维看板、审计服务）只订阅事实，不直接改写 runtime 状态，同时可追踪每一步执行、回退与治理决策。

## 适用范围

- `packages/service/src/runtime/**`
- `packages/service/src/routes/runtime/**`
- 读侧消费方（如 `packages/team-schema-editor` 的执行模式）

## 非目标

- 不在本文定义新的写接口。
- 不在本文替代现有 `POST /runtime/session/:id/advance` 等控制接口。
- 不在本文绑定具体厂商的 tracing/metrics 平台实现细节。

## 核心原则

1. Readonly First：Hook API 只能读，不做状态变更。
2. SSE Only：Hook API 统一通过 SSE 暴露，不使用 polling 作为主协议。
3. Event Sourcing Friendly：每个可观测状态都可由事件重建。
4. Stable Contracts：事件类型和字段必须版本化并保持向后兼容。
5. Trace Continuity：`traceId` 必须贯穿一次 session 的全链路事件。

## Hook API 总览（SSE-only）

下面 Hook 为逻辑接口命名，HTTP 层统一使用 SSE endpoint 对应实现。

1. `useSessionSnapshot(sessionId)`
2. `useSessionTimeline(sessionId)`
3. `useStepTrace(sessionId, stepId)`
4. `useInterruptionFeed(sessionId)`
5. `useReviewFeed(sessionId)`
6. `useMetrics(scope)`

所有上述 Hook 必须通过 SSE 消费，约束如下：

- Content-Type: `text/event-stream`
- 事件流必须支持 `id:` 字段，用于断线续传
- 必须支持 `Last-Event-ID` 请求头
- 服务器必须周期性发送 heartbeat 事件防止连接被中间层回收

## SSE Endpoint 蓝图

建议新增以下只读路由：

1. `GET /runtime/session/:id/stream/snapshot`
2. `GET /runtime/session/:id/stream/timeline`
3. `GET /runtime/session/:id/stream/steps/:stepId/trace`
4. `GET /runtime/session/:id/stream/interruption`
5. `GET /runtime/session/:id/stream/review`
6. `GET /runtime/stream/metrics`

说明：

- 每个 endpoint 都是 SSE，不返回普通 JSON body（除握手失败时的错误响应）。
- 若需要首屏快照，服务器在连接建立后先推送一条 `snapshot` 事件，再持续推增量事件。
- 若 `Last-Event-ID` 存在，服务器先从该 ID 之后补发，再切到实时流。

## 统一事件模型

```ts
type RuntimeEvent<TPayload = Record<string, unknown>> = {
  eventId: string;
  traceId: string;
  sessionId: string;
  sequence: number;
  eventType: string;
  ts: string;
  level: 'info' | 'warn' | 'error';
  actor?: {
    agentId?: string;
    departmentId?: string;
    reviewer?: string;
  };
  target?: {
    type?: string;
    id?: string;
  };
  statePatch?: Record<string, unknown>;
  metrics?: {
    latencyMs?: number;
    tokensIn?: number;
    tokensOut?: number;
    costUsd?: number;
  };
  payload: TPayload;
};
```

SSE 输出建议：

```text
id: <eventId>
event: <eventType>
data: <RuntimeEvent JSON>

```

约束：

- `sequence` 在同一 `sessionId` 内单调递增。
- `eventType` 必须来自固定枚举集合。
- `payload` 只放业务字段，诊断字段放在顶层标准字段。

## 事件类型分层

### Runtime 层

- `runtime.session_started`
- `runtime.work_mode_routed`
- `runtime.interrupted`
- `runtime.session_completed`
- `runtime.session_terminated`

### Discussion 层

- `discussion.started`
- `discussion.turn_recorded`
- `discussion.completed`
- `discussion.conflict_detected`

### Review 层

- `review.ticket_admission_completed`
- `review.step_completed`
- `review.blocked`
- `review.revise_required`

### Pipeline 层

- `pipeline.created`
- `pipeline.step_started`
- `pipeline.step_completed`
- `pipeline.handoff_generated`
- `pipeline.completed`

### Capability And Memory 层

- `capability.loaded`
- `capability.denied`
- `memory.retrieved`
- `memory.conflict_detected`

## Readonly Hook 语义定义

### useSessionSnapshot (SSE)

- SSE endpoint: `GET /runtime/session/:id/stream/snapshot`
- 第一条事件必须是完整快照：`event: snapshot`
- 后续事件为该快照相关的增量修正
- 不允许客户端通过该连接提交命令

### useSessionTimeline (SSE)

- SSE endpoint: `GET /runtime/session/:id/stream/timeline`
- 以时间顺序输出 session 全量运行事件
- 支持 `Last-Event-ID` 续传

### useStepTrace (SSE)

- SSE endpoint: `GET /runtime/session/:id/stream/steps/:stepId/trace`
- 仅输出目标 step 的执行链路事件（memory/capability/review/tool-call）

### useInterruptionFeed (SSE)

- SSE endpoint: `GET /runtime/session/:id/stream/interruption`
- 只输出 `runtime.interrupted` 及中断恢复相关事件

### useReviewFeed (SSE)

- SSE endpoint: `GET /runtime/session/:id/stream/review`
- 只输出 review gate 相关事件

### useMetrics (SSE)

- SSE endpoint: `GET /runtime/stream/metrics`
- 周期推送聚合指标事件，便于前端看板实时显示

## 可观测性规范

### 结构化日志字段

每条关键日志至少包含：

- `traceId`
- `sessionId`
- `eventId`
- `eventType`
- `sequence`
- `agentId` (如有)
- `stepId` (如有)
- `latencyMs` (如有)
- `errorCode` (失败时)

### 指标规范

建议最小指标集：

- `runtime_session_active{status}`
- `runtime_advance_total{result}`
- `runtime_event_total{event_type}`
- `pipeline_step_duration_ms{agent_id}`
- `pipeline_interrupt_total{kind}`
- `review_result_total{status, reviewer}`
- `memory_retrieval_total{profile_id, result}`
- `agent_tool_call_total{tool_id, status}`

### Tracing 规范

关键 span：

- `runtime.advance`
- `discussion.execute`
- `ticket.admission.review`
- `pipeline.step.execute`
- `review.gate.run`
- `memory.retrieve`
- `capability.load`
- `agent.step.runner`

关键 attributes：

- `traceId`
- `sessionId`
- `stepId`
- `agentId`
- `eventType`

## 数据持久化与恢复

为支持 SSE 续传与重放，建议引入：

1. `runtime_events`
2. `runtime_snapshots`

`runtime_events` 至少字段：

- `session_id`
- `sequence`
- `event_id`
- `event_type`
- `ts`
- `trace_id`
- `payload_json`
- `metrics_json`

`runtime_snapshots` 至少字段：

- `session_id`
- `sequence`
- `snapshot_json`
- `ts`

恢复流程：

1. 读取最新 snapshot
2. 回放 snapshot.sequence 之后事件
3. 重建最新 read model
4. 继续输出 SSE 实时事件

## 失败与降级策略

1. SSE 断连：客户端携带 `Last-Event-ID` 自动重连。
2. 事件缺口：服务器检测到不可续传时先推送 `snapshot_reset` 事件，再继续增量。
3. 指标后端异常：业务事件正常输出，附带 `observabilityDegraded=true` 标志事件。
4. 单条事件序列化失败：进入 dead-letter 流，不阻断主事件流。

## 与现有代码的接入点

建议最小侵入接入顺序：

1. 在 runtime 状态更新函数统一发事件（围绕 `updateRuntimeSession`）
2. 在 step 执行链路补充延迟、token、成本指标（`agentStepRunner`）
3. 在 route 层补 `traceId` 注入与透传
4. 新增 `stream/*` 路由，全部使用 SSE 返回

## 验收标准

1. 所有 Hook 类 API 都有对应 SSE endpoint。
2. 所有 Hook 文档明确写明 SSE-only。
3. 客户端能在断连后通过 `Last-Event-ID` 补齐事件。
4. 任意 session 的状态可通过快照+事件重放恢复。
5. 关键运行事件都有 trace、log、metric 三重可观测信号。

## 实施里程碑

### Phase 1

- 定义 `RuntimeEvent` 与事件枚举
- 落地 `snapshot/timeline` SSE endpoint
- 打通 `Last-Event-ID` 与 heartbeat

### Phase 2

- 落地 `step trace/interruption/review/metrics` SSE endpoint
- 事件持久化与 snapshot 重放
- tracing 与指标告警联动
