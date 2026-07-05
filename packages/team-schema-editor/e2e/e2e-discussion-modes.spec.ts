import { expect, test } from '@playwright/test';

import {
  advanceUntilStable,
  createDiscussionModeSchema,
  loadExampleSchema,
  startRuntimeSession,
} from './helpers/e2eApi';

test.describe('PRD Aligned E2E - Discussion Topology Switch', () => {
  for (const mode of ['supervisor_led', 'sequential_handoff', 'parallel_review'] as const) {
    test(`E2E-002 Discussion Topology Switch / TEST-001 (${mode})`, async ({ request }) => {
      const fixture = await loadExampleSchema('software-delivery-team.json');
      const schema = createDiscussionModeSchema(fixture, mode);
      const started = await startRuntimeSession(request, schema, `Run discussion in ${mode}`);
      const finalSession = await advanceUntilStable(request, started, 8);
      const discussionResult = finalSession.state.discussionResult as {
        topic?: { topicId?: string };
        decisions?: Array<{ decisionId?: string }>;
        ticketDrafts?: Array<{ ticketDraftId?: string }>;
        turns?: Array<{ structuredOutput?: { mode?: string } }>;
      } | undefined;

      expect(discussionResult?.topic?.topicId).toBeTruthy();
      expect((discussionResult?.decisions?.length ?? 0) > 0).toBeTruthy();
      expect((discussionResult?.ticketDrafts?.length ?? 0) > 0).toBeTruthy();

      const turnModes = (discussionResult?.turns ?? [])
        .map((turn) => turn.structuredOutput?.mode)
        .filter((value): value is string => typeof value === 'string');

      expect(turnModes.length > 0).toBeTruthy();
      expect(turnModes.every((value) => value === mode)).toBeTruthy();
    });
  }
});
