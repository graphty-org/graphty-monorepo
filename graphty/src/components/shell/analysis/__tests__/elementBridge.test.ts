import type { GraphSession } from "@graphty/graphty-element/session";
import { describe, expect, it } from "vitest";

import { asElementGraph, type ElementGraph, elementSession, readResultPath } from "../elementBridge";

/** A stand-in session. Only its identity matters here: the bridge hands it over untouched. */
const SESSION = { styles: { list: () => [] } } as unknown as GraphSession;

/**
 * A hand-written element graph carrying the four methods the bridge requires.
 * @returns the graph.
 */
function makeStub(): ElementGraph {
    return {
        runAlgorithm: async () => {
            await Promise.resolve();
        },
        getNodes: () => [],
        getDataManager: () => ({ graphResults: undefined }),
        getSession: () => SESSION,
    };
}

describe("asElementGraph", () => {
    it("refuses null and undefined", () => {
        expect(asElementGraph(null)).toBeNull();
        expect(asElementGraph(undefined)).toBeNull();
    });

    it("refuses a primitive", () => {
        expect(asElementGraph("graph")).toBeNull();
        expect(asElementGraph(42)).toBeNull();
    });

    it("refuses an empty object", () => {
        expect(asElementGraph({})).toBeNull();
    });

    it("refuses an object carrying only some of the four methods", () => {
        expect(
            asElementGraph({
                runAlgorithm: () => Promise.resolve(),
                getNodes: () => [],
            }),
        ).toBeNull();
    });

    it("refuses an object whose method is not a function", () => {
        expect(
            asElementGraph({
                runAlgorithm: () => Promise.resolve(),
                getNodes: () => [],
                getDataManager: () => ({}),
                getSession: "not a function",
            }),
        ).toBeNull();
    });

    it("refuses an array", () => {
        expect(asElementGraph([])).toBeNull();
    });

    it("accepts a graph carrying all four methods, and returns it unchanged", () => {
        const graph = makeStub();

        expect(asElementGraph(graph)).toBe(graph);
    });
});

describe("elementSession", () => {
    it("hands back the element's own session", () => {
        expect(elementSession(makeStub())).toBe(SESSION);
    });

    it("answers null while the element is still coming up", () => {
        expect(elementSession(undefined)).toBeNull();
        expect(elementSession({ getNodes: () => [] })).toBeNull();
    });
});

describe("readResultPath", () => {
    it("reads a nested value", () => {
        expect(readResultPath({ graphty: { louvain: { modularity: 0.447 } } }, ["graphty", "louvain", "modularity"])).toBe(
            0.447,
        );
    });

    it("returns undefined when a step is missing", () => {
        expect(readResultPath({ graphty: {} }, ["graphty", "louvain", "modularity"])).toBeUndefined();
    });

    it("returns undefined when the root is not an object", () => {
        expect(readResultPath(undefined, ["graphty"])).toBeUndefined();
        expect(readResultPath("nope", ["graphty"])).toBeUndefined();
    });

    it("returns the root itself for an empty path", () => {
        const root = { a: 1 };

        expect(readResultPath(root, [])).toBe(root);
    });
});
