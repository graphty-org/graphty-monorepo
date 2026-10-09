/**
 * @file The Algorithms/Combined DegreeAndPageRank picture, asked for without waiting on anything.
 *
 * The story colours nodes by Degree and sizes them by PageRank: it applies both algorithms'
 * suggested styles and then encodes `node.size` from the PageRank run. One sweep drew it with no
 * node sizes at all. A whole-graph repaint that read the style stack when it was ASKED for, and ran
 * after a later edit had painted, would draw exactly that: the size layer listed in the stack and
 * painted nowhere. Each cell here issues the suggestions and the size encoding and does not await
 * them -- once as soon as the PageRank run ends (while its own suggestion is still being painted),
 * once after the runs have settled -- resumes at a different point, waits on the element's door,
 * and reads the size the style pass painted on every node.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

/*
 * A value import: importing the package is what defines the `<graphty-element>` custom element.
 */
import { Graphty } from "../../src/graphty-element";
import type { RunChange } from "../../src/session/runs/types";
import { paintOf } from "../helpers/paint-assertions";

/** A star with a tail, so degree and PageRank both vary and a constant size cannot pass. */
const NODES = ["hub", "a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
const EDGES = [
    { src: "hub", dst: "a" },
    { src: "hub", dst: "b" },
    { src: "hub", dst: "c" },
    { src: "hub", dst: "d" },
    { src: "d", dst: "e" },
    { src: "e", dst: "f" },
];
const JSON_DOCUMENT = JSON.stringify({ nodes: NODES, edges: EDGES });

const MOUNT_TIMEOUT_MS = 10000;
const TEST_TIMEOUT_MS = 30000;

/** When the story's two style requests are issued. */
const ASKED = ["as the PageRank run ends", "after the runs have settled"] as const;

/** Where the caller resumes after issuing them. */
const RESUME_POINTS = {
    immediately: (): Promise<void> | undefined => undefined,
    "after one microtask": async (): Promise<void> => {
        await Promise.resolve();
    },
    "after a macrotask": async (): Promise<void> => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    },
} as const;

let container: HTMLDivElement;
let element: Graphty;

async function mount(): Promise<Graphty> {
    container = document.createElement("div");
    container.style.width = "480px";
    container.style.height = "360px";
    document.body.appendChild(container);

    const mounted = document.createElement("graphty-element");
    assert.instanceOf(mounted, Graphty);
    mounted.style.width = "100%";
    mounted.style.height = "100%";
    mounted.style.display = "block";
    container.appendChild(mounted);

    const deadline = Date.now() + MOUNT_TIMEOUT_MS;
    while (!mounted.graph.initialized) {
        if (Date.now() > deadline) {
            throw new Error("the element never finished initialising");
        }

        // eslint-disable-next-line local/no-test-timing -- fixed sleep, to become a wait on the condition it stands in for, tracked in #1636
        await new Promise((resolve) => setTimeout(resolve, 20));
    }

    return mounted;
}

/**
 * Apply both suggestions and size by PageRank, the story's two requests, awaiting neither.
 * @param run - The PageRank run's id.
 */
function askForThePicture(run: string): void {
    const { graph, session } = element;
    assert.isTrue(graph.applySuggestedStyles(["graphty:pagerank", "graphty:degree"]), "a run had nothing to suggest");
    void session.styles.encode({ run, channel: "node.size", range: [1, 5] });
}

describe("Degree colour and PageRank size, asked for without waiting", () => {
    beforeEach(async () => {
        element = await mount();
        await element.session.config.set({
            runAlgorithmsOnLoad: true,
            data: { algorithms: ["degree", "pagerank"] },
        });
    });

    afterEach(() => {
        element.remove();
        container.remove();
    });

    for (const asked of ASKED) {
        for (const [resumeName, resume] of Object.entries(RESUME_POINTS)) {
            // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
            it(
                `sizes every node by PageRank when asked ${asked} and the caller resumes ${resumeName}`,
                async () => {
                    const where = `asked ${asked}, resumed ${resumeName}`;
                    const { graph, session } = element;

                    if (asked === "as the PageRank run ends") {
                        const off = session.on("run:changed", (change: RunChange) => {
                            if (change.phase === "end" && change.run.algorithm === "pagerank") {
                                off();
                                askForThePicture(change.run.id);
                            }
                        });
                        void element.addDataFromSource("json", { data: JSON_DOCUMENT });
                    } else {
                        await element.addDataFromSource("json", { data: JSON_DOCUMENT });
                        await graph.waitForSettled();
                        const run = session.runs
                            .list()
                            .find((entry) => entry.algorithm === "pagerank" && entry.status === "succeeded");
                        assert.isDefined(run, `${where}: the PageRank run did not succeed`);
                        askForThePicture(run.id);
                    }

                    // "immediately" hands back nothing, so the caller does not yield at all.
                    const resuming = resume();
                    if (resuming !== undefined) {
                        await resuming;
                    }

                    await graph.waitForSettled();

                    const { nodeCount } = session.data.statistics();
                    assert.strictEqual(nodeCount, NODES.length, `${where}: the graph was not loaded`);

                    const paint = paintOf(graph);
                    const sizes: unknown[] = [];
                    for (let index = 0; index < nodeCount; index++) {
                        sizes.push(paint.styleOf("node", index)["node.size"]);
                    }

                    for (const size of sizes) {
                        assert.isTrue(
                            typeof size === "number" && size >= 1 && size <= 5,
                            `${where}: a node was not sized by PageRank: sizes [${sizes.join(", ")}]`,
                        );
                    }

                    assert.isAbove(new Set(sizes).size, 1, `${where}: every node got one size`);
                },
                TEST_TIMEOUT_MS,
            );
        }
    }
});
