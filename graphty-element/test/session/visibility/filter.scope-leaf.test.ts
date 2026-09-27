/**
 * @file The `scope` leaf, the readings applied at a rule's root, and the refusals a chain of
 * references gets (design/sets/sets-design.md sections 4.3 and 5.2).
 *
 * The graph: a-b strong, a-c weak, b-c strong, c-d strong, d-e strong. Degrees a2 b2 c3 d2 e1.
 */

import { assert, describe, it } from "vitest";

import type { Filter, NodeId, Scope, SetDefinition } from "../../../src/catalog/types";
import { type GraphtyError, isGraphtyError } from "../../../src/errors";
import type { GraphSession } from "../../../src/session";
import { setsOfSession } from "../../../src/session/GraphSession";
import { resolveSet } from "../../../src/session/sets/cache";
import { prepareRedefine } from "../../../src/session/sets/prepare";
import type { Resolution } from "../../../src/session/sets/resolve";
import { setsStoreOf } from "../../../src/session/sets/SetsApi";
import type { SetsStore } from "../../../src/session/sets/store";
import type { SetsApi } from "../../../src/session/sets/types";
import { edgeBetween, type Harness, makeSession } from "../helpers";

/**
 * A session's kept sets, their store, and a quiet resolver of one set, as a pass reads it.
 * @param session - The session.
 * @returns The doors, the store and the resolver.
 */
function setOfSession(session: GraphSession): SetsApi & { store: SetsStore; resolve(id: string): Resolution } {
    const api = setsOfSession(session);
    const store = setsStoreOf(api);
    const resolve = (id: string): Resolution => {
        const record = store.get(id);
        if (record === undefined) {
            throw new Error(`no set ${id}`);
        }

        return resolveSet(record, { snapshot: session.data.snapshot(), sets: store });
    };

    return { ...api, store, resolve };
}

const STRONG = "data.weight > `0.5`";
const LEAF = "data.type == 'leaf'";
const HUBS: Filter = { kind: "degree", min: 2 };

/**
 * The fixture.
 * @returns The harness.
 */
function harnessOf(): Harness {
    const harness = makeSession({ directed: false });
    harness.add(
        [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e", type: "leaf" }],
        [
            { src: "a", dst: "b", weight: 0.9 },
            { src: "a", dst: "c", weight: 0.1 },
            { src: "b", dst: "c", weight: 0.8 },
            { src: "c", dst: "d", weight: 0.9 },
            { src: "d", dst: "e", weight: 0.95 },
        ],
    );

    return harness;
}

/**
 * Edge ids of named pairs, sorted.
 * @param harness - The harness.
 * @param pairs - `"ab"` style pairs.
 * @returns The ids.
 */
function edgesOf(harness: Harness, ...pairs: string[]): string[] {
    return pairs.map((pair) => edgeBetween(harness, pair[0], pair[1])).sort();
}

/**
 * What a scope resolves to, as two sorted id lists.
 * @param harness - The harness.
 * @param scope - The scope.
 * @returns Nodes and edges.
 */
async function members(harness: Harness, scope: Scope): Promise<{ nodes: NodeId[]; edges: string[] }> {
    const resolved = await harness.session.scope.resolve(scope);

    return { nodes: [...resolved.nodes].sort(), edges: [...resolved.edges].sort() };
}

/**
 * What a filter leaves visible, as two sorted id lists.
 * @param harness - The harness.
 * @param filter - The filter.
 * @returns Nodes and edges.
 */
async function visible(harness: Harness, filter: Filter): Promise<{ nodes: NodeId[]; edges: string[] }> {
    await harness.session.visibility.set(filter);

    return { nodes: [...harness.session.visibility.nodes].sort(), edges: [...harness.session.visibility.edges].sort() };
}

/**
 * A rule definition.
 * @param where - Its tree.
 * @param reading - Its reading.
 * @returns The definition.
 */
function rule(where: Filter | string, reading: "induced" | "listed" | "clipped"): SetDefinition {
    return { kind: "rule", where, reading };
}

/**
 * The refusal a call throws.
 * @param call - The call.
 * @returns The error.
 */
function refusal(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        if (isGraphtyError(error)) {
            return error;
        }

        throw error;
    }

    throw new Error("the call did not refuse");
}

describe("the scope leaf", () => {
    it("speaks the node half of an induced set, and is silent on its edges", async () => {
        const harness = harnessOf();
        const scoped = await visible(harness, {
            kind: "all",
            of: [{ kind: "scope", scope: { nodes: ["a", "b", "c"] } }, { kind: "edges", where: STRONG }],
        });

        assert.deepStrictEqual(scoped.nodes, ["a", "b", "c"]);
        assert.deepStrictEqual(scoped.edges, edgesOf(harness, "ab", "bc"), "the edge leaf alone narrows the edges");
    });

    it("keeps every hub-to-hub edge inside any, exactly as the expression leaf it replaces", async () => {
        const harness = harnessOf();
        const viaScope = await visible(harness, {
            kind: "any",
            of: [{ kind: "scope", scope: { where: LEAF } }, HUBS],
        });
        const viaLeaf = await visible(harness, { kind: "any", of: [{ kind: "expression", where: LEAF }, HUBS] });

        assert.deepStrictEqual(viaScope, viaLeaf);
        assert.includeMembers(viaScope.edges, edgesOf(harness, "ab", "ac", "bc", "cd", "de"));
    });

    it("speaks the edge half of a listed or clipped set", async () => {
        const harness = harnessOf();
        const listed = await visible(harness, {
            kind: "scope",
            scope: { define: rule({ kind: "edges", where: STRONG }, "listed") },
        });
        assert.deepStrictEqual(listed.nodes, ["a", "b", "c", "d", "e"]);
        assert.deepStrictEqual(listed.edges, edgesOf(harness, "ab", "bc", "cd", "de"), "the weak edge a-c is not in the set");

        const clipped = await visible(harness, {
            kind: "all",
            of: [HUBS, { kind: "scope", scope: { define: rule({ kind: "edges", where: STRONG }, "clipped") } }],
        });
        assert.deepStrictEqual(clipped.nodes, ["a", "b", "c", "d"]);
        assert.deepStrictEqual(clipped.edges, edgesOf(harness, "ab", "bc", "cd"));
    });
});

describe("a rule's reading, applied at its root", () => {
    const tree: Filter = { kind: "all", of: [HUBS, { kind: "edges", where: STRONG }] };

    it("induced: the node half and every edge between its nodes", async () => {
        const harness = harnessOf();
        assert.deepStrictEqual(await members(harness, { define: rule(HUBS, "induced") }), {
            nodes: ["a", "b", "c", "d"],
            edges: edgesOf(harness, "ab", "ac", "bc", "cd"),
        });
    });

    it("listed: every strong edge anywhere, with its endpoints, plus the hubs", async () => {
        const harness = harnessOf();
        assert.deepStrictEqual(await members(harness, { define: rule(tree, "listed") }), {
            nodes: ["a", "b", "c", "d", "e"],
            edges: edgesOf(harness, "ab", "bc", "cd", "de"),
        });
    });

    it("clipped: the hubs, and the strong edges between them", async () => {
        const harness = harnessOf();
        assert.deepStrictEqual(await members(harness, { define: rule(tree, "clipped") }), {
            nodes: ["a", "b", "c", "d"],
            edges: edgesOf(harness, "ab", "bc", "cd"),
        });
    });

    it("keeps every node and only the strong edges for not { edges: weight < 0.5 } read clipped", async () => {
        const harness = harnessOf();
        assert.deepStrictEqual(
            await members(harness, { define: rule({ kind: "not", of: { kind: "edges", where: "data.weight < `0.5`" } }, "clipped") }),
            { nodes: ["a", "b", "c", "d", "e"], edges: edgesOf(harness, "ab", "bc", "cd", "de") },
        );
    });

    it("a silent node half under listed is no nodes", async () => {
        const harness = harnessOf();
        assert.deepStrictEqual(await members(harness, { define: rule({ kind: "edges", where: "data.weight > `0.92`" }, "listed") }), {
            nodes: ["d", "e"],
            edges: edgesOf(harness, "de"),
        });
    });
});

describe("refusals, each with a typed reason", () => {
    it("refuses a kept rule that reads the live selection", () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        const error = refusal(() => sets.create(rule({ kind: "scope", scope: "selection" }, "induced")));

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details?.reason, "live-selection");
    });

    it("refuses a set that reaches itself through scope leaves, naming the chain", () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        const first = sets.create(rule({ kind: "scope", scope: { nodes: ["a"] } }, "induced"), { name: "first" });
        const second = sets.create(rule({ kind: "scope", scope: { set: first } }, "induced"), { name: "second" });
        const error = refusal(() => {
            sets.redefine(first, rule({ kind: "scope", scope: { set: second } }, "induced"));
        });

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details?.reason, "cycle");
        assert.deepStrictEqual(error.details?.through, [second, first]);
        assert.deepStrictEqual(sets.get(first)?.definition, rule({ kind: "scope", scope: { nodes: ["a"] } }, "induced"), "nothing written");
    });

    it("refuses a rule read induced whose scope leaf speaks edges, inline or through a set", () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        const inline = refusal(() =>
            sets.create(rule({ kind: "scope", scope: { define: rule({ kind: "edges", where: STRONG }, "listed") } }, "induced")),
        );
        assert.strictEqual(inline.details?.reason, "induced-edge-leaf");

        const listed = sets.create(rule({ kind: "edges", where: STRONG }, "listed"), { name: "strong" });
        const named = refusal(() => sets.create(rule({ kind: "scope", scope: { set: listed } }, "induced")));
        assert.strictEqual(named.details?.reason, "induced-edge-leaf");

        const visibleLeaf = refusal(() => sets.create(rule({ kind: "scope", scope: "visible" }, "induced")));
        assert.strictEqual(visibleLeaf.details?.reason, "induced-edge-leaf", '"visible" is clipped, so it speaks edges');
    });

    it("refuses a visibility filter that reads visible, directly or through a kept set", () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        const direct = refusal(() => harness.session.visibility.set({ kind: "scope", scope: "visible" }));
        assert.strictEqual(direct.details?.reason, "cycle");
        assert.deepStrictEqual(direct.details?.through, ["visible"]);

        const follows = sets.create(rule({ kind: "scope", scope: "visible" }, "clipped"), { name: "on screen" });
        const through = refusal(() => harness.session.visibility.set({ kind: "not", of: { kind: "scope", scope: { set: follows } } }));
        assert.strictEqual(through.details?.reason, "cycle");
        assert.deepStrictEqual(through.details?.through, [follows, "visible"]);

        const inline = refusal(() =>
            harness.session.visibility.set({ kind: "scope", scope: { define: rule({ kind: "scope", scope: { set: follows } }, "clipped") } }),
        );
        assert.deepStrictEqual(inline.details?.through, [follows, "visible"]);
        assert.isNull(harness.session.visibility.filter, "nothing was applied");
    });

    it("refuses a set redefined to read visible while the filter names it", async () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        const named = sets.create(rule({ kind: "scope", scope: { nodes: ["a", "b"] } }, "induced"), { name: "pair" });
        await harness.session.visibility.set({ kind: "scope", scope: { set: named } });
        const error = refusal(() => {
            sets.redefine(named, rule({ kind: "scope", scope: "visible" }, "clipped"));
        });

        assert.strictEqual(error.details?.reason, "cycle");
        assert.deepStrictEqual(error.details?.through, ["visible", named]);
    });

    it("refuses a filter reaching search through a loaded set, and search itself", () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        const {store} = sets;
        store.loadLogicalRecords({
            records: [
                {
                    id: "set_loaded",
                    name: "Loaded",
                    order: 0,
                    definition: rule({ kind: "scope", scope: "search" as Scope }, "induced"),
                    createdFrom: { kind: "user" },
                },
            ],
            register: ["set_loaded"],
            tombstones: [],
        });
        const through = refusal(() => harness.session.visibility.set({ kind: "scope", scope: { set: "set_loaded" } }));
        assert.strictEqual(through.details?.reason, "cycle");
        assert.deepStrictEqual(through.details?.through, ["set_loaded", "search"]);

        const direct = refusal(() => harness.session.visibility.set({ kind: "scope", scope: "search" as Scope }));
        assert.deepStrictEqual(direct.details?.through, ["search"]);
    });

    it("refuses a scope that resolves through a ring at scope.resolve", () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        sets.store.loadLogicalRecords({
            records: [
                { id: "set_x", name: "X", order: 0, definition: rule({ kind: "scope", scope: { set: "set_y" } }, "induced"), createdFrom: { kind: "user" } },
                { id: "set_y", name: "Y", order: 1, definition: rule({ kind: "scope", scope: { set: "set_x" } }, "induced"), createdFrom: { kind: "user" } },
            ],
            register: ["set_x", "set_y"],
            tombstones: [],
        });
        const error = refusal(() => harness.session.scope.resolve({ set: "set_x" }));

        assert.strictEqual(error.details?.reason, "cycle");
        assert.deepStrictEqual(error.details?.through, ["set_y", "set_x"]);
    });
});

describe("nothing throws or recurses in a pass", () => {
    it("a ring a load made resolves to nothing, carrying the cycle, and never recurses", () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        sets.store.loadLogicalRecords({
            records: [
                { id: "set_x", name: "X", order: 0, definition: rule({ kind: "scope", scope: { set: "set_y" } }, "induced"), createdFrom: { kind: "user" } },
                { id: "set_y", name: "Y", order: 1, definition: rule({ kind: "scope", scope: { set: "set_x" } }, "induced"), createdFrom: { kind: "user" } },
            ],
            register: ["set_x", "set_y"],
            tombstones: [],
        });
        const resolution = sets.resolve("set_x");

        assert.strictEqual(resolution.nodeCount, 0);
        assert.strictEqual(resolution.problem?.details?.reason, "cycle");
    });

    it("a filter naming a set that a load later points at visible shows nothing, and never reads its own masks", async () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        // The set exists harmlessly when the filter names it (a door refuses an id never issued).
        sets.store.loadLogicalRecords({
            records: [{ id: "set_later", name: "Later", order: 0, definition: { kind: "fixed", nodes: [], reading: "induced" }, createdFrom: { kind: "user" } }],
            register: ["set_later"],
            tombstones: [],
        });
        await harness.session.visibility.set({ kind: "any", of: [{ kind: "scope", scope: { set: "set_later" } }, { kind: "expression", where: LEAF }] });
        assert.deepStrictEqual([...harness.session.visibility.nodes], ["e"], "an empty referent speaks nothing");

        // Then it comes to read "visible", written past the doors (which refuse that cycle) as a
        // stored record arriving would be.
        sets.store.transact(() => {
            const next = prepareRedefine(sets.store, { id: "set_later", definition: rule({ kind: "scope", scope: "visible" }, "clipped") });
            if (next !== null) {
                sets.store.put(next);
            }
        });
        // The graph moves, so the stored filter is re-evaluated against the set that now reads "visible".
        harness.add([{ id: "f" }]);

        assert.deepStrictEqual([...harness.session.visibility.nodes], ["e"], "the cycle speaks nothing; the pass neither threw nor recursed");
    });

    it("a missing referent and an opaque referent resolve to nothing", async () => {
        const harness = harnessOf();
        const sets = setOfSession(harness.session);
        sets.store.loadLogicalRecords({
            records: [
                { id: "set_opaque", name: "Opaque", order: 0, definition: rule({ kind: "plugin:leaf" } as unknown as Filter, "induced"), createdFrom: { kind: "user" } },
                { id: "set_dangling", name: "Dangling", order: 1, definition: rule({ kind: "scope", scope: { set: "set_gone" } }, "induced"), createdFrom: { kind: "user" } },
            ],
            register: ["set_opaque", "set_dangling"],
            tombstones: [],
        });

        assert.strictEqual(sets.resolve("set_opaque").nodeCount, 0);
        assert.strictEqual(sets.resolve("set_dangling").nodeCount, 0);
        assert.deepStrictEqual((await members(harness, { define: rule({ kind: "scope", scope: { set: "set_opaque" } }, "induced") })).nodes, []);
    });
});
