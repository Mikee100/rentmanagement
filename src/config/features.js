export const featureFlags = {
  maintenance: false,
  expenses: false,
  equityBank: false,
};

export const isFeatureEnabled = (featureName) => Boolean(featureFlags[featureName]);
