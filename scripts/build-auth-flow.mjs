import { build } from "esbuild";

const buildTime = new Date().toISOString();

const commonConfig = {
  entryPoints: ["packages/auth-flow/src/index.js"],
  bundle: true,
  format: "iife",
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
};

await build({
  ...commonConfig,
  globalName: "AnvisningerAuthFlow",
  outfile: "dist/auth-flow.js",
});

console.log("Built auth-flow.js at", buildTime);
