import type { ReactElement } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

import type { WorkflowEdgeData } from '../model/types';

const STROKE = '#2f7b6d';

/**
 * Multi-agent discussion edge.
 *
 * Semantics: a peer-to-peer discussion link between two Agent nodes — both ends
 * are senders and receivers. Rendered with double arrowheads (markerStart +
 * markerEnd, set during edge creation) plus an animated dashed stroke to signal
 * a bidirectional discussion, not a directed handoff.
 *
 * Used when `WorkflowEdgeMode.Discuss` connects two Agent nodes (MVP rule:
 * "one semantic is to let multiple agents discuss").
 */
export const WithAgentsEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	markerStart,
	markerEnd,
	style,
	data,
	selected,
}: EdgeProps): ReactElement => {
	const [path, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		curvature: 0.35,
	});
	const edgeData = data as WorkflowEdgeData | undefined;
	const mergedStyle = {
		stroke: STROKE,
		strokeWidth: selected === true ? 3.2 : 2.4,
		strokeDasharray: '7 5',
		...style,
	};

	return (
		<>
			<BaseEdge id={`${id}:shadow`} path={path} style={{ stroke: 'rgba(15, 23, 42, 0.14)', strokeWidth: selected === true ? 8 : 6, fill: 'none' }} interactionWidth={0} />
			<BaseEdge id={id} path={path} markerStart={markerStart} markerEnd={markerEnd} style={mergedStyle} interactionWidth={20} />
			<EdgeLabelRenderer>
				<div
					style={{
						position: 'absolute',
						transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
						pointerEvents: 'all',
						fontSize: 10,
						fontWeight: 800,
						letterSpacing: 0,
						color: STROKE,
						background: '#f4fbf9',
						border: `1px solid ${STROKE}`,
						borderRadius: 4,
						boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
						lineHeight: 1,
						padding: '4px 7px',
						textTransform: 'uppercase',
					}}
					className="nodrag nopan"
				>
					{edgeData?.mode === 'discuss' ? 'discuss · peers' : 'discuss'}
				</div>
			</EdgeLabelRenderer>
		</>
	);
};
