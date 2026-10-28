import { describe, expect, it } from "vitest";

import {
    droppableEscalations,
    escalate,
    expire,
    heartbeat,
    isWatchdogComment,
    resolve,
    resolveDerived,
} from "../lib/board.mjs";
import { endItem, raiseItem } from "../lib/notify.mjs";

const T0 = new Date("2026-10-02T12:00:00Z");
const at = (minutes) => new Date(T0.getTime() + minutes * 60 * 1000);
const A = { session: "githerd-100" };
const B = { session: "other-200" };

/**
 * An empty board.
 * @returns {any} the state
 */
function fresh() {
    return { sessions: {}, claims: {}, escalations: {} };
}

/**
 * Puts a claim on the board, as a session's earlier claim left it.
 * @param {any} state the state
 * @param {string} target the target
 */
function claim(state, target) {
    state.claims[target] = { target, holder: "githerd-100" };
}

describe("expire and session liveness", () => {
    it("keeps a claim while the registry names its holder, however long since it was heard", () => {
        const state = fresh();
        heartbeat(state, { session: "githerd-100" }, T0);
        claim(state, "pr:1");
        const gone = (/** @type {string} */ s) => s !== "githerd-100";
        expect(expire(state, gone)).toEqual([]);
        expect(Object.keys(state.sessions)).toEqual(["githerd-100"]);
    });

    it("lapses a session's claims and forgets it as soon as the registry loses it", () => {
        const state = fresh();
        heartbeat(state, { session: "githerd-100", cwd: "/w", branch: "feat/x" }, T0);
        heartbeat(state, { session: "other-200" }, T0);
        claim(state, "pr:1");
        state.claims["pr:2"] = { target: "pr:2", holder: "daemon" };
        const gone = (/** @type {string} */ s) => s !== "other-200";
        expect(expire(state, gone)).toEqual([{ target: "pr:1", holder: "githerd-100", reason: "holder-gone" }]);
        expect(Object.keys(state.sessions)).toEqual(["other-200"]);
        expect(Object.keys(state.claims)).toEqual(["pr:2"]);
    });
});

describe("escalations", () => {
    const args = { key: "decide:npm-name", kind: "decision", summary: "pick the npm name" };

    it("dedupes an open key and re-raises after it was resolved", () => {
        const state = fresh();
        const first = escalate(state, args, A, T0);
        expect(first).toMatchObject({
            ok: true,
            existing: false,
            escalation: { raisedBy: "githerd-100", clearWhen: null },
        });
        expect(escalate(state, { ...args, summary: "changed" }, B, at(1))).toMatchObject({
            existing: true,
            escalation: { summary: "pick the npm name" },
        });

        expect(resolve(state, { key: args.key }, at(2))).toMatchObject({
            ok: true,
            escalation: { resolvedAt: at(2).toISOString() },
        });
        expect(resolve(state, { key: args.key }, at(3))).toMatchObject({ ok: false });
        expect(resolve(state, { key: "nope" }, at(3))).toEqual({ ok: false, error: "no escalation nope" });
        expect(escalate(state, args, A, at(4))).toMatchObject({
            existing: false,
            escalation: { raisedAt: at(4).toISOString() },
        });
    });

    it("clears a derived escalation when its condition clears, and leaves manual ones alone", () => {
        const state = fresh();
        escalate(
            state,
            { key: "visual-review:pr:704", kind: "visual-review", summary: "s", clearWhen: "pr-merged-or-gate-passed" },
            { daemon: true },
            T0,
        );
        escalate(state, { key: "manual:x", kind: "other", summary: "s", clearWhen: "ignored-from-session" }, A, T0);
        expect(state.escalations["manual:x"].clearWhen).toBeNull();

        expect(resolveDerived(state, () => true, at(1))).toEqual([]);
        expect(resolveDerived(state, (e) => e.target === "still", at(2))).toEqual(["visual-review:pr:704"]);
        expect(state.escalations["visual-review:pr:704"].resolvedAt).toBe(at(2).toISOString());
        expect(state.escalations["manual:x"].resolvedAt).toBeNull();
    });
});

describe("isWatchdogComment", () => {
    it("knows the watchdog's heartbeat and master-clock marks, and nothing else", () => {
        expect(isWatchdogComment("x\n\n<!-- watchdog:stale:2026-10-05T00:00:00.000Z -->")).toBe(true);
        expect(isWatchdogComment("recovered <!-- watchdog:recovered:never -->")).toBe(true);
        expect(isWatchdogComment("<!-- master-clock:abc123 -->")).toBe(true);
        expect(isWatchdogComment("ship it")).toBe(false);
        expect(isWatchdogComment("<!-- githerd:owner-item x -->")).toBe(false);
        expect(isWatchdogComment(null)).toBe(false);
    });
});

describe("droppableEscalations: a resolved escalation leaves the state once nothing reads it", () => {
    const args = { key: "release-failed:issue-12", kind: "release-failed", summary: "release held" };

    it("waits for its owner item to be ended as cleared and its job to finish, and a re-raise is the same", () => {
        const state = /** @type {any} */ (fresh());
        escalate(state, args, { daemon: true }, T0);
        raiseItem(state, { id: `escalation:${args.key}`, kind: args.kind, question: args.summary }, T0);
        state.jobs = { j: { id: "incident-x", kind: "incident", target: args.key, state: "working" } };
        expect(droppableEscalations(state)).toEqual([]);
        resolve(state, { key: args.key }, at(1));
        // The owner item is still open: the daemon's escalationItems has not ended it yet.
        expect(droppableEscalations(state)).toEqual([]);
        endItem(state, `escalation:${args.key}`, "cleared", at(2));
        // The release fix job's report still reads the escalation's run.
        expect(droppableEscalations(state)).toEqual([]);
        state.jobs.j.state = "done";
        expect(droppableEscalations(state)).toEqual([args.key]);
        const kept = structuredClone(state);
        const ledger = [{ kind: "escalation-dropped", escalation: args.key, record: state.escalations[args.key] }];
        delete state.escalations[args.key];
        expect(ledger[0].record.resolvedAt).toBe(at(1).toISOString());
        expect(escalate(state, args, A, at(3))).toEqual(escalate(kept, args, A, at(3)));
    });

    it("drops one with no owner item, or one the owner answered once its condition cleared", () => {
        const state = /** @type {any} */ (fresh());
        escalate(state, { ...args, key: "a" }, A, T0);
        escalate(state, { ...args, key: "b" }, { daemon: true }, T0);
        raiseItem(state, { id: "escalation:b", kind: args.kind, question: "q" }, T0);
        endItem(state, "escalation:b", "answer", at(1));
        resolve(state, { key: "a" }, at(1));
        resolve(state, { key: "b" }, at(1));
        expect(droppableEscalations(state)).toEqual(["a"]);
        endItem(state, "escalation:b", "cleared", at(2));
        expect(droppableEscalations(state)).toEqual(["a", "b"]);
    });
});
