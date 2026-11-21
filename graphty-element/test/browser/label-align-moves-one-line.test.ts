/**
 * @file Left, Center and Right each move a one-line text, on every text kind, in 2D and 3D.
 *
 * A one-line text's box is its words, so lining its one line up inside that box moves nothing. The catalog says
 * what gives the alignment room (`LABEL_STYLE_DESCRIPTORS` textAlign `needs` `box: "target-width"`): a box as wide
 * as the node, or for an edge's text as long as its line. This file writes each alignment over that box and
 * requires the three pictures to differ from one another.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { LABEL_STYLE_DESCRIPTORS } from "../../src/catalog";
import { Graph, operationQueueOf } from "../../src/Graph";
import { hover, nodePoint, type Point } from "../helpers/real-input";
import { asData } from "../helpers/testSetup";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

/** One text kind: its words channel, its style channel and whether it is drawn only under the pointer. */
interface AlignKind {
    readonly name: string;
    readonly target: "node" | "edge";
    readonly words: string;
    readonly style: string;
    readonly hovered?: true;
}

const KINDS: readonly AlignKind[] = [
    { name: "node label", target: "node", words: "node.label", style: "node.labelStyle" },
    { name: "node external label", target: "node", words: "node.xlabel", style: "node.xlabelStyle" },
    { name: "node tooltip", target: "node", words: "node.tooltip", style: "node.tooltipStyle", hovered: true },
    { name: "edge label", target: "edge", words: "edge.label", style: "edge.labelStyle" },
    { name: "edge external label", target: "edge", words: "edge.xlabel", style: "edge.xlabelStyle" },
    { name: "edge tooltip", target: "edge", words: "edge.tooltip", style: "edge.tooltipStyle", hovered: true },
    { name: "edge end caption", target: "edge", words: "edge.arrowHeadText", style: "edge.arrowHeadTextStyle" },
];

/** What every kind's style holds: a small one-line text with a panel, so its place shows. */
const BASE = { size: 1, background: "#FFCC00" };

/** The box the catalog says the alignment needs. */
const NEEDS = Object.fromEntries(
    (LABEL_STYLE_DESCRIPTORS.find((descriptor) => descriptor.field === "textAlign")?.needs ?? []).map((need) => [
        need.field,
        need.value,
    ]),
);

for (const view of ["2d", "3d"] as const) {
    describe(`alignment moves a one-line text (${view})`, () => {
        let container: HTMLElement;
        let graph: Graph;

        beforeEach(async () => {
            container = document.createElement("div");
            container.style.width = "400px";
            container.style.height = "300px";
            document.body.append(container);
            graph = new Graph(container);
            await graph.init();
            await graph.setViewMode(view);
            await graph.setLayout("fixed", { dim: 3 });
            // a wide node in the middle, and a long edge between two small ones below it
            await graph.addNode(asData({ id: "a", position: { x: 0, y: 3, z: 0 } }));
            await graph.addNode(asData({ id: "l", position: { x: -8, y: -4, z: 0 } }));
            await graph.addNode(asData({ id: "r", position: { x: 8, y: -4, z: 0 } }));
            await graph.addEdges([{ src: "l", dst: "r" }]);
            await graph.getSession().styles.add({
                name: "a wide node",
                target: "node",
                selector: { match: "ids", nodes: ["a"] },
                set: { "node.size": 5 },
            });
            await operationQueueOf(graph).waitForCompletion();
            await graph.waitForStableFrame();
        });

        afterEach(() => {
            graph.dispose();
            container.remove();
        });

        it("the catalog says alignment needs a box wider than one line's words", () => {
            assert.deepEqual(NEEDS, { box: "target-width" });
        });

        for (const kind of KINDS) {
            it(`on the ${kind.name}, Left, Center and Right are three different pictures`, async () => {
                const session = graph.getSession();
                const selector =
                    kind.target === "node" ? { match: "ids", nodes: ["a"] } : { match: "everything" as const };
                const at = (): Point => {
                    if (kind.target === "node") {
                        return nodePoint(graph, "a");
                    }
                    const [l, r] = [nodePoint(graph, "l"), nodePoint(graph, "r")];
                    return { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
                };
                const layer = await session.styles.add({
                    name: kind.name,
                    target: kind.target,
                    selector,
                    set: { [kind.words]: "ab", [kind.style]: { ...BASE, ...NEEDS, textAlign: "center" } },
                } as never);
                const frames = [];
                for (const textAlign of ["left", "center", "right"] as const) {
                    await session.styles.update(layer.id, {
                        set: { [kind.words]: "ab", [kind.style]: { ...BASE, ...NEEDS, textAlign } },
                    });
                    await session.styles.settled();
                    if (kind.hovered === true) {
                        // off the text's owner and back, so the pointer arrives over it every time
                        await hover(container, { x: 2, y: 2 });
                        await hover(container, at());
                    }
                    frames.push(await readCanvas(graph));
                }
                const [left, center, right] = frames;
                assert.isAbove(pixelsOverBar(left, center), 0, "Left and Center draw the same picture");
                assert.isAbove(pixelsOverBar(center, right), 0, "Center and Right draw the same picture");
                assert.isAbove(pixelsOverBar(left, right), 0, "Left and Right draw the same picture");
            });
        }
    });
}
