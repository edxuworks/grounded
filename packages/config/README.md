# @grounded/config

Shared **TypeScript base configurations** for the Grounded monorepo. Each app and package
extends one of these presets instead of repeating compiler options, keeping type-checking
consistent across the workspace.

## Presets

| Preset | Extends | Used by |
| --- | --- | --- |
| `@grounded/config/tsconfig/base` | — | the other presets |
| `@grounded/config/tsconfig/react-app` | base | `apps/web` |
| `@grounded/config/tsconfig/node-app` | base | `apps/api` |
| `@grounded/config/tsconfig/node-lib` | base | `packages/*` libraries |

## Usage

Reference a preset from a package's `tsconfig.json`:

```jsonc
{
  "extends": "@grounded/config/tsconfig/node-app",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

The presets are exposed via the package's `exports` map, so consumers can extend them by
name without knowing the file path.
