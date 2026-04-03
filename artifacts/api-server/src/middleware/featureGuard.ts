import { Request, Response, NextFunction } from 'express';

type FeatureKey = 'camp_module' | 'accounting' | 'ai_assistant';

/**
 * Allows only tenants with the specified feature enabled.
 * Usage: router.get('/camp', featureGuard('camp_module'), handler)
 */
export function featureGuard(feature: FeatureKey) {
  return (req: Request, res: Response, next: NextFunction) => {
    const features = (req as any).tenant?.features as Record<string, boolean> | undefined;

    if (!features || !features[feature]) {
      return res.status(403).json({
        message:         'This feature is not available on your current plan.',
        feature,
        upgradeRequired: true,
      });
    }
    next();
  };
}

/**
 * Default feature set by plan type.
 * Used when creating a new tenant.
 */
export const DEFAULT_FEATURES: Record<string, Record<string, boolean>> = {
  solo:         { camp_module: false, accounting: false, ai_assistant: false },
  starter:      { camp_module: false, accounting: false, ai_assistant: false },
  growth:       { camp_module: true,  accounting: true,  ai_assistant: false },
  professional: { camp_module: true,  accounting: true,  ai_assistant: false },
  enterprise:   { camp_module: true,  accounting: true,  ai_assistant: true  },
};

export function getDefaultFeatures(planType: string): Record<string, boolean> {
  return DEFAULT_FEATURES[planType] ?? DEFAULT_FEATURES['starter'];
}
