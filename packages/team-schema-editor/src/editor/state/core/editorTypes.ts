import type { Selection, TeamSchemaDocument, ValidationIssue } from '../../model/types';

import { SchemaLoadStatus } from './editorFields';

export type EditorState = {
  schema: TeamSchemaDocument;
  validationIssues: readonly ValidationIssue[];
  selection: Selection;
  schemaLoadStatus: SchemaLoadStatus;
  schemaLoadError: string | null;
  schemaDocumentRevision: number;
};
