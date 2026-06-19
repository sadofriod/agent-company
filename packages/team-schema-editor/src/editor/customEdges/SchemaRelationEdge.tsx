import type { ReactElement } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

import { SchemaEdgeTone, type SchemaEdgeData } from '../model/types';

const toneStyles: Record<SchemaEdgeTone, { stroke: string; fill: string; text: string; border: string }> = {
  [SchemaEdgeTone.Structure]: { stroke: '#667085', fill: '#ffffff', text: '#344054', border: '#cfd6df' },
  [SchemaEdgeTone.Governance]: { stroke: '#a8558f', fill: '#fff7fb', text: '#8a3f73', border: '#e8bddb' },
  [SchemaEdgeTone.Memory]: { stroke: '#3b8290', fill: '#f4fbfc', text: '#246b78', border: '#afd8df' },
};

export const SchemaRelationEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  data,
  selected,
}: EdgeProps): ReactElement => {
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 10,
  });
  const edgeData = data as SchemaEdgeData | undefined;
  const tone = edgeData?.tone ?? SchemaEdgeTone.Structure;
  const toneStyle = toneStyles[tone];
  const label = edgeData?.label ?? tone;

  return (
    <>
      <BaseEdge
        id={`${id}:shadow`}
        path={path}
        style={{ stroke: 'rgba(15, 23, 42, 0.12)', strokeWidth: selected === true ? 7 : 5, fill: 'none' }}
        interactionWidth={0}
      />
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: toneStyle.stroke, strokeWidth: selected === true ? 2.6 : 1.8, fill: 'none' }}
        interactionWidth={22}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: 'all',
            color: toneStyle.text,
            background: toneStyle.fill,
            border: `1px solid ${toneStyle.border}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 0,
            lineHeight: 1,
            padding: '4px 7px',
            textTransform: 'uppercase',
          }}
          className="nodrag nopan"
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};