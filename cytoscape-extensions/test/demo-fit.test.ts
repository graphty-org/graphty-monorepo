import cytoscape, { type Core } from "cytoscape";
import { afterEach, describe, expect, it, vi } from "vitest";

import { elementsOf, fitToContainer, GENERATE, mainComponent } from "../stories/demo.js";

// The demo fits every finished layout to its container. Cytoscape's components() took 7.7 s of the main thread on the
// 210,000 elements of the 50,000-node network, after the GPU run had finished and while its working panel still
// showed the last second it counted, so the story looked stalled.
describe("the demo's fit", () => {
    const network = (): Core =>
        cytoscape({
            headless: true,
            styleEnabled: true,
            elements: elementsOf(GENERATE["planted-partition"](2_000, 42)),
        });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("finds the largest connected component, as components() does", () => {
        const cy = network();
        // isolated nodes and a separate pair, beside the main component
        cy.add([
            { group: "nodes", data: { id: "lone" } },
            { group: "nodes", data: { id: "a" } },
            { group: "nodes", data: { id: "b" } },
            { group: "edges", data: { id: "ab", source: "a", target: "b" } },
        ]);
        const expected = cy
            .elements()
            .components()
            .reduce((a, c) => (c.nodes().length > a.nodes().length ? c : a))
            .nodes();
        const main = mainComponent(cy);
        expect(main.length).toBe(expected.length);
        expect(main.same(expected)).toBe(true);
    });

    it("never asks Cytoscape for the components of the whole graph", () => {
        const cy = network();
        const proto = Object.getPrototypeOf(cy.elements()) as Record<string, unknown>;
        const components = vi.spyOn(proto as { components(): unknown }, "components");
        fitToContainer(cy);
        expect(components).not.toHaveBeenCalled();
    });
});
