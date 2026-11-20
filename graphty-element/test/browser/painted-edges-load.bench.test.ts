/**
 * @file What it costs to load and settle a graph whose edges no row line can draw (colored arrows), on both render
 * paths: the gephi-worldcup style fidelity sample (736 labeled nodes, 9,228 edges in 228 colors) loaded as its
 * fidelity story loads it, and a generated graph of 3,000 labeled nodes and 12,000 colored arrows.
 *
 * Runs in the `browser-bench` project (npx vitest run --project=browser-bench
 * test/browser/painted-edges-load.bench.test.ts), never under coverage. Each case prints, as `[painted-edges-load]`:
 * the milliseconds until `waitForStableFrame()` resolved, the frames drawn, and the meshes the scene built and
 * disposed while it loaded.
 *
 * WHAT IS ASSERTED IS COUNTED WORK: the load settles, and the scene disposes fewer meshes than a tenth of the edges.
 * Under renderPath "batched" each such edge used to be built from the placeholder paint and repainted at once,
 * disposing the placeholder's line and cap batches: about three meshes built and disposed per edge, which kept the
 * worldcup story from settling within 30 seconds under load (issue #9181).
 */

import { afterEach, assert, describe, it } from "vitest";
import { commands, page } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import type { RenderPath } from "../../src/meshes/NodeBatch";
import { createSampleElement, importSample, sampleData } from "../fidelity/load-sample";

const SAMPLE = "../graph-io/test/corpus/styles/json/fidelity/gephi-worldcup.json.gz";
const GENERATED = { nodes: 3000, edges: 12_000 };

afterEach(() => {
    document.body.replaceChildren();
});

/** What one load cost. */
interface Cost {
    ms: number;
    frames: number;
    built: number;
    disposed: number;
}

/**
 * Count the meshes a scene builds and disposes, and the frames it draws, while some work runs.
 * @param element - The element, on the page.
 * @param work - The work: the load, ending once the picture is final.
 * @returns What it cost.
 */
async function measured(element: Graphty, work: () => Promise<unknown>): Promise<Cost> {
    await element.updateComplete;
    const { scene } = element.graph;
    const counts = { built: 0, disposed: 0 };
    const built = scene.onNewMeshAddedObservable.add(() => counts.built++);
    const disposed = scene.onMeshRemovedObservable.add(() => counts.disposed++);
    const firstFrame = scene.getRenderId();
    const start = performance.now();
    try {
        await work();
        return { ms: performance.now() - start, frames: scene.getRenderId() - firstFrame, ...counts };
    } finally {
        scene.onNewMeshAddedObservable.remove(built);
        scene.onMeshRemovedObservable.remove(disposed);
    }
}

/**
 * Print one case's cost and check its counted work.
 * @param name - The case.
 * @param path - The render path.
 * @param edges - How many edges the graph holds.
 * @param cost - What it cost.
 */
function report(name: string, path: RenderPath, edges: number, cost: Cost): void {
    console.log(
        `[painted-edges-load] ${name} ${path}: ${cost.ms.toFixed(0)} ms, ${String(cost.frames)} frames, ` +
            `${String(cost.built)} meshes built, ${String(cost.disposed)} disposed`,
    );
    assert.isBelow(cost.disposed, edges / 10, "meshes disposed while the edges were built");
}

describe("loading colored arrows", () => {
    for (const path of ["objects", "batched"] as const) {
        it(`the gephi-worldcup sample, ${path}`, async () => {
            const base64 = await commands.readFile(SAMPLE, { encoding: "base64" });
            const { data } = await sampleData(
                Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
                true,
            );
            const url = URL.createObjectURL(data);
            await page.viewport(1200, 900);
            const element = createSampleElement(1200, 900);
            element.renderPath = path;
            document.body.appendChild(element);
            try {
                const cost = await measured(element, () => importSample(element, "json", url));
                report("gephi-worldcup", path, 9228, cost);
            } finally {
                URL.revokeObjectURL(url);
            }
        });

        it(`${String(GENERATED.nodes)} labeled nodes and ${String(GENERATED.edges)} colored arrows, ${path}`, async () => {
            const element: Graphty = document.createElement("graphty-element");
            element.renderPath = path;
            element.viewMode = "2d";
            element.style.cssText = "display:block;width:1200px;height:900px";
            document.body.appendChild(element);
            await element.updateComplete;
            await operationQueueOf(element.graph).waitForCompletion();
            await element.session.styles.add({
                name: "colored arrows",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.color": "#cc3311" },
            } as never);
            await element.session.styles.add({
                name: "labels",
                target: "node",
                selector: { match: "everything" },
                set: { "node.label": "label" },
            } as never);
            const side = Math.ceil(Math.sqrt(GENERATED.nodes));
            const cost = await measured(element, async () => {
                await element.session.data.addNodes(
                    Array.from({ length: GENERATED.nodes }, (_, id) => ({
                        id,
                        position: { x: (id % side) * 3, y: Math.floor(id / side) * 3, z: 0 },
                    })),
                );
                await element.session.data.addEdges(
                    Array.from({ length: GENERATED.edges }, (_, i) => ({
                        src: i % GENERATED.nodes,
                        dst: (i * 7919 + 13) % GENERATED.nodes,
                    })),
                );
                await element.graph.setLayout("fixed");
                await element.waitForStableFrame();
            });
            report("generated", path, GENERATED.edges, cost);
        });
    }
});
