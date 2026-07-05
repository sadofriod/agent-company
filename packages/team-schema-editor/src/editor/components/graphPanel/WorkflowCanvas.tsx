import type { KeyboardEvent, ReactElement } from 'react';
import { Box } from '@mui/material';
import { Background, Controls, MiniMap, ReactFlow } from '@xyflow/react';
import type { EdgeTypes, NodeTypes } from '@xyflow/react';

import { useGraphPanelContext } from './hooks/useGraphPanelContext';

type WorkflowCanvasProps = {
  nodeTypes: NodeTypes;
  edgeTypes: EdgeTypes;
};

export const WorkflowCanvas = ({
  nodeTypes,
  edgeTypes,
}: WorkflowCanvasProps): ReactElement => {
  const {
    isEditing,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeSelect,
    onConnect,
    onWorkflowEditorKeyDown,
    isTextInputTarget,
  } = useGraphPanelContext();

  return (
    <Box
      tabIndex={0}
      onKeyDown={onWorkflowEditorKeyDown as (event: KeyboardEvent<HTMLDivElement>) => void}
      onMouseDownCapture={(event) => {
        if (isTextInputTarget(event.target)) {
          return;
        }

        event.currentTarget.focus();
      }}
      sx={{ position: 'relative', minHeight: { xs: 520, md: 620 }, overflow: 'hidden', outline: 'none' }}
    >
      {!isEditing ? (
        <Box
          sx={{
            position: 'absolute',
            zIndex: 5,
            top: 12,
            left: 12,
            border: '1px solid #d7dde5',
            borderRadius: 1,
            bgcolor: 'rgba(255, 255, 255, 0.92)',
            color: '#344054',
            fontSize: '0.76rem',
            fontWeight: 750,
            px: 1,
            py: 0.65,
          }}
        >
          Run view
        </Box>
      ) : null}
      <ReactFlow
        className="flow-workbench"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_event, node) => onNodeSelect(node.id)}
        onConnect={onConnect}
        nodesConnectable={isEditing}
        nodesDraggable={isEditing}
        elementsSelectable
        panOnScroll
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.35}
        connectionLineStyle={{ stroke: '#d96c3f', strokeWidth: 2, strokeDasharray: '6 4' }}
      >
        <MiniMap pannable zoomable maskColor="rgba(238, 242, 246, 0.72)" />
        <Controls />
        <Background gap={24} size={1} color="#cfd7e3" />
      </ReactFlow>
    </Box>
  );
};