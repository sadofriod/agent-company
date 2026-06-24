import type { ReactElement } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

import type { WorkflowEdgeData } from '../model/types';

const STROKE = '#5d4ed1';

/**
 * Discussion-broadcast edge.
 *
 * Semantics: emits the resolved output of a Discussion node to a downstream
 * Department / Agent / Pipeline node. One-way (single arrowhead), animated to
 * indicate live propagation of the discussion result.
 *
 * Used for `WorkflowEdgeMode.DiscussBroadcast` (MVP rule: "another semantic is
 * to output the discussion result to agent and pipeline nodes").
 */
export const WithDepartmentsAndDiscussEdge = ({
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
	const [path, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		curvature: 0.28,
	});
	const edgeData = data as WorkflowEdgeData | undefined;
	const runtimeHighlighted = edgeData?.runtimeHighlighted === true;
	const isEmphasized = selected === true || runtimeHighlighted;
	const mergedStyle = {
		stroke: runtimeHighlighted ? '#f59e0b' : STROKE,
		strokeWidth: isEmphasized ? 3.6 : 2.4,
		strokeDasharray: '2 4',
		...style,
	};

	return (
		<>
			<BaseEdge id={`${id}:shadow`} path={path} style={{ stroke: runtimeHighlighted ? 'rgba(245, 158, 11, 0.22)' : 'rgba(15, 23, 42, 0.14)', strokeWidth: isEmphasized ? 8 : 6, fill: 'none' }} interactionWidth={0} />
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
						background: '#f6f4ff',
						border: `1px solid ${STROKE}`,
						borderRadius: 4,
						boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
						lineHeight: 1,
						padding: '4px 7px',
						textTransform: 'uppercase',
					}}
					className="nodrag nopan"
				>
					{edgeData?.mode === 'discuss_broadcast' ? 'discuss · broadcast' : 'broadcast'}
				</div>
			</EdgeLabelRenderer>
		</>
	);
};
