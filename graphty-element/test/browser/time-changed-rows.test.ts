/**
 * A step of the time window drawn by its changed rows, on real nodes and edges: after seeded steps
 * everything is drawn as the masks say, and what a step does not change is not touched.
 * test/mesh-testing/view-masks-changed-rows.test.ts counts the same pass on a larger graph.
 */
import "../../src/graphty-element";

import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";
import { Edge } from "../../src/Edge";
import { setDefaultFeatures } from "../../src/features/resolve";
import { STARTING_GHOST_LOOK } from "../../src/session/styles/rows";
import type { ElementSession } from "../../src/session/types";

// The timeline is an experiment: this file's sessions switch it on.
beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

const NODES = 300;
const EDGES = 1_500;
/** The size a Ghost step is counted at. */
const LARGE = { nodes: 2_000, edges: 10_000 };

let mounted: Graphty | null = null;

afterEach(() => {
    vi.restoreAllMocks();
    mounted?.remove();
    mounted = null;
});

/**
 * A graph whose edge i is timed i, its window sliding, with the first slide drawn.
 * @param prepare - Runs on the session before the window opens.
 * @param size - How many nodes and edges.
 * @param size.nodes - The node count.
 * @param size.edges - The edge count.
 * @returns The element.
 */
async function slidingElement(
    prepare?: (element: Graphty) => Promise<void>,
    { nodes, edges } = { nodes: NODES, edges: EDGES },
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.width = "400px";
    element.style.height = "300px";
    element.style.display = "block";
    element.viewMode = "2d";
    element.setAttribute("edge-time-path", "t");
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await vi.waitFor(() => {
        assert.isTrue(element.graph.initialized, "the element initialised its graph");
    });
    await element.graph.setLayout("random");
    element.dataSource = "json";
    element.dataSourceConfig = {
        data: JSON.stringify({
            nodes: Array.from({ length: nodes }, (_, at) => ({ id: `n${String(at)}` })),
            edges: Array.from({ length: edges }, (_, at) => ({
                src: `n${String(at % nodes)}`,
                dst: `n${String((at * 7 + 1 + Math.floor(at / nodes)) % nodes)}`,
                t: at,
            })),
        }),
    };
    await element.waitForSettled();
    await element.session.time.ready;
    await prepare?.(element);
    await element.session.time.window({ from: 0, to: 100, step: 10, nodes: "ends" });
    await element.session.time.seek(5, { commit: false });
    await drawn(element);
    return element;
}

/**
 * Wait for what the masks say to reach the picture.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await element.waitForSettled();
    await element.waitForStableFrame();
}

/**
 * Assert every node and edge is drawn as the session's visibility says.
 * @param element - The element.
 * @param when - What just happened, for the message.
 */
function assertDrawnAsVisible(element: Graphty, when: string): void {
    const { visibility } = element.session;
    const dm = element.graph.getDataManager();
    for (const node of dm.nodes.values()) {
        assert.strictEqual(node.mesh.isEnabled(), visibility.isVisible(node.id), `${when}: node ${String(node.id)}`);
    }

    for (const edge of dm.edges.values()) {
        assert.strictEqual(edge.isRenderVisible(), visibility.isVisible(edge.id), `${when}: edge ${edge.id}`);
    }
}

/**
 * Assert every drawn edge is drawn between its two nodes where they are now.
 * @param element - The element.
 * @param when - What just happened, for the message.
 */
function assertEdgesOnNodes(element: Graphty, when: string): void {
    for (const edge of element.graph.getDataManager().edges.values()) {
        const line = edge.drawnLine;
        if (edge.isRenderVisible() && line !== null && edge.srcNode !== edge.dstNode) {
            const src = edge.srcNode.mesh.position;
            const dst = edge.dstNode.mesh.position;
            const off = Math.abs(line.centre.x - (src.x + dst.x) / 2) + Math.abs(line.centre.y - (src.y + dst.y) / 2);
            assert.isAtMost(off, 0.5, `${when}: edge ${edge.id} sits between its nodes`);
        }
    }
}

/**
 * Draw what is outside the window as ghosts, with the starting Ghost row.
 * @param element - The element.
 */
async function drawGhosts({ session }: Graphty): Promise<void> {
    await session.config.set({ startingRows: true });
    await session.time.setSettings({ outside: "ghost" });
}

/**
 * Whether each node is a ghost now.
 * @param element - The element.
 * @returns Each node's state.
 */
function nodeGhosts(element: Graphty): ReadonlyMap<Edge["srcNode"], boolean> {
    const { visibility } = element.session as ElementSession;
    return new Map(
        [...element.graph.getDataManager().nodes.values()].map((node) => [
            node,
            visibility.ghosted("node", node.index),
        ]),
    );
}

/**
 * How many edge ends sit on the nodes that became or stopped being ghosts.
 * @param element - The element.
 * @param before - {@link nodeGhosts} before the step.
 * @returns The sum of those nodes' degrees.
 */
function edgeEndsOnChangedNodes(element: Graphty, before: ReadonlyMap<Edge["srcNode"], boolean>): number {
    const now = nodeGhosts(element);
    const changed = (node: Edge["srcNode"]): number => Number(before.get(node) !== now.get(node));
    let ends = 0;
    for (const edge of element.graph.getDataManager().edges.values()) {
        ends += changed(edge.srcNode) + changed(edge.dstNode);
    }

    return ends;
}

describe("changed rows on real nodes and edges", () => {
    it("draws seeded steps, three between frames, as the masks say, and writes only what moved", async () => {
        const element = await slidingElement();
        const write = vi.spyOn(Edge.prototype, "setRenderVisible");
        let state = 11;
        const next = (): number => {
            state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
            return state / 4_294_967_296;
        };

        let from = 5;
        for (let frame = 0; frame < 12; frame++) {
            write.mockClear();
            let moved = 0;
            for (let slide = 0; slide < 3; slide++) {
                from += Math.floor(next() * 20);
                const step = await element.session.time.seek(from, { commit: false });
                moved += step.entered.edges + step.left.edges;
            }

            await drawn(element);
            assertDrawnAsVisible(element, `frame ${String(frame)}`);
            assertEdgesOnNodes(element, `frame ${String(frame)}`);
            assert.isAtMost(write.mock.calls.length, moved, `frame ${String(frame)} wrote only moved rows`);
        }
    });

    it("lands on the right objects after a removal renumbers the rows", async () => {
        const element = await slidingElement();
        await element.session.data.removeNodes(["n0", "n150"]);
        await drawn(element);
        for (const from of [20, 25, 30, 200, 205]) {
            await element.session.time.seek(from, { commit: false });
            await drawn(element);
            assertDrawnAsVisible(element, `after the removal, at ${String(from)}`);
        }
    });

    it("shows where a node moved while it was out of the window, on reveal", async () => {
        const element = await slidingElement();
        await element.session.time.seek(500, { commit: false });
        await drawn(element);
        const { visibility } = element.session;
        const shown = (id: string): boolean => visibility.isVisible(id);
        const away = ["n0", "n1", "n2", "n3", "n4"].filter((id) => !shown(id));
        assert.isNotEmpty(away, "nodes out of the window");
        await element.session.positions.set(away.map((id, at) => ({ id, x: 33 + at, y: -21, z: 0 })));
        await element.session.time.seek(505, { commit: false });
        await element.session.time.seek(5, { commit: false });
        await drawn(element);
        assert.isTrue(away.some(shown), "back in the window");
        assertEdgesOnNodes(element, "on reveal");
    });

    it("paints a Ghost step on the rows it moved, with no walk of every edge", async () => {
        const element = await slidingElement(drawGhosts, LARGE);
        const { graph } = element;
        const session = element.session as ElementSession;
        await session.time.seek(25, { commit: false });
        await drawn(element);

        const walk = vi.spyOn(graph.getUpdateManager(), "forceEdgeWalk");
        const update = vi.spyOn(Edge.prototype, "update");
        const paint = vi.spyOn(Edge.prototype, "applySessionPaint");
        const write = vi.spyOn(Edge.prototype, "setRenderVisible");
        const ghostsBefore = nodeGhosts(element);
        const step = await session.time.seek(45, { commit: false });
        await drawn(element);

        const painted = step.entered.edges + step.left.edges;
        const incident = edgeEndsOnChangedNodes(element, ghostsBefore);
        assert.isAbove(incident, 0, "the step changed nodes that have edges");
        assert.isAbove(step.entered.edges, 0);
        assert.strictEqual(walk.mock.calls.length, 0);
        assert.strictEqual(write.mock.calls.length, 0, "a ghost stays drawn, so nothing is shown or hidden");
        assert.strictEqual(paint.mock.calls.length, painted);
        // A node's opacity is part of its mesh key, so a node changing look is rebuilt and its edges placed.
        assert.isAtMost(update.mock.calls.length, painted + incident);

        const painter = graph.getStylePainter();
        for (const edge of graph.getDataManager().edges.values()) {
            const ghost = session.visibility.ghosted("edge", edge.index);
            const { opacity } = painter.edgePaint(edge.index)?.style.line ?? {};
            assert.strictEqual(opacity === STARTING_GHOST_LOOK["edge.opacity"], ghost, `edge ${edge.id}`);
            assert.isTrue(edge.isRenderVisible(), "a ghost stays drawn");
            assert.strictEqual(edge.drawnLine?.visibility === STARTING_GHOST_LOOK["edge.opacity"], ghost, "as drawn");
        }
    });

    it("places the edges of a node a Ghost step resized, and only those, with no walk", async () => {
        const element = await slidingElement(async (mountedElement) => {
            await drawGhosts(mountedElement);
            await mountedElement.session.styles.add({
                name: "Small ghosts",
                target: "node",
                selector: { match: "state", state: "ghosted" },
                set: { "node.size": 0.25 },
            });
        }, LARGE);
        const { graph } = element;
        const session = element.session as ElementSession;
        await session.time.seek(25, { commit: false });
        await drawn(element);

        const edges = [...graph.getDataManager().edges.values()];
        const ghostEnds = (edge: Edge): number =>
            Number(session.visibility.ghosted("node", edge.srcNode.index)) +
            Number(session.visibility.ghosted("node", edge.dstNode.index));
        const before = edges.map((edge) => ({ ghosts: ghostEnds(edge), length: edge.drawnLine?.length ?? 0 }));
        const ghostsBefore = nodeGhosts(element);

        const walk = vi.spyOn(graph.getUpdateManager(), "forceEdgeWalk");
        const update = vi.spyOn(Edge.prototype, "update");
        const step = await session.time.seek(45, { commit: false });
        await drawn(element);

        const incident = edgeEndsOnChangedNodes(element, ghostsBefore);
        assert.isAbove(incident, 0, "the step resized nodes that have edges");
        assert.strictEqual(walk.mock.calls.length, 0);
        assert.isAtMost(update.mock.calls.length, step.entered.edges + step.left.edges + incident);

        let compared = 0;
        edges.forEach((edge, at) => {
            const { ghosts, length } = before[at];
            const now = ghostEnds(edge);
            // Two nodes that overlap leave no line to measure.
            if (now !== ghosts && edge.srcNode.mesh.position.subtract(edge.dstNode.mesh.position).length() > 4) {
                compared++;
                const drawnNow = edge.drawnLine?.length ?? 0;
                // A node that shrinks gives its edges more line, and one that grows takes some back.
                assert.strictEqual(drawnNow > length, now > ghosts, `edge ${edge.id} stops at the new size`);
            }
        });
        assert.isAbove(compared, 0, "some edge's ends changed size");
    });

    it("draws an edge bowed by a support point when a step reveals it, through a walk", async () => {
        const element = await slidingElement(async ({ session }) => {
            await session.styles.add({
                name: "Bowed",
                target: "edge",
                selector: { match: "everything" },
                set: { "edge.curvature": true, "edge.supportModel": "barnesHut", "edge.supportUnit": 0.32 },
            });
        });
        const { graph } = element;
        const { visibility } = element.session;
        const edges = [...graph.getDataManager().edges.values()];
        const hidden = edges.filter((edge) => !visibility.isVisible(edge.id));
        const walk = vi.spyOn(graph.getUpdateManager(), "forceEdgeWalk");

        const step = await element.session.time.seek(25, { commit: false });
        await drawn(element);

        const revealed = hidden.filter((edge) => edge.isRenderVisible());
        assert.strictEqual(revealed.length, step.entered.edges);
        assert.isAbove(revealed.length, 0);
        assert.isAbove(walk.mock.calls.length, 0, "only a walk tells the support points of a revealed edge");
        const { supportPoints } = graph.getDataManager();
        for (const edge of revealed) {
            const point = supportPoints.pointOf(edge);
            const line = edge.drawnLine;
            assert.isNotNull(point, `edge ${edge.id} has a support point`);
            assert.isNotNull(line);
            if (point !== null && line !== null) {
                const src = edge.srcNode.mesh.position;
                const dst = edge.dstNode.mesh.position;
                const bow = Math.hypot(line.centre.x - (src.x + dst.x) / 2, line.centre.y - (src.y + dst.y) / 2);
                assert.isAbove(bow, 0.01, `edge ${edge.id} is drawn bowed`);
            }
        }
    });
});
