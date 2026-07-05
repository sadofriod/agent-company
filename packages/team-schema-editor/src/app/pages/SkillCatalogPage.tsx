import type { ReactElement } from 'react';

import { CapabilityManagementPage } from './CapabilityManagementPage';
import { CAPABILITY_CATALOG_KIND } from '../capabilityCatalog/types';

export const SkillCatalogPage = (): ReactElement => (
  <CapabilityManagementPage
    kind={CAPABILITY_CATALOG_KIND.Skills}
    title="Skill Management"
    subtitle="Configure reusable skill identifiers for workflow node selection."
  />
);
