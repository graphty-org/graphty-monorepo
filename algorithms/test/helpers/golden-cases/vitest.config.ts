// Only the environment presets: baseTest()'s CI reporters would file these deliberate failures as real ones.
import "../../../../vitest.base.mjs";

import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { withTestGuards } from "../../../../tools/test-wait-guard.mjs";

/**
 * Runs the deliberately broken suites that `test/unit/golden-helper.test.ts` expects to fail. That test
 * waits on this run with spawnSync, which its own guard cannot interrupt, so this run carries the guard.
 */
export default withTestGuards(
    defineConfig({
        test: { root: dirname(fileURLToPath(import.meta.url)), include: ["*.test.ts"] },
    }),
);
