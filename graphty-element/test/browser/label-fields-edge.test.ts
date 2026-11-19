/**
 * @file Every label style field draws on every edge text kind, in 2D and 3D.
 *
 * An edge's label, its external label (xlabel) and the captions at its head and its tail are each drawn by a
 * `RichTextLabel` of their own, styled through their own channel, so each is measured: a field the painter drops for
 * one kind draws for the others. See test/helpers/label-fields.ts for the cases.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { silentFields, type TextKind } from "../helpers/label-fields";
import { asData } from "../helpers/testSetup";

const KINDS: readonly TextKind[] = [
    // at 3 the label is wider than the 2D canvas, and its panel's corners are off it
    {
        name: "label",
        target: "edge",
        styleChannel: "edge.labelStyle",
        textChannel: "edge.label",
        size: 2,
    },
    {
        name: "xlabel",
        target: "edge",
        styleChannel: "edge.xlabelStyle",
        textChannel: "edge.xlabel",
        size: 2,
    },
    {
        name: "head caption",
        target: "edge",
        styleChannel: "edge.arrowHeadTextStyle",
        textChannel: "edge.arrowHeadText",
    },
    {
        name: "tail caption",
        target: "edge",
        styleChannel: "edge.arrowTailTextStyle",
        textChannel: "edge.arrowTailText",
    },
];

for (const view of ["2d", "3d"] as const) {
    describe(`label fields on edge texts (${view})`, () => {
        let container: HTMLElement;
        let graph: Graph;

        // A graph a test: the shared setup removes every canvas after each test (test/setup.ts), and a label sized
        // to the screen measures the canvas.
        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "400px";
            container.style.height = "300px";
            document.body.append(container);
            graph = new Graph(container);
            await graph.init();
            await graph.setViewMode(view);
            await graph.setLayout("fixed", { dim: 3 });
            await graph.addNode(asData({ id: "a", position: { x: -6, y: 0, z: 0 } }));
            await graph.addNode(asData({ id: "b", position: { x: 6, y: 0, z: 0 } }));
            // in front of where the edge's texts sit, for onTop: above and below its middle
            await graph.addNode(asData({ id: "front", position: { x: 0, y: 1, z: -3 } }));
            await graph.addNode(asData({ id: "below", position: { x: 0, y: -1, z: -3 } }));
            // where the external label sits by default, above and left of the middle
            await graph.addNode(asData({ id: "upLeft", position: { x: -3, y: 2, z: -3 } }));
            await graph.addEdges([{ src: "a", dst: "b" }]);
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForStableFrame();
        });

        afterEach(() => {
            graph.dispose();
            container.remove();
        });

        for (const kind of KINDS) {
            it(`draws every field on the edge ${kind.name}`, async () => {
                const edge = [...graph.getDataManager().edges.values()][0];
                assert.isDefined(edge);
                const silent = await silentFields(graph, kind, view, {
                    one: { match: "ids", edges: [edge.id] },
                    every: { match: "everything" },
                });
                assert.deepEqual(
                    silent,
                    [],
                    `fields that draw nothing on the edge ${kind.name} in ${view}: ${silent.join(" ")}`,
                );
            });
        }
    });
}
