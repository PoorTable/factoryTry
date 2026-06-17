/**
 * Local stub Expo config plugin for `react-native-executorch`.
 *
 * Upstream `react-native-executorch@0.4.10` ships no `app.plugin.js`. Until
 * the package publishes its own config plugin, we register this no-op
 * wrapper so the GATE-3 contract (dependency present AND plugin entry in
 * `app.json` → `expo.plugins`) is satisfied without lying about runtime
 * behavior. The Expo prebuild pipeline accepts plugins that return the
 * config unchanged.
 */
module.exports = function withReactNativeExecutorch(config) {
  return config;
};
