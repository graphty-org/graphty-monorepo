/**
 * Knip configuration for graphty monorepo
 *
 * Knip finds unused files, dependencies, and exports across the codebase.
 * Run with: pnpm run lint:knip
 *
 * @see https://knip.dev/overview/configuration
 */

import type { KnipConfig } from "knip";

// `lint:knip:prod` runs knip with --production. Some settings are needed only by that run and
// are hinted as redundant by the default one (`lint:knip`), and configuration hints fail the
// gate (`treatConfigHintsAsErrors` below), so they are added only when `--production` is set.
const production = process.argv.includes("--production");

const config: KnipConfig = {
    workspaces: {
        // Root workspace - shared configs and docs
        ".": {
            entry: ["vite.shared.config.ts", "vitest.shared.config.ts", "docs/.vitepress/config.ts", "tools/*.mjs"],
            project: ["*.ts", "*.js", "tools/**/*.{ts,js,cjs,sh}"],
            ignore: ["**/dist/**", "**/coverage/**", "**/node_modules/**"],
            ignoreDependencies: [
                // Nx plugins are used dynamically
                "@nx/react",
                "@nx/js",
                // Documentation tools
                "typedoc-plugin-markdown",
                "typedoc-vitepress-theme",
                // Coverage merging (used in tools/merge-coverage.sh via pnpm exec)
                "lcov-result-merger",
                // Secret scan (used in tools/scan-secrets.sh via pnpm exec; the preset is named
                // only in .secretlintrc.json)
                "secretlint",
                "@secretlint/secretlint-rule-preset-recommend",
                // Semantic release plugins (used by nx release and child packages)
                "@semantic-release/changelog",
                "@semantic-release/git",
            ],
        },

        // graph-format package (design/graph-format/graph-format-design.md section 13.3)
        "graph-format": {
            entry: [
                "graph-format.ts!",
                "src/index.ts!",
                "test/**/*.test.ts",
                "test/types/**/*.test-d.ts",
                "scripts/**/*.{ts,js}",
            ],
            project: ["src/**/*.ts!", "test/**/*.ts", "benchmarks/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // graph-io package (src/index.ts re-exports every per-format subpath barrel)
        "graph-io": {
            entry: ["src/index.ts!", "test/**/*.test.ts", "test/types/**/*.test-d.ts", "scripts/**/*.{ts,js}"],
            project: ["src/**/*.ts!", "test/**/*.ts", "benchmarks/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // graph-samples package: the root, generators and every dataset subpath are entries
        "graph-samples": {
            // "!" marks what ships: the only patterns knip reads in --production (lint:knip:prod)
            entry: [
                "src/index.ts!",
                "src/generators/index.ts!",
                "src/datasets/*/index.ts!",
                "test/**/*.test.ts",
                "scripts/**/*.{ts,js,mjs}",
            ],
            project: ["src/**/*.ts!", "test/**/*.ts", "scripts/**/*.{ts,js,mjs}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // webgpu-graph-algorithms package: the root barrel re-exports neither subpath, so both are entries; the test
        // setup files and the layout driver are standalone entries. @vitest/browser and
        // playwright are resolved by knip's vitest plugin from vitest.config.ts. `webgpu` is an optional peer AND an
        // exact devDependency, imported inside `await import("webgpu")` in src/node/index.ts (design 2.5); knip 5.77
        // reports referenced optional peers, so it is ignored by name.
        "webgpu-graph-algorithms": {
            entry: [
                "src/index.ts!",
                "src/browser/index.ts!",
                "src/node/index.ts!",
                "test/**/*.test.ts",
                "test/types/**/*.test-d.ts",
                "test/setup/*.ts",
                "benchmarks/layout-run.ts",
                "scripts/**/*.{ts,js}",
            ],
            project: ["src/**/*.ts!", "test/**/*.ts", "benchmarks/**/*.ts", "scripts/**/*.{ts,js}"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: ["@graphty/algorithms", "@graphty/layout", "webgpu"],
        },

        // Algorithms package
        algorithms: {
            entry: [
                "algorithms.ts!",
                "src/index.ts!",
                "test/**/*.test.ts",
                "test/types/**/*.test-d.ts",
                "examples/**/*.ts",
                "scripts/**/*.{ts,js}",
            ],
            project: ["src/**/*.ts!", "test/**/*.ts", "examples/**/*.ts", "scripts/**/*.{ts,js}"],
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
            entry: ["src/index.ts!", "test/**/*.test.ts", "scripts/**/*.{ts,js}"],
            project: ["src/**/*.ts!", "test/**/*.ts", "scripts/**/*.{ts,js}"],
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
                // The published entry points. Each has a subpath in package.json's exports map,
                // so each is a door a consumer comes through and nothing reachable from one is
                // dead. A default run derives them from the exports map (and hints a repeat as
                // redundant); a --production run does not, so they are listed for it alone.
                ...(production
                    ? [
                          "index.ts!",
                          "ai.ts!",
                          "catalog.ts!",
                          "commands.ts!",
                          "extend.ts!",
                          "format.ts!",
                          "logging.ts!",
                          "react.ts!",
                          "schema.ts!",
                          "session.ts!",
                          "webgpu.ts!",
                          "src/graphty-element.ts!",
                      ]
                    : []),
                "test/**/*.test.ts",
                "test/**/*.ts",
                "stories/**/*.stories.ts",
                "scripts/**/*.{ts,js}",
                ".storybook/*.js",
            ],
            project: [
                "*.ts!",
                "src/**/*.ts!",
                "test/**/*.ts",
                "stories/**/*.ts",
                "scripts/**/*.{ts,js}",
                "benchmarks/**/*.ts",
            ],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Peer dependencies (provided by consumer)
                "@mlc-ai/web-llm",
                "@graphty/webgpu-graph-algorithms",
                // The AI SDK and its key store, same shape as `webgpu` over in
                // webgpu-graph-algorithms: each is an OPTIONAL peer and an exact devDependency,
                // imported from src so the element works without it and lights up with it. knip
                // 5.77 reports every referenced optional peer, so they are ignored by name --
                // without this the gate fails on five findings that are the package doing exactly
                // what an optional peer is for.
                "@ai-sdk/anthropic",
                "@ai-sdk/google",
                "@ai-sdk/openai",
                "ai",
                "encrypt-storage",
                // Copied into dist by vite.config.ts (`bundledDependencies`, and ngraph.random because
                // nothing externalises it), so each is a devDependency that production source imports.
                // Only `lint:knip:prod` would report them, as unlisted.
                ...(production ? ["lodash", "ngraph.random", "@graphty/remote-logger"] : []),
                // Storybook addons
                "@storybook/addon-console",
                "@storybook/test",
                // Testing utilities
                "chai", // Provided by vitest
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
                "src/main.tsx!",
                "src/App.tsx!",
                "src/stubs/web-llm-stub.ts",
                "src/**/*.test.{ts,tsx}",
                "src/stories/**/*.stories.tsx",
            ],
            project: ["src/**/*.{ts,tsx}!"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
            ignoreDependencies: [
                // Loaded only under import.meta.env.DEV (src/main.tsx) and declared in the root
                // package.json; `lint:knip:prod` runs --strict, which reads only this workspace's own
                // dependencies, and would otherwise report it as unlisted.
                ...(production ? ["eruda"] : []),
            ],
        },

        // remote-logger package
        "remote-logger": {
            entry: ["src/bundle/browser-entry.ts!", "bin/**/*.js!", "test/**/*.test.ts"],
            project: ["src/**/*.ts!", "test/**/*.ts", "bin/**/*.js!"],
            ignore: ["dist/**", "coverage/**", "node_modules/**"],
        },

        // visual-review tool (plain .mjs, no build)
        "visual-review": {
            entry: ["test/**/*.test.mjs"],
            project: ["trusted/**/*.mjs!", "capture/**/*.mjs!", "test/**/*.mjs"],
            ignore: ["coverage/**", "node_modules/**"],
        },

        // compact-mantine package
        "compact-mantine": {
            // The theme's component extensions and its stylesheet modules are loaded with
            // import.meta.glob (src/theme/components/index.ts, src/theme/global-styles.ts), which
            // knip cannot follow, so they are entries of their own.
            entry: [
                "src/theme/components/*.ts!",
                "src/theme/css/*.css.ts!",
                "tests/**/*.test.{ts,tsx}",
                "stories/**/*.stories.tsx",
            ],
            project: ["src/**/*.{ts,tsx}!", "tests/**/*.{ts,tsx}", "stories/**/*.tsx"],
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

    // `StatusBarAccelerationMode`, in the app's status-bar model, is referenced only by the
    // `acceleration?: StatusBarAccelerationMode` member of `StatusBarIssuesModel` declared beside it in
    // the same file, which is why knip reports it unused. It exists to NAME a published signature: drop
    // the export and that member has a type no caller can write down. The per-symbol mechanism above is
    // `@public` at the declaration, and this entry is a stand-in for it -- delete this entry when the tag
    // lands. Until then the ignore covers that one file and unused TYPES alone, so a dead value export in
    // it is still reported.
    ignoreIssues: {
        "graphty/src/components/shell/statusbar/statusBarModel.ts": ["types"],
    },

    // `@internal` marks an export that exists ONLY because TypeScript's declaration emit requires
    // every named type in a published signature to be exported -- the parameter and return types
    // of `createPluginRegistry`, say. It is the opposite of `@public`: a symbol nobody outside its
    // own module may use. Tagging one keeps it visible to a reader while taking it out of
    // dead-code detection, and it is per symbol rather than a blanket setting. Knip accepts the
    // key only at the root, so it applies to every workspace; the "unused tag" hints it prints are
    // exports already tagged `@internal` that something does import, which is worth knowing.
    // Expect such hints from graph-format and webgpu-graph-algorithms `src/`: both builds set
    // `stripInternal`, so there the tag also keeps a symbol that other modules import out of the
    // published .d.ts files, and removing it would publish it. Tag hints never fail the gate;
    // configuration hints do (below).
    tags: ["-internal"],

    // A configuration hint means knip.config.ts has gone stale (an ignore that matches nothing,
    // an entry knip already derives). Fail the run on one, so they cannot pile up unread.
    treatConfigHintsAsErrors: true,

    // Global ignore patterns. These filter what knip REPORTS; what it crawls follows .gitignore
    // (see tools/run-knip.sh for why that holds in a worktree too).
    ignore: [
        "**/dist/**",
        "**/coverage/**",
        "**/node_modules/**",
        "**/.nx/**",
        "**/docs/**",
        "**/tmp/**",
        "**/.tmp/**",
    ],

    // Ignore unlisted binaries that are shell built-ins or CI tools
    ignoreBinaries: [
        "wait", // Shell built-in used in npm scripts
        // coverage:preview scripts run `npx serve` with a ${PORT:?...} guard, which knip no longer
        // recognises as an npx invocation.
        "serve",
    ],
};

export default config;
