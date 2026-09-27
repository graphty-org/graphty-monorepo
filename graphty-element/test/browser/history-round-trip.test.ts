/**
 * @file The renderer twin of `test/session/history/round-trip.test.ts`: every fixture tagged
 * `renderer` runs, undoes and redoes on a real `Graph`, and besides the state and picture digests
 * the scene digest must match too.
 *
 * The scene digest has two parts. The first is structural: the node and edge render objects by
 * id, the skybox domes in the scene, `scene.metadata.twoD` and the dimension the graph draws in.
 * The second is what was painted, read back from the render side for every node and edge in id
 * order: instance colour and scale, source mesh, enabled and visible flags, and label bounds.
 * Without the second part a derivation hook that skipped a repaint after undo would leave stale
 * paint on the meshes while every state digest matched.
 *
 * Every digest is read with the layout at rest, and the state digest holds the positions lane, so
 * each fixture's round trip also restores where the nodes were.
 */

import { PhotoDome } from "@babylonjs/core";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { FIXTURES } from "../session/history/fixtures";
import { roundTrip } from "../session/history/round-trip-harness";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Settles once the graph's layout has come to rest and a frame has been drawn since, with the
 * render loop running: an edge's length is drawn from where its ends are at each frame.
 * @param graph - The graph.
 */
async function atRest(graph: Graph): Promise<void> {
    await graph.waitForSettled();
    for (let wait = 0; wait < 1000 && graph.getLayoutManager().running; wait++) {
        await new Promise((resolve) => setTimeout(resolve, 10));
    }

    assert.isFalse(graph.getLayoutManager().running, "the layout came to rest");
    for (let frame = 0; frame < 2; frame++) {
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }
}

/**
 * A real `Graph` holding a small graph, laid out in one pass.
 * @returns The graph.
 */
async function loadedGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.setLayout("circular");
    await graph.addNodes([{ id: "n1" }, { id: "n2" }, { id: "n3" }]);
    await graph.addEdges([
        { src: "n1", dst: "n2" },
        { src: "n2", dst: "n3" },
    ]);
    await graph.operationQueue.waitForCompletion();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * What one mesh shows, read back from the render side. A disabled mesh draws nothing, so its
 * scale is not part of the picture: an edge hidden by a filter keeps the length it was last drawn
 * at, which depends on how many frames ran while it showed, not on the state.
 * @param mesh - The mesh.
 * @returns Its paint.
 */
function paintOf(mesh: AbstractMesh): unknown {
    const color = (mesh.instancedBuffers as { color?: { asArray(): number[] } } | undefined)?.color;
    const enabled = mesh.isEnabled();
    return {
        source: (mesh as { sourceMesh?: { name: string } }).sourceMesh?.name ?? mesh.name,
        enabled,
        visible: mesh.isVisible,
        scale: enabled ? mesh.scaling.asArray() : null,
        color: color?.asArray() ?? null,
    };
}

/**
 * The scene digest of a graph.
 * @param graph - The graph.
 * @returns Its canonical text.
 */
function sceneDigest(graph: Graph): string {
    const data = graph.getDataManager();
    const nodes = [...data.nodes].sort(([a], [b]) => String(a).localeCompare(String(b)));
    const edges = [...data.edges].sort(([a], [b]) => a.localeCompare(b));
    const scene = graph.getScene();

    return JSON.stringify({
        structure: {
            nodes: nodes.map(([id]) => String(id)),
            edges: edges.map(([id]) => id),
            domes: scene.transformNodes.filter((node) => node instanceof PhotoDome).length,
            twoD: (scene.metadata as { twoD?: unknown } | null)?.twoD ?? null,
            is2D: graph.is2D(),
        },
        painted: {
            nodes: nodes.map(([id, node]) => [String(id), paintOf(node.mesh), node.label?.textBounds ?? null]),
            edges: edges.map(([id, edge]) => [id, paintOf(edge.mesh as AbstractMesh)]),
        },
    });
}

describe("round trip per command, on a renderer", () => {
    for (const fixture of FIXTURES.filter((each) => each.tags.includes("renderer"))) {
        it(
            fixture.name,
            async () => {
                const graph = await loadedGraph();
                await roundTrip(
                    graph.getSession(),
                    fixture,
                    () => sceneDigest(graph),
                    () => atRest(graph),
                );
            },
            TEST_TIMEOUT_MS,
        );
    }

    it(
        "digests a scene the same way twice when nothing changed",
        async () => {
            const graph = await loadedGraph();
            const first = sceneDigest(graph);

            assert.include(first, "n1");
            assert.strictEqual(sceneDigest(graph), first);
        },
        TEST_TIMEOUT_MS,
    );
});
