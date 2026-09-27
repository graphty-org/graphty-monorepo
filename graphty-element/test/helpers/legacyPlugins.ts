/**
 * @file Plugin algorithms that declare no catalogue descriptor, registered under the `fixture`
 * namespace, for the tests that check a plugin run is one undoable step. Importing this module
 * registers them.
 */

import { Algorithm } from "../../src/algorithms/Algorithm";
import type { Graph } from "../../src/Graph";

/** The namespace every plugin here is registered under. */
export const LEGACY_NAMESPACE = "fixture";

/**
 * Writes nested `algorithmResults` onto every node and edge the way a 1.x plugin did, and a
 * graph-level value into `graphResults`.
 */
export class WriteEverywhere extends Algorithm {
    static override type = "write-everywhere";
    static override namespace = LEGACY_NAMESPACE;

    /**
     * Mark every node and edge, and count them at the graph level.
     * @param graph - The graph.
     */
    override run(graph: Graph): Promise<void> {
        for (const node of graph.getNodes()) {
            const data = node.data as Record<string, unknown>;
            data.algorithmResults = { fixture: { "write-everywhere": { seen: true, id: node.id } } };
        }

        for (const edge of graph.getDataManager().edges.values()) {
            const data = edge.data as Record<string, unknown>;
            data.algorithmResults = { fixture: { "write-everywhere": { seen: true } } };
        }

        const results: Record<string, unknown> = { fixture: { "write-everywhere": { nodes: graph.getNodes().length } } };
        (graph.getDataManager() as { graphResults?: unknown }).graphResults = results;
        return Promise.resolve();
    }
}

/** Writes one level down into a record that already has results, leaving its siblings alone. */
export class WriteNested extends Algorithm {
    static override type = "write-nested";
    static override namespace = LEGACY_NAMESPACE;

    /**
     * Add a second algorithm's result beside the first one's.
     * @param graph - The graph.
     */
    override run(graph: Graph): Promise<void> {
        for (const node of graph.getNodes()) {
            const { algorithmResults } = node.data as unknown as {
                algorithmResults: Record<string, Record<string, unknown>>;
            };
            algorithmResults.fixture.nested = { depth: 2 };
        }

        return Promise.resolve();
    }
}

/** Calls the graph's own doors from inside its run: adds a node and a style layer. */
export class CallsDoors extends Algorithm {
    static override type = "calls-doors";
    static override namespace = LEGACY_NAMESPACE;

    /**
     * Add a node and a layer through the graph it was handed.
     * @param graph - The graph.
     */
    override async run(graph: Graph): Promise<void> {
        await graph.addNodes([{ id: "from-plugin" }]);
        await graph.getSession().styles.add({
            name: "Plugin layer",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#00ff00" },
        });
    }
}

/** Writes a result, then fails. */
export class WritesThenFails extends Algorithm {
    static override type = "writes-then-fails";
    static override namespace = LEGACY_NAMESPACE;

    /**
     * Mark every node, then throw.
     * @param graph - The graph.
     */
    override async run(graph: Graph): Promise<void> {
        await graph.addNodes([{ id: "doomed" }]);
        for (const node of graph.getNodes()) {
            (node.data as Record<string, unknown>).marked = true;
        }

        throw new Error("the plugin failed");
    }
}

Algorithm.register(WriteEverywhere);
Algorithm.register(WriteNested);
Algorithm.register(CallsDoors);
Algorithm.register(WritesThenFails);
