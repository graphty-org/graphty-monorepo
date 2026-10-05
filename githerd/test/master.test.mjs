import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../lib/config.mjs";
import {
    buildFiles,
    rangeMissesLanes,
    findSuspects,
    masterVerdict,
    releaseState,
    SIGHTING_MEMORY,
    sightRuns,
    stuckLaneRuns,
    updateLane,
} from "../lib/master.mjs";
import { fixture } from "./helpers/fake-gh.mjs";

// graphty's real lanes: ci and gpu required, hosts path-filtered, release watched.
const CONFIG = normalizeConfig(JSON.parse(readFileSync(new URL("../../githerd.config.json", import.meta.url), "utf8")));
const T0 = Date.parse("2026-10-02T15:00:00Z");
const MIN = 60_000;

/**
 * A workflow run as the runs endpoint returns it.
 * @param {number} id run id
 * @param {string} sha head sha
 * @param {string | null} conclusion null while not completed
 * @param {{attempt?: number, status?: string}} [o] attempt and status
 * @returns {import("../lib/master.mjs").WorkflowRun} the run
 */
const run = (id, sha, conclusion, { attempt = 1, status } = {}) => ({
    id,
    run_attempt: attempt,
    head_sha: sha,
    status: status ?? (conclusion === null ? "in_progress" : "completed"),
    conclusion,
    updated_at: "2026-10-02T15:00:00Z",
});

/**
 * Feeds a sequence of polls to one lane.
 * @param {string} name lane id
 * @param {import("../lib/master.mjs").WorkflowRun[][]} polls each poll's runs
 * @param {number} [step] milliseconds between polls
 * @returns {{lane: import("../lib/master.mjs").LaneRecord, events: object[][]}} the last record and every poll's events
 */
function polls(name, polls, step = 3 * MIN) {
    let lane;
    const events = [];
    polls.forEach((runs, i) => {
        const r = updateLane(name, lane, runs, CONFIG, T0 + i * step);
        lane = r.lane;
        events.push(r.events);
    });
    return { lane, events };
}

/**
 * A commit as the commits endpoint returns it.
 * @param {string} sha the sha
 * @param {string | null} parent first parent
 * @param {string} [message] commit message
 * @param {string} [date] committer date
 * @returns {import("../lib/master.mjs").Commit} the commit
 */
const commit = (sha, parent, message = `fix: ${sha}`, date = "2026-10-02T12:00:00Z") => ({
    sha,
    parents: parent ? [{ sha: parent }] : [],
    commit: { message, committer: { date } },
});

describe("updateLane", () => {
    it("picks the newest completed run from the real runs response", () => {
        const body = JSON.parse(
            fixture("runs-200.http")
                .split(/\r?\n\r?\n/)
                .slice(1)
                .join("\n\n"),
        );
        const { lane, events } = updateLane("ci", undefined, body.workflow_runs, CONFIG, T0);
        expect(lane).toMatchObject({
            runId: 37026209323,
            attempt: 1,
            verdict: "green",
            sha: body.workflow_runs[0].head_sha,
        });
        expect(events.map((e) => e.event)).toEqual(["lane-green"]);
    });

    it("picks the newest completed run, not the newest run", () => {
        const { lane } = polls("ci", [[run(12, "c", null), run(11, "b", "success"), run(10, "a", "failure")]]);
        expect(lane).toMatchObject({ runId: 11, sha: "b", verdict: "green" });
        expect(lane.inFlight["12"]).toMatchObject({ sha: "c" });
    });

    it("ignores an older run id than the saved one", () => {
        const { lane } = polls("ci", [[run(11, "b", "success")], [run(10, "a", "failure")], [run(10, "a", "failure")]]);
        expect(lane).toMatchObject({ runId: 11, verdict: "green", pendingRed: null });
    });

    it("needs two consecutive sightings for red", () => {
        const { lane, events } = polls("ci", [
            [run(10, "a", "success")],
            [run(11, "b", "failure"), run(10, "a", "success")],
            [run(11, "b", "failure")],
        ]);
        expect(events[1]).toEqual([]);
        expect(events[2]).toMatchObject([{ event: "lane-red", lane: "ci", runId: 11, sha: "b" }]);
        expect(lane.verdict).toBe("red");
        expect(polls("ci", [[run(11, "b", "failure")]]).lane.verdict).toBe("unknown");
    });

    it("drops a red sighting that a green run follows", () => {
        const { lane, events } = polls("ci", [
            [run(11, "b", "failure")],
            [run(12, "c", "success")],
            [run(12, "c", "success")],
        ]);
        expect(lane.verdict).toBe("green");
        expect(events.flat().map((e) => e.event)).toEqual(["lane-green"]);
    });

    it("accepts green on the first sighting and does not repeat the event", () => {
        const { events } = polls("ci", [
            [run(11, "b", "failure")],
            [run(11, "b", "failure")],
            [run(12, "c", "success")],
            [run(12, "c", "success")],
        ]);
        expect(events.map((e) => e.map((x) => x.event))).toEqual([[], ["lane-red"], ["lane-green"], []]);
    });

    it("lets a re-run with a higher attempt replace the old answer", () => {
        const { lane, events } = polls("ci", [
            [run(11, "b", "failure")],
            [run(11, "b", "failure")],
            [run(11, "b", "success", { attempt: 2 })],
            [run(11, "b", "failure", { attempt: 1 })],
        ]);
        expect(lane).toMatchObject({ runId: 11, attempt: 2, verdict: "green" });
        expect(events[2]).toMatchObject([{ event: "lane-green", attempt: 2 }]);
    });

    it("keeps the verdict when the newest gpu run was cancelled", () => {
        const green = polls("gpu", [[run(10, "a", "success")], [run(11, "b", "cancelled"), run(10, "a", "success")]]);
        expect(green.lane).toMatchObject({ runId: 11, conclusion: "cancelled", verdict: "green" });
        const red = polls("gpu", [[run(10, "a", "failure")], [run(10, "a", "failure")], [run(11, "b", "cancelled")]]);
        expect(red.lane.verdict).toBe("red");
        expect(red.events[2]).toEqual([]);
    });

    it("reports a run queued past maxMinutes once", () => {
        const queued = run(20, "q", null, { status: "queued" });
        // gpu's maxMinutes is 240; polls an hour apart.
        const { lane, events } = polls(
            "gpu",
            [[queued], [queued], [queued], [queued], [queued], [queued], [queued]],
            60 * MIN,
        );
        const stuck = events.flat().filter((e) => e.event === "lane-stuck");
        expect(stuck).toEqual([
            {
                event: "lane-stuck",
                lane: "gpu",
                runId: 20,
                sha: "q",
                firstSeenAt: "2026-10-02T15:00:00.000Z",
                minutes: 300,
            },
        ]);
        expect(lane.inFlight["20"].reportedAt).toBe("2026-10-02T20:00:00.000Z");
        // A finished run leaves inFlight.
        expect(updateLane("gpu", lane, [run(20, "q", "success")], CONFIG, T0 + 7 * 60 * MIN).lane.inFlight).toEqual({});
    });

    it("never reports a stuck run on a watched lane", () => {
        const queued = run(30, "r", null, { status: "queued" });
        const { events } = polls("release", [[queued], [queued]], 600 * MIN);
        expect(events.flat()).toEqual([]);
    });
});

describe("stuckLaneRuns", () => {
    it("lists gating lanes' runs past their maxMinutes, with the 180 minute default", () => {
        const at = (m) => new Date(T0 - m * MIN).toISOString();
        const lanes = {
            ci: { inFlight: { 1: { sha: "a", firstSeenAt: at(181) }, 2: { sha: "b", firstSeenAt: at(10) } } },
            gpu: { inFlight: { 3: { sha: "a", firstSeenAt: at(200) } } },
            release: { inFlight: { 4: { sha: "a", firstSeenAt: at(900) } } },
        };
        expect(stuckLaneRuns(lanes, CONFIG, T0)).toEqual([
            { lane: "ci", runId: 1, sha: "a", firstSeenAt: at(181), minutes: 181 },
        ]);
    });
});

/**
 * Lane records over a commit chain.
 * @param {Record<string, string>} ci ci's outcome per sha
 * @param {Record<string, string>} gpu gpu's outcome per sha
 * @param {Record<string, string>} [hosts] hosts' outcome per sha
 * @param {Record<string, string>} [verdicts] lane verdicts other than the defaults
 * @returns {Record<string, object>} the lane records
 */
const lanesOf = (ci, gpu, hosts = {}, verdicts = {}) => ({
    ci: { verdict: verdicts.ci ?? "green", shas: ci, inFlight: {} },
    gpu: { verdict: verdicts.gpu ?? "green", shas: gpu, inFlight: {} },
    hosts: { verdict: verdicts.hosts ?? "unknown", shas: hosts, inFlight: {} },
});
const CHAIN = [commit("c3", "c2"), commit("c2", "c1"), commit("c1", "c0"), commit("c0", null)];

describe("masterVerdict", () => {
    it("is unknown until every required lane has an answer", () => {
        expect(masterVerdict({}, CONFIG, { headSha: "c3", commits: CHAIN }).verdict).toBe("unknown");
    });

    it("is green with hosts absent, and greenSha the head", () => {
        const lanes = lanesOf({ c3: "green" }, { c3: "green" });
        expect(masterVerdict(lanes, CONFIG, { headSha: "c3", commits: CHAIN })).toEqual({
            verdict: "green",
            greenSha: "c3",
            pending: false,
        });
    });

    it("is red when any gating lane is red, hosts included", () => {
        expect(
            masterVerdict(lanesOf({}, {}, {}, { gpu: "red" }), CONFIG, { headSha: "c3", commits: CHAIN }).verdict,
        ).toBe("red");
        expect(
            masterVerdict(lanesOf({}, {}, {}, { hosts: "red" }), CONFIG, { headSha: "c3", commits: CHAIN }).verdict,
        ).toBe("red");
    });

    it("keeps greenSha on the verified commit while newer ones are in flight", () => {
        const lanes = lanesOf(
            { c3: "running", c2: "green", c1: "green" },
            { c3: "running", c2: "neutral", c1: "green" },
            { c2: "green", c1: "green" },
        );
        // c3 is still running and c2's gpu run was cancelled by the push of c3.
        expect(masterVerdict(lanes, CONFIG, { headSha: "c3", commits: CHAIN })).toEqual({
            verdict: "green",
            greenSha: "c1",
            pending: true,
        });
    });

    it("falls back to the last known greenSha when no given commit is verified", () => {
        const lanes = lanesOf({ c3: "running" }, { c3: "running" });
        expect(masterVerdict(lanes, CONFIG, { headSha: "c3", commits: CHAIN, greenSha: "old" })).toMatchObject({
            greenSha: "old",
            pending: true,
        });
    });
});

describe("findSuspects", () => {
    it("walks the first-parent chain from the red commit back to the last green one", () => {
        const commits = [
            commit("m3", "m2", "Merge pull request #718 from graphty-org/fix/x\n\nbody"),
            commit("side", "m1", "fix: on the branch"),
            commit("m2", "m1", "fix(graphty-element): squashed (#710)"),
            commit("m1", "m0"),
            commit("m0", null),
        ];
        commits[0].parents.push({ sha: "side" });
        expect(findSuspects(commits, "m1", "m3")).toEqual([
            { sha: "m3", pr: 718 },
            { sha: "m2", pr: 710 },
        ]);
        expect(findSuspects(commits, "gone", "m1")).toEqual([
            { sha: "m1", pr: null },
            { sha: "m0", pr: null },
        ]);
    });
});

describe("buildFiles and rangeMissesLanes", () => {
    it("leaves out docs and a release commit's version bumps, and nothing a lane builds", () => {
        const files = [
            { filename: "layout/CHANGELOG.md", patch: "+## 1.3.3" },
            {
                filename: "layout/package.json",
                patch: '@@ -3 +3 @@\n-    "version": "1.3.2",\n+    "version": "1.3.3",',
            },
            {
                filename: "graph-format/package.json",
                patch: '@@ -9 +9 @@\n-    "tslib": "^2.6.0"\n+    "tslib": "^2.7.0"',
            },
            { filename: "algorithms/package.json" },
        ];
        expect(buildFiles(files)).toEqual(["graph-format/package.json", "algorithms/package.json"]);
        expect(rangeMissesLanes(buildFiles(files.slice(0, 2)), ["GPU"])).toBe(true);
        expect(rangeMissesLanes(["graph-format/package.json"], ["GPU"])).toBe(false);
        // CI can be broken by any file; an unread or cut list never clears a suspect.
        expect(rangeMissesLanes([], ["GPU", "CI"])).toBe(false);
        expect(rangeMissesLanes(null, ["GPU"])).toBe(false);
    });
});

describe("releaseState", () => {
    const REL = commit("r1", "c1", "chore(release): publish [skip ci]", "2026-10-02T10:00:00Z");
    const commits = [commit("c3", "c2"), commit("c2", "r1"), REL, commit("c1", "c0")];
    const saved = { lastRelease: { sha: "r1", at: "2026-10-02T10:00:00Z" }, releaseEligibleSince: null };

    it("reports a failed release run", () => {
        const lanes = { ...lanesOf({}, {}), release: { verdict: "red", shas: {}, inFlight: {} } };
        expect(releaseState(saved, lanes, CONFIG, commits, T0)).toMatchObject({
            failed: true,
            releaseEligibleSince: null,
            stalled: false,
        });
    });

    it("is eligible once a newer commit is green, and stalled after stallHours", () => {
        const lanes = lanesOf({ c2: "green" }, { c2: "green" });
        const first = releaseState(saved, lanes, CONFIG, commits, T0);
        expect(first).toEqual({
            lastRelease: { sha: "r1", at: "2026-10-02T10:00:00Z" },
            releaseEligibleSince: "2026-10-02T15:00:00.000Z",
            failed: false,
            stalled: false,
            stuckOnly: false,
        });
        const later = releaseState(first, lanes, CONFIG, commits, T0 + CONFIG.release.stallHours * 60 * MIN + 1);
        expect(later).toMatchObject({ releaseEligibleSince: first.releaseEligibleSince, stalled: true });
        // A new release commit restarts the clock.
        const released = [commit("r2", "c3", "chore(release): publish [skip ci]"), ...commits];
        expect(
            releaseState(first, lanes, CONFIG, released, T0 + (CONFIG.release.stallHours + 1) * 60 * MIN),
        ).toMatchObject({
            lastRelease: { sha: "r2" },
            releaseEligibleSince: null,
            stalled: false,
        });
    });

    it("counts a commit held only by a stuck lane run as eligible, and stalls on it", () => {
        const lanes = lanesOf({ c2: "green" }, { c2: "running" });
        lanes.gpu.inFlight = { 99: { sha: "c2", firstSeenAt: new Date(T0 - 241 * MIN).toISOString() } };
        const first = releaseState(saved, lanes, CONFIG, commits, T0);
        expect(first).toMatchObject({
            stuckOnly: true,
            releaseEligibleSince: "2026-10-02T15:00:00.000Z",
            stalled: false,
        });
        expect(
            releaseState(first, lanes, CONFIG, commits, T0 + (CONFIG.release.stallHours + 1) * 60 * MIN),
        ).toMatchObject({
            stuckOnly: true,
            stalled: true,
        });
        // Not yet stuck: nothing is eligible.
        lanes.gpu.inFlight[99].firstSeenAt = new Date(T0 - 10 * MIN).toISOString();
        expect(releaseState(saved, lanes, CONFIG, commits, T0)).toMatchObject({
            stuckOnly: false,
            releaseEligibleSince: null,
        });
    });

    it("does nothing without a release config", () => {
        expect(releaseState(saved, {}, { ...CONFIG, release: null }, commits, T0)).toEqual({
            lastRelease: null,
            releaseEligibleSince: null,
            failed: false,
            stalled: false,
            stuckOnly: false,
        });
    });
});

describe("sightRuns", () => {
    const run = (id, attempt, updated, extra = {}) => ({
        id,
        run_attempt: attempt,
        name: "CI",
        head_sha: `s${id}`,
        status: "completed",
        conclusion: "success",
        updated_at: `2026-10-02T${updated}:00Z`,
        ...extra,
    });
    const ids = (out) => out.sightings.map((r) => `${r.id}/${r.run_attempt}`);

    it("sees each new state once, oldest update first, and never a repeat", () => {
        const first = sightRuns({}, [run(12, 1, "10:05"), run(11, 1, "10:07")], "master");
        expect(ids(first)).toEqual(["12/1", "11/1"]);
        expect(first.record).toEqual({
            "CI@master": { 11: [1, "2026-10-02T10:07:00Z"], 12: [1, "2026-10-02T10:05:00Z"] },
        });
        expect(ids(sightRuns(first.record, [run(12, 1, "10:05"), run(11, 1, "10:07")], "master"))).toEqual([]);
    });

    it("sees a re-run's new attempt and a newer update, but not an older attempt", () => {
        const { record } = sightRuns({}, [run(12, 2, "10:05"), run(11, 1, "10:00")], "master");
        expect(ids(sightRuns(record, [run(11, 2, "11:00", { status: "in_progress" })], "master"))).toEqual(["11/2"]);
        expect(ids(sightRuns(record, [run(12, 2, "10:09")], "master"))).toEqual(["12/2"]);
        expect(ids(sightRuns(record, [run(12, 1, "10:30")], "master"))).toEqual([]);
    });

    it("discards an unseen run older than every run remembered for its workflow and branch", () => {
        const { record } = sightRuns({}, [run(20, 1, "10:00")], "master");
        expect(ids(sightRuns(record, [run(5, 1, "09:00"), run(21, 1, "10:10")], "master"))).toEqual(["21/1"]);
        // another workflow or branch has its own memory
        const other = [run(5, 1, "09:00", { name: "GPU" }), run(6, 1, "09:00", { head_branch: "fix/x" })];
        expect(ids(sightRuns(record, other, "master"))).toEqual(["5/1", "6/1"]);
        expect(Object.keys(sightRuns(record, [run(7, 1, "09:00", { workflow_id: 99 })], "master").record)).toContain(
            "99@master",
        );
    });

    it(`remembers the newest ${SIGHTING_MEMORY} runs per workflow and branch`, () => {
        const runs = Array.from({ length: SIGHTING_MEMORY + 5 }, (_, i) => run(i + 1, 1, "10:00"));
        const { record } = sightRuns({}, runs, "master");
        const kept = Object.keys(record["CI@master"]).map(Number);
        expect(kept).toHaveLength(SIGHTING_MEMORY);
        expect(Math.min(...kept)).toBe(6);
        expect(ids(sightRuns(record, [run(3, 1, "10:00")], "master"))).toEqual([]);
    });

    it("does not change the record it was given", () => {
        const saved = { "CI@master": { 1: [1, "2026-10-02T09:00:00Z"] } };
        sightRuns(saved, [run(1, 2, "10:00")], "master");
        expect(saved).toEqual({ "CI@master": { 1: [1, "2026-10-02T09:00:00Z"] } });
    });
});
