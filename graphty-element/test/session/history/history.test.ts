import fc from "fast-check";
import { assert, describe, it } from "vitest";

import { History, type HistoryOptions, STEP_OVERHEAD_BYTES } from "../../../src/session/project/History";

/**
 * A fake patch over a map of numbers: each key's value before and after. Enough to check that
 * the history applies the right patch in the right direction; it never looks inside one.
 */
interface FakePatch {
    readonly entries: ReadonlyMap<string, { readonly prior: number | undefined; readonly next: number }>;
}

/** A tiny store the fake patches write to. */
class FakeStore {
    readonly values = new Map<string, number>();

    /** Write values and return the patch that did it. */
    write(changes: Record<string, number>): FakePatch {
        const entries = new Map<string, { prior: number | undefined; next: number }>();
        for (const [key, next] of Object.entries(changes)) {
            entries.set(key, { prior: this.values.get(key), next });
            this.values.set(key, next);
        }

        return { entries };
    }

    put(key: string, value: number | undefined): void {
        if (value === undefined) {
            this.values.delete(key);
        } else {
            this.values.set(key, value);
        }
    }

    snapshot(): Record<string, number> {
        return Object.fromEntries([...this.values].sort(([a], [b]) => a.localeCompare(b)));
    }
}

/** A clock the tests move by hand. */
function clock(): { now: () => number; advance: (ms: number) => void } {
    let time = 0;
    return {
        now: () => time,
        advance: (ms) => {
            time += ms;
        },
    };
}

function setup(options: Partial<HistoryOptions<FakePatch>> = {}): {
    store: FakeStore;
    history: History<FakePatch>;
    time: ReturnType<typeof clock>;
} {
    const store = new FakeStore();
    const time = clock();
    const history = new History<FakePatch>({
        forward: (patch) => {
            for (const [key, entry] of patch.entries) {
                store.put(key, entry.next);
            }
        },
        backward: (patch) => {
            for (const [key, entry] of patch.entries) {
                store.put(key, entry.prior);
            }
        },
        merge: (older, newer) => {
            const entries = new Map(older.entries);
            for (const [key, entry] of newer.entries) {
                const first = older.entries.get(key);
                entries.set(key, { prior: first === undefined ? entry.prior : first.prior, next: entry.next });
            }

            return { entries };
        },
        now: time.now,
        ...options,
    });

    return { store, history, time };
}

describe("History: record, undo, redo", () => {
    it("undoes and redoes recorded steps in order", () => {
        const { store, history } = setup();
        history.record({ label: "a", patch: store.write({ x: 1 }) });
        history.record({ label: "b", patch: store.write({ x: 2, y: 1 }) });
        assert.strictEqual(history.position, 2);

        assert.strictEqual(history.undo()?.label, "b");
        assert.deepEqual(store.snapshot(), { x: 1 });
        assert.strictEqual(history.undo()?.label, "a");
        assert.deepEqual(store.snapshot(), {});
        assert.isNull(history.undo());
        assert.strictEqual(history.position, 0);

        assert.strictEqual(history.redo()?.label, "a");
        assert.strictEqual(history.redo()?.label, "b");
        assert.isNull(history.redo());
        assert.deepEqual(store.snapshot(), { x: 2, y: 1 });
    });

    it("discards the redo tail when a step records after an undo", () => {
        const { store, history } = setup();
        history.record({ label: "a", patch: store.write({ x: 1 }) });
        history.record({ label: "b", patch: store.write({ x: 2 }) });
        history.undo();
        history.record({ label: "c", patch: store.write({ y: 5 }) });

        assert.deepEqual(
            history.steps.map((step) => step.label),
            ["a", "c"],
        );
        assert.isNull(history.redo());
    });

    it("restores to a step or to the baseline as a sequence of undos or redos", () => {
        const { store, history } = setup();
        history.record({ label: "a", patch: store.write({ x: 1 }) });
        history.record({ label: "b", patch: store.write({ x: 2 }) });
        history.record({ label: "c", patch: store.write({ x: 3 }) });
        const [a, , c] = history.steps;

        assert.deepEqual(
            history.restoreTo(a.id).map((step) => step.label),
            ["c", "b"],
        );
        assert.deepEqual(store.snapshot(), { x: 1 });
        assert.deepEqual(
            history.restoreTo(c.id).map((step) => step.label),
            ["b", "c"],
        );
        assert.deepEqual(store.snapshot(), { x: 3 });
        history.restoreTo(null);
        assert.deepEqual(store.snapshot(), {});
        assert.strictEqual(history.position, 0);
        assert.throws(() => history.restoreTo("nope"), /no step/);
    });

    it("makes the current state the baseline on clear", () => {
        const { store, history } = setup();
        history.record({ label: "a", patch: store.write({ x: 1 }) });
        history.clear();
        assert.lengthOf(history.steps, 0);
        assert.strictEqual(history.bytes, 0);
        history.restoreTo(null);
        assert.deepEqual(store.snapshot(), { x: 1 });
    });

    it("bumps the version and reports the reason on every change", () => {
        const reasons: string[] = [];
        const { store, history } = setup({ onChange: (reason) => reasons.push(reason) });
        history.record({ label: "a", patch: store.write({ x: 1 }) });
        history.undo();
        history.undo();
        history.redo();
        history.clear();

        assert.deepEqual(reasons, ["record", "undo", "redo", "clear"]);
        assert.strictEqual(history.version, 4);
    });
});

describe("History: coalescing", () => {
    it("merges equal keys within the window, keeping the first prior and the last value", () => {
        const { store, history, time } = setup();
        history.record({ label: "base", patch: store.write({ c: 0 }) });
        history.record({ label: "colour", key: "k", ops: ["style.patch"], patch: store.write({ c: 1 }) });
        time.advance(500);
        history.record({ label: "colour", key: "k", ops: ["style.patch"], patch: store.write({ c: 2 }) });
        time.advance(999);
        history.record({ label: "colour", key: "k", ops: ["style.patch"], patch: store.write({ c: 3 }) });

        assert.lengthOf(history.steps, 2);
        assert.deepEqual(history.steps[1].ops, ["style.patch", "style.patch", "style.patch"]);
        history.undo();
        assert.deepEqual(store.snapshot(), { c: 0 });
        history.redo();
        assert.deepEqual(store.snapshot(), { c: 3 });
    });

    it("does not merge after the window expires", () => {
        const { store, history, time } = setup();
        history.record({ label: "a", key: "k", patch: store.write({ c: 1 }) });
        time.advance(1000);
        history.record({ label: "a", key: "k", patch: store.write({ c: 2 }) });
        assert.lengthOf(history.steps, 2);
    });

    it("does not merge across an undo", () => {
        const { store, history } = setup();
        history.record({ label: "a", key: "k", patch: store.write({ c: 1 }) });
        history.record({ label: "a", key: "k", patch: store.write({ c: 2 }) });
        history.record({ label: "b", patch: store.write({ d: 1 }) });
        history.undo();
        history.record({ label: "a", key: "k", patch: store.write({ c: 3 }) });
        assert.lengthOf(history.steps, 2);
    });

    it("does not merge across a different step or a different key", () => {
        const { store, history } = setup();
        history.record({ label: "a", key: "k", patch: store.write({ c: 1 }) });
        history.record({ label: "b", patch: store.write({ d: 1 }) });
        history.record({ label: "a", key: "k", patch: store.write({ c: 2 }) });
        history.record({ label: "a", key: "other", patch: store.write({ c: 3 }) });
        assert.lengthOf(history.steps, 4);
    });

    it("reports a merge as a merge", () => {
        const reasons: string[] = [];
        const { store, history } = setup({ onChange: (reason) => reasons.push(reason) });
        history.record({ label: "a", key: "k", patch: store.write({ c: 1 }) });
        history.record({ label: "a", key: "k", patch: store.write({ c: 2 }) });
        assert.deepEqual(reasons, ["record", "merge"]);
    });
});

describe("History: budget and eviction", () => {
    it("evicts the oldest done steps to 90% of the step limit, whole", () => {
        const { store, history } = setup({ limitSteps: 10 });
        for (let index = 0; index < 11; index++) {
            history.record({ label: `s${index}`, patch: store.write({ [`k${index}`]: index }) });
        }

        // Over 10 steps: evicted down to 9.
        assert.deepEqual(
            history.steps.map((step) => step.label),
            ["s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10"],
        );
        history.restoreTo(null);
        // The evicted steps' changes stay in the baseline; nothing of them can be undone.
        assert.deepEqual(store.snapshot(), { k0: 0, k1: 1 });
    });

    it("evicts to 90% of both limits once the byte limit is exceeded", () => {
        const size = 1000 - STEP_OVERHEAD_BYTES;
        const { store, history } = setup({ limitBytes: 10_000 });
        for (let index = 0; index < 10; index++) {
            history.record({ label: `s${index}`, patch: store.write({ k: index }), bytes: { done: size, undone: 0 } });
        }

        assert.lengthOf(history.steps, 10);
        assert.strictEqual(history.bytes, 10_000);
        history.record({ label: "s10", patch: store.write({ k: 10 }), bytes: { done: size, undone: 0 } });
        assert.lengthOf(history.steps, 9);
        assert.isAtMost(history.bytes, 9_000);
    });

    it("counts the side of the cursor each step is on", () => {
        const { store, history } = setup();
        history.record({ label: "a", patch: store.write({ k: 1 }), bytes: { done: 100, undone: 7 } });
        assert.strictEqual(history.bytes, 100 + STEP_OVERHEAD_BYTES);
        assert.strictEqual(history.steps[0].bytes, 100 + STEP_OVERHEAD_BYTES);
        history.undo();
        assert.strictEqual(history.bytes, 7 + STEP_OVERHEAD_BYTES);
        assert.strictEqual(history.steps[0].bytes, 7 + STEP_OVERHEAD_BYTES);
    });

    it("evicts the farthest redo steps after the done steps, keeping the latest done and next redo", () => {
        const { store, history } = setup({ limitSteps: 100 });
        for (let index = 0; index < 6; index++) {
            history.record({ label: `s${index}`, patch: store.write({ k: index }) });
        }

        history.undo();
        history.undo();
        history.undo();
        // Done: s0 s1 s2. Redo: s3 s4 s5.
        history.limitSteps = 2;

        assert.deepEqual(
            history.steps.map((step) => step.label),
            ["s2", "s3"],
        );
        assert.strictEqual(history.position, 1);
        history.redo();
        assert.deepEqual(store.snapshot(), { k: 3 });
        history.undo();
        history.undo();
        assert.deepEqual(store.snapshot(), { k: 1 });
    });

    it("keeps the latest done and the next redo step even when each alone is over budget", () => {
        const { store, history } = setup({ limitBytes: 1000 });
        history.record({ label: "a", patch: store.write({ k: 1 }), bytes: { done: 5000, undone: 5000 } });
        history.record({ label: "b", patch: store.write({ k: 2 }), bytes: { done: 5000, undone: 5000 } });
        assert.deepEqual(
            history.steps.map((step) => step.label),
            ["b"],
        );
        history.limitBytes = 1_000_000;
        history.record({ label: "c", patch: store.write({ k: 3 }), bytes: { done: 5000, undone: 5000 } });
        history.undo();
        // b is the latest done step and c the next redo step: both survive a lower limit.
        history.limitBytes = 900;
        assert.deepEqual(
            history.steps.map((step) => step.label),
            ["b", "c"],
        );
        assert.strictEqual(history.position, 1);
        history.redo();
        assert.deepEqual(store.snapshot(), { k: 3 });
    });

    it("reports an eviction", () => {
        const reasons: string[] = [];
        const { store, history } = setup({ limitSteps: 2, onChange: (reason) => reasons.push(reason) });
        for (let index = 0; index < 3; index++) {
            history.record({ label: `s${index}`, patch: store.write({ k: index }) });
        }

        assert.deepEqual(reasons, ["record", "record", "record", "evict"]);
    });
});

describe("History: the published steps array", () => {
    it("is the identical frozen array between changes, and a new one after", () => {
        const { store, history } = setup();
        history.record({ label: "a", patch: store.write({ k: 1 }) });
        const first = history.steps;
        assert.isTrue(Object.isFrozen(first));
        assert.isTrue(Object.isFrozen(first[0]));
        assert.strictEqual(history.steps, first);

        history.record({ label: "b", patch: store.write({ k: 2 }) });
        assert.notStrictEqual(history.steps, first);
        assert.strictEqual(history.steps[0], first[0]);
    });

    it("replaces only the top element on a merge", () => {
        const { store, history } = setup();
        history.record({ label: "a", patch: store.write({ k: 1 }) });
        history.record({ label: "b", key: "k", patch: store.write({ k: 2 }) });
        const before = history.steps;
        history.record({ label: "b", key: "k", patch: store.write({ k: 3 }) });
        const after = history.steps;

        assert.notStrictEqual(after, before);
        assert.strictEqual(after[0], before[0]);
        assert.notStrictEqual(after[1], before[1]);
        assert.strictEqual(after[1].id, before[1].id);
    });
});

describe("History: a random-sequence model", () => {
    type Action =
        | { kind: "record"; key: "a" | "b" | "c"; value: number; coalesce: boolean }
        | { kind: "undo" }
        | { kind: "redo" }
        | { kind: "wait" };

    const action: fc.Arbitrary<Action> = fc.oneof(
        fc.record({
            kind: fc.constant("record" as const),
            key: fc.constantFrom("a" as const, "b" as const, "c" as const),
            value: fc.integer({ min: 0, max: 9 }),
            coalesce: fc.boolean(),
        }),
        fc.constant({ kind: "undo" as const }),
        fc.constant({ kind: "redo" as const }),
        fc.constant({ kind: "wait" as const }),
    );

    it("returns to the start on undo-all, to the end on redo-all, and matches the model at each position", () => {
        fc.assert(
            fc.property(fc.array(action, { maxLength: 40 }), fc.integer({ min: 2, max: 12 }), (actions, limitSteps) => {
                const { store, history, time } = setup({ limitSteps });
                // The model: the state sealed at each position, with the start at index 0.
                let states: Record<string, number>[] = [store.snapshot()];
                let position = 0;
                let mergeable = false;
                let lastKey: string | null = null;
                let lastAt = 0;

                for (const next of actions) {
                    if (next.kind === "record") {
                        const key = next.coalesce ? `key:${next.key}` : null;
                        history.record({ label: next.key, key, patch: store.write({ [next.key]: next.value }) });
                        const merge = key !== null && mergeable && key === lastKey && time.now() - lastAt < 1000;
                        states = states.slice(0, position + 1);
                        if (merge) {
                            states[position] = store.snapshot();
                        } else {
                            states.push(store.snapshot());
                            position++;
                        }

                        mergeable = true;
                        lastKey = key;
                        lastAt = time.now();
                        // Eviction to 90% of the step limit keeps the newest steps' states.
                        const steps = states.length - 1;
                        if (steps > limitSteps) {
                            const drop = steps - Math.floor(limitSteps * 0.9);
                            const oldest = Math.min(drop, position - 1);
                            states = states.slice(oldest);
                            position -= oldest;
                            const far = drop - oldest;
                            if (far > 0) {
                                states = states.slice(0, states.length - far);
                            }
                        }
                    } else if (next.kind === "undo") {
                        // An undo or redo that had nothing to do changes nothing, not even coalescing.
                        if (history.undo() !== null) {
                            position--;
                            mergeable = false;
                        }
                    } else if (next.kind === "redo") {
                        if (history.redo() !== null) {
                            position++;
                            mergeable = false;
                        }
                    } else {
                        time.advance(600);
                    }

                    assert.strictEqual(history.position, position);
                    assert.strictEqual(history.steps.length, states.length - 1);
                    assert.deepEqual(store.snapshot(), states[position]);
                }

                while (history.undo() !== null) {
                    position--;
                    assert.deepEqual(store.snapshot(), states[position]);
                }

                assert.deepEqual(store.snapshot(), states[0]);
                while (history.redo() !== null) {
                    position++;
                    assert.deepEqual(store.snapshot(), states[position]);
                }

                assert.deepEqual(store.snapshot(), states[states.length - 1]);
            }),
            { numRuns: 300 },
        );
    });
});
