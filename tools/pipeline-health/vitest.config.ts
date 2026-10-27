import { defineConfig } from "vitest/config";

import { baseTest } from "../../vitest.base.mjs";

export default defineConfig({
    test: { ...baseTest(), include: ["test/**/*.test.ts"], setupFiles: ["test/setup.ts"] },
});
