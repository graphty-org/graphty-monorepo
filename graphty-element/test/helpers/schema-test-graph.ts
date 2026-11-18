/**
 * Schema Test Graph utilities for SchemaExtractor testing.
 * @module test/helpers/schema-test-graph
 */

import type { Graph } from "../../src/Graph";
import { createMockGraphContext } from "./mock-graph-context";

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
 * Create a mock graph with rich data for schema extraction testing: the mock graph context, with
 * node and edge fields of every type a schema reads. Every value is derived from its index, so a
 * failure reproduces.
 *
 * @param options - Configuration options
 * @returns A mock graph for testing
 */
export function createSchemaTestGraph(options: SchemaTestGraphOptions = {}): Graph {
    const {
        empty = false,
        mixedTypes = false,
        manyUniqueStrings = false,
        nullValues = false,
        // When manyUniqueStrings is true, we need more than 10 nodes to exceed the enum threshold
        nodeCount = manyUniqueStrings ? 15 : 10,
        edgeCount = 15,
    } = options;

    return createMockGraphContext({
        nodeCount: empty ? 0 : nodeCount,
        edgeCount: empty ? 0 : edgeCount,
        nodeData: (i) => ({
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
        }),
        edgeData: (i) => ({
            // Fractional, so the schema reads it as a number rather than an integer
            weight: (i % 10) * 10 + 0.5,
            relation: RELATIONS[i % RELATIONS.length],
            bidirectional: i % 2 === 0,
        }),
    });
}
