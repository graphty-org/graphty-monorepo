// The run graphty/test/file-guard.test.ts starts: one browser test that blocks its page.
import process from "node:process";
import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

process.env.FC_FONTATIONS ??= "1"; // Chromium crashes at launch without it: see vitest.base.mjs

export default defineConfig({
    root: fileURLToPath(new URL(".", import.meta.url)),
    test: {
        include: ["blocked.fixture.ts"],
        globalSetup: ["./short-guard.mjs"],
        browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
        },
    },
});
