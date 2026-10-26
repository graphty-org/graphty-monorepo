// Tests of the "On" test configuration: the vitest twins (tools/features-on.mjs) and the On shards of
// tools/ci-test-matrix.mjs, planned only in a full run and only while graphty-element declares an experiment.
//
//   node --test tools/features-on.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";

import { parse as parseYaml } from "yaml";

import { FEATURES_ON_SHARDS, parseOnly, plan, SHARDS } from "./ci-test-matrix.mjs";
import { FEATURES_DECLARED, ON_ENV, ON_SUFFIX, withFeaturesOn } from "./features-on.mjs";
import { candidateShards } from "./test-changed.mjs";
import { quarantined } from "./test-quarantine.mjs";
import { selectedCommand } from "./test-select.mjs";
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

    it("gives a twin its own define, whose keys vitest deletes", () => {
        const withDefine = [{ define: { __V__: '"1"' }, test: { name: "default" } }];
        const twin = withFeaturesOn(withDefine, ["default"], SETUP, true)[1];
        assert.notEqual(twin.define, withDefine[0].define);
        assert.deepEqual(twin.define, withDefine[0].define);
    });

    it("adds no twin to a run that did not ask for the On configuration", () => {
        // the default is FEATURES_DECLARED && GRAPHTY_FEATURES_ON=1; this process never sets it
        assert.equal(process.env[ON_ENV], undefined);
        assert.equal(withFeaturesOn(projects, ["default", "browser"], SETUP), projects);
    });
});

describe("the On shards", () => {
    const PACKAGES = ["graphty-element", "graphty"];
    const shards = [...SHARDS.filter((s) => !s["full-run-only"]), ...FEATURES_ON_SHARDS];
    const names = (include) => include.map((e) => e.shard).filter((n) => n.includes("features-on"));

    it("exist only while graphty-element declares an experiment", () => {
        assert.equal(
            SHARDS.some((s) => s.flags === "on"),
            FEATURES_DECLARED,
        );
    });

    it("are planned in a full run and never on a pull request", () => {
        assert.deepEqual(names(plan(PACKAGES, undefined, undefined, true, shards)), []);
        assert.deepEqual(
            names(plan(PACKAGES, undefined, undefined, false, shards)),
            FEATURES_ON_SHARDS.map((s) => s.shard),
        );
    });

    it("run when --only names one (a bisect point)", () => {
        const only = ["graphty-element-browser-features-on-2"];
        assert.deepEqual(names(plan(PACKAGES, only, undefined, true, shards)), only);
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
        const entry = plan(PACKAGES, undefined, undefined, false, shards).find(
            (e) => e.shard === "graphty-features-on-1",
        );
        assert.equal(entry.coverage, undefined, "no coverage upload for an On shard");
    });

    it("come after every Off shard and group, and the test job runs at most 40 jobs at once", () => {
        const include = plan([...PACKAGES, "graph-format", "layout"], undefined, undefined, false, shards);
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
            assert.throws(() => parseOnly('["features-on","graphty-element-default"]'), /declares no experiment/);
        }
    });

    it("stay out of a pull request's light plan: a bin of an On shard is dropped unless it is a full run", () => {
        const on = shards.find((s) => s["full-run-only"]);
        const light = { bins: [{ name: `${on.shard}-1`, shard: on.shard, files: [], command: "true" }] };
        const include = plan(PACKAGES, undefined, light, true, shards);
        assert.ok(include.length > 0);
        assert.ok(!include.some((e) => e["full-run-only"] || e.shard === `${on.shard}-1`));
        const full = plan(PACKAGES, undefined, light, false, shards).find((e) => e.shard === `${on.shard}-1`);
        assert.ok(full?.["full-run-only"], "a full run keeps it");
    });

    it("set GRAPHTY_FEATURES_ON=1, which a selected run of their files keeps", () => {
        for (const s of FEATURES_ON_SHARDS)
            assert.match(s["test-command"], /&& GRAPHTY_FEATURES_ON=1 pnpm exec vitest run /);
        const on = FEATURES_ON_SHARDS.find((s) => s.shard === "graphty-element-default-features-on");
        assert.equal(
            selectedCommand(".", on, ["graphty-element/test/a.test.ts"]),
            "cd graphty-element && GRAPHTY_FEATURES_ON=1 pnpm exec vitest run --project=default-features-on --project=mesh-features-on 'test/a.test.ts'",
        );
    });

    it("never share a test-durations cache with their Off shard (a restore key is a prefix)", () => {
        const test = parseYaml(readFileSync(".github/workflows/ci.yml", "utf8")).jobs.test.steps.find(
            (s) => s.name === "Restore the shard's test durations",
        );
        assert.equal(test.with["restore-keys"], "test-durations-${{ matrix.shard }}--");
        assert.ok(test.with.key.startsWith("test-durations-${{ matrix.shard }}--"));
        assert.ok(!shards.some((s) => s.shard.includes("--")), "no shard name holds the separator");
    });

    it("are named the same in the selector and the quarantine, which copy ON_SUFFIX and ON_ENV", () => {
        // test-select.mjs and test-quarantine.mjs run in sandboxed copies of tools/ that hold no graphty-element
        // source, so they cannot import tools/features-on.mjs (it reads the registry); this keeps the copies true
        assert.equal(ON_ENV, "GRAPHTY_FEATURES_ON");
        assert.equal(ON_SUFFIX, "features-on");
        const select = readFileSync("tools/test-select.mjs", "utf8");
        assert.ok(select.includes('"GRAPHTY_FEATURES_ON=1"') && select.includes('"-features-on"'));
        assert.ok(readFileSync("tools/test-quarantine.mjs", "utf8").includes("/-features-on$/u"));
    });

    it("are excused by their Off family's quarantine entries", () => {
        const t = { file: "test/a.test.ts", name: "a > b" };
        const list = [{ ...t, family: "graphty-element-browser" }];
        assert.ok(quarantined(list, "graphty-element-browser-features-on", t));
        assert.ok(quarantined(list, "graphty-element-browser", t));
        assert.equal(quarantined(list, "graphty-element-storybook-features-on", t), undefined);
        assert.ok(quarantined([{ ...t, family: "graphty" }], "graphty-features-on", t));
    });

    it("never join an Off shard: the twins exist only under GRAPHTY_FEATURES_ON=1, which no Off command sets", () => {
        // vitest includes a project any one --project filter matches, so graphty-N's "!storybook" would run
        // the twins if they existed in its run
        for (const s of SHARDS.filter((x) => !x["full-run-only"])) {
            assert.doesNotMatch(s["test-command"], /GRAPHTY_FEATURES_ON/, s.shard);
        }
    });
});

// The done criterion of #3476: graphty-element declares no experiment today, so the On configuration must
// change nothing -- no On shard in any plan, no extra test:changed candidate, the same story URLs.
describe("with an empty FEATURES table", { skip: FEATURES_DECLARED && "an experiment is declared" }, () => {
    it("no plan has an On shard, a full run included", () => {
        assert.ok(!SHARDS.some((s) => s.flags === "on"));
        const all = [...new Set(SHARDS.map((s) => s.package))];
        for (const pullRequest of [false, true]) {
            assert.ok(!plan(all, undefined, undefined, pullRequest).some((e) => /features-on/.test(e.shard)));
        }
    });

    it("test:changed --features-on selects from exactly the same shards", () => {
        assert.deepEqual(candidateShards(true), candidateShards(false));
    });

    it("a capture without VISUAL_REVIEW_STORY_QUERY opens the same story URL", () => {
        assert.equal(storyUrl("a--b", null, ""), "iframe.html?id=a--b&viewMode=story&chromatic=true");
        const saved = process.env.VISUAL_REVIEW_STORY_QUERY;
        try {
            delete process.env.VISUAL_REVIEW_STORY_QUERY;
            assert.equal(storyUrl("a--b", null), "iframe.html?id=a--b&viewMode=story&chromatic=true");
            process.env.VISUAL_REVIEW_STORY_QUERY = "features=all";
            assert.equal(storyUrl("a--b", null), "iframe.html?id=a--b&viewMode=story&chromatic=true&features=all");
        } finally {
            if (saved === undefined) delete process.env.VISUAL_REVIEW_STORY_QUERY;
            else process.env.VISUAL_REVIEW_STORY_QUERY = saved;
        }
    });
});
