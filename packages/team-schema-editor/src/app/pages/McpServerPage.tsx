import type { ReactElement } from 'react';

import { CapabilityManagementPage } from './CapabilityManagementPage';
import { CAPABILITY_CATALOG_KIND } from '../capabilityCatalog/types';

export const McpServerPage = (): ReactElement => (
  <CapabilityManagementPage
    kind={CAPABILITY_CATALOG_KIND.McpServers}
    title="MCP Server Management"
    subtitle="Configure reusable MCP server identifiers for workflow node selection."
  />
);
