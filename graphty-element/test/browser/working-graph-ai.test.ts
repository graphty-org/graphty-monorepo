/**
 * @file The AI tools over the working graph (design/working-graph/design.md decision 37). With the
 * session's `workingGraph` option on, the counts, the node finder and the schema facts an assistant
 * reads answer over what the filter shows; with the option off, over the whole graph as before.
 */

import { afterEach, assert, describe, it } from "vitest";

import { findNodes, getSchema, queryGraph } from "../../src/ai/commands/QueryCommands";
import type { CommandContext } from "../../src/ai/commands/types";
import { Graph, operationQueueOf } from "../../src/Graph";

let container: HTMLDivElement | null = null;
let graph: Graph | null = null;

afterEach(() => {
    graph?.dispose();
    graph = null;
    container?.remove();
    container = null;
});

/**
 * Three hosts and two services in a line, with only the hosts shown.
 * @param working - Whether the session reads the working graph.
 * @returns The graph and a command context for it.
 */
async function hostsShown(working: boolean): Promise<{ shown: Graph; context: CommandContext }> {
    container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const shown = new Graph(container);
    graph = shown;
    await shown.init();
    shown.getSession().workingGraph = working;
    await shown.addNodes([
        { id: "a", type: "host" },
        { id: "b", type: "host" },
        { id: "c", type: "host" },
        { id: "d", type: "service" },
        { id: "e", type: "service" },
    ]);
    await shown.addEdges([
        { src: "a", dst: "b" },
        { src: "b", dst: "c" },
        { src: "c", dst: "d" },
        { src: "d", dst: "e" },
    ]);
    await operationQueueOf(shown).waitForCompletion();
    await shown.getSession().visibility.set({ kind: "categories", attribute: "data.type", values: ["host"] });
    await shown.waitForSettled();
    const context = {
        graph: shown,
        tx: shown.getSession(),
        abortSignal: new AbortController().signal,
        emitEvent: () => undefined,
        updateStatus: () => undefined,
    } as unknown as CommandContext;
    return { shown, context };
}

describe("the AI tools over the working graph", () => {
    it("count, find and describe what is shown with the option on", async () => {
        const { shown, context } = await hostsShown(true);

        const counts = await queryGraph.execute(shown, { query: "summary" }, context);
        assert.deepInclude(counts.data as object, { nodeCount: 3, edgeCount: 2 });

        const all = await findNodes.execute(shown, { selector: "" }, context);
        assert.sameMembers((all.data as { nodeIds: string[] }).nodeIds, ["a", "b", "c"]);
        const services = await findNodes.execute(shown, { selector: "data.type == 'service'" }, context);
        assert.strictEqual((services.data as { total: number }).total, 0);

        const schema = await getSchema.execute(shown, { query: "nodeTypes" }, context);
        assert.deepStrictEqual((schema.data as { nodeTypes: string[] }).nodeTypes, ["host"]);
    });

    it("count and find the whole graph with the option off, as before", async () => {
        const { shown, context } = await hostsShown(false);

        const counts = await queryGraph.execute(shown, { query: "summary" }, context);
        assert.deepInclude(counts.data as object, { nodeCount: 5, edgeCount: 4 });
        const all = await findNodes.execute(shown, { selector: "" }, context);
        assert.strictEqual((all.data as { total: number }).total, 5);
    });
});
