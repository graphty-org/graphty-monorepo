import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base.mjs";
import { withTestGuards } from "../test-wait-guard.mjs";

export default withTestGuards(
    defineConfig({
        test: { ...baseTest(), include: ["test/**/*.test.ts"], setupFiles: ["test/setup.ts"] },
    }),
);
