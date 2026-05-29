module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    // Note: react-native-reanimated v4's worklets plugin is applied
    // automatically by babel-preset-expo, so no explicit plugin is needed.
  };
};
