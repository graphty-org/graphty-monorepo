/**
 * @file A layer added before a load, and not awaited, is painted onto the loaded nodes whatever the
 * caller does next.
 *
 * A render function issues its style edits, sets the data and returns; it cannot await either. So
 * the element, not the caller, has to order the layer's paint after the data lands. Whether the
 * caller then resumes at once, a microtask later, after the load's own promise or after a macrotask
 * must not decide whether the loaded nodes wear the layer. Each cell waits only on the element's
 * own door, `graph.waitForSettled()`, and then reads what the style pass painted on every node.
 */

import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { LayerSpec } from "../../session";
/*
 * A value import: importing the package is what defines the `<graphty-element>` custom element.
 */
import { Graphty } from "../../src/graphty-element";
import { paintOf } from "../helpers/paint-assertions";

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
const EDGES = [
    { src: "a", dst: "b" },
    { src: "b", dst: "c" },
    { src: "c", dst: "d" },
    { src: "d", dst: "a" },
];
const JSON_DOCUMENT = JSON.stringify({ nodes: NODES, edges: EDGES });

/** A size no default layer paints, so a node carries it only if THIS layer painted it. */
const SIZE = 3.25;

const LAYER: LayerSpec = {
    name: "Resume points - every node sized",
    target: "node",
    selector: { match: "everything" },
    set: { "node.size": SIZE },
};

const MOUNT_TIMEOUT_MS = 10000;
const TEST_TIMEOUT_MS = 30000;

/** The routes a graph arrives by. Each returns the load's promise, or undefined for a property. */
const LOADS = {
    "the nodeData property": (target: Graphty): Promise<void> | undefined => {
        target.nodeData = NODES;
        target.edgeData = EDGES;
        return undefined;
    },
    "addNodes and addEdges": async (target: Graphty): Promise<void> => {
        await Promise.all([target.graph.addNodes(NODES), target.graph.addEdges(EDGES)]);
    },
    addDataFromSource: async (target: Graphty): Promise<void> => {
        await target.addDataFromSource("json", { data: JSON_DOCUMENT });
    },
} as const;

/** Where the caller resumes after starting the load without awaiting it. */
const RESUME_POINTS = {
    immediately: (): Promise<void> | undefined => undefined,
    "after one microtask": async (): Promise<void> => {
        await Promise.resolve();
    },
    "after the load's promise": async (loading: Promise<void> | undefined): Promise<void> => {
        await loading;
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

describe("a layer added before a load and not awaited", () => {
    beforeEach(async () => {
        element = await mount();
    });

    afterEach(() => {
        element.remove();
        container.remove();
    });

    for (const [loadName, load] of Object.entries(LOADS)) {
        for (const [resumeName, resume] of Object.entries(RESUME_POINTS)) {
            // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
            it(
                `is painted on nodes loaded through ${loadName} when the caller resumes ${resumeName}`,
                async () => {
                    const where = `${loadName}, resumed ${resumeName}`;
                    const { graph, session } = element;

                    void session.styles.add(LAYER);
                    const loading = load(element);
                    loading?.catch(() => undefined);

                    // "immediately" hands back nothing, so the caller does not yield at all.
                    const resuming = resume(loading);
                    if (resuming !== undefined) {
                        await resuming;
                    }

                    await graph.waitForSettled();

                    const { nodeCount } = session.data.statistics();
                    assert.strictEqual(nodeCount, NODES.length, `${where}: the graph was not loaded when settled`);

                    const paint = paintOf(graph);
                    const sizes: unknown[] = [];
                    for (let index = 0; index < nodeCount; index++) {
                        sizes.push(paint.styleOf("node", index)["node.size"]);
                    }

                    assert.deepStrictEqual(
                        sizes,
                        NODES.map(() => SIZE),
                        `${where}: the layer's size was not painted on every loaded node`,
                    );
                },
                TEST_TIMEOUT_MS,
            );
        }
    }
});
