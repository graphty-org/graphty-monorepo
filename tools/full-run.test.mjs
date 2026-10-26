// Tests of tools/full-run.mjs: the full run's candidate pick and its verdict (channels design, sections 5 and 6).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { execFileSync } from "node:child_process";

import {
    bestEffort,
    bisectPlan,
    differingImages,
    greenCloses,
    isOnNightly,
    LANES,
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
        assert.equal(verdictOf(ALL_GREEN, null).state, "green-images", "no capture is not a clean capture");
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
});

describe("verdictOf: the pick and the version dry run", () => {
    it("is red on a failed pick alone, whatever the skipped lanes say", () => {
        const skipped = Object.fromEntries(Object.keys(LANES).map((l) => [l, "skipped"]));
        assert.deepEqual(verdictOf({ ...skipped, pick: "failure" }, null), { state: "red", red: ["pick"] });
        assert.equal(verdictOf({ ...ALL_GREEN, pick: "success" }, 0).state, "green-clean");
    });

    it("is an owner item when only the dry run failed on held projects", () => {
        const lanes = { ...ALL_GREEN, version_dry_run: "failure" };
        assert.equal(verdictOf(lanes, 0, "", "graphty-element").state, "owner-item");
        assert.equal(verdictOf(lanes, 0, "", "").state, "red", "a dry run that failed otherwise is red");
        assert.equal(verdictOf({ ...lanes, ci: "failure" }, 0, "", "graphty-element").state, "red");
    });

    it("plans no bisect for a failed pick", () => {
        assert.match(bisectPlan({ red: ["pick"], sha: "s", good: "g", run: 1, failures: null }).why, /candidate pick/);
    });
});

describe("differingImages", () => {
    it("counts the items of every capture that are not unchanged or excluded", () => {
        const dir = mkdtempSync(join(tmpdir(), "full-run-"));
        assert.equal(differingImages(dir), null);
        for (const [p, items] of [
            ["visual-layout-1", [{ status: "unchanged" }, { status: "changed" }]],
            ["visual-graphty-1", [{ status: "excluded" }, { status: "new" }, { status: "unchanged" }]],
        ]) {
            mkdirSync(join(dir, p));
            writeFileSync(join(dir, p, "results.json"), JSON.stringify({ items }));
        }
        assert.equal(differingImages(dir), 2);
        // a re-run's newer attempt replaces the older one's capture of the same project
        mkdirSync(join(dir, "visual-layout-2"));
        writeFileSync(
            join(dir, "visual-layout-2", "results.json"),
            JSON.stringify({ items: [{ status: "unchanged" }] }),
        );
        assert.equal(differingImages(dir), 1);
        assert.equal(differingImages(join(dir, "missing")), null);
        // another file ending in results.json is not the capture's
        writeFileSync(
            join(dir, "visual-layout-2", "flaky-results.json"),
            JSON.stringify({ items: [{ status: "new" }] }),
        );
        assert.equal(differingImages(dir), 1);
        // a project whose capture wrote no results.json is not clean
        assert.equal(differingImages(dir, ["layout", "graphty"]), 1);
        assert.equal(differingImages(dir, ["layout", "graphty", "compact-mantine"]), null);
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
        assert.match(body, /Refs #<this issue>/);
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
