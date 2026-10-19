/**
 * @file How the undo history charges what its steps hold by reference (run results, their id
 * indexes, kept sets, notes), counted once against the oldest step that holds it. A write charges
 * only the steps that could have changed; these tests hold that to exactly what charging every
 * step again would give, and count the work. See design/undo/undo-design.md section 7.
 */

import fc from "fast-check";
import { assert, describe, it, vi } from "vitest";

import { dispatcherOf } from "../../../src/session/GraphSession";
import { type Patch, patchCharge } from "../../../src/session/project/draft";
import type { ProjectState } from "../../../src/session/project/state";
import type { ElementSession } from "../../../src/session/types";
import { assertScalesLinearly } from "../../helpers/cost";
import { fakeClock } from "./fakes";
import { blankSession } from "./fixture-session";

/** Patch entries `patchCharge` has walked, over every call. */
const walked = vi.hoisted(() => ({ entries: 0 }));

vi.mock("../../../src/session/project/draft", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../../src/session/project/draft")>();
    return {
        ...actual,
        patchCharge: (...args: Parameters<typeof actual.patchCharge>) => {
            walked.entries += args[0].entries.length;
            return actual.patchCharge(...args);
        },
    };
});

/** Past the history's coalescing window, so the next edit is a step of its own. */
const PAST_COALESCING = 1001;

/** The dispatcher's history steps and state, read where no public API reaches. */
interface Internals {
    readonly history: { readonly entries: readonly { readonly patch: Patch; readonly charge: number }[] };
    readonly state: ProjectState;
}

/**
 * Assert every step's charge is what charging every step again, oldest first, would give.
 * @param session - The session.
 * @param after - What was just done, for the message.
 */
function assertChargesExact(session: ElementSession, after: string): void {
    const { history, state } = dispatcherOf(session) as unknown as Internals;
    const seen = new WeakSet();
    const expected = history.entries.map((step) => patchCharge(step.patch, state.graph.token, seen));
    assert.deepEqual(
        history.entries.map((step) => step.charge),
        expected,
        `after ${after}`,
    );
}

/** One thing a random sequence does. */
type Action =
    | { readonly kind: "add-node" | "remove-node" | "update-node" | "run" | "top" | "set-create" }
    | { readonly kind: "set-edges" | "set-read" | "set-remove" | "note-add" | "note-update" | "note-remove" }
    | { readonly kind: "undo" | "redo" | "restore" | "tick" | "limit"; readonly at: number };

const ACTION: fc.Arbitrary<Action> = fc.oneof(
    fc.constantFrom(
        ...(
            [
                "add-node",
                "remove-node",
                "update-node",
                "run",
                "top",
                "set-create",
                "set-edges",
                "set-read",
                "set-remove",
                "note-add",
                "note-update",
                "note-remove",
            ] as const
        ).map((kind) => ({ kind })),
    ),
    fc.record({ kind: fc.constantFrom("undo", "redo", "restore", "tick", "limit"), at: fc.nat(20) }),
);

/**
 * Do one action.
 * @param session - The session.
 * @param action - The action.
 * @param serial - A number unique to this action.
 * @param clock - The history's clock.
 * @param clock.advance - Moves it on.
 * @returns Whether the history was charged again: a write to the graph, runs, sets or notes, or a
 *     history move. Anything else leaves the charges for the next one to measure.
 */
async function act(
    session: ElementSession,
    action: Action,
    serial: number,
    clock: { advance(ms: number): void },
): Promise<boolean> {
    const nodes = session.snapshot().nodeCount;
    const sets = session.sets.list();
    const notes = session.notes.list();
    const pick = <T>(items: readonly T[]): T | undefined => items.at(serial % Math.max(items.length, 1));
    switch (action.kind) {
        case "add-node":
            await session.data.addNodes([{ id: `x${String(serial)}` }]);
            return true;
        case "remove-node": {
            const id = nodes > 3 ? session.snapshot().ids.idOf(nodes - 1) : undefined;
            if (id === undefined) {
                return false;
            }

            await session.data.removeNodes([id]);
            return true;
        }
        case "update-node":
            await session.data.updateNodes([{ id: "n1", values: { weight: serial } }]);
            return true;
        case "run":
            await session.runs.start("degree", {}, { as: "deg", style: false });
            return true;
        case "top":
            session.results.get("deg")?.top("value", 1 + (serial % 3));
            return false;
        case "set-create":
            session.sets.create(
                {
                    kind: "fixed",
                    nodes: ["n1", "n2"],
                    edges: [{ source: "n1", target: "n2", id: "e0" }],
                    reading: "listed",
                },
                { name: `S${String(serial)}` },
            );
            return true;
        case "set-edges": {
            const set = pick(sets);
            if (set === undefined) {
                return false;
            }

            // A member edit keeps the id table the earlier record reads through, and a new id grows it.
            session.sets.addMembers(set.id, { edges: [{ source: "n2", target: "n3", id: `e${String(serial)}` }] });
            return true;
        }
        case "set-read": {
            // Reading a fixed set's edge members builds them as objects, once.
            const definition = pick(sets)?.definition;
            if (definition?.kind === "fixed") {
                assert.notStrictEqual(definition.edges, null);
            }

            return false;
        }
        case "set-remove": {
            const set = pick(sets);
            if (set === undefined) {
                return false;
            }

            session.sets.remove(set.id);
            return true;
        }
        case "note-add":
            session.notes.add({ text: String(serial), targets: [{ graph: true }] });
            return true;
        case "note-update": {
            const note = pick(notes);
            if (note === undefined) {
                return false;
            }

            session.notes.update(note.id, { text: `edited ${String(serial)}` });
            return true;
        }
        case "note-remove": {
            const note = pick(notes);
            if (note === undefined) {
                return false;
            }

            session.notes.remove(note.id);
            return true;
        }
        case "undo":
        case "redo":
        case "restore": {
            const { position, steps } = session.history;
            if (action.kind === "undo") {
                await session.undo();
            } else if (action.kind === "redo") {
                await session.redo();
            } else {
                const step = steps.at(action.at % Math.max(steps.length, 1));
                await session.history.restoreTo(step === undefined ? null : step.id);
            }

            return session.history.position !== position;
        }
        case "tick":
            clock.advance(PAST_COALESCING * (action.at % 2));
            return false;
        default:
            // Low enough that the sequences evict, from the front and from the redo tail.
            session.history.limitSteps = 2 + action.at;
            return false;
    }
}

/** Past the coalescing window. */
const TICK: Action = { kind: "tick", at: 1 };

/** A sequence for each way an older step's charge can change, before the random ones. */
const EXAMPLES: readonly (readonly Action[])[] = [
    // The resident snapshot changes while a result reads through its id index.
    [{ kind: "run" }, { kind: "add-node" }, { kind: "undo", at: 0 }, { kind: "add-node" }],
    // The step a shared note record is charged to is evicted: the next step holding it pays.
    [
        { kind: "note-add" },
        TICK,
        { kind: "note-update" },
        TICK,
        { kind: "note-update" },
        TICK,
        { kind: "limit", at: 0 },
        { kind: "note-update" },
    ],
    // The same, with a history move rather than a new step next.
    [
        { kind: "note-add" },
        TICK,
        { kind: "note-update" },
        TICK,
        { kind: "note-update" },
        TICK,
        { kind: "note-update" },
        { kind: "limit", at: 0 },
        { kind: "undo", at: 0 },
    ],
    // Undone steps holding charged records are discarded by a new step.
    [
        { kind: "note-add" },
        TICK,
        { kind: "note-update" },
        TICK,
        { kind: "note-update" },
        TICK,
        { kind: "undo", at: 0 },
        { kind: "undo", at: 0 },
        { kind: "note-update" },
        TICK,
        { kind: "note-update" },
    ],
    // A result builds a ranking after it was charged.
    [{ kind: "run" }, { kind: "note-add" }, { kind: "top" }, { kind: "note-add" }],
    // A member edit grows the id table an older record reads through.
    [{ kind: "set-create" }, TICK, { kind: "set-edges" }, TICK, { kind: "set-edges" }],
    // A kept set's edge members are built as objects after it was charged.
    [{ kind: "set-create" }, { kind: "note-add" }, { kind: "set-read" }, { kind: "note-add" }],
];

/**
 * Run random sequences of actions, checking the charges after each one that charges again.
 * @param strict - Whether the session runs with strict state, as every other test does; without
 *     it, nothing reads a kept set's edge members until a reader asks, as in a page.
 */
async function holdsForRandomSequences(strict: boolean): Promise<void> {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    const saved = scope.__GRAPHTY_STRICT_STATE__;
    scope.__GRAPHTY_STRICT_STATE__ = strict;
    try {
        await fc.assert(
            fc.asyncProperty(fc.array(ACTION, { minLength: 1, maxLength: 60 }), async (actions) => {
                const clock = fakeClock();
                const session = blankSession({ now: clock.now });
                await session.data.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
                await session.data.addEdges([{ src: "n1", dst: "n2" }]);
                try {
                    const done: string[] = [];
                    for (const [serial, action] of actions.entries()) {
                        const charged = await act(session, action, serial, clock);
                        done.push(JSON.stringify(action));
                        if (charged) {
                            assertChargesExact(session, done.join(", "));
                        }
                    }
                } finally {
                    session.dispose();
                }
            }),
            { seed: 1891, numRuns: 200, examples: EXAMPLES.map((example) => [example]) },
        );
    } finally {
        scope.__GRAPHTY_STRICT_STATE__ = saved;
    }
}

describe("the history's charges", () => {
    it("are, after every write and history move, what charging every step again gives", () =>
        holdsForRandomSequences(true));

    it("are the same with strict state off", () => holdsForRandomSequences(false));
});

describe("what a write costs the history's charges", () => {
    /**
     * A session whose history holds one step per note added, then one `notes.update`.
     * @param steps - The steps the history holds.
     * @returns The patch entries charged during the update.
     */
    function entriesChargedByUpdate(steps: number): number {
        const clock = fakeClock();
        const session = blankSession({ now: clock.now });
        const ids: string[] = [];
        for (let at = 0; at < steps; at++) {
            ids.push(session.notes.add({ text: String(at), targets: [{ graph: true }] }));
            clock.advance(PAST_COALESCING);
        }

        assert.lengthOf(session.history.steps, steps);
        walked.entries = 0;
        session.notes.update(ids[0], { text: "edited" });
        const counted = walked.entries;
        session.dispose();
        return counted;
    }

    it("a notes.update charges the same patch entries on a history of 200 steps and of 800", async () => {
        const { small, large } = await assertScalesLinearly(entriesChargedByUpdate, {
            sizes: [200, 800],
            growth: "constant",
            counter: "patch entries charged",
        });
        assert.strictEqual(large, small);
    });
});
