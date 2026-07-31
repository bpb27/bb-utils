import { defineConfig } from "vite-plus";

export default defineConfig({
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
});
