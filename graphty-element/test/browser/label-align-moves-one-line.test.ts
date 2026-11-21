/**
 * @file Left, Center and Right each move a one-line text, on every text kind, in 2D and 3D.
 *
 * A one-line text's box is its words, so lining its one line up inside that box moves nothing. The catalog says
 * what gives the alignment room (`LABEL_STYLE_DESCRIPTORS` textAlign `needs` `box: "words-in-target"`): a band as
 * wide as the node, or for an edge's text six of its line heights, that the box round the words moves inside. This
 * file writes each alignment over that box and requires the three pictures to differ from one another, the words to
 * keep their size and background, and a moving edge to draw its texts with no new texture.
 */
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { LABEL_STYLE_DESCRIPTORS } from "../../src/catalog";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { drag, hover, nodePoint, type Point } from "../helpers/real-input";
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
    { name: "edge start caption", target: "edge", words: "edge.arrowTailText", style: "edge.arrowTailTextStyle" },
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

        it("the catalog says alignment needs a band wider than one line's words", () => {
            assert.deepEqual(NEEDS, { box: "words-in-target" });
        });

        /**
         * Style every edge's label, and read the label graphty-element drew.
         * @param style - The label style.
         * @returns The edge's label.
         */
        async function edgeLabel(style: Record<string, unknown>): Promise<RichTextLabel> {
            const session = graph.getSession();
            await session.styles.add({
                name: "edge words",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.label": "ab", "edge.labelStyle": style },
            } as never);
            await session.styles.settled();
            await graph.waitForStableFrame();
            const label = [...graph.getDataManager().edges.values()][0]?.label ?? null;
            assert.isNotNull(label, "the edge has a label");
            return label;
        }

        const texture = (label: RichTextLabel): unknown => (label as unknown as { texture: unknown }).texture;
        const width = (label: RichTextLabel): number =>
            (label as unknown as { actualDimensions: { width: number } }).actualDimensions.width;

        for (const kind of KINDS.filter((each) => each.hovered !== true)) {
            it(`on the ${kind.name}, Center over the band draws what no box draws: the background stays round the words`, async () => {
                const session = graph.getSession();
                const selector =
                    kind.target === "node" ? { match: "ids", nodes: ["a"] } : { match: "everything" as const };
                const layer = await session.styles.add({
                    name: kind.name,
                    target: kind.target,
                    selector,
                    set: { [kind.words]: "ab", [kind.style]: BASE },
                } as never);
                await session.styles.settled();
                const plain = await readCanvas(graph);
                await session.styles.update(layer.id, {
                    set: { [kind.words]: "ab", [kind.style]: { ...BASE, ...NEEDS, textAlign: "center" } },
                });
                await session.styles.settled();
                assert.strictEqual(pixelsOverBar(plain, await readCanvas(graph)), 0, "Center changed the picture");
            });
        }

        it("keeps an aligned edge text's words their own size, however small, and moves them", async () => {
            const wordsWidth = width(await edgeLabel({ size: 0.6, background: "#FFCC00" }));
            const session = graph.getSession();
            const layer = session.styles.list().find((each) => each.name === "edge words");
            assert.isDefined(layer);
            const frames = [];
            for (const textAlign of ["left", "center", "right"] as const) {
                await session.styles.update(layer.id, {
                    set: {
                        "edge.label": "ab",
                        "edge.labelStyle": { size: 0.6, background: "#FFCC00", ...NEEDS, textAlign },
                    },
                });
                await session.styles.settled();
                const label = [...graph.getDataManager().edges.values()][0]?.label as RichTextLabel;
                assert.strictEqual(width(label), wordsWidth, `${textAlign}: the texture grew past the words`);
                frames.push(await readCanvas(graph));
            }
            const [left, center, right] = frames;
            assert.isAbove(pixelsOverBar(left, center), 0, "Left and Center draw the same picture");
            assert.isAbove(pixelsOverBar(center, right), 0, "Center and Right draw the same picture");
        });

        for (const box of ["target-width", "words-in-target"] as const) {
            it(`draws a moving edge's ${box} text with no new texture`, async () => {
                const label = await edgeLabel({ ...BASE, box, textAlign: "left" });
                const before = texture(label);
                // the left end, dragged inward: the line gets shorter on every frame of the drag
                const from = nodePoint(graph, "l");
                await drag(container, from, { x: from.x + 40, y: from.y - 20 });
                await graph.waitForStableFrame();
                assert.notDeepEqual(nodePoint(graph, "l"), from, "the drag moved the node, and its edge with it");
                assert.strictEqual(texture(label), before, "the edge's text drew a new texture as its line moved");
            });
        }

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
