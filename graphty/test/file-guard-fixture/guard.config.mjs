// The run graphty/test/file-guard.test.ts starts: one browser test that blocks its page, in a bench
// project, since a measurement is held to the same guard as any run (#8032).
import process from "node:process";
import { fileURLToPath } from "node:url";

import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

process.env.FC_FONTATIONS ??= "1"; // Chromium crashes at launch without it: see vitest.base.mjs

export default defineConfig({
    root: fileURLToPath(new URL(".", import.meta.url)),
    test: {
        name: "bench-blocked",
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
