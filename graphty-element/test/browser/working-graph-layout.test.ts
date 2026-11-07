/**
 * @file Layouts over the working graph (design/working-graph/design.md, section 7): while the
 * session reads it (`workingGraph: "visible"`), a layout is handed only what the visibility filter
 * and the time window show. A hidden node takes no slot in a one-pass layout and pulls on nothing in
 * a force layout, it stays where it was, and a settled change of what is shown lays the graph out
 * again, once. In the default `"documented"` mode a layout runs over the whole graph as it always
 * has.
 *
 * Positions are read from the shared array (`session.positions`), which answers for hidden nodes
 * too; an engine is never asked about a node it was not handed.
 */

import "../../src/graphty-element";

import { afterAll, afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";

import { derivedInputCounters } from "../../src/algorithms/input/derivedInputs";
import { setDefaultFeatures } from "../../src/features/resolve";
import { Graph, operationQueueOf } from "../../src/Graph";
import { LayoutEngine, layoutEngineInternals, StaticLayoutEngine } from "../../src/layout/LayoutEngine";
import type { ElementSession } from "../../src/session/types";

/** Twenty nodes on a path. */
const IDS = Array.from({ length: 20 }, (_, index) => `n${String(index)}`);

/** Every other node: what the filter below shows. */
const SHOWN = IDS.filter((_id, index) => index % 2 === 0);

/** A ring of twelve, for the cases the audit measured on one. */
const RING = Array.from({ length: 12 }, (_, index) => `r${String(index)}`);

/**
 * Put an empty graph on the page.
 * @returns The graph and its container.
 */
async function emptyGraph(): Promise<{ graph: Graph; container: HTMLDivElement }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    return { graph, container };
}

/**
 * Put a graph on the page holding the twenty-node path.
 * @returns The graph and its container.
 */
async function pathGraph(): Promise<{ graph: Graph; container: HTMLDivElement }> {
    const { graph, container } = await emptyGraph();
    await graph.addNodes(IDS.map((id) => ({ id })));
    await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })));
    await operationQueueOf(graph).waitForCompletion();
    return { graph, container };
}

/**
 * Where each node is now, from the shared array.
 * @param graph - The graph.
 * @returns Each placed node's x, y and z, by id.
 */
function positionsOf(graph: Graph): Map<string, [number, number, number]> {
    const session = graph.getSession();
    const { ids } = session.data.snapshot();
    const out = new Map<string, [number, number, number]>();
    const at = { x: 0, y: 0, z: 0 };
    for (let row = 0; row < ids.size; row++) {
        if (session.positions.isPlaced(row)) {
            session.positions.read(row, at);
            out.set(String(ids.idOf(row)), [at.x, at.y, at.z]);
        }
    }

    return out;
}

/**
 * The angles of some nodes about the centre of the circle they lie on, sorted, in degrees.
 * @param at - Every node's position.
 * @param ids - The nodes.
 * @returns The angles.
 */
function anglesOf(at: Map<string, [number, number, number]>, ids: readonly string[]): number[] {
    const points = ids.map((id) => at.get(id) ?? [Number.NaN, Number.NaN, Number.NaN]);
    const cx = points.reduce((sum, [x]) => sum + x, 0) / points.length;
    const cy = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
    return points.map(([x, y]) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI).sort((a, b) => a - b);
}

/**
 * The smallest gap between two neighbouring angles, in degrees.
 * @param angles - The sorted angles.
 * @returns The gap.
 */
function smallestGap(angles: readonly number[]): number {
    return Math.min(
        ...angles.map((angle, i) => (i === 0 ? angle + 360 - angles[angles.length - 1] : angle - angles[i - 1])),
    );
}

/**
 * How far apart two nodes are.
 * @param at - Every node's position.
 * @param a - One node.
 * @param b - The other.
 * @returns The distance.
 */
function distance(at: Map<string, [number, number, number]>, a: string, b: string): number {
    const p = at.get(a) ?? [Number.NaN, Number.NaN, Number.NaN];
    const q = at.get(b) ?? [Number.NaN, Number.NaN, Number.NaN];
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/**
 * How far apart two nodes are, over the mean length of the edges of a path through some nodes.
 * @param at - Every node's position.
 * @param path - The nodes, in path order.
 * @param a - One node.
 * @param b - The other.
 * @returns The ratio: 1 for neighbours on a regular polygon of the path's nodes.
 */
function overMeanEdge(
    at: Map<string, [number, number, number]>,
    path: readonly string[],
    a: string,
    b: string,
): number {
    let sum = 0;
    for (let i = 1; i < path.length; i++) {
        sum += distance(at, path[i - 1], path[i]);
    }

    return distance(at, a, b) / (sum / (path.length - 1));
}

describe("a layout over the working graph", () => {
    let graph: Graph;
    let container: HTMLDivElement;
    let session: ElementSession;
    let layoutsRun: number;

    beforeEach(async () => {
        ({ graph, container } = await pathGraph());
        session = graph.getSession() as ElementSession;
        layoutsRun = 0;
        graph.addListener("layout-changed", () => {
            layoutsRun++;
        });
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Show only some nodes, and wait for whatever that set off.
     * @param ids - The nodes to show, or null for no filter.
     */
    async function show(ids: readonly string[] | null): Promise<void> {
        await session.visibility.set(ids === null ? null : { kind: "member", of: { nodes: ids } });
        await graph.waitForSettled();
    }

    /**
     * Switch what readers that name no scope read, and wait for the layout it sets off.
     * @param mode - The mode.
     */
    async function readWorking(mode: "visible" | "documented"): Promise<void> {
        session.config.setWorkingGraph(mode);
        await graph.waitForSettled();
    }

    it("gives a hidden node no slot on a circle, and leaves it where it was", async () => {
        await graph.setLayout("circular", { dim: 2 });
        await show(SHOWN);
        const before = positionsOf(graph);

        await readWorking("visible");
        const after = positionsOf(graph);

        // Ten shown nodes on a circle of their own are 36 degrees apart; on the whole graph's
        // circle of twenty, every other slot, also 36 -- so the circle is checked by its size of
        // gap AND by every hidden node staying exactly where it was.
        assert.closeTo(smallestGap(anglesOf(after, SHOWN)), 36, 0.5);
        for (const id of IDS.filter((each) => !SHOWN.includes(each))) {
            assert.deepEqual(after.get(id), before.get(id), `hidden ${id} stayed where it was`);
        }

        // Five shown nodes: the circle is laid out again, five slots 72 degrees apart.
        const five = SHOWN.slice(0, 5);
        await show(five);
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), five)), 72, 0.5);
    });

    it("runs the whole graph in the documented mode, hidden nodes keeping their slots", async () => {
        await graph.setLayout("circular", { dim: 2 });
        const five = ["n0", "n1", "n2", "n3", "n4"];
        await show(five);
        await graph.setLayout("circular", { dim: 2, scale: 1.5 });

        // Five neighbouring nodes of a twenty-slot circle are 18 degrees apart.
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), five)), 18, 0.5);
    });

    it("lays out the whole graph under a filter when the layout scope is the whole graph", async () => {
        await readWorking("visible");
        const five = ["n0", "n1", "n2", "n3", "n4"];
        await show(five);
        await graph.setLayout("circular", { dim: 2 }, { scope: "graph" });
        await graph.waitForSettled();

        // Five neighbouring nodes of a twenty-slot circle are 18 degrees apart, and the scope reads
        // back as the whole graph, not as no scope.
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), five)), 18, 0.5);
        assert.strictEqual(graph.getLayoutScope(), "graph");

        // Cleared to what is shown, the five take a circle of their own.
        await graph.setLayout("circular", { dim: 2 }, { scope: "visible" });
        await graph.waitForSettled();
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), five)), 72, 0.5);
    });

    it("lays the graph out once per filter change, and not at all in the documented mode", async () => {
        await graph.setLayout("circular", { dim: 2 });
        layoutsRun = 0;

        await show(SHOWN);
        assert.strictEqual(layoutsRun, 0, "documented: a filter change runs no layout");

        await readWorking("visible");
        assert.strictEqual(layoutsRun, 1, "switching to the working graph lays out what is shown");

        await show(SHOWN.slice(0, 4));
        assert.strictEqual(layoutsRun, 2, "a new filter lays out once");

        await show(SHOWN.slice(0, 4));
        assert.strictEqual(layoutsRun, 2, "the same nodes shown again run nothing");

        await readWorking("documented");
        assert.strictEqual(layoutsRun, 3, "switching back lays out the whole graph");
    });

    it("lays out a node added after the filter that the filter shows", async () => {
        await session.data.addNodes(IDS.map((id, index) => ({ id: `${id}v`, v: index < 6 ? 1 : 0 })));
        await readWorking("visible");
        await session.visibility.set({ kind: "range", attribute: "data.v", min: 0.5 });
        await graph.setLayout("circular", { dim: 2 });
        await graph.waitForSettled();
        const six = IDS.slice(0, 6).map((id) => `${id}v`);
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), six)), 60, 0.5, "six shown nodes: a hexagon");

        await session.data.addNodes([{ id: "late", v: 1 }]);
        await graph.waitForSettled();

        // A seventh shown node on the circle with the six: a heptagon.
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), [...six, "late"])), 360 / 7, 0.5);
    });

    it("does not hand a node added after the filter, which the filter hides, to a force layout", async () => {
        await readWorking("visible");
        await graph.setLayout("ngraph", { seed: 3 });
        await show(SHOWN);

        await session.data.addNodes([{ id: "hidden-late" }]);
        await graph.waitForSettled();

        const engine = graph.getLayoutManager().layoutEngine;
        const held = new Set([...(engine?.nodes ?? [])].map((node) => node.id));
        assert.isFalse(held.has("hidden-late"), "the hidden node never reached the engine");
        assert.strictEqual(held.size, SHOWN.length, "the engine holds what is shown and nothing else");
    });
});

/** A clique of ten nodes, a component of its own beside the path. */
const CLIQUE = Array.from({ length: 10 }, (_, index) => `c${String(index)}`);

/** How a hidden part of the graph is set up to push or pull on the shown path. */
type Hidden = { kind: "pinned-neighbours"; x: number } | { kind: "clique" } | { kind: "nothing" };

/**
 * Lay a fresh graph out with a force layout, the path shown and something hidden beside it, and
 * read where the path's nodes are once it settles.
 * @param layout - The force layout.
 * @param working - Whether the session reads the working graph.
 * @param hidden - What is hidden: n4 and n6 pinned at an x, a clique beside the path, or nothing.
 * @returns The path's positions, in its order.
 */
async function shownPath(layout: string, working: boolean, hidden: Hidden): Promise<number[][]> {
    const { graph, container } = await emptyGraph();
    try {
        const session = graph.getSession() as ElementSession;
        session.config.setWorkingGraph(working ? "visible" : "documented");
        await graph.setLayout(layout, { seed: 3 });
        const clique = hidden.kind === "clique" ? CLIQUE : [];
        await graph.addNodes([...IDS, ...clique].map((id) => ({ id })));
        await graph.addEdges([
            ...IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })),
            ...clique.flatMap((a, i) => clique.slice(i + 1).map((b) => ({ src: a, dst: b }))),
        ]);
        let shown = IDS;
        if (hidden.kind === "pinned-neighbours") {
            // Pinned first, so the running layout cannot move them off where they are put.
            await session.positions.pin(["n4", "n6"]);
            await session.positions.set([
                { id: "n4", x: hidden.x, y: 0, z: 0 },
                { id: "n6", x: hidden.x, y: 10, z: 0 },
            ]);
            shown = IDS.filter((id) => id !== "n4" && id !== "n6");
        }

        if (hidden.kind !== "nothing") {
            await session.visibility.set({ kind: "member", of: { nodes: shown } });
        }

        await graph.setLayout(layout, { seed: 3 });
        await graph.waitForStableFrame();
        const at = positionsOf(graph);
        if (hidden.kind === "pinned-neighbours") {
            assert.deepEqual(at.get("n4"), [hidden.x, 0, 0], "the hidden node stayed where it was");
        }

        return shown.map((id) => at.get(id) ?? [Number.NaN, Number.NaN, Number.NaN]);
    } finally {
        graph.dispose();
        container.remove();
    }
}

/**
 * The farthest any node of one drawing is from where it is in another.
 * @param a - One drawing.
 * @param b - The other, in the same order.
 * @returns The distance.
 */
function farthest(a: number[][], b: number[][]): number {
    return Math.max(...a.map((p, i) => Math.hypot(p[0] - b[i][0], p[1] - b[i][1], p[2] - b[i][2])));
}

describe("a force layout over the working graph", () => {
    // ngraph and d3 pull a node toward its neighbours: moving the hidden ones must not move it.
    for (const layout of ["ngraph", "d3"]) {
        it(`does not let hidden neighbours pull a shown node under ${layout}`, async () => {
            const pull = async (working: boolean): Promise<number> =>
                farthest(
                    await shownPath(layout, working, { kind: "pinned-neighbours", x: 2000 }),
                    await shownPath(layout, working, { kind: "pinned-neighbours", x: -2000 }),
                );

            const whole = await pull(false);
            const visible = await pull(true);

            assert.isAbove(whole, 100, "over the whole graph, moving the hidden neighbours moves the path");
            // The hidden nodes are not in the engine at all, so where they are cannot matter.
            assert.isBelow(visible, 2, "over what is shown, nothing hidden pulls the path");
        });
    }

    // The simulations' own scale follows the drawing, so a far pin moves little; a hidden clique
    // beside the path is what pushes it about. Hidden rows are inert in the simulation.
    for (const layout of ["forceatlas2", "spring"]) {
        it(`does not let a hidden component push the shown path under ${layout}`, async () => {
            const alone = await shownPath(layout, true, { kind: "nothing" });

            const whole = farthest(await shownPath(layout, false, { kind: "clique" }), alone);
            const visible = farthest(await shownPath(layout, true, { kind: "clique" }), alone);

            assert.isAbove(whole, 20, "over the whole graph the clique pushes the path about");
            // Not zero: where the simulation seeds a node depends on how many there are.
            assert.isBelow(visible, whole / 5, "over what is shown the path is drawn as if alone");
        });
    }
});

describe("what the working graph hands a layout", () => {
    let graph: Graph;
    let container: HTMLDivElement;
    let session: ElementSession;

    beforeEach(async () => {
        ({ graph, container } = await emptyGraph());
        session = graph.getSession() as ElementSession;
        session.config.setWorkingGraph("visible");
        await session.layout.setDimension("2d");
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Load the ring of twelve, each node with `v` 1 for the first six and 0 for the rest.
     * @param weightOfLast - The weight of the edge that closes the ring (r11 to r0).
     */
    async function ring(weightOfLast = 1): Promise<void> {
        await session.data.addNodes(RING.map((id, i) => ({ id, v: i < 6 ? 1 : 0 })));
        await session.data.addEdges(
            RING.map((id, i) => ({ src: id, dst: RING[(i + 1) % RING.length], weight: i === 11 ? weightOfLast : 1 })),
        );
    }

    it("lays out a hexagon, not half a twelve-gon, when Graphviz arranges the six shown nodes", async () => {
        await ring();
        await session.visibility.set({ kind: "range", attribute: "data.v", min: 0.5 });
        await session.layout.set("graphviz-neato");
        await graph.waitForSettled();
        await graph.waitForStableFrame();

        // The six shown nodes are a path: neato draws it nearly straight, its ends about five
        // edges apart. A phantom node standing for both hidden neighbours would close it into a
        // heptagon (1.8); the whole ring would put them on half a 12-gon (3.7).
        const six = RING.slice(0, 6);
        assert.isAbove(overMeanEdge(positionsOf(graph), six, "r0", "r5"), 4);
    });

    it("leaves out an edge the filter hides between two shown nodes", async () => {
        await ring(0);
        await session.visibility.addCondition({
            effect: "exclude",
            rule: { kind: "range", attribute: "data.weight", max: 0.5 },
        });
        await session.layout.set("graphviz-neato");
        await graph.waitForSettled();
        await graph.waitForStableFrame();

        // Every node shown, the closing edge hidden: a path, its ends far apart; with the hidden
        // edge still pulling, a ring, its ends one edge apart.
        assert.isAbove(overMeanEdge(positionsOf(graph), RING, "r0", "r11"), 3);
    });

    it("hands a third party's one-pass engine only the shown nodes", async () => {
        class ShownRing extends StaticLayoutEngine {
            static type = "test-shown-ring";
            static maxDimensions = 2;
            static descriptor = {
                id: "test-shown-ring",
                plainName: "Shown ring",
                technicalName: "Shown ring",
                description: "a ring over the nodes it is handed",
                family: "test",
                kind: "batch",
                maxDimensions: 2,
                sizeRating: "any",
                structuralInputs: [],
                options: [],
                engine: "test-shown-ring",
            } as const;

            doLayout(): void {
                const nodes = this._nodes;
                this.positions = {};
                nodes.forEach((node, i) => {
                    this.positions[node.id] = [
                        Math.cos((2 * Math.PI * i) / nodes.length),
                        Math.sin((2 * Math.PI * i) / nodes.length),
                    ];
                });
                this.stale = false;
            }
        }
        LayoutEngine.register(ShownRing);

        await ring();
        await session.visibility.set({ kind: "range", attribute: "data.v", min: 0.5 });
        await session.layout.set("test-shown-ring");
        await graph.waitForSettled();
        await graph.waitForStableFrame();

        assert.closeTo(overMeanEdge(positionsOf(graph), RING.slice(0, 6), "r0", "r5"), 1, 0.05);
    });

    it("draws a group round the members it shows, not round the ones hidden", async () => {
        const dot = `digraph { a -> b; subgraph clusterC { label="c"; m1; m2; m3; m1 -> m2; m2 -> m3; } b -> m1; m3 -> x1; x1 -> x2; }`;
        await session.data.import({ type: "dot", config: { data: dot } });
        await session.layout.set("circular");
        await graph.waitForSettled();
        await session.visibility.set({ kind: "member", of: { nodes: ["a", "b", "m1", "clusterC", "x1", "x2"] } });
        await graph.waitForSettled();
        await graph.waitForStableFrame();

        const box = graph.getLayoutManager().groupBox("clusterC");
        const m1 = positionsOf(graph).get("m1");
        assert.isDefined(box);
        assert.isDefined(m1);
        // Round m1 alone: centred on it, and reaching no hidden member.
        assert.closeTo(box?.center.x ?? Number.NaN, m1?.[0] ?? 0, 1e-3);
        assert.closeTo(box?.center.y ?? Number.NaN, m1?.[1] ?? 0, 1e-3);
    });

    it("builds no view and lays nothing out again while a load streams in with nothing hidden", async () => {
        await session.layout.set("circular");
        await graph.waitForSettled();
        let layoutsRun = 0;
        graph.addListener("layout-changed", () => {
            layoutsRun++;
        });
        const derivedBefore = derivedInputCounters.misses;

        for (let chunk = 0; chunk < 4; chunk++) {
            await session.data.addNodes(RING.map((id) => ({ id: `${id}-${String(chunk)}` })));
        }
        await graph.waitForSettled();

        assert.strictEqual(layoutsRun, 0, "nothing hidden: the layout follows the load, as without the working graph");
        assert.strictEqual(derivedInputCounters.misses, derivedBefore, "no compact graph was derived");
        const engine = graph.getLayoutManager().layoutEngine;
        assert.isNull(engine === undefined ? null : layoutEngineInternals.part(engine), "no part was cut");
        assert.strictEqual(positionsOf(graph).size, 4 * RING.length, "every node was laid out");
    });
});

describe("a layout over the working graph while the timeline moves", () => {
    const graphs: { graph: Graph; container: HTMLDivElement }[] = [];

    // The timeline is an experiment, switched on here for the graphs these tests build.
    beforeAll(() => {
        setDefaultFeatures(["timeline"]);
    });

    afterAll(() => {
        setDefaultFeatures([]);
    });

    afterEach(() => {
        for (const { graph, container } of graphs.splice(0)) {
            graph.dispose();
            container.remove();
        }
    });

    it("waits for the timeline to settle: a slide re-lays out nothing, a commit once, playing nothing", async () => {
        const { graph, container } = await emptyGraph();
        graphs.push({ graph, container });
        const session = graph.getSession() as ElementSession;
        session.config.setWorkingGraph("visible");
        await session.layout.setDimension("2d");
        await session.data.addNodes(RING.map((id, i) => ({ id, t: i })));
        await session.data.addEdges(RING.map((id, i) => ({ src: id, dst: RING[(i + 1) % RING.length] })));
        await session.time.setField({ nodes: { start: "data.t" } });
        await session.time.window({ from: 0, to: 5, mode: "cumulative" });
        await session.layout.set("circular");
        await graph.waitForSettled();
        let layoutsRun = 0;
        graph.addListener("layout-changed", () => {
            layoutsRun++;
        });

        await session.time.seek(8, { commit: false });
        await graph.waitForSettled();
        assert.strictEqual(layoutsRun, 0, "an uncommitted slide lays nothing out");

        await session.time.commit();
        await graph.waitForSettled();
        assert.strictEqual(layoutsRun, 1, "the commit lays the shown nodes out once");
        // What the committed window shows is laid out alone on a circle: its first and last are neighbours.
        const shown = RING.slice(0, session.data.working().nodeCount);
        assert.isAbove(shown.length, 6, "the window shows more than it did");
        assert.closeTo(overMeanEdge(positionsOf(graph), shown, "r0", shown[shown.length - 1]), 1, 0.05);

        session.time.play();
        await session.time.stepBy(1);
        await graph.waitForSettled();
        assert.strictEqual(layoutsRun, 1, "a step while playing lays nothing out");

        session.time.pause();
        await graph.waitForSettled();
        assert.strictEqual(layoutsRun, 2, "pausing lays out what playing left shown, once");
    });
});

describe("framing the working graph", () => {
    let graph: Graph;
    let container: HTMLDivElement;
    let session: ElementSession;

    beforeEach(async () => {
        ({ graph, container } = await emptyGraph());
        session = graph.getSession() as ElementSession;
        await session.layout.setDimension("2d");
        // Two clusters far apart: the filter shows one.
        await session.data.addNodes([
            { id: "a", position: { x: 0, y: 0 } },
            { id: "b", position: { x: 10, y: 0 } },
            { id: "far", position: { x: 5000, y: 0 } },
        ]);
        await session.layout.set("fixed");
        await graph.waitForSettled();
        await session.visibility.set({ kind: "member", of: { nodes: ["a", "b"] } });
        await graph.waitForSettled();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * How close the camera view `fitToGraph` comes, framing some nodes or, with none named, the
     * whole graph: the smaller the zoom, the wider the box framed.
     * @param nodes - The nodes to frame, if any.
     * @returns The 2D camera's zoom.
     */
    function framedZoom(nodes?: readonly string[]): number {
        return graph.resolveCameraPreset("fitToGraph", nodes === undefined ? undefined : { nodes }).zoom ?? Number.NaN;
    }

    it("frames every node in the documented mode, and only what is shown in the visible mode", async () => {
        const whole = framedZoom();
        const two = framedZoom(["a", "b"]);
        session.config.setWorkingGraph("visible");
        await graph.waitForSettled();

        assert.isBelow(whole, two / 10, "documented: the hidden node far away is framed too");
        assert.closeTo(framedZoom(), two, two * 1e-6, "visible: only the two shown nodes are framed");
        await graph.applyCameraView("fitToGraph", { scope: "graph", animate: false });
        assert.closeTo(graph.getCameraState().zoom ?? Number.NaN, whole, whole * 1e-6, "scope graph frames them all");
    });

    it("frames the selected nodes the filter shows, not one it hides", async () => {
        session.config.setWorkingGraph("visible");
        await graph.waitForSettled();
        await session.selection.apply({ nodes: ["a", "b", "far"] });

        await graph.applyCameraView("fitToGraph", { scope: "selection", animate: false });

        const two = framedZoom(["a", "b"]);
        assert.closeTo(
            graph.getCameraState().zoom ?? Number.NaN,
            two,
            two * 1e-6,
            "the hidden selected node is not framed",
        );
    });
});

describe("auto-framing follows a re-layout of the working graph", () => {
    for (const pivot of [false, true]) {
        it(`frames the shown nodes after a filter lays them out again${pivot ? ", pivoting on a selection with a hidden member" : ""}`, async () => {
            const { graph, container } = await emptyGraph();
            if (pivot) {
                graph.setLayoutBehavior({ camera: { pivotOnSelection: true } });
            }
            const session = graph.getSession() as ElementSession;
            session.config.setWorkingGraph("visible");
            await session.layout.setDimension("2d");
            const ring = Array.from({ length: 24 }, (_, index) => `n${String(index)}`);
            await session.data.addNodes(ring.map((id) => ({ id })));
            await session.data.addEdges(ring.map((id, index) => ({ src: id, dst: ring[(index + 1) % ring.length] })));
            await session.layout.set("circular");
            await graph.waitForSettled();
            await graph.waitForStableFrame();
            if (pivot) {
                await session.selection.apply({ nodes: ["n0", "n12"] });
                await graph.waitForStableFrame();
            }

            await session.visibility.set({ kind: "member", of: { nodes: ["n0", "n1", "n2"] } });
            await graph.waitForSettled();
            await graph.waitForStableFrame();

            const { width, height } = container.getBoundingClientRect();
            for (const id of ["n0", "n1", "n2"]) {
                const at = graph.nodeScreenPosition(id);
                assert.isDefined(at, id);
                assert.isTrue(
                    at !== undefined && at.x >= 0 && at.x <= width && at.y >= 0 && at.y <= height,
                    `${id} at ${JSON.stringify(at)} is on the ${String(width)} x ${String(height)} canvas`,
                );
            }
            graph.dispose();
            container.remove();
        });
    }
});
