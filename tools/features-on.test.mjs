// Tests of the "On" test configuration: the vitest twins (tools/features-on.mjs) and the On shards of
// tools/ci-test-matrix.mjs, planned only in a full run and only while graphty-element declares an experiment.
//
//   node --test tools/features-on.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";

import { parse as parseYaml } from "yaml";

import { FEATURES_ON_SHARDS, parseOnly, plan, SHARDS } from "./ci-test-matrix.mjs";
import { FEATURES_DECLARED, withFeaturesOn } from "./features-on.mjs";
import { candidateShards } from "./test-changed.mjs";
import { storyUrl } from "../visual-review/capture/capture.mjs";

const SETUP = "./test/setup-features-on.ts";

describe("withFeaturesOn", () => {
    const projects = [
        { test: { name: "default", setupFiles: ["./test/setup.ts"] } },
        {
            test: {
                name: "browser",
                setupFiles: "./a.ts",
                browser: { enabled: true, instances: [{ browser: "chromium" }] },
            },
        },
        { test: { name: "bench" } },
    ];

    it("changes nothing while no experiment is declared", () => {
        assert.equal(withFeaturesOn(projects, ["default", "browser"], SETUP, false), projects);
    });

    it("appends a renamed twin of each named project, with the On setup file last", () => {
        const all = withFeaturesOn(projects, ["default", "browser"], SETUP, true);
        assert.deepEqual(
            all.map((p) => p.test.name),
            ["default", "browser", "bench", "default-features-on", "browser-features-on"],
        );
        assert.deepEqual(all[3].test.setupFiles, ["./test/setup.ts", SETUP]);
        assert.deepEqual(all[4].test.setupFiles, ["./a.ts", SETUP]);
        assert.deepEqual(projects[0].test.setupFiles, ["./test/setup.ts"], "the Off project is untouched");
    });

    it("gives a twin its own browser instances, which vitest writes into", () => {
        const twin = withFeaturesOn(projects, ["browser"], SETUP, true)[3];
        assert.notEqual(twin.test.browser, projects[1].test.browser);
        assert.notEqual(twin.test.browser.instances[0], projects[1].test.browser.instances[0]);
        assert.deepEqual(twin.test.browser.instances, projects[1].test.browser.instances);
    });
});

describe("the On shards", () => {
    const PACKAGES = ["graphty-element", "graphty"];
    const shards = [...SHARDS.filter((s) => !s["full-run-only"]), ...FEATURES_ON_SHARDS];
    const names = (include) => include.map((e) => e.shard).filter((n) => n.includes("features-on"));

    it("exist only while graphty-element declares an experiment", () => {
        assert.equal(
            SHARDS.some((s) => s["full-run-only"]),
            FEATURES_DECLARED,
        );
    });

    it("are planned in a full run and never on a pull request", () => {
        assert.deepEqual(names(plan(PACKAGES, undefined, undefined, false, shards)), []);
        assert.deepEqual(
            names(plan(PACKAGES, undefined, undefined, true, shards)),
            FEATURES_ON_SHARDS.map((s) => s.shard),
        );
    });

    it("run when --only names one (a bisect point)", () => {
        const only = ["graphty-element-browser-features-on-2"];
        assert.deepEqual(names(plan(PACKAGES, only, undefined, false, shards)), only);
    });

    it("run the Off shard's projects as their -features-on twins, without coverage or a blob report", () => {
        assert.equal(FEATURES_ON_SHARDS.length, 17);
        for (const on of FEATURES_ON_SHARDS) {
            const cmd = on["test-command"];
            assert.doesNotMatch(cmd, /--coverage|--reporter=blob/, on.shard);
            for (const project of cmd.matchAll(/--project=(\S+)/g)) {
                assert.match(project[1], /-features-on$/, on.shard);
            }
            assert.equal(on.local, "never", on.shard);
        }
        const entry = plan(PACKAGES, undefined, undefined, true, shards).find(
            (e) => e.shard === "graphty-features-on-1",
        );
        assert.equal(entry.coverage, undefined, "no coverage upload for an On shard");
    });

    it("come after every Off shard and group, and the test job runs at most 40 jobs at once", () => {
        const include = plan([...PACKAGES, "graph-format", "layout"], undefined, undefined, true, shards);
        const first = include.findIndex((e) => e["full-run-only"]);
        assert.ok(first > 0);
        assert.ok(
            include.slice(first).every((e) => e["full-run-only"]),
            "nothing Off after the first On",
        );
        const ci = parseYaml(readFileSync(".github/workflows/ci.yml", "utf8"));
        const max = ci.jobs.test.strategy["max-parallel"];
        assert.ok(Number.isInteger(max) && max <= 40, `max-parallel ${max}`);
    });

    it("are named all at once by --only features-on (a dispatch for one branch), or refused when none exist", () => {
        if (FEATURES_DECLARED) {
            assert.deepEqual(
                parseOnly('["features-on"]'),
                FEATURES_ON_SHARDS.map((s) => s.shard),
            );
        } else {
            assert.throws(() => parseOnly('["features-on"]'), /declares no experiment/);
        }
    });
});

// The done criterion of #3476: graphty-element declares no experiment today, so the On configuration must
// change nothing -- no On shard in any plan, no extra test:changed candidate, the same story URLs.
describe("with an empty FEATURES table", { skip: FEATURES_DECLARED && "an experiment is declared" }, () => {
    it("no plan has an On shard, a full run included", () => {
        assert.ok(!SHARDS.some((s) => s["full-run-only"]));
        const all = [...new Set(SHARDS.map((s) => s.package))];
        for (const full of [false, true]) {
            assert.ok(
                !plan(all, undefined, undefined, full).some((e) => e["full-run-only"] || /features-on/.test(e.shard)),
            );
        }
    });

    it("test:changed --features-on selects from exactly the same shards", () => {
        assert.deepEqual(candidateShards(true), candidateShards(false));
    });

    it("a capture without VISUAL_REVIEW_STORY_QUERY opens the same story URL", () => {
        assert.equal(storyUrl("a--b", null, ""), "iframe.html?id=a--b&viewMode=story&chromatic=true");
    });
});
