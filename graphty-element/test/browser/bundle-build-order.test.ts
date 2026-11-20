/**
 * @file Under `renderPath: "batched"` an edge stored with no `Edge` is built when its row is painted, and edges
 * joining the same two nodes are built in row order like every other: their line and cap slots, and so which edge
 * draws over which where they overlap, are those of the `"objects"` path, which builds every edge in row order.
 *
 * Two things built a bundle's members early: ingest asking for the edge a repeated pair repeats (the first member
 * was built when the second arrived), and placing one member of a bundle, which built every other member of every
 * bundle before the rows ahead of them were painted.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { type Edge, edgeInternals } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";
import { minimumWorkPerFrame, setMinimumWorkPerFrame } from "../../src/managers/minimumWork";
import { pixelsOverBar, readCanvas } from "../helpers/whole-canvas";

/** The mode the project runs in ("minimum-work" switches it on for every test), put back after each test. */
const projectMode = minimumWorkPerFrame();

afterEach(() => {
    setMinimumWorkPerFrame(projectMode);
    document.body.replaceChildren();
});

type Path = "objects" | "batched";
interface GraphData {
    nodes: { id: string; position: { x: number; y: number; z: number } }[];
    edges: { src: string; dst: string; hot?: true }[];
}

/**
 * Six nodes; three bundles (one running both ways) whose members cross the edges ahead of them in another color, so
 * the picture shows which of two crossing edges is drawn over the other.
 */
const SMALL: GraphData = {
    nodes: [
        { id: "a", position: { x: -2, y: 1, z: 0 } },
        { id: "b", position: { x: 2, y: 1, z: 0 } },
        { id: "c", position: { x: -2, y: -1, z: 0 } },
        { id: "d", position: { x: 2, y: -1, z: 0 } },
        { id: "e", position: { x: 0, y: 2, z: 0 } },
        { id: "f", position: { x: 0, y: -2, z: 0 } },
    ],
    edges: [
        { src: "e", dst: "f" },
        { src: "c", dst: "b" },
        { src: "a", dst: "b", hot: true },
        { src: "a", dst: "d" },
        { src: "c", dst: "d", hot: true },
        { src: "a", dst: "b" },
        { src: "b", dst: "a" },
        { src: "c", dst: "d" },
        { src: "e", dst: "f" },
    ],
};

/**
 * More edges than one frame paints (1024), with the second edge's bundle completed only by the last two rows (one
 * repeating its ordered pair, one running back), so the repeat arrives, and the first frame's edges are placed, long
 * before those rows are painted.
 * @returns The graph.
 */
function large(): GraphData {
    const count = 56;
    const nodes = Array.from({ length: count }, (_, i) => ({
        id: `n${i}`,
        position: { x: 4 * Math.cos((2 * Math.PI * i) / count), y: 4 * Math.sin((2 * Math.PI * i) / count), z: 0 },
    }));
    const edges = [
        { src: "n2", dst: "n3" },
        { src: "n0", dst: "n1" },
    ];
    for (let i = 0; i < count; i++) {
        for (let j = i + 4; j < count && edges.length < 1100; j++) {
            edges.push({ src: `n${i}`, dst: `n${j}` });
        }
    }

    edges.push({ src: "n0", dst: "n1" }, { src: "n1", dst: "n0" });
    return { nodes, edges };
}

/**
 * Mount an element on a path with every edge curved and capped (a look only an `Edge` draws), then load a graph.
 * @param path - The render path.
 * @param data - The graph.
 * @returns The element, its picture settled.
 */
async function loaded(path: Path, data: GraphData): Promise<Graphty> {
    document.body.replaceChildren();
    const element = document.createElement("graphty-element");
    element.renderer = "webgl";
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.graph.setLayout("fixed", { dim: 2 });
    await element.session.styles.add({
        name: "curved and capped",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.curvature": true, "edge.arrowHead": "normal", "edge.width": 0.4 },
    } as never);
    await element.session.styles.add({
        name: "hot",
        target: "edge",
        selector: { match: "has", path: "data.hot" },
        set: { "edge.color": "#ff0000" },
    } as never);
    await element.session.data.addNodes(data.nodes);
    await element.session.data.addEdges(data.edges);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * The `Edge`s built, in the order they were built.
 * @param element - The element.
 * @returns They.
 */
function builtEdges(element: Graphty): Edge[] {
    return [...dataManagerInternals.builtEdges(element.graph.getDataManager()).values()];
}

/**
 * Each built edge's row and the slots its line and its head cap hold, in build order.
 * @param element - The element.
 * @returns They.
 */
function slotsOf(element: Graphty): [number, number[], number | undefined][] {
    return builtEdges(element).map((edge) => [
        edge.index,
        [...edgeInternals.drawn(edge).lineSlots],
        // A cap's slot is the order its batch draws it in.
        (edge.arrowCap as unknown as { slot?: number } | null)?.slot,
    ]);
}

describe("edges joining the same two nodes, under batched", () => {
    for (const [name, data, split] of [
        ["a small graph", SMALL, false],
        ["more edges than one frame paints", large(), false],
        ["a small graph painted four edges a frame", SMALL, true],
    ] as const) {
        it(`are built, and take their slots, in row order (${name})`, async () => {
            // Four edges a frame (src/managers/minimumWork.ts): a bundle member is placed before the rows of the
            // bundle's other members are painted.
            setMinimumWorkPerFrame(split || projectMode);
            const objects = slotsOf(await loaded("objects", data));
            const batched = await loaded("batched", data);
            const rows = builtEdges(batched).map((edge) => edge.index);
            assert.lengthOf(rows, data.edges.length, "every curved edge has its Edge");
            assert.deepEqual(
                rows,
                [...rows].sort((x, y) => x - y),
                "built in row order",
            );
            assert.deepEqual(slotsOf(batched), objects, "the slots the objects path gives");
        });
    }

    it("draw the picture the objects path draws where they overlap and cross", async () => {
        const want = await readCanvas((await loaded("objects", SMALL)).graph);
        const got = await readCanvas((await loaded("batched", SMALL)).graph);
        assert.equal(pixelsOverBar(want, got), 0);
    });

    for (const [name, data] of [
        ["a small graph", SMALL],
        ["more edges than one frame paints", large()],
    ] as const) {
        it(`are placed on the curves the objects path places them on, however the paint is split (${name})`, async () => {
            const curves = async (path: Path, split: boolean): Promise<[number, number[][]][]> => {
                setMinimumWorkPerFrame(split || projectMode);
                const element = await loaded(path, data);
                setMinimumWorkPerFrame(projectMode);
                return builtEdges(element)
                    .map((edge): [number, number[][]] => [
                        edge.index,
                        (edge.drawnCurve ?? []).map((point) => point.asArray()),
                    ])
                    .sort(([x], [y]) => x - y);
            };
            const want = await curves("objects", false);
            assert.isAbove(want.filter(([, curve]) => curve.length > 0).length, 0, "the edges are drawn as curves");
            assert.deepEqual(await curves("batched", false), want, "a load painted in one frame");
            assert.deepEqual(await curves("batched", true), want, "a load painted four edges a frame");
        });
    }
});

describe("a bundle of curved and plain edges under batched", () => {
    /**
     * Load SMALL with only the hot edges curved and nothing capped, so its plain edges are row lines.
     * @param path - The render path.
     * @returns The element, its picture settled.
     */
    async function mixed(path: Path): Promise<Graphty> {
        const element = await loaded(path, { nodes: SMALL.nodes, edges: [] });
        await element.session.styles.add({
            name: "plain and uncapped",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.curvature": false, "edge.arrowHead": "none" },
        } as never);
        await element.session.styles.add({
            name: "hot and curved",
            target: "edge",
            selector: { match: "has", path: "data.hot" },
            set: { "edge.curvature": true },
        } as never);
        await element.session.data.addEdges(SMALL.edges);
        await operationQueueOf(element.graph).waitForCompletion();
        await element.waitForStableFrame();
        return element;
    }

    it("builds only its curved members, and fans them as the objects path does", async () => {
        const curves = (element: Graphty): [number, number[][]][] =>
            builtEdges(element)
                .filter((edge) => (SMALL.edges[edge.index] as { hot?: true }).hot === true)
                .map((edge): [number, number[][]] => [edge.index, (edge.drawnCurve ?? []).map((p) => p.asArray())])
                .sort(([x], [y]) => x - y);
        const want = curves(await mixed("objects"));
        assert.isAbove(
            want.filter(([, curve]) => curve.length > 0).length,
            0,
            "the curved members are drawn as curves",
        );
        const element = await mixed("batched");
        const hot = SMALL.edges.flatMap((edge, row) => (edge.hot === true ? [row] : []));
        // Placing a curved member built its plain siblings, after every row painted before them, so they drew over
        // the rows after them.
        assert.deepEqual(
            builtEdges(element).map((edge) => edge.index),
            hot,
            "the curved rows, in row order",
        );
        assert.sameMembers(
            element.graph.getEdgeRowLines()?.rows() ?? [],
            SMALL.edges.flatMap((edge, row) => (edge.hot === true ? [] : [row])),
            "every plain row keeps its row line",
        );
        assert.deepEqual(curves(element), want, "each curved member's fan");
    });
});

describe("a repeated edge under batched", () => {
    it("is merged into the edge stored with no Edge without building it, which is built later with the merged record", async () => {
        const element = await loaded("batched", { nodes: SMALL.nodes, edges: [] });
        await element.session.styles.add({
            name: "plain",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.curvature": false, "edge.arrowHead": "none" },
        } as never);
        const { graph } = element;
        await graph.addEdges([{ source: "a", target: "b", label: "old" }], { repeated: "last", skipQueue: true });
        await element.waitForStableFrame();
        await graph.addEdges([{ source: "a", target: "b", label: "new" }], { repeated: "last", skipQueue: true });
        await element.waitForStableFrame();
        assert.lengthOf(builtEdges(element), 0, "a row line draws it, and the repeat built no Edge");

        const [edge] = graph.getDataManager().getEdgesBetween("a", "b");
        assert.lengthOf(builtEdges(element), 1, "reading it builds it");
        assert.strictEqual((edge.data as { label?: string }).label, "new");
    });
});
