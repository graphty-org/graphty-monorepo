import path from "node:path";
import { fileURLToPath } from "node:url";

import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { ciJunitReporter } from "../vitest.ci-junit.mjs";
import { aliases } from "./vite.aliases";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/** The tests that mount the real graphty-element, unmocked. */
const REAL_ELEMENT_TESTS = "src/**/*.real-element.test.tsx";
const BASE_EXCLUDE = ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"];
/**
 * A fresh headless Chromium config per project: vitest writes each instance's name into the
 * object it is handed, so two projects must not share one.
 * @returns the browser config.
 */
const chromium = () => ({
    enabled: true,
    headless: true,
    provider: playwright(),
    instances: [{ browser: "chromium" as const }],
});

export default defineConfig({
    plugins: [react()],
    // The same aliases as the dev server, so tests run graphty-element from source rather
    // than a prebundled copy of its dist that Vite's dependency cache never refreshes.
    resolve: { alias: aliases },
    optimizeDeps: {
        include: ["@mantine/hooks"],
        // Re-scan and re-bundle the dependencies at the start of every run. Vite keeps a cached
        // bundle under node_modules/.vite and trusts it while the lockfile and this config are
        // unchanged -- it does not notice a SOURCE change that imports a dependency the cache
        // lacks (lodash/get.js after the per-function lodash imports). That dependency is then
        // found mid-run, Vite re-bundles and reloads the test page, and the files it was running
        // report "(0 test)" and fail or hang (issue #885). The scan over the test files finds
        // every dependency up front; it costs about 5 seconds a run.
        force: true,
    },
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        reporters: ["default", ...ciJunitReporter()],
        globals: true,
        exclude: BASE_EXCLUDE,
        // The tests that mount the real graphty-element get a project of their own, run after
        // the others finish (sequence.groupOrder). Browser test files share the renderer's main
        // thread, and a real element loading and laying out a sample holds it for seconds at a
        // time: run beside the rest, a neighbouring file's import of the element bundle
        // (src/types/__tests__/ai.test.ts) outran its 15 second test timeout.
        projects: [
            {
                extends: true,
                test: {
                    name: "browser",
                    include: ["src/**/*.test.{ts,tsx}"],
                    exclude: [...BASE_EXCLUDE, REAL_ELEMENT_TESTS],
                    browser: chromium(),
                    setupFiles: "./src/test/setup.ts",
                },
            },
            {
                extends: true,
                test: {
                    name: "real-element",
                    include: [REAL_ELEMENT_TESTS],
                    sequence: { groupOrder: 1 },
                    browser: chromium(),
                    setupFiles: "./src/test/setup.ts",
                    // One file at a time. Every file mounts a real element, and the files share
                    // the renderer's main thread: in parallel, nine files took 158 s and single
                    // tests up to 29 s (past the 15 s test timeout), against 90 s and at most
                    // 4.5 s one after another.
                    fileParallelism: false,
                },
            },
            {
                // Every story's play function, run as a test: a story that shows an interaction
                // drives it, and a play that throws or asserts wrongly fails here rather than
                // only inside the visual capture. Its own shard (tools/ci-test-matrix.mjs).
                extends: true,
                plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
                // Pre-bundled up front, with the rest of the app's dependencies. Storybook's renderer
                // imports react-dom/client only when the first story mounts, so on a cold cache (CI)
                // Vite found it mid-run, re-bundled and reloaded the page, and the re-bundle deleted
                // the Babylon shader chunks running stories were importing: their shaders never
                // compiled and every story waiting on a drawn frame hit the test timeout (as #885).
                optimizeDeps: { include: ["@mantine/hooks", "react-dom/client"] },
                test: {
                    name: "storybook",
                    // The size the visual capture draws every story at (visual-review captures a
                    // 1200 x 900 viewport): the shell lays out differently in a narrow frame, and
                    // the plays are written against the layout the reader and the capture see.
                    browser: { ...chromium(), viewport: { width: 1200, height: 900 } },
                    setupFiles: [".storybook/vitest.setup.ts"],
                    // As graphty-element's storybook project: a story that loads the real element
                    // takes under a second alone, and 7 to 15 seconds while the pre-push gate runs
                    // its other browser shards beside it, which crossed the 15-second default.
                    testTimeout: 30000,
                    // One story file at a time, as graphty-element's storybook project: in parallel
                    // every file mounts a real element at once, and on a machine already busy with
                    // other test runs the stories' own waits ran out.
                    fileParallelism: false,
                },
            },
            {
                // The app's own lint rules. Their tests build a TypeScript program, which needs Node.
                extends: true,
                test: {
                    name: "eslint-rules",
                    environment: "node",
                    include: ["eslint-rules/**/*.test.ts"],
                    // One TypeScript program over the element's published .d.ts files is built per run.
                    testTimeout: 60000,
                },
            },
            {
                // Tests of the app's tooling (its lint rules), which need Node APIs.
                extends: true,
                test: {
                    name: "node",
                    include: ["test/**/*.test.ts"],
                    environment: "node",
                },
            },
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [
                "node_modules/",
                "src/test/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/.eslintrc.*",
                "dist/",
                "**/*.test.ts",
                "**/*.test.tsx",
                "**/*.stories.ts",
                "**/*.stories.tsx",
                "**/demo/**",
                // Entry points and barrel files (not unit-testable)
                "src/main.tsx",
                "**/index.ts",
                // Stubs for external libraries
                "**/stubs/**",
                // Pure type definition files (no runtime code)
                "src/types/error-boundary.ts",
                "src/types/selection.ts",
                "src/types/style-layer.ts",
                // The shell's type-only modules. constants.ts is NOT here: it is
                // covered by shell/__tests__/constants.test.ts.
                "src/components/shell/types.ts",
                // DEVIATION from PLAN item 6, which names only types.ts. This module
                // declares interfaces and nothing else -- `grep -nE
                // "^(export )?(function|const|let|class)"` over it returns no match --
                // so it emits no runtime code to cover, and its own JSDoc says its
                // declarations belong in types.ts once someone folds them in. Until
                // then it is exempted on the same ground as types.ts and no other.
                "src/components/shell/statusbar/statusBarModel.ts",
                // Pure constants (like colors.ts, layout.ts)
                "src/constants/spacing.ts",
            ],
        },
    },
});
