module.exports = function (api) {
  api.cache.never();

  const isTest = process.env.NODE_ENV === "test";

  return {
    presets: [require("expo/node_modules/babel-preset-expo")],
    plugins: [...(isTest ? [] : ["react-native-reanimated/plugin"])],
  };
};
