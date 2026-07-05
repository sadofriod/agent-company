import type { ReactElement } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { NodeProps } from '@xyflow/react';

import { WorkflowNodeType, type WorkflowGraphNode } from '../model/types';
import { NodeShell, NodeShellVariant } from './NodeShell';
import { nodeMetricChipSx, nodeTextSx } from './nodeStyles';

export const PipelineNode = ({ data, selected }: NodeProps<WorkflowGraphNode>): ReactElement => {
	const isContainer = data.workflowNodeType === WorkflowNodeType.Pipeline;

	return (
		<NodeShell
			eyebrow={isContainer ? 'Pipeline DAG' : 'Pipeline Policy'}
			title={data.nodeName}
			accent={data.accent}
			selected={selected}
			runtimeHighlighted={data.runtimeHighlighted}
			runtimeDimmed={data.runtimeDimmed}
			variant={isContainer ? NodeShellVariant.Container : NodeShellVariant.Standard}
			workflowNodeType={data.workflowNodeType}
		>
			<Stack spacing={0.75}>
				{isContainer ? (
					<Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
						<Chip size="small" color="warning" variant="outlined" label="DAG only" sx={nodeMetricChipSx} />
						<Chip size="small" variant="outlined" label="No cycles" sx={nodeMetricChipSx} />
					</Stack>
				) : null}

				{data.detail === undefined ? null : (
					<Typography sx={nodeTextSx}>
						{data.detail}
					</Typography>
				)}

				{isContainer ? (
					<Typography sx={nodeTextSx}>
						Connect agents with Pipeline-mode edges. Cycles are rejected on connect.
					</Typography>
				) : null}
			</Stack>
		</NodeShell>
	);
};
