import { describe, expect, it } from "vitest";

import { GraphBuilder } from "../../src/builder/graph-builder.js";
import { GraphFormatError } from "../../src/errors.js";
import { type AttributeTable, type GraphSnapshot } from "../../src/types/index.js";

function expectError(fn: () => unknown, code: string): GraphFormatError {
    let caught: unknown = null;
    try {
        fn();
    } catch (err) {
        caught = err;
    }
    expect(caught).toBeInstanceOf(GraphFormatError);
    const error = caught as GraphFormatError;
    expect(error.code).toBe(code);
    return error;
}

function build(): GraphSnapshot {
    const builder = new GraphBuilder({ directed: false });
    builder.declareNodeColumn({ name: "label", dtype: "string", role: "label" });
    builder.addNodeRecord("a", { label: "A" });
    builder.addNodeRecord("b", { label: "B" });
    builder.addEdge("a", "b");
    const snapshot = builder.freeze();
    snapshot.edges.set("w", new Float32Array([2]));
    snapshot.graph.set("title", ["t"]);
    return snapshot;
}

function tablesOf(snapshot: GraphSnapshot): [string, AttributeTable][] {
    return [
        ["nodes", snapshot.nodes],
        ["edges", snapshot.edges],
        ["graph", snapshot.graph],
    ];
}

describe("snapshot.seal()", () => {
    it("makes set, remove and rename on every table throw E_FROZEN", () => {
        const snapshot = build();
        snapshot.seal();
        for (const [name, table] of tablesOf(snapshot)) {
            const first = table.names()[0];
            const before = table.names();
            const error = expectError(() => table.set("x", new Float32Array(table.rowCount)), "E_FROZEN");
            expect(error.details.domain, name).toBe(table.domain);
            expectError(() => table.remove(first), "E_FROZEN");
            expectError(() => table.remove("absent"), "E_FROZEN");
            expectError(() => table.rename(first, "renamed"), "E_FROZEN");
            expect(table.names(), name).toEqual(before);
        }
    });

    it("leaves reads unchanged", () => {
        const snapshot = build();
        const label = snapshot.nodes.require("label");
        snapshot.seal();
        expect(snapshot.nodes.names()).toEqual(["label"]);
        expect(snapshot.nodes.get("label")).toBe(label);
        expect(snapshot.nodes.value("label", 1)).toBe("B");
        expect(snapshot.nodes.byRole("label")).toBe(label);
        expect(snapshot.edges.requireTyped("w", "f32").data[0]).toBe(2);
        expect(snapshot.edges.gpuView("w")).toBeInstanceOf(Float32Array);
        expect(snapshot.graph.value("title", 0)).toBe("t");
        expect([...snapshot.nodes]).toEqual([label]);
        expect(snapshot.nodeCount).toBe(2);
    });

    it("is harmless when called twice", () => {
        const snapshot = build();
        snapshot.seal();
        expect(() => {
            snapshot.seal();
        }).not.toThrow();
        expectError(() => snapshot.nodes.remove("label"), "E_FROZEN");
    });

    it("seals extension tables", () => {
        const builder = new GraphBuilder({ directed: true });
        builder.addNode("a");
        const spells = builder.addExtensionTable("spells", [{ name: "v", dtype: "f32" }]);
        builder.addExtensionRow(spells, [1]);
        builder.addExtensionRow(spells, [2]);
        const snapshot = builder.freeze();
        const table = snapshot.extensions.get("spells");
        expect(table).toBeDefined();
        snapshot.seal();
        expectError(() => table?.set("x", new Float32Array(2)), "E_FROZEN");
    });

    it("gives withColumns() a writable column set and keeps the source sealed", () => {
        const snapshot = build();
        snapshot.seal();
        const copy = snapshot.withColumns({ score: new Float32Array(2) });
        expect(copy.nodes.names()).toEqual(["label", "score"]);
        copy.nodes.remove("score");
        copy.graph.set("more", [1]);
        expectError(() => snapshot.nodes.set("score", new Float32Array(2)), "E_FROZEN");
    });
});

describe("an unsealed snapshot", () => {
    it("still allows set, remove and rename", () => {
        const snapshot = build();
        snapshot.nodes.set("x", new Float32Array(2));
        snapshot.nodes.rename("x", "y");
        expect(snapshot.nodes.names()).toEqual(["label", "y"]);
        expect(snapshot.nodes.remove("y")).toBe(true);
        expect(snapshot.nodes.names()).toEqual(["label"]);
    });
});
