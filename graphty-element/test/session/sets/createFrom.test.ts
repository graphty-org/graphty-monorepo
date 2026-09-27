/**
 * @file `sets.createFrom`: the design 15.2 defaults, an explicit reading, the defaulted-listed
 * collapse to induced, the empty-source refusal, concurrency forced through an injected resolve
 * step, and the work the synchronous commit does (design/sets/sets-design.md sections 4.1, 6.5,
 * 13.3 and 15.2).
 */

import { assert, describe, it } from "vitest";

import { hashCounters } from "../../../src/catalog/sets/hash";
import type { EdgeId, SetDefinition } from "../../../src/catalog/types";
import { isGraphtyError } from "../../../src/errors";
import { scopeResolverOfSession } from "../../../src/session/GraphSession";
import { edgeSpaceOf } from "../../../src/session/scope/ScopeApi";
import { type Concrete, createMaterialiser, type Materialiser } from "../../../src/session/sets/algebra";
import { prepareCounters } from "../../../src/session/sets/prepare";
import { resolveCounters } from "../../../src/session/sets/resolve";
import { createSetsApi, sessionEdgeMember } from "../../../src/session/sets/SetsApi";
import { edgeBetween, type Harness, makeSession } from "../helpers";

/** A path a-b-c-d and a spur c-e, plus an isolated pair f-g. */
function harnessOf(): Harness {
    const harness = makeSession();
    harness.add(
        ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({ id })),
        [
            { src: "a", dst: "b" },
            { src: "b", dst: "c" },
            { src: "c", dst: "d" },
            { src: "c", dst: "e" },
            { src: "f", dst: "g" },
        ],
    );

    return harness;
}

/**
 * The code a call refused with; null when it did not.
 * @param call - The call.
 * @returns The code.
 */
async function codeOf(call: () => Promise<unknown>): Promise<string | null> {
    try {
        await call();
    } catch (error) {
        return isGraphtyError(error) ? error.code : "not-a-graphty-error";
    }

    return null;
}

/** A stored fixed definition's reading and edge count. */
function shapeOf(definition: SetDefinition | undefined): { reading: string; nodes: number; edges: number } | null {
    return definition?.kind === "fixed" ? { reading: definition.reading, nodes: definition.nodes.length, edges: definition.edges?.length ?? 0 } : null;
}

describe("sets.createFrom: the design 15.2 defaults", () => {
    it("keeps a selection holding nodes as its nodes and edges, read induced, created from the selection", async () => {
        const h = harnessOf();
        await h.session.selection.apply({ nodes: ["a", "b"], edges: [edgeBetween(h, "c", "d")] });

        const id = await h.session.sets.createFrom("selection", { name: "Picked" });

        const set = h.session.sets.get(id);
        assert.deepStrictEqual(shapeOf(set?.definition), { reading: "induced", nodes: 2, edges: 1 });
        assert.deepStrictEqual(set?.createdFrom, { kind: "selection" });
        assert.strictEqual(set?.name, "Picked");
    });

    it("does not let one stray selected edge pull its ends into a set read induced", async () => {
        const h = harnessOf();
        await h.session.selection.apply({ nodes: ["a", "b"], edges: [edgeBetween(h, "c", "d")] });

        const id = await h.session.sets.createFrom("selection");
        const promoted = h.session.selection.promote("Promoted");

        for (const set of [id, promoted]) {
            const resolved = await h.session.scope.resolve({ set });
            assert.deepStrictEqual([...resolved.nodes].sort(), ["a", "b"], "the two selected nodes, not four");
            const count = await h.session.scope.count({ set });
            assert.deepStrictEqual([count.nodes, count.edges, count.missingNodes, count.missingEdges], [2, 1, 0, 0]);
        }

        // Switching the reading to listed brings the stored edge back.
        const stored = h.session.sets.get(id)?.definition;
        assert.strictEqual(stored?.kind, "fixed");
        h.session.sets.redefine(id, { ...(stored as Extract<SetDefinition, { kind: "fixed" }>), reading: "listed" });
        assert.deepStrictEqual((await h.session.scope.count({ set: id })).nodes, 4);
    });

    it("reads a selection of edges alone as listed", async () => {
        const h = harnessOf();
        await h.session.selection.apply({ edges: [edgeBetween(h, "a", "b")] });

        const id = await h.session.sets.createFrom("selection");

        assert.deepStrictEqual(shapeOf(h.session.sets.get(id)?.definition), { reading: "listed", nodes: 0, edges: 1 });
        assert.strictEqual((await h.session.scope.count({ set: id })).nodes, 2);
    });

    it("freezes visible, which is clipped, to listed when a filter hides an edge between two shown nodes", async () => {
        const h = harnessOf();
        await h.session.visibility.set({ kind: "not", of: { kind: "edges", where: "data.target == 'e'" } });

        const id = await h.session.sets.createFrom("visible");

        const set = h.session.sets.get(id);
        assert.deepStrictEqual(shapeOf(set?.definition), { reading: "listed", nodes: 7, edges: 4 });
        assert.deepStrictEqual(set?.createdFrom, { kind: "scope", from: "visible" });
    });

    it("lets an explicit reading win", async () => {
        const h = harnessOf();
        await h.session.selection.apply({ nodes: ["a", "b"], edges: [edgeBetween(h, "a", "b")] });

        const listed = await h.session.sets.createFrom("selection", { reading: "listed" });
        const graph = await h.session.sets.createFrom("graph", { reading: "listed" });
        const clipped = await h.session.sets.createFrom("graph", { reading: "clipped" });

        assert.deepStrictEqual(shapeOf(h.session.sets.get(listed)?.definition), { reading: "listed", nodes: 2, edges: 1 });
        assert.deepStrictEqual(shapeOf(h.session.sets.get(graph)?.definition), { reading: "listed", nodes: 7, edges: 5 });
        assert.deepStrictEqual(shapeOf(h.session.sets.get(clipped)?.definition), { reading: "listed", nodes: 7, edges: 5 });
    });

    it("stores a defaulted listed result equal to its induced form as induced, which gains a later edge; an explicit listed does not", async () => {
        const h = harnessOf();

        const defaulted = await h.session.sets.createFrom("visible");
        const explicit = await h.session.sets.createFrom("visible", { reading: "listed" });
        assert.deepStrictEqual(shapeOf(h.session.sets.get(defaulted)?.definition), { reading: "induced", nodes: 7, edges: 0 });
        assert.deepStrictEqual(shapeOf(h.session.sets.get(explicit)?.definition), { reading: "listed", nodes: 7, edges: 5 });

        h.add([], [{ src: "a", dst: "d" }]);

        assert.strictEqual((await h.session.scope.count({ set: defaulted })).edges, 6);
        assert.strictEqual((await h.session.scope.count({ set: explicit })).edges, 5);
    });

    it("stores the largest component as its nodes alone", async () => {
        const h = harnessOf();

        const id = await h.session.sets.createFrom("largest-component");

        const set = h.session.sets.get(id);
        assert.deepStrictEqual(set?.definition, { kind: "fixed", nodes: ["a", "b", "c", "d", "e"], reading: "induced" });
        assert.deepStrictEqual(set?.createdFrom, { kind: "scope", from: "largest-component" });
    });

    it("records an inline member list by its size", async () => {
        const h = harnessOf();

        const id = await h.session.sets.createFrom({ nodes: ["a", "b", "zz"] });

        assert.deepStrictEqual(h.session.sets.get(id)?.createdFrom, { kind: "scope", from: { inline: { nodes: 3, edges: 0 } } });
        assert.deepStrictEqual(h.session.sets.get(id)?.definition, { kind: "fixed", nodes: ["a", "b"], reading: "induced" });
    });

    it("refuses an empty source with E_SCOPE_EMPTY", async () => {
        const h = harnessOf();

        assert.strictEqual(await codeOf(() => h.session.sets.createFrom("selection")), "E_SCOPE_EMPTY");
        assert.strictEqual(await codeOf(() => h.session.sets.createFrom({ nodes: ["zz"] })), "E_SCOPE_EMPTY");
        assert.deepStrictEqual(h.session.sets.list(), []);
    });
});

/** A resolve step each call of which waits until the test releases it. */
function heldMaterialiser(): { materialise: Materialiser; release: (index: number) => void } {
    const pending: (() => void)[] = [];
    const concrete: Concrete = { definition: { kind: "fixed", nodes: ["a"], reading: "induced" }, refs: [], createdFrom: { kind: "scope", from: "graph" } };
    const held = (): Promise<Concrete> =>
        new Promise((resolve) => {
            pending.push(() => {
                resolve(concrete);
            });
        });

    return {
        materialise: { from: held, combine: held, path: held },
        release: (index: number) => {
            pending[index]();
        },
    };
}

describe("sets.createFrom: two calls in flight", () => {
    it("gives the second of two resolved calls with one name E_DUPLICATE_ID, never the same id", async () => {
        const { materialise, release } = heldMaterialiser();
        const sets = createSetsApi({ edgeMember: () => undefined, materialise });

        const first = sets.createFrom("graph", { name: "Suspects" });
        const second = sets.createFrom("graph", { name: "Suspects" });
        release(0);
        release(1);

        assert.strictEqual(await first, "set_suspects");
        assert.strictEqual(await codeOf(() => second), "E_DUPLICATE_ID");
        assert.deepStrictEqual(
            sets.list().map((set) => set.id),
            ["set_suspects"],
        );
    });

    it("refuses a call whose name another call took while it was pending", async () => {
        const { materialise, release } = heldMaterialiser();
        const sets = createSetsApi({ edgeMember: () => undefined, materialise });

        const first = sets.createFrom("graph", { name: "Suspects" });
        const second = sets.createFrom("graph", { name: "Suspects" });
        release(1);
        assert.strictEqual(await second, "set_suspects");
        release(0);

        assert.strictEqual(await codeOf(() => first), "E_DUPLICATE_ID");
    });

    it("gives unnamed calls distinct ids and names, however they interleave", async () => {
        const { materialise, release } = heldMaterialiser();
        const sets = createSetsApi({ edgeMember: () => undefined, materialise });

        const calls = [sets.createFrom("graph"), sets.createFrom("graph"), sets.createFrom("graph")];
        release(2);
        const last = await calls[2];
        release(0);
        release(1);
        const ids = [await calls[0], await calls[1], last];

        assert.strictEqual(new Set(ids).size, 3);
        assert.strictEqual(new Set(sets.list().map((set) => set.name)).size, 3);
    });
});

describe("sets.createFrom: the synchronous commit", () => {
    /**
     * The work the commit of a createFrom of k listed edges does on a path of n nodes: the real
     * resolve step runs first, the counters are read when it has finished, and again when the
     * door resolves.
     */
    async function commitWork(n: number, k: number): Promise<{ resolution: number; interns: number; hashes: number; edges: number }> {
        const h = makeSession();
        const ids = Array.from({ length: n }, (_, i) => `n${i}`);
        h.add(
            ids.map((id) => ({ id })),
            ids.slice(1).map((id, i) => ({ src: ids[i], dst: id })),
        );
        const resolver = scopeResolverOfSession(h.session);
        const edgeMember = (id: EdgeId): ReturnType<typeof sessionEdgeMember> =>
            sessionEdgeMember(h.session.data.snapshot(), id, (row) => h.edgeAttributes.get(row), null);
        const real = createMaterialiser({
            snapshot: () => h.session.data.snapshot(),
            resolve: (spec) => resolver.resolutionOf(spec),
            readingOf: (spec) => resolver.readingOf(spec),
            edgeMember,
        });
        const resolutionWork = (): number => Object.values(resolveCounters).reduce((sum, count) => sum + count, 0);
        let before = { resolution: 0, interns: 0, hashes: 0 };
        const sets = createSetsApi({
            edgeMember,
            materialise: {
                ...real,
                from: async (source, reading) => {
                    const concrete = await real.from(source, reading);
                    before = { resolution: resolutionWork(), interns: prepareCounters.interns, hashes: hashCounters.memberHashes };

                    return concrete;
                },
            },
        });
        const space = edgeSpaceOf(h.session.data.snapshot());
        const edges = Array.from({ length: k }, (_, i) => space.idOf(2 * i));

        const id = await sets.createFrom({ define: { kind: "fixed", nodes: [], edges, reading: "listed" } }, { reading: "listed" });

        const definition = sets.get(id)?.definition;

        return {
            resolution: resolutionWork() - before.resolution,
            interns: prepareCounters.interns - before.interns,
            hashes: hashCounters.memberHashes - before.hashes,
            edges: definition?.kind === "fixed" ? (definition.edges?.length ?? 0) : -1,
        };
    }

    it("resolves, hashes and interns nothing, at two graph sizes", async () => {
        const small = await commitWork(400, 50);
        const large = await commitWork(4000, 50);

        assert.strictEqual(small.edges, 50);
        assert.strictEqual(large.edges, 50);
        assert.strictEqual(small.resolution, 0, "the commit resolves nothing");
        assert.strictEqual(large.resolution, 0);
        assert.strictEqual(small.hashes, 0, "the commit hashes nothing; the revision is read lazily");
        assert.strictEqual(small.interns, 0, "the asynchronous step built the compact members");
        assert.strictEqual(large.interns, 0);

    });
});
