import { describe, expect, it } from "vitest";

import { checkInvariants, move, newJob } from "../lib/board.mjs";
import { planPages, readAnswers } from "../lib/notify.mjs";
import {
    activePolicies,
    askOwner,
    endPolicy,
    orderPosition,
    ownerCommand,
    recordOwner,
    resumeAnswered,
    STEERED_RECORD_MS,
} from "../lib/owner.mjs";

const T0 = Date.parse("2026-10-05T17:00:00Z");
const MIN = 60_000;
const at = (/** @type {number} */ ms) => new Date(T0 + ms);
const ASK = {
    job: "issue-737",
    kind: "one-way-door",
    question: "Rename the exported type?",
    options: [{ choice: "rename", undoCost: "a major release" }],
};

/**
 * A state with one working issue job held by session s1, the owner present.
 * @returns {any} the state
 */
function working() {
    const job = newJob({ kind: "issue", target: 737 }, at(0));
    move(job, "starting", at(0), { holder: { session: "s1" } });
    move(job, "working", at(0));
    job.sessions = ["s1"];
    return { jobs: { [job.id]: job }, presence: { lastAt: at(0).toISOString(), source: "session", days: [] } };
}

/**
 * The invariant check's reads, with every session alive.
 * @param {any} state the state whose items are read
 * @returns {any} the reads
 */
const READS = (state) => ({
    sessionAlive: () => true,
    recovering: () => false,
    waitPending: () => true,
    itemOpen: (/** @type {string} */ id) => Boolean(state.ownerItems?.[id] && !state.ownerItems[id].endedAt),
});

describe("githerd_ask_owner", () => {
    it("raises one item on the job's issue, parks the job on it, and pages it once", () => {
        const state = working();
        const job = state.jobs["issue-737"];
        const r = askOwner(state, job, ASK, { session: "s1", now: at(MIN) });
        expect(r.result).toEqual({ item: "ask-issue-737", parked: true });
        expect(r.entry).toMatchObject({ kind: "owner-item", event: "raised", job: "issue-737", by: "s1" });
        expect(state.ownerItems["ask-issue-737"]).toMatchObject({
            kind: "one-way-door",
            target: "issue:737",
            options: [{ choice: "rename", undo: "a major release" }],
        });
        expect(job).toMatchObject({ state: "parked", waitingFor: { owner: "ask-issue-737" }, deadline: null });
        expect(checkInvariants(state, READS(state))).toEqual([]);
        expect(planPages(state, at(2 * MIN))).toHaveLength(1);
    });

    it("returns the open item on a second call: no new item, no page", () => {
        const state = working();
        const job = state.jobs["issue-737"];
        askOwner(state, job, ASK, { session: "s1", now: at(MIN) });
        planPages(state, at(MIN));
        const again = askOwner(
            state,
            job,
            { ...ASK, question: "Something else?" },
            { session: "s1", now: at(20 * MIN) },
        );
        expect(again).toEqual({ result: { item: "ask-issue-737", parked: true }, entry: null });
        expect(state.ownerItems["ask-issue-737"].question).toBe("Rename the exported type?");
        expect(planPages(state, at(30 * MIN))).toEqual([]);
    });

    it("puts the item where it belongs: a named number, the job's pull request, or the board", () => {
        const state = working();
        const job = state.jobs["issue-737"];
        job.pr = 900;
        askOwner(state, job, { ...ASK, target: 12 }, { session: "s1", now: at(0) });
        expect(state.ownerItems["ask-issue-737"].target).toBe("issue:12");

        const s2 = working();
        s2.jobs["issue-737"].pr = 900;
        askOwner(s2, s2.jobs["issue-737"], { ...ASK, target: 900 }, { session: "s1", now: at(0) });
        expect(s2.ownerItems["ask-issue-737"].target).toBe("pr:900");

        const s3 = working();
        s3.jobs["issue-737"].pr = 901;
        askOwner(s3, s3.jobs["issue-737"], ASK, { session: "s1", now: at(0) });
        expect(s3.ownerItems["ask-issue-737"].target).toBe("pr:901");

        const s4 = working();
        const incident = s4.jobs["issue-737"];
        incident.kind = "incident";
        askOwner(s4, incident, ASK, { session: "s1", now: at(0) });
        expect(s4.ownerItems["ask-issue-737"].target).toBeNull();
    });

    it("refuses a job that is not working", () => {
        const state = working();
        const job = state.jobs["issue-737"];
        move(job, "waiting", at(0), { waitingFor: { checks: "abc" } });
        expect(() => askOwner(state, job, ASK, { session: "s1", now: at(0) })).toThrow(/is waiting/);
        expect(state.ownerItems).toBeUndefined();
    });
});

describe("answers", () => {
    /**
     * A state with the job parked on its item, already paged.
     * @returns {any} the state
     */
    function parked() {
        const state = working();
        askOwner(state, state.jobs["issue-737"], ASK, { session: "s1", now: at(0) });
        planPages(state, at(0));
        return state;
    }

    it("an answer ends the item and sends the job back to work with the answer in its news", () => {
        const state = parked();
        const r = recordOwner(
            state,
            { kind: "answer", item: "ask-issue-737", text: "keep the name" },
            {
                session: "owner-1",
                now: at(5 * MIN),
            },
        );
        expect(r.resumed).toEqual([{ job: "issue-737", session: "s1" }]);
        expect(r.entry).toMatchObject({ event: "ended", answer: "keep the name", resumed: ["issue-737"] });
        expect(state.ownerItems["ask-issue-737"]).toMatchObject({ endedBy: "record", answer: "keep the name" });
        const job = state.jobs["issue-737"];
        expect(job.state).toBe("working");
        expect(job.news.at(-1).text).toBe("the owner answered ask-issue-737: keep the name");
        expect(state.presence.lastAt).toBe(at(5 * MIN).toISOString());
    });

    it('"not yet" keeps the item open and the job parked on it, and pages nobody', () => {
        const state = parked();
        const job = state.jobs["issue-737"];
        const r = recordOwner(
            state,
            { kind: "answer", item: "ask-issue-737", text: "Not yet, after the release" },
            {
                session: "owner-1",
                now: at(5 * MIN),
            },
        );
        expect(r.resumed).toEqual([]);
        expect(r.entry).toMatchObject({ event: "not-yet" });
        expect(state.ownerItems["ask-issue-737"].endedAt).toBeUndefined();
        expect(job).toMatchObject({ state: "parked", waitingFor: { owner: "ask-issue-737" } });
        expect(job.stateSince).toBe(at(5 * MIN).toISOString());
        expect(planPages(state, at(60 * MIN))).toEqual([]);
        expect(planPages(state, at(26 * 60 * MIN))).toEqual([]);
        expect(checkInvariants(state, READS(state))).toEqual([]);
    });

    it('"not yet" before the first page also pages nobody', () => {
        const state = working();
        askOwner(state, state.jobs["issue-737"], ASK, { session: "s1", now: at(0) });
        ownerCommand(state, { op: "answer", item: "ask-issue-737", text: "not yet" }, at(MIN));
        expect(planPages(state, at(2 * MIN))).toEqual([]);
    });

    it("resumes jobs whose item ended another way, and leaves open ones parked", () => {
        const state = parked();
        expect(resumeAnswered(state, at(MIN))).toEqual([]);
        state.ownerItems["ask-issue-737"].endedAt = at(2 * MIN).toISOString();
        state.ownerItems["ask-issue-737"].endedBy = "label-removed";
        state.jobs["issue-737"].holder = null;
        expect(resumeAnswered(state, at(3 * MIN))).toEqual([{ job: "issue-737", session: "s1" }]);
        expect(state.jobs["issue-737"].news.at(-1).text).toBe("the owner answered ask-issue-737 (label-removed)");
    });

    it("refuses an answer with no item or to an item that is not open", () => {
        const state = parked();
        const caller = { session: "o", now: at(0) };
        expect(() => recordOwner(state, { kind: "answer", text: "yes" }, caller)).toThrow(/names its item/);
        expect(() => recordOwner(state, { kind: "answer", item: "nope", text: "yes" }, caller)).toThrow(/no open/);
    });

    it('a "not yet" comment on GitHub keeps the item open and is read once', async () => {
        const state = parked();
        const item = state.ownerItems["ask-issue-737"];
        item.github = { text: "x", performed: true, at: at(MIN).toISOString(), labeled: true };
        /** @type {any[]} */
        let comments = [{ user: { login: "me" }, created_at: at(2 * MIN).toISOString(), body: "not yet" }];
        const api = {
            get: async (/** @type {string} */ path) => ({
                body: path.endsWith("/labels") ? [{ name: "needs-decision" }] : comments,
            }),
        };
        expect(await readAnswers({ api, repo: "o/r", state, login: "me", now: at(3 * MIN) })).toEqual([]);
        expect(item).toMatchObject({ deferredAt: at(2 * MIN).toISOString() });
        expect(await readAnswers({ api, repo: "o/r", state, login: "me", now: at(4 * MIN) })).toEqual([]);
        expect(planPages(state, at(5 * MIN))).toEqual([]);
        comments = [...comments, { user: { login: "me" }, created_at: at(6 * MIN).toISOString(), body: "go ahead" }];
        expect(await readAnswers({ api, repo: "o/r", state, login: "me", now: at(7 * MIN) })).toEqual([
            "ask-issue-737",
        ]);
        expect(item.answer).toBe("go ahead");
        expect(resumeAnswered(state, at(7 * MIN))[0].job).toBe("issue-737");
        expect(state.jobs["issue-737"].news.at(-1).text).toBe("the owner answered ask-issue-737: go ahead");
    });
});

describe("who may record", () => {
    it("refuses a worker unless the owner steered it in the last 30 minutes", () => {
        const state = working();
        const policy = { kind: /** @type {const} */ ("policy"), text: "no new dependencies" };
        const caller = { session: "s1", worker: "issue-737", now: at(60 * MIN) };
        expect(() => recordOwner(state, policy, caller)).toThrow(/within 30 minutes/);
        state.jobs["issue-737"].steeredAt = at(60 * MIN - STEERED_RECORD_MS - 1).toISOString();
        expect(() => recordOwner(state, policy, caller)).toThrow(/within 30 minutes/);
        expect(state.policies).toBeUndefined();
        state.jobs["issue-737"].steeredAt = at(40 * MIN).toISOString();
        expect(recordOwner(state, policy, caller).text).toBe("recorded policy-1: no new dependencies");
    });

    it("refuses an unknown kind and an item outside an answer", () => {
        const state = working();
        const caller = { session: "o", now: at(0) };
        expect(() => recordOwner(state, /** @type {any} */ ({ kind: "wish", text: "x" }), caller)).toThrow(/not wish/);
        expect(() => recordOwner(state, { kind: "policy", text: "x", item: "a" }, caller)).toThrow(
            /belongs to an answer/,
        );
    });
});

describe("orders", () => {
    it("fixes the issue list when recorded and orders issue jobs after every earlier order", () => {
        const state = working();
        const caller = { session: "o", now: at(0) };
        const first = recordOwner(state, { kind: "order", text: "the bugs first", issues: [5, 6] }, caller);
        expect(first.text).toBe("recorded order-1: #5 #6");
        const issues = [737, 5];
        const second = recordOwner(state, { kind: "order", text: "then these", issues }, caller);
        issues.push(99);
        expect(second.entry).toMatchObject({ kind: "order", id: "order-2", issues: [737, 5] });
        expect(state.orders[1].issues).toEqual([737, 5]);
        expect(orderPosition(state, 5)).toBe(0);
        expect(orderPosition(state, 737)).toBe(2);
        expect(orderPosition(state, 99)).toBeNull();
        expect(state.jobs["issue-737"].facts.order).toBe(2);
        expect(checkInvariants(state, READS(state))).toEqual([
            { record: "order order-1", problem: "issue #5 has no job and no reason" },
            { record: "order order-1", problem: "issue #6 has no job and no reason" },
            { record: "order order-2", problem: "issue #5 has no job and no reason" },
        ]);
    });

    it("refuses an order with no issues or with a switch", () => {
        const state = working();
        const caller = { session: "o", now: at(0) };
        expect(() => recordOwner(state, { kind: "order", text: "x" }, caller)).toThrow(/lists its issues/);
        expect(() =>
            recordOwner(state, { kind: "order", text: "x", issues: [1], switch: "freeze-merges" }, caller),
        ).toThrow(/belongs to a policy/);
    });
});

describe("policies", () => {
    it("records free text and switches, lists the active ones, and ends one", () => {
        const state = working();
        const caller = { session: "o", now: at(0) };
        recordOwner(state, { kind: "policy", text: "no new dependencies" }, caller);
        const gate = recordOwner(
            state,
            { kind: "policy", text: "out of credit", switch: "park-gate", value: "chromatic" },
            caller,
        );
        expect(gate.text).toBe("recorded policy-2 (park-gate chromatic): out of credit");
        const freeze = recordOwner(state, { kind: "policy", text: "release week", switch: "freeze-merges" }, caller);
        expect(freeze.text).toBe("recorded policy-3 (freeze-merges): release week");
        expect(activePolicies(state).map((p) => p.id)).toEqual(["policy-1", "policy-2", "policy-3"]);
        expect(activePolicies(state, "park-gate")).toMatchObject([{ value: "chromatic" }]);
        expect(endPolicy(state, "policy-2", at(MIN)).text).toBe("ended policy-2: out of credit");
        expect(activePolicies(state, "park-gate")).toEqual([]);
        expect(() => endPolicy(state, "policy-2", at(MIN))).toThrow(/no active policy/);
        expect(activePolicies({})).toEqual([]);
    });

    it("refuses a switch with the wrong value", () => {
        const state = working();
        const caller = { session: "o", now: at(0) };
        const bad = (/** @type {any} */ extra) => () =>
            recordOwner(state, { kind: "policy", text: "x", ...extra }, caller);
        expect(bad({ switch: "melt" })).toThrow(/no policy switch melt/);
        expect(bad({ switch: "hold-package" })).toThrow(/names a lane, service or package/);
        expect(bad({ switch: "freeze-merges", value: "x" })).toThrow(/takes no value/);
        expect(bad({ value: "x" })).toThrow(/belongs to a switch/);
    });
});

describe("the owner's CLI", () => {
    it("records orders, policies and answers, ends policies, and counts as CLI presence", () => {
        const state = working();
        expect(ownerCommand(state, { op: "order", issues: [3], text: "do 3" }, at(MIN))).toMatchObject({
            status: 200,
            text: "recorded order-1: #3",
        });
        expect(state.presence.source).toBe("cli");
        expect(
            ownerCommand(state, { op: "policy", text: "x", switch: "hold-package", value: "layout" }, at(0)).status,
        ).toBe(200);
        expect(ownerCommand(state, { op: "policy-end", id: "policy-1" }, at(0)).text).toBe("ended policy-1: x");
        expect(ownerCommand(state, { op: "policy-end", id: "policy-1" }, at(0))).toEqual({
            status: 409,
            text: "no active policy policy-1",
        });
        expect(ownerCommand(state, { op: "dance" }, at(0)).status).toBe(400);
        expect(ownerCommand(state, null, at(0)).status).toBe(400);
        expect(ownerCommand(state, { op: "policy" }, at(0))).toEqual({ status: 400, text: "policy needs words" });
        askOwner(state, state.jobs["issue-737"], ASK, { session: "s1", now: at(0) });
        const answered = ownerCommand(state, { op: "answer", item: "ask-issue-737", text: "rename it" }, at(MIN));
        expect(answered).toMatchObject({ status: 200, text: "answered ask-issue-737; back at work: issue-737" });
        expect(answered.entry).toMatchObject({ by: "owner" });
    });
});
