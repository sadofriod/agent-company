import type { ReactElement } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { NodeProps } from '@xyflow/react';

import type { WorkflowGraphNode } from '../model/types';
import { NodeShell } from './NodeShell';
import { nodeMetricChipSx, nodeTextSx } from './nodeStyles';

const defaultDiscussionScopes = ['system', 'session', 'topic'];

export const DiscussionMemoryNode = ({ data, selected }: NodeProps<WorkflowGraphNode>): ReactElement => {
	const policy = data.memoryPolicy;
	const retrievalProfile = policy?.retrieval_profiles?.find((profile) => profile.allowed_scopes?.includes('topic'));
	const scopes = retrievalProfile?.allowed_scopes ?? defaultDiscussionScopes;

	return (
		<NodeShell eyebrow="Discussion Memory" title={data.nodeName} accent={data.accent} selected={selected} variant="memory" workflowNodeType={data.workflowNodeType}>
			<Stack spacing={0.75}>
				<Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
					<Chip size="small" variant="outlined" label={`Mode ${policy?.retrieval_mode ?? 'none'}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`Hops ${retrievalProfile?.max_graph_hops ?? 2}`} sx={nodeMetricChipSx} />
				</Stack>

				<Typography sx={nodeTextSx}>
					Scopes: {scopes.join(' / ')}
				</Typography>

				<Typography sx={nodeTextSx}>
					Conflict strategy: {policy?.conflict_strategy ?? 'return_conflicts_to_review'}
				</Typography>
			</Stack>
		</NodeShell>
	);
};
