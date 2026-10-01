/**
 * @file The derived inputs of scoped runs on a REAL WebGPU device: every snapshot a scoped run
 * hands the accelerator is released exactly once, across repeated runs, a re-freeze and teardown.
 *
 * The rule itself is pinned in the default project against the shared fake
 * (`test/algorithms/input/device-release.test.ts`). What a fake cannot say is that the real
 * accelerator the `./webgpu` entry point registers is the one that receives the uploads and the
 * releases, so this file drives it. It runs only when the run asked for hardware
 * (`GRAPHTY_BROWSER_GPU`), exactly as `test/browser/webgpu-layout.test.ts` does, and it gates
 * nothing.
 */

import "../../../src/graphty-element";
import "../../../webgpu";

import type { GraphSnapshot } from "@graphty/graph-format";
import { afterAll, assert, describe, it } from "vitest";

import { Algorithm } from "../../../src/algorithms/Algorithm";
import { derivedInputsOf, withRunInput } from "../../../src/algorithms/input/ScopedInput";
import { scopeResolverOfSession } from "../../../src/session/GraphSession";
import { storyGraph } from "../../helpers/story-graph";

/** Which Chromium flag set the run asked for; empty when it asked for none. */
const ADAPTER = (import.meta.env as Record<string, string | undefined>).GRAPHTY_BROWSER_GPU ?? "";

/** Whether this run has a WebGPU device to talk to at all. */
const GPU_LANE = ADAPTER !== "";

const GRAPH = storyGraph(150, 250);

/** Elements mounted by this file. */
const mounted: HTMLElement[] = [];

/** A test algorithm that computes PageRank over its scope through `accelerated()`. */
class ScopedRank extends Algorithm {
    static namespace = "test";
    static type = "scoped-rank-device";
    static scopeInput = "subgraph" as const;

    run(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Rank the scope on the device.
     * @returns The snapshot the device computed over.
     */
    async rank(): Promise<GraphSnapshot> {
        const { run, snapshot } = this.accelerated("pageRank", "directed");
        await run((dispatch, s) => dispatch.pageRank(s));

        return snapshot;
    }
}

/**
 * Waits for a condition, once per animation frame.
 * @param predicate - The condition.
 * @param what - Named in the failure.
 * @param budgetMs - How long to wait.
 */
async function until(predicate: () => boolean, what: string, budgetMs: number): Promise<void> {
    const deadline = performance.now() + budgetMs;
    while (performance.now() < deadline) {
        if (predicate()) {
            return;
        }

        await new Promise((resolve) => {
            requestAnimationFrame(resolve);
        });
    }

    throw new Error(`timed out waiting for ${what}`);
}

afterAll(() => {
    while (mounted.length > 0) {
        mounted.pop()?.remove();
    }
});

describe.skipIf(!GPU_LANE)("scoped runs on a real WebGPU device", () => {
    it("releases every derived input it uploaded, once", { timeout: 120_000 }, async () => {
        const element = document.createElement("graphty-element");
        element.style.width = "400px";
        element.style.height = "300px";
        element.style.display = "block";
        element.setAttribute("acceleration", "required");
        element.nodeData = GRAPH.nodes;
        element.edgeData = GRAPH.edges;
        document.body.appendChild(element);
        mounted.push(element);
        await element.updateComplete;
        const { graph } = element;
        await until(() => graph.getDataManager().nodes.size === GRAPH.nodes.length, "the data", 30_000);
        await until(() => graph.acceleration.accelerator !== null, "an accelerator", 30_000);

        // Spy on the real accelerator: what its PageRank member is handed, and what it is told to free.
        const accelerator = graph.acceleration.accelerator as Record<string, unknown>;
        const uploaded = new Set<GraphSnapshot>();
        const released: GraphSnapshot[] = [];
        const pageRank = accelerator.pageRank as (snapshot: GraphSnapshot, ...rest: unknown[]) => Promise<unknown>;
        const release = accelerator.release as (snapshot: GraphSnapshot) => void;
        accelerator.pageRank = (snapshot: GraphSnapshot, ...rest: unknown[]) => {
            uploaded.add(snapshot);
            return pageRank.call(accelerator, snapshot, ...rest);
        };
        accelerator.release = (snapshot: GraphSnapshot) => {
            released.push(snapshot);
            release.call(accelerator, snapshot);
        };

        const members = GRAPH.nodes.slice(0, 60).map((node) => node.id);
        const run = async (): Promise<GraphSnapshot> => {
            const algorithm = new ScopedRank(graph);
            return withRunInput(
                algorithm,
                graph,
                () => scopeResolverOfSession(graph.getSession()).resolutionOf({ nodes: members }),
                undefined,
                () => algorithm.rank(),
            );
        };

        const first = await run();
        assert.strictEqual(await run(), first, "a repeated scope reuses the uploaded input");

        await graph.addNodes([{ id: "late" }]);
        await until(
            () => graph.getDataManager().getSnapshot().nodeCount === GRAPH.nodes.length + 1,
            "the freeze",
            30_000,
        );
        await run();

        derivedInputsOf(graph).dispose();
        const derived = [...uploaded].filter((snapshot) => snapshot.nodeCount === members.length);
        assert.strictEqual(derived.length, 2, "one input per snapshot");
        for (const snapshot of derived) {
            assert.strictEqual(released.filter((freed) => freed === snapshot).length, 1, "released exactly once");
        }
    });
});
