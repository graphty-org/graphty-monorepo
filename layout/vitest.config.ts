import { defineConfig } from "vitest/config";

import { baseTest } from "../vitest.base.mjs";
import { withTestGuards } from "../tools/test-wait-guard.mjs";

const config = defineConfig({
    test: {
        ...baseTest({ reporters: ["verbose"] }),
        globals: true,
        environment: "happy-dom",
        pool: "forks",
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

// One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
export default withTestGuards(config);
