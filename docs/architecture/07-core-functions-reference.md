# 核心函数参考

本文档提供按功能分类的关键函数签名与使用示例。

## 目录

- [Schema加载与验证](#schema加载与验证)
- [Runtime执行](#runtime执行)
- [编辑器操作](#编辑器操作)
- [工作流图操作](#工作流图操作)
- [Hooks](#hooks)

---

## Schema加载与验证

### loadTeamSchema

**位置**: `src/schema/loadTeamSchema.ts`

**签名**:
```typescript
export function loadTeamSchema(
  input: string | unknown
): ValidationResult<TeamDefinition>
```

**功能**: 
- 解析JSON字符串或对象
- 使用Zod进行类型验证并转换snake_case → camelCase
- 验证对象之间的引用完整性

**示例**:
```typescript
// 从JSON字符串加载
const jsonStr = '{"name": "Team", "agents": []}';
const result = loadTeamSchema(jsonStr);

if (result.ok) {
  console.log('Schema valid:', result.data);
} else {
  console.error('Validation errors:', result.issues);
}

// 从对象加载
const obj = { name: "Team", agents: [], department_id: "dept-1" };
const result = loadTeamSchema(obj);
// 返回的对象会有camelCase: departmentId
```

**返回值**:
```typescript
{
  ok: true,
  data: TeamDefinition
} | {
  ok: false,
  issues: SchemaIssue[]
}
```

---

### validateTeamReferences

**位置**: `src/schema/teamReferenceValidation.ts`

**签名**:
```typescript
export function validateTeamReferences(
  team: TeamDefinition
): ValidationResult<TeamDefinition>
```

**功能**:
- 检查所有agent_id引用指向的agents存在
- 检查department_id引用的agent (部门头) 存在
- 检查pipeline中的agent_id存在
- 检查discussion中的agent_id存在

**示例**:
```typescript
const schema = {
  name: 'Team',
  agents: [
    { id: 'a1', name: 'Alice' },
    { id: 'a2', name: 'Bob', department_id: 'a1' }
  ],
  pipelines: [{
    id: 'p1',
    steps: [
      { id: 's1', agent_id: 'a1' }
    ]
  }]
};

const result = validateTeamReferences(schema);
if (!result.ok) {
  // 如果任何引用无效, issues会列出具体错误
  result.issues.forEach(issue => {
    console.log(`Error at ${issue.path.join('.')}: ${issue.message}`);
  });
}
```

---

## Runtime执行

### advanceRuntimeSession

**位置**: `src/runtime/advanceRuntimeSession.ts`

**签名**:
```typescript
export function advanceRuntimeSession(
  session: RuntimeSession,
  options?: AdvanceRuntimeSessionOptions
): ValidationResult<RuntimeSession>
```

**功能**:
- 推进runtime session到下一个状态
- 路由work mode (Discussion > Pipeline > Delivery > Idle)
- 执行对应stage
- 记录事件
- 检查完成条件

**示例**:
```typescript
let session = createRuntimeSession(schema);

// 第一次advance: 路由到Discussion
let result = advanceRuntimeSession(session);
if (result.ok) {
  session = result.data;
  console.log('Current mode:', session.state.workModeDecision.mode);
  // 输出: 'discussion'
}

// 继续advance: 如果Discussion完成, 路由到Pipeline
result = advanceRuntimeSession(session);
if (result.ok) {
  session = result.data;
  console.log('Current mode:', session.state.workModeDecision.mode);
  // 输出: 'pipeline'
}

// 错误情况
session.status = 'completed';
result = advanceRuntimeSession(session);
if (!result.ok) {
  console.error('Cannot advance completed session');
}
```

---

### createRuntimeSession

**位置**: `src/runtime/createRuntimeSession.ts`

**签名**:
```typescript
export function createRuntimeSession(
  schema: TeamDefinition,
  options?: CreateRuntimeSessionOptions
): RuntimeSession
```

**功能**:
- 创建新的runtime session
- 初始化tickets (goal, pipelines, discussions, deliverables)
- 记录SessionCreated事件

**示例**:
```typescript
const schema = loadTeamSchema(jsonStr).data;
const session = createRuntimeSession(schema, {
  workModeKey: 'discussion'  // 可选: 设置初始模式
});

console.log(session.id);  // 生成的session ID
console.log(session.status);  // 'running'
console.log(session.state.pendingTickets.length);  // 初始tickets数
```

---

### routeWorkMode

**位置**: `src/runtime/routeWorkMode.ts`

**签名**:
```typescript
export function routeWorkMode(
  state: RuntimeState
): WorkModeDecision
```

**功能**:
- 根据state决策下一个work mode
- 优先级: Discussion > Pipeline > Delivery > Idle

**示例**:
```typescript
const state = {
  pendingTickets: [/* discussion ticket */, /* pipeline ticket */],
  activePipeline: undefined,
  // ...
};

const decision = routeWorkMode(state);
console.log(decision.mode);  // 'discussion' (discussion优先级更高)
console.log(decision.reason);  // 'Pending discussion tickets'
```

---

### executeDiscussionStage

**位置**: `src/runtime/advanceRuntimeSession/discussion.ts`

**签名**:
```typescript
export function executeDiscussionStage(
  session: RuntimeSession,
  options?: AdvanceRuntimeSessionOptions
): RuntimeSession
```

**功能**:
- 找到待执行的discussion ticket
- 组装agent gateway payload
- 调用agent (或mock)
- 更新session state和记录事件

**示例**:
```typescript
const session = createRuntimeSession(schema);
const updatedSession = executeDiscussionStage(session);

console.log(updatedSession.state.completedTickets.length);  // +1
console.log(updatedSession.state.discussionResult);  // 讨论结果
console.log(updatedSession.events[updatedSession.events.length - 1].eventType);
// 'runtime.discussion.completed'
```

---

### executePipelineStage

**位置**: `src/runtime/advanceRuntimeSession/pipeline.ts`

**签名**:
```typescript
export function executePipelineStage(
  session: RuntimeSession,
  options?: AdvanceRuntimeSessionOptions
): RuntimeSession
```

**功能**:
- 找到active pipeline中的ready steps
- 并发执行ready steps
- 更新completedStepResults
- 检查pipeline是否完成

**示例**:
```typescript
let session = createRuntimeSession(schema);
// ... advance到pipeline mode

const updatedSession = executePipelineStage(session);

// 查看完成的steps
updatedSession.state.completedStepResults.forEach(result => {
  console.log(`Step ${result.stepId}: ${result.status}`);
});

// 检查pipeline是否完成
if (!updatedSession.state.activePipeline) {
  console.log('Pipeline completed!');
}
```

---

## 编辑器操作

### withWorkflowLayoutDocument

**位置**: `src/editor/model/workflowLayout.ts`

**签名**:
```typescript
export function withWorkflowLayoutDocument(
  schema: TeamDefinition,
  nodes: Node[],
  edges: Edge[]
): TeamDefinition
```

**功能**:
- 将React Flow的nodes/edges转换成schema.layout
- 返回包含layout的新schema对象

**示例**:
```typescript
const schema = { name: 'Team', agents: [...] };
const nodes = [
  { id: 'workflow-agent:a1', position: { x: 0, y: 0 }, data: {...} }
];
const edges = [
  { source: 'workflow-agent:a1', target: 'workflow-agent:a2' }
];

const persistableSchema = withWorkflowLayoutDocument(schema, nodes, edges);

console.log(persistableSchema.layout.nodes.length);  // 1
console.log(persistableSchema.layout.edges.length);  // 1
```

---

## 工作流图操作

### createWorkflowEdge

**位置**: `src/editor/customEdges/createWorkflowEdge.ts`

**签名**:
```typescript
export function createWorkflowEdge(
  nodes: Node[],
  edges: Edge[],
  source: string,
  target: string
): { status: 'ok' | 'rejected', edge?: Edge, reason?: string }
```

**功能**:
- 创建新的workflow edge
- 检测是否会形成DAG循环 (仅Pipeline mode)
- 返回tagged result

**示例**:
```typescript
const nodes = [
  { id: 'pipeline:p1', data: { type: 'pipeline' } },
  { id: 'pipeline:p2', data: { type: 'pipeline' } }
];
const edges = [];

// 正常创建
const result1 = createWorkflowEdge(nodes, edges, 'pipeline:p1', 'pipeline:p2');
if (result1.status === 'ok') {
  console.log('Edge created:', result1.edge);
}

// 尝试创建循环 (Pipeline mode不允许)
const result2 = createWorkflowEdge(nodes, [result1.edge!], 'pipeline:p2', 'pipeline:p1');
if (result2.status === 'rejected') {
  console.log('Cycle detected:', result2.reason);
}
```

---

### initializeWorkflowGraph

**位置**: `src/editor/model/graphLayout.ts`

**签名**:
```typescript
export function initializeWorkflowGraph(
  schema: TeamDefinition
): { nodes: Node[], edges: Edge[] }
```

**功能**:
- 从schema恢复workflow图的nodes和edges
- 从schema.layout或默认布局

**示例**:
```typescript
const schema = loadTeamSchema(jsonStr).data;
const { nodes, edges } = initializeWorkflowGraph(schema);

console.log(nodes.length);  // 所有workflow节点数
console.log(edges.length);  // 所有workflow边数
```

---

## Hooks

### useTeamEditor

**位置**: `src/editor/hooks/useTeamEditor.ts`

**签名**:
```typescript
export function useTeamEditor(): TeamEditorModel
```

**功能**:
- 聚合编辑器的所有操作和状态
- 返回统一的编辑器接口

**示例**:
```typescript
const editor = useTeamEditor();

// 读取状态
console.log(editor.schema);
console.log(editor.nodes);
console.log(editor.validationIssues);

// 执行操作
editor.addAgent({ id: 'a1', name: 'Alice' });
editor.saveSchema();

// 图编辑
editor.addWorkflowAgentNode('a1');
editor.addWorkflowEdge('a1', 'a2');
```

---

### useTeamSchemaService

**位置**: `src/editor/hooks/useTeamSchemaService.ts`

**签名**:
```typescript
export function useTeamSchemaService(
  dispatch: AppDispatch
): TeamSchemaServiceModel
```

**功能**:
- 管理schema的服务层操作 (fetch, save, validate)
- 集成RTK Query

**示例**:
```typescript
const schemaService = useTeamSchemaService(dispatch);

// 加载schema列表
const { data: schemas } = schemaService.loadSchemasQuery();

// 保存schema
const result = await schemaService.saveSchema(newSchema);
if (result.ok) {
  console.log('Saved!');
} else {
  console.error('Save failed:', result.error);
}

// 验证schema
const validation = await schemaService.validateSchema(schema);
```

---

### useRuntimeSession

**位置**: `src/editor/hooks/useRuntimeSession.ts`

**签名**:
```typescript
export function useRuntimeSession(): RuntimeSessionModel
```

**功能**:
- 管理runtime sessions
- 启动session, 推进session, 订阅事件流

**示例**:
```typescript
const runtime = useRuntimeSession();

// 启动新session
const result = await runtime.runGoal(schema);
if (result.ok) {
  const session = result.data;
  console.log('Session started:', session.id);
  
  // 推进session
  await runtime.advanceToNextStep(session.id);
  
  // 订阅事件流 (自动)
  // runtime.sessions 会自动更新
}

// 访问session列表
console.log(runtime.sessions);
```

---

### useWorkflowGraphEditor

**位置**: `src/editor/hooks/useWorkflowGraphEditor.ts`

**签名**:
```typescript
export function useWorkflowGraphEditor(
  schema: TeamDefinition,
  dispatch: AppDispatch,
  revision: number
): WorkflowGraphEditorModel
```

**功能**:
- 管理React Flow的图编辑状态
- 处理节点/边变更
- 实现用户交互 (添加节点、创建边等)

**示例**:
```typescript
const graphEditor = useWorkflowGraphEditor(schema, dispatch, revision);

// React Flow回调
<ReactFlow
  nodes={graphEditor.nodes}
  edges={graphEditor.edges}
  onNodesChange={graphEditor.onNodesChange}
  onEdgesChange={graphEditor.onEdgesChange}
/>

// 添加节点
graphEditor.addWorkflowAgentNode('agent-1');

// 添加边
graphEditor.addWorkflowEdge('source-id', 'target-id');

// 错误处理
if (graphEditor.edgeConnectionError) {
  showErrorToast(graphEditor.edgeConnectionError);
  graphEditor.clearEdgeConnectionError();
}
```

---

### useTeamSchemaMutations

**位置**: `src/editor/hooks/useTeamSchemaMutations.ts`

**签名**:
```typescript
export function useTeamSchemaMutations(
  dispatch: AppDispatch
): TeamSchemaMutationsModel
```

**功能**:
- 本地schema变更 (不涉及网络)
- Redux dispatch对应的actions

**示例**:
```typescript
const mutations = useTeamSchemaMutations(dispatch);

// 修改schema
mutations.addAgent({ id: 'a1', name: 'Alice' });
mutations.updateAgent({ id: 'a1', role: 'Engineer' });
mutations.updateDepartment({ id: 'd1', name: 'Platform' });
mutations.addPipeline({ id: 'p1', name: 'Delivery' });
mutations.addDiscussion({ id: 'disc1', name: 'Kickoff' });

// 每个操作都会increment schemaDocumentRevision
// 这触发UI"有未保存的变更"状态
```

---

## 辅助函数

### buildAgentGatewayPayload

**位置**: `src/runtime/buildAgentGatewayPayload.ts`

**签名**:
```typescript
export function buildAgentGatewayPayload(
  session: RuntimeSession,
  ticket: Ticket
): AgentGatewayRequest
```

**功能**:
- 从session和ticket组装agent gateway请求
- 包含上下文、历史结果等

---

### buildRuntimePlanPayload

**位置**: `src/runtime/buildRuntimePlanPayload.ts`

**签名**:
```typescript
export function buildRuntimePlanPayload(
  session: RuntimeSession,
  step: PipelineStep,
  agent: AgentDefinition
): RuntimePlanRequest
```

**功能**:
- 从session和pipeline step组装runtime plan请求

---

### findReadySteps

**位置**: `src/runtime/advanceRuntimeSession/pipeline.ts`

**签名**:
```typescript
export function findReadySteps(
  pipeline: PipelineInstance,
  state: RuntimeState
): PipelineStep[]
```

**功能**:
- 查找pipeline中可以执行的steps
- 检查dependencies是否满足

**示例**:
```typescript
const ready = findReadySteps(pipeline, state);
console.log(`${ready.length} steps ready to execute`);
```

---

## 下一步

更多细节请参考各个模块的源代码注释。常见的工作流程:

1. **编辑schema**: `useTeamEditor()` + `useTeamSchemaMutations()`
2. **保存schema**: `useTeamSchemaService().saveSchema()`
3. **启动runtime**: `useRuntimeSession().runGoal()`
4. **推进执行**: `useRuntimeSession().advanceToNextStep()`
5. **图编辑**: `useWorkflowGraphEditor()` + `createWorkflowEdge()`
