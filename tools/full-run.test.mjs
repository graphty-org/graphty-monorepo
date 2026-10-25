// Tests of tools/full-run.mjs: the full run's candidate pick and its verdict (channels design, sections 5 and 6).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { bisectPlan, differingImages, LANES, pick, redIssue, verdictOf } from "./full-run.mjs";

// master's first parents, newest first: c3 <- c2 <- c1 <- c0
const CHAIN = ["c3", "c2", "c1", "c0"];
const firstParents = (sha) => CHAIN.slice(CHAIN.indexOf(sha));
const code = () => ["tools/x.mjs: not a package.json or a CHANGELOG.md"];
const store = (recent, sha = "c3") => ({ candidate: { sha, builtAt: 1 }, recent });

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

    it("finds the last green commit for the bisect, past a red one", () => {
        const recent = [
            { sha: "c2", state: "red" },
            { sha: "c0", state: "green-images" },
        ];
        const p = pick({ mode: "full", head: "h", store: store(recent), firstParents, stray: code });
        assert.deepEqual([p.run, p.sha, p.good], [true, "c3", "c0"]);
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
