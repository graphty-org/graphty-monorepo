import { assert, describe, it } from "vitest";

import { ABSENT, createProjectStore, deepFreezeArgs } from "../../../src/session/project/draft";
import { createCounter, createProjectState } from "../../../src/session/project/state";
import type { SavedScope } from "../../../src/session/scope/ScopeApi";
import type { CompiledLayer } from "../../../src/session/styles/Layer";

/** A stand-in layer stack; the draft never looks inside one. */
function stack(name: string): readonly CompiledLayer[] {
    return Object.freeze([{ name } as unknown as CompiledLayer]);
}

/** A stand-in saved scope. */
function scope(id: string): SavedScope {
    return Object.freeze({ id, name: id, spec: "graph", bound: true });
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
        const store = createProjectStore(createProjectState({ scopes: new Map([["s1", first]]) }));
        const second = scope("s1");
        const before = store.state.styles;
        const after = stack("a");

        const draft = store.open();
        draft.styles = after;
        draft.scopes.set("s1", second);
        draft.scopes.set("s2", scope("s2"));
        draft.visibility.set("showContext", true);
        const patch = draft.seal();

        store.applyBackward(patch);
        assert.strictEqual(store.state.styles, before);
        assert.strictEqual(store.state.scopes.get("s1"), first);
        assert.isFalse(store.state.scopes.has("s2"));
        assert.isFalse(store.state.visibility.showContext);

        store.applyForward(patch);
        assert.strictEqual(store.state.styles, after);
        assert.strictEqual(store.state.scopes.get("s1"), second);
        assert.isTrue(store.state.scopes.has("s2"));
        assert.isTrue(store.state.visibility.showContext);
    });

    it("records a delete as a key going absent, and undoes it", () => {
        const kept = scope("s1");
        const store = createProjectStore(createProjectState({ scopes: new Map([["s1", kept]]) }));
        const draft = store.open();
        draft.scopes.delete("s1");
        const patch = draft.seal();

        assert.isFalse(store.state.scopes.has("s1"));
        store.applyBackward(patch);
        assert.strictEqual(store.state.scopes.get("s1"), kept);
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
        assert.deepEqual(store.state.config.get("filter"), { filter: { where: { path: "degree", gte: 2 } }, tags: ["a"] });
        assert.throws(() => {
            (stored.tags).push("c");
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
