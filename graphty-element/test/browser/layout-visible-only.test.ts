/**
 * @file `behavior.layout.visibleOnly`: a layout over only what the visibility filter shows. A
 * hidden node takes no slot in a one-pass layout and pulls on nothing in a force layout, it stays
 * where it was, and the layout runs again when the filter changes. Off, the default, a layout runs
 * over the whole graph as it always has.
 */

import "../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import type { ElementSession } from "../../src/session/types";

/** Twenty nodes on a path. */
const IDS = Array.from({ length: 20 }, (_, index) => `n${String(index)}`);

/** Every other node: what the filter below shows. */
const SHOWN = IDS.filter((_id, index) => index % 2 === 0);

/**
 * Put a graph on the page holding the twenty-node path.
 * @returns The graph and its container.
 */
async function pathGraph(): Promise<{ graph: Graph; container: HTMLDivElement }> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.addNodes(IDS.map((id) => ({ id })));
    await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })));
    await operationQueueOf(graph).waitForCompletion();
    return { graph, container };
}

/**
 * Where each node is now.
 * @param graph - The graph.
 * @returns Each node's x, y and z, by id.
 */
function positionsOf(graph: Graph): Map<string, [number, number, number]> {
    const engine = graph.getLayoutManager().layoutEngine;
    const out = new Map<string, [number, number, number]>();
    for (const node of graph.getDataManager().nodes.values()) {
        // A node the working graph hides was never handed to the engine: it is where it was.
        const at = engine === undefined ? undefined : layoutEngineInternals.positionOf(engine, node);
        if (at !== undefined) {
            out.set(String(node.id), [at.x, at.y, at.z ?? 0]);
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

describe("a layout over only what the filter shows", () => {
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

    it("gives a hidden node no slot on a circle, and leaves it where it was", async () => {
        await graph.setLayout("circular", { dim: 2 });
        await show(SHOWN);
        const before = positionsOf(graph);

        graph.setLayoutBehavior({ layout: { visibleOnly: true } });
        await graph.waitForSettled();
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

    it("runs the whole graph by default, hidden nodes keeping their slots", async () => {
        await graph.setLayout("circular", { dim: 2 });
        const five = ["n0", "n1", "n2", "n3", "n4"];
        await show(five);
        await graph.setLayout("circular", { dim: 2, scale: 1.5 });

        // Five neighbouring nodes of a twenty-slot circle are 18 degrees apart.
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), five)), 18, 0.5);
    });

    it("lays the graph out once per filter change, and not at all with the behaviour off", async () => {
        await graph.setLayout("circular", { dim: 2 });
        layoutsRun = 0;

        await show(SHOWN);
        assert.strictEqual(layoutsRun, 0, "off: a filter change runs no layout");

        graph.setLayoutBehavior({ layout: { visibleOnly: true } });
        await graph.waitForSettled();
        assert.strictEqual(layoutsRun, 1, "switching it on lays out what is shown");

        await show(SHOWN.slice(0, 4));
        assert.strictEqual(layoutsRun, 2, "a new filter lays out once");

        await show(SHOWN.slice(0, 4));
        assert.strictEqual(layoutsRun, 2, "the same nodes shown again run nothing");

        graph.setLayoutBehavior({ layout: { visibleOnly: false } });
        await graph.waitForSettled();
        assert.strictEqual(layoutsRun, 3, "switching it off lays out the whole graph");
    });

    it("lays out once for the filter changes that arrive while a layout is being built, as a play's frames do", async () => {
        await graph.setLayout("circular", { dim: 2 });
        graph.setLayoutBehavior({ layout: { visibleOnly: true } });
        await graph.waitForSettled();
        layoutsRun = 0;

        // A layout being built holds the queue; every change after it is one waiting relayout.
        const building = graph.setLayout("circular", { dim: 2 });
        const changes = [6, 5, 4, 3].map((count) =>
            session.visibility.set({ kind: "member", of: { nodes: SHOWN.slice(0, count) } }),
        );
        await Promise.all([building, ...changes]);
        await graph.waitForSettled();
        assert.strictEqual(layoutsRun, 2, "the layout asked for, then one relayout for the four changes");
        // The last filter's three nodes on a circle of their own, 120 degrees apart.
        assert.closeTo(smallestGap(anglesOf(positionsOf(graph), SHOWN.slice(0, 3))), 120, 0.5);
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
 * @param visibleOnly - Whether the layout runs over what is shown only.
 * @param hidden - What is hidden: n4 and n6 pinned at an x, a clique beside the path, or nothing.
 * @returns The path's positions, in its order.
 */
async function shownPath(layout: string, visibleOnly: boolean, hidden: Hidden): Promise<number[][]> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    try {
        await graph.init();
        graph.setLayoutBehavior({ layout: { visibleOnly } });
        await graph.setLayout(layout, { seed: 3 });
        const clique = hidden.kind === "clique" ? CLIQUE : [];
        await graph.addNodes([...IDS, ...clique].map((id) => ({ id })));
        await graph.addEdges([
            ...IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id })),
            ...clique.flatMap((a, i) => clique.slice(i + 1).map((b) => ({ src: a, dst: b }))),
        ]);
        const session = graph.getSession() as ElementSession;
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

describe("a force layout over only what the filter shows", () => {
    // ngraph and d3 pull a node toward its neighbours: moving the hidden ones must not move it.
    for (const layout of ["ngraph", "d3"]) {
        it(`does not let hidden neighbours pull a shown node under ${layout}`, async () => {
            const pull = async (visibleOnly: boolean): Promise<number> =>
                farthest(
                    await shownPath(layout, visibleOnly, { kind: "pinned-neighbours", x: 2000 }),
                    await shownPath(layout, visibleOnly, { kind: "pinned-neighbours", x: -2000 }),
                );

            const whole = await pull(false);
            const visible = await pull(true);

            assert.isAbove(whole, 100, "over the whole graph, moving the hidden neighbours moves the path");
            // Not zero: the hidden bodies are still in the simulation's space partition, which only
            // changes how its repulsion is approximated.
            assert.isBelow(visible, 2, "over what is shown, nothing hidden pulls the path");
        });
    }

    // The simulations' own scale follows the drawing, so a far pin moves little; a hidden clique
    // beside the path is what pushes it about.
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

/**
 * Lay the twenty-node path out with d3, its middle edge (n9 to n10) hidden by an edge filter that
 * shows every node, and read how far apart the two ends of that edge settle.
 * @param visibleOnly - Whether the layout runs over what is shown only.
 * @returns The distance between n9 and n10.
 */
async function cutEdgeLength(visibleOnly: boolean): Promise<number> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    try {
        await graph.init();
        graph.setLayoutBehavior({ layout: { visibleOnly } });
        await graph.addNodes(IDS.map((id) => ({ id })));
        await graph.addEdges(IDS.slice(1).map((id, index) => ({ src: IDS[index], dst: id, cut: id === "n10" })));
        const session = graph.getSession() as ElementSession;
        await session.visibility.set({ kind: "not", of: { kind: "edges", where: "data.cut == `true`" } });
        assert.strictEqual(session.visibility.nodes.size, IDS.length, "the edge filter shows every node");
        assert.strictEqual(session.visibility.edges.size, IDS.length - 2, "and hides one edge");

        await graph.setLayout("d3", { seed: 3 });
        await graph.waitForStableFrame();
        const at = positionsOf(graph);
        const [a, b] = [at.get("n9"), at.get("n10")].map((p) => p ?? [Number.NaN, Number.NaN, Number.NaN]);
        return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    } finally {
        graph.dispose();
        container.remove();
    }
}

describe("a layout over only the edges the filter shows", () => {
    it("lets an edge the filter hides between two shown nodes pull nothing", async () => {
        const whole = await cutEdgeLength(false);
        const visible = await cutEdgeLength(true);

        // Held by its link, the cut pair sits a link apart; without it the two halves push apart.
        assert.isAbove(visible, whole * 2, `the hidden edge pulled nothing (${String(visible)} vs ${String(whole)})`);
    });
});
