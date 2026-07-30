const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const extraAssetExts = ["glb", "gltf"];
for (const ext of extraAssetExts) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

module.exports = config;
