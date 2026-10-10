import { describe, expect, it } from "vitest";

import { BACKWARDS, createReplay } from "./replay.mjs";

const R = "repos/graphty-org/graphty-monorepo/";
const MASTER = `${R}actions/runs?branch=master&per_page=100`;
const replay = createReplay();

/**
 * One run of the master runs answer at a time.
 * @param {number} id run id
 * @param {string} at ISO time
 * @returns {Record<string, any> | undefined} the run as the answer shows it
 */
function masterRun(id, at) {
    return replay.answer(MASTER, Date.parse(at)).body.workflow_runs.find((/** @type {any} */ r) => r.id === id);
}

describe("runs", () => {
    it("shows a re-run's first attempt between its end and the second attempt's start", () => {
        // GPU on 10-02: attempt 1 failed at 04:04:18 (no balance), attempt 2 ran 04:13 to 05:01.
        const id = 36962785245;
        expect(masterRun(id, "2026-10-02T04:02:00Z")).toBeUndefined();
        expect(masterRun(id, "2026-10-02T04:03:00Z")).toMatchObject({
            status: "in_progress",
            run_attempt: 1,
            conclusion: null,
        });
        expect(masterRun(id, "2026-10-02T04:05:00Z")).toMatchObject({
            status: "completed",
            run_attempt: 1,
            conclusion: "failure",
            updated_at: "2026-10-02T04:04:18.000Z",
        });
        expect(masterRun(id, "2026-10-02T04:10:00Z")).toMatchObject({ run_attempt: 1, conclusion: "failure" });
        expect(masterRun(id, "2026-10-02T04:14:00Z")).toMatchObject({ status: "in_progress", run_attempt: 2 });
        expect(masterRun(id, "2026-10-02T05:02:00Z")).toMatchObject({
            status: "completed",
            run_attempt: 2,
            conclusion: "success",
        });
    });

    it("answers newest first, one page, pull request runs with their pull request numbers", () => {
        const at = Date.parse("2026-10-01T12:00:00Z");
        const runs = replay.answer(`${R}actions/runs?branch=master`, at).body.workflow_runs;
        expect(runs).toHaveLength(30);
        const created = runs.map((/** @type {any} */ r) => r.created_at);
        expect(created).toEqual([...created].sort().reverse());
        const pr = replay.answer(`${R}actions/runs?event=pull_request&per_page=5`, at).body.workflow_runs;
        expect(pr).toHaveLength(5);
        expect(pr.every((/** @type {any} */ r) => r.name === "CI" && Array.isArray(r.pull_requests))).toBe(true);
    });

    it("answers backwards in the two recorded minutes and only then", () => {
        for (const m of BACKWARDS.minutes) {
            for (const at of [m, m + 59_000]) {
                const ci = replay
                    .answer(MASTER, at)
                    .body.workflow_runs.filter((/** @type {any} */ r) => r.name === "CI");
                expect(ci).toEqual([
                    expect.objectContaining({
                        id: BACKWARDS.runId,
                        conclusion: "failure",
                        created_at: "2026-09-30T07:33:33Z",
                    }),
                ]);
            }
            for (const at of [m - 60_000, m + 60_000]) {
                const ci = replay
                    .answer(MASTER, at)
                    .body.workflow_runs.filter((/** @type {any} */ r) => r.name === "CI");
                expect(ci.some((/** @type {any} */ r) => r.id === BACKWARDS.runId)).toBe(false);
                expect(ci.length).toBeGreaterThan(1);
            }
        }
    });
});

describe("a known day", () => {
    it("10-02 on master: every attempt that ended that day is seen once, at the first minute not before its end, with its recorded result", () => {
        const from = Date.parse("2026-10-02T00:00:00Z");
        const to = from + 24 * 3_600_000;
        /** @type {Map<string, {at: number, conclusion: string}>} */
        const seen = new Map();
        let last;
        let ok = 0;
        let notModified = 0;
        for (const a of replay.sequence(MASTER, from, to)) {
            if (a.status === 304) {
                notModified++;
                continue;
            }
            ok++;
            last = a.body;
            if (BACKWARDS.minutes.includes(a.at)) continue;
            for (const r of a.body.workflow_runs) {
                const key = `${r.id}/${r.run_attempt}`;
                if (r.status === "completed" && !seen.has(key)) seen.set(key, { at: a.at, conclusion: r.conclusion });
            }
        }
        expect(last).toBeDefined();
        expect(ok + notModified).toBe(1440);
        expect(notModified).toBeGreaterThan(0);

        // The record: each attempt's end and result, from the recorded runs and attempts.
        let expected = 0;
        /** @type {number[]} */
        const offPage = [];
        for (const t of replay.record.master) {
            for (const att of t.attempts) {
                if (att.end < from || att.end >= to - 60_000) continue;
                const at = Math.ceil(att.end / 60_000) * 60_000;
                if (!replay.answer(MASTER, at).body.workflow_runs.some((/** @type {any} */ r) => r.id === t.run.id)) {
                    offPage.push(t.run.id);
                    continue;
                }
                expected++;
                const s = seen.get(`${t.run.id}/${att.n}`);
                expect(s, `${t.run.name} ${t.run.id} attempt ${att.n}`).toEqual({
                    at: Math.ceil(att.end / 60_000) * 60_000,
                    conclusion: att.conclusion,
                });
            }
        }
        expect(expected).toBeGreaterThan(100);
        // A GPU run created 10-01 00:40 and cancelled 24 hours later had fallen off the first page
        // of 100 by then: a poll of the first page alone never sees it end.
        expect(offPage).toEqual([36797347517]);
        // Nothing the record does not hold, apart from runs that ended the day before.
        for (const [key, s] of seen) {
            const [id, n] = key.split("/").map(Number);
            const att = replay.record.master.find((t) => t.run.id === id).attempts.find((x) => x.n === n);
            expect(s.conclusion).toBe(att.conclusion);
        }
    });

    it("a 304 carries no body and a changed answer a new ETag", () => {
        const [a, b] = [...replay.sequence(MASTER, "2026-09-15T03:00:00Z", "2026-09-15T03:02:00Z")];
        expect(a.status).toBe(200);
        expect(a.etag).toMatch(/^W\/"[0-9a-f]{64}"$/);
        if (b.status === 304) expect(b).toMatchObject({ etag: a.etag, body: undefined });
        else expect(b.etag).not.toBe(a.etag);
    });
});

describe("other endpoints", () => {
    it("open pull requests are those created and not yet closed or merged", () => {
        const at = Date.parse("2026-10-01T12:00:00Z");
        const open = replay.answer(`${R}pulls?state=open&per_page=100`, at).body;
        const expected = replay.record.prs.filter(
            (p) =>
                Date.parse(p.createdAt) <= at &&
                !(p.closedAt && Date.parse(p.closedAt) <= at) &&
                !(p.mergedAt && Date.parse(p.mergedAt) <= at),
        );
        expect(open.map((/** @type {any} */ p) => p.number).sort()).toEqual(expected.map((p) => p.number).sort());
        expect(open[0]).toMatchObject({ state: "open", base: { ref: "master" } });
    });

    it("issues since a time: updated by creation, closing or a comment, as of the clock", () => {
        const i = replay.record.issues.find((x) => x.closedAt && x.comments.length > 0);
        const closed = Date.parse(i.closedAt);
        const before = replay.answer(`${R}issues?state=all&per_page=100&since=${i.createdAt}`, closed - 1);
        const mine = before.body.find((/** @type {any} */ x) => x.number === i.number);
        expect(mine).toMatchObject({ state: "open", closed_at: null });
        const after = replay.answer(`${R}issues?state=all&per_page=100&since=${i.closedAt}`, closed);
        expect(after.body.find((/** @type {any} */ x) => x.number === i.number)).toMatchObject({ state: "closed" });
        const all = replay.answer(`${R}issues?state=all&per_page=100`, closed).body;
        expect(all.every((/** @type {any} */ x) => Date.parse(x.created_at) <= closed)).toBe(true);
    });

    it("issue comments since a time, oldest first", () => {
        const at = Date.parse("2026-10-03T06:00:00Z");
        const since = "2026-10-02T00:00:00Z";
        const list = replay.answer(`${R}issues/comments?per_page=100&since=${since}`, at).body;
        expect(list.length).toBeGreaterThan(0);
        expect(list.every((/** @type {any} */ c) => c.created_at >= since && Date.parse(c.created_at) <= at)).toBe(
            true,
        );
        expect(list[0]).toMatchObject({ user: { login: expect.any(String) }, body: expect.any(String) });
        const everything = replay.answer(`${R}issues/comments`, at).body;
        expect(everything).toHaveLength(30);
    });

    it("jobs and logs of a failed master run appear once it has finished", () => {
        const job = replay.record.failedJobs.find((j) => replay.record.logs[String(j.jid)]?.errors);
        const t = replay.record.master.find((x) => String(x.run.id) === job.run);
        const end = t.attempts.at(-1).end;
        const jobs = (/** @type {number} */ at) => replay.answer(`${R}actions/runs/${job.run}/jobs`, at).body.jobs;
        expect(jobs(end - 1)).toEqual([]);
        expect(jobs(end)).toContainEqual(
            expect.objectContaining({
                id: job.jid,
                name: job.job,
                conclusion: "failure",
                steps: job.steps.map((name) => expect.objectContaining({ name })),
            }),
        );
        const log = replay.answer(`${R}actions/jobs/${job.jid}/logs`, end);
        expect(log.status).toBe(200);
        expect(log.body).toContain(replay.record.logs[String(job.jid)].errors);
        expect(replay.answer(`${R}actions/jobs/${job.jid}/logs`, Date.parse(job.ts) - 1).status).toBe(404);
        expect(replay.answer(`${R}actions/runs/1/jobs`, end).body.jobs).toEqual([]);
    });

    it("anything else is a 404", () => {
        expect(replay.answer("repos/other/repo/pulls?state=open").status).toBe(404);
        expect(replay.answer(`${R}rulesets`).status).toBe(404);
        expect(replay.answer(`${R}actions/jobs/1/logs`).status).toBe(404);
    });
});

describe("the gh responder", () => {
    it("answers at the replay clock, 304 for a matching ETag, and only a 200 spends the hourly budget", () => {
        replay.setTime("2026-09-20T10:00:00Z");
        expect(replay.now()).toBe(Date.parse("2026-09-20T10:00:00Z"));
        const first = replay.response({ args: ["api", "-i", MASTER] });
        expect(first.status).toBe(200);
        expect(first.headers["X-RateLimit-Remaining"]).toBe("4999");
        const again = replay.response({ args: ["api", "-i", "-H", `If-None-Match: ${first.headers.ETag}`, MASTER] });
        expect(again).toMatchObject({ status: 304, body: undefined });
        expect(again.headers["X-RateLimit-Used"]).toBe("1");
        expect(Number(again.headers["X-RateLimit-Reset"]) * 1000).toBe(Date.parse("2026-09-20T11:00:00Z"));
        replay.setTime(Date.parse("2026-09-20T11:00:00Z"));
        expect(replay.response({ args: ["api", "-i", `${R}nothing`] })).toMatchObject({ status: 404 });
        expect(replay.response({ args: ["api", "-i", `${R}nothing`] }).headers.ETag).toBeUndefined();
    });
});
