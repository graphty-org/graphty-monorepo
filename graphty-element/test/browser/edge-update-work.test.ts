/**
 * @file What one `Edge.update` of a moved, plain, arrowed edge does, counted: a moving graph places every edge every
 * frame, so each step of it is paid once per edge per frame (issue #9420). It works out its arrow head's geometry once,
 * and makes no vector through `Vector3`'s allocating methods (it made about a dozen an edge before: the line's
 * direction, its trim, the head's tip and position, two clones). Counted, never timed.
 */
import "../../src/graphty-element";

import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, it, vi } from "vitest";

import type { Edge } from "../../src/Edge";
import { Graph, operationQueueOf } from "../../src/Graph";
import { EdgeMesh } from "../../src/meshes/EdgeMesh";

/** The `Vector3` methods that return a new vector. */
const ALLOCATING = ["clone", "add", "subtract", "scale", "normalizeToNew", "negate", "multiply"] as const;

const EDGES = 8;

let mounted: { graph: Graph; container: HTMLElement } | null = null;

afterEach(() => {
    vi.restoreAllMocks();
    mounted?.graph.dispose();
    mounted?.container.remove();
    mounted = null;
});

/**
 * Count the calls to some functions while `run` runs.
 * @param run - What to count.
 * @returns How many new vectors were made, and how many arrow geometries were worked out.
 */
function counted(run: () => void): { vectors: number; geometries: number } {
    let vectors = 0;
    const spies = ALLOCATING.map((name) => {
        const original = Vector3.prototype[name] as (...args: unknown[]) => Vector3;
        return vi.spyOn(Vector3.prototype, name).mockImplementation(function (this: Vector3, ...args: unknown[]) {
            vectors++;
            return original.apply(this, args);
        });
    });
    const geometry = vi.spyOn(EdgeMesh, "getArrowGeometry");
    run();
    const geometries = geometry.mock.calls.length;
    for (const spy of [...spies, geometry]) {
        spy.mockRestore();
    }

    return { vectors, geometries };
}

it("places a moved arrowed edge working out its head once and making a fixed handful of vectors", async () => {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    mounted = { graph, container };
    graph.setRenderPath("objects");
    await graph.init();
    graph.engine.stopRenderLoop();
    await graph.setLayout("random", { seed: 1 });
    const ids = Array.from({ length: EDGES + 1 }, (_, at) => `n${String(at)}`);
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges(ids.slice(1).map((id, at) => ({ source: ids[at], target: id })));
    await operationQueueOf(graph).waitForCompletion();
    graph.update();

    const edges: Edge[] = [...graph.getDataManager().edges.values()];
    assert.lengthOf(edges, EDGES);
    for (const node of graph.getDataManager().nodes.values()) {
        node.mesh.position.x += 5;
    }

    const before = edges.map((edge) => edge.arrowCap?.position.clone());
    const { vectors, geometries } = counted(() => {
        for (const edge of edges) {
            edge.update();
        }
    });

    edges.forEach((edge, at) => {
        assert.isFalse(edge.arrowCap?.position.equals(before[at] ?? edge.arrowCap.position) ?? true, "moved");
    });
    assert.strictEqual(geometries, EDGES, "one arrow geometry per edge placed");
    assert.strictEqual(vectors, 0, "no vector made through an allocating method");
    // the count sees an allocation when one is made
    assert.strictEqual(
        counted(() => {
            new Vector3().clone();
        }).vectors,
        1,
    );
});
