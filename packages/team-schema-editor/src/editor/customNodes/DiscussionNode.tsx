import type { ReactElement } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { NodeProps } from '@xyflow/react';

import type { WorkflowGraphNode } from '../model/types';
import { NodeShell } from './NodeShell';
import { nodeMetricChipSx, nodeTextSx } from './nodeStyles';

export const DiscussionNode = ({ data, selected }: NodeProps<WorkflowGraphNode>): ReactElement => {
	const policy = data.discussionPolicy;

	return (
		<NodeShell eyebrow="Discussion" title={data.nodeName} accent={data.accent} selected={selected} runtimeHighlighted={data.runtimeHighlighted} runtimeDimmed={data.runtimeDimmed} workflowNodeType={data.workflowNodeType}>
			<Stack spacing={0.75}>
				{policy?.mode === undefined ? null : (
					<Typography sx={nodeTextSx}>
						Mode: {policy.mode}
					</Typography>
				)}

				<Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
					<Chip size="small" variant="outlined" label={`Rounds <= ${policy?.max_rounds ?? '-'}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`Outputs ${policy?.required_outputs?.length ?? 0}`} sx={nodeMetricChipSx} />
				</Stack>

				{policy?.supervisor_agent_id === undefined ? null : (
					<Typography sx={nodeTextSx}>
						Supervisor: {policy.supervisor_agent_id}
					</Typography>
				)}

				{policy?.conflict_resolution === undefined ? null : (
					<Typography sx={nodeTextSx}>
						Conflict: {policy.conflict_resolution}
					</Typography>
				)}
			</Stack>
		</NodeShell>
	);
};
