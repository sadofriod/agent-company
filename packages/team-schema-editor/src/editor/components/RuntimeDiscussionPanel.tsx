import type { ReactElement } from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { MessageSquare } from 'lucide-react';

import type {
  RuntimeDiscussionBlackboard,
  RuntimeDiscussionConnectedTarget,
  RuntimeDiscussionTurn,
} from '../model/types';

type Props = {
  turns: readonly RuntimeDiscussionTurn[];
  mode?: string;
  connectedTargets?: readonly RuntimeDiscussionConnectedTarget[];
  blackboard?: RuntimeDiscussionBlackboard;
};

const MODE_LABELS: Record<string, string> = {
  supervisor_led: 'Supervisor-Led',
  sequential_handoff: 'Sequential Handoff',
  parallel_review: 'Parallel Review',
};

const TARGET_KIND_LABELS: Record<RuntimeDiscussionConnectedTarget['kind'], string> = {
  agent: 'Agent',
  department: 'Department',
  pipeline: 'Pipeline',
};

const formatIdList = (values: readonly string[] | undefined): string =>
  values === undefined || values.length === 0 ? 'none' : values.join(', ');

export const RuntimeDiscussionPanel = ({ turns, mode, connectedTargets = [], blackboard }: Props): ReactElement | null => {
  if (turns.length === 0 && connectedTargets.length === 0 && blackboard === undefined) return null;

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
        <MessageSquare size={14} />
        <Typography variant="subtitle2">Discussion Turns</Typography>
        {mode !== undefined && (
          <Chip label={MODE_LABELS[mode] ?? mode} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.7rem' }} />
        )}
        {blackboard?.latestSummary === undefined || blackboard.latestSummary.trim().length === 0 ? null : (
          <Chip label="Blackboard active" size="small" color="secondary" variant="outlined" sx={{ height: 18, fontSize: '0.7rem' }} />
        )}
      </Box>

      {connectedTargets.length === 0 ? null : (
        <Box sx={{ mb: 1.25 }} data-testid="discussion-connected-targets">
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Connected Targets</Typography>
          <Stack spacing={0.75}>
            {connectedTargets.map((target) => (
              <Box key={target.targetId} sx={{ border: '1px solid #d7dde5', p: 1, bgcolor: '#ffffff' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.45, flexWrap: 'wrap' }}>
                  <Chip label={TARGET_KIND_LABELS[target.kind] ?? target.kind} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{target.label}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {target.targetId}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {target.detail}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.45, display: 'block' }}>
                  Readable by: {formatIdList(target.readableByAgentIds)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Writable by: {formatIdList(target.writableByAgentIds)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Capabilities: {formatIdList(target.capabilityIds)}
                </Typography>
                {target.inputContract === undefined ? null : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Input: {target.inputContract}
                  </Typography>
                )}
                {target.outputContract === undefined ? null : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Output: {target.outputContract}
                  </Typography>
                )}
                {target.downstreamTargetIds === undefined || target.downstreamTargetIds.length === 0 ? null : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Downstream: {target.downstreamTargetIds.join(', ')}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {blackboard === undefined ? null : (
        <Box sx={{ mb: 1.25 }} data-testid="discussion-blackboard-panel">
          <Typography variant="subtitle2" sx={{ mb: 0.75 }}>Shared Blackboard</Typography>
          <Stack spacing={0.75}>
            <Box sx={{ border: '1px solid #d7dde5', p: 1, bgcolor: '#ffffff' }}>
              <Typography variant="caption" color="text.secondary">Latest Summary</Typography>
              <Typography variant="body2" sx={{ mt: 0.35, whiteSpace: 'pre-wrap' }}>
                {blackboard.latestSummary.trim().length === 0 ? 'No summary yet.' : blackboard.latestSummary}
              </Typography>
            </Box>

            <Box sx={{ border: '1px solid #d7dde5', p: 1, bgcolor: '#ffffff' }}>
              <Typography variant="caption" color="text.secondary">Upstream Inputs</Typography>
              {blackboard.upstreamInputs.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>No upstream inputs recorded.</Typography>
              ) : (
                <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                  {blackboard.upstreamInputs.map((input) => (
                    <Box key={input.inputId}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{input.source}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{input.summary}</Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>

            <Box sx={{ border: '1px solid #d7dde5', p: 1, bgcolor: '#ffffff' }}>
              <Typography variant="caption" color="text.secondary">Blackboard Entries</Typography>
              {blackboard.entries.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>No blackboard writes yet.</Typography>
              ) : (
                <Stack spacing={0.6} sx={{ mt: 0.5 }}>
                  {blackboard.entries.map((entry) => (
                    <Box key={entry.entryId} sx={{ borderLeft: '2px solid #d7dde5', pl: 0.9 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                        <Chip label={`Round ${entry.round}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
                        <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{entry.authorAgentId}</Typography>
                      </Box>
                      <Typography variant="body2" sx={{ mt: 0.35, whiteSpace: 'pre-wrap' }}>{entry.summary}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                        Source targets: {entry.sourceTargetIds.join(', ')}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>
      )}

      {turns.length === 0 ? null : (
      <Stack spacing={0.75}>
        {turns.map((turn, idx) => {
          const recommendation = typeof turn.structuredOutput.blackboardWrite === 'string'
            ? turn.structuredOutput.blackboardWrite
            : typeof turn.structuredOutput.recommendation === 'string'
              ? turn.structuredOutput.recommendation
            : JSON.stringify(turn.structuredOutput);

          return (
            <Box key={idx} sx={{ border: '1px solid #d7dde5', p: 1, bgcolor: '#ffffff' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.4 }}>
                <Chip label={`Round ${turn.round}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.65rem' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {turn.agentId}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {recommendation}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.45, display: 'block' }}>
                Read targets: {formatIdList(turn.structuredOutput.readTargetIds)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Write targets: {formatIdList(turn.structuredOutput.writeTargetIds)}
              </Typography>
            </Box>
          );
        })}
      </Stack>
      )}
    </Box>
  );
};
