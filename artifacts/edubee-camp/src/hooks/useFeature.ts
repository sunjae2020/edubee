import { useTenantTheme } from './use-tenant-theme';

type FeatureKey = 'camp_module' | 'accounting' | 'ai_assistant';

/**
 * Check whether a feature is enabled for the current tenant.
 * Usage: const { enabled } = useFeature('camp_module')
 */
export function useFeature(feature: FeatureKey) {
  const { theme } = useTenantTheme();
  const features  = (theme.features ?? {}) as Record<string, boolean>;

  return {
    enabled:  features[feature] === true,
    disabled: features[feature] !== true,
    upgrade:  features[feature] !== true
      ? 'This feature requires a higher plan.'
      : null,
  };
}
