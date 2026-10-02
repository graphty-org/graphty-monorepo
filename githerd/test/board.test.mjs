import { describe, expect, it } from "vitest";

import {
    claim,
    escalate,
    expire,
    heartbeat,
    holderAlive,
    release,
    releaseRun,
    report,
    resolve,
    resolveDerived,
    targetsConflict,
} from "../lib/board.mjs";

const T0 = new Date("2026-10-02T12:00:00Z");
const at = (minutes) => new Date(T0.getTime() + minutes * 60 * 1000);
const A = { session: "githerd-100" };
const B = { session: "other-200" };

/**
 * An empty board.
 * @returns {any} the state
 */
function fresh() {
    return { sessions: {}, claims: {}, escalations: {}, runs: {} };
}

describe("claim", () => {
    it("grants a free target and refuses a second holder with the first holder's details", () => {
        const state = fresh();
        const first = claim(state, { target: "pr:704", purpose: "fix Build", holderName: "bc" }, A, T0, T0);
        expect(first).toMatchObject({ ok: true, renewed: false, claim: { holder: "githerd-100", fixPr: null } });
        expect(first.ok && first.claim.expiresAt).toBe(at(120).toISOString());

        expect(claim(state, { target: "pr:704", purpose: "also" }, B, at(1), T0)).toEqual({
            ok: false,
            target: "pr:704",
            heldBy: "githerd-100",
            holderName: "bc",
            purpose: "fix Build",
            expiresAt: at(120).toISOString(),
        });
    });

    it("renews when the same holder claims again", () => {
        const state = fresh();
        claim(state, { target: "issue:5", purpose: "one" }, A, T0, T0);
        const again = claim(
            state,
            { target: "issue:5", purpose: "two", ttlMinutes: 30, holderName: "n" },
            A,
            at(10),
            T0,
        );
        expect(again).toMatchObject({
            ok: true,
            renewed: true,
            claim: { purpose: "two", holderName: "n", claimedAt: T0.toISOString(), renewedAt: at(10).toISOString() },
        });
        expect(again.ok && again.claim.expiresAt).toBe(at(40).toISOString());
    });

    it("caps the lifetime at 480 minutes", () => {
        const state = fresh();
        const result = claim(state, { target: "task:big-job", purpose: "p", ttlMinutes: 9999 }, A, T0, T0);
        expect(result.ok && result.claim.expiresAt).toBe(at(480).toISOString());
    });

    it("lets another holder take a claim once it has expired", () => {
        const state = fresh();
        claim(state, { target: "pr:1", purpose: "p", ttlMinutes: 5 }, A, T0, T0);
        heartbeat(state, { session: "githerd-100" }, at(5));
        expect(claim(state, { target: "pr:1", purpose: "q" }, B, at(5), T0)).toMatchObject({
            ok: true,
            claim: { holder: "other-200" },
        });
    });

    it("refuses overlapping path claims on a segment boundary only", () => {
        const state = fresh();
        claim(state, { target: "path:graphty-element/src", purpose: "p" }, A, T0, T0);
        expect(claim(state, { target: "path:graphty-element", purpose: "q" }, B, T0, T0)).toMatchObject({
            ok: false,
            heldBy: "githerd-100",
        });
        expect(claim(state, { target: "path:graphty-element/src/Edge.ts", purpose: "q" }, B, T0, T0)).toMatchObject({
            ok: false,
        });
        expect(claim(state, { target: "path:graphty-element/srcx", purpose: "q" }, B, T0, T0)).toMatchObject({
            ok: true,
        });
        expect(claim(state, { target: "path:graphty-element/src/x", purpose: "own" }, A, T0, T0)).toMatchObject({
            ok: true,
        });
    });

    it("accepts fixPr from a session on master only, and never from a run", () => {
        const state = fresh();
        state.runs["run-20261002-0001-ab"] = { status: "running" };
        expect(
            claim(state, { target: "master", purpose: "p", fixPr: 9 }, { run: "run-20261002-0001-ab" }, T0, T0),
        ).toEqual({
            ok: false,
            error: "fixPr is accepted from interactive sessions only",
        });
        expect(claim(state, { target: "pr:9", purpose: "p", fixPr: 9 }, A, T0, T0)).toMatchObject({ ok: false });
        expect(state.claims).toEqual({});
        expect(claim(state, { target: "master", purpose: "p", fixPr: 9 }, A, T0, T0)).toMatchObject({
            ok: true,
            claim: { fixPr: 9 },
        });
    });

    it("throws for a caller with no identity", () => {
        expect(() => claim(fresh(), { target: "pr:1", purpose: "p" }, {}, T0, T0)).toThrow("caller names no session");
    });
});

describe("expire and session liveness", () => {
    it("ends a claim whose time ran out", () => {
        const state = fresh();
        claim(state, { target: "pr:1", purpose: "p", ttlMinutes: 5 }, A, T0, T0);
        heartbeat(state, { session: "githerd-100" }, at(4));
        expect(expire(state, at(4), T0)).toEqual([]);
        expect(expire(state, at(5), T0)).toEqual([{ target: "pr:1", holder: "githerd-100", reason: "expired" }]);
    });

    it("lapses a dead session's claims and forgets the session", () => {
        const state = fresh();
        heartbeat(state, { session: "githerd-100", cwd: "/w", branch: "feat/x" }, T0);
        claim(state, { target: "pr:1", purpose: "p" }, A, T0, T0);
        expect(expire(state, at(14), T0)).toEqual([]);
        expect(expire(state, at(15), T0)).toEqual([{ target: "pr:1", holder: "githerd-100", reason: "holder-gone" }]);
        expect(state.sessions).toEqual({});
    });

    it("gives every session one full interval after a daemon restart", () => {
        const state = fresh();
        heartbeat(state, { session: "githerd-100" }, T0);
        claim(state, { target: "pr:1", purpose: "p" }, A, T0, T0);
        const restart = at(60);
        expect(expire(state, at(74), restart)).toEqual([]);
        expect(expire(state, at(75), restart)).toMatchObject([{ reason: "holder-gone" }]);
    });

    it("keeps a run's claim while the run is running and drops it when the run ends", () => {
        const state = fresh();
        const run = "run-20261002-0002-cd";
        state.runs[run] = { status: "running" };
        claim(state, { target: "master", purpose: "fix" }, { run }, T0, T0);
        expect(expire(state, at(60), T0)).toEqual([]);
        expect(releaseRun(state, run)).toEqual(["master"]);
        expect(state.claims).toEqual({});
        state.runs[run].status = "done";
        claim(state, { target: "pr:3", purpose: "fix" }, { run }, T0, T0);
        expect(expire(state, at(1), T0)).toMatchObject([{ target: "pr:3", reason: "holder-gone" }]);
    });
});

describe("release", () => {
    it("lets the holder release, refuses a live non-holder, and reports a missing claim", () => {
        const state = fresh();
        heartbeat(state, { session: "other-200" }, T0);
        claim(state, { target: "pr:1", purpose: "p" }, A, T0, T0);
        expect(release(state, { target: "pr:1" }, B, T0, T0)).toMatchObject({
            ok: false,
            error: expect.stringContaining("still alive"),
        });
        expect(release(state, { target: "pr:1", outcome: "abandoned" }, A, T0, T0)).toMatchObject({
            ok: true,
            outcome: "abandoned",
        });
        expect(release(state, { target: "pr:1" }, A, T0, T0)).toEqual({ ok: false, error: "no claim on pr:1" });
    });

    it("lets anyone release a claim whose holder is gone", () => {
        const state = fresh();
        claim(state, { target: "pr:1", purpose: "p", ttlMinutes: 480 }, A, T0, T0);
        expect(release(state, { target: "pr:1" }, B, at(20), T0)).toMatchObject({ ok: true, outcome: "done" });
        expect(state.claims).toEqual({});
    });
});

describe("report", () => {
    it("records what a session is doing and refuses runs", () => {
        const state = fresh();
        expect(report(state, { doing: "resolving #519", targets: ["pr:519"], pr: 519 }, A, T0)).toMatchObject({
            ok: true,
            session: { doing: "resolving #519", targets: ["pr:519"], pr: 519, lastSeen: T0.toISOString() },
        });
        expect(report(state, { doing: "x" }, { run: "run-1" }, T0)).toEqual({
            ok: false,
            error: "only interactive sessions report",
        });
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
    it("treats an unknown session as seen at daemon start and an unknown run as gone", () => {
        expect(holderAlive(fresh(), "never-seen", at(14), T0)).toBe(true);
        expect(holderAlive(fresh(), "never-seen", at(15), T0)).toBe(false);
        expect(holderAlive(fresh(), "run-x", T0, T0)).toBe(false);
    });
});

describe("targetsConflict", () => {
    it("matches identical targets and nested paths only", () => {
        expect(targetsConflict("pr:1", "pr:1")).toBe(true);
        expect(targetsConflict("pr:1", "pr:2")).toBe(false);
        expect(targetsConflict("path:a/", "path:a")).toBe(true);
        expect(targetsConflict("path:a", "branch:a")).toBe(false);
    });
});

it("creates the maps on an empty state", () => {
    const state = {};
    expect(heartbeat(state, { session: "s" }, T0)).toMatchObject({ lastSeen: T0.toISOString() });
    expect(state).toMatchObject({ claims: {}, escalations: {} });
});
