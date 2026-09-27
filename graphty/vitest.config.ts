import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

/** The tests that mount the real graphty-element, unmocked. */
const REAL_ELEMENT_TESTS = "src/**/*.real-element.test.tsx";
const BASE_EXCLUDE = ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"];

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
    optimizeDeps: {
        include: ["@mantine/hooks", "@graphty/graphty-element"],
    },
    test: {
        globals: true,
        browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
        },
        exclude: BASE_EXCLUDE,
        // Two projects, so the tests that mount the real graphty-element get a browser of
        // their own. Every file of one browser project runs in an iframe of the same page, and
        // same-page iframes share one main thread: a real element loading and laying out a
        // sample holds that thread for seconds at a time, and a neighbouring file's module
        // import then outruns its test timeout.
        projects: [
            {
                extends: true,
                test: { name: "app", exclude: [...BASE_EXCLUDE, REAL_ELEMENT_TESTS] },
            },
            {
                extends: true,
                test: { name: "real-element", include: [REAL_ELEMENT_TESTS] },
            },
        ],
        setupFiles: "./src/test/setup.ts",
        coverage: {
            all: true,
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
