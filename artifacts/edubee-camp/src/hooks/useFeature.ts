import { useTenantThemeCtx } from './use-tenant-theme';

type FeatureKey = 'camp_module' | 'accounting' | 'ai_assistant';

/**
 * Check whether a feature is enabled for the current tenant.
 * Uses TenantThemeContext (shared from Router) — no duplicate API calls.
 * Usage: const { enabled } = useFeature('camp_module')
 */
export function useFeature(feature: FeatureKey) {
  const theme    = useTenantThemeCtx();
  const features = (theme.features ?? {}) as Record<string, boolean>;

  return {
    enabled:  features[feature] === true,
    disabled: features[feature] !== true,
    upgrade:  features[feature] !== true
      ? 'This feature requires a higher plan.'
      : null,
  };
}
