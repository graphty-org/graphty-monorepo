/**
 * @file The derived-input cache (design/sets/sets-design.md section 10.3): its key, the shared
 * declared intermediate, reference counting across eviction, freezes and dispose, admission
 * against the byte bound, and byte accounting checked by an independent walk.
 */

import type { GraphSnapshot } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import { type DerivedInput, derivedInputCounters,DerivedInputs } from "../../../src/algorithms/input/derivedInputs";
import { createScopedInput, type ResolvedInputScope, scopedInputCounters } from "../../../src/algorithms/input/ScopedInput";
import { isGraphtyError } from "../../../src/errors";
import { InputGraph, resolutionOver } from "./harness";

/** A path of ten nodes with a parallel pair, so a merging policy has something to merge. */
function path(): InputGraph {
    const ids = Array.from({ length: 10 }, (_, index) => `n${String(index)}`);

    return new InputGraph(ids, [...ids.slice(1).map((id, index) => [ids[index], id, 1] as const), ["n0", "n1", 2]]);
}

/**
 * Read one input through the accessor, as an algorithm would.
 * @param graph - The graph.
 * @param inputs - The cache.
 * @param holder - The run.
 * @param scope - Its scope.
 * @param orientation - The orientation.
 * @returns The input.
 */
function read(graph: InputGraph, inputs: DerivedInputs, holder: object, scope: ResolvedInputScope, orientation: "declared" | "undirected" = "declared"): DerivedInput {
    return createScopedInput(graph.getDataManager(), orientation, undefined, { inputs, holder, scope: () => scope }).derived();
}

/**
 * A cache that records what it released.
 * @param limit - A byte bound, when the case wants a small one.
 * @returns The cache and the list.
 */
function recording(limit?: number): { inputs: DerivedInputs; released: GraphSnapshot[] } {
    const released: GraphSnapshot[] = [];
    const inputs = new DerivedInputs({ release: (snapshot) => released.push(snapshot), ...(limit === undefined ? {} : { limit }) });

    return { inputs, released };
}

/**
 * The bytes of every typed array reachable from some roots, each counted once, written here
 * independently of the cache's own accounting: every own property, getters left alone.
 * @param roots - The roots.
 * @returns The byte count.
 */
function walk(roots: unknown[]): number {
    const seen = new Set<unknown>();
    const arrays = new Set<ArrayBufferView>();
    const queue = [...roots];
    while (queue.length > 0) {
        const value = queue.shift();
        if (typeof value !== "object" || value === null || seen.has(value)) {
            continue;
        }

        seen.add(value);
        if (ArrayBuffer.isView(value)) {
            arrays.add(value);
        } else if (!(value instanceof ArrayBuffer)) {
            if (value instanceof Map || value instanceof Set) {
                for (const item of value instanceof Map ? [...value.keys(), ...value.values()] : value) {
                    queue.push(item);
                }
            }

            for (const key of Reflect.ownKeys(value)) {
                const descriptor = Object.getOwnPropertyDescriptor(value, key);
                if (descriptor !== undefined && "value" in descriptor) {
                    queue.push(descriptor.value);
                }
            }
        }
    }

    return [...arrays].reduce((total, array) => total + array.byteLength, 0);
}

describe("the key", () => {
    it("hits on another resolution with the same bitmaps, and misses on each part of the key", () => {
        const graph = path();
        const { inputs } = recording();
        const holder = {};
        const scope = graph.scope(["n0", "n1", "n2"]);
        const first = read(graph, inputs, holder, scope);

        // The same members, spelled by a different resolution object with copied bitmaps.
        const copy = { graph: scope.graph, resolution: resolutionOver(scope.graph, scope.resolution.nodes.slice(), scope.resolution.edges.slice(), graph.store) };
        assert.strictEqual(read(graph, inputs, holder, copy).snapshot, first.snapshot, "same bitmaps: a hit");

        assert.notStrictEqual(read(graph, inputs, holder, graph.scope(["n0", "n1", "n3"])).snapshot, first.snapshot, "another node bitmap");
        assert.notStrictEqual(
            read(graph, inputs, holder, graph.scope(["n0", "n1", "n2"], (source) => source !== "n1")).snapshot,
            first.snapshot,
            "another edge bitmap",
        );
        assert.notStrictEqual(read(graph, inputs, holder, scope, "undirected").snapshot, first.snapshot, "another orientation");
        const none = createScopedInput(graph.getDataManager(), "declared", { simplify: "none" }, { inputs, holder, scope: () => scope }).subgraph();
        assert.notStrictEqual(none, first.snapshot, "another merge policy");

        const otherStore = { graph: scope.graph, resolution: resolutionOver(scope.graph, scope.resolution.nodes, scope.resolution.edges, {}) };
        assert.notStrictEqual(read(graph, inputs, holder, otherStore).snapshot, first.snapshot, "another store");

        graph.add(["n10"]);
        const after = graph.scope(["n0", "n1", "n2"]);
        assert.notStrictEqual(read(graph, inputs, holder, after).snapshot, first.snapshot, "another snapshot serial");
    });
});

describe("the declared intermediate", () => {
    it("is shared by both orientations: the undirected input is derived from it, not from the graph", () => {
        const graph = path();
        const { inputs } = recording();
        const holder = {};
        const scope = graph.scope(["n0", "n1", "n2", "n3"]);
        scopedInputCounters.derivations = 0;
        read(graph, inputs, holder, scope, "declared");
        read(graph, inputs, holder, scope, "undirected");

        // induce, simplify (declared); undirect, simplify (undirected): one induce, not two.
        assert.strictEqual(scopedInputCounters.derivations, 4);
        assert.strictEqual(inputs.list().filter((entry) => entry.key.endsWith(":declared:none")).length, 1);
        assert.isTrue(inputs.list().every((entry) => entry.held), "the run holds the intermediate with both finals");
    });
});

describe("reference counts", () => {
    it("hold an input until the run lets go; a freeze only marks it", () => {
        const graph = path();
        const { inputs, released } = recording();
        const holder = {};
        const input = read(graph, inputs, holder, graph.scope(["n0", "n1", "n2"]));

        inputs.freeze();
        assert.notInclude(released, input.snapshot, "held: marked, not released");
        assert.isTrue(inputs.list().every((entry) => entry.marked));

        inputs.releaseHolder(holder);
        assert.include(released, input.snapshot, "released with its last holder");
        assert.lengthOf(inputs.list(), 0);
    });

    it("dispose only marks a held input, and caches nothing afterwards", () => {
        const graph = path();
        const { inputs, released } = recording();
        const holder = {};
        const input = read(graph, inputs, holder, graph.scope(["n0", "n1", "n2"]));

        inputs.dispose();
        assert.notInclude(released, input.snapshot);
        inputs.releaseHolder(holder);
        assert.include(released, input.snapshot);

        const later = {};
        const again = read(graph, inputs, later, graph.scope(["n0", "n1", "n2"]));
        inputs.releaseHolder(later);
        assert.include(released, again.snapshot, "after dispose an input lives only as long as its run");
    });

    it("byte pressure never evicts a held input, and evicts it once it is let go", () => {
        const graph = path();
        const { inputs, released } = recording(1);
        const first = {};
        const second = {};
        const a = read(graph, inputs, first, graph.scope(["n0", "n1", "n2"]));
        const b = read(graph, inputs, second, graph.scope(["n4", "n5", "n6"]));

        assert.notInclude(released, a.snapshot);
        assert.notInclude(released, b.snapshot);
        inputs.releaseHolder(first);
        assert.include(released, a.snapshot, "over the bound and unheld: evicted and released");
        assert.notInclude(released, b.snapshot);
    });

    it("releases a shared input only on its last holder", () => {
        const graph = path();
        const { inputs, released } = recording();
        const one = {};
        const two = {};
        const scope = graph.scope(["n0", "n1", "n2"]);
        const input = read(graph, inputs, one, scope);
        read(graph, inputs, two, scope);

        inputs.freeze();
        inputs.releaseHolder(one);
        assert.notInclude(released, input.snapshot);
        inputs.releaseHolder(two);
        assert.include(released, input.snapshot);
        assert.strictEqual(released.filter((snapshot) => snapshot === input.snapshot).length, 1, "released once");
    });
});

describe("admission", () => {
    it("waits for another run to let go, then admits", async () => {
        const graph = path();
        // The bound: what the other run holds, plus ten bytes; the asking run wants twenty.
        const probe = recording();
        read(graph, probe.inputs, {}, graph.scope(["n0", "n1", "n2"]));
        const { inputs } = recording(probe.inputs.bytes + 10);
        const other = {};
        read(graph, inputs, other, graph.scope(["n0", "n1", "n2"]));

        let admitted = false;
        const waiting = inputs.reserve({}, 20, graph.snapshot()).then(() => {
            admitted = true;
        });
        await Promise.resolve();
        assert.isFalse(admitted, "another run holds the room");

        inputs.releaseHolder(other);
        await waiting;
        assert.isTrue(admitted);
    });

    it("refuses E_TOO_LARGE when no other run holds anything and it still does not fit", async () => {
        const graph = path();
        const { inputs } = recording(8);
        let error: unknown;
        try {
            await inputs.reserve({}, 64, graph.snapshot());
        } catch (caught) {
            error = caught;
        }

        assert.isTrue(isGraphtyError(error) && error.code === "E_TOO_LARGE");
    });

    it("never waits on itself: a run holding an input is admitted over the bound", async () => {
        const graph = path();
        const { inputs } = recording(1);
        const holder = {};
        read(graph, inputs, holder, graph.scope(["n0", "n1", "n2"]));

        await inputs.reserve(holder, 1024, graph.snapshot());
        const more = read(graph, inputs, holder, graph.scope(["n3", "n4", "n5"]));
        assert.isDefined(more);
        assert.isAbove(inputs.bytes, 1);
    });

    it("an aborted wait rejects", async () => {
        const graph = path();
        const { inputs } = recording(1);
        read(graph, inputs, {}, graph.scope(["n0", "n1", "n2"]));
        const controller = new AbortController();
        const waiting = inputs.reserve({}, 64, graph.snapshot(), controller.signal);
        controller.abort(new DOMException("stop", "AbortError"));

        let name = "";
        try {
            await waiting;
        } catch (caught) {
            ({ name } = caught as Error);
        }

        assert.strictEqual(name, "AbortError");
    });
});

describe("byte accounting", () => {
    it("bounds at max(256 MB, 1.5 x the full snapshot's bytes)", () => {
        const graph = path();
        const { inputs } = recording();
        read(graph, inputs, {}, graph.scope(["n0", "n1", "n2"]));
        const full = graph.snapshot().byteLength({ columns: true, ids: true });

        assert.strictEqual(inputs.bound, Math.max(256 * 1024 * 1024, Math.ceil(1.5 * full)));
    });

    it("reports exactly the bytes of the typed arrays its entries reach, derived snapshots' columns included", () => {
        const graph = path();
        const { inputs } = recording();
        const holder = {};
        read(graph, inputs, holder, graph.scope(["n0", "n1", "n2", "n3"]));
        const undirected = read(graph, inputs, holder, graph.scope(["n0", "n1", "n2", "n3"]), "undirected");
        read(graph, inputs, {}, graph.scope(["n5", "n6"], () => false));
        // A view an algorithm builds after admission is counted too.
        undirected.snapshot.reverse();

        const entries = inputs.list();
        const expected = walk(entries.flatMap((entry) => [entry.snapshot, entry.edgeRemap, entry.nodeOrigin, entry.nodes, entry.edges]));
        assert.isAbove(entries.length, 2);
        assert.strictEqual(inputs.bytes, expected);
        assert.isAtLeast(inputs.bytes, entries[0].snapshot.byteLength({ columns: true }), "the columns are in it");
    });

    it("counts a release per snapshot, never one per key", () => {
        const before = derivedInputCounters.released;
        const graph = path();
        const { inputs, released } = recording();
        const holder = {};
        read(graph, inputs, holder, graph.scope(["n0", "n1"]));
        inputs.releaseHolder(holder);
        inputs.dispose();

        assert.strictEqual(new Set(released).size, released.length);
        assert.strictEqual(derivedInputCounters.released - before, released.length);
    });
});
