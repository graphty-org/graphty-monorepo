import { describe, expect, it } from "vitest";

import {
    type Context,
    createArbiter,
    type Hand,
    inputMapDefects,
    type OwnedClaim,
    TAP_CLAIM,
    type Win,
} from "../src/core/arbiter";
import { PRESETS } from "../src/presets";
import { TECHNIQUES } from "../src/techniques";

const claimsOf = (ids: readonly string[]): OwnedClaim[] => [
    ...TECHNIQUES.filter((t) => ids.includes(t.id)).flatMap((t) => t.claims.map((claim) => ({ owner: t.id, claim }))),
    { owner: "framework", claim: TAP_CLAIM },
];

interface Step {
    at: number;
    moved?: number;
    start?: { id: number; hand: Hand; channel: "select" | "squeeze"; context: Context; target?: number };
    end?: number;
}

/** Run a script of press edges and frame ticks through an arbiter; return who won each press. */
const run = (ids: readonly string[], steps: Step[]): Record<number, string | null> => {
    const wins: Record<number, string | null> = {};
    let moved = 0;
    const arbiter = createArbiter(() => claimsOf(ids), {
        win: (w: Win) => (wins[w.press.id] = w.owner),
        end: () => undefined,
        cancel: () => undefined,
        drop: (p) => (wins[p.id] ??= null),
    });
    for (const s of steps) {
        moved = s.moved ?? moved;
        if (s.start) {
            arbiter.start({ ...s.start, target: s.start.target ?? 3, time: s.at });
        }
        arbiter.tick(s.at, () => moved);
        if (s.end !== undefined) {
            arbiter.end(s.end, s.at);
        }
    }
    return wins;
};

const preset = (id: string): string[] => PRESETS.find((p) => p.id === id)?.techniques ?? [];

const SCENARIOS: Record<string, Step[]> = {
    tap: [
        { at: 0, start: { id: 1, hand: "right", channel: "select", context: "node" } },
        { at: 100, end: 1 },
    ],
    hold: [
        { at: 0, start: { id: 1, hand: "right", channel: "select", context: "node" } },
        { at: 100, moved: 0.005 },
        { at: 320 },
        { at: 400 },
    ],
    pull: [
        { at: 0, start: { id: 1, hand: "right", channel: "select", context: "node" } },
        { at: 100, moved: 0.04 },
        { at: 400 },
    ],
    dragGraph: [
        { at: 0, start: { id: 1, hand: "right", channel: "select", context: "graph" } },
        { at: 100, moved: 0.03 },
        { at: 400 },
    ],
    grip: [{ at: 0, start: { id: 1, hand: "right", channel: "squeeze", context: "node" } }],
    twoHands: [
        { at: 0, start: { id: 1, hand: "left", channel: "squeeze", context: "graph" } },
        { at: 50, start: { id: 2, hand: "right", channel: "squeeze", context: "space" } },
    ],
};

// The winner of each scenario per preset (design section 5.8). Stubs carry their real claims, so
// these hold before any technique is built.
const EXPECTED: Record<string, Record<string, (string | null)[]>> = {
    baseline: {
        tap: ["framework"],
        hold: ["node-menus"],
        pull: ["framework"],
        dragGraph: ["framework"],
        grip: [null],
        twoHands: [null, null],
    },
    "hands-first": {
        tap: ["framework"],
        hold: ["pull-to-grow"],
        pull: ["pull-to-grow"],
        dragGraph: ["handling"],
        grip: ["handling"],
        twoHands: ["handling", "handling"],
    },
    everything: {
        tap: ["framework"],
        hold: ["node-menus"],
        pull: ["pull-to-grow"],
        dragGraph: ["handling"],
        grip: ["handling"],
        twoHands: ["handling", "handling"],
    },
};

describe("input map", () => {
    for (const [presetId, cases] of Object.entries(EXPECTED)) {
        for (const [scenario, want] of Object.entries(cases)) {
            it(`${presetId}: ${scenario}`, () => {
                const wins = run(preset(presetId), SCENARIOS[scenario]);
                expect(want.map((_, i) => wins[i + 1] ?? null)).toEqual(want);
            });
        }
    }

    it("has no two claims that shadow each other", () => {
        expect(inputMapDefects(claimsOf(TECHNIQUES.map((t) => t.id)))).toEqual([]);
    });

    it("reports a shared priority and a claim without decide", () => {
        const a: OwnedClaim = {
            owner: "a",
            claim: { channel: "select", contexts: ["node"], priority: 5, decide: () => "wait" },
        };
        const b: OwnedClaim = {
            owner: "b",
            claim: { channel: "select", contexts: ["node", "graph"], priority: 5, decide: () => "wait" },
        };
        const c: OwnedClaim = { owner: "c", claim: { channel: "select", contexts: ["graph"], priority: 9 } };
        expect(inputMapDefects([a, b, c]).map((d) => `${d.a}-${d.b} ${d.context} ${d.reason}`)).toEqual([
            "a-b node same priority",
            "b-c graph a claim without decide shares the channel",
        ]);
    });
});

describe("arbiter", () => {
    it("cancels a switched-off owner's press", () => {
        const events: string[] = [];
        const arbiter = createArbiter(() => claimsOf(["handling"]), {
            win: (w) => events.push(`win ${w.owner}`),
            end: (_p, o) => events.push(`end ${o}`),
            cancel: (_p, o, r) => events.push(`cancel ${o} ${r}`),
        });
        arbiter.start({ id: 1, hand: "right", channel: "squeeze", context: "graph", target: -1, time: 0 });
        arbiter.cancelOwner("handling", "switched off");
        arbiter.end(1, 10);
        expect(events).toEqual(["win handling", "cancel handling switched off"]);
    });

    it("never arbitrates a press on UI", () => {
        const drops: string[] = [];
        const arbiter = createArbiter(() => claimsOf(["node-menus"]), {
            win: () => drops.push("win"),
            end: () => undefined,
            cancel: () => undefined,
            drop: (_p, r) => drops.push(r),
        });
        arbiter.start({ id: 1, hand: "right", channel: "select", context: "ui", target: -1, time: 0 });
        expect(drops).toEqual(["ui"]);
    });
});
