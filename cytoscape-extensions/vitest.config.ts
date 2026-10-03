import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Standalone rather than vitest.shared.config.ts, like graph-format: the shared factory runs happy-dom, and
// headless Cytoscape needs no DOM. @graphty/* resolve through their dist/, so build them first (nx does).
export default defineConfig({
    resolve: {
        alias: {
            // the package's `imports` field maps "#gpu-platform" to dist/; the tests run the source
            "#gpu-platform": fileURLToPath(new URL("src/gpu-platform-node.ts", import.meta.url)),
            // CYTOSCAPE_DIR runs the suite against another Cytoscape 3.x (CI tests the oldest and newest the peer
            // range admits); the type check in test/consumer-types.test.ts follows it too
            ...(process.env.CYTOSCAPE_DIR ? { cytoscape: process.env.CYTOSCAPE_DIR } : {}),
        },
    },
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
