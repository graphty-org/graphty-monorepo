/**
 * @file Loading a graph costs time in proportion to its size.
 *
 * A load used to grow faster than its edge count: `setData` queued one `data-add` per node and
 * per edge, and the element queued a whole-graph repaint behind every one of them. A 4000-edge
 * load ran 4080 whole-graph repaints, which is quadratic in the edge count. A consumer calling
 * `addEdge` in a loop paid the same.
 *
 * The second cause was per arrowhead: each one's material walked every mesh in the scene when it
 * was created (`FilledArrowRenderer`), so the default arrowheads made a batched load quadratic
 * too.
 *
 * Both are checked with counts, so they hold on any machine however busy it is. A load paints the
 * whole graph a couple of times, not once per element. And the work a load does whose cost is the
 * size of the scene rather than the size of one element grows with the edge count, not with its
 * square: the meshes Babylon's material dirty walks visit, the `scene.meshes` entries a mesh
 * removal searches, the child-list entries re-parenting searches, the entries a scene lookup by
 * name or id walks, and the observers an observer removal searches. One of those per element over
 * a scene that grows with the elements is a quadratic load.
 *
 * A stopwatch ratio between two load sizes used to stand in for the second check. It caught any
 * per-element cost that grows with the scene, counted or not; the count catches only the kinds
 * above. Work that is not a Babylon scene-list search (the element's own code looping over every
 * element once per element) is not counted here, and is pinned by the tests of that code. The
 * stopwatch measured whatever else the machine was doing between the two loads.
 */

import { Material, Node as BabylonNode, Observable, Scene, StandardMaterial } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graph } from "../../src/Graph";
import type { ElementSession } from "../../src/session";
import { assertScalesLinearly } from "../helpers/cost";
import { asData, cleanupTestGraph, createTestGraph } from "../helpers/testSetup";

/** At most this many whole-graph repaints for one load, however many elements it holds. */
const MAX_REPAINTS_PER_LOAD = 2;

/** Linear is 4 for a 4x load; quadratic is 16. */
const MAX_LOAD_RATIO = 6;

/**
 * A graph with one node per `perNode` edges, placed on a grid so a fixed layout has positions.
 * @param edgeCount - How many edges.
 * @param perNode - Edges per node.
 * @returns The records.
 */
function graphOf(
    edgeCount: number,
    perNode = 5,
): { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] } {
    const nodeCount = Math.max(10, Math.ceil(edgeCount / perNode));
    const side = Math.ceil(Math.sqrt(nodeCount));
    const nodes = Array.from({ length: nodeCount }, (_unused, i) => ({
        id: `n${String(i)}`,
        position: { x: (i % side) * 10, y: Math.floor(i / side) * 10, z: 0 },
    }));
    const edges = Array.from({ length: edgeCount }, (_unused, i) => ({
        id: `e${String(i)}`,
        source: `n${String(i % nodeCount)}`,
        target: `n${String((i * 7 + 1) % nodeCount)}`,
    }));

    return { nodes, edges };
}

/**
 * Count the whole-graph repaints a graph runs from now on.
 * @param graph - The graph to watch.
 * @returns A function answering the count so far.
 */
function countRepaints(graph: Graph): () => number {
    const { paint } = graph.getSession() as ElementSession;
    const original = paint.repaintAll.bind(paint);
    let count = 0;

    (paint as { repaintAll: typeof paint.repaintAll }).repaintAll = async (stack, context) => {
        count++;

        return original(stack, context);
    };

    return () => count;
}

describe("a load", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
        await graph.setLayout("fixed");
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    it("repaints the whole graph a couple of times through setData, not once per element", async () => {
        const repaints = countRepaints(graph);

        graph.setData(graphOf(300));
        await graph.waitForStableFrame();

        assert.strictEqual(graph.getDataManager().edges.size, 300, "every edge loaded");
        assert.isAtMost(
            repaints(),
            MAX_REPAINTS_PER_LOAD,
            `setData of 60 nodes and 300 edges ran ${String(repaints())} whole-graph repaints`,
        );
    });

    it("repaints the whole graph a couple of times when edges are added one at a time", async () => {
        const data = graphOf(200);
        await graph.addNodes(data.nodes);
        await graph.waitForStableFrame();
        const repaints = countRepaints(graph);

        for (const edge of data.edges) {
            void graph.addEdge(asData(edge));
        }

        await graph.waitForStableFrame();

        assert.strictEqual(graph.getDataManager().edges.size, 200, "every edge loaded");
        assert.isAtMost(
            repaints(),
            MAX_REPAINTS_PER_LOAD,
            `200 addEdge calls ran ${String(repaints())} whole-graph repaints`,
        );
    });
});

/** The kinds of work whose cost is the size of the scene, not the size of one element. */
type WorkKind = "dirty walks" | "scene mesh removals" | "re-parenting" | "scene lookups" | "observer removals";

/** What a scene-work counter answers. */
interface SceneWork {
    /** Elements visited so far, per kind. */
    byKind: () => Record<WorkKind, number>;
    /** Put every hooked method back. */
    stop: () => void;
}

/**
 * How far a linear search of a list goes to find an item.
 * @param list - The list searched.
 * @param item - What it looks for.
 * @returns The position after the item, or the whole list when it is not there.
 */
function scanned(list: readonly unknown[], item: unknown): number {
    const at = list.indexOf(item);
    return at === -1 ? list.length : at + 1;
}

/**
 * Count, from now on, every visit Babylon makes to an element of a scene-wide list on behalf of one
 * element. Each of these costs the size of the scene, so doing one per element while a load grows
 * the scene makes that load quadratic in its size:
 * - a material dirty walk, which visits every mesh in the scene unless the material's (or the
 *   scene's) dirty mechanism is blocked (issue #388);
 * - `scene.removeMesh`, which finds the mesh in `scene.meshes` with `indexOf` (issue #543);
 * - re-parenting, which finds the node in its old parent's child list with `indexOf`;
 * - a scene lookup by name or id, which walks `scene.meshes`, `scene.transformNodes` or
 *   `scene.materials`;
 * - removing an observer, which finds it in the observable's list with `indexOf`.
 * The hooks sit on the prototypes, so they see every scene, mesh, material and observable built
 * from the same `@babylonjs/core` the test imports. The test checks the element's scene is one of
 * them.
 * @returns The counter.
 */
function countSceneWork(): SceneWork {
    const counts: Record<WorkKind, number> = {
        "dirty walks": 0,
        "scene mesh removals": 0,
        "re-parenting": 0,
        "scene lookups": 0,
        "observer removals": 0,
    };
    const restores: (() => void)[] = [];

    /**
     * Replace one method on a prototype with a version that counts first.
     * @param proto - The prototype.
     * @param name - The method.
     * @param count - Adds the cost of one call to `counts`, given `this`, the arguments and the result.
     */
    function hook(proto: object, name: string, count: (self: never, args: unknown[], result: unknown) => void): void {
        const target = proto as Record<string, (...args: unknown[]) => unknown>;
        const original = target[name];
        assert.isFunction(original, `Babylon still has ${name}`);
        target[name] = function counted(this: never, ...args: unknown[]): unknown {
            const result = original.apply(this, args);
            count(this, args, result);
            return result;
        };
        restores.push(() => {
            target[name] = original;
        });
    }

    // The walk is counted before it runs, so it is counted only when it really walks.
    const walker = Material.prototype as unknown as Record<string, (this: Material, func: unknown) => void>;
    const originalWalk = walker._markAllSubMeshesAsDirty;
    assert.isFunction(originalWalk, "Babylon still has Material._markAllSubMeshesAsDirty");
    walker._markAllSubMeshesAsDirty = function walk(this: Material, func: unknown): void {
        const scene = this.getScene();
        if (!scene.blockMaterialDirtyMechanism && !this.blockDirtyMechanism) {
            counts["dirty walks"] += scene.meshes.length;
        }

        originalWalk.call(this, func);
    };
    restores.push(() => {
        walker._markAllSubMeshesAsDirty = originalWalk;
    });

    // removeMesh answers the index it found the mesh at, or -1 after searching the whole list.
    hook(Scene.prototype, "removeMesh", (self: Scene, _args, index) => {
        counts["scene mesh removals"] += (index as number) === -1 ? self.meshes.length + 1 : (index as number) + 1;
    });

    for (const [name, list] of [
        ["getMeshByName", (scene: Scene) => scene.meshes],
        ["getMeshById", (scene: Scene) => scene.meshes],
        ["getTransformNodeByName", (scene: Scene) => scene.transformNodes],
        ["getTransformNodeById", (scene: Scene) => scene.transformNodes],
        ["getMaterialByName", (scene: Scene) => scene.materials],
        ["getMaterialById", (scene: Scene) => scene.materials],
    ] as const) {
        hook(Scene.prototype, name, (self: Scene, _args, found) => {
            counts["scene lookups"] += scanned(list(self), found);
        });
    }

    // Counted before it runs: the old parent's list is the one searched.
    const parent = Object.getOwnPropertyDescriptor(BabylonNode.prototype, "parent");
    const originalSet = parent?.set;
    if (!parent || !originalSet) {
        assert.fail("Babylon still has a Node.parent setter");
    }

    Object.defineProperty(BabylonNode.prototype, "parent", {
        ...parent,
        set(this: BabylonNode, next: BabylonNode | null) {
            const previous = this.parent;
            if (previous && previous !== next) {
                counts["re-parenting"] += scanned(previous.getChildren(), this);
            }

            originalSet.call(this, next);
        },
    });
    restores.push(() => {
        Object.defineProperty(BabylonNode.prototype, "parent", parent);
    });

    // Counted before it runs: a deferred removal leaves the observer listed until a later turn.
    const observable = Observable.prototype as unknown as Record<
        string,
        (this: Observable<unknown>, o: unknown) => boolean
    >;
    const originalRemove = observable.remove;
    assert.isFunction(originalRemove, "Babylon still has Observable.remove");
    observable.remove = function remove(this: Observable<unknown>, observer: unknown): boolean {
        if (observer) {
            counts["observer removals"] += scanned(this.observers, observer);
        }

        return originalRemove.call(this, observer);
    };
    restores.push(() => {
        observable.remove = originalRemove;
    });

    return {
        byKind: () => ({ ...counts }),
        stop: () => {
            for (const restore of restores.reverse()) {
                restore();
            }
        },
    };
}

/**
 * Show a per-kind count for a failure message.
 * @param counts - The counts.
 * @returns One line.
 */
function describeWork(counts: Record<WorkKind, number>): string {
    return Object.entries(counts)
        .map(([kind, count]) => `${kind} ${String(count)}`)
        .join(", ");
}

describe("the scene-wide work of a load", () => {
    /**
     * Count the scene-wide visits of one load of a fresh graph, from setData to the first finished
     * frame, and check the counter can see the element's scene at all.
     * @param edgeCount - How many edges to load.
     * @returns The visits per kind.
     */
    async function workOfLoad(edgeCount: number): Promise<Record<WorkKind, number>> {
        const graph = await createTestGraph();
        const work = countSceneWork();

        try {
            await graph.setLayout("fixed");
            graph.setData(graphOf(edgeCount));
            await graph.waitForStableFrame({ timeoutMs: 120000 });
            const counted = work.byKind();

            // The hooks are on the classes the element built its scene from, not on a second copy
            // of Babylon that would leave every count at 0.
            const scene = graph.getScene();
            assert.instanceOf(scene, Scene, "the element's scene comes from the Babylon the test hooked");
            const nodeMaterial = graph.getDataManager().nodes.values().next().value?.mesh.material;
            assert.instanceOf(nodeMaterial, Material, "the element's materials come from the Babylon the test hooked");

            // Positive control: a material whose dirty mechanism is not blocked walks every mesh in
            // the scene once, and the counter sees exactly that.
            const control = new StandardMaterial("dirty-walk-control", scene);
            try {
                const before = work.byKind()["dirty walks"];
                control.markAsDirty(Material.MiscDirtyFlag);
                assert.strictEqual(
                    work.byKind()["dirty walks"] - before,
                    scene.meshes.length,
                    "an unblocked material's dirty walk is counted, one visit per mesh in the scene",
                );
            } finally {
                control.dispose();
            }

            return counted;
        } finally {
            work.stop();
            cleanupTestGraph(graph);
        }
    }

    it("grows roughly linearly with the edge count between 500 and 2000 edges, default arrowheads on", async () => {
        const total = (counts: Record<WorkKind, number>): number =>
            Object.values(counts).reduce((sum, count) => sum + count, 0);
        const seen: string[] = [];
        await assertScalesLinearly(
            async (edgeCount) => {
                const work = await workOfLoad(edgeCount);
                seen.push(`${String(edgeCount)} edges: ${describeWork(work)}`);
                return total(work);
            },
            {
                sizes: [500, 2000],
                maxRatio: MAX_LOAD_RATIO,
                counter: () => `scene-list entries a load visited (${seen.join("; ")})`,
            },
        );
    });
});
