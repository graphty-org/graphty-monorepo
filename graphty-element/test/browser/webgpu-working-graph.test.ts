/**
 * An accelerated run over the working graph on a REAL WebGPU device: the device computes over
 * what is shown, not over the whole graph with the hidden values dropped afterwards. The rule is
 * pinned against the fake accelerator in `test/browser/working-graph-runs.test.ts`; this file
 * shows the real kernels, reached through the real `./webgpu` entry point, are handed the same
 * graph.
 *
 * It runs only when the run asked for hardware (`GRAPHTY_BROWSER_GPU`, see
 * `test/browser/webgpu-layout.test.ts`); otherwise the suite skips.
 */

import "../../src/graphty-element";
import "../../webgpu";

import { afterEach, assert, describe, it, vi } from "vitest";

import type { Graphty } from "../../index.js";

/** Which Chromium flag set the run asked for; empty when it asked for none. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/** A hub with five leaves and a triangle it touches; a degree-2 filter keeps the hub and the triangle. */
const NODES = ["a", "b", "c", "d", "l1", "l2", "l3", "l4", "l5"].map((id) => ({ id }));
const EDGES = [
    ["a", "l1"],
    ["a", "l2"],
    ["a", "l3"],
    ["a", "l4"],
    ["a", "l5"],
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["d", "b"],
].map(([source, target]) => ({ source, target }));

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

describe.skipIf(ADAPTER === "")("PageRank on the device over the working graph", () => {
    it("ranks the four shown nodes among themselves", async () => {
        const element = document.createElement("graphty-element") as unknown as Graphty & HTMLElement;
        element.style.display = "block";
        element.style.width = "400px";
        element.style.height = "300px";
        element.workingGraph = "visible";
        element.setAttribute("acceleration", "required");
        document.body.appendChild(element);
        mounted.push(element);
        await element.updateComplete;
        element.graph.acceleration.setMinNodes(0);
        element.nodeData = NODES;
        element.edgeData = EDGES;
        await vi.waitFor(() => {
            assert.strictEqual(element.session.data.statistics().nodeCount, 9);
        });
        await vi.waitFor(() => {
            assert.strictEqual(element.graph.acceleration.status.state, "active", "waiting for the device");
        });
        await element.session.visibility.set({ kind: "degree", min: 2 });

        const run = element.session.runs.start("pagerank", undefined, { style: false });
        await run;

        assert.strictEqual(run.caveats.precision, "f32", "the device did the work");
        const ranks = ["a", "b", "c", "d"].map((id) => run.result?.node(id)?.value as number);
        // Over the shown four the ranks share all of the mass; over the whole graph, with the
        // leaves' share dropped afterwards, they would not.
        assert.approximately(
            ranks.reduce((sum, rank) => sum + rank, 0),
            1,
            1e-4,
        );
        assert.isUndefined(run.result?.node("l1"));
    });
});
