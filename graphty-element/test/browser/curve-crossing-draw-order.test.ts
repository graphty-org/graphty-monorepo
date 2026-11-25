/**
 * @file A curved edge and a straight edge that cross draw in row order on renderPath "batched", as on "objects"
 * (issue #9201): where they cross, the edge added later is on top, whichever of them is curved.
 */
import "../../src/graphty-element";

import { afterEach, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { assertSameFrame, readCanvas } from "../helpers/whole-canvas";

afterEach(() => {
    document.body.replaceChildren();
});

type Path = "objects" | "batched";
/** The layout's dimensions, in the 3D view. */
type Dim = 2 | 3;

const NODES = [
    { id: "a", position: { x: -2, y: 1, z: 0 } },
    { id: "b", position: { x: 2, y: 1, z: 0 } },
    { id: "c", position: { x: -2, y: -1, z: 0 } },
    { id: "d", position: { x: 2, y: -1, z: 0 } },
    { id: "e", position: { x: 0, y: 2, z: 0 } },
    { id: "f", position: { x: 0, y: -2, z: 0 } },
];

/** One red curve (e to f) crossing two gray straight edges (a to d, c to b). */
const EDGES = [
    { src: "e", dst: "f", hot: true },
    { src: "a", dst: "d" },
    { src: "c", dst: "b" },
];

/** Bundles where only some members are curved, crossing each other and straight edges. */
const MIXED = [
    { src: "e", dst: "f", hot: true },
    { src: "c", dst: "b", hot: true },
    { src: "a", dst: "b" },
    { src: "a", dst: "d", hot: true },
    { src: "c", dst: "d" },
    { src: "a", dst: "b", hot: true },
    { src: "b", dst: "a", hot: true },
    { src: "c", dst: "d", hot: true },
    { src: "e", dst: "f" },
];

async function crossing(
    path: Path,
    dim: Dim,
    edges: readonly { id?: string; src: string; dst: string; hot?: boolean; plain?: boolean }[],
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setLayout("fixed", { dim });
    await element.session.styles.add({
        name: "width",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.width": 0.4, "edge.arrowHead": "none" },
    } as never);
    await element.session.styles.add({
        name: "curved",
        target: "edge",
        selector: { match: "has", path: "data.hot" },
        set: { "edge.color": "#ff0000", "edge.curvature": true },
    } as never);
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([...edges]);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

describe("a curved and a straight edge that cross draw in row order on batched (#9201)", () => {
    for (const dim of [2, 3] as const) {
        for (const order of [
            [0, 1, 2],
            [1, 2, 0],
        ]) {
            it(`${String(dim)}D layout, curve ${order[0] === 0 ? "first" : "last"}: 0 pixels against objects`, async () => {
                const edges = order.map((i) => EDGES[i]);
                const want = await readCanvas((await crossing("objects", dim, edges)).graph);
                document.body.replaceChildren();
                const got = await readCanvas((await crossing("batched", dim, edges)).graph);
                assertSameFrame(want, got, "batched against objects");
            });
        }

        it(`${String(dim)}D layout, bundles with some members curved: 0 pixels against objects`, async () => {
            const want = await readCanvas((await crossing("objects", dim, MIXED)).graph);
            document.body.replaceChildren();
            const got = await readCanvas((await crossing("batched", dim, MIXED)).graph);
            assertSameFrame(want, got, "batched against objects");
        });
    }

    it("straight lines drawn before a curve stay under it when restyled", async () => {
        const restyled = async (path: Path): Promise<Graphty> => {
            const element = await crossing(path, 3, [
                { src: "a", dst: "d", plain: true },
                { src: "c", dst: "b", plain: true },
                EDGES[0],
            ]);
            await element.session.styles.add({
                name: "blue",
                target: "edge",
                selector: { match: "has", path: "data.plain" },
                set: { "edge.color": "#0000ff" },
            } as never);
            await operationQueueOf(element.graph).waitForCompletion();
            await element.waitForStableFrame();
            return element;
        };
        const want = await readCanvas((await restyled("objects")).graph);
        document.body.replaceChildren();
        const got = await readCanvas((await restyled("batched")).graph);
        assertSameFrame(want, got, "batched against objects");
    });

    for (const built of [false, true]) {
        it(`a straight line beside a curve stops at a node turned translucent after it was drawn${built ? ", its edge selected" : ""}`, async () => {
            // the straight line (c to a) is drawn from the curve's batch, and crosses nothing; selected, it is drawn
            // by an edge object rather than a row line
            const translucent = async (path: Path): Promise<Graphty> => {
                const element = await crossing(path, 3, [EDGES[0], { id: "ca", src: "c", dst: "a" }]);
                if (built) {
                    await element.session.selection.apply({ edges: ["ca"] });
                    await operationQueueOf(element.graph).waitForCompletion();
                    await element.waitForStableFrame();
                }

                await element.session.styles.add({
                    name: "faded",
                    target: "node",
                    selector: { match: "everything" },
                    set: { "node.opacity": 0.5 },
                } as never);
                await operationQueueOf(element.graph).waitForCompletion();
                await element.waitForStableFrame();
                return element;
            };
            const want = await readCanvas((await translucent("objects")).graph);
            document.body.replaceChildren();
            const got = await readCanvas((await translucent("batched")).graph);
            assertSameFrame(want, got, "batched against objects");
        });
    }
});
