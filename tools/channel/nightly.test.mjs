// Tests of the nightly promotion's decisions and records (tools/channel/nightly.mjs).
// Run: node tools/channel/nightly.test.mjs
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parse as parseYaml } from "yaml";

import { parseDeployed } from "./site-deploy.mjs";
import {
    autosaveFormatOf,
    carrierCommit,
    channelRecord,
    deployedRecord,
    deployState,
    lastNightlyMove,
    missedSlot,
    MISSED_TITLE,
    promotion,
    siteReleasePlan,
    slotText,
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
    it("promotes only a green-clean candidate, or one the owner approved, whose screenshot gate passed", () => {
        assert.equal(promotion({ state: "green-clean", publishHold: "", gate: "success" }).promote, true);
        // the promotion after the owner's approval of a green-images head (tools/channel/resume.mjs)
        assert.equal(promotion({ state: "approved", publishHold: "", gate: "success" }).promote, true);
        assert.equal(promotion({ state: "approved", publishHold: "", gate: "failure" }).promote, false);
        assert.equal(promotion({ state: "approved", publishHold: "1", gate: "success" }).promote, false);
        for (const state of ["green-images", "red", "owner-item", ""]) {
            assert.equal(promotion({ state, publishHold: "", gate: "success" }).promote, false, state);
        }
        const held = { state: "green-clean", publishHold: "", gate: "success", sha: "s" };
        assert.equal(promotion({ ...held, held: "s" }).promote, true, "the held candidate itself promotes");
        assert.match(promotion({ ...held, held: "t" }).why, /nightly is held on t/);
        assert.equal(promotion({ ...held, held: "unknown" }).promote, false, "an unknown hold is not no hold");
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
        const carried = deployedRecord({
            sha: SHA,
            siteSha256: "f".repeat(64),
            configRef: "c".repeat(40),
            now: NOW,
            tag: `site-${"b".repeat(40)}`,
        });
        assert.deepEqual(parseDeployed(JSON.stringify(carried)), carried);
    });
});

describe("the site-<sha> release (immutable releases, #4149)", () => {
    const HASH = "e".repeat(64);
    const release = (assets) => ({ tag_name: `site-${SHA}`, immutable: true, assets });
    it("creates a missing release, reuses one holding this archive, refuses another archive", () => {
        assert.equal(siteReleasePlan(null, HASH).action, "create");
        const same = release([{ name: "site.tar.zst", digest: `sha256:${HASH}` }, { name: "channel.json" }]);
        assert.equal(siteReleasePlan(same, HASH).action, "reuse");
        const other = release([{ name: "site.tar.zst", digest: `sha256:${"0".repeat(64)}` }]);
        assert.equal(siteReleasePlan(other, HASH).action, "refuse");
    });

    it("moves a site whose release was published without it to a carrier commit", () => {
        assert.equal(siteReleasePlan(release([]), HASH).action, "carrier");
        assert.equal(siteReleasePlan(release([{ name: "channel.json" }]), HASH).action, "carrier");
    });

    it("makes the same carrier every time: the candidate's tree, the candidate as its parent", () => {
        const dir = mkdtempSync(join(tmpdir(), "nightly-carrier-"));
        const git = (args, env = {}) =>
            execFileSync("git", ["-C", dir, ...args], {
                encoding: "utf8",
                env: { PATH: process.env.PATH, HOME: dir, GIT_CONFIG_NOSYSTEM: "1", ...env },
            }).trim();
        git(["init", "-q"]);
        writeFileSync(join(dir, "a.txt"), "a\n");
        git(["add", "a.txt"]);
        git(["-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "c"]);
        const sha = git(["rev-parse", "HEAD"]);
        const carrier = carrierCommit(sha, git);
        assert.match(carrier, /^[0-9a-f]{40}$/);
        assert.notEqual(carrier, sha);
        assert.equal(carrierCommit(sha, git), carrier, "a re-run finds the same commit, and its release");
        assert.equal(git(["rev-parse", `${carrier}^{tree}`]), git(["rev-parse", `${sha}^{tree}`]));
        assert.equal(git(["rev-parse", `${carrier}^`]), sha);
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
    it("stays quiet up to one slot and a run (8 hours), the fallback for a slot with no run (#5052)", () => {
        assert.equal(stall({ state: state(8 * HOUR, "unjudged"), publishHold: "", now: NOW }), null);
        assert.match(stall({ state: state(9 * HOUR, "unjudged"), publishHold: "", now: NOW }).body, /no run at all/);
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

    it("says what a held candidate waits for: the owner's review once offered, else a fix forward", () => {
        const hold = { head: "e".repeat(40), issue: 3800 };
        const review = stall({
            state: state(30 * HOUR, "held", { hold, offered: { sha: hold.head } }),
            publishHold: "",
            now: NOW,
        });
        assert.match(review.body, /held on eeeeeee \(#3800\), waiting for the owner's screenshot review/);
        const fix = stall({ state: state(30 * HOUR, "held", { hold, offered: null }), publishHold: "", now: NOW });
        assert.match(fix.body, /held on eeeeeee \(#3800\): fix it forward/);
    });

    it("names an open publish hold first, and asks the owner past 48 hours", () => {
        const a = stall({ state: state(49 * HOUR, "promotable"), publishHold: "3500", now: NOW });
        assert.equal(a.urgent, true);
        assert.match(a.body, /- publish hold #3500 is open/);
        assert.match(a.body, /\nACTION NEEDED: nightly stalled 49 h; publish hold #3500/);
    });
});

describe("the missed-slot alarm (#5052)", () => {
    const STARTED = Date.UTC(2026, 9, 30, 6, 4); // the 06:00 slot's run
    const ran = (over) => ({ moved: false, pickResult: "success", release: "true", sha: SHA, ...over });
    it("is quiet when nightly moved, and while attempt 1 waits for its re-run", () => {
        assert.equal(missedSlot(ran({ moved: true, state: "red" }), STARTED), null);
        assert.equal(missedSlot(ran({ state: "red", deferred: "true" }), STARTED), null);
    });
    it("names the slot by its UTC time and the cause: a red lane with its issue", () => {
        const a = missedSlot(ran({ state: "red", what: "T4 GPU", issue: "4600" }), STARTED);
        assert.equal(a.title, `${MISSED_TITLE} 2026-10-30 06:00 UTC: red lane on aaaaaaa: T4 GPU (#4600)`);
    });
    it("a candidate held for review names the review page", () => {
        const a = missedSlot(ran({ state: "green-images", hold: "start" }), STARTED);
        assert.match(a.cause, /^waiting on the owner's screenshot review of aaaaaaa$/);
        assert.match(a.detail, /serve --candidate next/);
        assert.match(a.detail, /&change=master/);
    });
    it("a green-images run behind a held candidate awaiting review, and one behind a hold nobody can review", () => {
        const H = "e87f65b".padEnd(40, "0");
        const review = missedSlot(
            ran({ state: "green-images", hold: "none", held: H, heldState: "green-images" }),
            STARTED,
        );
        assert.match(review.cause, /review of the held e87f65b/);
        const stuck = missedSlot(ran({ state: "green-images", hold: "none", held: H, heldState: "red" }), STARTED);
        assert.match(stuck.cause, /hold on e87f65b is not reviewable \(red\)/);
        assert.match(stuck.detail, /nightly-abandon\.yml/);
    });
    it("no new candidate, a failed pick, and a green-clean run that did not promote say so", () => {
        assert.match(
            missedSlot(ran({ release: "false", pickWhy: "c3 is judged" }), STARTED).cause,
            /^no new candidate: c3/,
        );
        assert.match(missedSlot(ran({ pickResult: "failure" }), STARTED).cause, /the pick failed/);
        const gc = missedSlot(ran({ state: "green-clean", promote: "false", why: "publish hold #9 is open" }), STARTED);
        assert.match(gc.cause, /did not promote: publish hold #9/);
        assert.match(
            missedSlot(ran({ state: "green-clean", promote: "true" }), STARTED).cause,
            /failed before it landed/,
        );
    });
});

describe("the missed-slot alarm replays 2026-10-30 (#5135)", () => {
    const H = "660d4cacbf835e5dee06a69e5a3dd5c981d592a6";
    // GET /v1/release-state as both runs read it: 660d4ca held for review (#5065), no nightly move recorded
    const state = {
        nightly: null,
        ageNightlyMs: null,
        blocking: "held",
        hold: { base: H, head: H, issue: 5065, at: 1793373687260 },
        offered: { sha: H, state: "green-images" },
    };
    // the slot job's env of each run, as logged
    const full = {
        moved: false,
        pickResult: "success",
        release: "true",
        pickWhy: "68713aa is not judged yet",
        resume: "false",
        sha: "68713aa976b296bead7a5e786741d7285605b761",
        state: "green-images",
        deferred: "false",
        hold: "none",
        held: H,
        heldState: "green-images",
        what: "1749 screenshots differ from master's baselines",
        issue: "",
        promote: "false",
        why: "the verdict is green-images, not green-clean",
    };
    const candidate = {
        moved: false,
        pickResult: "success",
        release: "false",
        pickWhy: "the held head is judged already",
        resume: "false",
        sha: H,
    };
    it("a candidate run that tested nothing keeps the full run's cause and title (runs 41103133086, 41138164069)", () => {
        const before = missedSlot(full, Date.parse("2026-10-30T18:00:36Z"), state);
        const after = missedSlot(candidate, Date.parse("2026-10-30T22:26:41Z"), state);
        assert.equal(
            before.title,
            `${MISSED_TITLE} 2026-10-30 18:00 UTC: waiting on the owner's screenshot review of the held 660d4ca`,
        );
        assert.equal(after.title, before.title);
        assert.match(after.detail, /serve --candidate next/);
    });
    it("a no-op run names a red blocker or a hold nobody can review, and says no new candidate only when the store is silent", () => {
        const red = { blocking: "red", red: { sha: "b".repeat(40), lane: "T4 GPU", issue: 4600 } };
        assert.match(missedSlot(candidate, 0, red).cause, /^red lane on bbbbbbb: T4 GPU \(#4600\)$/);
        const stuck = { ...state, offered: null };
        assert.match(missedSlot(candidate, 0, stuck).cause, /^hold on 660d4ca is not reviewable/);
        assert.match(missedSlot(candidate, 0, null).cause, /^no new candidate: the held head is judged already$/);
    });
    it("names when nightly last moved: the push to channel/nightly when the store has no move (2026-10-29 15:30Z)", () => {
        const pushed = Date.parse("2026-10-29T15:30:28Z");
        const now = Date.parse("2026-10-30T22:28:29Z");
        assert.equal(lastNightlyMove(null, pushed), pushed);
        assert.equal(lastNightlyMove(pushed + HOUR, pushed), pushed + HOUR);
        assert.equal(lastNightlyMove(null, Number.NaN), null);
        const alarm = missedSlot(candidate, now, state);
        const text = slotText({ mode: "candidate", runUrl: "u", alarm, moved: lastNightlyMove(null, pushed), now });
        assert.match(text, /Nightly last moved at 2026-10-29 15:30 UTC, 30 hours ago\./);
        assert.match(slotText({ mode: "full", runUrl: "u", alarm, moved: null, now }), /at an unknown time/);
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

    it("fails, promoting nothing, when it cannot read the publish hold of a green-clean candidate", () => {
        const r = spawnSync(process.execPath, [script, "decide"], {
            encoding: "utf8",
            cwd: "/",
            env: { PATH: process.env.PATH, STATE: "green-clean", GATE: "success" },
        });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /::error::cannot read the publish hold/);
        assert.doesNotMatch(r.stdout, /^promote=/m);
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
    const workflow = readFileSync(new URL("../../.github/workflows/nightly-site.yml", import.meta.url), "utf8");
    const site = parseYaml(workflow).jobs.site;
    it("counts the deploy wait from the job's start, not from the wait", () => {
        assert.match(site.steps[0].run, /JOB_STARTED_MS=/, "the first step notes the start");
        assert.equal(waitDeadline({ JOB_STARTED_MS: String(NOW - 6 * 60_000) }, NOW), NOW - 6 * 60_000 + WAIT_LIMIT_MS);
        assert.equal(waitDeadline({}, NOW), NOW + WAIT_LIMIT_MS, "run by hand: from now");
    });
    it("gives up before the job's timeout, with room left for the failure report", () => {
        assert.ok(site["timeout-minutes"] * 60_000 - WAIT_LIMIT_MS >= 3 * 60_000, `${site["timeout-minutes"]} min`);
    });
});
