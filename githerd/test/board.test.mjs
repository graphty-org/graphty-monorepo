import { describe, expect, it } from "vitest";

import { escalate, expire, heartbeat, holderAlive, resolve, resolveDerived } from "../lib/board.mjs";

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
 * @param {number} ttl minutes from T0
 */
function claim(state, target, ttl = 120) {
    state.claims[target] = { target, holder: "githerd-100", expiresAt: at(ttl).toISOString() };
}

describe("expire and session liveness", () => {
    it("ends a claim whose time ran out", () => {
        const state = fresh();
        claim(state, "pr:1", 5);
        heartbeat(state, { session: "githerd-100" }, at(4));
        expect(expire(state, at(4), T0)).toEqual([]);
        expect(expire(state, at(5), T0)).toEqual([{ target: "pr:1", holder: "githerd-100", reason: "expired" }]);
    });

    it("lapses a dead session's claims and forgets the session", () => {
        const state = fresh();
        heartbeat(state, { session: "githerd-100", cwd: "/w", branch: "feat/x" }, T0);
        claim(state, "pr:1");
        expect(expire(state, at(14), T0)).toEqual([]);
        expect(expire(state, at(15), T0)).toEqual([{ target: "pr:1", holder: "githerd-100", reason: "holder-gone" }]);
        expect(state.sessions).toEqual({});
    });

    it("gives every session one full interval after a daemon restart", () => {
        const state = fresh();
        heartbeat(state, { session: "githerd-100" }, T0);
        claim(state, "pr:1");
        const restart = at(60);
        expect(expire(state, at(74), restart)).toEqual([]);
        expect(expire(state, at(75), restart)).toMatchObject([{ reason: "holder-gone" }]);
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

describe("holderAlive", () => {
    it("treats an unknown session as seen at daemon start", () => {
        expect(holderAlive(fresh(), "never-seen", at(14), T0)).toBe(true);
        expect(holderAlive(fresh(), "never-seen", at(15), T0)).toBe(false);
    });
});
