import { describe, expect, it } from "vitest";

import { createGitHub } from "../../lib/github.mjs";
import { pollIssues } from "../../lib/issues.mjs";
import { sightRuns } from "../../lib/master.mjs";
import { createFakeGh, httpOutput } from "../helpers/fake-gh.mjs";
import { BACKWARDS, createReplay } from "./replay.mjs";

const REPO = "graphty-org/graphty-monorepo";
const MASTER = `repos/${REPO}/actions/runs?branch=master&per_page=100`;
const PR_RUNS = `repos/${REPO}/actions/runs?event=pull_request&per_page=100`;
const PULLS = `repos/${REPO}/pulls?state=open&per_page=100`;
const MINUTE = 60_000;

/**
 * A client over the replay, in dry-run, with the given persisted records.
 * @param {ReturnType<typeof createReplay>} replay the replay
 * @param {{rate?: object, etags?: object}} [saved] persisted rate and ETag records
 * @returns {{gh: ReturnType<typeof createGitHub>, fake: ReturnType<typeof createFakeGh>}} the client and its fake gh
 */
function client(replay, saved = {}) {
    const fake = createFakeGh((call) => httpOutput(replay.response(call)));
    const gh = createGitHub({
        repo: REPO,
        fetch: fake.fetch,
        token: fake.token,
        mode: "dry-run",
        ledger: () => {},
        now: replay.now,
        ...saved,
    });
    return { gh, fake };
}

/**
 * Polls master's runs every minute and folds each answer into the sighting record.
 * @param {ReturnType<typeof createReplay>} replay the replay
 * @param {string} from first minute
 * @param {string} to end, exclusive
 * @returns {Promise<{at: number, run: any}[]>} every sighting with the minute it was made
 */
async function sightMaster(replay, from, to) {
    const { gh } = client(replay);
    let record = {};
    const out = [];
    for (let at = Date.parse(from); at < Date.parse(to); at += MINUTE) {
        replay.setTime(at);
        const res = await gh.get(MASTER, { purpose: "essential" });
        const next = sightRuns(record, res.body.workflow_runs, "master");
        record = next.record;
        for (const run of next.sightings) out.push({ at, run });
    }
    return out;
}

describe("sightings over the recorded month", () => {
    it("10-02: the two backwards answers are no sighting, and every state is sighted once", async () => {
        const replay = createReplay();
        const seen = await sightMaster(replay, "2026-10-02T00:00:00Z", "2026-10-03T00:00:00Z");
        expect(seen.filter((s) => s.run.id === BACKWARDS.runId)).toEqual([]);
        // In each backwards minute, and the minute after it when the true runs come back, CI has no sighting.
        const ci = seen.filter((s) => s.run.name === BACKWARDS.workflow);
        for (const m of BACKWARDS.minutes) expect(ci.filter((s) => s.at === m || s.at === m + MINUTE)).toEqual([]);
        const keys = seen.map((s) => `${s.run.id}/${s.run.run_attempt}/${s.run.updated_at}`);
        expect(new Set(keys).size).toBe(keys.length);
        // the GPU re-run that cleared the benchmark row at 08:21 is seen
        expect(seen.map((s) => `${s.run.id}/${s.run.run_attempt} ${s.run.status}`)).toContain(
            "36973764479/2 completed",
        );
    });

    it("09-30: both re-runs of an older Release run are seen, though newer Release runs exist", async () => {
        const replay = createReplay();
        const seen = await sightMaster(replay, "2026-09-30T19:40:00Z", "2026-09-30T20:15:00Z");
        const release = seen
            .filter((s) => s.run.id === 36739721120)
            .map((s) => `${new Date(s.at).toISOString().slice(11, 16)} ${s.run.run_attempt} ${s.run.status}`);
        expect(release).toEqual([
            "19:40 1 completed",
            "19:50 2 in_progress",
            "19:52 2 completed",
            "19:56 3 in_progress",
            "20:10 3 completed",
        ]);
        const newer = seen.some((s) => s.run.name === "Release" && s.run.id > 36739721120);
        expect(newer).toBe(true);
    });
});

describe("an idle day", () => {
    it("09-12 after a restart costs only 304s, with the ETags persisted the night before", async () => {
        const replay = createReplay();
        const before = client(replay);
        replay.setTime("2026-09-11T23:59:00Z");
        const start = "2026-09-01T00:00:00Z";
        let issues = await pollIssues(before.gh, REPO, { since: null, byNumber: {} }, start);
        for (const path of [MASTER, PR_RUNS, PULLS]) await before.gh.get(path, { purpose: "essential" });
        const saved = JSON.parse(JSON.stringify({ rate: before.gh.rate, etags: before.gh.etags }));

        const { gh, fake } = client(replay, saved);
        for (let at = Date.parse("2026-09-12T00:00:00Z"); at < Date.parse("2026-09-13T00:00:00Z"); at += MINUTE) {
            replay.setTime(at);
            for (const path of [MASTER, PR_RUNS, PULLS]) await gh.get(path, { purpose: "essential" });
            issues = await pollIssues(gh, REPO, issues, start);
            expect(issues.changed).toEqual([]);
        }
        expect(fake.calls).toHaveLength(4 * 1440);
        expect(fake.calls.every((c) => c.args.includes("-H"))).toBe(true);
        const statuses = new Set(fake.calls.map((c) => replay.response(c).status));
        expect([...statuses]).toEqual([304]);
        expect(gh.rate.counters.core.used).toBe(saved.rate.counters.core.used);
    });
});
