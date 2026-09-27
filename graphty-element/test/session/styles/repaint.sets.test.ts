/**
 * @file A style layer that names a set repaints only what moved (design/sets/sets-design.md
 * sections 6.2 and 11). On the same snapshot a redefinition repaints exactly the old members XOR
 * the new ones; across a freeze the layer keeps its paint until its new resolution is ready on the
 * scheduler's frame, then repaints only the rows whose membership moved; a rename repaints nothing; a rule over a run's values
 * repaints when the run re-runs. The layer's resolution is pinned in the cache, the set lists the
 * layer among its users, and an item the layer holds is captured when its run re-runs.
 *
 * Every count here is a count of elements a pass painted, never a time.
 */

import { assert, describe, it } from "vitest";

import type { LayerSpec, NodeId, Scope, SetId } from "../../../src/catalog/types";
import { scopeResolverOfSession, setsNotifierOfSession } from "../../../src/session/GraphSession";
import { resultExecutionOf } from "../../../src/session/results/ResultsApi";
import type { SessionRunsApi } from "../../../src/session/runs";
import { itemKeyOf } from "../../../src/session/sets/captures";
import type { Resolution } from "../../../src/session/sets/resolve";
import type { ElementSession } from "../../../src/session/types";
import { type Harness, makeSession } from "../helpers";
import { finishAtOnce } from "../runs/harness";
import { type Published, publishing } from "../visibility/results";

const RED = "#ff0000";

/**
 * A layer painting a scope red.
 * @param scope - The scope.
 * @returns The layer.
 */
function redLayer(scope: Scope): LayerSpec {
    return { name: "Painted", selector: { match: "scope", scope }, set: { "node.color": RED } };
}

/**
 * Nodes n0..n(count-1), no edges, frozen.
 * @param count - How many.
 * @returns The harness.
 */
function nodes(count: number): Harness {
    const h = makeSession({ directed: false, runs: { execute: finishAtOnce } });
    h.add(Array.from({ length: count }, (_, index) => ({ id: `n${String(index)}` })));
    h.session.data.snapshot();

    return h;
}

/**
 * Five nodes a..e on a path, frozen.
 * @param execute - The run executor.
 * @returns The harness.
 */
function path(execute: NonNullable<Parameters<typeof makeSession>[0]>["runs"] = { execute: finishAtOnce }): Harness {
    const h = makeSession({ directed: false, runs: execute });
    h.add(
        ["a", "b", "c", "d", "e"].map((id) => ({ id })),
        ["ab", "bc", "cd", "de"].map(([src, dst]) => ({ src, dst })),
    );
    h.session.data.snapshot();

    return h;
}

/**
 * Paint the whole graph from the stack, as the element does after a load.
 * @param h - The harness.
 */
async function paintAll(h: Harness): Promise<void> {
    await painter(h).repaintAll((h.session as ElementSession).styles.compiled(), { signal: new AbortController().signal, report: () => undefined });
}

/**
 * Record every pass: how many nodes and edges each painted.
 * @param h - The harness.
 * @returns The log, and a promise for the next pass.
 */
function passes(h: Harness): { readonly log: { nodes: number; edges: number }[]; next(): Promise<void> } {
    const log: { nodes: number; edges: number }[] = [];
    let wake: (() => void) | null = null;
    painter(h).onPainted(() => {
        log.push({ nodes: painter(h).lastPainted("node").length, edges: painter(h).lastPainted("edge").length });
        wake?.();
        wake = null;
    });

    return {
        log,
        next: () =>
            new Promise<void>((resolve) => {
                wake = resolve;
            }),
    };
}

/**
 * The ids painted red, sorted.
 * @param h - The harness.
 * @returns The ids.
 */
function red(h: Harness): NodeId[] {
    const snapshot = h.session.data.snapshot();
    const found: NodeId[] = [];
    for (let index = 0; index < snapshot.nodeCount; index++) {
        if (painter(h).styleOf("node", index)["node.color"]?.hex === RED) {
            found.push(snapshot.ids.idOf(index));
        }
    }

    return found.sort();
}

/**
 * Let every pending timer and microtask run.
 */
async function drain(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * What the session's last passes painted.
 * @param h - The harness.
 * @returns The paint.
 */
function painter(h: Harness): ElementSession["paint"] {
    return (h.session as ElementSession).paint;
}

describe("a layer naming a set repaints only what moved", () => {
    it("a redefinition on the same snapshot repaints exactly the XOR: three elements at either size", async () => {
        for (const count of [1_000, 50_000]) {
            const h = nodes(count);
            const members = Array.from({ length: 100 }, (_, index) => `n${String(index)}`);
            const id = h.session.sets.create({ kind: "fixed", nodes: members, reading: "induced" });
            await h.session.styles.add(redLayer({ set: id }));
            await paintAll(h);
            const seen = passes(h);

            // Two added, one taken away.
            const pass = seen.next();
            h.session.sets.redefine(id, { kind: "fixed", nodes: [...members.slice(1), "n500", "n900"], reading: "induced" });
            await pass;

            assert.deepStrictEqual(seen.log, [{ nodes: 3, edges: 0 }], `at ${String(count)} nodes`);
            const painted = red(h);
            assert.strictEqual(painted.length, 101);
            assert.isFalse(painted.includes("n0"));
            assert.isTrue(painted.includes("n500") && painted.includes("n900"));
        }
    });

    it("across a freeze the layer keeps its paint until its resolution is ready, then repaints nothing when no member moved", async () => {
        const h = path();
        let frame: (() => void) | null = null;
        setsNotifierOfSession(h.session).useFrames((callback) => {
            frame = callback;
            return () => {
                frame = null;
            };
        });
        const id = h.session.sets.create({ kind: "fixed", nodes: ["b", "d"], reading: "induced" });
        await h.session.styles.add(redLayer({ set: id }));
        await paintAll(h);
        assert.deepStrictEqual(red(h), ["b", "d"]);

        // Removing a renumbers every row after it.
        h.store.builder.removeNode("a");
        h.store.touch();
        h.session.data.snapshot();
        assert.strictEqual(setsNotifierOfSession(h.session).pending, 1, "queued for a frame, not resolved");

        // The element repaints the whole graph after a removal; before the frame the layer still
        // paints its members, carried to their new rows.
        await paintAll(h);
        assert.deepStrictEqual(red(h), ["b", "d"]);

        const seen = passes(h);
        assert.isNotNull(frame);
        (frame as unknown as () => void)();
        for (let i = 0; i < 5; i++) {
            await drain();
        }

        assert.deepStrictEqual(seen.log, [], "the members did not move, so nothing is repainted");
        assert.deepStrictEqual(red(h), ["b", "d"]);
    });

    it("across a freeze, a rule set whose members moved repaints exactly those rows", async () => {
        const h = path();
        let frame: (() => void) | null = null;
        setsNotifierOfSession(h.session).useFrames((callback) => {
            frame = callback;
            return () => {
                frame = null;
            };
        });
        // Degree two or more: b, c and d on the path a-b-c-d-e.
        const id = h.session.sets.create({ kind: "rule", where: { kind: "degree", min: 2 }, reading: "induced" });
        await h.session.styles.add(redLayer({ set: id }));
        await paintAll(h);
        assert.deepStrictEqual(red(h), ["b", "c", "d"]);

        // Removing a leaves b with one edge: b leaves the set, and every row after a renumbers.
        h.store.builder.removeNode("a");
        h.store.touch();
        h.session.data.snapshot();
        await paintAll(h);

        const seen = passes(h);
        const pass = seen.next();
        assert.isNotNull(frame);
        (frame as unknown as () => void)();
        await pass;

        assert.deepStrictEqual(seen.log, [{ nodes: 1, edges: 1 }], "b and its edge to c, not the whole graph");
        assert.deepStrictEqual(red(h), ["c", "d"]);
    });

    it("across a freeze, ten live sets whose members did not move repaint nothing", async () => {
        const h = path();
        let frame: (() => void) | null = null;
        setsNotifierOfSession(h.session).useFrames((callback) => {
            frame = callback;
            return () => {
                frame = null;
            };
        });
        for (let i = 0; i < 10; i++) {
            const id = h.session.sets.create({ kind: "fixed", nodes: [i % 2 === 0 ? "b" : "d"], reading: "induced" }, { name: `S${String(i)}` });
            await h.session.styles.add({ ...redLayer({ set: id }), name: `L${String(i)}` });
        }

        await paintAll(h);
        h.store.builder.removeNode("a");
        h.store.touch();
        h.session.data.snapshot();
        // The element repaints the whole graph after a removal, as it renumbers every later row.
        await paintAll(h);

        const seen = passes(h);
        // Every set's resolution arrives on the frame.
        for (let guard = 0; frame !== null && guard < 100; guard++) {
            (frame as unknown as () => void)();
        }

        for (let i = 0; i < 20; i++) {
            await drain();
        }

        assert.deepStrictEqual(seen.log, [], "no whole-graph pass");
        assert.deepStrictEqual(red(h), ["b", "d"]);
    });

    it("a rename repaints nothing", async () => {
        const h = path();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" }, { name: "S" });
        await h.session.styles.add(redLayer({ set: id }));
        await paintAll(h);
        const seen = passes(h);

        h.session.sets.rename(id, "T");
        assert.isFalse(painter(h).painting());
        await drain();

        assert.deepStrictEqual(seen.log, []);
    });

    it("a layer over a rule on results.pr repaints after pr re-runs with no data change", async () => {
        const degrees: Published = { shape: "node-metric", nodes: new Map(Object.entries({ a: { value: 1 }, b: { value: 2 }, c: { value: 2 }, d: { value: 2 }, e: { value: 1 } })) };
        const h = path({ execute: publishing(new Map([["pr", degrees]])) });
        const run = h.session.runs.start("degree", undefined, { as: "pr", scope: "graph", style: false });
        await run;
        const id = h.session.sets.create({ kind: "rule", where: "results.pr.value > `1`", reading: "induced" });
        await h.session.styles.add(redLayer({ set: id }));
        await paintAll(h);
        assert.deepStrictEqual(red(h), ["b", "c", "d"]);
        const seen = passes(h);

        await run.rerun();
        // Wait for the two passes themselves, not a tick: a pass that outruns its time slice
        // hands the thread back and finishes on a later task.
        while (seen.log.length < 2) {
            await seen.next();
        }

        // Queued for the re-run the result is cleared (the members leave, with the two edges they
        // induce), and its end publishes the same values again (they return).
        assert.deepStrictEqual(seen.log, [
            { nodes: 3, edges: 2 },
            { nodes: 3, edges: 2 },
        ]);
        assert.deepStrictEqual(red(h), ["b", "c", "d"]);
    });

    it("pins a live layer's resolution against budget pressure, and releases it with the layer", async () => {
        const h = path();
        const id: SetId = h.session.sets.create({ kind: "fixed", nodes: ["b", "d"], reading: "induced" });
        const added = await h.session.styles.add(redLayer({ set: id }));
        await paintAll(h);
        const {cache} = scopeResolverOfSession(h.session).contextNow();
        assert.isDefined(cache);
        const definition = h.session.sets.get(id)?.definition;
        /**
         * Store 20 resolutions of 4 MB each, past the 64 MB bound.
         */
        const flood = (): void => {
            const big = new Uint32Array(1 << 20);
            for (let at = 0; at < 20; at++) {
                cache?.store(`flood-${String(at)}`, "s", { nodes: big, edges: big, nodeCount: 0, edgeCount: 0, serial: 0, store: null, missingNodes: 0, missingEdges: 0, ambiguousEdges: 0 } as Resolution);
            }
        };
        const held = (): boolean => (cache?.cached() ?? []).some(([key]) => key === definition);

        flood();
        assert.isTrue(held(), "pinned: survives");

        await h.session.styles.remove(added.id);
        flood();
        assert.isFalse(held(), "released with the layer: evicted");
    });

    it("usedBy lists the layer", async () => {
        const h = path();
        const id = h.session.sets.create({ kind: "fixed", nodes: ["b"], reading: "induced" });
        const added = await h.session.styles.add(redLayer({ set: id }));

        assert.deepStrictEqual(h.session.sets.usedBy(id), [{ kind: "layer", id: added.id, label: "Painted" }]);

        await h.session.styles.remove(added.id);
        assert.deepStrictEqual(h.session.sets.usedBy(id), []);
    });

    it("an item a layer holds is captured when its run re-runs, and the layer keeps painting it", async () => {
        const first: Published = { shape: "community", nodes: new Map(Object.entries({ a: { group: 0 }, b: { group: 0 }, c: { group: 1 }, d: { group: 1 }, e: { group: 1 } })) };
        const second: Published = { shape: "community", nodes: new Map(Object.entries({ a: { group: 1 }, b: { group: 0 }, c: { group: 0 }, d: { group: 0 }, e: { group: 0 } })) };
        const table = new Map<string, Published>([["louv", first]]);
        const h = path({ execute: publishing(table) });
        const run = h.session.runs.start("degree", undefined, { as: "louv", scope: "graph", style: false });
        await run;
        const execution = resultExecutionOf(h.session.results, "louv") as string;
        const key = { field: "group", value: 1 };
        await h.session.styles.add(redLayer({ define: { kind: "rule", where: { kind: "item", item: { run: "louv", key, execution } }, reading: "induced" } }));
        await paintAll(h);
        assert.deepStrictEqual(red(h), ["c", "d", "e"]);

        table.set("louv", second);
        await run.rerun();
        await drain();
        await paintAll(h);

        const held = (h.session.runs as SessionRunsApi).heldOf("louv");
        assert.deepStrictEqual(Object.fromEntries(held.get(execution) ?? []), { [itemKeyOf(key)]: { nodes: ["c", "d", "e"] } });
        assert.deepStrictEqual(red(h), ["c", "d", "e"], "the earlier members, not the new group 1 (a)");
    });
});
