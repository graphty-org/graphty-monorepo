/**
 * @file The load preview and the load progress event on a rendered `<graphty-element>`: its
 * session previews without drawing anything, and its loads publish `data:progress` like a
 * headless session's do. The session half is `test/session/load-preview.test.ts`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

const GRAPH = JSON.stringify({
    nodes: [{ id: "1" }, { id: "2" }, { id: "3" }],
    edges: [
        { source: "1", target: "2" },
        { source: "2", target: "3" },
    ],
});

const mounted: HTMLElement[] = [];

afterEach(() => {
    for (const element of mounted.splice(0)) {
        element.remove();
    }
});

/**
 * A connected element, after its first update.
 * @returns the element
 */
async function mount(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "300px";
    document.body.appendChild(element);
    mounted.push(element);
    await element.updateComplete;
    return element;
}

describe("load preview on the element", () => {
    it(
        "previews without loading, then publishes progress while it loads",
        async () => {
            const element = await mount();
            const { session } = element;

            const preview = await session.data.preview({ type: "json", config: { data: GRAPH } });
            assert.strictEqual(preview.report.counts.nodes, 3);
            assert.strictEqual(preview.report.counts.edges, 2);
            assert.strictEqual(session.data.statistics().nodeCount, 0);

            const reads: number[] = [];
            session.on("data:progress", ({ read }) => reads.push(read));
            await session.data.import({ type: "json", config: { data: GRAPH } });

            assert.strictEqual(reads.at(-1), 5);
            assert.strictEqual(session.data.statistics().nodeCount, 3);
        },
        TEST_TIMEOUT_MS,
    );
});
