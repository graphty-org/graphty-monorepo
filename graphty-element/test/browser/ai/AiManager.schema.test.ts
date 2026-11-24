/**
 * AiManager schema lifecycle: the system prompt describes the graph's data as it is now, on a
 * real graph.
 * @module test/browser/ai/AiManager.schema.test
 */

import { afterEach, assert, describe, it } from "vitest";

import type { AiManager } from "../../../src/ai/AiManager";
import type { MockLlmProvider } from "../../../src/ai/providers/MockLlmProvider";
import type { Graph } from "../../../src/Graph";
import { cleanupE2EGraph, createE2EGraph } from "../../helpers/e2e-graph-setup";

const NODES = [
    { id: "A", kind: "server", priority: 1 },
    { id: "B", kind: "client", priority: 2 },
    { id: "C", kind: "router", priority: 3 },
];

const EDGES = [
    { src: "A", dst: "B", weight: 10 },
    { src: "B", dst: "C", weight: 20 },
];

/**
 * The assistant the graph built.
 * @param graph - The graph.
 * @returns Its AI manager.
 */
function managerOf(graph: Graph): AiManager {
    const manager = graph.getAiManager();
    assert.ok(manager, "AI is enabled");
    return manager;
}

/**
 * Send one message and return the system prompt the provider was sent with it.
 * @param graph - The graph whose assistant is asked.
 * @returns The system prompt.
 */
async function promptSentFor(graph: Graph): Promise<string> {
    const provider = managerOf(graph).getProvider() as MockLlmProvider;
    provider.clearCallHistory();
    await graph.aiCommand("hello");
    const system = provider.getCallHistory()[0]?.messages.find((message) => message.role === "system");
    assert.ok(system, "the provider was sent a system prompt");
    return system.content;
}

describe("AiManager schema lifecycle", () => {
    afterEach(() => {
        cleanupE2EGraph();
    });

    it("the system prompt names the graph's node and edge properties", async () => {
        const { graph } = await createE2EGraph({ nodes: NODES, edges: EDGES });

        const prompt = await promptSentFor(graph);

        assert.include(prompt, "## Data Schema");
        assert.include(prompt, "priority");
        assert.include(prompt, "weight");
    });

    it("an assistant enabled on an empty graph sees the data added after it", async () => {
        const { graph } = await createE2EGraph();

        assert.notInclude(await promptSentFor(graph), "## Data Schema");

        await graph.addNodes(NODES);

        const prompt = await promptSentFor(graph);
        assert.include(prompt, "## Data Schema");
        assert.include(prompt, "priority");
    });

    it("the prompt after a data change describes the new data", async () => {
        const { graph } = await createE2EGraph({ nodes: NODES, edges: EDGES });
        assert.notInclude(await promptSentFor(graph), "region");

        await graph.addNodes([{ id: "D", kind: "server", priority: 4, region: "west" }]);

        assert.include(await promptSentFor(graph), "region");
    });

    it("dispose stops listening to the graph's data changes", async () => {
        const { graph } = await createE2EGraph({ nodes: NODES, edges: EDGES });
        const manager = managerOf(graph);
        const schemaManager = manager.getSchemaManager();
        assert.ok(schemaManager);

        // While enabled, a data change drops the cached schema.
        schemaManager.extract();
        await graph.addNodes([{ id: "D", kind: "server", priority: 4 }]);
        assert.isNull(schemaManager.getSchema(), "a data change drops the cached schema");

        schemaManager.extract();
        manager.dispose();
        await graph.addNodes([{ id: "E", kind: "client", priority: 5 }]);

        assert.isNotNull(schemaManager.getSchema(), "a disposed manager no longer hears data changes");
        assert.isNull(manager.getSchemaManager());
    });
});
