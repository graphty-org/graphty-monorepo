import { defineConfig } from "vitest/config";

import { ciReporters } from "../vitest.ci-junit.mjs";

export default defineConfig({
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        globals: true,
        environment: "happy-dom",
        pool: "forks",
        testTimeout: 30000,
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            include: ["src/**/*.ts"],
            exclude: ["**/*.d.ts", "**/*.test.ts"],
            thresholds: {
                lines: 65,
                functions: 60,
                branches: 85,
                statements: 65,
            },
        },
        include: ["test/**/*.test.ts", "test/**/*.test.js"],
        reporters: ["verbose", ...ciReporters()],
        // test/types/*.test-d.ts are compile-only: tsc checks them as part of every run
        typecheck: {
            enabled: true,
            include: ["test/types/**/*.test-d.ts"],
            tsconfig: "./tsconfig.types.json",
        },
    },
    resolve: {
        alias: {
            "@": "/src",
        },
    },
});
