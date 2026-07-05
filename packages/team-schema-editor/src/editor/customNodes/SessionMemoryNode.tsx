import type { ReactElement } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { NodeProps } from '@xyflow/react';

import type { WorkflowGraphNode } from '../model/types';
import { NodeShell, NodeShellVariant } from './NodeShell';
import { nodeMetricChipSx, nodeTextSx } from './nodeStyles';

const defaultSessionScopes = ['system', 'ticket'];

export const SessionMemoryNode = ({ data, selected }: NodeProps<WorkflowGraphNode>): ReactElement => {
	const policy = data.memoryPolicy;
	const retrievalProfile = policy?.retrieval_profiles?.find((profile) => profile.allowed_scopes?.includes('ticket'));
	const scopes = retrievalProfile?.allowed_scopes ?? defaultSessionScopes;

	return (
		<NodeShell eyebrow="Session Memory" title={data.nodeName} accent={data.accent} selected={selected} runtimeHighlighted={data.runtimeHighlighted} runtimeDimmed={data.runtimeDimmed} variant={NodeShellVariant.Memory} workflowNodeType={data.workflowNodeType}>
			<Stack spacing={0.75}>
				<Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
					<Chip size="small" variant="outlined" label={`Profiles ${policy?.retrieval_profiles?.length ?? 0}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`Hops ${retrievalProfile?.max_graph_hops ?? 1}`} sx={nodeMetricChipSx} />
				</Stack>

				<Typography sx={nodeTextSx}>
					Scopes: {scopes.join(' / ')}
				</Typography>

				<Typography sx={nodeTextSx}>
					Evidence outputs: {policy?.evidence_required_for_outputs?.join(' / ') ?? 'decision / ticket / handoff / review_result'}
				</Typography>
			</Stack>
		</NodeShell>
	);
};
