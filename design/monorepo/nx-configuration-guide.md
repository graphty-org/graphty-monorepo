# Nx Configuration Guide for Graphty

Based on analysis of your existing packages, here's how to configure Nx to match your current setup and preferences.

## 1. Initial Nx Setup with Your Tools

```bash
# Initialize Nx in your existing monorepo
npx nx@latest init

# Install your preferred tools globally in the monorepo
pnpm add -D -w \
  @commitlint/cli @commitlint/config-conventional \
  cz-conventional-changelog commitizen \
  husky semantic-release @semantic-release/changelog \
  @semantic-release/git @semantic-release/github \
  eslint @eslint/js @stylistic/eslint-plugin \
  eslint-plugin-simple-import-sort typescript-eslint \
  typescript@^5.8.3 \
  vite@^7.0.5 vitest@^2.2.0 @vitest/ui @vitest/coverage-v8 \
  @vitest/browser playwright happy-dom \
  tsx knip
```

## 2. Configure Nx with Your Defaults

Create/update `nx.json`:

```json
{
    "$schema": "./node_modules/nx/schemas/nx-schema.json",
    "namedInputs": {
        "default": ["{projectRoot}/**/*", "sharedGlobals"],
        "production": [
            "default",
            "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
            "!{projectRoot}/tsconfig.spec.json",
            "!{projectRoot}/vitest.config.ts",
            "!{projectRoot}/.eslintrc.json"
        ],
        "sharedGlobals": []
    },
    "targetDefaults": {
        "build": {
            "dependsOn": ["^build"],
            "inputs": ["production", "^production"],
            "outputs": ["{projectRoot}/dist"],
            "cache": true
        },
        "test": {
            "inputs": ["default", "^production"],
            "cache": true
        },
        "lint": {
            "inputs": ["default"],
            "cache": true
        },
        "semantic-release": {
            "dependsOn": ["build"],
            "cache": false
        }
    },
    "release": {
        "projects": ["packages/*"],
        "projectsRelationship": "independent",
        "version": {
            "conventionalCommits": true,
            "generatorOptions": {
                "updateDependents": "auto"
            }
        },
        "changelog": {
            "projectChangelogs": {
                "createRelease": "github",
                "renderOptions": {
                    "authors": true,
                    "commitReferences": true,
                    "versionTitleDate": true
                }
            }
        }
    },
    "generators": {
        "@nx/js:library": {
            "buildable": true,
            "publishable": true,
            "unitTestRunner": "vitest",
            "bundler": "vite",
            "compiler": "tsc",
            "testEnvironment": "node",
            "skipFormat": true,
            "strict": true
        }
    },
    "tasksRunnerOptions": {
        "default": {
            "runner": "nx/tasks-runners/default",
            "options": {
                "cacheableOperations": ["build", "test", "lint"],
                "parallel": 3,
                "cacheDirectory": ".nx/cache"
            }
        }
    },
    "workspaceLayout": {
        "appsDir": "packages",
        "libsDir": "packages"
    }
}
```

## 3. Project Configuration Template

For each package, create a `project.json`:

```json
{
    "name": "@graphty/package-name",
    "$schema": "../../node_modules/nx/schemas/project-schema.json",
    "sourceRoot": "packages/package-name/src",
    "projectType": "library",
    "tags": ["scope:algorithms", "type:library"],
    "targets": {
        "build": {
            "executor": "@nx/vite:build",
            "outputs": ["{options.outputPath}"],
            "options": {
                "outputPath": "packages/package-name/dist",
                "configFile": "packages/package-name/vite.config.ts",
                "generatePackageJson": true,
                "assets": [
                    {
                        "input": "packages/package-name",
                        "glob": "README.md",
                        "output": "."
                    }
                ]
            }
        },
        "build:all": {
            "executor": "nx:run-commands",
            "dependsOn": ["build"],
            "options": {
                "commands": ["pnpm --filter @graphty/package-name run build:bundle"]
            }
        },
        "test": {
            "executor": "@nx/vite:test",
            "outputs": ["{projectRoot}/coverage"],
            "options": {
                "configFile": "packages/package-name/vitest.config.ts",
                "passWithNoTests": true
            }
        },
        "test:ui": {
            "executor": "nx:run-commands",
            "options": {
                "command": "vitest --ui",
                "cwd": "packages/package-name"
            }
        },
        "test:coverage": {
            "executor": "nx:run-commands",
            "options": {
                "command": "vitest run --coverage",
                "cwd": "packages/package-name"
            }
        },
        "test:browser": {
            "executor": "nx:run-commands",
            "options": {
                "command": "vitest run --project=browser",
                "cwd": "packages/package-name"
            }
        },
        "lint": {
            "executor": "@nx/linter:eslint",
            "outputs": ["{options.outputFile}"],
            "options": {
                "lintFilePatterns": ["packages/package-name/**/*.ts"],
                "fix": false
            }
        },
        "lint:fix": {
            "executor": "@nx/linter:eslint",
            "options": {
                "lintFilePatterns": ["packages/package-name/**/*.ts"],
                "fix": true
            }
        },
        "lint:pkg": {
            "executor": "nx:run-commands",
            "options": {
                "command": "knip",
                "cwd": "packages/package-name"
            }
        }
    }
}
```

## 4. Shared Configurations

### Base TypeScript Config (`tsconfig.base.json`)

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "module": "ES2020",
        "lib": ["ES2020", "DOM", "DOM.Iterable"],
        "moduleResolution": "bundler",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noImplicitReturns": true,
        "noFallthroughCasesInSwitch": true,
        "paths": {
            "@graphty/algorithms": ["packages/algorithms/src/index.ts"],
            "@graphty/layout": ["packages/layout/src/index.ts"],
            "@graphty/graphty-element": ["packages/graphty-element/src/index.ts"],
            "@graphty/graphty": ["packages/graphty/src/index.ts"],
            "gpu-force-layout": ["packages/gpu-force-layout/src/index.ts"]
        }
    }
}
```

### Shared Vite Config (`tools/vite/vite.shared.config.ts`)

```typescript
import { defineConfig } from "vite";
import { resolve } from "path";

export function createViteConfig(options: { packageName: string; entry: string; external?: string[] }) {
    const { packageName, entry, external = [] } = options;

    return defineConfig({
        build: {
            lib: {
                entry: resolve(entry),
                name: packageName,
                formats: ["es", "umd"],
                fileName: (format) => `${packageName}.${format}.js`,
            },
            rollupOptions: {
                external: ["lit", "@babylonjs/core", "@babylonjs/gui", "react", "react-dom", ...external],
                output: {
                    globals: {
                        lit: "Lit",
                        "@babylonjs/core": "BABYLON",
                        "@babylonjs/gui": "BABYLON.GUI",
                        react: "React",
                        "react-dom": "ReactDOM",
                    },
                },
            },
            sourcemap: true,
            target: "es2020",
        },
        server: {
            port: 9000 + Math.floor(Math.random() * 100), // Your port range
            open: true,
        },
    });
}
```

### Shared Vitest Config (`tools/vitest/vitest.shared.config.ts`)

```typescript
import { defineConfig } from "vitest/config";

export function createVitestConfig(options: { projectName: string; setupFiles?: string[] }) {
    return defineConfig({
        test: {
            globals: true,
            environment: "happy-dom",
            setupFiles: options.setupFiles,
            coverage: {
                provider: "v8",
                reporter: ["text", "json", "html"],
                exclude: ["node_modules", "dist", "**/*.d.ts", "**/*.config.*", "**/mockData", "**/__tests__"],
                thresholds: {
                    lines: 80,
                    functions: 80,
                    branches: 75,
                    statements: 80,
                },
            },
            testTimeout: 30000,
            projects: [
                {
                    name: "default",
                    environment: "happy-dom",
                },
                {
                    name: "browser",
                    browser: {
                        enabled: true,
                        name: "chromium",
                        provider: "playwright",
                        headless: true,
                    },
                },
            ],
        },
    });
}
```

### Shared ESLint Config (`.eslintrc.base.json`)

```json
{
    "extends": ["@eslint/js/configs/recommended"],
    "plugins": ["@stylistic", "simple-import-sort"],
    "rules": {
        "@stylistic/array-bracket-spacing": ["error", "never"],
        "@stylistic/arrow-parens": ["error", "always"],
        "@stylistic/arrow-spacing": "error",
        "@stylistic/block-spacing": "error",
        "@stylistic/brace-style": ["error", "1tbs"],
        "@stylistic/comma-dangle": ["error", "always-multiline"],
        "@stylistic/comma-spacing": "error",
        "@stylistic/computed-property-spacing": ["error", "never"],
        "@stylistic/indent": ["error", 2, { "SwitchCase": 1 }],
        "@stylistic/key-spacing": "error",
        "@stylistic/keyword-spacing": "error",
        "@stylistic/linebreak-style": ["error", "unix"],
        "@stylistic/max-len": ["error", { "code": 120, "ignoreUrls": true }],
        "@stylistic/member-delimiter-style": "error",
        "@stylistic/no-extra-semi": "error",
        "@stylistic/no-multi-spaces": "error",
        "@stylistic/no-multiple-empty-lines": ["error", { "max": 1 }],
        "@stylistic/no-trailing-spaces": "error",
        "@stylistic/object-curly-spacing": ["error", "always"],
        "@stylistic/quotes": ["error", "single"],
        "@stylistic/semi": ["error", "always"],
        "@stylistic/space-before-blocks": "error",
        "@stylistic/space-before-function-paren": [
            "error",
            {
                "anonymous": "always",
                "named": "never",
                "asyncArrow": "always"
            }
        ],
        "@stylistic/space-in-parens": ["error", "never"],
        "@stylistic/space-infix-ops": "error",
        "camelcase": "error",
        "curly": "error",
        "eqeqeq": ["error", "always"],
        "no-console": "warn",
        "no-var": "error",
        "prefer-const": "error",
        "simple-import-sort/imports": "error",
        "simple-import-sort/exports": "error"
    },
    "overrides": [
        {
            "files": ["*.ts", "*.tsx"],
            "extends": ["plugin:@typescript-eslint/recommended"],
            "rules": {
                "@typescript-eslint/no-explicit-any": "error",
                "@typescript-eslint/explicit-function-return-type": [
                    "error",
                    {
                        "allowExpressions": true
                    }
                ]
            }
        },
        {
            "files": ["*.spec.ts", "*.test.ts"],
            "rules": {
                "@typescript-eslint/no-explicit-any": "off",
                "@typescript-eslint/explicit-function-return-type": "off"
            }
        }
    ]
}
```

## 5. Root-Level Configurations

### Commitlint (`commitlint.config.js`)

```javascript
module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            ["algorithms", "layout", "graphty-element", "graphty", "gpu-force-layout", "deps", "release", "ci", "docs"],
        ],
    },
};
```

### Husky Setup

```bash
# Initialize husky
pnpm exec husky init

# Add commit-msg hook
echo "pnpm exec commitlint --edit \$1" > .husky/commit-msg

# Add prepare-commit-msg hook for commitizen
echo "exec < /dev/tty && npx cz --hook || true" > .husky/prepare-commit-msg
```

### GitHub Actions for Nx

```yaml
# .github/workflows/ci.yml
name: CI

on:
    push:
        branches: [main, master]
    pull_request:

jobs:
    test:
        runs-on: ubuntu-latest
        strategy:
            matrix:
                node-version: [18.x, 20.x, 22.x]
        steps:
            - uses: actions/checkout@v4
              with:
                  fetch-depth: 0

            - uses: pnpm/action-setup@v2
              with:
                  version: 8

            - uses: actions/setup-node@v4
              with:
                  node-version: ${{ matrix.node-version }}
                  cache: "pnpm"

            - run: pnpm install --frozen-lockfile

            - run: pnpm exec nx affected -t lint test build --parallel=3

            - name: Coverage
              if: matrix.node-version == '20.x'
              run: pnpm exec nx affected -t test:coverage

            - name: Upload coverage
              if: matrix.node-version == '20.x'
              uses: coverallsapp/github-action@v2
```

## 6. Custom Nx Generator for Graphty Packages

Create a custom generator that matches your patterns:

```bash
# Generate the generator
npx nx g @nx/plugin:generator graphty-lib --project=@nx/workspace
```

Update `tools/generators/graphty-lib/generator.ts`:

```typescript
import { Tree, formatFiles, installPackagesTask, generateFiles, joinPathFragments, names } from "@nx/devkit";
import { libraryGenerator } from "@nx/js";

export async function graphtyLibGenerator(tree: Tree, options: { name: string; directory?: string }) {
    const normalizedName = names(options.name).fileName;
    const projectDirectory = options.directory || `packages/${normalizedName}`;

    // Generate base library with Nx
    await libraryGenerator(tree, {
        name: normalizedName,
        directory: projectDirectory,
        publishable: true,
        importPath: `@graphty/${normalizedName}`,
        unitTestRunner: "vitest",
        bundler: "vite",
        compiler: "tsc",
        strict: true,
        skipFormat: true,
    });

    // Generate custom files
    generateFiles(tree, joinPathFragments(__dirname, "files"), projectDirectory, {
        ...options,
        name: normalizedName,
        className: names(options.name).className,
    });

    await formatFiles(tree);
    return () => {
        installPackagesTask(tree);
    };
}
```

Template files in `tools/generators/graphty-lib/files/`:

```typescript
// __name__.config.ts__
import { createViteConfig } from '../../tools/vite/vite.shared.config';

export default createViteConfig({
  packageName: '<%= name %>',
  entry: './src/index.ts'
});

// vitest.config.ts__
import { createVitestConfig } from '../../tools/vitest/vitest.shared.config';

export default createVitestConfig({
  projectName: '<%= name %>'
});

// .eslintrc.json__
{
  "extends": ["../../.eslintrc.base.json"],
  "ignorePatterns": ["!**/*"],
  "overrides": [
    {
      "files": ["*.ts"],
      "parserOptions": {
        "project": ["packages/<%= name %>/tsconfig.*?.json"]
      }
    }
  ]
}
```

## 7. Using the Setup

### Create a new package with all your defaults:

```bash
# Using custom generator
npx nx g graphty-lib my-new-algorithm

# Or using standard generator with your defaults
npx nx g @nx/js:lib my-new-algorithm \
  --directory=packages/my-new-algorithm \
  --publishable \
  --importPath=@graphty/my-new-algorithm
```

### Run commands across affected packages:

```bash
# Test only affected packages
npx nx affected -t test

# Build all packages
npx nx run-many -t build

# Run specific target
npx nx run algorithms:test:coverage
```

## Summary

This configuration:

- ✅ Preserves all your existing tooling (husky, commitlint, vitest, etc.)
- ✅ Maintains your strict linting and testing standards
- ✅ Uses your preferred port range (9000-9099)
- ✅ Keeps independent versioning with conventional commits
- ✅ Adds Nx benefits (caching, affected commands, dependency graph)
- ✅ Provides consistency through shared configurations
- ✅ Enables easy package creation with your standards

The key is that Nx wraps around your existing tools rather than replacing them, giving you the monorepo benefits while keeping your established workflows.
