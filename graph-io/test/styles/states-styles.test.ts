/**
 * @file `statesStyles()` tells a file that states no style of its own (its program's defaults only) from one that
 * states some (issue #9298).
 */
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { statesStyles } from "../../src/styles/index.js";

const registry = createRegistry();

const NODES = [{ id: "a" }, { id: "b" }, { id: "c" }];

/**
 * The settled styles of a JSON document.
 * @param doc - the document
 * @returns whether the file states any style
 */
async function states(doc: unknown): Promise<boolean> {
    const result = await registry.importGraph(JSON.stringify(doc), { format: "json", styles: true });
    if (result.styles === null || result.styles === undefined) {
        throw new Error("no styles read");
    }
    return statesStyles(result.styles);
}

describe("statesStyles", () => {
    it("is false for a NetworkX node-link document, which has only NetworkX's defaults", async () => {
        const links = [
            { source: "a", target: "b" },
            { source: "b", target: "c" },
        ];
        expect(await states({ directed: true, multigraph: false, graph: {}, nodes: NODES, links })).toBe(false);
    });

    it("is true for a Cytoscape.js document whose stylesheet colors its nodes", async () => {
        const doc = {
            elements: {
                nodes: NODES.map((data) => ({ data })),
                edges: [{ data: { id: "ab", source: "a", target: "b" } }],
            },
            style: [{ selector: "node", style: { "background-color": "#ff0000" } }],
        };
        expect(await states(doc)).toBe(true);
    });

    it("is true for a graph value the program's defaults do not give", async () => {
        const result = await registry.importGraph(
            JSON.stringify({ directed: true, multigraph: false, graph: {}, nodes: NODES, links: [] }),
            { format: "json", styles: true },
        );
        const { styles } = result;
        if (styles === null || styles === undefined) {
            throw new Error("no styles read");
        }
        expect(statesStyles({ ...styles, styles: { ...styles.styles, graph: { background: "#123456" } } })).toBe(true);
    });
});
