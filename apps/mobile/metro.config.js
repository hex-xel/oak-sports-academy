const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);
const sharedSource = path.resolve(__dirname, "../../packages/shared/src");

/**
 * Resolve shared source ESM .js specifiers through Metro's TypeScript/platform lookup.
 * @param context Metro's resolver context; only shared source imports are adapted.
 * @param moduleName Requested specifier; package and real dependency imports stay intact.
 * @param platform Target platform forwarded to Expo's default resolver.
 * @returns Default resolver result; resolution failures propagate without suppression.
 * @remarks NodeNext requires .js in shared source, but Metro does not substitute .ts.
 * Observed T044 error: Unable to resolve module ./permissions.js from shared/src/index.ts.
 * Source: https://docs.expo.dev/guides/customizing-metro/#aliases
 */
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const relative = path.relative(sharedSource, context.originModulePath);
  const fromShared = relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
  const sourceName = fromShared && /^\.{1,2}\//.test(moduleName) && moduleName.endsWith(".js")
    ? moduleName.slice(0, -3) : moduleName;
  return context.resolveRequest(context, sourceName, platform);
};

module.exports = config;
