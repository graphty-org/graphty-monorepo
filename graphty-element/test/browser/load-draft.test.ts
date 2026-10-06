/**
 * @file A load draft on a rendered `<graphty-element>`: preparing draws nothing and measuring
 * the load touches neither the graph nor the picture; loading the draft draws it and reports
 * progress like any load. The session half is `test/session/load-draft.test.ts`.
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

describe("load draft on the element", () => {
    it(
        "prepares and reports without loading, then loads the held rows",
        async () => {
            const element = await mount();
            const { session } = element;

            const draft = await session.data.prepare({ type: "json", config: { data: GRAPH } });
            const report = await draft.report();
            assert.strictEqual(report.counts.nodes, 3);
            assert.strictEqual(report.counts.edges, 2);
            assert.strictEqual(session.data.statistics().nodeCount, 0);

            const ends: string[] = [];
            session.on("progress:changed", (change) => {
                if (change.task === "load") {
                    ends.push(change.phase);
                }
            });
            await draft.load();

            assert.strictEqual(ends.at(-1), "end");
            assert.strictEqual(session.data.statistics().nodeCount, 3);
            assert.strictEqual(session.data.lastImport()?.counts.edges, 2);
        },
        TEST_TIMEOUT_MS,
    );
});
