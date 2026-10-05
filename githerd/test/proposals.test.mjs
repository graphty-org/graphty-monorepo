import { describe, expect, it } from "vitest";

import { createGitHub } from "../lib/github.mjs";
import {
    advanceProposals,
    closedTargets,
    GRACE_DAYS,
    proposalComment,
    recordVerdict,
    veto,
} from "../lib/proposals.mjs";
import { createFakeGh, httpOutput } from "./helpers/fake-gh.mjs";

const REPO = "graphty-org/graphty-monorepo";
const OWNER = "apowers313";
const DAY = 24 * 3_600_000;
const START = Date.parse("2026-10-05T15:00:00Z");

/**
 * A fake repository behind the real client: issues and pull requests by number (both live under
 * `issues/<n>`), each with its comments.
 * @param {"acting" | "dry-run" | (() => string)} mode the proposals group's mode, or a function
 *   answering it now
 * @param {() => unknown} [persist] the client's save hook
 * @returns {any} the client, the fake, the items, the ledger and the clock
 */
function world(mode, persist) {
    let t = START;
    let nextId = 1000;
    /** @type {Record<string, {state: string, comments: any[], events: any[]}>} */
    const items = {};
    const item = (n) => (items[n] ??= { state: "open", comments: [], events: [] });
    const gh = createFakeGh(({ args, input }) => {
        const x = args.indexOf("-X");
        const method = x === -1 ? "GET" : args[x + 1];
        const path = (x === -1 ? args.at(-1) : args[x + 2]).replace(`repos/${REPO}/`, "");
        const body = input ? JSON.parse(input) : null;
        // The fake API: method, path pattern, answer.
        const routes = [
            [
                "POST",
                /^issues\/(\d+)\/comments$/,
                (m) => {
                    const c = {
                        id: nextId++,
                        user: { login: OWNER },
                        created_at: new Date(t).toISOString(),
                        body: body.body,
                    };
                    item(m[1]).comments.push(c);
                    return {
                        status: 201,
                        body: { ...c, url: `https://api.github.com/repos/${REPO}/issues/comments/${c.id}` },
                    };
                },
            ],
            [
                "PATCH",
                /^(?:issues|pulls)\/(\d+)$/,
                (m) => {
                    item(m[1]).state = body.state;
                    return { status: 200, body: { state: body.state } };
                },
            ],
            ["GET", /^issues\/comments\/(\d+)$/, (m) => ({ status: 200, body: { id: Number(m[1]) } })],
            [
                "GET",
                /^issues\/(\d+)\/comments\?since=([^&]+)/,
                (m) => ({ status: 200, body: item(m[1]).comments.filter((c) => c.created_at >= m[2]) }),
            ],
            ["GET", /^issues\/(\d+)\/comments\?per_page/, (m) => ({ status: 200, body: item(m[1]).comments })],
            ["GET", /^issues\/(\d+)\/events\?/, (m) => ({ status: 200, body: item(m[1]).events })],
            ["GET", /^issues\/(\d+)$/, (m) => ({ status: 200, body: { state: item(m[1]).state } })],
        ];
        for (const [verb, pattern, answer] of routes) {
            const m = verb === method ? pattern.exec(path) : null;
            if (m) return httpOutput(answer(m));
        }
        return httpOutput({ status: 404, body: { message: "Not Found" } });
    });
    const ledger = [];
    const gitHub = createGitHub({
        repo: REPO,
        fetch: gh.fetch,
        token: gh.token,
        mode: (group) => {
            if (group !== "proposals") return "dry-run";
            return typeof mode === "function" ? mode() : mode;
        },
        ledger: (e) => ledger.push(e),
        env: {},
        now: () => t,
        persist,
    });
    return {
        gh,
        items,
        item,
        ledger,
        gitHub,
        advance: (ms) => (t += ms),
        /** Days the owner was present, as notify.mjs records them. */
        presence: [],
        /** Records today as a present day. */
        present() {
            const d = new Date(t).toISOString().slice(0, 10);
            if (!this.presence.includes(d)) this.presence.push(d);
        },
        ctx(over = {}) {
            return {
                gitHub,
                repo: REPO,
                login: OWNER,
                now: new Date(t),
                presentDays: (from) => this.presence.filter((d) => d >= from).length,
                ledger: (e) => ledger.push(e),
                ...over,
            };
        },
    };
}

/**
 * Runs one reconcile a day for `count` days, the owner present on each unless `away`.
 * @param {any} w the world
 * @param {any} state the state
 * @param {number} count how many
 * @param {{away?: boolean} & object} [over] context overrides; `away` records no presence
 */
async function days(w, state, count, { away = false, ...over } = {}) {
    for (let i = 0; i < count; i++) {
        w.advance(DAY);
        if (!away) w.present();
        await advanceProposals(state, w.ctx(over));
    }
}

const at = "2026-10-05T12:00:00Z";
const dup = (session) => ({ verdict: "duplicate", number: 5, of: 3, session, at });

describe("recordVerdict: propose and confirm", () => {
    it("a judgment needs a second, agreeing verdict from a fresh session", () => {
        const state = {};
        expect(recordVerdict(state, dup("s1")).proposal).toMatchObject({
            id: "issue:5",
            status: "unconfirmed",
            proposedBy: "s1",
        });
        expect(recordVerdict(state, dup("s1"))).toEqual({
            refused: "a confirmation needs a verdict from a fresh session",
        });
        expect(recordVerdict(state, dup("s2")).proposal).toMatchObject({ status: "confirmed", confirmedBy: "s2" });
        expect(recordVerdict(state, dup("s3")).proposal.status).toBe("confirmed");
    });

    it("a disagreeing verdict or a keep from another session drops it", () => {
        const state = {};
        recordVerdict(state, dup("s1"));
        expect(recordVerdict(state, { ...dup("s2"), of: 4 }).proposal).toMatchObject({
            status: "dropped",
            reason: "s2 judged duplicate of #4",
        });
        recordVerdict(state, { verdict: "obsolete", number: 6, evidence: "gone in 1a2b", session: "s1", at });
        expect(recordVerdict(state, { verdict: "keep", number: 6, session: "s1", at })).toEqual({});
        expect(recordVerdict(state, { verdict: "keep", number: 6, session: "s2", at }).proposal).toMatchObject({
            status: "dropped",
            reason: "s2 judged keep",
        });
        expect(recordVerdict(state, { verdict: "keep", number: 7, session: "s2", at })).toEqual({});
        // A dropped target can be proposed again.
        expect(recordVerdict(state, dup("s4")).proposal.status).toBe("unconfirmed");
    });

    it("mechanical kinds are confirmed at once and target the pull request", () => {
        const state = {};
        expect(
            recordVerdict(state, { verdict: "already-merged", number: 9, of: 8, session: "daemon", at }).proposal,
        ).toMatchObject({ id: "pr:9", status: "confirmed" });
        expect(
            recordVerdict(state, { verdict: "duplicate-pr", number: 11, of: 10, session: "daemon", at }).proposal
                .status,
        ).toBe("confirmed");
    });

    it("refuses bad verdicts and vetoed targets", () => {
        const state = {};
        expect(recordVerdict(state, { verdict: "close", number: 5, session: "s", at }).refused).toBe(
            "unknown verdict close",
        );
        expect(
            recordVerdict(state, { verdict: "obsolete", number: 0, evidence: "x", session: "s", at }).refused,
        ).toMatch(/positive/);
        expect(recordVerdict(state, { verdict: "duplicate", number: 5, of: 5, session: "s", at }).refused).toMatch(
            /of$/,
        );
        expect(
            recordVerdict(state, { verdict: "not-needed", number: 5, evidence: "  ", session: "s", at }).refused,
        ).toBe("not-needed needs evidence");
        veto(state, "issue:5", { by: "owner", reason: "githerd veto", at });
        expect(recordVerdict(state, dup("s1")).refused).toBe("issue:5 is vetoed");
    });
});

describe("proposalComment", () => {
    it("names the other item or the evidence, the grace and the veto command, in ASCII", () => {
        const text = proposalComment({ kind: "already-merged", target: "pr:9", of: 8 });
        expect(text).toContain("merged through #8");
        expect(text).toContain(`after ${GRACE_DAYS.pr} more days`);
        expect(text).toContain("githerd veto pr:9");
        expect(proposalComment({ kind: "not-needed", target: "issue:5", evidence: "done in #12" })).toContain(
            "Evidence: done in #12",
        );
        for (const kind of ["duplicate", "obsolete", "fixed", "duplicate-pr"]) {
            expect(proposalComment({ kind, target: "issue:1", of: 2, evidence: "e" })).toMatch(/^[\x20-\x7e\n]+$/);
        }
    });
});

describe("advanceProposals: comment, grace in owner-present days, close", () => {
    /**
     * A world with a confirmed duplicate proposal on issue 5.
     * @param {"acting" | "dry-run"} mode the group's mode
     * @returns {{w: any, state: any}} the world and the state
     */
    function confirmed(mode) {
        const w = world(mode);
        const state = {};
        recordVerdict(state, dup("s1"));
        recordVerdict(state, dup("s2"));
        return { w, state };
    }

    it("acting: comments once, closes after 7 present days not counting the comment's day", async () => {
        const { w, state } = confirmed("acting");
        await advanceProposals(state, w.ctx());
        const p = state.proposals["issue:5"];
        expect(p).toMatchObject({ status: "commented", dryRun: false, presentDays: 0 });
        expect(w.items[5].comments).toHaveLength(1);
        w.present();
        await advanceProposals(state, w.ctx()); // the comment's day: not counted
        expect(p.presentDays).toBe(0);
        await days(w, state, GRACE_DAYS.issue - 1);
        expect(p.status).toBe("commented");
        expect(w.items[5].state).toBe("open");
        await days(w, state, 1);
        expect(p.status).toBe("closed");
        expect(w.items[5].state).toBe("closed");
        expect(w.gh.writes().map((c) => c.args.slice(2, 5).join(" "))).toEqual([
            `-X POST repos/${REPO}/issues/5/comments`,
            `-X PATCH repos/${REPO}/issues/5`,
        ]);
        expect(JSON.parse(w.gh.writes()[1].input)).toEqual({ state: "closed", state_reason: "not_planned" });
        expect(w.ledger.filter((e) => e.kind === "proposal").map((e) => e.to)).toEqual(["commented", "closed"]);
        await days(w, state, 1);
        expect(w.gh.writes()).toHaveLength(2);
    });

    it("dry-run: the same timeline with zero writes, marked dryRun", async () => {
        const { w, state } = confirmed("dry-run");
        await days(w, state, GRACE_DAYS.issue + 1);
        expect(state.proposals["issue:5"]).toMatchObject({ status: "closed", dryRun: true });
        expect(w.gh.writes()).toEqual([]);
        expect(w.ledger.filter((e) => e.kind === "would-do").map((e) => e.situation)).toEqual([
            "propose duplicate",
            "close duplicate",
        ]);
    });

    it("days without the owner do not count", async () => {
        const { w, state } = confirmed("acting");
        await advanceProposals(state, w.ctx());
        await days(w, state, 30, { away: true });
        expect(state.proposals["issue:5"]).toMatchObject({ status: "commented", presentDays: 0 });
        await days(w, state, GRACE_DAYS.issue);
        expect(state.proposals["issue:5"].status).toBe("closed");
    });

    it("a pull request closes after 3 present days through the pulls path; fixed closes as completed", async () => {
        const w = world("acting");
        const state = {};
        recordVerdict(state, { verdict: "already-merged", number: 9, of: 8, session: "daemon", at });
        recordVerdict(state, { verdict: "fixed", number: 6, evidence: "fixed by #12", session: "s1", at });
        recordVerdict(state, { verdict: "fixed", number: 6, evidence: "fixed by #12", session: "s2", at });
        await advanceProposals(state, w.ctx());
        await days(w, state, GRACE_DAYS.pr);
        expect(state.proposals["pr:9"].status).toBe("closed");
        expect(state.proposals["issue:6"].status).toBe("commented");
        expect(w.gh.writes().at(-1).args).toContain(`repos/${REPO}/pulls/9`);
        expect(JSON.parse(w.gh.writes().at(-1).input)).toEqual({ state: "closed" });
        await days(w, state, GRACE_DAYS.issue - GRACE_DAYS.pr);
        expect(JSON.parse(w.gh.writes().at(-1).input)).toEqual({ state: "closed", state_reason: "completed" });
    });
});

describe("advanceProposals: vetoes and objections", () => {
    it("an owner comment after the proposal is an objection: vetoed, never proposed again", async () => {
        const w = world("acting");
        const state = {};
        recordVerdict(state, dup("s1"));
        recordVerdict(state, dup("s2"));
        await advanceProposals(state, w.ctx());
        w.advance(60_000);
        w.item(5).comments.push({
            id: 7,
            user: { login: OWNER },
            created_at: new Date(START + 60_000).toISOString(),
            body: "keep this",
        });
        await days(w, state, 1);
        expect(state.proposals["issue:5"]).toMatchObject({
            status: "vetoed",
            reason: "the owner commented on issue:5",
        });
        expect(state.vetoes["issue:5"].by).toBe("owner");
        expect(recordVerdict(state, dup("s3")).refused).toBe("issue:5 is vetoed");
        await days(w, state, GRACE_DAYS.issue);
        expect(w.items[5].state).toBe("open");
    });

    it("ignores other accounts, githerd's own marked comments and worker writes", async () => {
        const w = world("acting");
        const state = {};
        recordVerdict(state, dup("s1"));
        recordVerdict(state, dup("s2"));
        await advanceProposals(state, w.ctx());
        const later = new Date(START + 60_000).toISOString();
        w.item(5).comments.push(
            { id: 7, user: { login: "someone" }, created_at: later, body: "no" },
            { id: 8, user: { login: OWNER }, created_at: later, body: "status\n<!-- githerd item=x -->" },
            { id: 9, user: { login: OWNER }, created_at: later, body: "written by a worker" },
        );
        const isWorkerWrite = (target, when) => target === "issue:5" && when === later;
        await days(w, state, GRACE_DAYS.issue, { isWorkerWrite });
        expect(state.proposals["issue:5"].status).toBe("closed");
    });

    it("githerd veto ends an open proposal before its comment or its close", async () => {
        const w = world("acting");
        const state = {};
        recordVerdict(state, { verdict: "duplicate-pr", number: 11, of: 10, session: "daemon", at });
        expect(veto(state, "pr:11", { by: "owner", reason: "githerd veto", at })).toMatchObject({ status: "vetoed" });
        expect(veto(state, "pr:11", { by: "owner", reason: "again", at })).toBeUndefined();
        await days(w, state, GRACE_DAYS.pr + 1);
        expect(w.gh.writes()).toEqual([]);
        // A veto recorded straight into state (another code path) is honored at the next step.
        recordVerdict(state, { verdict: "already-merged", number: 12, of: 10, session: "daemon", at });
        state.vetoes["pr:12"] = { by: "owner", reason: "reopened by the owner", at };
        await advanceProposals(state, w.ctx());
        expect(state.proposals["pr:12"]).toMatchObject({ status: "vetoed", reason: "reopened by the owner" });
        expect(w.gh.writes()).toEqual([]);
    });

    it("a target closed by someone else ends the proposal, before the comment or at the close", async () => {
        const w = world("acting");
        const state = {};
        recordVerdict(state, { verdict: "already-merged", number: 9, of: 8, session: "daemon", at });
        recordVerdict(state, { verdict: "duplicate-pr", number: 11, of: 10, session: "daemon", at });
        w.item(9).state = "closed";
        await advanceProposals(state, w.ctx());
        expect(state.proposals["pr:9"]).toMatchObject({ status: "ended", reason: "pr:9 was closed by someone else" });
        w.item(11).state = "closed";
        await days(w, state, GRACE_DAYS.pr);
        expect(state.proposals["pr:11"].status).toBe("ended");
        expect(w.gh.writes()).toHaveLength(1);
    });

    it("a target known closed on GitHub ends its proposal, unconfirmed included; an open one stays", async () => {
        const w = world("acting");
        const state = {
            issues: { since: null, byNumber: { 5: { state: "closed" }, 6: { state: "open" } } },
        };
        recordVerdict(state, { verdict: "fixed", number: 5, evidence: "done", session: "s1", at });
        recordVerdict(state, { verdict: "fixed", number: 6, evidence: "done", session: "s1", at });
        recordVerdict(state, { verdict: "not-needed-pr", number: 9, evidence: "done", session: "s1", at });
        recordVerdict(state, { verdict: "not-needed-pr", number: 10, evidence: "done", session: "s1", at });
        recordVerdict(state, { verdict: "not-needed-pr", number: 11, evidence: "done", session: "s1", at });
        /** @type {string[]} */
        const queries = [];
        const gitHub = {
            graphql: async (/** @type {string} */ q) => {
                queries.push(q);
                return { repository: { p9: { state: "MERGED" }, p10: { state: "OPEN" } } };
            },
        };
        const closed = await closedTargets(state, { gitHub, repo: REPO, openPrs: new Set([11]) });
        expect([...closed].sort()).toEqual(["issue:5", "pr:9"]);
        expect(queries).toHaveLength(1);
        expect(queries[0]).not.toContain("p11:");
        await advanceProposals(state, w.ctx({ closed }));
        expect(state.proposals["issue:5"]).toMatchObject({ status: "ended", reason: "closed on GitHub" });
        expect(state.proposals["pr:9"]).toMatchObject({ status: "ended", reason: "closed on GitHub" });
        for (const t of ["issue:6", "pr:10", "pr:11"]) expect(state.proposals[t].status).toBe("unconfirmed");
        expect(w.ledger.filter((e) => e.kind === "proposal").map((e) => e.target)).toEqual(["issue:5", "pr:9"]);
        expect(w.gh.calls).toEqual([]);
        // An ended proposal leaves the board's open set: the next poll's closed set no longer names it.
        expect([...(await closedTargets(state, { gitHub, repo: REPO, openPrs: new Set([11]) }))]).toEqual([]);
    });

    it("a failure stays on its proposal and the others still move", async () => {
        const NON_ASCII = `caf${String.fromCodePoint(0xe9)} removed`;
        const w = world("acting");
        const state = {};
        recordVerdict(state, { verdict: "obsolete", number: 5, evidence: NON_ASCII, session: "s1", at });
        recordVerdict(state, { verdict: "obsolete", number: 5, evidence: NON_ASCII, session: "s2", at });
        recordVerdict(state, { verdict: "already-merged", number: 9, of: 8, session: "daemon", at });
        await advanceProposals(state, w.ctx());
        expect(state.proposals["issue:5"].status).toBe("confirmed");
        expect(state.proposals["issue:5"].lastError).toMatch(/ASCII|ascii/);
        expect(state.proposals["pr:9"].status).toBe("commented");
    });
});

describe("advanceProposals: dry-run to acting, crashes and reopens", () => {
    it("a would-do comment is posted for real once the group acts, and grace restarts from it", async () => {
        let mode = "dry-run";
        const w = world(() => mode);
        const state = {};
        recordVerdict(state, dup("s1"));
        recordVerdict(state, dup("s2"));
        await days(w, state, 3);
        expect(state.proposals["issue:5"]).toMatchObject({ status: "commented", dryRun: true });
        mode = "acting";
        await days(w, state, 1);
        expect(state.proposals["issue:5"].status).toBe("confirmed");
        await days(w, state, 1);
        expect(state.proposals["issue:5"]).toMatchObject({ status: "commented", dryRun: false, presentDays: 0 });
        expect(w.items[5].comments).toHaveLength(1);
        await days(w, state, GRACE_DAYS.issue - 1);
        expect(w.items[5].state).toBe("open");
        await days(w, state, 1);
        expect(w.items[5].state).toBe("closed");
    });

    it("a crash after the comment was sent never posts it twice", async () => {
        const state = {};
        let disk = "{}";
        const w = world("acting", () => (disk = JSON.stringify(state)));
        recordVerdict(state, dup("s1"));
        recordVerdict(state, dup("s2"));
        await advanceProposals(state, w.ctx());
        expect(JSON.parse(disk).proposals["issue:5"].status).toBe("commenting");
        // The process dies before its own save: the restart reads what the gate saved.
        const restarted = JSON.parse(disk);
        await advanceProposals(restarted, w.ctx());
        expect(restarted.proposals["issue:5"]).toMatchObject({ status: "commented", commentId: 1000 });
        expect(w.items[5].comments).toHaveLength(1);
    });

    it("the owner reopening a target githerd closed vetoes it; a reopen by someone else does not", async () => {
        const w = world("acting");
        const state = {};
        recordVerdict(state, dup("s1"));
        recordVerdict(state, dup("s2"));
        recordVerdict(state, { ...dup("s1"), number: 6 });
        recordVerdict(state, { ...dup("s2"), number: 6 });
        await advanceProposals(state, w.ctx());
        await days(w, state, GRACE_DAYS.issue + 1);
        expect(w.items[5].state).toBe("closed");
        const reopened = (login) => ({
            event: "reopened",
            actor: { login },
            created_at: new Date(START + 9 * DAY).toISOString(),
        });
        w.items[5].state = "open";
        w.items[5].events.push(reopened(OWNER));
        w.items[6].state = "open";
        w.items[6].events.push(reopened("someone"));
        await days(w, state, 1);
        expect(state.vetoes).toEqual({
            "issue:5": { by: "owner", reason: "the owner reopened it", at: reopened(OWNER).created_at },
        });
        expect(w.ledger.filter((e) => e.kind === "veto")).toEqual([
            { kind: "veto", target: "issue:5", by: "owner", reason: "the owner reopened it" },
        ]);
        expect(recordVerdict(state, dup("s3")).refused).toBe("issue:5 is vetoed");
        expect(state.proposals["issue:6"].watched).toBe(false);
    });
});
