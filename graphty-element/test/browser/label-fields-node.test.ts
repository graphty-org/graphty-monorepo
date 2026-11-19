/**
 * @file Every label style field draws on every node text kind, in 2D and 3D.
 *
 * The node's label, its external label (xlabel) and its tooltip are each drawn by a `RichTextLabel` of their own,
 * styled through their own channel (`node.labelStyle`, `node.xlabelStyle`, `node.tooltipStyle`), so each is measured:
 * a field the painter drops for one kind draws for the others. See test/helpers/label-fields.ts for the cases.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LabelStyle } from "../../src/catalog";
import { Graph, operationQueueOf } from "../../src/Graph";
import { silentFields, type TextKind } from "../helpers/label-fields";
import { hover, nodePoint } from "../helpers/real-input";
import { asData } from "../helpers/testSetup";

const KINDS: readonly (TextKind & { skip?: Partial<Record<keyof LabelStyle, string>> })[] = [
    { name: "label", target: "node", styleChannel: "node.labelStyle", textChannel: "node.label" },
    {
        name: "xlabel",
        target: "node",
        styleChannel: "node.xlabelStyle",
        textChannel: "node.xlabel",
        // above the node, where a label sits, so it crosses the node in front of it and stays on the canvas
        base: { location: "top" },
        skip: { declutter: "LabelStyle.declutter: node labels only." },
    },
    {
        name: "tooltip",
        target: "node",
        styleChannel: "node.tooltipStyle",
        textChannel: "node.tooltip",
        // a tooltip sits further above its node than a label: at 3 it is drawn above the canvas
        size: 1,
        skip: {
            declutter: "LabelStyle.declutter: node labels only.",
            onTop: "A tooltip is always drawn on top (Node.showTooltip).",
        },
    },
];

for (const view of ["2d", "3d"] as const) {
    describe(`label fields on node texts (${view})`, () => {
        let container: HTMLElement;
        let graph: Graph;

        // A graph a test: the shared setup removes every canvas after each test (test/setup.ts), and a tooltip
        // needs the pointer to reach the canvas.
        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "400px";
            container.style.height = "300px";
            document.body.append(container);
            graph = new Graph(container);
            await graph.init();
            await graph.setViewMode(view);
            await graph.setLayout("fixed", { dim: 3 });
            // the measured node in the middle of the frame, two more to frame it and to declutter against
            await graph.addNode(asData({ id: "a", position: { x: 0, y: 0, z: 0 } }));
            await graph.addNode(asData({ id: "b", position: { x: -8, y: -6, z: 0 } }));
            await graph.addNode(asData({ id: "c", position: { x: 8, y: 6, z: 0 } }));
            // in front of where the measured node's label sits, for onTop
            await graph.addNode(asData({ id: "front", position: { x: 0, y: 2, z: -3 } }));
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForStableFrame();
        });

        afterEach(() => {
            graph.dispose();
            container.remove();
        });

        for (const kind of KINDS) {
            it(`draws every field on the node ${kind.name}`, async () => {
                // a tooltip is drawn while the pointer is over its node
                const before =
                    kind.name === "tooltip"
                        ? async () => {
                              // off the node and back, so the pointer arrives over it every time
                              await hover(container, { x: 2, y: 2 });
                              await hover(container, nodePoint(graph, "a"));
                              await graph.waitForStableFrame();
                          }
                        : undefined;
                const silent = await silentFields(
                    graph,
                    kind,
                    view,
                    { one: { match: "ids", nodes: ["a"] }, every: { match: "everything" } },
                    kind.skip,
                    before,
                );
                assert.deepEqual(
                    silent,
                    [],
                    `fields that draw nothing on the node ${kind.name} in ${view}: ${silent.join(" ")}`,
                );
            });
        }
    });
}
