/**
 * @file What keeping nodes and labels off each other costs, at 1,000 and 10,000 nodes.
 *
 * Two numbers per size, each against the same work without the setting:
 *
 * - One `ngraph` step with `nodeGap` set (the step plus one sweep that pushes overlapping nodes
 *   apart) against one step without it.
 * - One full label pass with `labels.avoidNodesAndEdges` on (every node and edge projected,
 *   nine places tried per label) against the plain declutter pass.
 *
 * It asserts nothing about speed, only that each setting did its work. Numbers go to the console,
 * one line per row. Run with: npx vitest run --project=browser-bench test/browser/overlap-avoidance.bench.test.ts
 */

import { assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { LabelDeclutter } from "../../src/managers/LabelDeclutter";

const WIDTH = 1280;
const HEIGHT = 720;
const STEPS = 20;
const PASSES = 10;
const TIMEOUT_MS = 900_000;

function report(line: string): void {
    console.log(`[overlap-avoidance-bench] ${line}`);
}

async function build(count: number): Promise<{ graph: Graph; container: HTMLElement }> {
    const container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();

    // A grid tight enough that nodes, labels and ties crowd each other, and a tree of ties.
    const side = Math.ceil(Math.sqrt(count));
    const nodes = Array.from({ length: count }, (_, i) => ({
        id: `n${String(i)}`,
        position: { x: (i % side) * 4, y: Math.floor(i / side) * 4, z: 0 },
    }));
    const edges = Array.from({ length: count - 1 }, (_, i) => ({
        src: `n${String(i + 1)}`,
        dst: `n${String(Math.floor((i + 1) / 2))}`,
    }));
    await graph.addNodes(nodes);
    await graph.addEdges(edges);
    await graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(graph).waitForCompletion();
    await graph.getSession().styles.add({
        name: "labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "LABEL", "node.size": 2 },
    });
    await operationQueueOf(graph).waitForCompletion();
    // Drawn until every label exists; a stable-frame wait at this size outlasts its own limit on a
    // software GPU, waiting for shaders the measurements below do not need.
    const all = [...graph.getDataManager().nodes.values()];
    for (let frame = 0; frame < 600 && !all.every((node) => node.label?.labelMesh); frame++) {
        graph.scene.render();
        await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    assert.isTrue(
        all.every((node) => node.label?.labelMesh),
        "every label was built",
    );
    return { graph, container };
}

function passOf(graph: Graph): LabelDeclutter {
    const found: unknown = graph.scene.metadata?.labelDeclutter;
    if (!(found instanceof LabelDeclutter)) {
        assert.fail("a labelled scene has a label pass");
    }

    return found;
}

function timePasses(graph: Graph): number {
    const pass = passOf(graph);
    const camera = graph.scene.activeCamera;
    assert.isOk(camera);
    pass.place(camera);
    const start = performance.now();
    for (let at = 0; at < PASSES; at++) {
        pass.place(camera);
    }

    return (performance.now() - start) / PASSES;
}

/**
 * One ngraph step's cost from a cold start (the first steps, every node bunched near the origin)
 * and once the layout has spread (after 300 steps), and how many steps it took to come to rest.
 * @param graph - The graph.
 * @param nodeGap - The setting, or null for none.
 * @returns Milliseconds per step, cold and spread, and the steps to rest (1000 at most).
 */
async function timeSteps(
    graph: Graph,
    nodeGap: number | null,
): Promise<{ cold: number; spread: number; steps: number }> {
    await graph.setLayout("ngraph", { seed: 3, dim: 2, nodeGap });
    await operationQueueOf(graph).waitForCompletion();
    const engine = graph.getLayoutManager().layoutEngine;
    assert.isOk(engine);
    let start = performance.now();
    for (let at = 0; at < STEPS; at++) {
        engine.step();
    }

    const cold = (performance.now() - start) / STEPS;
    let steps = STEPS;
    for (; steps < 300; steps++) {
        engine.step();
    }

    start = performance.now();
    for (let at = 0; at < STEPS; at++) {
        engine.step();
    }

    const spread = (performance.now() - start) / STEPS;
    steps += STEPS;
    while (!engine.isSettled && steps < 1000) {
        engine.step();
        steps++;
    }

    return { cold, spread, steps };
}

describe("overlap avoidance cost", () => {
    for (const count of [1000, 10_000]) {
        it(
            `${String(count)} nodes`,
            async () => {
                const { graph, container } = await build(count);
                try {
                    graph.setLayoutBehavior({ labels: { declutter: true, avoidNodesAndEdges: false } });
                    const plain = timePasses(graph);
                    const plainHidden = passOf(graph).counts.hiddenByOverlap;
                    graph.setLayoutBehavior({ labels: { declutter: true, avoidNodesAndEdges: true } });
                    const avoiding = timePasses(graph);
                    const avoidHidden = passOf(graph).counts.hiddenByOverlap;
                    report(
                        `nodes=${String(count)} label_pass_ms declutter=${plain.toFixed(2)} ` +
                            `declutter+avoid=${avoiding.toFixed(2)} hidden ${String(plainHidden)} -> ${String(avoidHidden)}`,
                    );
                    assert.isAbove(passOf(graph).passes, 2 * PASSES);

                    for (const gap of [null, 1]) {
                        const t = await timeSteps(graph, gap);
                        report(
                            `nodes=${String(count)} ngraph nodeGap=${String(gap)} step_ms cold=${t.cold.toFixed(2)} ` +
                                `spread=${t.spread.toFixed(2)} steps_to_rest=${String(t.steps)}`,
                        );
                    }
                } finally {
                    graph.dispose();
                    container.remove();
                }
            },
            TIMEOUT_MS,
        );
    }
});
