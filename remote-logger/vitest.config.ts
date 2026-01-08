import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        globals: true,
        testTimeout: 30000,
        hookTimeout: 30000,
        reporters: ["verbose"],
        coverage: {
            all: true,
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            reportsDirectory: "coverage",
            include: ["src/**/*.ts"],
            exclude: [
                "**/*.d.ts",
                "**/*.test.ts",
                "**/*.spec.ts",
                "**/index.ts",
            ],
            ignoreEmptyLines: true,
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
        projects: [
            // Project 1: default - Node.js environment for server/client/cli tests
            {
                test: {
                    name: "default",
                    environment: "node",
                    include: [
                        "test/server/**/*.test.ts",
                        "test/client/**/*.test.ts",
                        "test/cli/**/*.test.ts",
                        "test/integration/**/*.test.ts",
                        "test/mcp/**/*.test.ts",
                        "test/vite/**/*.test.ts",
                    ],
                    exclude: ["**/node_modules/**", "**/dist/**"],
                    // Run sequentially to avoid port conflicts in server tests
                    pool: "forks",
                    poolOptions: {
                        forks: {
                            singleFork: true,
                        },
                    },
                },
            },
            // Project 2: ui-unit - happy-dom environment for UI unit tests
            {
                test: {
                    name: "ui-unit",
                    environment: "happy-dom",
                    include: ["test/ui/**/*.test.ts"],
                    exclude: [
                        "**/node_modules/**",
                        "**/dist/**",
                        "**/*.browser.test.ts",
                    ],
                },
            },
            // Project 3: browser - Playwright browser tests for actual DOM manipulation
            {
                test: {
                    name: "browser",
                    include: ["test/ui/**/*.browser.test.ts"],
                    exclude: ["**/node_modules/**", "**/dist/**"],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        fileParallelism: false,
                    },
                },
            },
        ],
    },
});
