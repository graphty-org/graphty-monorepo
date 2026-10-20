/**
 * @file Data issues on a real `Graph`: the fraud fixture loaded into a renderer reports its
 * issues, a fix changes what the graph holds and undo restores it. The session half is
 * `test/session/data-issues.test.ts`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph } from "../../src/Graph";
import { accountsCsv, transfersCsv } from "../helpers/fraud-fixture";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real, empty `Graph`.
 * @returns The graph.
 */
async function emptyGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

describe("data issues on a renderer", () => {
    it("reports the fraud fixture's issues, leaves out the unknown ends, and undo brings them back", async () => {
        const graph = await emptyGraph();
        const session = graph.getSession();
        const draft = await session.data.prepare({
            config: {
                nodeFile: new File([accountsCsv()], "accounts.csv"),
                edgeFile: new File([transfersCsv()], "transfers.csv"),
            },
        });
        await draft.load();

        assert.deepEqual(Object.fromEntries(session.data.issues().map((issue) => [issue.id, issue.count])), {
            "unknown-end:edge": 18,
            "repeated-id:node": 2,
            "refused-row": 1,
            "repeated-edge:edge": 5,
            "decimal-comma:edge:amount": 3,
            "not-a-number:edge:amount": 1,
            "could-be-yes-no:node:flagged": 298,
        });

        const nodes = graph.getNodeCount();
        await session.data.fix("unknown-end:edge", "leave-out");
        assert.strictEqual(graph.getNodeCount(), nodes - 18, "the renderer drops the made nodes");
        assert.isUndefined(session.data.issues().find((issue) => issue.id === "unknown-end:edge"));

        await session.undo();
        assert.strictEqual(graph.getNodeCount(), nodes);
        assert.strictEqual(session.data.issues().find((issue) => issue.id === "unknown-end:edge")?.count, 18);
    });
});
