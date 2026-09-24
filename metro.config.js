const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { assetExts, sourceExts } = config.resolver;

// Permitir resolver archivos .wasm como assets
if (!assetExts.includes('wasm')) {
  assetExts.push('wasm');
}

// Resolver interceptado para evitar errores de bundler con wa-sqlite.wasm en Metro
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.endsWith('.wasm')) {
    return {
      type: 'empty',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
