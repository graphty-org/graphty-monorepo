/**
 * Schema Test Graph utilities for SchemaExtractor testing.
 * @module test/helpers/schema-test-graph
 */

import { createGraphSession } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";

/**
 * Options for creating a schema test graph.
 */
export interface SchemaTestGraphOptions {
    /** Create an empty graph */
    empty?: boolean;
    /** Create nodes with mixed type values for a property */
    mixedTypes?: boolean;
    /** Create nodes with many unique string values (>10) */
    manyUniqueStrings?: boolean;
    /** Create nodes with null/undefined values */
    nullValues?: boolean;
    /** Number of nodes to create */
    nodeCount?: number;
    /** Number of edges to create */
    edgeCount?: number;
}

const NODE_TYPES = ["server", "client", "router"];
const TAGS = [
    ["web", "production"],
    ["database", "staging"],
    ["api", "development"],
];
const RELATIONS = ["connects", "depends", "owns"];

/**
 * Create a headless session holding rich data for schema extraction testing: node and edge
 * fields of every type a schema reads. Nodes are `node-0` to `node-<n-1>`, and edge i joins node
 * i to node i+1, round the ring. Every value is derived from its index, so a failure reproduces.
 *
 * @param options - Configuration options
 * @returns The session
 */
export async function createSchemaTestGraph(options: SchemaTestGraphOptions = {}): Promise<GraphSession> {
    const {
        empty = false,
        mixedTypes = false,
        manyUniqueStrings = false,
        nullValues = false,
        // When manyUniqueStrings is true, we need more than 10 nodes to exceed the enum threshold
        nodeCount = manyUniqueStrings ? 15 : 10,
        edgeCount = 15,
    } = options;

    const nodes = empty ? 0 : nodeCount;
    const edges = empty || nodes === 0 ? 0 : edgeCount;
    const nodeData = (i: number): Record<string, unknown> => ({
        label: `Node ${i}`,
        // String property with limited values (enum-like)
        type: NODE_TYPES[i % NODE_TYPES.length],
        // Number property
        age: 20 + i * 3,
        // Boolean property
        active: i % 2 === 0,
        // Array property
        tags: TAGS[i % TAGS.length],
        // Nested object property
        metadata: {
            createdBy: i % 2 === 0 ? "admin" : "user",
            version: 1 + (i % 5),
        },
        ...(mixedTypes && { value: i % 2 === 0 ? i * 10 : `value-${i}` }),
        ...(manyUniqueStrings && { uniqueName: `unique-string-value-${i}` }),
        ...(nullValues && { optional: i % 3 === 0 ? null : `optional-${i}` }),
    });
    const edgeData = (i: number): Record<string, unknown> => ({
        // Fractional, so the schema reads it as a number rather than an integer
        weight: (i % 10) * 10 + 0.5,
        relation: RELATIONS[i % RELATIONS.length],
        bidirectional: i % 2 === 0,
    });

    const session = createGraphSession();
    await session.data.addNodes(Array.from({ length: nodes }, (_, i) => ({ id: `node-${i}`, ...nodeData(i) })));
    await session.data.addEdges(
        Array.from({ length: edges }, (_, i) => ({
            source: `node-${i % nodes}`,
            target: `node-${(i + 1) % nodes}`,
            ...edgeData(i),
        })),
    );
    return session;
}
