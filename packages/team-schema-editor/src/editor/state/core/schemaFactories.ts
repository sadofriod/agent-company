import type { TeamSchemaDocument } from '../../model/types';

import { SchemaLoadStatus } from './editorFields';
import { createDefaultMemoryPolicy } from './memoryPolicyDefaults';
import { validateEditorState } from './schemaHelpers';
import type { EditorState } from './editorTypes';

export { createDefaultMemoryPolicy, createDefaultMemoryProfile } from './memoryPolicyDefaults';

export const createPendingTeamSchema = (): TeamSchemaDocument => ({
  schema_version: '0.1.0',
  team_id: 'loading-team-schema',
  team_name: 'Loading Team Schema',
  departments: [
    {
      department_id: 'loading',
      name: 'Loading',
      mission: 'Load the team schema from the service.',
      decision_scope: ['loading'],
      agents: ['loading_agent'],
      handoff_contracts: [],
    },
  ],
  agents: [
    {
      agent_id: 'loading_agent',
      department_id: 'loading',
      role: 'Schema Loader',
      model: 'default-model',
      description: 'Loads the editable team schema from the service.',
      responsibilities: ['load_schema'],
      input_contract: 'service_request',
      output_contract: 'team_schema',
      skills: [],
      mcp_servers: [],
      tools: [],
    },
  ],
  discussion_policy: {
    mode: 'supervisor_led',
    max_rounds: 1,
    supervisor_agent_id: 'loading_agent',
    conflict_resolution: 'supervisor_decision',
    required_outputs: ['team_schema'],
  },
});

const pendingTeamSchema = createPendingTeamSchema();

export const initialState: EditorState = {
  schema: pendingTeamSchema,
  selection: { kind: 'team' },
  ...validateEditorState(pendingTeamSchema),
  schemaLoadStatus: SchemaLoadStatus.Idle,
  schemaLoadError: null,
  schemaDocumentRevision: 0,
};
