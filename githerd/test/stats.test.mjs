import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { runCli } from "../lib/cli.mjs";
import {
    closedHow,
    dayRecords,
    githerdClosedIssues,
    HISTORY_FILE,
    issueSource,
    issueType,
    readHistory,
    recordMissingDays,
    statsReport,
    statsText,
} from "../lib/stats.mjs";

const fixture = (/** @type {string} */ name) =>
    JSON.parse(readFileSync(new URL(`fixtures/stats/${name}.json`, import.meta.url), "utf8"));
const items = fixture("items");
const runs = fixture("runs");
const releases = fixture("releases");
const byNumber = (/** @type {number} */ n) => items.find((/** @type {any} */ i) => i.number === n);

/** @type {string} */
let dir;
beforeAll(() => isolateGit());
beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "githerd-stats-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("issueSource", () => {
    it("tells githerd, CI bots, other people, Claude sessions and the owner by hand apart", () => {
        expect(issueSource(byNumber(2), "owner")).toBe("githerd"); // flaky-test marker
        expect(issueSource(byNumber(7), "owner")).toBe("githerd"); // intermittent-failure marker
        expect(issueSource({ ...byNumber(7), body: "" }, "owner")).toBe("githerd"); // by its title
        expect(issueSource(byNumber(3), "owner")).toBe("ci-bot");
        expect(issueSource(byNumber(6), "owner")).toBe("other");
        expect(issueSource(byNumber(1), "owner")).toBe("claude"); // a structured report
        expect(issueSource(byNumber(5), "owner")).toBe("claude"); // "Found while"
        expect(issueSource({ ...byNumber(4), body: "x".repeat(250) }, "owner")).toBe("claude");
        expect(issueSource(byNumber(4), "owner")).toBe("owner"); // a line by hand
    });
});

describe("issueType and closedHow", () => {
    it("takes the first type label, else other", () => {
        expect([1, 4, 5, 6].map((n) => issueType(byNumber(n)))).toEqual([
            "bug",
            "enhancement",
            "infrastructure",
            "other",
        ]);
    });

    it("says how an issue was closed", () => {
        const fixed = new Set([5]);
        const ours = new Set([7]);
        expect(closedHow(byNumber(4), fixed, ours)).toBe("not-planned");
        expect(closedHow({ ...byNumber(4), state_reason: "duplicate" }, fixed, ours)).toBe("not-planned");
        expect(closedHow(byNumber(5), fixed, ours)).toBe("merged-pr");
        expect(closedHow(byNumber(7), fixed, ours)).toBe("githerd");
        expect(closedHow(byNumber(3), fixed, ours)).toBe("other");
    });

    it("reads the issues githerd closed from its proposals, never a dry run's or a pull request's", () => {
        const state = {
            proposals: {
                "issue:7": { target: "issue:7", status: "closed" },
                "issue:8": { target: "issue:8", status: "closed", dryRun: true },
                "issue:9": { target: "issue:9", status: "commented" },
                "pr:10": { target: "pr:10", status: "closed" },
            },
        };
        expect([...githerdClosedIssues(state)]).toEqual([7]);
        expect(githerdClosedIssues(null).size).toBe(0);
    });
});

describe("dayRecords", () => {
    const [d4, d5] = dayRecords({
        items,
        runs,
        releases,
        days: ["2026-10-04", "2026-10-05"],
        owner: "owner",
        githerdClosed: new Set([7]),
        sourceOf: (day) => (day === "2026-10-05" ? "poll" : "backfill"),
        at: "2026-10-06T00:05:00.000Z",
    });

    it("counts issues opened, closed and open at the day's end, the heartbeat issue left out", () => {
        expect(d5.source).toBe("poll");
        expect(d5.opened.type).toEqual({ bug: 2, infrastructure: 0, enhancement: 1, other: 1 });
        expect(d5.opened.source).toEqual({ owner: 1, claude: 0, githerd: 1, "ci-bot": 1, other: 1 });
        expect(d5.closed.type).toEqual({ bug: 2, infrastructure: 1, enhancement: 1, other: 1 });
        expect(d5.closed.how).toEqual({ "merged-pr": 1, "not-planned": 1, githerd: 1, other: 2 });
        expect(d5.open.type).toEqual({ bug: 2, infrastructure: 0, enhancement: 0, other: 0 });
        expect(d5.open.priority).toEqual({ critical: 0, high: 1, medium: 1, low: 0, none: 0 });
        expect(d5.oldestBugs.high.map((b) => b.number)).toEqual([1]);
        expect(d4.source).toBe("backfill");
        expect(d4.opened.source.claude).toBe(1);
        expect(d4.open.type).toEqual({ bug: 2, infrastructure: 1, enhancement: 0, other: 0 });
    });

    it("counts pull requests without bots, failed tested heads, dequeues and release trains", () => {
        expect(d5.prs).toEqual({
            opened: 2,
            merged: 1,
            closedUnmerged: 1,
            ciFailed: 2, // a1 twice and b1; the draft's one-minute run and master's push are not
            dequeues: 1,
            mergeHours: [12],
        });
        expect(d5.releases).toBe(2);
        expect(d4.prs.opened).toBe(1);
        expect(d4.prs.ciFailed).toBe(1);
        expect(d4.releases).toBe(1);
    });
});

/**
 * A GitHub client that answers list endpoints from the fixtures and counts its calls.
 * @param {number} remaining the core budget left
 * @returns {any} the client
 */
function fakeGitHub(remaining) {
    const calls = /** @type {string[]} */ ([]);
    return {
        calls,
        rate: { counters: { core: { remaining } } },
        async get(/** @type {string} */ path) {
            calls.push(path);
            if (path.includes("/issues?state=all")) return { body: items.filter((i) => i.state === "closed") };
            if (path.includes("/issues?state=open")) return { body: items.filter((i) => i.state === "open") };
            if (path.includes("/actions/workflows/ci.yml/runs")) return { body: { workflow_runs: runs } };
            if (path.includes("/releases?")) return { body: releases };
            throw new Error(`unexpected ${path}`);
        },
    };
}

describe("recordMissingDays", () => {
    const config = {
        repo: "o/r",
        lanes: { ci: { workflow: "ci.yml", gating: "required" }, hosts: { workflow: "hosts.yml", gating: "if-run" } },
    };
    const base = {
        config,
        owner: "owner",
        githerdClosed: new Set([7]),
        now: new Date("2026-10-06T00:05:00Z"),
        days: 2,
    };

    it("records each missing day once, from paged lists of 100, and only required lanes' runs", async () => {
        const github = fakeGitHub(4000);
        const written = await recordMissingDays({ ...base, github, stateDir: dir, poll: true });
        expect(written.map((r) => [r.day, r.source])).toEqual([
            ["2026-10-04", "backfill"],
            ["2026-10-05", "poll"],
        ]);
        expect(github.calls.every((p) => p.includes("per_page=100&page=1"))).toBe(true);
        expect(github.calls.some((p) => p.includes("hosts.yml"))).toBe(false);
        expect(readHistory(dir).map((r) => r.day)).toEqual(["2026-10-04", "2026-10-05"]);

        const again = fakeGitHub(4000);
        expect(await recordMissingDays({ ...base, github: again, stateDir: dir })).toEqual([]);
        expect(again.calls).toEqual([]);
    });

    it("stops before a call while the core budget is below 2000, writing nothing", async () => {
        const github = fakeGitHub(1999);
        await expect(recordMissingDays({ ...base, github, stateDir: dir })).rejects.toThrow(/1999 core calls left/);
        expect(github.calls).toEqual([]);
        expect(readHistory(dir)).toEqual([]);
    });

    it("gives up on a list that never ends instead of spending the budget on it", async () => {
        const full = Array.from({ length: 100 }, (_, k) => ({ ...byNumber(1), number: 1000 + k }));
        const github = {
            calls: 0,
            rate: { counters: { core: { remaining: 4000 } } },
            get: async () => (github.calls++, { body: full }),
        };
        await expect(recordMissingDays({ ...base, github, stateDir: dir })).rejects.toThrow(/more than 50 pages/);
        expect(github.calls).toBe(50);
    });

    it("reads a later line for a day over an earlier one, and skips a torn line", () => {
        writeFileSync(
            join(dir, HISTORY_FILE),
            '{"day":"2026-10-01","releases":1}\n{"day":"2026-10-01","releases":2}\n{"day":',
        );
        expect(readHistory(dir)).toEqual([{ day: "2026-10-01", releases: 2 }]);
    });
});

/**
 * A synthetic day record.
 * @param {string} day the day
 * @param {{bugOpen: number, enhOpen: number}} open the open counts at its end
 * @returns {any} the record
 */
function synthetic(day, { bugOpen, enhOpen }) {
    return {
        day,
        source: "backfill",
        open: {
            type: { bug: bugOpen, infrastructure: 0, enhancement: enhOpen, other: 0 },
            priority: { critical: 0, high: bugOpen, medium: enhOpen, low: 0, none: 0 },
        },
        // Each day: two bugs opened, three closed; one enhancement opened, none closed.
        opened: { type: { bug: 2, enhancement: 1 }, source: { claude: 2, githerd: 1 } },
        closed: { type: { bug: 3 }, how: { "merged-pr": 3 } },
        prs: { opened: 4, merged: 3, closedUnmerged: 1, ciFailed: 2, dequeues: 1, mergeHours: [2, 4] },
        releases: 1,
        oldestBugs: { high: [{ number: 9, title: "an old bug", opened: "2026-08-01" }] },
    };
}

/**
 * Four weeks of synthetic history ending 2026-10-05.
 * @returns {any[]} the records
 */
function history() {
    const out = [];
    for (let d = 27; d >= 0; d--) {
        const day = new Date(Date.parse("2026-10-05T00:00:00Z") - d * 86_400_000).toISOString().slice(0, 10);
        out.push(synthetic(day, { bugOpen: 98 + d, enhOpen: 70 - d }));
    }
    return out;
}

describe("statsReport", () => {
    it("sums weeks, finds what did not fall, and projects weeks to zero at the 4-week net rate", () => {
        const r = statsReport(history());
        expect(r.through).toBe("2026-10-05");
        expect(r.weeks).toHaveLength(8);
        const w = r.weeks.at(-1);
        expect([w.from, w.to, w.days]).toEqual(["2026-09-29", "2026-10-05", 7]);
        expect(w.opened).toEqual({ bug: 14, enhancement: 7 });
        expect(w.closed).toEqual({ bug: 21 });
        expect(w.openAtEnd.bug).toBe(98);
        expect(w.prs).toEqual({
            opened: 28,
            merged: 21,
            closedUnmerged: 7,
            ciFailed: 14,
            dequeues: 7,
            medianMergeHours: 3,
        });
        expect(r.weeks[0].days).toBe(0);
        expect(r.stalled.map((/** @type {any} */ s) => s.what)).toEqual(["enhancement", "priority:medium"]);
        const bug = r.trend.find((/** @type {any} */ t) => t.type === "bug");
        expect(bug).toMatchObject({ net4w: -28, perWeek: -7, open: 98, weeksToZero: 14 });
        expect(r.trend.find((/** @type {any} */ t) => t.type === "enhancement").weeksToZero).toBeNull();
        const text = statsText(r);
        expect(text).toContain("enhancement    net +28 (+7/week), 70 open: never at this rate");
        expect(text).toContain("bug            net -28 (-7/week), 98 open: about 14 weeks");
        expect(text).toContain("labels issues carry now");
        expect(/^[\x20-\x7e\n]*$/.test(text)).toBe(true);
    });

    it("says there is nothing yet when the history is empty", () => {
        expect(statsReport([])).toBeNull();
        expect(statsText(null)).toMatch(/^no statistics yet/);
    });
});

describe("githerd stats", () => {
    it("prints the report from the state directory's history, and JSON with --json", async () => {
        const repo = join(dir, "repo");
        git(dir, "init", "-q", repo);
        const state = join(dir, "state");
        mkdirSync(state);
        writeFileSync(
            join(state, HISTORY_FILE),
            history()
                .map((r) => `${JSON.stringify(r)}\n`)
                .join(""),
        );
        const run = async (/** @type {string[]} */ argv) => {
            const lines = /** @type {string[]} */ ([]);
            const code = await runCli(argv, {
                cwd: repo,
                env: { HOME: dir, PATH: process.env.PATH, GITHERD_STATE_DIR: state },
                out: (l) => lines.push(l),
                err: (l) => lines.push(l),
            });
            return { code, text: lines.join("\n") };
        };
        const plain = await run(["stats"]);
        expect(plain.code).toBe(0);
        expect(plain.text).toContain("Issues per week");
        expect(plain.text).toContain("Where issues come from");
        const json = await run(["stats", "--json"]);
        expect(JSON.parse(json.text).through).toBe("2026-10-05");
        expect((await run(["stats", "--backfill", "--days", "x"])).code).toBe(2);
    });
});
