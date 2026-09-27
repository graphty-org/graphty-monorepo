/**
 * @file The story assertion that an algorithm painted the picture tells algorithms apart.
 *
 * `assertAlgorithmPainted(scene, "graphty:dijkstra")` is how every algorithm story proves the
 * algorithm it names ran and is on screen. It used to ask whether ANY run in the session had
 * succeeded and whether ANY layer came from ANY run, so a story that ran degree passed an
 * assertion about Dijkstra. These cases are the two ways that went unnoticed: another algorithm
 * painted, and the named algorithm ran but its layers were never applied. The last case applies
 * them and requires the assertion to pass, so the first two are not failing for some other reason.
 */

import "../../src/algorithms";
import "../../index.ts";

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../src/graphty-element";
import { assertAlgorithmPainted, drawn } from "../../stories/assertions";
import { waitForGraphSettled } from "../../stories/helpers";

/** A path with a shortcut, so a route from A to E is a strict subset of the graph. */
const NODES = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }, { id: "E" }];
const EDGES = [
    { src: "A", dst: "B" },
    { src: "B", dst: "C" },
    { src: "C", dst: "D" },
    { src: "D", dst: "E" },
    { src: "A", dst: "C" },
];

/**
 * Whether a promise rejects.
 * @param work - The promise.
 * @returns True when it rejected.
 */
async function rejects(work: Promise<unknown>): Promise<boolean> {
    try {
        await work;
        return false;
    } catch {
        return true;
    }
}

describe("assertAlgorithmPainted", () => {
    let container: HTMLElement;
    let element: Graphty;

    beforeEach(async () => {
        container = document.createElement("div");
        container.style.width = "400px";
        container.style.height = "300px";
        document.body.appendChild(container);

        element = document.createElement("graphty-element");
        element.runAlgorithmsOnLoad = false;
        container.appendChild(element);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await waitForGraphSettled(container);
    });

    afterEach(() => {
        container.remove();
    });

    it("fails for an algorithm that did not paint, when another one did", async () => {
        await element.graph.run("degree");
        await element.waitForStableFrame();
        const scene = await drawn(container, "degree only");

        await assertAlgorithmPainted(scene, "graphty:degree", { paints: "node" });
        assert.isTrue(
            await rejects(assertAlgorithmPainted(scene, "graphty:dijkstra")),
            "degree painted, and the assertion that Dijkstra painted passed",
        );
    });

    it("fails for an algorithm that ran and whose layers were never applied, then passes once they are", async () => {
        await element.graph.run("degree");
        await element.graph.run("shortest-path", { source: "A", target: "E" }, { style: false });
        await element.waitForStableFrame();

        assert.isTrue(
            await rejects(assertAlgorithmPainted(await drawn(container, "unapplied"), "graphty:dijkstra")),
            "Dijkstra ran with its styling switched off, and the assertion that it painted passed",
        );

        assert.isTrue(element.graph.applySuggestedStyles("graphty:dijkstra"));
        await element.waitForStableFrame();
        await assertAlgorithmPainted(await drawn(container, "applied"), "graphty:dijkstra", { atLeast: 2 });
    });
});
