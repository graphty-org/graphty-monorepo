import { assert, describe, it } from "vitest";

import { ABSENT, createProjectStore, deepFreezeArgs } from "../../../src/session/project/draft";
import { createCounter, createProjectState } from "../../../src/session/project/state";
import type { ElementSet } from "../../../src/session/sets/types";
import type { CompiledLayer } from "../../../src/session/styles/Layer";

/** A stand-in layer stack; the draft never looks inside one. */
function stack(name: string): readonly CompiledLayer[] {
    return Object.freeze([{ name } as unknown as CompiledLayer]);
}

/** A stand-in kept set; the draft never looks inside one. */
function scope(id: string): ElementSet {
    return Object.freeze({ id, name: id, order: 0 } as unknown as ElementSet);
}

describe("a draft", () => {
    it("records the prior value of a key when it writes it", () => {
        const store = createProjectStore(createProjectState());
        const before = store.state.styles;
        const after = stack("a");

        const draft = store.open();
        draft.styles = after;
        const patch = draft.seal();

        assert.strictEqual(store.state.styles, after);
        assert.lengthOf(patch.entries, 1);
        assert.strictEqual(patch.entries[0].prior, before);
        assert.strictEqual(patch.entries[0].next, after);
    });

    it("keeps the first prior and the last value when it writes a key twice", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        draft.config.set("background.color", "red");
        draft.config.set("background.color", "blue");
        const patch = draft.seal();

        assert.lengthOf(patch.entries, 1);
        assert.strictEqual(patch.entries[0].prior, ABSENT);
        assert.strictEqual(patch.entries[0].next, "blue");
    });

    it("puts back the identical object going backward, and the written one going forward", () => {
        const first = scope("s1");
        const store = createProjectStore(createProjectState({ sets: new Map([["s1", first]]) }));
        const second = scope("s1");
        const before = store.state.styles;
        const after = stack("a");

        const draft = store.open();
        draft.styles = after;
        draft.sets.set("s1", second);
        draft.sets.set("s2", scope("s2"));
        draft.visibility.set("showContext", true);
        const patch = draft.seal();

        store.applyBackward(patch);
        assert.strictEqual(store.state.styles, before);
        assert.strictEqual(store.state.sets.get("s1"), first);
        assert.isFalse(store.state.sets.has("s2"));
        assert.isFalse(store.state.visibility.showContext);

        store.applyForward(patch);
        assert.strictEqual(store.state.styles, after);
        assert.strictEqual(store.state.sets.get("s1"), second);
        assert.isTrue(store.state.sets.has("s2"));
        assert.isTrue(store.state.visibility.showContext);
    });

    it("records a delete as a key going absent, and undoes it", () => {
        const kept = scope("s1");
        const store = createProjectStore(createProjectState({ sets: new Map([["s1", kept]]) }));
        const draft = store.open();
        draft.sets.delete("s1");
        const patch = draft.seal();

        assert.isFalse(store.state.sets.has("s1"));
        store.applyBackward(patch);
        assert.strictEqual(store.state.sets.get("s1"), kept);
    });

    it("puts every key back on rollback", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        draft.layout = Object.freeze({ id: "ngraph", engine: "ngraph", options: {}, dimension: "3d" as const });
        draft.views.set("home", Object.freeze({ position: { x: 0, y: 0, z: 1 } }));
        draft.rollback();

        assert.isNull(store.state.layout);
        assert.strictEqual(store.state.views.size, 0);
    });

    it("refuses to write once it is closed", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        draft.seal();

        assert.throws(() => {
            draft.styles = stack("late");
        }, /closed draft/);
        assert.throws(() => draft.seal(), /already closed/);
    });
});

describe("two open drafts writing one key", () => {
    /**
     * A writes styles, then B writes them while A is still open.
     * @returns The store, the drafts and the three stacks in the order they held.
     */
    function handOver() {
        const store = createProjectStore(createProjectState());
        const original = store.state.styles;
        const fromA = stack("a");
        const fromB = stack("b");

        const a = store.open();
        a.styles = fromA;
        const b = store.open();
        b.styles = fromB;

        return { store, a, b, original, fromA, fromB };
    }

    it("hands the key over: A loses it and B's prior is A's prior", () => {
        const { a, b, original } = handOver();
        const patchA = a.seal();
        const patchB = b.seal();

        assert.lengthOf(patchA.entries, 0);
        assert.lengthOf(patchB.entries, 1);
        assert.strictEqual(patchB.entries[0].prior, original);
    });

    it("leaves B's value when A rolls back", () => {
        const { store, a, fromB } = handOver();
        a.rollback();

        assert.strictEqual(store.state.styles, fromB);
    });

    it("leaves B's value when A (sealed above B) is undone, and restores the value before both when B is", () => {
        const { store, a, b, original, fromB } = handOver();
        const patchB = b.seal();
        const patchA = a.seal();

        store.applyBackward(patchA);
        assert.strictEqual(store.state.styles, fromB);
        store.applyBackward(patchB);
        assert.strictEqual(store.state.styles, original);

        store.applyForward(patchB);
        store.applyForward(patchA);
        assert.strictEqual(store.state.styles, fromB);
    });

    it("takes the key back when A writes it again while B is open", () => {
        const { store, a, b, original } = handOver();
        const again = stack("a2");
        a.styles = again;
        const patchB = b.seal();
        const patchA = a.seal();

        assert.lengthOf(patchB.entries, 0);
        assert.strictEqual(patchA.entries[0].prior, original);
        store.applyBackward(patchA);
        assert.strictEqual(store.state.styles, original);
    });

    it("leaves other keys with the draft that wrote them", () => {
        const store = createProjectStore(createProjectState());
        const a = store.open();
        a.config.set("background.color", "red");
        const b = store.open();
        b.config.set("selection.color", "blue");
        a.rollback();

        assert.isFalse(store.state.config.has("background.color"));
        assert.strictEqual(store.state.config.get("selection.color"), "blue");
    });
});

describe("a checkpoint", () => {
    it("puts back the keys written since, releases the keys first written since, and keeps the rest", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        draft.config.set("kept", "before");
        draft.config.set("changed", "before");
        const revert = draft.checkpoint();
        draft.config.set("changed", "after");
        draft.config.set("added", "after");

        assert.sameMembers([...revert()], ["config"]);
        assert.strictEqual(store.state.config.get("kept"), "before");
        assert.strictEqual(store.state.config.get("changed"), "before");
        assert.isFalse(store.state.config.has("added"));
        const patch = draft.seal();
        assert.sameMembers(
            patch.entries.map((entry) => entry.key),
            ["kept", "changed"],
            "the key first written after the checkpoint left the draft",
        );
    });

    it("nests: an inner revert goes back to the inner checkpoint, then an outer one to the outer", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        draft.config.set("a", "0");
        const outer = draft.checkpoint();
        draft.config.set("a", "1");
        draft.config.set("b", "1");
        const inner = draft.checkpoint();
        draft.config.set("a", "2");
        draft.config.set("b", "2");
        draft.config.set("c", "2");

        inner();
        assert.strictEqual(store.state.config.get("a"), "1");
        assert.strictEqual(store.state.config.get("b"), "1");
        assert.isFalse(store.state.config.has("c"));

        outer();
        assert.strictEqual(store.state.config.get("a"), "0");
        assert.isFalse(store.state.config.has("b"));
        assert.isFalse(store.state.config.has("c"));
        assert.deepEqual(
            draft.seal().entries.map((entry) => [entry.key, entry.next]),
            [["a", "0"]],
        );
    });

    it("an outer revert after an inner one also puts back what was written between them", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        const outer = draft.checkpoint();
        draft.config.set("a", "1");
        const inner = draft.checkpoint();
        inner();
        draft.config.set("a", "2");

        outer();
        assert.isFalse(store.state.config.has("a"));
        assert.lengthOf(draft.seal().entries, 0);
    });

    it("reverts to the same place twice, including after writes made since the first revert", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        draft.config.set("a", "0");
        const revert = draft.checkpoint();
        draft.config.set("a", "1");
        draft.config.set("b", "1");

        revert();
        assert.deepEqual(revert(), [], "a second revert with nothing written since changes nothing");
        draft.config.set("a", "2");
        draft.config.set("b", "2");
        draft.config.set("b", "3");

        revert();
        assert.strictEqual(store.state.config.get("a"), "0");
        assert.isFalse(store.state.config.has("b"));
    });

    it("leaves a key handed to another draft since with that draft", () => {
        const store = createProjectStore(createProjectState());
        const a = store.open();
        const revert = a.checkpoint();
        a.config.set("k", "a");
        const b = store.open();
        b.config.set("k", "b");

        assert.deepEqual(revert(), []);
        assert.strictEqual(store.state.config.get("k"), "b");
        assert.lengthOf(a.seal().entries, 0);
        assert.lengthOf(b.seal().entries, 1);
    });

    it("takes a key handed away and back to the value it held at the checkpoint", () => {
        const store = createProjectStore(createProjectState());
        const a = store.open();
        a.config.set("k", "a1");
        const revert = a.checkpoint();
        const b = store.open();
        b.config.set("k", "b");
        a.config.set("k", "a2");

        revert();
        assert.strictEqual(store.state.config.get("k"), "a1");
        assert.lengthOf(b.seal().entries, 0);
        const patch = a.seal();
        assert.strictEqual(patch.entries[0].prior, ABSENT);
        assert.strictEqual(patch.entries[0].next, "a1");
    });

    it("releases a key first written after the checkpoint, even after it went away and came back", () => {
        const store = createProjectStore(createProjectState({ config: new Map([["k", "live"]]) }));
        const a = store.open();
        const revert = a.checkpoint();
        a.config.set("k", "a1");
        const b = store.open();
        b.config.set("k", "b");
        a.config.set("k", "a2");

        revert();
        assert.strictEqual(store.state.config.get("k"), "live");
        assert.lengthOf(a.seal().entries, 0);
        assert.lengthOf(b.seal().entries, 0);
    });
});

/**
 * Count the entries every Map yields while a body runs, through iteration or forEach.
 * @param body - The code to watch.
 * @returns How many entries were read.
 */
function mapEntriesRead(body: () => void): number {
    const proto = Map.prototype as unknown as Record<PropertyKey, unknown>;
    const names: PropertyKey[] = [Symbol.iterator, "entries", "keys", "values"];
    const originals = names.map((name) => proto[name] as (this: Map<unknown, unknown>) => Iterator<unknown>);
    const originalForEach = Map.prototype.forEach;
    let read = 0;
    names.forEach((name, at) => {
        const original = originals[at];
        proto[name] = function counted(this: Map<unknown, unknown>): IterableIterator<unknown> {
            const inner = original.call(this);
            return {
                next() {
                    const step = inner.next();
                    if (step.done !== true) {
                        read++;
                    }

                    return step;
                },
                [Symbol.iterator]() {
                    return this;
                },
            };
        };
    });
    Map.prototype.forEach = function counted(this: Map<unknown, unknown>, ...args) {
        read += this.size;
        originalForEach.apply(this, args);
    };
    try {
        body();
    } finally {
        names.forEach((name, at) => {
            proto[name] = originals[at];
        });
        Map.prototype.forEach = originalForEach;
    }

    return read;
}

describe("the work of a checkpoint", () => {
    const HELD = 10_000;
    const CHECKPOINTS = 100;

    it("takes a checkpoint and reverts one without reading every key the draft holds", () => {
        const store = createProjectStore(createProjectState());
        const draft = store.open();
        for (let at = 0; at < HELD; at++) {
            draft.config.set(`held${String(at)}`, at);
        }

        // The counter sees a Map being read: reading the draft's own key list would count HELD.
        assert.strictEqual(
            mapEntriesRead(() => {
                assert.lengthOf([...store.state.config.keys()], HELD);
            }),
            HELD,
        );

        let taking = 0;
        let reverting = 0;
        for (let at = 0; at < CHECKPOINTS; at++) {
            let revert: (() => readonly unknown[]) | undefined;
            taking += mapEntriesRead(() => {
                revert = draft.checkpoint();
            });
            draft.config.set(`held${String(at)}`, "changed");
            draft.config.set(`new${String(at)}`, "added");
            reverting += mapEntriesRead(() => {
                revert?.();
            });
        }

        // A snapshot checkpoint read every held key each time: HELD per checkpoint and per revert,
        // a million each over the loop. The bounds allow a few reads per key the member wrote.
        assert.isAtMost(taking, CHECKPOINTS, `${String(CHECKPOINTS)} checkpoints read ${String(taking)} map entries`);
        assert.isAtMost(
            reverting,
            4 * 2 * CHECKPOINTS,
            `${String(CHECKPOINTS)} reverts of two writes each read ${String(reverting)} map entries`,
        );
        assert.strictEqual(store.state.config.get("held0"), 0, "each revert put its key back");
        assert.isFalse(store.state.config.has("new0"), "each revert released its new key");
    });
});

describe("deepFreezeArgs", () => {
    it("copies and deep-freezes a stored argument, so the caller's later edits change nothing", () => {
        const argument = { filter: { where: { path: "degree", gte: 2 } }, tags: ["a"] };
        const stored = deepFreezeArgs(argument);

        const store = createProjectStore(createProjectState());
        const draft = store.open();
        draft.config.set("filter", stored);
        draft.seal();

        argument.filter.where.gte = 99;
        argument.tags.push("b");

        assert.notStrictEqual(stored, argument);
        assert.isTrue(Object.isFrozen(stored));
        assert.isTrue(Object.isFrozen(stored.filter.where));
        assert.isTrue(Object.isFrozen(stored.tags));
        assert.deepEqual(store.state.config.get("filter"), {
            filter: { where: { path: "degree", gte: 2 } },
            tags: ["a"],
        });
        assert.throws(() => {
            stored.tags.push("c");
        }, TypeError);
    });
});

describe("the token and epoch counters", () => {
    it("never issue the same value twice across a million draws", () => {
        const counter = createCounter();
        const seen = new Set<number>();
        for (let draw = 0; draw < 1_000_000; draw++) {
            seen.add(counter.next());
        }

        assert.strictEqual(seen.size, 1_000_000);
    });

    it("are independent per counter, so a token and an epoch come from separate sequences", () => {
        const token = createCounter();
        const epoch = createCounter();
        token.next();
        token.next();

        assert.strictEqual(epoch.next(), 1);
        assert.strictEqual(token.next(), 3);
    });
});
