// Tests of tools/visual-flaky-report.mjs on a capture from cut #3321, whose light mode of
// workspace-style-panel-review--football-conference passed as a flake.
//
//   node --test tools/visual-flaky-report.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { flakyItems } from "./visual-flaky-report.mjs";

const FIXTURES = new URL("./fixtures/visual-flaky", import.meta.url).pathname;
const SCRIPT = new URL("./visual-flaky-report.mjs", import.meta.url).pathname;
const run = (env) =>
    spawnSync(process.execPath, [SCRIPT, FIXTURES], { encoding: "utf8", env: { ...process.env, ...env } });

describe("visual-flaky-report", () => {
    it("lists the flaky items of the newest attempt only", () => {
        assert.deepEqual(flakyItems([FIXTURES]), [
            {
                project: "graphty",
                id: "workspace-style-panel-review--football-conference",
                mode: "light",
                file: "workspace-style-panel-review--football-conference.light.png",
                status: "unchanged",
            },
        ]);
    });

    it("reads one results.json by its path, every attempt's file when named", () => {
        assert.equal(flakyItems([`${FIXTURES}/visual-graphty-1/results.json`]).length, 2);
    });

    it("annotates under GitHub Actions and always exits 0", () => {
        const ci = run({ GITHUB_ACTIONS: "true" });
        assert.equal(ci.status, 0);
        assert.match(
            ci.stdout,
            /::warning title=Flaky screenshot::graphty: workspace-style-panel-review--football-conference\.light\.png/,
        );
        const local = run({ GITHUB_ACTIONS: "" });
        assert.doesNotMatch(local.stdout, /::warning/);
        assert.match(local.stdout, /1 flaky screenshot/);
        const missing = spawnSync(process.execPath, [SCRIPT, "/nonexistent"], { encoding: "utf8" });
        assert.equal(missing.status, 0);
    });
});
