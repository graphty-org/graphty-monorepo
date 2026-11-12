import { describe, expect, it } from "vitest";

import { createGitHub } from "../lib/github.mjs";
import { CADENCE_MS, heartbeatBody, LABEL, stuckJobs, writeHeartbeat } from "../lib/heartbeat.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "o/r";
const R = `repos/${REPO}/`;
const T0 = Date.parse("2026-10-05T12:00:00Z");
const MIN = 60_000;
const LINES = { mode: "acting", version: "0.1.0 abc123" };

/**
 * A repository's issues behind a fake gh: list by label, create, edit the body, read one, pin.
 * @param {any[]} [issues] the issues there already
 * @returns the fake and its issues
 */
function fakeRepo(issues = []) {
    const s = { issues: [...issues], pinned: /** @type {string[]} */ ([]) };
    const ok = (/** @type {unknown} */ body, status = 200) => httpOutput({ status, body });
    const gh = createFakeGh(({ args, input }) => {
        const body = input ? JSON.parse(input) : undefined;
        if (args.includes("graphql")) {
            s.pinned.push(body.variables.id);
            return ok({ data: { pinIssue: { issue: { number: 1 } } } });
        }
        const x = args.indexOf("-X");
        const method = x === -1 ? "GET" : args[x + 1];
        const url = new URL(args.at(-1) === "-" ? args.at(-3) : args.at(-1), "https://x/");
        const p = url.pathname.slice(1 + R.length);
        const one = /^issues\/(\d+)$/.exec(p);
        if (method === "GET" && p === "issues") {
            const label = url.searchParams.get("labels");
            return ok(s.issues.filter((i) => i.state === "open" && i.labels.includes(label)));
        }
        if (method === "GET" && one) return ok(s.issues.find((i) => i.number === Number(one[1])));
        if (method === "POST" && p === "issues") {
            const number = 100 + s.issues.length;
            s.issues.push({ number, state: "open", ...body, node_id: `I_${number}` });
            return ok(
                { number, node_id: `I_${number}`, url: `https://api.github.com/${R}issues/${number}`, id: number },
                201,
            );
        }
        if (method === "PATCH" && one) {
            const i = s.issues.find((y) => y.number === Number(one[1]));
            Object.assign(i, body);
            return ok(i);
        }
        throw new Error(`unexpected gh call: ${args.join(" ")}`);
    });
    return { gh, s };
}

/**
 * A client on the fake in one mode for every group.
 * @param {ReturnType<typeof fakeRepo>} repo the fake
 * @param {string} mode the mode
 * @returns the client and its ledger
 */
function client(repo, mode) {
    const ledger = /** @type {any[]} */ ([]);
    let at = T0;
    const github = createGitHub({
        repo: REPO,
        fetch: repo.gh.fetch,
        token: repo.gh.token,
        mode,
        ledger: (e) => ledger.push(e),
        env: {},
        now: () => at,
    });
    return { github, ledger, set: (/** @type {number} */ t) => (at = t) };
}

describe("the heartbeat issue", () => {
    it("writes line 1 as alive, then its keyed lines, the oldest stuck job last", () => {
        const at = "2026-10-05T12:00:00.000Z";
        const body = heartbeatBody(at, {
            mode: "paused",
            paused: "githerd pause (githerd resume ends it)",
            stuck: [
                { since: "2026-10-05T01:00:00.000Z", job: "issue-7" },
                { since: "2026-10-05T09:00:00.000Z", job: "pr-9" },
            ],
            stopped: "shutdown\nmore",
            fatal: "uncaught exception: boom",
            version: "0.1.0 abc",
        });
        expect(body.split("\n")).toEqual([
            `alive: ${at}`,
            `mode: ${at} paused`,
            `paused: ${at} githerd pause (githerd resume ends it)`,
            "stuck: 2026-10-05T09:00:00.000Z pr-9",
            "stuck: 2026-10-05T01:00:00.000Z issue-7",
            `stopped: ${at} shutdown`,
            `fatal: ${at} uncaught exception: boom`,
            `version: ${at} 0.1.0 abc`,
        ]);
        expect(body.split("\n")[0]).toMatch(/^alive: \S+Z$/);
        const state = { jobs: { a: { id: "a", state: "faulted", stateSince: "t1" }, b: { id: "b", state: "queued" } } };
        expect(stuckJobs(state)).toEqual([{ since: "t1", job: "a" }]);
    });

    it("says when the last poll completed, and since when and why polls fail", () => {
        const at = "2026-10-05T12:00:00.000Z";
        const body = heartbeatBody(at, {
            mode: "acting",
            lastPoll: "2026-10-05T11:51:00.000Z",
            failing: { since: "2026-10-05T11:54:00.000Z", error: "owners: boom\nstack" },
        });
        expect(body.split("\n")).toEqual([
            `alive: ${at}`,
            `mode: ${at} acting`,
            "last complete poll: 2026-10-05T11:51:00.000Z",
            "poll failing: 2026-10-05T11:54:00.000Z owners: boom",
        ]);
    });

    it("does not rewrite the body at once only because another poll completed", async () => {
        const repo = fakeRepo();
        const { github, set } = client(repo, "acting");
        const state = {};
        const write = (/** @type {number} */ now, lines = {}) => {
            set(now);
            return writeHeartbeat({ github, repo: REPO, state, now, lines: { ...LINES, ...lines } });
        };
        expect(await write(T0, { lastPoll: new Date(T0).toISOString() })).toBe(true);
        expect(await write(T0 + 3 * MIN, { lastPoll: new Date(T0 + 3 * MIN).toISOString() })).toBe(false);
        // A poll that fails is news at once.
        const failing = { since: new Date(T0 + 6 * MIN).toISOString(), error: "boom" };
        expect(await write(T0 + 6 * MIN, { lastPoll: new Date(T0 + 3 * MIN).toISOString(), failing })).toBe(true);
        expect(repo.s.issues[0].body).toContain("poll failing: 2026-10-05T12:06:00.000Z boom");
    });

    it("opens and pins one issue, then rewrites its body every 15 minutes and at once on a change", async () => {
        const repo = fakeRepo();
        const { github, set } = client(repo, "acting");
        const state = {};
        const write = (/** @type {number} */ now, lines = LINES) => {
            set(now);
            return writeHeartbeat({ github, repo: REPO, state, now, lines });
        };
        expect(await write(T0)).toBe(true);
        expect(repo.s.issues).toHaveLength(1);
        expect(repo.s.issues[0]).toMatchObject({ title: "githerd heartbeat", labels: [LABEL], number: 100 });
        expect(repo.s.issues[0].body.split("\n")[0]).toBe("alive: 2026-10-05T12:00:00.000Z");
        expect(repo.s.pinned).toEqual(["I_100"]);
        // Within the cadence and unchanged: nothing is asked or written.
        const calls = repo.gh.calls.length;
        expect(await write(T0 + 10 * MIN)).toBe(false);
        expect(repo.gh.calls).toHaveLength(calls);
        // The cadence: the body only, never a comment, never a second issue, never pinned again.
        expect(await write(T0 + CADENCE_MS)).toBe(true);
        expect(repo.s.issues).toHaveLength(1);
        expect(repo.s.issues[0].body).toContain("alive: 2026-10-05T12:15:00.000Z");
        // A change is written at once.
        expect(await write(T0 + 16 * MIN, { ...LINES, stopped: "shutdown" })).toBe(true);
        expect(repo.s.issues[0].body).toContain("stopped: 2026-10-05T12:16:00.000Z shutdown");
        expect(repo.s.pinned).toHaveLength(1);
        const writes = repo.gh.writes().map((c) => `${c.args.includes("graphql") ? "graphql" : c.args[3]}`);
        expect(writes).toEqual(["POST", "graphql", "PATCH", "PATCH"]);
    });

    it("reuses the open labelled issue, and opens a new one only when none is open", async () => {
        const repo = fakeRepo([
            { number: 7, state: "closed", labels: [LABEL], body: "alive: old" },
            { number: 9, state: "open", labels: [LABEL], body: "" },
        ]);
        const { github } = client(repo, "acting");
        const state = {};
        await writeHeartbeat({ github, repo: REPO, state, now: T0, lines: LINES });
        expect(repo.s.issues.map((i) => i.number)).toEqual([7, 9]);
        expect(repo.s.issues[1].body).toMatch(/^alive: /);
        expect(repo.s.pinned).toEqual([]);
        // Someone closed it: the next write opens one, the only open one.
        repo.s.issues[1].state = "closed";
        await writeHeartbeat({ github, repo: REPO, state, now: T0 + CADENCE_MS, lines: LINES });
        expect(repo.s.issues.filter((i) => i.state === "open").map((i) => i.number)).toEqual([102]);
    });

    it("in dry-run asks GitHub nothing and records one would-do per change of its lines", async () => {
        const repo = fakeRepo();
        const { github, ledger } = client(repo, "dry-run");
        const state = {};
        for (const now of [T0, T0 + CADENCE_MS, T0 + 2 * CADENCE_MS])
            await writeHeartbeat({ github, repo: REPO, state, now, lines: LINES });
        await writeHeartbeat({
            github,
            repo: REPO,
            state,
            now: T0 + 3 * CADENCE_MS,
            lines: { ...LINES, mode: "paused" },
        });
        expect(repo.gh.calls).toEqual([]);
        expect(ledger.map((e) => [e.kind, e.group, e.op, e.situation])).toEqual([
            ["would-do", "owner-items", "POST issues", "heartbeat"],
            ["would-do", "owner-items", "POST issues", "heartbeat"],
        ]);
    });

    it("writes fatal mode's line once, not on the cadence", async () => {
        const repo = fakeRepo();
        const { github } = client(repo, "acting");
        const state = {};
        const fatal = { ...LINES, fatal: "crash loop" };
        await writeHeartbeat({ github, repo: REPO, state, now: T0, lines: fatal, final: true });
        await writeHeartbeat({ github, repo: REPO, state, now: T0 + 2 * CADENCE_MS, lines: fatal, final: true });
        expect(repo.gh.writes()).toHaveLength(2); // the create and its pin
        expect(repo.s.issues[0].body).toContain("fatal: 2026-10-05T12:00:00.000Z crash loop");
    });
});
