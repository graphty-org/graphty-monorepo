// This is the shared Vitest configuration for the monorepo
// Package-specific configs should import and extend this

import { defineConfig } from "vitest/config";
import type { UserConfig } from "vitest/config";

// Every Playwright browser the test projects launch inherits this process's environment. Chromium
// 143 (Playwright's chromium_headless_shell-1200) calls setenv("FC_FONTATIONS", "1") from a font
// worker thread after its other threads are running. When the environment array has to grow for
// that entry, glibc reallocates it and Chrome's allocator frees the old copy; a D-Bus thread that is
// inside strerror -> getenv("LANGUAGE") at that moment (it is, on a machine with no system D-Bus
// socket) reads the freed array and the browser dies at startup with a general protection fault
// (SIGSEGV, ip in getenv). It only happens when the environment has one of the sizes at which the
// array moves (79, 95, 111, 127, ... entries), which is why it came and went between shells:
// 30 crashes in 800 launches on 2026-09-25, 0 in 800 with the value preset. Presetting the
// variable Chrome sets anyway makes its setenv an in-place overwrite, so nothing is freed.
process.env.FC_FONTATIONS ??= "1";

export interface VitestConfigOptions {
    projectName: string;
    setupFiles?: string[];
}

export function createVitestConfig(options: VitestConfigOptions): UserConfig {
    return defineConfig({
        test: {
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
            reporters: ["default"],
            testTimeout: 30000,
        },
    });
}
