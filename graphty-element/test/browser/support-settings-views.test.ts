/**
 * @file Every force-curve setting moves the curves in 2D and in 3D, and a circle or a fan does not while they bow.
 *
 * `edge.supportModel`'s forces, unit and scale are declared drawn wherever the support model is set (`drawnWhen`),
 * in both views; `edge.arcRadius`, `edge.fanned` and `edge.fanSpacing` are declared drawn only while it is unset,
 * because a support point wins over a fan and a circle. An application dims its controls by those declarations, so
 * both halves must hold in each view, on the render path the graphty app draws with ("batched"). A stored route
 * (a port or bends) wins over all of them.
 */
import { afterAll, assert, beforeAll, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import karateGml from "../helpers/corpus/gml/karate.gml?raw";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

const WIDTH = 480;
const HEIGHT = 360;

/** A value far enough from each setting's default to move the rested support points. */
const MOVES: readonly (readonly [string, unknown])[] = [
    ["edge.supportSpringLength", 300],
    ["edge.supportSpringConstant", 0.3],
    ["edge.supportRepulsion", 3000],
    ["edge.supportCentralGravity", 3],
    ["edge.supportScale", "unit"],
    ["edge.supportUnit", 0.3],
];

/** Settings a support point overrides. */
const OVERRIDDEN: readonly (readonly [string, unknown])[] = [
    ["edge.arcRadius", 2],
    ["edge.fanSpacing", 3],
    ["edge.fanned", false],
];

for (const view of ["2d", "3d"] as const) {
    describe(`force-curve settings (${view})`, () => {
        let container: HTMLElement;
        let graph: Graph;
        let session: GraphSession;

        beforeAll(async () => {
            container = document.createElement("div");
            container.style.width = `${String(WIDTH)}px`;
            container.style.height = `${String(HEIGHT)}px`;
            document.body.appendChild(container);
            graph = new Graph(container);
            graph.setRenderPath("batched");
            await graph.init();
            await graph.setViewMode(view);
            await graph.addDataFromSource("gml", { data: karateGml });
            await operationQueueOf(graph).waitForCompletion();
            session = graph.getSession();
            await session.styles.add({
                name: "force curves",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.curvature": true, "edge.supportModel": "barnesHut" },
            });
            await graph.waitForStableFrame();
        });

        afterAll(() => {
            graph.dispose();
            container.remove();
        });

        /**
         * How many pixels a layer writing one setting over the force curves changes.
         * @param channel - The setting.
         * @param value - Its value.
         * @returns The pixels changed.
         */
        async function changedBy(channel: string, value: unknown): Promise<number> {
            const before = await readCanvas(graph);
            const layer = await session.styles.add({
                name: `probe ${channel}`,
                target: "edge",
                selector: { match: "everything" },
                set: { [channel]: value },
            });
            const after = await readCanvas(graph);
            await session.styles.remove(layer.id);
            await graph.waitForStableFrame();
            return pixelsOverBar(before, after);
        }

        for (const [channel, value] of MOVES) {
            it(`moves the curves: ${channel}`, async () => {
                assert.isAbove(await changedBy(channel, value), 0, `${channel} ${String(value)} in ${view}`);
            });
        }

        it("draws nothing for a force setting while a stored port routes the line", async () => {
            const port = await session.styles.add({
                name: "port",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.sourcePort": "1,0" },
            });
            await graph.waitForStableFrame();
            const changed = await changedBy("edge.supportSpringLength", 300);
            await session.styles.remove(port.id);
            await graph.waitForStableFrame();
            assert.strictEqual(changed, 0, `a port wins over the support point in ${view}`);
        });

        for (const [channel, value] of OVERRIDDEN) {
            it(`draws nothing while the curves bow: ${channel}`, async () => {
                assert.strictEqual(await changedBy(channel, value), 0, `${channel} ${String(value)} in ${view}`);
            });
        }
    });
}
