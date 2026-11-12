// This is the shared Vitest configuration for the monorepo
// Package-specific configs should import and extend this

import { defineConfig, type UserConfig } from "vitest/config";

import { withTestGuards } from "./tools/test-wait-guard.mjs";
import { baseTest } from "./vitest.base.mjs";

export interface VitestConfigOptions {
    projectName: string;
    setupFiles?: string[];
}

export function createVitestConfig(options: VitestConfigOptions): UserConfig {
    const config = defineConfig({
        test: {
            ...baseTest(),
            globals: true,
            environment: "happy-dom",
            setupFiles: options.setupFiles,
            coverage: {
                provider: "v8",
                reporter: ["text", "json", "html", "lcov"],
                exclude: ["node_modules", "dist", "**/*.d.ts", "**/*.config.*", "**/mockData", "**/__tests__"],
                thresholds: {
                    lines: 80,
                    functions: 80,
                    branches: 75,
                    statements: 80,
                },
            },
        },
    });
    // One hang guard for every test, hook and wait (tools/test-wait-guard.mjs).
    return withTestGuards(config);
}
