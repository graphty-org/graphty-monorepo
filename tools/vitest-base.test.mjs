// Every Vitest config in the repository imports vitest.base.mjs, the one home of the machine and CI
// rules (the FC_FONTATIONS preset Chromium needs, the test slot, the core share, the CI reporters), so a
// config cannot copy some of them by hand and miss the rest, as the story-test configs did (#3787).
//
//   node --test tools/vitest-base.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { trackedFiles } from "./tracked-files.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE = join(ROOT, "vitest.base.mjs");

// Every tracked vitest*.config.* (an untracked scratch config is no one else's problem).
const configs = trackedFiles(/(^|\/)vitest[^/]*\.config\.[cm]?[jt]s$/);

describe("vitest.base.mjs", () => {
    it("finds the configs", () => {
        assert.ok(configs.includes("graph-io/vitest.storybook.config.ts"), configs.join("\n"));
    });

    for (const file of configs) {
        it(`${file} imports it`, () => {
            const text = readFileSync(join(ROOT, file), "utf8");
            const specs = [...text.matchAll(/^import (?:[^"']* from )?["']([^"']+)["'];?$/gm)].map((m) => m[1]);
            assert.ok(
                specs.some((s) => resolve(ROOT, dirname(file), s) === BASE),
                `${file} must import vitest.base.mjs and spread baseTest() into its test block`,
            );
        });
    }

    it("presets FC_FONTATIONS and gives every run the test slot and the CI reporters", async () => {
        delete process.env.FC_FONTATIONS;
        process.env.CI = "1";
        const { baseTest } = await import(pathToFileURL(BASE).href);
        assert.equal(process.env.FC_FONTATIONS, "1");
        const test = baseTest({ reporters: ["verbose"], globalSetup: ["own.mjs"] });
        assert.deepEqual(test.globalSetup, [
            join(ROOT, "tools/test-slots.mjs"),
            join(ROOT, "tools/vitest-deps-reload.mjs"),
            join(ROOT, "tools/vitest-file-guard.mjs"),
            "own.mjs",
        ]);
        assert.equal(test.reporters[0], "verbose");
        assert.ok(test.reporters.some((r) => Array.isArray(r) && r[0] === "junit"));
    });
});
