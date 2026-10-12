import { defineConfig } from "vitest/config";

// Node only: the unit tests cover src/core, which imports no Babylon and no DOM. Scene and
// technique code is checked by the dry run (dryrun/run.mjs) on an emulated headset instead.
export default defineConfig({
    test: {
        // The machine-wide limit on concurrent test runs (tools/test-slots.mjs; off on GitHub Actions).
        globalSetup: ["../tools/test-slots.mjs"],
        environment: "node",
        include: ["test/**/*.test.ts"],
    },
});
