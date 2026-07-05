# 未实现模块汇总（文档与实现漂移分析）

> 生成日期：2026-07-04  
> 最后更新：2026-07-04（完整实现后）  
> 分析范围：`docs/implementation/01-12`、`docs/requirements/`、`packages/service/src/`、`packages/team-schema-editor/src/`

---

## 概览

| 模块 | 文档编号 | 实现状态 | 优先级 |
|------|---------|---------|--------|
| Team Schema 装配 & RuntimePlan | 01 | ✅ 完整 | — |
| Agent 组装 & Markdown 管理 | 01、09 | ✅ 完整 | — |
| Runtime Session 生命周期 | 07、09 | ✅ 完整 | — |
| SSE 流 & 可观测性持久化 | 10 | ✅ 完整 | — |
| 前端编辑器（节点/表单/图） | 02 架构文档 | ✅ 完整 | — |
| 讨论执行（三种模式） | 02 | ✅ 完整 | — |
| 能力授权（多源交集） | 04 | ✅ 完整 | — |
| Memory RAG（外部检索） | 05 | ✅ 完整（MVP 级：词频排序，无向量） | — |
| Review Gate（高级业务逻辑） | 06 | ✅ 完整 | — |
| Session 列表 API | 11 | ✅ 完整 | — |
| Memory 治理 & 晋升 | 05、06 | ✅ 完整 | — |
| 独立能力模块（capability/） | 04 | ✅ 完整 | — |
| 单元 / 集成测试 | 08 | ✅ 完整（43 个测试） | — |
| E2E 场景（含 009/011/012） | 12 | ✅ 完整 | — |

---

## 1. 已完整实现的模块

- **Team Schema 装配**：`loadTeamSchema` → Zod 校验 → `createRuntimePlan`（含冻结索引）
- **Agent 组装**：`createAgentAssemblyFactory` + `resolveAgentCapabilities` + `resolveMemoryProfilesById`
- **Agent Markdown**：本地文件 + Vercel Blob 双存储，CRUD + 元数据 Prisma 持久化
- **Agent Gateway / Step Runner**：OpenAI 兼容 LLM 调用、tool_calls 格式化
- **Runtime Session**：创建、advance、pause、resume、terminate、SSE 流（snapshot / timeline / trace / metrics）
- **可观测性**：`RuntimeStructuredLogger` + `runtimeObservabilityRepository` 持久化事件与快照
- **前端编辑器**：React Flow 节点/边、RTK Query API slice、可视化图编辑
- **讨论执行（三种模式）**：`supervisor_led`（主管仲裁）/ `sequential_handoff`（上下文链传递）/ `parallel_review`（并行聚合），均接入真实 LLM 调用（`callAgentLlm`）
- **独立能力模块**：`src/capability/resolveCapabilities.ts`（四源投票）+ `authorizeCapability.ts`（交集授权）+ `createCapabilityLoadPlan.ts`（组合入口），已替换 `pipeline.ts` 中的内联版本
- **Memory 治理**：`src/memory/filterMemoryByGovernance.ts`（scope/review/expiry/visibility/superseded 过滤）+ `detectMemoryConflict.ts`（显式冲突 + 跨版本 supersession 检测）
- **Memory 持久化**：Prisma `memory_objects` + `memory_graph_edges` 表（migration `20260704_add_memory_objects`）；`writeMemory` / `indexMemory` / `retrieveMemory`（词频排序 MVP）/ `graphRagTraversal`（BFS 1-2 跳）
- **Review Gate**：`src/review/logicReview.ts`（Owner 唯一性、依赖链、Pipeline 循环检测）+ `qualityReview.ts`（证据引用、Handoff 契约匹配）
- **Session 列表 API**：`GET /runtime/sessions`（cursor 分页、status 过滤）后端路由 + Scheduler `listSessions` + 前端 RTK Query `useListRuntimeSessionsQuery`；`RuntimeWorkspacePage` 展示历史会话列表
- **单元测试**：43 个测试，覆盖能力模块（resolveCapabilities / authorizeCapabilities / createCapabilityLoadPlan）、Memory 治理（filterMemoryByGovernance / detectMemoryConflict）、Memory 持久化（writeMemory / indexMemory / retrieveMemory / graphRagTraversal）、Review Gate（logicReview / qualityReview）
- **E2E 场景**：E2E-005/006/007/008/009/010/011/012/013 均已覆盖（`e2e-review-gate.spec.ts`）；Session List API 独立测试文件 `e2e-session-list-api.spec.ts`

---

## 2. 架构漂移修正记录

### 2.1 讨论输出改为真实 LLM 调用 ✅

原状态：三种讨论模式均返回硬编码占位字符串。  
现状：`callAgentLlm` 集成至 `callAgentTurn`；`sequential_handoff` 使用 `previousRecommendation` 上下文链；`parallel_review` 使用 `Promise.all` 并行；`supervisor_led` 在最后一轮调用 Supervisor 仲裁。

### 2.2 能力授权从 2 源扩展为 4 源 ✅

原状态：`pipeline.ts` 内联逻辑只做 Agent 声明 ∩ Step 声明两源交集。  
现状：`createCapabilityLoadPlan`（`src/capability/`）统一执行 Agent 声明 + Dept 决策范围（token 匹配）+ WorkMode 类型限制 + Step 声明 四源交集授权，`pipeline.ts` 已切换为调用该模块。

### 2.3 Memory 新增持久化路径 ✅

原状态：Memory 仅从 `session.state` 会话内提取，无跨会话检索。  
现状：新增 `memory_objects` / `memory_graph_edges` Prisma 表；`writeMemory` 幂等写入（upsert）；`indexMemory` 更新 embeddingStatus；`retrieveMemory` 按 scope 过滤 + 词频排序（MVP，可替换向量搜索）；`graphRagTraversal` BFS 图遍历扩展候选集。向量 RAG 待 P2 阶段集成真实嵌入模型。

### 2.4 Review Gate 补全业务规则 ✅

原状态：仅做基础字段非空检查 + testScenario 注入触发。  
现状：`logicReview` 检测 Owner 唯一性（跨 TicketDraft）、Pipeline 循环（Kahn 拓扑排序）、Agent 存在性；`qualityReview` 检测证据完整性、Handoff 契约关键词匹配；testScenario 注入作为补充，不替代业务检测。

### 2.5 Session 列表完全接通前端 ✅

原状态：前端无法显示历史会话列表，只能通过已知 ID 查单个会话。  
现状：`RuntimeWorkspacePage.tsx` 通过 `useListRuntimeSessionsQuery` 加载历史会话（最近 50 条），合并当次运行中的会话，按 `updatedAt` 降序渲染为可点击列表；点击任意历史会话触发 `runtime.loadSession(sessionId)`。

---

## 3. 待完成项（P2 阶段）

| 项目 | 说明 |
|------|------|
| 向量 RAG | 替换 `retrieveMemory` 中的词频排序为真实嵌入向量相似度（pgvector / Pinecone） |
| GraphRAG 完善 | 使用递归 CTE 或图数据库替代 BFS Prisma 查询 |
| 记忆晋升审批 | department / global scope 写入需 Reviewer LLM 审批流 |
| MCP Server 真实集成 | 当前 MCP 能力只做 ID 记录，未真实调用外部 MCP 协议 |


**已实现：**
- 参与部门选择、Owner 部门推导、Supervisor 冲突骨架
- 三种模式（`supervisor_led` / `sequential_handoff` / `parallel_review`）在状态流转上有区分

**缺失：**
- 所有三种模式的 `DiscussionTurn.structuredOutput` 均为硬编码占位字符串，**未真正调用 LLM** 执行讨论轮次
- `sequential_handoff` 没有上下文链式传递（上轮 Handoff 未注入下轮 prompt）
- `parallel_review` 没有并行收集后的聚合逻辑
- `supervisor_led` 没有仲裁（Supervisor LLM 调用）
- 讨论收敛判断缺失（`max_rounds` 只有循环边界，无收敛检查）

**影响：** E2E 测试通过，但实际多轮讨论输出是静态数据，不反映真实 LLM 判断。

---

### 2.2 能力加载 — `advanceRuntimeSession/pipeline.ts#loadStepCapabilities` ✅ 已完成

**已实现（内联，非独立模块）：**
- Agent 声明能力 ∩ Step `allowedCapabilities` 的交集计算
- 多余能力进入 `deniedCapabilityIds`，触发中断

**已补全（见第 2 节漂移修正 2.2）：**
- `src/capability/` 独立模块（`resolveCapabilities`、`authorizeCapability`、`createCapabilityLoadPlan`）已实现四源交集授权
- `pipeline.ts` 内联版本已替换为 `createCapabilityLoadPlan` 调用

---

### 2.3 Memory / RAG — `advanceRuntimeSession/pipeline.ts#createMemoryContextPackage` ✅ 已完成

**已补全（见第 2 节漂移修正 2.3）：**
- `src/memory/` 独立模块实现完整；Prisma 表已添加；writeMemory / indexMemory / retrieveMemory / graphRagTraversal 均已实现

---

### 2.4 Review Gate — `advanceRuntimeSession/review.ts` ✅ 已完成

**已补全（见第 2 节漂移修正 2.4）：**
- `src/review/logicReview.ts` + `qualityReview.ts` 完整实现所有业务规则

---

## 3. 完全未实现的模块 ✅ 全部已完成（见第 2 节漂移修正）

### 3.1 Session 列表 API ✅

### 3.2 Memory 子系统 ✅（MVP 级）

`src/memory/` 包含：`filterMemoryByGovernance`, `detectMemoryConflict`, `writeMemory`, `indexMemory`, `retrieveMemory`, `graphRagTraversal`。

Prisma 表：`memory_objects`, `memory_graph_edges`（migration `20260704_add_memory_objects`）。

向量 RAG 待 P2 阶段集成。

### 3.3 Capability 独立模块 ✅

`src/capability/` 包含：`resolveCapabilities`, `authorizeCapability`, `createCapabilityLoadPlan`。

### 3.4 单元测试 ✅

`src/tests/` 包含：`capability.test.ts`, `memoryGovernance.test.ts`, `reviewGate.test.ts`, `memoryPersistence.test.ts`，共 43 个测试。

### 3.5 E2E 场景 ✅

E2E-005/006/007/008/009/010/011/012/013 均覆盖（`e2e-review-gate.spec.ts`）；  
Session List API E2E：`e2e-session-list-api.spec.ts`（3 个测试：无过滤分页、status 过滤、cursor 分页）。

---

## 4. 关键架构漂移点 ✅ 全部修正（见第 2 节）

---

## 5. 待完成项（P2 阶段）

| 项目 | 说明 |
|------|------|
| 向量 RAG | 替换 `retrieveMemory` 词频排序为嵌入向量相似度（pgvector / Pinecone） |
| GraphRAG 完善 | 递归 CTE 或图数据库替代 BFS Prisma 查询 |
| 记忆晋升审批 | department / global scope 写入需 Reviewer LLM 审批流 |
| MCP Server 真实集成 | 当前 MCP 能力只做 ID 记录，未真实调用外部 MCP 协议 |
