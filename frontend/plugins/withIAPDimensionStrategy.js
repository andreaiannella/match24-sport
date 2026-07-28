const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Custom Expo Config Plugin to add missingDimensionStrategy for expo-iap
 * This is required because expo-iap's Android library uses a "platform" flavor dimension
 * that must be resolved in the app's build.gradle
 */
function withIAPDimensionStrategy(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Check if missingDimensionStrategy already exists
    if (buildGradle.includes('missingDimensionStrategy')) {
      console.log('[withIAPDimensionStrategy] Already configured, skipping...');
      return config;
    }
    
    // Find the defaultConfig block and add missingDimensionStrategy
    const defaultConfigPattern = /defaultConfig\s*\{/;
    
    if (defaultConfigPattern.test(buildGradle)) {
      config.modResults.contents = buildGradle.replace(
        defaultConfigPattern,
        `defaultConfig {
        missingDimensionStrategy "store", "play"`
      );
      console.log('[withIAPDimensionStrategy] Added missingDimensionStrategy for IAP');
    } else {
      console.warn('[withIAPDimensionStrategy] Could not find defaultConfig block');
    }
    
    return config;
  });
}

module.exports = withIAPDimensionStrategy;
