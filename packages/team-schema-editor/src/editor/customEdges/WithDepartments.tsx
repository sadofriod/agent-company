import type { ReactElement } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react';

import type { WorkflowEdgeData } from '../model/types';

const STROKE = '#d96c3f';

/**
 * Pipeline / Department handoff edge.
 *
 * Semantics: a one-way handoff between Department / Pipeline / Agent nodes.
 * Used for `WorkflowEdgeMode.Pipeline` connections. Cycles are forbidden among
 * children of a Pipeline node (enforced in `createWorkflowEdge`), so this edge
 * always renders with a single arrowhead and a solid stroke to convey
 * "directed, DAG-only" routing.
 */
export const WithDepartmentsEdge = ({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	markerEnd,
	style,
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
		borderRadius: 12,
	});
	const edgeData = data as WorkflowEdgeData | undefined;
	const mergedStyle = {
		stroke: STROKE,
		strokeWidth: selected === true ? 3.2 : 2.4,
		...style,
	};

	return (
		<>
			<BaseEdge id={`${id}:shadow`} path={path} style={{ stroke: 'rgba(15, 23, 42, 0.14)', strokeWidth: selected === true ? 8 : 6, fill: 'none' }} interactionWidth={0} />
			<BaseEdge id={id} path={path} markerEnd={markerEnd} style={mergedStyle} interactionWidth={20} />
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
						background: '#fff8ed',
						border: `1px solid ${STROKE}`,
						borderRadius: 4,
						boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
						lineHeight: 1,
						padding: '4px 7px',
						textTransform: 'uppercase',
					}}
					className="nodrag nopan"
				>
					{edgeData?.mode === 'pipeline' ? 'pipeline · handoff' : 'handoff'}
				</div>
			</EdgeLabelRenderer>
		</>
	);
};
