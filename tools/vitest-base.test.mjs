// Every Vitest config in the repository imports vitest.base.mjs, the one home of the machine and CI
// rules (the FC_FONTATIONS preset Chromium needs, the test slot, the core share, the CI reporters), so a
// config cannot copy some of them by hand and miss the rest, as the story-test configs did (#3787).
//
//   node --test tools/vitest-base.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BASE = join(ROOT, "vitest.base.mjs");

// Every vitest*.config.* outside dependencies, build output and scratch directories.
const SKIP = new Set(["node_modules", "dist", "tmp", "coverage", "storybook-static"]);
function findConfigs(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        if (d.name.startsWith(".") || SKIP.has(d.name)) return [];
        const path = join(dir, d.name);
        if (d.isDirectory()) return findConfigs(path);
        return /^vitest[^/]*\.config\.[cm]?[jt]s$/.test(d.name) ? [relative(ROOT, path)] : [];
    });
}
const configs = findConfigs(ROOT);

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
        assert.deepEqual(test.globalSetup, [join(ROOT, "tools/test-slots.mjs"), "own.mjs"]);
        assert.equal(test.reporters[0], "verbose");
        assert.ok(test.reporters.some((r) => Array.isArray(r) && r[0] === "junit"));
    });
});
