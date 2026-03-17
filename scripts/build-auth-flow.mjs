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

await build({
  ...commonConfig,
  globalName: "AnvisningerSignupFlow",
  outfile: "dist/signup-flow.js",
});

console.log("Built auth-flow.js and signup-flow.js at", buildTime);
