/**
 * Knip configuration for graphty monorepo
 *
 * Knip finds unused files, dependencies, and exports across the codebase.
 * Run with: pnpm run lint:knip
 *
 * @see https://knip.dev/overview/configuration
 */

import type { KnipConfig } from "knip";

const config: KnipConfig = {
    workspaces: {
        // Root workspace - shared configs and docs
        ".": {
            entry: ["vite.shared.config.ts", "vitest.shared.config.ts", "docs/.vitepress/config.ts"],
            project: ["*.ts", "*.js", "tools/**/*.{ts,js,cjs,sh}"],
            ignore: ["**/dist/**", "**/coverage/**", "**/node_modules/**"],
            ignoreDependencies: [
                // Nx plugins are used dynamically
                "@nx/web",
                "@nx/react",
                "@nx/js",
                // Documentation tools
                "typedoc-plugin-markdown",
                "typedoc-vitepress-theme",
                // Coverage merging (used in tools/merge-coverage.sh via pnpm exec)
                "lcov-result-merger",
                // Semantic release plugins (used by nx release and child packages)
                "@semantic-release/changelog",
                "@semantic-release/git",
            ],
        },

        // graph-format package (design/graph-format/graph-format-design.md section 13.3)
        "graph-format": {
            entry: ["src/index.ts", "test/**/*.test.ts", "test/types/**/*.test-d.ts", "scripts/**/*.{ts,js}"],
            project: ["src/**/*.ts", "test/**/*.ts", "benchmarks/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // graph-io package (src/index.ts re-exports every per-format subpath barrel)
        "graph-io": {
            entry: ["src/index.ts", "test/**/*.test.ts", "test/types/**/*.test-d.ts", "scripts/**/*.{ts,js}"],
            project: ["src/**/*.ts", "test/**/*.ts", "benchmarks/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // webgpu-graph-algorithms package: the root barrel re-exports neither subpath, so both are entries; the test
        // setup files and the layout driver are standalone entries. @vitest/browser and
        // playwright are resolved by knip's vitest plugin from vitest.config.ts. `webgpu` is an optional peer AND an
        // exact devDependency, imported inside `await import("webgpu")` in src/node/index.ts (design 2.5); knip 5.77
        // reports referenced optional peers, so it is ignored by name.
        "webgpu-graph-algorithms": {
            entry: [
                "src/index.ts",
                "src/browser/index.ts",
                "src/node/index.ts",
                "test/**/*.test.ts",
                "test/types/**/*.test-d.ts",
                "test/setup/*.ts",
                "benchmarks/layout-run.ts",
                "scripts/**/*.{ts,js}",
            ],
            project: ["src/**/*.ts", "test/**/*.ts", "benchmarks/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: ["@graphty/layout", "webgpu"],
        },

        // Algorithms package
        algorithms: {
            entry: ["src/index.ts", "test/**/*.test.ts", "examples/**/*.ts", "scripts/**/*.{ts,js}"],
            project: ["src/**/*.ts", "test/**/*.ts", "examples/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Storybook implicit dependencies
                "@storybook/html",
                // Build/dev tools
                "gh-pages",
                "chromatic",
                // Benchmark tooling
                "benchmark",
                "@types/benchmark",
                // Playwright for browser tests
                "playwright",
                // ESLint plugins (used via root config)
                "@eslint/js",
                "eslint-plugin-simple-import-sort",
                "globals",
                "typescript-eslint",
                // Legacy tooling
                "ts-node",
                // Conventional changelog for commitlint
                "conventional-changelog-conventionalcommits",
            ],
        },

        // Layout package
        layout: {
            entry: ["src/index.ts", "test/**/*.test.ts", "scripts/**/*.{ts,js}"],
            project: ["src/**/*.ts", "test/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                "@storybook/html",
                "chromatic",
                // Three.js for 3D examples/demos
                "three",
                "@types/three",
                // Conventional changelog for commitlint
                "conventional-changelog-conventionalcommits",
            ],
        },

        // graphty-element package
        "graphty-element": {
            entry: [
                "src/graphty-element.ts",
                "test/**/*.test.ts",
                "test/**/*.ts",
                "stories/**/*.stories.ts",
                "scripts/**/*.{ts,js}",
                ".storybook/*.js",
            ],
            project: ["src/**/*.ts", "test/**/*.ts", "stories/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Peer dependencies (provided by consumer)
                "@mlc-ai/web-llm",
                // Storybook addons
                "@storybook/addon-console",
                "@storybook/test",
                // ngraph transitive dependency
                "ngraph.random",
                // Testing utilities
                "chai", // Provided by vitest
                "iwer", // WebXR emulator for testing
                // Build tools
                "vite-plugin-eslint",
                // Type definitions
                "@types/glob",
                // Conventional changelog for commitlint
                "conventional-changelog-conventionalcommits",
                // ESLint plugins
                "eslint-plugin-jsdoc",
            ],
        },

        // graphty React app
        graphty: {
            entry: [
                "src/main.tsx",
                "src/App.tsx",
                "src/stubs/web-llm-stub.ts",
                "src/**/*.test.{ts,tsx}",
                "src/stories/**/*.stories.tsx",
            ],
            project: ["src/**/*.{ts,tsx}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Testing
                "jsdom",
            ],
        },

        // remote-logger package
        "remote-logger": {
            entry: ["src/bundle/browser-entry.ts", "test/**/*.test.ts"],
            project: ["src/**/*.ts", "test/**/*.ts", "bin/**/*.js"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // compact-mantine package
        "compact-mantine": {
            entry: ["tests/**/*.test.{ts,tsx}", "stories/**/*.stories.tsx"],
            project: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}", "stories/**/*.tsx"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Used in storybook demos
                "@zag-js/floating-panel",
                "@zag-js/react",
            ],
        },
    },

    // `ignoreExportsUsedInFile` is deliberately NOT set here.
    //
    // It would silence a real class of false positive -- a component's `*Props` interface
    // referenced only by the `function X(props: XProps)` below it, and a spec constant
    // quoted from a design document and read by the one drawing in its own module -- but
    // knip accepts the key only at the root, so switching it on applies it to every
    // package at once. That would permanently hide any export that IS dead yet happens to
    // be referenced once inside its own file, in all six workspaces.
    //
    // The narrower mechanism is per symbol: knip skips any export whose JSDoc block
    // carries a `@public` tag (knip 5 honours `@public` with no `tags` entry needed), so a
    // deliberate public surface states that intent at the declaration and everything else
    // stays under dead-code detection. Add `@public` -- with a clause saying why -- rather
    // than reaching for a blanket setting or an ignore pattern.

    // Global ignore patterns
    ignore: ["**/dist/**", "**/coverage/**", "**/node_modules/**", "**/.nx/**", "**/docs/**"],

    // Ignore unlisted binaries that are shell built-ins or CI tools
    ignoreBinaries: [
        "wait", // Shell built-in used in npm scripts
        "http-server", // Used in CI for serving files
    ],
};

export default config;
