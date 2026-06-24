import type { ReactElement } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import type { NodeProps } from '@xyflow/react';

import type { WorkflowGraphNode } from '../model/types';
import { NodeShell } from './NodeShell';
import { nodeMetricChipSx, nodeTextSx } from './nodeStyles';

export const DepartmentNode = ({ data, selected }: NodeProps<WorkflowGraphNode>): ReactElement => {
	const department = data.department;

	return (
		<NodeShell eyebrow="Department" title={data.nodeName} accent={data.accent} selected={selected} runtimeHighlighted={data.runtimeHighlighted} workflowNodeType={data.workflowNodeType}>
			<Stack spacing={0.75}>
				{department?.mission === undefined ? null : (
					<Typography sx={nodeTextSx}>
						{department.mission}
					</Typography>
				)}

				<Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
					<Chip size="small" variant="outlined" label={`Agents ${department?.agents?.length ?? 0}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`Scope ${department?.decision_scope?.length ?? 0}`} sx={nodeMetricChipSx} />
					<Chip size="small" variant="outlined" label={`Handoff ${department?.handoff_contracts?.length ?? 0}`} sx={nodeMetricChipSx} />
				</Stack>

				{department?.decision_scope?.length ? (
					<Typography sx={nodeTextSx}>
						Decision scope: {department.decision_scope?.join(' / ')}
					</Typography>
				) : null}
			</Stack>
		</NodeShell>
	);
};
