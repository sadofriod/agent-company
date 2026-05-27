import { useEffect, useState } from 'react';
import type { Edge, Node, OnNodesChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';

import { buildGraph } from '../model/graphLayout';
import {
  addAgent as addAgentAction,
  addDepartment as addDepartmentAction,
  applyJson as applyJsonAction,
  removeAgent as removeAgentAction,
  removeDepartment as removeDepartmentAction,
  resetSample as resetSampleAction,
  selectNode,
  setJsonValue,
  updateAgentField as updateAgentFieldAction,
  updateAgentList as updateAgentListAction,
  updateDepartmentField as updateDepartmentFieldAction,
  updateDepartmentList as updateDepartmentListAction,
  updateDiscussionField as updateDiscussionFieldAction,
  updateDiscussionNumber as updateDiscussionNumberAction,
  updateTeamField as updateTeamFieldAction,
} from '../state/editorSlice';
import { useAppDispatch, useAppSelector } from '../state/editorHooks';
import type { GraphNodeData, Selection, TeamSchemaDocument, ValidationIssue } from '../model/types';

export const useTeamEditor = (): {
  readonly schema: TeamSchemaDocument;
  readonly jsonValue: string;
  readonly parseError: string | null;
  readonly validationIssues: readonly ValidationIssue[];
  readonly nodes: Node<GraphNodeData>[];
  readonly edges: Edge[];
  readonly selection: Selection;
  readonly onNodesChange: OnNodesChange<Node<GraphNodeData>>;
  readonly onNodeSelect: (nodeId: string | null) => void;
  readonly onJsonChange: (value: string) => void;
  readonly applyJson: () => void;
  readonly resetSample: () => void;
  readonly updateTeamField: (field: 'team_name' | 'team_id' | 'schema_version', value: string) => void;
  readonly updateDepartmentField: (departmentId: string, field: 'name' | 'mission', value: string) => void;
  readonly updateDepartmentList: (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string) => void;
  readonly updateAgentField: (agentId: string, field: 'role' | 'model' | 'description', value: string) => void;
  readonly updateAgentList: (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string) => void;
  readonly updateDiscussionField: (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string) => void;
  readonly updateDiscussionNumber: (field: 'max_rounds', value: number) => void;
  readonly addDepartment: () => void;
  readonly removeDepartment: (departmentId: string) => void;
  readonly addAgent: (departmentId: string) => void;
  readonly removeAgent: (agentId: string) => void;
} => {
  const dispatch = useAppDispatch();
  const schema = useAppSelector((state) => state.editor.schema);
  const jsonValue = useAppSelector((state) => state.editor.jsonValue);
  const parseError = useAppSelector((state) => state.editor.parseError);
  const validationIssues = useAppSelector((state) => state.editor.validationIssues);
  const selection = useAppSelector((state) => state.editor.selection);
  const [nodes, setNodes] = useState<Node<GraphNodeData>[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    const graph = buildGraph(schema);
    setNodes((currentNodes) =>
      graph.nodes.map((node) => {
        const existingNode = currentNodes.find((candidate) => candidate.id === node.id);

        return existingNode === undefined
          ? node
          : {
              ...node,
              position: existingNode.position,
            };
      }),
    );
    setEdges(graph.edges);
  }, [schema]);

  const onNodesChange: OnNodesChange<Node<GraphNodeData>> = (changes) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  };

  const onNodeSelect = (nodeId: string | null): void => {
    dispatch(selectNode(nodeId));
  };

  const onJsonChange = (value: string): void => {
    dispatch(setJsonValue(value));
  };

  const applyJson = (): void => {
    dispatch(applyJsonAction());
  };

  const resetSample = (): void => {
    dispatch(resetSampleAction());
  };

  const addDepartment = (): void => {
    dispatch(addDepartmentAction());
  };

  const removeDepartment = (departmentId: string): void => {
    dispatch(removeDepartmentAction(departmentId));
  };

  const addAgent = (departmentId: string): void => {
    dispatch(addAgentAction(departmentId));
  };

  const removeAgent = (agentId: string): void => {
    dispatch(removeAgentAction(agentId));
  };

  const updateTeamField = (field: 'team_name' | 'team_id' | 'schema_version', value: string): void => {
    dispatch(updateTeamFieldAction({ field, value }));
  };

  const updateDepartmentField = (departmentId: string, field: 'name' | 'mission', value: string): void => {
    dispatch(updateDepartmentFieldAction({ departmentId, field, value }));
  };

  const updateDepartmentList = (departmentId: string, field: 'decision_scope' | 'handoff_contracts', value: string): void => {
    dispatch(updateDepartmentListAction({ departmentId, field, value }));
  };

  const updateAgentField = (agentId: string, field: 'role' | 'model' | 'description', value: string): void => {
    dispatch(updateAgentFieldAction({ agentId, field, value }));
  };

  const updateAgentList = (agentId: string, field: 'responsibilities' | 'skills' | 'tools' | 'mcp_servers', value: string): void => {
    dispatch(updateAgentListAction({ agentId, field, value }));
  };

  const updateDiscussionField = (field: 'mode' | 'conflict_resolution' | 'supervisor_agent_id', value: string): void => {
    dispatch(updateDiscussionFieldAction({ field, value }));
  };

  const updateDiscussionNumber = (field: 'max_rounds', value: number): void => {
    dispatch(updateDiscussionNumberAction({ field, value }));
  };

  return {
    schema,
    jsonValue,
    parseError,
    validationIssues,
    nodes,
    edges,
    selection,
    onNodesChange,
    onNodeSelect,
    onJsonChange,
    applyJson,
    resetSample,
    updateTeamField,
    updateDepartmentField,
    updateDepartmentList,
    updateAgentField,
    updateAgentList,
    updateDiscussionField,
    updateDiscussionNumber,
    addDepartment,
    removeDepartment,
    addAgent,
    removeAgent,
  };
};