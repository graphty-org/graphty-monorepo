import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        projects: [
            // Default project - runs in JSDOM
            {
                test: {
                    name: "default",
                    globals: true,
                    environment: "jsdom",
                    setupFiles: ["./tests/setup.ts"],
                    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
                    exclude: [
                        // Browser tests run in separate project
                        "tests/**/*.browser.test.{ts,tsx}",
                        // Standard excludes
                        "**/node_modules/**",
                        "**/dist/**",
                    ],
                },
            },
            // Browser project - runs in real Chromium via Playwright
            {
                test: {
                    name: "browser",
                    globals: true,
                    setupFiles: ["./tests/setup.browser.ts"],
                    include: ["tests/**/*.browser.test.{ts,tsx}"],
                    exclude: [
                        "**/node_modules/**",
                        "**/dist/**",
                    ],
                    browser: {
                        enabled: true,
                        headless: true,
                        provider: "playwright",
                        instances: [{ browser: "chromium" }],
                        // Disable file parallelism to prevent race conditions
                        fileParallelism: false,
                    },
                },
            },
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["**/*.stories.tsx", "**/*.stories.ts", "**/*.test.ts", "**/*.test.tsx"],
            thresholds: {
                lines: 80,
                functions: 80,
                statements: 80,
                branches: 75,
            },
        },
    },
});
