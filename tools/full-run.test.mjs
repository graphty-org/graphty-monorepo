// Tests of tools/full-run.mjs: the full run's candidate pick and its verdict (channels design, sections 5 and 6).
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
    bestEffort,
    bisectPlan,
    captureLane,
    changedSummary,
    deferred,
    differingImages,
    duplicateOf,
    fixedRecently,
    flakyLanes,
    greenCloses,
    heldLine,
    holdAction,
    isOnNightly,
    LANES,
    laneRedIssue,
    pick,
    redIssue,
    verdictOf,
} from "./full-run.mjs";

// master's first parents, newest first: c3 <- c2 <- c1 <- c0
const CHAIN = ["c3", "c2", "c1", "c0"];
const firstParents = (sha) => CHAIN.slice(CHAIN.indexOf(sha));
const code = () => ["tools/x.mjs: not a package.json or a CHANGELOG.md"];
const store = (recent, sha = "c3") => ({ candidate: { sha, builtAt: 1 }, recent });

describe("isOnNightly", () => {
    it("counts a versions-only difference as on nightly, but not a screenshot baselines change", () => {
        const dir = mkdtempSync(join(tmpdir(), "on-nightly-"));
        const git = (...a) =>
            execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], {
                cwd: dir,
                encoding: "utf8",
                env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" },
            }).trim();
        const commit = (path, text) => {
            mkdirSync(join(dir, path, ".."), { recursive: true });
            writeFileSync(join(dir, path), text);
            git("add", "-A");
            git("commit", "-q", "-m", path);
            return git("rev-parse", "HEAD");
        };
        git("init", "-q", "-b", "main");
        git("config", "commit.gpgsign", "false");
        commit("p/package.json", JSON.stringify({ name: "p", version: "1.0.0" }));
        const nightly = commit("p/src.js", "1");
        git("checkout", "-q", "-b", "side", "HEAD~1");
        const versions = commit("p/package.json", JSON.stringify({ name: "p", version: "1.1.0" }));
        assert.equal(isOnNightly(nightly, nightly, dir), true, "in its history");
        git("checkout", "-q", nightly);
        const baselines = commit("visual-baselines/p/a.png", "new picture");
        assert.equal(isOnNightly(baselines, nightly, dir), false, "a screenshot change nightly does not serve");
        git("checkout", "-q", nightly);
        git("merge", "-q", "--no-edit", versions);
        assert.equal(isOnNightly(git("rev-parse", "HEAD"), nightly, dir), true, "only versions differ");
        assert.equal(isOnNightly(baselines, "refs/heads/none", dir), false, "no channel/nightly yet");
    });
});

describe("pick", () => {
    it("tests the newest commit with a site when nothing judged it", () => {
        const p = pick({ mode: "full", head: "h", store: store([]), firstParents, stray: code });
        assert.deepEqual([p.run, p.sha, p.good], [true, "c3", ""]);
    });

    it("skips a commit already judged, so a second dispatch on it does nothing", () => {
        const p = pick({
            mode: "full",
            head: "h",
            store: store([{ sha: "c3", state: "red" }]),
            firstParents,
            stray: code,
        });
        assert.equal(p.run, false);
        assert.match(p.why, /already judged red/);
    });

    it("inherits the verdict over merges that change only versions or screenshot approvals", () => {
        const recent = [{ sha: "c1", state: "green-clean" }];
        const seen = [];
        const stray = (from, to) => (seen.push([from, to]), []);
        const p = pick({ mode: "full", head: "h", store: store(recent), firstParents, stray });
        assert.deepEqual([p.run, p.inherit.sha, p.good], [false, "c1", "c1"]);
        assert.deepEqual(seen, [["c1", "c3"]], "one diff from the judged commit to the candidate");
        assert.equal(pick({ mode: "full", head: "h", store: store(recent), firstParents, stray: code }).run, true);
    });

    it("does not inherit across a change of the visual-baselines tree: the owner's approved baselines are tested", () => {
        const recent = [{ sha: "c1", state: "green-clean" }];
        const seen = [];
        const sameBaselines = (from, to) => (seen.push([from, to]), false);
        const p = pick({ mode: "full", head: "h", store: store(recent), firstParents, stray: () => [], sameBaselines });
        assert.deepEqual([p.run, p.sha, p.inherit], [true, "c3", undefined]);
        assert.deepEqual(seen, [["c1", "c3"]]);
    });

    it("tests an unpromoted green-clean commit again only once a publish hold closed after its verdict", () => {
        const own = store([{ sha: "c3", state: "green-clean", at: 100 }]);
        const off = () => false;
        const run = (hold) =>
            pick({ mode: "full", head: "h", store: own, firstParents, stray: code, onNightly: off, hold });
        const open = run({ open: "42", closedAt: 0 });
        assert.deepEqual([open.run, /publish hold #42/.test(open.why)], [false, true], "the hold still open");
        assert.equal(run({ open: "", closedAt: 0 }).run, false, "a screenshot refusal or refused push: no re-test");
        assert.equal(run({ open: "", closedAt: 50 }).run, false, "a hold that closed before the verdict");
        assert.equal(run({ open: "", closedAt: 200 }).run, true, "the hold that blocked it closed");
        assert.equal(pick({ mode: "full", head: "h", store: own, firstParents, stray: code }).run, false);
        // nor does an unpromoted green-clean commit pass its verdict on
        const inherited = store([{ sha: "c1", state: "green-clean" }]);
        const p = pick({ mode: "full", head: "h", store: inherited, firstParents, stray: () => [], onNightly: off });
        assert.deepEqual([p.run, p.inherit], [true, undefined]);
    });

    it("skips a candidate whose history lacks channel/nightly, before testing anything", () => {
        const seen = [];
        const hasNightly = (sha) => (seen.push(sha), false);
        const p = pick({ mode: "full", head: "h", store: store([]), firstParents, stray: code, hasNightly });
        assert.deepEqual([p.run, p.sha, seen], [false, "c3", ["c3"]]);
        assert.match(p.why, /c3 lacks channel\/nightly: it is older than nightly/);
        // even a green-clean one nightly lacks: its promotion would be refused at land
        const own = store([{ sha: "c3", state: "green-clean" }]);
        const off = () => false;
        assert.equal(
            pick({ mode: "full", head: "h", store: own, firstParents, stray: code, onNightly: off, hasNightly }).run,
            false,
        );
    });

    it("finds the last green commit for the bisect, past a red one", () => {
        const recent = [
            { sha: "c2", state: "red" },
            { sha: "c0", state: "green-images" },
        ];
        const p = pick({ mode: "full", head: "h", store: store(recent), firstParents, stray: code });
        assert.deepEqual([p.run, p.sha, p.good], [true, "c3", "c0"]);
    });

    it("takes the newest site by master's order from the head, not by when it was recorded", () => {
        // c1's site was recorded last (a re-run of its build), so the store's own candidate is c1
        const s = { candidate: { sha: "c1", builtAt: 9 }, sites: ["c1", "c2"], recent: [] };
        const p = pick({ mode: "full", head: "c3", store: s, firstParents, stray: code });
        assert.deepEqual([p.run, p.sha], [true, "c2"]);
    });

    it("a restart tests the commit it was dispatched on, not the newest site", () => {
        const p = pick({ mode: "restart", head: "c2", store: store([]), firstParents, stray: code });
        assert.deepEqual([p.run, p.sha], [true, "c2"]);
    });

    it("tests master's head when the store does not answer or records no site", () => {
        assert.deepEqual(pick({ mode: "full", head: "h", store: null, firstParents, stray: code }).sha, "h");
        const none = { candidate: null, recent: [] };
        assert.deepEqual(pick({ mode: "full", head: "h", store: none, firstParents, stray: code }).run, true);
    });
});

const ALL_GREEN = Object.fromEntries(Object.keys(LANES).map((l) => [l, "success"]));

describe("verdictOf", () => {
    it("is green-clean only when every lane passed and no screenshot differs", () => {
        assert.deepEqual(verdictOf(ALL_GREEN, 0), { state: "green-clean", red: [] });
        assert.equal(verdictOf(ALL_GREEN, 2).state, "green-images");
        assert.equal(verdictOf({ ...ALL_GREEN, llm: "skipped" }, 0).state, "green-clean", "an LLM lane not due");
    });

    it("is red on any lane that did not pass, cancelled and abandoned too, named in lane order", () => {
        const v = verdictOf({ ...ALL_GREEN, hosts: "cancelled", ci: "failure" }, 0);
        assert.deepEqual(v, { state: "red", red: ["ci", "hosts"] });
        assert.equal(verdictOf({ ...ALL_GREEN, audit: "abandoned" }, 0).state, "red");
        // an unapproved major or first publish (the version dry run, #3455) holds promotion like any lane
        assert.deepEqual(verdictOf({ ...ALL_GREEN, version_dry_run: "failure" }, 0).red, ["version_dry_run"]);
        assert.deepEqual(verdictOf({ ...ALL_GREEN, t4: "skipped" }, 0).red, ["t4"], "only the LLM lane may skip");
        const noHosts = { ...ALL_GREEN };
        delete noHosts.hosts;
        assert.deepEqual(verdictOf(noHosts, 0).red, ["hosts"], "a lane with no result did not pass");
    });

    it("is an owner item when only the LLM lane failed on the provider's refusal", () => {
        const lanes = { ...ALL_GREEN, llm: "failure" };
        assert.equal(verdictOf(lanes, 0, "Google refused the account").state, "owner-item");
        assert.equal(verdictOf(lanes, 0, "").state, "red");
        assert.equal(verdictOf({ ...lanes, ci: "failure" }, 0, "refused").state, "red");
    });

    it("is red, never green-images, when an expected capture is missing (#3698)", () => {
        const lanes = { ...ALL_GREEN, captures: captureLane(["graphty", "graphty-element"]) };
        assert.equal(lanes.captures, "missing for graphty, graphty-element");
        assert.deepEqual(verdictOf(lanes, 0), { state: "red", red: ["captures"] });
        assert.deepEqual(verdictOf(lanes, 3), { state: "red", red: ["captures"] }, "changed images do not hide it");
        assert.equal(captureLane([]), "success");
        // captures come from the CI lane: a red CI explains a missing capture, so only CI is named
        assert.deepEqual(verdictOf({ ...lanes, ci: "failure" }, 0).red, ["ci"]);
        assert.match(bisectPlan({ red: ["captures"], sha: "s", good: "g", run: 1, failures: null }).why, /capture/);
    });
});

describe("verdictOf: the pick and the version dry run", () => {
    it("is red on a failed pick alone, whatever the skipped lanes say", () => {
        const skipped = Object.fromEntries(Object.keys(LANES).map((l) => [l, "skipped"]));
        assert.deepEqual(verdictOf({ ...skipped, pick: "failure" }, null), { state: "red", red: ["pick"] });
        assert.equal(verdictOf({ ...ALL_GREEN, pick: "success" }, 0).state, "green-clean");
    });

    it("holds only the projects the dry run held: the rest of the run decides as usual (#4021)", () => {
        const lanes = { ...ALL_GREEN, version_dry_run: "failure" };
        // the version job leaves the held projects out (RELEASE_HOLD_ALSO), so every other project promotes
        assert.deepEqual(verdictOf(lanes, 0, "", "babylonjs-map"), { state: "green-clean", red: [] });
        assert.equal(verdictOf(lanes, 2, "", "babylonjs-map").state, "green-images");
        assert.equal(verdictOf(lanes, 0, "", "").state, "red", "a dry run that failed otherwise is red");
        assert.deepEqual(verdictOf({ ...lanes, ci: "failure" }, 0, "", "babylonjs-map"), { state: "red", red: ["ci"] });
        // the held projects stay the owner's item, named in the verdict's owner output
        assert.match(
            heldLine("babylonjs-map"),
            /^babylonjs-map held with the projects that depend on it .*release-approvals\.json/,
        );
        assert.equal(heldLine(""), "");
    });

    it("plans no bisect for a failed pick", () => {
        assert.match(bisectPlan({ red: ["pick"], sha: "s", good: "g", run: 1, failures: null }).why, /candidate pick/);
    });
});

describe("differingImages", () => {
    it("lists the items of every capture that are not unchanged or excluded, and the missing projects", () => {
        const dir = mkdtempSync(join(tmpdir(), "full-run-"));
        assert.deepEqual(differingImages(dir), { changed: [], missing: ["every project"] });
        assert.deepEqual(differingImages(dir, ["layout"]), { changed: [], missing: ["layout"] });
        assert.deepEqual(differingImages(join(dir, "absent"), ["layout"]).missing, ["layout"]);
        for (const [p, items] of [
            ["visual-layout-1", [{ status: "unchanged" }, { status: "changed", file: "a.light.png" }]],
            ["visual-graphty-1", [{ status: "excluded" }, { status: "new", id: "b" }, { status: "unchanged" }]],
        ]) {
            mkdirSync(join(dir, p));
            writeFileSync(join(dir, p, "results.json"), JSON.stringify({ complete: true, items }));
        }
        assert.deepEqual(differingImages(dir), { changed: ["graphty/b", "layout/a.light.png"], missing: [] });
        // a re-run's newer attempt replaces the older one's capture of the same project
        mkdirSync(join(dir, "visual-layout-2"));
        writeFileSync(
            join(dir, "visual-layout-2", "results.json"),
            JSON.stringify({ complete: true, items: [{ status: "unchanged" }] }),
        );
        assert.deepEqual(differingImages(dir).changed, ["graphty/b"]);
        // another file ending in results.json is not the capture's
        writeFileSync(
            join(dir, "visual-layout-2", "flaky-results.json"),
            JSON.stringify({ items: [{ status: "new" }] }),
        );
        assert.deepEqual(differingImages(dir).changed, ["graphty/b"]);
        // a project whose capture wrote no results.json is missing, and named
        assert.deepEqual(differingImages(dir, ["layout", "graphty"]).missing, []);
        assert.deepEqual(differingImages(dir, ["layout", "graphty", "compact-mantine"]).missing, ["compact-mantine"]);
    });

    it("counts a capture that is not complete as missing: it stopped part way, so nothing says the rest matched", () => {
        const dir = mkdtempSync(join(tmpdir(), "full-run-"));
        for (const [p, results] of [
            ["visual-layout-1", { complete: false, items: [{ status: "unchanged" }] }],
            ["visual-graphty-1", { items: [{ status: "unchanged" }] }],
            ["visual-algorithms-1", { complete: true, items: [{ status: "unchanged" }] }],
        ]) {
            mkdirSync(join(dir, p));
            writeFileSync(join(dir, p, "results.json"), JSON.stringify(results));
        }
        const { changed, missing } = differingImages(dir, ["layout", "graphty", "algorithms"]);
        assert.deepEqual(changed, []);
        assert.deepEqual(missing.sort(), ["graphty", "layout"]);
        assert.equal(captureLane(missing), "missing for graphty, layout");
    });

    it("summarizes the changed screenshots by project for the owner", () => {
        const changed = Array.from({ length: 10 }, (_, i) => `graphty/t${i}.png`).concat(["layout/x.png"]);
        assert.equal(changedSummary(changed), "11 screenshots differ from master's baselines: graphty 10, layout 1");
        assert.equal(changedSummary(["layout/x.png"]), "1 screenshot differs from master's baselines: layout 1");
    });
});

describe("the red issue and its bisect", () => {
    it("titles the issue as release-due matches it", () => {
        const { title, body } = redIssue({
            sha: "abcdef1234",
            red: ["ci", "t4"],
            lanes: { ...ALL_GREEN, ci: "failure", t4: "failure" },
            run: "https://run",
            bisect: "Bisect dispatched.",
        });
        assert.equal(title, "Full run red: CI, T4 GPU on abcdef1");
        assert.match(body, /CI failure, LLM regression success, T4 GPU failure/);
        assert.match(body, /`Fixes #<this issue>` closes it, cancels this run/);
        assert.match(body, /`Refs #<this issue>` restarts the full run after this run ends/);
    });

    it("dispatches one bisect, for the first lane that has one, with the run's failing tests", () => {
        const failures = { tests: [{ shard: "layout", file: "x", name: "y" }], failedBefore: ["layout: x > y"] };
        const plan = bisectPlan({ red: ["ci", "hosts"], sha: "bad", good: "good", run: 9, failures });
        assert.deepEqual(plan.inputs, {
            lane: "ci",
            good: "good",
            bad: "bad",
            run_id: "9",
            targets: JSON.stringify(failures.tests),
            failed_before: JSON.stringify(failures.failedBefore),
        });
        const t4 = bisectPlan({ red: ["audit", "t4"], sha: "bad", good: "good", run: 9, failures });
        assert.deepEqual([t4.inputs.lane, t4.inputs.targets], ["gpu", "[]"], "a lane bisect runs the whole lane");
        assert.match(bisectPlan({ red: ["ci"], sha: "bad", good: "", run: 9, failures }).why, /no green full run/);
        assert.match(bisectPlan({ red: ["audit"], sha: "bad", good: "g", run: 9, failures }).why, /no bisect/);
    });
});

describe("greenCloses", () => {
    const history = { new: ["new", "abc1234", "old"], old: ["old"] };
    const isAncestor = (a, b) => history[b].includes(a);
    it("closes the red issue only from a green commit that contains the red one", () => {
        assert.equal(greenCloses("Full run red: CI on abc1234", "new", isAncestor), true);
        assert.equal(greenCloses("Full run red: CI on abc1234", "old", isAncestor), false);
        assert.equal(greenCloses("Something else", "new", isAncestor), false);
    });
});

describe("bisectPlan's targets", () => {
    it("names at most 100 failing tests, so the dispatch input stays under GitHub's limit", () => {
        const tests = Array.from({ length: 1000 }, (_, i) => ({ shard: "s", file: `f${i}.test.ts`, name: "t" }));
        const plan = bisectPlan({ red: ["ci"], sha: "b", good: "g", run: 1, failures: { tests, failedBefore: [] } });
        assert.equal(JSON.parse(plan.inputs.targets).length, 100);
        assert.ok(plan.inputs.targets.length < 65_535);
        const failedBefore = tests.map((t) => `${t.shard}: ${t.file} > ${t.name}`);
        const both = bisectPlan({ red: ["ci"], sha: "b", good: "g", run: 1, failures: { tests, failedBefore } });
        assert.equal(JSON.parse(both.inputs.failed_before).length, 100, "only the capped targets' ids");
    });
});

describe("bestEffort", () => {
    it("returns the side effect's value, or the fallback when it throws, so the verdict is still recorded", () => {
        assert.equal(
            bestEffort(
                () => 7,
                "x",
                () => null,
            ),
            7,
        );
        const got = bestEffort(
            () => {
                throw new Error("HTTP 403: rate limit exceeded\nmore");
            },
            "filing the red issue",
            (why) => `fallback: ${why}`,
        );
        assert.equal(got, "fallback: HTTP 403: rate limit exceeded");
    });
});

describe("lane-red: the red issue the moment one lane ends red", () => {
    it("files nothing for a run whose red issue a fixing merge just closed, since release-due cancels it", () => {
        const now = Date.parse("2026-10-25T12:00:00Z");
        const closed = [
            {
                number: 9001,
                title: "Full run red: CI on abcdef1",
                closedAt: "2026-10-25T11:50:00Z",
                stateReason: "completed",
            },
        ];
        assert.equal(fixedRecently(closed, "abcdef1234", now), 9001);
        const dup = [{ ...closed[0], stateReason: "not_planned" }];
        assert.equal(fixedRecently(dup, "abcdef1234", now), null, "a duplicate closed by fileRed is not a fix");
        assert.equal(fixedRecently(closed, "1234567890", now), null, "another commit's issue");
        assert.equal(fixedRecently(closed, "abcdef1234", now + 2 * 60 * 60 * 1000), null, "closed long ago");
    });

    it("keeps the oldest of two red issues lanes ending red together created, so both filers agree", () => {
        assert.equal(duplicateOf(78, [78, 77]), 77, "the newer closes as a duplicate of the older");
        assert.equal(duplicateOf(77, [78, 77]), null, "the older stays");
        assert.equal(duplicateOf(77, []), null, "a listing that has not caught up yet keeps the new one");
    });

    it("names only that lane, in the title release-due matches, and leaves the bisect to the verdict", () => {
        const { title, body } = laneRedIssue({ lane: "t4", result: "failure", sha: "abcdef1234", run: "https://run" });
        assert.equal(title, "Full run red: T4 GPU on abcdef1");
        assert.match(body, /candidate pick success, CI not finished, LLM regression not finished, T4 GPU failure/);
        assert.match(body, /the verdict updates this issue and starts any bisect/);
        assert.match(body, /`Fixes #<this issue>` closes it, cancels this run/);
        assert.match(body, /`Refs #<this issue>` restarts the full run after this run ends/);
    });

    // a fake gh on PATH: `api` lists the open issues it is given, every call is logged
    const runLaneRed = (openIssues, env = {}) => {
        const dir = mkdtempSync(join(tmpdir(), "lane-red-"));
        const log = join(dir, "calls.log");
        writeFileSync(join(dir, "issues.json"), JSON.stringify(openIssues));
        writeFileSync(
            join(dir, "gh"),
            `#!/bin/bash\necho "$*" >> "${log}"\nif [ "$1" = api ]; then jq -r "$4" "${join(dir, "issues.json")}"; fi\n` +
                `if [ "$1 $2" = "issue create" ]; then echo https://github.com/o/r/issues/77; fi\n`,
            { mode: 0o755 },
        );
        const r = spawnSync(process.execPath, ["tools/full-run.mjs", "lane-red"], {
            encoding: "utf8",
            env: {
                ...process.env,
                GITHUB_ACTOR: "graphty-release-scheduler[bot]", // a run release-rerun.yml sees end (#4359)
                PATH: `${dir}:${process.env.PATH}`,
                GITHUB_OUTPUT: "",
                LANE: "t4",
                RESULT: "failure",
                SHA: "abcdef1234",
                RUN_URL: "https://run",
                ...env,
            },
        });
        assert.equal(r.status, 0, r.stderr);
        let calls = "";
        try {
            calls = readFileSync(log, "utf8");
        } catch {
            // no gh call at all
        }
        return { calls, stdout: r.stdout };
    };

    it("updates the open red issue, found by a plain listing GitHub search does not lag behind, and opens none", () => {
        const { calls, stdout } = runLaneRed([
            { number: 5, title: "Release held: x" },
            { number: 9, title: "Full run red: CI on 1234567" },
        ]);
        assert.match(calls, /^api repos\/\{owner\}\/\{repo\}\/issues\?state=open&labels=priority:critical/m);
        assert.doesNotMatch(calls, /--search|issue create/);
        assert.match(calls, /^issue edit 9 --title Full run red: T4 GPU on abcdef1$/m);
        assert.match(calls, /^issue comment 9 --body-file /m);
        assert.match(stdout, /^issue=9$/m);
    });

    it("opens the issue when none is open, and leaves a lane with an owner item to the verdict", () => {
        const opened = runLaneRed([]);
        assert.match(
            opened.calls,
            /^issue create --title Full run red: T4 GPU on abcdef1 --label bug --label priority:critical/m,
        );
        assert.match(opened.stdout, /^issue=77$/m);
        assert.equal(runLaneRed([], { LANE: "llm", OWNER_ITEM: "the key was refused" }).calls, "");
    });

    it("files on attempt 1 of a restart dispatched with GITHUB_TOKEN, which is never re-run (#4359)", () => {
        const env = { RUN_ATTEMPT: "1", MODE: "restart", GITHUB_ACTOR: "github-actions[bot]" };
        assert.match(runLaneRed([], env).calls, /^issue create --title Full run red: T4 GPU on abcdef1/m);
    });
});

describe("the held candidate", () => {
    const C = "c1";
    const held = (recent) => ({ ...store(recent), hold: { base: C, head: C, issue: 4 } });
    it("tests the held head first while no run judged it, then leaves the slot to master", () => {
        let p = pick({ mode: "full", head: "h", store: held([]), firstParents, stray: code });
        assert.deepEqual([p.run, p.sha, p.held], [true, C, C]);
        p = pick({ mode: "full", head: "h", store: held([{ sha: C, state: "red" }]), firstParents, stray: code });
        assert.deepEqual([p.run, p.sha, p.held], [true, "c3", C], "the master slot still runs, under the hold");
        assert.equal(pick({ mode: "full", head: "h", store: store([]), firstParents, stray: code }).held, "");
        assert.equal(pick({ mode: "full", head: "h", store: null, firstParents, stray: code }).held, "unknown");
    });
    it("ignores a deferred verdict: a re-run that never ran leaves its commit to be tested again", () => {
        let p = pick({
            mode: "full",
            head: "h",
            store: held([{ sha: C, state: "deferred" }]),
            firstParents,
            stray: code,
        });
        assert.deepEqual([p.run, p.sha], [true, C], "the held head is not judged yet");
        p = pick({
            mode: "full",
            head: "h",
            store: store([{ sha: "c3", state: "deferred" }]),
            firstParents,
            stray: code,
        });
        assert.deepEqual([p.run, p.sha], [true, "c3"]);
        p = pick({ mode: "full", head: "h", store: store([{ sha: "c3", state: "red" }]), firstParents, stray: code });
        assert.equal(p.run, false, "a decided red is judged");
    });
    it("holds a deciding run that is not green-clean, updates the held head and leaves every other commit", () => {
        assert.equal(holdAction({ held: "", sha: "s", state: "red" }), "start");
        assert.equal(holdAction({ held: "", sha: "s", state: "green-images" }), "start");
        assert.equal(holdAction({ held: "", sha: "s", state: "green-clean" }), "none");
        assert.equal(holdAction({ held: "s", sha: "s", state: "green-clean" }), "update");
        assert.equal(holdAction({ held: "t", sha: "s", state: "red" }), "none", "a master slot never replaces it");
        assert.equal(holdAction({ held: "unknown", sha: "s", state: "red" }), "none");
    });
    it("re-tests a head that fixes moved past the held commit, and mode candidate never tests master", () => {
        const moved = (recent) => ({ ...store(recent), hold: { base: C, head: "h2", issue: 4 } });
        const p = pick({
            mode: "candidate",
            head: "h",
            store: moved([{ sha: C, state: "red" }]),
            firstParents,
            stray: code,
        });
        assert.deepEqual([p.run, p.sha, p.forward], [true, "h2", C]);
        assert.equal(pick({ mode: "full", head: "h", store: held([]), firstParents, stray: code }).forward, "");
        const judged = moved([{ sha: "h2", state: "red" }]);
        assert.equal(pick({ mode: "candidate", head: "h", store: judged, firstParents, stray: code }).run, false);
        assert.equal(pick({ mode: "candidate", head: "h", store: store([]), firstParents, stray: code }).run, false);
    });
    it("passes a lane the fixes do not reach", () => {
        assert.equal(verdictOf({ ...ALL_GREEN, hosts: "unaffected" }, 0).state, "green-clean");
    });
});

describe("same-commit re-run", () => {
    const red = (lanes) => ({ ...ALL_GREEN, ...lanes });
    it("defers only attempt 1 of a re-runnable mode, red on lanes a re-run of failed jobs runs again", () => {
        const t4 = { state: "red", red: ["t4"], lanes: red({ t4: "failure" }) };
        assert.equal(deferred({ attempt: 1, mode: "full", ...t4 }), true);
        assert.equal(deferred({ attempt: 1, mode: "restart", ...t4 }), true);
        assert.equal(
            deferred({ attempt: 1, mode: "restart", actor: "github-actions[bot]", ...t4 }),
            false,
            "a GITHUB_TOKEN dispatch is never re-run (#4359)",
        );
        assert.equal(deferred({ attempt: 2, mode: "full", ...t4 }), false, "the re-run decides");
        assert.equal(deferred({ attempt: 1, mode: "legacy", ...t4 }), false);
        assert.equal(
            deferred({ attempt: 1, mode: "full", state: "red", red: ["pick"], lanes: red({ pick: "failure" }) }),
            false,
        );
        const missing = { state: "red", red: ["captures"], lanes: red({ captures: "missing for graphty" }) };
        assert.equal(deferred({ attempt: 1, mode: "full", ...missing }), false, "nothing to re-run");
        const recapture = {
            ...missing,
            red: ["captures", "recapture"],
            lanes: { ...missing.lanes, recapture: "failure" },
        };
        assert.equal(deferred({ attempt: 1, mode: "full", ...recapture }), true);
        assert.equal(deferred({ attempt: 1, mode: "full", state: "green-images", red: [], lanes: ALL_GREEN }), false);
    });
    it("calls a lane flaky when it was red before and passed on the re-run", () => {
        assert.deepEqual(flakyLanes(["ci", "t4"], ["ci"]), ["t4"]);
        assert.deepEqual(flakyLanes([], []), []);
    });

    // the verdict as release.yml runs it, with a fake gh that logs every call and lists no open issue
    // openIssues: what the gh listing of priority:critical issues returns
    const runVerdict = (env, { flaky = null, before = null, openIssues = [] } = {}) => {
        const dir = mkdtempSync(join(tmpdir(), "verdict-"));
        const log = join(dir, "calls.log");
        writeFileSync(join(dir, "issues.json"), JSON.stringify(openIssues));
        writeFileSync(
            join(dir, "gh"),
            `#!/bin/bash\necho "$*" >> "${log}"\nif [ "$1" = api ]; then jq -r "$4" "${join(dir, "issues.json")}"; fi\n` +
                `if [ "$1 $2" = "issue create" ]; then echo https://github.com/o/r/issues/88; fi\n`,
            {
                mode: 0o755,
            },
        );
        const captures = join(dir, "visual");
        const projects = Object.keys(JSON.parse(readFileSync("visual-review.config.json", "utf8")).projects);
        for (const p of projects) {
            mkdirSync(join(captures, `visual-${p}-1`), { recursive: true });
            writeFileSync(
                join(captures, `visual-${p}-1`, "results.json"),
                JSON.stringify({ complete: true, items: [] }),
            );
        }
        if (flaky) writeFileSync(join(captures, `visual-${projects[0]}-1`, "flaky.json"), JSON.stringify(flaky));
        if (before) writeFileSync(join(dir, "verdict-1.json"), JSON.stringify(before));
        const out = join(dir, "out");
        writeFileSync(out, "");
        const r = spawnSync(process.execPath, ["tools/full-run.mjs", "verdict"], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${dir}:${process.env.PATH}`,
                RESULTS_URL: "",
                HEALTH_API_URL: "",
                GITHUB_OUTPUT: out,
                SHA: "abcdef1234",
                GOOD: "",
                RUN_ID: "5",
                RUN_URL: "https://run",
                CAPTURES: captures,
                RECORDS: dir,
                RECORD: join(dir, `verdict-${env.RUN_ATTEMPT}.json`),
                MODE: "full",
                HELD: "",
                // the scheduler's dispatch, which release-rerun.yml sees end
                GITHUB_ACTOR: "graphty-release-scheduler[bot]",
                ...env,
            },
        });
        assert.equal(r.status, 0, r.stderr);
        let calls = "";
        try {
            calls = readFileSync(log, "utf8");
        } catch {
            // no gh call at all
        }
        const outputs = Object.fromEntries(
            readFileSync(out, "utf8")
                .trim()
                .split("\n")
                .map((l) => l.split(/=(.*)/s).slice(0, 2)),
        );
        return {
            calls,
            outputs,
            record: JSON.parse(readFileSync(join(dir, `verdict-${env.RUN_ATTEMPT}.json`), "utf8")),
        };
    };
    const lanesJson = (over = {}) => JSON.stringify({ ...ALL_GREEN, captures: undefined, ...over });

    it("files nothing on attempt 1 red on a lane, records it for the re-run, and holds nothing yet", () => {
        const v = runVerdict({ RUN_ATTEMPT: "1", LANES: lanesJson({ t4: "failure" }) });
        assert.equal(v.calls, "", "no red issue, no bisect");
        assert.deepEqual([v.outputs.state, v.outputs.deferred, v.outputs.hold], ["red", "true", "none"]);
        assert.deepEqual([v.record.deferred, v.record.red], [true, ["t4"]]);
    });
    it("files a lane green on the re-run, and a story the re-capture found flaky, as flaky, and blocks on neither", () => {
        const v = runVerdict(
            { RUN_ATTEMPT: "2", LANES: lanesJson() },
            { before: { red: ["t4"] }, flaky: [{ file: "a--b.png", why: "matched its baseline" }] },
        );
        assert.equal(v.outputs.state, "green-clean");
        assert.match(
            v.calls,
            /^issue create --title Flaky in full run: T4 GPU --label bug --label priority:critical --label effort:medium/m,
        );
        assert.match(v.calls, /^issue create --title Flaky in full run: [a-z-]+\/a--b\.png --label bug/m);
        assert.doesNotMatch(v.calls, /issue create --title Full run red/);
    });
    it("holds a deciding red run, and decides at once when attempt 1 has nothing to re-run", () => {
        const v = runVerdict({ RUN_ATTEMPT: "2", LANES: lanesJson({ t4: "failure" }) }, { before: { red: ["t4"] } });
        assert.deepEqual([v.outputs.state, v.outputs.deferred, v.outputs.hold], ["red", "false", "start"]);
        assert.match(v.calls, /^issue create --title Full run red: T4 GPU on abcdef1/m);
        const other = runVerdict({ RUN_ATTEMPT: "2", LANES: lanesJson({ t4: "failure" }), HELD: "f".repeat(40) });
        assert.equal(other.outputs.hold, "none", "another commit is held: a master slot never replaces it");
    });
    // #4359: release-due dispatches restarts with GITHUB_TOKEN, and GitHub starts no release-rerun.yml for such a
    // run, so a deferred attempt-1 red was never filed and never bisected
    const restart = (openIssues) =>
        runVerdict(
            {
                RUN_ATTEMPT: "1",
                MODE: "restart",
                GITHUB_ACTOR: "github-actions[bot]",
                GOOD: "1111111111",
                LANES: lanesJson({ ci: "failure" }),
            },
            { openIssues },
        );
    it("files a new red issue and bisects when a restart whose red issue a fix closed goes red again", () => {
        const v = restart([]);
        assert.deepEqual([v.outputs.state, v.outputs.deferred, v.outputs.issue], ["red", "false", "88"]);
        assert.match(v.calls, /^issue create --title Full run red: CI on abcdef1 --label bug/m);
        assert.match(
            v.calls,
            /^workflow run bisect\.yml --ref master -f lane=ci -f good=1111111111 -f bad=abcdef1234/m,
        );
        assert.equal(v.record.deferred, false);
    });
    it("updates the still-open red issue and bisects when a restart goes red again", () => {
        const v = restart([{ number: 4302, title: "Full run red: CI on 5f7c540" }]);
        assert.deepEqual([v.outputs.state, v.outputs.deferred, v.outputs.issue], ["red", "false", "4302"]);
        assert.match(v.calls, /^issue edit 4302 --title Full run red: CI on abcdef1$/m);
        assert.match(v.calls, /^issue comment 4302 --body-file /m);
        assert.doesNotMatch(v.calls, /issue create/);
        assert.match(v.calls, /^workflow run bisect\.yml --ref master -f lane=ci /m);
    });
    it("still defers a red attempt 1 of a full run the scheduler dispatched, and files it on the re-run", () => {
        const lanes = lanesJson({ ci: "failure" });
        const first = runVerdict({ RUN_ATTEMPT: "1", GOOD: "1111111111", LANES: lanes });
        assert.deepEqual([first.outputs.deferred, first.calls], ["true", ""]);
        const second = runVerdict({ RUN_ATTEMPT: "2", GOOD: "1111111111", LANES: lanes }, { before: { red: ["ci"] } });
        assert.match(second.calls, /^issue create --title Full run red: CI on abcdef1/m);
        assert.match(second.calls, /^workflow run bisect\.yml --ref master -f lane=ci /m);
    });
    it("reports a held head past its commit only on the hold issue: no red issue, no bisect", () => {
        const sha = "abcdef1234";
        const v = runVerdict({
            RUN_ATTEMPT: "2",
            LANES: lanesJson({ t4: "failure" }),
            HELD: sha,
            FORWARD: "c".repeat(40),
        });
        assert.deepEqual([v.outputs.state, v.outputs.hold, v.outputs.issue], ["red", "update", ""]);
        assert.doesNotMatch(v.calls, /Full run red|bisect/);
        assert.equal(v.record.forward, true);
    });
});

describe("lane-red on attempt 1", () => {
    it("files nothing: the verdict decides after the one re-run", () => {
        const r = spawnSync(process.execPath, ["tools/full-run.mjs", "lane-red"], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: "/nonexistent",
                LANE: "t4",
                RESULT: "failure",
                RUN_ATTEMPT: "1",
                MODE: "full",
                GITHUB_ACTOR: "graphty-release-scheduler[bot]",
            },
        });
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.stdout, /the verdict decides after the one same-commit re-run/);
    });
});

describe("the verdict reads the hold from the store when it decides", () => {
    // full-run.mjs verdict against a stand-in store holding `hold`, with a gh that only logs
    async function verdictWithStore({ hold, lanes, attempt = "2", pickHeld = "" }) {
        const { createServer } = await import("node:http");
        const { spawn } = await import("node:child_process");
        const posts = [];
        const server = createServer((req, res) => {
            let body = "";
            req.on("data", (d) => (body += d));
            req.on("end", () => {
                if (req.method === "POST") posts.push({ url: req.url, body: JSON.parse(body) });
                res.setHeader("content-type", "application/json");
                res.end(JSON.stringify(req.method === "POST" ? { stored: true } : { hold, recent: [] }));
            });
        });
        await new Promise((r) => server.listen(0, "127.0.0.1", r));
        const dir = mkdtempSync(join(tmpdir(), "verdict-store-"));
        writeFileSync(join(dir, "gh"), "#!/bin/bash\nexit 0\n", { mode: 0o755 });
        const captures = join(dir, "visual");
        for (const p of Object.keys(JSON.parse(readFileSync("visual-review.config.json", "utf8")).projects)) {
            mkdirSync(join(captures, `visual-${p}-1`), { recursive: true });
            writeFileSync(
                join(captures, `visual-${p}-1`, "results.json"),
                JSON.stringify({ complete: true, items: [] }),
            );
        }
        const out = join(dir, "out");
        writeFileSync(out, "");
        const code = await new Promise((resolve) => {
            const child = spawn(process.execPath, ["tools/full-run.mjs", "verdict"], {
                stdio: "ignore",
                env: {
                    ...process.env,
                    GITHUB_ACTOR: "graphty-release-scheduler[bot]", // a run release-rerun.yml sees end (#4359)
                    PATH: `${dir}:${process.env.PATH}`,
                    RESULTS_URL: `http://127.0.0.1:${server.address().port}`,
                    GRAPHTY_RESULTS_TOKEN: "t",
                    HEALTH_API_URL: "",
                    GITHUB_OUTPUT: out,
                    SHA: "a".repeat(40),
                    GOOD: "",
                    RUN_ID: "5",
                    RUN_URL: "https://run",
                    CAPTURES: captures,
                    RECORDS: dir,
                    RECORD: join(dir, "record.json"),
                    MODE: "full",
                    RUN_ATTEMPT: attempt,
                    HELD: pickHeld,
                    LANES: JSON.stringify({ ...ALL_GREEN, captures: undefined, ...lanes }),
                },
            });
            child.on("close", resolve);
        });
        server.close();
        const outputs = Object.fromEntries(
            readFileSync(out, "utf8")
                .trim()
                .split("\n")
                .map((l) => l.split(/=(.*)/s).slice(0, 2)),
        );
        return { code, outputs, posts };
    }

    it("starts no second hold when another run held its commit after this run's pick (run 40457379258)", async () => {
        const other = "e".repeat(40);
        const v = await verdictWithStore({ hold: { base: other, head: other, issue: 3994 }, lanes: { t4: "failure" } });
        assert.equal(v.code, 0);
        assert.deepEqual([v.outputs.state, v.outputs.held, v.outputs.hold], ["red", other, "none"]);
    });
    it("hands the promotion the hold the store has now, so a green-clean commit never promotes past it", async () => {
        const other = "e".repeat(40);
        const v = await verdictWithStore({ hold: { base: other, head: other, issue: 3994 }, lanes: {} });
        assert.deepEqual([v.outputs.state, v.outputs.held], ["green-clean", other]);
    });
    it("records a deferred red as deferred, which the pick does not take as judged", async () => {
        const v = await verdictWithStore({ hold: null, lanes: { t4: "failure" }, attempt: "1" });
        assert.equal(v.outputs.deferred, "true");
        const verdict = v.posts.find((p) => p.url === "/v1/verdicts");
        assert.equal(verdict.body.state, "deferred");
    });
});

describe("file-deferred", () => {
    it("files nothing when a fix closed the commit's red issue in the last hour (release-due cancelled the run)", () => {
        const dir = mkdtempSync(join(tmpdir(), "file-deferred-"));
        const log = join(dir, "calls.log");
        const sha = "abcdef1234";
        const closed = JSON.stringify({
            number: 77,
            title: `Full run red: T4 GPU on ${sha.slice(0, 7)}`,
            state: "CLOSED",
            closedAt: new Date().toISOString(),
            stateReason: "completed",
        });
        writeFileSync(
            join(dir, "gh"),
            `#!/bin/bash\necho "$*" >> "${log}"\n[[ "$*" == *state=closed* ]] && echo '${closed}'\nexit 0\n`,
            { mode: 0o755 },
        );
        const record = join(dir, "verdict-1.json");
        writeFileSync(
            record,
            JSON.stringify({ sha, good: "", runId: "5", runUrl: "u", red: ["t4"], lanes: {}, deferred: true }),
        );
        const r = spawnSync(process.execPath, ["tools/full-run.mjs", "file-deferred", record], {
            encoding: "utf8",
            env: {
                ...process.env,
                GITHUB_ACTOR: "graphty-release-scheduler[bot]", // a run release-rerun.yml sees end (#4359)
                PATH: `${dir}:${process.env.PATH}`,
                RESULTS_URL: "",
                HEALTH_API_URL: "",
                GITHUB_OUTPUT: "",
            },
        });
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.stdout, /^fixed=77$/m);
        assert.doesNotMatch(readFileSync(log, "utf8"), /issue create|workflow run bisect/);
    });
});
