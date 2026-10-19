/**
 * @file A single note write does the same work however many notes the session holds (issue #1890),
 * and `note:changed` still tells exactly what changed: each event is checked against a diff of the
 * whole notes list taken around the write, for lone writes, transactions, undo, redo and restore.
 * Counted, never timed.
 */

import { assert, describe, it } from "vitest";

import type { Note, NoteChange } from "../../../src/session/notes/types";
import type { GraphSession } from "../../../src/session/types";
import { assertScalesLinearly } from "../../helpers/cost";
import { makeSession } from "../helpers";
import { notesHarness } from "./harness";

/** The two note counts: big enough that a walk over every note is 4x, small enough to stay cheap. */
const SIZES = [200, 800] as const;

/**
 * A session over `size` unconnected nodes with one note on each and an empty history, built with
 * strict state off, as a consumer's is: the strict checks walk the whole history on every write by
 * design. The history is cleared because every write also re-charges every history step, which
 * grows with the history rather than with the notes (issue #1891).
 * @param size - The node and note count.
 * @returns The session and its note ids.
 */
function notedSession(size: number): { session: GraphSession; notes: string[] } {
    const scope = globalThis as { __GRAPHTY_STRICT_STATE__?: boolean };
    const strict = scope.__GRAPHTY_STRICT_STATE__;
    scope.__GRAPHTY_STRICT_STATE__ = false;
    try {
        const harness = makeSession();
        const nodes = Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` }));
        harness.add(nodes, []);
        const { session } = harness;
        const notes = nodes.map(({ id }) => session.notes.add({ text: id, targets: [{ node: id }] }));
        session.history.clear();
        return { session, notes };
    } finally {
        scope.__GRAPHTY_STRICT_STATE__ = strict;
    }
}

type Patchable = Record<PropertyKey, (...args: unknown[]) => unknown>;

/**
 * Count the Map, Set and Array elements a synchronous call visits: every step of their iterators,
 * plus the length of every array a walking Array method is called on. Stops when the call returns,
 * so the derivation pass that follows every write, which copies every keyed slice of the project
 * state whatever the write touched, is not counted (issue #1906).
 * @param work - The call.
 * @returns How many elements it visited.
 */
function visitsWithin(work: () => unknown): number {
    let visited = 0;
    const restore: (() => void)[] = [];
    const wrap = (
        proto: Patchable,
        name: PropertyKey,
        by: (original: Patchable[string]) => Patchable[string],
    ): void => {
        const original = proto[name];
        proto[name] = by(original);
        restore.push(() => {
            proto[name] = original;
        });
    };
    for (const proto of [Map.prototype, Set.prototype, Array.prototype] as unknown as Patchable[]) {
        for (const name of [Symbol.iterator, "entries", "keys", "values"]) {
            wrap(
                proto,
                name,
                (original) =>
                    function (this: unknown, ...args: unknown[]) {
                        const it = original.apply(this, args) as Iterator<unknown>;
                        const next = it.next.bind(it);
                        it.next = () => {
                            const step = next();
                            visited += step.done === true ? 0 : 1;
                            return step;
                        };
                        return it;
                    },
            );
        }
    }

    for (const name of [
        "every",
        "filter",
        "find",
        "findIndex",
        "forEach",
        "includes",
        "indexOf",
        "map",
        "reduce",
        "some",
        "slice",
        "sort",
    ]) {
        wrap(
            Array.prototype as unknown as Patchable,
            name,
            (original) =>
                function (this: unknown[], ...args: unknown[]) {
                    visited += this.length;
                    return original.apply(this, args);
                },
        );
    }

    try {
        work();
    } finally {
        for (let at = restore.length - 1; at >= 0; at--) {
            restore[at]();
        }
    }

    return visited;
}

/** One write whose work is counted: what it does to a session holding a note on every node. */
const WRITES: readonly [string, (session: GraphSession, notes: readonly string[]) => unknown][] = [
    ["NotesApi.update", (session, notes) => session.notes.update(notes[0], { text: "edited" })],
    ["NotesApi.remove", (session, notes) => session.notes.remove(notes[0])],
    ["NotesApi.add", (session) => session.notes.add({ text: "one more", targets: [{ node: "n0" }] })],
];

describe("a single note write", () => {
    for (const [method, write] of WRITES) {
        it(`${method} does about the same work at any number of notes`, async () => {
            await assertScalesLinearly(
                (size) => {
                    const { session, notes } = notedSession(size);
                    session.on("note:changed", () => undefined);
                    const visits = visitsWithin(() => write(session, notes));
                    session.dispose();
                    return visits;
                },
                { sizes: SIZES, growth: "constant", counter: `elements visited by ${method}` },
            );
        });
    }
});

const FIELDS = ["text", "targets", "cites", "mediaType", "extensions", "done"] as const;

/**
 * What `note:changed` should tell for a move from one notes list to another: every note whose
 * record changed, as the whole-slice diff found it. Sorted by id; the order is checked elsewhere.
 * @param before - The notes before.
 * @param after - The notes after.
 * @returns The id, change, fields and record of each.
 */
function diffOf(before: readonly Note[], after: readonly Note[]): unknown[] {
    const was = new Map(before.map((note) => [note.id, note]));
    const now = new Map(after.map((note) => [note.id, note]));
    const told: unknown[] = [];
    for (const id of [...new Set([...was.keys(), ...now.keys()])].sort()) {
        const prior = was.get(id);
        const next = now.get(id);
        if (prior === next) {
            continue;
        }

        if (prior === undefined || next === undefined) {
            told.push([id, prior === undefined ? "created" : "removed", [], next ?? null]);
            continue;
        }

        const fields = FIELDS.filter((field) => prior[field] !== next[field]);
        if (fields.length > 0) {
            told.push([id, "updated", fields, next]);
        }
    }

    return told;
}

/**
 * Run a step and check the events it published against the diff of the whole notes list.
 * @param session - The session.
 * @param step - The step.
 * @param cause - The cause every event should carry.
 */
async function tellsTheDiff(session: GraphSession, step: () => unknown, cause: string): Promise<void> {
    const changes: NoteChange[] = [];
    const off = session.on("note:changed", (change) => changes.push(change));
    const before = session.notes.list();
    try {
        await step();
    } catch {
        // A transaction that throws rolls back; it should tell nothing.
    }

    off();
    const told = [...changes]
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((change) => [change.id, change.change, change.fields, change.note]);
    assert.deepEqual(told, diffOf(before, session.notes.list()));
    for (const change of changes) {
        assert.strictEqual(change.cause, cause);
    }
}

describe("note:changed tells the same as a diff of every note", () => {
    it("for lone writes, transactions, rollbacks, undo, redo and restore", async () => {
        const { session } = notesHarness();
        const first = session.notes.add({ text: "first", targets: [{ node: "a" }] });
        let second = "";
        await tellsTheDiff(
            session,
            () => (second = session.notes.add({ text: "second", targets: [{ node: "b" }] })),
            "command",
        );
        await tellsTheDiff(session, () => session.notes.update(first, { text: "edited", done: true }), "command");
        await tellsTheDiff(session, () => session.notes.update(first, { text: "edited" }), "command");
        await tellsTheDiff(session, () => session.notes.update(first, { extensions: { "x.y": 1 } }), "command");
        await tellsTheDiff(session, () => session.notes.remove(second), "command");
        await tellsTheDiff(
            session,
            () =>
                session.transaction("Batch", (tx) => {
                    const third = tx.notes.add({ text: "third", targets: [{ node: "c" }] });
                    tx.notes.update(first, { text: "batched" });
                    tx.notes.update(third, { text: "third, edited" });
                }),
            "command",
        );
        await tellsTheDiff(
            session,
            () =>
                session.transaction("One", (tx) => {
                    tx.notes.update(first, { text: "alone in a transaction" });
                }),
            "command",
        );
        await tellsTheDiff(
            session,
            () =>
                session.transaction("Thrown", (tx) => {
                    tx.notes.update(first, { text: "never kept" });
                    throw new Error("rolled back");
                }),
            "command",
        );
        await tellsTheDiff(session, () => session.undo(), "undo");
        await tellsTheDiff(session, () => session.undo(), "undo");
        await tellsTheDiff(session, () => session.redo(), "redo");
        // A lone write after an undo, then a restore across several steps.
        await tellsTheDiff(session, () => session.notes.update(first, { text: "after undo" }), "command");
        await tellsTheDiff(session, () => session.history.restoreTo(null), "undo");
        await tellsTheDiff(session, () => session.notes.add({ text: "fresh", targets: [{ node: "a" }] }), "command");
        assert.lengthOf(session.notes.list(), 1);
    });
});
