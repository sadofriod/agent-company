# Team Schema Editor 前端架构

## 概述

Team Schema Editor 是基于React 19 + Vite的单页应用，用于：
- 可视化编辑Team Schema (组织、部门、Agent等)
- 设计和编辑workflow图 (使用@xyflow/react)
- Runtime执行与监控
- Agent Markdown管理

## 应用结构

```typescript
// src/app/App.tsx
export const App = () => {
  const [mode, setMode] = useState<EditorMode>(EditorMode.Edit);
  const editor = useTeamEditor();
  const runtime = useRuntimeSession();
  
  return (
    <Routes>
      <Route path="/" element={<WorkspaceListPage />} />
      <Route path="/workspaces/:schemaKey" 
        element={<EditorWorkspacePage editor={editor} runtime={runtime} />} />
      <Route path="/agents/markdown" element={<AgentMarkdownPage />} />
      <Route path="/llm-gateways" element={<LlmGatewayPage />} />
    </Routes>
  );
};
```

## Redux State管理

### Store结构

```typescript
// src/editor/state/editorStore.ts
const store = configureStore({
  reducer: {
    editor: editorReducer,  // Team Schema编辑状态
    editorApi: editorApi.reducer  // RTK Query缓存
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(editorApi.middleware)
});

// 编辑器reducer状态
interface EditorState {
  schema: TeamDefinition;
  schemaLoadStatus: 'idle' | 'loading' | 'success' | 'error';
  schemaLoadError?: string;
  schemaDocumentRevision: number;
  validationIssues: SchemaIssue[];
  selection: Selection;
  // Graph state
  workflowNodes: Node[];
  workflowEdges: Edge[];
}
```

### 核心Hooks

```typescript
// src/editor/state/core/editorHooks.ts
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T,>(selector: (state: RootState) => T) =>
  useSelector(selector);

// 提供类型安全的selector
export const selectSchema = (state: RootState) => state.editor.schema;
export const selectValidationIssues = (state: RootState) =>
  state.editor.validationIssues;
export const selectSelection = (state: RootState) =>
  state.editor.selection;
```

## 核心Hooks组件

### 1. useTeamEditor - 编辑器聚合

```typescript
// src/editor/hooks/useTeamEditor.ts
export const useTeamEditor = (): TeamEditorModel => {
  const dispatch = useAppDispatch();
  const schema = useAppSelector(selectSchema);
  const validationIssues = useAppSelector(selectValidationIssues);
  
  // 子hooks
  const schemaService = useTeamSchemaService(dispatch);
  const workflowGraph = useWorkflowGraphEditor(schema, dispatch);
  const schemaMutations = useTeamSchemaMutations(dispatch);
  
  // 创建可持久化的schema (包含layout)
  const createPersistableSchema = (): TeamDefinition =>
    withWorkflowLayoutDocument(schema, workflowGraph.nodes, workflowGraph.edges);
  
  return {
    // Schema数据
    schema,
    validationIssues,
    schemaLoadStatus,
    // Graph数据
    nodes: workflowGraph.nodes,
    edges: workflowGraph.edges,
    // 服务状态
    schemaRecords: schemaService.schemaRecords,
    selectedSchemaKey: schemaService.selectedSchemaKey,
    // 操作方法
    ...schemaMutations,
    onNodesChange: workflowGraph.onNodesChange,
    onEdgesChange: workflowGraph.onEdgesChange,
    addWorkflowAgentNode: workflowGraph.addWorkflowAgentNode,
    saveSchema: () => schemaService.saveSchema(createPersistableSchema()),
    validateSchema: () => schemaService.validateSchema(createPersistableSchema())
  };
};
```

### 2. useTeamSchemaService - Schema服务

```typescript
// src/editor/hooks/useTeamSchemaService.ts
export const useTeamSchemaService = (dispatch: AppDispatch) => {
  // RTK Query hooks
  const [trigger, { data: schemaRecords }] = 
    editorApi.useLazyGetSchemasQuery();
  
  const [saveSchema] = editorApi.useSaveSchemaMutation();
  const [validateSchema] = editorApi.useValidateSchemaMutation();
  
  // 加载schema列表
  const refreshSchemaRecords = useCallback(async () => {
    const result = await trigger().unwrap();
    dispatch(setSchemasLoaded(result));
  }, [trigger, dispatch]);
  
  // 保存schema (带validation)
  const saveSchemaImpl = useCallback(async (schema: TeamDefinition) => {
    try {
      const result = await saveSchema({ schema }).unwrap();
      dispatch(schemaLoadSuccess(result));
      return { ok: true };
    } catch (error) {
      dispatch(schemaLoadError(error.message));
      return { ok: false, error: error.message };
    }
  }, [saveSchema, dispatch]);
  
  // 验证schema (不保存)
  const validateSchemaImpl = useCallback(async (schema: TeamDefinition) => {
    try {
      const result = await validateSchema({ schema }).unwrap();
      dispatch(updateValidationIssues(result.issues));
      return result;
    } catch (error) {
      dispatch(updateValidationIssues(error.issues || []));
      return error;
    }
  }, [validateSchema, dispatch]);
  
  return {
    schemaRecords,
    saveSchema: saveSchemaImpl,
    validateSchema: validateSchemaImpl,
    refreshSchemaRecords,
    // ... 更多操作
  };
};
```

### 3. useTeamSchemaMutations - 本地变更

```typescript
// src/editor/hooks/useTeamSchemaMutations.ts
export const useTeamSchemaMutations = (dispatch: AppDispatch) => {
  const addAgent = useCallback((agent: AgentDefinition) => {
    dispatch(addAgentAction(agent));
    dispatch(incrementSchemaRevision());
  }, [dispatch]);
  
  const updateAgent = useCallback((agent: AgentDefinition) => {
    dispatch(updateAgentAction(agent));
    dispatch(incrementSchemaRevision());
  }, [dispatch]);
  
  const updateDepartment = useCallback((department: DepartmentDefinition) => {
    dispatch(updateDepartmentAction(department));
    dispatch(incrementSchemaRevision());
  }, [dispatch]);
  
  const addDiscussion = useCallback((discussion: DiscussionDefinition) => {
    dispatch(addDiscussionAction(discussion));
    dispatch(incrementSchemaRevision());
  }, [dispatch]);
  
  return {
    addAgent,
    updateAgent,
    updateDepartment,
    addDiscussion,
    // ...更多mutations
  };
};
```

### 4. useWorkflowGraphEditor - 图编辑

```typescript
// src/editor/hooks/useWorkflowGraphEditor.ts
export const useWorkflowGraphEditor = (
  schema: TeamDefinition,
  dispatch: AppDispatch,
  revision: number
) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [edgeConnectionError, setEdgeConnectionError] = useState<string>();
  
  // 从schema初始化nodes/edges
  useEffect(() => {
    if (schema) {
      const { nodes: initialNodes, edges: initialEdges } =
        initializeWorkflowGraph(schema);
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [schema]);
  
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    dispatch(updateWorkflowNodes(nodes));
  }, [dispatch]);
  
  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
    dispatch(updateWorkflowEdges(edges));
  }, [dispatch]);
  
  // 添加workflow agent节点
  const addWorkflowAgentNode = useCallback((agentId: string) => {
    const newNode = createWorkflowAgentNode(agentId);
    setNodes((nds) => [...nds, newNode]);
    dispatch(updateWorkflowNodes([...nodes, newNode]));
  }, [nodes, dispatch]);
  
  // 添加workflow edge (带循环检测)
  const addWorkflowEdge = useCallback((source: string, target: string) => {
    const result = createWorkflowEdge(nodes, edges, source, target);
    
    if (result.status === 'rejected') {
      setEdgeConnectionError(result.reason);
      return;
    }
    
    setEdges((eds) => [...eds, result.edge]);
    dispatch(updateWorkflowEdges([...edges, result.edge]));
  }, [nodes, edges, dispatch]);
  
  return {
    nodes,
    edges,
    edgeConnectionError,
    onNodesChange,
    onEdgesChange,
    addWorkflowAgentNode,
    addWorkflowEdge,
    clearEdgeConnectionError: () => setEdgeConnectionError(undefined),
    // ... 更多操作
  };
};
```

### 5. useRuntimeSession - Runtime服务

```typescript
// src/editor/hooks/useRuntimeSession.ts
export const useRuntimeSession = () => {
  const dispatch = useAppDispatch();
  const [sessions, setSessions] = useState<Map<string, RuntimeSession>>(new Map());
  
  const [createSession] = editorApi.useCreateRuntimeSessionMutation();
  const [advanceSession] = editorApi.useAdvanceRuntimeSessionMutation();
  
  // 启动runtime (执行runGoal)
  const runGoal = useCallback(async (schema: TeamDefinition) => {
    // 1. 验证所有workflow nodes已关联schema agents
    const unassignedNodes = validateWorkflowNodesAssignment(schema);
    if (unassignedNodes.length > 0) {
      return {
        ok: false,
        error: `Unassigned nodes: ${unassignedNodes.join(', ')}`
      };
    }
    
    // 2. 创建session
    try {
      const session = await createSession({ schema }).unwrap();
      setSessions(new Map(sessions).set(session.id, session));
      
      // 3. 启动SSE stream监听
      subscribeToSessionStream(session.id);
      
      return { ok: true, data: session };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, [createSession]);
  
  // 推进session
  const advanceToNextStep = useCallback(async (sessionId: string) => {
    try {
      const updated = await advanceSession({ sessionId }).unwrap();
      setSessions(new Map(sessions).set(sessionId, updated));
      return { ok: true, data: updated };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }, [advanceSession]);
  
  // SSE流监听
  const subscribeToSessionStream = (sessionId: string) => {
    const eventSource = new EventSource(
      `/runtime/session/${sessionId}/stream`
    );
    
    eventSource.onmessage = (event) => {
      const update = JSON.parse(event.data);
      setSessions(new Map(sessions).set(sessionId, update.session));
      dispatch(updateRuntimeState(update));
    };
    
    eventSource.onerror = () => {
      eventSource.close();
    };
  };
  
  return {
    sessions: Array.from(sessions.values()),
    runGoal,
    advanceToNextStep,
    // ... 更多操作
  };
};
```

## API 客户端 (RTK Query)

### EditorApi 定义

```typescript
// src/editor/api/editorApi.ts
export const editorApi = createApi({
  reducerPath: 'editorApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.VITE_SERVICE_ORIGIN,
    prepareHeaders: (headers) => {
      // 添加认证token等
      return headers;
    }
  }),
  endpoints: (builder) => ({
    // Team Schema
    getSchemas: builder.query<SchemaRecord[], void>({
      query: () => '/team/schemas',
      transformResponse: (res: ApiResponse<SchemaRecord[]>) => res.data
    }),
    
    getSchema: builder.query<TeamDefinition, string>({
      query: (key) => `/team/schema?key=${key}`,
      transformResponse: (res: ApiResponse<TeamDefinition>) => res.data
    }),
    
    validateSchema: builder.mutation<ValidationResult, TeamDefinition>({
      query: (schema) => ({
        url: '/team/validate',
        method: 'POST',
        body: schema
      }),
      transformResponse: (res: ApiResponse<ValidationResult>) => res.data
    }),
    
    saveSchema: builder.mutation<TeamDefinition, TeamDefinition>({
      query: (schema) => ({
        url: '/team/schema',
        method: 'PUT',
        body: schema
      }),
      transformResponse: (res: ApiResponse<TeamDefinition>) => res.data,
      invalidatesTags: ['Schema']
    }),
    
    // Runtime Session
    createRuntimeSession: builder.mutation<RuntimeSession, {
      schema: TeamDefinition
    }>({
      query: (payload) => ({
        url: '/runtime/session',
        method: 'POST',
        body: payload
      }),
      transformResponse: (res: ApiResponse<RuntimeSession>) => res.data
    }),
    
    advanceRuntimeSession: builder.mutation<RuntimeSession, {
      sessionId: string
    }>({
      query: (payload) => ({
        url: `/runtime/session/${payload.sessionId}/advance`,
        method: 'POST'
      }),
      transformResponse: (res: ApiResponse<RuntimeSession>) => res.data
    }),
    
    // Agent Markdown
    getAgentMarkdown: builder.query<AgentMarkdown, string>({
      query: (path) => `/agent-markdown?path=${path}`,
      transformResponse: (res: ApiResponse<AgentMarkdown>) => res.data
    }),
    
    saveAgentMarkdown: builder.mutation<void, {
      path: string
      content: string
    }>({
      query: (payload) => ({
        url: '/agent-markdown',
        method: 'PUT',
        body: payload
      })
    })
  })
});

export const {
  useGetSchemasQuery,
  useLazyGetSchemasQuery,
  useSaveSchemaMutation,
  useValidateSchemaMutation,
  useCreateRuntimeSessionMutation,
  useAdvanceRuntimeSessionMutation
} = editorApi;
```

## 页面组件

### EditorWorkspacePage - 主编辑页面

```typescript
// src/editor/pages/EditorWorkspacePage.tsx
export const EditorWorkspacePage: React.FC<Props> = ({
  editor,
  runtime,
  mode,
  onModeChange
}) => {
  const { schemaKey } = useParams();
  
  useEffect(() => {
    editor.selectSchemaKey(schemaKey);
  }, [schemaKey]);
  
  if (editor.schemaLoadStatus === 'loading') {
    return <Skeleton />;
  }
  
  return (
    <Box display="flex" height="100vh">
      {/* 左侧: Graph编辑 */}
      <GraphPanel
        nodes={editor.nodes}
        edges={editor.edges}
        onNodesChange={editor.onNodesChange}
        onEdgesChange={editor.onEdgesChange}
        onNodeSelect={editor.onNodeSelect}
        edgeConnectionError={editor.edgeConnectionError}
      />
      
      {/* 中间: 工具栏 */}
      <EditorHero
        mode={mode}
        onModeChange={onModeChange}
        schema={editor.schema}
        validationIssues={editor.validationIssues}
        onSave={() => editor.saveSchema()}
        onValidate={() => editor.validateSchema()}
        onRunGoal={() => runtime.runGoal(editor.schema)}
      />
      
      {/* 右侧: 面板 (Edit/Runtime/Selection) */}
      {mode === EditorMode.Edit && (
        <SelectionPanel
          selection={editor.selection}
          schema={editor.schema}
          onChange={editor.updateSelection}
        />
      )}
      
      {mode === EditorMode.Runtime && (
        <RuntimePanel
          sessions={runtime.sessions}
          onAdvance={runtime.advanceToNextStep}
        />
      )}
    </Box>
  );
};
```

### GraphPanel - 工作流图编辑

```typescript
// src/editor/components/GraphPanel.tsx
export const GraphPanel: React.FC<Props> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect
}) => {
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance>();
  
  return (
    <Box flex={1} position="relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}  // 自定义节点类型
        edgeTypes={edgeTypes}  // 自定义边类型
        fitView
      >
        <Background />
        <Controls />
        <GraphPanelHeader
          onAddAgentNode={() => addWorkflowAgentNode('new-agent')}
          onAddPipelineNode={() => addWorkflowPipelineNode('new-pipeline')}
        />
        <WorkflowPalettePanel />
      </ReactFlow>
    </Box>
  );
};
```

## 自定义React Flow组件

### 节点类型

```typescript
// src/editor/customNodes/nodeStyles.ts
export const nodeStyles = {
  agent: {
    background: '#E3F2FD',
    border: '2px solid #2196F3',
    borderRadius: '8px'
  },
  department: {
    background: '#F3E5F5',
    border: '2px solid #9C27B0',
    borderRadius: '12px'
  },
  pipeline: {
    background: '#E8F5E9',
    border: '2px solid #4CAF50',
    borderRadius: '6px'
  },
  discussion: {
    background: '#FFF3E0',
    border: '2px solid #FF9800'
  }
};

// src/editor/customNodes/AgentNode.tsx
export const AgentNode: React.FC<NodeProps<AgentNodeData>> = (props) => {
  const { data, selected } = props;
  
  return (
    <NodeShell selected={selected} style={nodeStyles.agent}>
      <Stack spacing={1}>
        <Typography variant="subtitle2">{data.agent.name}</Typography>
        <Typography variant="caption" color="textSecondary">
          {data.agent.role}
        </Typography>
        {data.agent.metadata?.llm && (
          <Chip size="small" label={data.agent.metadata.llm} />
        )}
      </Stack>
    </NodeShell>
  );
};

// 注册所有节点类型
const nodeTypes = {
  'agent': AgentNode,
  'department': DepartmentNode,
  'pipeline': PipelineNode,
  'discussion': DiscussionNode,
  'session-memory': SessionMemoryNode,
  'discussion-memory': DiscussionMemoryNode
};
```

### 边类型

```typescript
// src/editor/customEdges/SchemaRelationEdge.tsx - 基类
export const SchemaRelationEdge: React.FC<EdgeProps> = (props) => {
  const { sourceX, sourceY, targetX, targetY, data } = props;
  const path = getSimpleBezierPath({
    sourceX, sourceY, targetX, targetY
  });
  
  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={data?.stroke || '#222'}
        strokeWidth={2}
      />
      <circle cx={targetX} cy={targetY} r={3} fill={data?.stroke} />
    </g>
  );
};

// 三种边类型对应三种work mode
export const edgeTypes = {
  'WithAgents': WithAgents,  // Discussion (双向)
  'WithDepartmentsAndDiscuss': WithDepartmentsAndDiscuss,  // DiscussBroadcast
  'WithDepartments': WithDepartments  // Pipeline (DAG)
};

// src/editor/model/workflowLayout.ts
export const withWorkflowLayoutDocument = (
  schema: TeamDefinition,
  nodes: Node[],
  edges: Edge[]
): TeamDefinition => ({
  ...schema,
  layout: {
    nodes: nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: n.position,
      data: n.data
    })),
    edges: edges.map(e => ({
      source: e.source,
      target: e.target,
      type: e.type,
      data: e.data
    }))
  }
});
```

## 表单与选择面板

### SelectionPanel - 属性编辑

```typescript
// src/editor/components/selection/SelectionPanel.tsx
export const SelectionPanel: React.FC<Props> = ({
  selection,
  schema,
  onChange
}) => {
  if (!selection) return null;
  
  return (
    <Box width={300} borderLeft="1px solid #ccc" p={2}>
      {selection.type === 'agent' && (
        <AgentSelectionView
          agent={schema.agents.find(a => a.id === selection.id)}
          onChange={onChange}
        />
      )}
      
      {selection.type === 'department' && (
        <DepartmentSelectionView
          department={schema.departments.find(d => d.id === selection.id)}
          onChange={onChange}
        />
      )}
      
      {selection.type === 'discussion' && (
        <DiscussionSelectionView
          discussion={schema.discussions.find(d => d.id === selection.id)}
          onChange={onChange}
        />
      )}
      
      {selection.type === 'pipeline' && (
        <PipelineSelectionView
          pipeline={schema.pipelines.find(p => p.id === selection.id)}
          onChange={onChange}
        />
      )}
    </Box>
  );
};
```

```typescript
// src/editor/components/selection/AgentSelectionView.tsx
export const AgentSelectionView: React.FC<Props> = ({ agent, onChange }) => {
  const methods = useForm<AgentDefinition>({
    defaultValues: agent
  });
  
  return (
    <form onSubmit={methods.handleSubmit((data) => onChange(data))}>
      <Stack spacing={2}>
        <TextField
          {...methods.register('name')}
          label="Agent Name"
          fullWidth
        />
        
        <TextField
          {...methods.register('role')}
          label="Role"
          fullWidth
        />
        
        <SelectionFormField
          label="Department"
          options={getDepartmentOptions()}
          value={agent.department_id}
          onChange={(deptId) => onChange({ ...agent, department_id: deptId })}
        />
        
        <Button variant="contained" type="submit">
          Save
        </Button>
      </Stack>
    </form>
  );
};
```

## 通知与错误处理

### NotificationContext - 全局通知

```typescript
// src/app/notification/NotificationContext.tsx
export const NotificationContext = createContext<NotificationContextType>(
  {} as NotificationContextType
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  return {
    success: (message: string) =>
      context.show({ type: 'success', message }),
    error: (message: string) =>
      context.show({ type: 'error', message }),
    warning: (message: string) =>
      context.show({ type: 'warning', message })
  };
};
```

### useSchemaServiceNotification - 服务通知

```typescript
// src/editor/hooks/useSchemaServiceNotification.ts
export const useSchemaServiceNotification = ({
  status,
  message,
  error
}: NotificationProps) => {
  const notification = useNotification();
  
  useEffect(() => {
    if (status === 'success' && message) {
      notification.success(message);
    }
    if (status === 'error' && error) {
      notification.error(error);
    }
  }, [status, message, error]);
};
```

## 性能优化

### 1. React Flow 虚拟化

- 大型图通过虚拟化只渲染可见节点
- 使用 `onNodesChange` / `onEdgesChange` 实现增量更新

### 2. Redux Selectors 记忆化

```typescript
// 使用reselect创建记忆化selector
import { createSelector } from '@reduxjs/toolkit';

export const selectFilteredAgents = createSelector(
  [(state) => state.editor.schema.agents, (state) => state.editor.selection],
  (agents, selection) => {
    if (selection?.type !== 'department') return agents;
    return agents.filter(a => a.department_id === selection.id);
  }
);
```

### 3. 条件Fetch (RTK Query)

```typescript
// 只在需要时触发请求
const [trigger, { data }] = useLazyGetSchemasQuery();

const loadSchemas = () => trigger();  // 手动触发
```

### 4. StrictMode 下的Effect清理

```typescript
// 避免cleanup中丢弃请求结果
export const useTeamSchemaService = (dispatch) => {
  const [saveSchema] = editorApi.useSaveSchemaMutation();
  
  const saveSchemaImpl = useCallback(async (schema) => {
    let mounted = true;  // 标记组件是否挂载
    
    const result = await saveSchema({ schema }).unwrap();
    
    if (mounted) {  // 仅在挂载时更新状态
      dispatch(schemaLoadSuccess(result));
    }
    
    return () => { mounted = false; };
  }, [saveSchema, dispatch]);
  
  return { saveSchema: saveSchemaImpl };
};
```

## 测试策略

```typescript
// 单元测试 - useTeamEditor
test('useTeamEditor composes editor model correctly', () => {
  const { result } = renderHook(() => useTeamEditor(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>
  });
  
  expect(result.current.schema).toBeDefined();
  expect(result.current.nodes).toBeDefined();
  expect(result.current.saveSchema).toBeDefined();
});

// 集成测试 - GraphPanel
test('GraphPanel renders nodes and edges', () => {
  const { getByText } = render(
    <GraphPanel nodes={mockNodes} edges={mockEdges} />
  );
  expect(getByText('Agent 1')).toBeInTheDocument();
});

// E2E测试 - 编辑流程
test('User can add agent and save schema', async () => {
  // See e2e/forms.spec.ts
});
```

## 下一步阅读

- [数据流与集成](./03-data-flow-and-integration.md)
- [Runtime 引擎](./04-runtime-engine.md)
- [状态管理详解](./06-state-management.md)
