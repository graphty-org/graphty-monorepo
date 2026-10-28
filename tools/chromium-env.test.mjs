// Every workflow (and visual-review workflow template) that launches Chromium sets FC_FONTATIONS=1
// for the whole workflow. Without it chrome-headless-shell 1200 can die at launch with SIGSEGV in
// getenv, at some environment sizes only (vitest.base.mjs has the analysis; issue #3787).
//
//   node --test tools/chromium-env.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const ROOT = new URL("..", import.meta.url).pathname;
const DIRS = [".github/workflows", "visual-review/templates"];

// What marks a workflow that launches a browser: installing Playwright's browsers, running a test
// shard (run-tests.sh, test-quarantine.mjs) or running a visual-review capture.
const LAUNCHES =
    /playwright install|playwright-system-deps|tools\/run-tests\.sh|test-quarantine\.mjs|\bcapture --project\b/;

const files = DIRS.flatMap((dir) =>
    readdirSync(join(ROOT, dir))
        .filter((f) => f.endsWith(".yml"))
        .map((f) => join(dir, f)),
);

/**
 * The workflow-level `env:` block of a workflow.
 * @param text - the workflow file
 * @returns the block's text (before `jobs:`), or "" when there is none
 */
function workflowEnv(text) {
    const head = text.split(/^jobs:$/m)[0];
    const m = /^env:\n((?:[ \t]+.*\n|\n)*)/m.exec(head);
    return m ? m[1] : "";
}

describe("Chromium launch environment", () => {
    const launching = files.filter((f) => LAUNCHES.test(readFileSync(join(ROOT, f), "utf8")));

    it("finds the workflows that launch Chromium", () => {
        for (const f of [
            ".github/workflows/ci.yml",
            ".github/workflows/release.yml",
            "visual-review/templates/visual-seed.yml",
        ]) {
            assert.ok(launching.includes(f), `${f} should be detected as launching Chromium`);
        }
    });

    for (const f of launching) {
        it(`${f} presets FC_FONTATIONS for every job`, () => {
            assert.match(workflowEnv(readFileSync(join(ROOT, f), "utf8")), /^\s+FC_FONTATIONS: "1"$/m);
        });
    }
});
