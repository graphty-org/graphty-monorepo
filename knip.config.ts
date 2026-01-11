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
                // Zod is used but through workspace dependency
                "zod",
            ],
        },

        // remote-logger package
        "remote-logger": {
            entry: ["test/**/*.test.ts"],
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
                // Browser testing
                "playwright",
            ],
        },
    },

    // Global ignore patterns
    ignore: [
        "**/dist/**",
        "**/coverage/**",
        "**/node_modules/**",
        "**/.nx/**",
        "**/docs/**",
    ],

    // Ignore unlisted binaries that are shell built-ins or CI tools
    ignoreBinaries: [
        "wait", // Shell built-in used in npm scripts
        "http-server", // Used in CI for serving files
    ],
};

export default config;
