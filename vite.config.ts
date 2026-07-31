import { resolve } from "node:path";
import { defineConfig } from "vite-plus";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    // Emit .d.ts declaration files so consumers get full type information.
    dts({
      include: ["src"],
      exclude: ["src/**/*.test.ts"],
      rollupTypes: false,
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
  lint: {
    ignorePatterns: ["dist/**"],
    options: {
      typeCheck: true,
      typeAware: true,
    },
  },
  staged: {
    "*": "vp check --fix",
  },
  build: {
    // Don't clobber the .d.ts files emitted by vite-plugin-dts.
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
    },
    rollupOptions: {
      output: {
        // Preserve the source module structure (one file per module) so that
        // bundlers can tree-shake individual utilities out of the barrel.
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
});
