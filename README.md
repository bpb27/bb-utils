# bb-utils

A tree-shakeable collection of utility functions for **browser** and **Node** environments.

- 📦 **ESM-first** — ships native ES modules with per-module output for optimal tree-shaking.
- 🌳 **Tree-shakeable** — `sideEffects: false` and preserved module structure mean bundlers drop what you don't import.
- 🧩 **Fully typed** — TypeScript source, ships `.d.ts` declarations.
- 📚 **Auto-documented** — API reference generated from JSDoc comments via [TypeDoc](https://typedoc.org).
- 🌍 **Universal** — every utility runs unchanged in the browser and in Node.

## Install

```bash
npm install bb-utils
# or: pnpm add bb-utils
```

## Usage

```ts
import { clamp } from 'bb-utils';

clamp(12, 0, 10); // => 10
clamp(-5, 0, 10); // => 0
```

Because the package is tree-shakeable, importing a single utility pulls in only
that utility's code.

## Scripts

| Command              | Description                                        |
| -------------------- | -------------------------------------------------- |
| `npm run build`      | Build the library to `dist/` (JS + `.d.ts`).       |
| `npm run dev`        | Build in watch mode.                               |
| `npm test`           | Run the test suite once (Vitest).                  |
| `npm run test:watch` | Run tests in watch mode.                           |
| `npm run typecheck`  | Type-check without emitting.                       |
| `npm run docs`       | Generate the API docs to `docs/` (TypeDoc).        |

## Adding a utility

1. Create `src/<category>/<name>.ts` and export the function with a JSDoc block
   (include `@param`, `@returns`, and an `@example`).
2. Re-export it from `src/index.ts`.
3. Add a `src/<category>/<name>.test.ts` beside it.

The build, types, and docs pick it up automatically.

## License

MIT
