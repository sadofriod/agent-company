import type { ReactElement } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { NodeProps } from '@xyflow/react';

import type { WorkflowGraphNode } from '../model/types';
import { NodeShell } from './NodeShell';
import { nodeMetricChipSx, nodeTextSx } from './nodeStyles';

export const AgentNode = ({ data, selected }: NodeProps<WorkflowGraphNode>): ReactElement => {
	const agent = data.agent;

	return (
		<NodeShell eyebrow="Agent" title={data.nodeName} accent={data.accent} selected={selected} workflowNodeType={data.workflowNodeType}>
			<Stack spacing={0.75}>
				{agent?.role === undefined ? null : (
					<Typography sx={nodeTextSx}>
						Role: {agent.role}
					</Typography>
				)}
				{agent?.model === undefined ? null : (
					<Typography sx={nodeTextSx}>
						Model: {agent.model}
					</Typography>
				)}

				<Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
					<Chip size="small" variant="outlined" label={`Resp ${agent?.responsibilities?.length ?? 0}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`Skills ${agent?.skills?.length ?? 0}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`Tools ${agent?.tools?.length ?? 0}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`MCP ${agent?.mcp_servers?.length ?? 0}`} sx={nodeMetricChipSx} />
				</Stack>

				{agent?.memory_access_policy === undefined ? null : (
					<Typography sx={nodeTextSx}>
						Memory profile: {agent.memory_access_policy}
					</Typography>
				)}
				{agent?.input_contract === undefined || agent.output_contract === undefined ? null : (
					<Typography sx={nodeTextSx}>
						{agent.input_contract}
						{' -> '}
						{agent.output_contract}
					</Typography>
				)}
			</Stack>
		</NodeShell>
	);
};
