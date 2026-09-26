/**
 * @file Naming an algorithm last in `applySuggestedStyles` puts its picture on top.
 *
 * WHAT THIS EXISTS TO CATCH, in the words the failure used. The story
 * `Algorithms/Combined CentralityVsCommunity` colours twenty nodes by community (Louvain) and
 * asks for PageRank beside it, and its own comment states the rule it depends on: "Louvain is
 * applied last and wins the colour, so the picture holds one colour per community rather than
 * one per PageRank score." It failed three runs in four with
 *
 *     draws exactly the same picture as "Algorithms/Combined DegreeAndPageRank" -- same shapes,
 *     sizes, colours, opacities and labels on every node.
 *
 * Two algorithms of the same shape suggest the SAME channel: a node metric and a community both
 * paint `node.color`. Which of them a reader ends up looking at is therefore decided entirely by
 * which layer sits higher in the stack -- and the element put them in the stack in the order the
 * RUNS FINISHED, because each run styles itself on first completion. `applySuggestedStyles` then
 * replaced each layer in place, keeping the finishing order, so the list a consumer passed was
 * not the order they were painted in. PageRank finishing last painted a PageRank picture out of
 * a call that asked for a Louvain one, and the story that promised a different picture from its
 * sibling drew the identical one.
 *
 * So both directions are asserted below, over the same pair of runs finished in the same order.
 * Only the order of the two names changes, and that alone must decide the picture. A fix that
 * simply reversed the stack would pass one of these two and fail the other.
 */

import "../../src/algorithms";

import type { InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Channel } from "../../src/catalog/types";
import { Graph } from "../../src/Graph";
import type { ElementSession } from "../../src/session";

/** How many communities the graph is built out of. */
const GROUPS = 4;

/** How many nodes are in each one, so every community is a triangle and none is a lone node. */
const PER_GROUP = 3;

/** The nodes, named for the community they belong to. */
const NODES = Array.from({ length: GROUPS * PER_GROUP }, (_unused, index) => ({
    id: `g${String(Math.floor(index / PER_GROUP))}n${String(index % PER_GROUP)}`,
}));

/** A triangle inside each community, and one thin link between neighbouring communities. */
const EDGES = [
    ...Array.from({ length: GROUPS }, (_unused, group) =>
        Array.from({ length: PER_GROUP }, (_ignored, seat) => ({
            src: `g${String(group)}n${String(seat)}`,
            dst: `g${String(group)}n${String((seat + 1) % PER_GROUP)}`,
            weight: 1,
        })),
    ).flat(),
    ...Array.from({ length: GROUPS - 1 }, (_unused, group) => ({
        src: `g${String(group)}n0`,
        dst: `g${String(group + 1)}n0`,
        weight: 1,
    })),
];

/** The channel both a node metric and a community paint, which is why they compete at all. */
const COLOR: Channel = "node.color";

describe("the last algorithm named in applySuggestedStyles", () => {
    let container: HTMLElement;
    let graph: Graph;
    let session: ElementSession;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "800px";
        container.style.height = "600px";
        document.body.appendChild(container);
        graph = new Graph(container);
        await graph.init();

        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await graph.operationQueue.waitForCompletion();
        session = graph.getSession() as ElementSession;

        // FINISHED IN A FIXED ORDER, AND THAT IS THE POINT. Each is awaited, so PageRank
        // completes first and styles itself first, which leaves Louvain's layer above it. Every
        // assertion below starts from this one stack, so the only thing that differs between
        // them is the order of the two names passed to applySuggestedStyles.
        await graph.run("pagerank");
        await graph.run("louvain");
        await graph.operationQueue.waitForCompletion();
        await session.styles.settled();
    });

    afterEach(() => {
        graph.dispose();
        container.remove();
    });

    /**
     * Which algorithm's layer is the one a reader is looking at on a node's colour.
     * @param nodeId - The node to read.
     * @returns The algorithm key of the topmost layer painting that node's colour.
     */
    const paintingColour = (nodeId: string): string => {
        const winner = session.styles.explain({ node: nodeId }).channels.find((entry) => entry.channel === COLOR);

        assert.isDefined(winner, `nothing painted ${COLOR} on ${nodeId}, so neither run's picture is on screen`);

        const layer = session.styles.list().find((entry) => entry.id === winner.layerId);

        assert.isDefined(layer, "the channel names a layer that is not in the stack");

        const { source } = layer;

        return source.by === "run" ? source.algorithm : `not a run: ${source.by}`;
    };

    it("wins the channel when it is named second", async () => {
        assert.isTrue(
            graph.applySuggestedStyles(["graphty:louvain", "graphty:pagerank"]),
            "neither finished run had anything to paint",
        );
        await graph.operationQueue.waitForCompletion();
        await session.styles.settled();

        assert.strictEqual(
            paintingColour(NODES[0].id),
            "pagerank",
            'applySuggestedStyles(["graphty:louvain", "graphty:pagerank"]) names PageRank last, so a PageRank ' +
                "colour is what a reader must be looking at. Louvain winning means the stack kept the order the " +
                "runs FINISHED in rather than the order the caller asked for, which makes the picture a race.",
        );
    });

    /**
     * Hold every reordering move back before it reaches the queue, so the queue is certainly
     * idle before the moves arrive. A wait that holds only because of when microtasks happen to
     * run then fails, and one that waits for the moves themselves does not.
     * @param ms - How long to hold each move.
     */
    const holdMoves = (ms: number): void => {
        const { styles } = session;
        const move = styles.move.bind(styles);

        (styles as { move: (...args: Parameters<typeof styles.move>) => PromiseLike<void> }).move = async (
            ...args
        ) => {
            await new Promise((resolve) => setTimeout(resolve, ms));

            return move(...args);
        };
    };

    it("is on top once waitForSettled alone has settled, however late the reorder is queued", async () => {
        holdMoves(300);

        assert.isTrue(graph.applySuggestedStyles(["graphty:louvain", "graphty:pagerank"]));
        await graph.waitForSettled();

        assert.strictEqual(
            paintingColour(NODES[0].id),
            "pagerank",
            "waitForSettled returned before the reordering moves had run",
        );
    });

    it("is on top and painted once waitForStableFrame alone has settled", async () => {
        // No queue drain and no `styles.settled()`: waitForStableFrame is the documented wait.
        holdMoves(0);

        assert.isTrue(graph.applySuggestedStyles(["graphty:louvain", "graphty:pagerank"]));
        await graph.waitForStableFrame();

        assert.strictEqual(paintingColour(NODES[0].id), "pagerank", "the reorder had not happened yet");

        const byAlgorithm = new Map<string, unknown>();

        for (const entry of session.styles.explain({ node: NODES[0].id }).contributions) {
            const source = session.styles.list().find((layer) => layer.id === entry.layerId)?.source;

            if (source?.by === "run") {
                byAlgorithm.set(source.algorithm, entry.values[COLOR]);
            }
        }

        /** A painted colour, as the channel stores it: 0-255 components. */
        type Rgba = { r: number; g: number; b: number };
        const wanted = byAlgorithm.get("pagerank") as Rgba | undefined;
        const other = byAlgorithm.get("louvain") as Rgba | undefined;

        assert.isDefined(wanted, "PageRank painted no colour on the node");
        assert.isDefined(other, "Louvain painted no colour on the node");
        assert.notDeepEqual(wanted, other, "the two pictures agree on this node, so it proves nothing");

        const node = graph.getNode(NODES[0].id);
        assert.isDefined(node);
        const drawn = (node.mesh as InstancedMesh).instancedBuffers.color as Rgba | undefined;
        assert.isDefined(drawn, "the node's mesh carries no colour");

        for (const component of ["r", "g", "b"] as const) {
            assert.approximately(
                drawn[component],
                wanted[component] / 255,
                0.01,
                `the mesh is not drawn in PageRank's colour: ${JSON.stringify(drawn)} against ${JSON.stringify(wanted)}`,
            );
        }
    });

    it("loses the channel when it is named first", async () => {
        assert.isTrue(
            graph.applySuggestedStyles(["graphty:pagerank", "graphty:louvain"]),
            "neither finished run had anything to paint",
        );
        await graph.operationQueue.waitForCompletion();
        await session.styles.settled();

        assert.strictEqual(
            paintingColour(NODES[0].id),
            "louvain",
            'applySuggestedStyles(["graphty:pagerank", "graphty:louvain"]) names Louvain last, so a community ' +
                "colour is what a reader must be looking at.",
        );
    });

    it("leaves one layer per run behind, however many times it is called", async () => {
        graph.applySuggestedStyles(["graphty:pagerank", "graphty:louvain"]);
        graph.applySuggestedStyles(["graphty:louvain", "graphty:pagerank"]);
        await graph.operationQueue.waitForCompletion();
        await session.styles.settled();

        const fromRuns = session.styles.list().filter((layer) => layer.source.by === "run");

        assert.strictEqual(
            fromRuns.length,
            2,
            `two runs left ${String(fromRuns.length)} layers in the stack. Re-applying a suggestion replaces the ` +
                "layer already bound to that run and channel; a reorder that added a second copy would leave one " +
                "of them invisible under the other and a legend with two blocks for one picture.",
        );
    });
});
