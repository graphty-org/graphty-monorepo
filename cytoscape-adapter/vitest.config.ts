import { defineConfig } from "vitest/config";

// Standalone rather than vitest.shared.config.ts, like graph-format: the shared factory runs happy-dom, and
// headless Cytoscape needs no DOM. @graphty/* resolve through their dist/, so build them first (nx does).
export default defineConfig({
    test: {
        globals: true,
        environment: "node",
        include: ["test/**/*.test.ts"],
        reporters: process.env.CI ? ["default"] : ["verbose"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            reportsDirectory: "coverage",
            include: ["src/**/*.ts"],
            exclude: ["**/*.d.ts", "**/index.ts"],
            thresholds: {
                lines: 80,
                functions: 80,
                branches: 75,
                statements: 80,
            },
        },
    },
});
