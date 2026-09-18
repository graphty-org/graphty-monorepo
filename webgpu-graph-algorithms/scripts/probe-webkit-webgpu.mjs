/**
 * Does this Playwright's WebKit expose WebGPU? The host lane (hosts.yml) runs it before the WebKit browser smoke
 * and skips the smoke when `navigator.gpu` is absent: Playwright 1.57's WebKit (26.0, build 2227) has no WebGPU on
 * macos-latest, Playwright 1.63's (26.6, build 2359) does -- measured 2026-09-17 / 2026-09-16 -- and a smoke run under
 * GRAPHTY_GPU_REQUIRE=any on the former fails every GPU test (32 of 38) with E_NO_ADAPTER instead of testing
 * anything. Prints the user agent and the verdict; writes `webgpu=true|false` to $GITHUB_OUTPUT when set; exits 0
 * either way (a probe, not a gate -- the smoke that follows is the gate).
 *
 *   pnpm exec playwright install webkit && node scripts/probe-webkit-webgpu.mjs
 */
import { appendFileSync } from "node:fs";

import { webkit } from "playwright";

const browser = await webkit.launch();
try {
    const page = await browser.newPage();
    // navigator.gpu is [SecureContext] in WebKit and Chromium and the initial about:blank page is an opaque origin
    // (not a secure context): probe on a localhost page, the potentially-trustworthy origin vitest serves tests from
    await page.route("http://localhost/probe", (route) =>
        route.fulfill({ contentType: "text/html", body: "<!doctype html><title>probe</title>" }),
    );
    await page.goto("http://localhost/probe");
    const facts = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        // WebKit declares the attribute nullable (GPU? gpu): null means no GPU for this page, which is absence too
        webgpu: navigator.gpu !== undefined && navigator.gpu !== null,
    }));
    console.log(`[probe-webkit] ${facts.userAgent}`);
    const verdict = facts.webgpu ? "present: the WebKit smoke runs" : "absent: the WebKit smoke is skipped";
    console.log(`[probe-webkit] navigator.gpu ${verdict}`);
    if (process.env.GITHUB_OUTPUT) {
        appendFileSync(process.env.GITHUB_OUTPUT, `webgpu=${facts.webgpu}\n`);
    }
} finally {
    await browser.close();
}
