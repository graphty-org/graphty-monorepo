// Tests of the nightly promotion's decisions and records (tools/channel/nightly.mjs).
// Run: node tools/channel/nightly.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

import { parseDeployed } from "./site-deploy.mjs";
import {
    autosaveFormatOf,
    channelRecord,
    deployedRecord,
    deployState,
    promotion,
    stall,
    stampOf,
    STALL_TITLE,
    versionsAt,
    WAIT_LIMIT_MS,
    waitDeadline,
} from "./nightly.mjs";

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 9, 25, 18);
const SHA = "a".repeat(40);
const script = fileURLToPath(new URL("nightly.mjs", import.meta.url));

describe("promotion", () => {
    it("promotes only a green-clean candidate whose screenshot gate passed", () => {
        assert.equal(promotion({ state: "green-clean", publishHold: "", gate: "success" }).promote, true);
        for (const state of ["green-images", "red", "owner-item", ""]) {
            assert.equal(promotion({ state, publishHold: "", gate: "success" }).promote, false, state);
        }
        const refused = promotion({ state: "green-clean", publishHold: "", gate: "failure" });
        assert.equal(refused.promote, false);
        assert.match(refused.why, /screenshot gate refused/);
    });

    it("waits while a publish hold is open, and says which", () => {
        const p = promotion({ state: "green-clean", publishHold: "3500", gate: "success" });
        assert.deepEqual([p.promote, /publish hold #3500 is open/.test(p.why)], [false, true]);
    });
});

describe("the records", () => {
    const files = {
        "pnpm-workspace.yaml":
            'packages:\n    - "graph-format"\n    - "graphty-element"\n    - "githerd"\n\nminimumReleaseAge: 1440\n',
        "graph-format/package.json": JSON.stringify({ name: "@graphty/graph-format", version: "1.4.8" }),
        "graphty-element/package.json": JSON.stringify({ name: "@graphty/graphty-element", version: "3.31.0" }),
        "graphty-element/project.json": JSON.stringify({ name: "graphty-element" }),
        "githerd/package.json": JSON.stringify({ name: "@graphty/githerd", version: "0.1.0", private: true }),
    };
    it("lists every published package's version at the commit, by nx project name (the release tag's)", () => {
        assert.deepEqual(
            versionsAt((p) => files[p] ?? null),
            { "@graphty/graph-format": "1.4.8", "graphty-element": "3.31.0" },
            "project.json's name, else the npm name (remote-logger's case)",
        );
    });

    it("reads graphty-element's autosave format version", () => {
        assert.equal(autosaveFormatOf("x\nexport const AUTOSAVE_FORMAT_VERSION = 2;\n"), 2);
        assert.equal(autosaveFormatOf(null), null);
    });

    it("writes channel.json with the owner-approved baselines tree, and refuses anything else", () => {
        const base = {
            sha: SHA,
            commit: "",
            versions: {},
            run: 1,
            configBlob: "b",
            autosaveFormat: 1,
            siteSha256: "f",
            now: NOW,
        };
        const tree = "c".repeat(40);
        assert.equal(channelRecord({ ...base, screenshots: `approved:${tree}` }).screenshots, `approved:${tree}`);
        assert.throws(() => channelRecord(base), /screenshots must be/);
        assert.throws(() => channelRecord({ ...base, screenshots: "approved:x" }), /screenshots must be/);
    });

    it("writes channel.json with every field the design names", () => {
        const r = channelRecord({
            sha: SHA,
            commit: "",
            versions: {},
            run: 77,
            configBlob: "b1",
            autosaveFormat: 1,
            siteSha256: "f".repeat(64),
            now: NOW,
            screenshots: "unchanged",
        });
        assert.deepEqual(Object.keys(r).sort(), [
            "autosaveFormat",
            "channel",
            "commit",
            "fullRun",
            "promotedAt",
            "promotedBy",
            "screenshots",
            "siteConfigBlob",
            "siteSha256",
            "versionCommit",
            "versions",
        ]);
        assert.deepEqual(
            [r.channel, r.versionCommit, r.fullRun, r.screenshots, r.promotedBy],
            ["nightly", null, "77", "unchanged", "auto"],
        );
    });

    it("writes a deployed.json the site repository's deploy accepts", () => {
        const d = deployedRecord({ sha: SHA, siteSha256: "f".repeat(64), configRef: "c".repeat(40), now: NOW });
        assert.deepEqual(parseDeployed(JSON.stringify(d)), d);
        assert.equal(d.tag, `site-${SHA}`);
    });
});

describe("the deploy wait", () => {
    const run = (status, conclusion) => ({ status, conclusion, html_url: "https://x/run" });
    it("ends on the site's deploy run, or on its build stamp naming the candidate", () => {
        assert.deepEqual(deployState({ runs: [run("in_progress", null)], stamp: null, sha: SHA }), { done: false });
        assert.equal(deployState({ runs: [run("completed", "success")], stamp: null, sha: SHA }).ok, true);
        const failed = deployState({ runs: [run("completed", "failure")], stamp: SHA, sha: SHA });
        assert.deepEqual([failed.done, failed.ok], [true, false], "a failed deploy fails even with an old stamp");
        assert.equal(deployState({ runs: null, stamp: SHA.slice(0, 12), sha: SHA }).ok, true);
        assert.deepEqual(deployState({ runs: null, stamp: "b".repeat(40), sha: SHA }), { done: false });
    });

    it("on a re-run, waits for this deploy's run, not the first attempt's stamp", () => {
        assert.deepEqual(deployState({ runs: [], stamp: SHA, sha: SHA }), { done: false }, "runs readable, none yet");
        const failed = deployState({ runs: [run("completed", "failure")], stamp: SHA, sha: SHA });
        assert.equal(failed.ok, false);
        const other = { ...run("completed", "success"), path: ".github/workflows/lint.yml" };
        assert.deepEqual(deployState({ runs: [other], stamp: SHA, sha: SHA }), { done: false }, "another workflow");
        const deploy = { ...run("completed", "success"), path: ".github/workflows/deploy.yml" };
        assert.equal(deployState({ runs: [other, deploy], stamp: null, sha: SHA }).ok, true);
    });

    it("reads the build stamp", () => {
        const html = `<head><meta name="graphty-build" content="commit=${SHA} release=site-${SHA}"></head>`;
        assert.equal(stampOf(html), SHA);
        assert.equal(stampOf("<head></head>"), null);
    });
});

describe("the stall alarm", () => {
    const state = (ageNightlyMs, blocking, extra = {}) => ({
        ageNightlyMs,
        blocking,
        canary: { sha: "c".repeat(40) },
        ...extra,
    });
    it("stays quiet up to 24 hours", () => {
        assert.equal(stall({ state: state(24 * HOUR, "unjudged"), publishHold: "", now: NOW }), null);
        assert.equal(stall({ state: null, publishHold: "", now: NOW }), null);
        const never = { ...state(0, "unjudged"), nightly: null, ageNightlyMs: null };
        assert.equal(stall({ state: never, publishHold: "", now: NOW }), null, "nightly never moved: no alarm");
    });

    it("names the blocking state and the date nightly last moved", () => {
        const a = stall({
            state: state(30 * HOUR, "red", { red: { issue: 3600, lane: "ci" } }),
            publishHold: "",
            now: NOW,
        });
        assert.equal(a.title, `${STALL_TITLE} 2026-10-24`);
        assert.match(a.body, /full run is red \(#3600\) on its ci lane/);
        assert.equal(a.urgent, false);
        assert.doesNotMatch(a.body, /ACTION NEEDED/);
        const w = stall({
            state: state(30 * HOUR, "waiting-for-screenshots", { offered: { sha: "d".repeat(40) } }),
            publishHold: "",
            now: NOW,
        });
        assert.match(w.body, /screenshot review of ddddddd/);
    });

    it("names an open publish hold first, and asks the owner past 48 hours", () => {
        const a = stall({ state: state(49 * HOUR, "promotable"), publishHold: "3500", now: NOW });
        assert.equal(a.urgent, true);
        assert.match(a.body, /- publish hold #3500 is open/);
        assert.match(a.body, /\nACTION NEEDED: nightly stalled 49 h; publish hold #3500/);
    });
});

describe("nightly.mjs as a command", () => {
    it("refuses an unknown command and names the missing inputs", () => {
        assert.equal(spawnSync(process.execPath, [script, "nope"], { encoding: "utf8" }).status, 2);
        const r = spawnSync(process.execPath, [script, "deployed-json"], {
            encoding: "utf8",
            env: { PATH: process.env.PATH },
        });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /::error::missing SHA, SITE_SHA256, CONFIG_REF/);
    });

    it("decides without asking GitHub when the verdict is not green-clean", () => {
        const r = spawnSync(process.execPath, [script, "decide"], {
            encoding: "utf8",
            env: { PATH: process.env.PATH, STATE: "red" },
        });
        assert.equal(r.status, 0);
        assert.match(r.stdout, /^promote=false$/m);
    });
});

describe("the site job's hang guard", () => {
    const release = parseYaml(readFileSync(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8"));
    const site = release.jobs.site;
    it("counts the deploy wait from the job's start, not from the wait", () => {
        assert.match(site.steps[0].run, /JOB_STARTED_MS=/, "the first step notes the start");
        assert.equal(waitDeadline({ JOB_STARTED_MS: String(NOW - 6 * 60_000) }, NOW), NOW - 6 * 60_000 + WAIT_LIMIT_MS);
        assert.equal(waitDeadline({}, NOW), NOW + WAIT_LIMIT_MS, "run by hand: from now");
    });
    it("gives up before the job's timeout, with room left for the failure report", () => {
        assert.ok(site["timeout-minutes"] * 60_000 - WAIT_LIMIT_MS >= 3 * 60_000, `${site["timeout-minutes"]} min`);
    });
});
