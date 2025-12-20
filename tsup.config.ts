import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  target: "node20",
  sourcemap: true,
  clean: true,
  dts: true,
  minify: false,
  shims: false
});
