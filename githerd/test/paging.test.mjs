import { describe, expect, it } from "vitest";

import { DEFAULTS } from "../lib/config.mjs";
import { pagesFor } from "../lib/paging.mjs";

const config = /** @type {any} */ ({ ...DEFAULTS, runs: { ...DEFAULTS.runs } });
const runsOff = /** @type {any} */ ({ ...DEFAULTS, runs: { ...DEFAULTS.runs, maxConcurrent: 0 } });

const incident = {
    status: "open",
    openedAt: "2026-10-02T15:20:00Z",
    confirmedAt: "2026-10-02T15:26:00Z",
    lanes: { ci: { failingJobs: ["Build", "Lint"] } },
    redSha: "abc123456789",
};

/**
 * A state holding one open incident and the given extra fields.
 * @param {Record<string, any>} [extra] more state
 * @returns {any} the state
 */
const stateWith = (extra = {}) => ({ incidents: { "inc-1": incident }, notified: {}, ...extra });

/**
 * An escalation record.
 * @param {string} key its key
 * @param {string} kind its kind
 * @param {Record<string, any>} [extra] more fields
 * @returns {any} the record
 */
const esc = (key, kind, extra = {}) => ({ key, kind, summary: `${kind} ${key}`, raisedBy: "daemon", ...extra });

describe("pagesFor: master red", () => {
    it("pages waiting at once, bypassing the cap, when runs are off", () => {
        const pages = pagesFor(
            { type: "master-red-confirmed", incident: "inc-1", runStarting: true },
            stateWith(),
            runsOff,
        );
        expect(pages).toEqual([
            {
                key: "master-red:inc-1",
                status: "waiting",
                message: "master red: ci (Build, Lint) at abc123456; no fix run will handle it",
                bypass: true,
            },
        ]);
    });

    it("pages at confirmation when no run is starting (milestone 1, run limit spent, budget)", () => {
        const pages = pagesFor({ type: "master-red-confirmed", incident: "inc-1" }, stateWith(), config);
        expect(pages.map((p) => p.key)).toEqual(["master-red:inc-1"]);
    });

    it("waits for the run when a run will handle it, and pages only if the run ends without a fix", () => {
        const state = stateWith();
        expect(pagesFor({ type: "master-red-confirmed", incident: "inc-1", runStarting: true }, state, config)).toEqual(
            [],
        );
        expect(pagesFor({ type: "master-red-run-ended", incident: "inc-1", fixed: true }, state, config)).toEqual([]);
        const pages = pagesFor({ type: "master-red-run-ended", incident: "inc-1", fixed: false }, state, config);
        expect(pages).toEqual([expect.objectContaining({ key: "master-red:inc-1", status: "waiting", bypass: true })]);
        expect(pages[0].message).toContain("the fix run ended without a fix");
    });

    it("pages error once the incident is 2 hours past confirmation, and not for resolved ones", () => {
        const state = stateWith({
            incidents: {
                "inc-1": incident,
                "inc-0": { ...incident, status: "resolved", confirmedAt: "2026-10-01T00:00:00Z" },
            },
        });
        expect(pagesFor({ type: "poll", now: "2026-10-02T17:25:59Z" }, state, config)).toEqual([]);
        expect(pagesFor({ type: "poll", now: "2026-10-02T17:26:00Z" }, state, config)).toEqual([
            {
                key: "master-red-error:inc-1",
                status: "error",
                message: "master still red after 2 hours: ci (Build, Lint) at abc123456",
                bypass: true,
            },
        ]);
    });

    it("sends recovered as info only after a page went out for the incident", () => {
        const event = { type: "master-recovered", incident: "inc-1" };
        expect(pagesFor(event, stateWith(), config)).toEqual([]);
        const paged = stateWith({ notified: { "master-red:inc-1": "2026-10-02T15:26:00Z" } });
        expect(pagesFor(event, paged, config)).toEqual([
            { key: "recovered:inc-1", status: "info", message: "master green again (inc-1)", bypass: true },
        ]);
        const errorOnly = stateWith({ notified: { "master-red-error:inc-1": "2026-10-02T17:26:00Z" } });
        expect(pagesFor(event, errorOnly, config)).toHaveLength(1);
    });
});

describe("pagesFor: escalations", () => {
    it("pages decision, credential and approval as waiting, within the cap", () => {
        const state = {
            escalations: {
                d: esc("d", "decision"),
                c: esc("c", "credential", { raisedBy: "run-20261002-0001-ab" }),
                a: esc("a", "approval"),
            },
        };
        const pages = pagesFor({ type: "escalations-raised", keys: ["d", "c", "a"] }, state, config);
        expect(pages).toEqual([
            { key: "escalation:d", status: "waiting", message: "decision d" },
            { key: "escalation:c", status: "waiting", message: "credential c" },
            { key: "escalation:a", status: "waiting", message: "approval a" },
        ]);
    });

    it("never pages an escalation raised by an interactive session", () => {
        const state = { escalations: { d: esc("d", "decision", { raisedBy: "githerd-2463873" }) } };
        expect(pagesFor({ type: "escalations-raised", keys: ["d"] }, state, config)).toEqual([]);
    });

    it("never pages run-failed, denied, blocked, release, other or master-red kinds", () => {
        const kinds = ["run-failed", "denied", "blocked", "release-stalled", "release-failed", "other", "master-red"];
        const state = { escalations: Object.fromEntries(kinds.map((k) => [k, esc(k, k)])) };
        expect(pagesFor({ type: "escalations-raised", keys: kinds }, state, config)).toEqual([]);
    });

    it("skips resolved, already-paged and unknown escalations", () => {
        const state = {
            escalations: {
                r: esc("r", "decision", { resolvedAt: "2026-10-02T15:00:00Z" }),
                p: esc("p", "decision", { paged: "2026-10-02T15:00:00Z" }),
            },
        };
        expect(pagesFor({ type: "escalations-raised", keys: ["r", "p", "gone"] }, state, config)).toEqual([]);
    });

    it("batches visual-review escalations into one alert", () => {
        const state = {
            escalations: {
                "visual-review:pr:704": esc("visual-review:pr:704", "visual-review", {
                    target: "pr:704",
                    summary: "review at https://host:9443/",
                }),
                "visual-review:pr:705": esc("visual-review:pr:705", "visual-review", { target: "pr:705" }),
            },
        };
        const one = pagesFor({ type: "escalations-raised", keys: ["visual-review:pr:704"] }, state, config);
        expect(one).toEqual([
            { key: "escalation:visual-review:pr:704", status: "waiting", message: "review at https://host:9443/" },
        ]);
        const both = pagesFor(
            { type: "escalations-raised", keys: ["visual-review:pr:705", "visual-review:pr:704"] },
            state,
            config,
        );
        expect(both).toEqual([
            {
                key: "escalation:visual-review:pr:704+visual-review:pr:705",
                status: "waiting",
                message: "2 PRs await visual review (#705, #704): visual-review visual-review:pr:705",
            },
        ]);
    });
});

describe("pagesFor: proposals, daily and digest", () => {
    it("pages a revert proposal at once with the veto command, bypassing the cap", () => {
        const state = { proposals: { "prop-1": { kind: "revert", target: "pr:718" } } };
        expect(pagesFor({ type: "revert-proposed", proposal: "prop-1" }, state, config)).toEqual([
            {
                key: "revert:prop-1",
                status: "waiting",
                message:
                    "master red: revert #718 in 30 min unless you run githerd veto prop-1 or comment on the incident issue",
                bypass: true,
            },
        ]);
    });

    it("sends the daily alive notice as info, and the new close proposals notice when there are some", () => {
        const quiet = { master: { verdict: "green" }, escalations: { x: esc("x", "other") } };
        expect(pagesFor({ type: "daily", date: "2026-10-02" }, quiet, config)).toEqual([
            { key: "alive:2026-10-02", status: "info", message: "githerd alive: master green, 1 open escalation" },
        ]);
        const busy = {
            escalations: {},
            proposals: {
                a: { kind: "close-issue", status: "pending", graceUntil: "2026-10-12T00:00:00Z" },
                b: { kind: "close-issue", status: "dry-run", graceUntil: "2026-10-09T00:00:00Z" },
                c: { kind: "close-issue", status: "pending", shownToOwnerAt: "2026-10-01T00:00:00Z" },
                d: { kind: "revert", status: "pending" },
            },
        };
        expect(pagesFor({ type: "daily", date: "2026-10-02" }, busy, config)).toEqual([
            { key: "alive:2026-10-02", status: "info", message: "githerd alive: master unknown, 0 open escalations" },
            {
                key: "proposals:2026-10-02",
                status: "info",
                message: "2 new close proposals in githerd status; earliest closes 10-09",
            },
        ]);
    });

    it("sends the digest notice as info and ignores events it does not know", () => {
        expect(pagesFor({ type: "digest-written", week: "2026-W40" }, {}, config)).toEqual([
            {
                key: "digest:2026-W40",
                status: "info",
                message: "githerd weekly digest 2026-W40 is in .githerd/digests/2026-W40.md",
            },
        ]);
        expect(pagesFor({ type: "pr-head-changed" }, {}, config)).toEqual([]);
    });
});
