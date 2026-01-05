# Nx Code Generation Guide

## Overview

Nx provides powerful code generation (codegen) capabilities through:

1. **Generators** - Create projects, libraries, components, etc.
2. **Plugins** - Language/framework-specific generators
3. **Custom Generators** - Your own templates

## Installing Nx in Existing Monorepo

```bash
# Add Nx to your existing monorepo
npx nx@latest init

# Or with package manager
npm install -D nx@latest
```

## Creating New Projects

### 1. Create a TypeScript Library

```bash
# Basic TypeScript library
npx nx generate @nx/js:library my-new-lib

# With specific options
npx nx generate @nx/js:library algorithms-v2 \
  --directory=packages/algorithms-v2 \
  --publishable \
  --importPath=@graphty/algorithms-v2 \
  --unitTestRunner=vitest \
  --bundler=vite
```

### 2. Create a React Library

```bash
# First install React plugin
npm install -D @nx/react

# Generate React library
npx nx generate @nx/react:library ui-components \
  --directory=packages/ui-components \
  --style=css \
  --component \
  --publishable \
  --importPath=@graphty/ui-components
```

### 3. Create a Web Application

```bash
# React app
npx nx generate @nx/react:app my-app \
  --directory=apps/my-app \
  --style=css \
  --bundler=vite \
  --routing

# Next.js app
npm install -D @nx/next
npx nx generate @nx/next:app my-next-app \
  --directory=apps/my-next-app \
  --style=css
```

### 4. Create a Node Library

```bash
# Install Node plugin
npm install -D @nx/node

# Generate Node library
npx nx generate @nx/node:library api-utils \
  --directory=packages/api-utils \
  --publishable
```

## For Graphty Specifically

### Create a New Algorithm Package

```bash
# Generate a publishable TypeScript library
npx nx generate @nx/js:library algorithms-gpu \
  --directory=packages/algorithms-gpu \
  --publishable \
  --importPath=@graphty/algorithms-gpu \
  --unitTestRunner=vitest \
  --bundler=esbuild \
  --minimal
```

This creates:

```
packages/algorithms-gpu/
├── src/
│   ├── index.ts
│   └── lib/
│       └── algorithms-gpu.ts
├── package.json
├── project.json
├── README.md
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
└── vite.config.ts
```

### Create a New Visualization Component

```bash
# Generate with Lit (for web components)
npx nx generate @nx/js:library graph-3d \
  --directory=packages/graph-3d \
  --publishable \
  --importPath=@graphty/graph-3d \
  --bundler=vite
```

## Common Generator Options

### Publishable vs Buildable

```bash
# Publishable - can be published to npm
npx nx g @nx/js:lib my-lib --publishable

# Buildable - can be built independently
npx nx g @nx/js:lib my-lib --buildable

# Neither - just for internal use
npx nx g @nx/js:lib my-lib
```

### Directory Structure

```bash
# Flat structure
npx nx g @nx/js:lib my-lib --directory=packages/my-lib

# Nested structure
npx nx g @nx/js:lib my-lib --directory=packages/utils/my-lib

# With custom import path
npx nx g @nx/js:lib my-lib --importPath=@myorg/custom-name
```

## Component Generation

### Generate Components within Libraries

```bash
# React component
npx nx generate @nx/react:component Button \
  --project=ui-components \
  --directory=src/components/button \
  --export

# Web Component with Lit
npx nx generate @nx/react:component GraphNode \
  --project=graphty-element \
  --directory=src/components
```

### Generate Utilities

```bash
# Generate a new function/utility
npx nx generate @nx/js:library graph-utils \
  --directory=packages/shared/graph-utils
```

## Interactive Mode

Use interactive mode for guided generation:

```bash
# Interactive project creation
npx nx generate

# Then select:
# > @nx/js:library
# > Fill in options interactively
```

## List Available Generators

```bash
# See all available generators
npx nx list

# See generators for specific plugin
npx nx list @nx/js

# See details about a generator
npx nx generate @nx/js:library --help
```

## Custom Generators

### Create Your Own Generator

```bash
# Generate a generator workspace
npx nx generate @nx/plugin:plugin tools

# Generate a generator
npx nx generate @nx/plugin:generator my-generator \
  --project=tools
```

### Example Custom Generator for Graphty

```typescript
// tools/src/generators/algorithm/generator.ts
import { Tree, formatFiles, generateFiles, joinPathFragments } from "@nx/devkit";

export async function algorithmGenerator(tree: Tree, options: { name: string; directory?: string }) {
    const projectRoot = options.directory || `packages/algorithms/src/${options.name}`;

    generateFiles(tree, joinPathFragments(__dirname, "./files"), projectRoot, options);

    await formatFiles(tree);
}
```

Template files:

```typescript
// tools/src/generators/algorithm/files/__name__.ts.template
import { Graph } from '@graphty/types';

export function <%= name %>(graph: Graph): void {
  // Implementation
}

// tools/src/generators/algorithm/files/__name__.spec.ts.template
import { describe, it, expect } from 'vitest';
import { <%= name %> } from './<%= name %>';

describe('<%= name %>', () => {
  it('should work', () => {
    expect(<%= name %>).toBeDefined();
  });
});
```

Use it:

```bash
npx nx generate @myorg/tools:algorithm pagerank-v2
```

## Project Configuration

After generation, each project gets a `project.json`:

```json
{
    "name": "algorithms-gpu",
    "$schema": "../../node_modules/nx/schemas/project-schema.json",
    "sourceRoot": "packages/algorithms-gpu/src",
    "projectType": "library",
    "targets": {
        "build": {
            "executor": "@nx/vite:build",
            "outputs": ["{options.outputPath}"],
            "options": {
                "outputPath": "dist/packages/algorithms-gpu"
            }
        },
        "test": {
            "executor": "@nx/vite:test",
            "outputs": ["{options.reportsDirectory}"],
            "options": {
                "reportsDirectory": "coverage/packages/algorithms-gpu"
            }
        },
        "lint": {
            "executor": "@nx/linter:eslint",
            "outputs": ["{options.outputFile}"],
            "options": {
                "lintFilePatterns": ["packages/algorithms-gpu/**/*.ts"]
            }
        }
    },
    "tags": []
}
```

## Workspace Generators

Create workspace-specific generators:

```bash
# Create workspace generator
npx nx generate @nx/workspace:workspace-generator my-generator
```

This creates `.nx/generators/my-generator/` for templates specific to your repo.

## Migration from Current Structure

For Graphty, you could:

1. **Keep existing packages** as-is
2. **Use generators for new packages**:

    ```bash
    npx nx g @nx/js:lib algorithms-wasm \
      --directory=packages/algorithms-wasm \
      --publishable \
      --importPath=@graphty/algorithms-wasm
    ```

3. **Generate components** in existing packages:
    ```bash
    npx nx g @nx/react:component ForceLayout \
      --project=graphty-element \
      --directory=src/layouts
    ```

## Best Practices

1. **Use `--dry-run`** to preview changes:

    ```bash
    npx nx g @nx/js:lib my-lib --dry-run
    ```

2. **Consistent naming**:

    ```bash
    # Libraries: kebab-case
    npx nx g lib graph-algorithms

    # Components: PascalCase
    npx nx g component GraphViewer
    ```

3. **Organize by feature**:
    ```
    packages/
    ├── algorithms/       # Core algorithms
    ├── visualizations/   # Viz components
    ├── layouts/         # Layout algorithms
    └── shared/          # Shared utilities
    ```

## Summary

Nx generators provide:

- **Consistency**: Same structure for all projects
- **Best practices**: Built-in testing, linting, building
- **Speed**: Generate entire projects in seconds
- **Customization**: Create your own generators

For Graphty, this means you can quickly create new packages that follow the same patterns as your existing ones, with all the tooling pre-configured.
