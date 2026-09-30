import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

/** Runs the deliberately broken suites that `test/unit/golden-helper.test.ts` expects to fail. */
export default defineConfig({
    test: { root: dirname(fileURLToPath(import.meta.url)), include: ["*.test.ts"] },
});
