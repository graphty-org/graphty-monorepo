import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

import { aliases } from "./vite.aliases";

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
    },
    test: {
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
