import type { Selection, TeamSchemaDocument, ValidationIssue } from '../../model/types';

import { SchemaLoadStatus, SchemaServiceStatus } from './editorFields';

export type EditorState = {
  schema: TeamSchemaDocument;
  validationIssues: readonly ValidationIssue[];
  selection: Selection;
  schemaLoadStatus: SchemaLoadStatus;
  schemaLoadError: string | null;
  selectedSchemaKey: string | null;
  draftSchemaKey: string;
  resolvedInitialSchema: boolean;
  schemaServiceStatus: SchemaServiceStatus;
  schemaServiceError: string | null;
  schemaServiceMessage: string | null;
  schemaDocumentRevision: number;
};
