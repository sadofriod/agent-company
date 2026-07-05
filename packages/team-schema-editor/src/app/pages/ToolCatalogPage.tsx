import type { ReactElement } from 'react';

import { CapabilityManagementPage } from './CapabilityManagementPage';
import { CAPABILITY_CATALOG_KIND } from '../capabilityCatalog/types';

export const ToolCatalogPage = (): ReactElement => (
  <CapabilityManagementPage
    kind={CAPABILITY_CATALOG_KIND.Tools}
    title="Tool Management"
    subtitle="Configure reusable tool identifiers for workflow node selection."
  />
);
