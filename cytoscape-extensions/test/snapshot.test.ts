import { pageRank } from "@graphty/algorithms";
import cytoscape from "cytoscape";
import { describe, expect, it } from "vitest";

import { toSnapshot, writeData } from "../src/index";

// A function, not a shared array: Cytoscape keeps the data objects it is given, so move() and data() on one core
// would rewrite the fixture under the next test.
const elements = (): cytoscape.ElementDefinition[] => [
    { data: { id: "a" } },
    { data: { id: "b" } },
    { data: { id: "c" } },
    { data: { id: "ab", source: "a", target: "b", w: 2.5 } },
    { data: { id: "bc", source: "b", target: "c" } },
];

describe("toSnapshot", () => {
    it("maps node index i to the i-th node and edge index e to the e-th edge", () => {
        const cy = cytoscape({ headless: true, elements: elements() });
        const { snapshot, nodes, edges } = toSnapshot(cy.elements());
        expect(snapshot.nodeCount).toBe(3);
        expect(snapshot.edgeCount).toBe(2);
        expect(snapshot.directed).toBe(false);
        expect(nodes.map((n) => n.id())).toEqual(["a", "b", "c"]);
        expect(edges.map((e) => e.id())).toEqual(["ab", "bc"]);
        expect(snapshot.ids.idOf(1)).toBe("b");
        expect(snapshot.edgeSource(0)).toBe(0);
        expect(snapshot.edgeTarget(1)).toBe(2);
        expect(snapshot.weights).toBeNull();
    });

    it("reads the weight field (1 when missing) and the directed flag", () => {
        const cy = cytoscape({ headless: true, elements: elements() });
        const { snapshot } = toSnapshot(cy.elements(), { directed: true, weight: "w" });
        expect(snapshot.directed).toBe(true);
        expect(Array.from(snapshot.weights ?? [])).toEqual([2.5, 1]);
    });

    it("drops edges with an endpoint outside the collection", () => {
        const cy = cytoscape({ headless: true, elements: elements() });
        const { snapshot, edges } = toSnapshot(cy.elements().not("#c"));
        expect(snapshot.nodeCount).toBe(2);
        expect(edges.map((e) => e.id())).toEqual(["ab"]);
    });

    it("caches per collection and options, and drops the cache on add, remove, data and move", () => {
        const cy = cytoscape({ headless: true, elements: elements() });
        const first = toSnapshot(cy.elements());
        expect(toSnapshot(cy.elements())).toBe(first);
        expect(toSnapshot(cy.elements(), { directed: true })).not.toBe(first);
        expect(toSnapshot(cy.elements().not("#c"))).not.toBe(first);

        const changes: (() => void)[] = [
            () => cy.add({ data: { id: "d" } }),
            () => cy.$("#d").remove(),
            () => cy.$("#ab").data("w", 9),
            () => cy.$("#bc").move({ target: "a" }),
        ];
        let prev = toSnapshot(cy.elements());
        for (const change of changes) {
            change();
            const next = toSnapshot(cy.elements());
            expect(next).not.toBe(prev);
            prev = next;
        }
        expect(prev.snapshot.edgeTarget(1)).toBe(0);
    });
});

describe("toSnapshot order", () => {
    it("follows each collection's own order, also when the same elements were snapshotted in another order", () => {
        const cy = cytoscape({ headless: true, elements: elements() });
        const reversed = toSnapshot(cy.nodes().sort((x, y) => y.id().localeCompare(x.id())));
        expect(reversed.nodes.map((n) => n.id())).toEqual(["c", "b", "a"]);
        const plain = toSnapshot(cy.nodes());
        expect(plain.nodes.map((n) => n.id())).toEqual(["a", "b", "c"]);
        expect(plain.snapshot.ids.idOf(0)).toBe("a");
        expect(toSnapshot(cy.nodes())).toBe(plain);
    });
});

describe("writeData", () => {
    it("writes one value per element in index order", () => {
        const cy = cytoscape({ headless: true, elements: elements() });
        const { nodes, edges } = toSnapshot(cy.elements());
        writeData(nodes, Float64Array.of(0.1, 0.2, 0.3), "rank");
        writeData(edges, [7, 8], "flow");
        expect(cy.$("#b").data("rank")).toBe(0.2);
        expect(cy.$("#bc").data("flow")).toBe(8);
    });
});

describe("the snapshot guide's algorithm example", () => {
    it("runs a @graphty/algorithms function and writes its result into node data", () => {
        const cy = cytoscape({ headless: true, elements: elements() });
        const { snapshot, nodes } = toSnapshot(cy.elements());
        writeData(nodes, pageRank(snapshot).scores, "rank");
        expect(cy.$("#b").data("rank")).toBeGreaterThan(cy.$("#a").data("rank") as number);
    });
});
