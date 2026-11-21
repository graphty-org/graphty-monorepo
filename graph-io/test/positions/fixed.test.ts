/**
 * Which formats hold a per-node fixed flag (the `fixed` role): DOT's `pin` and Cytoscape.js's `locked` do (their own
 * tests); GEXF and the Cytoscape desktop family (CX, CX2, XGMML, sessions) have none, so their exporters write a fixed
 * column as a plain attribute and say the role is lost.
 */

import { GraphBuilder } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/index.js";

describe("formats with no fixed flag", () => {
    const b = new GraphBuilder({ directed: true });
    const pin = b.declareNodeColumn({ name: "pin", dtype: "bool", role: "fixed", nullable: true });
    b.setNodeValue(pin, b.addNode("a"), true);
    b.addNode("c");
    b.addEdge("a", "c");
    const snapshot = b.freeze();
    const registry = createRegistry();

    it.each(["gexf", "cx", "cx2", "xgmml", "cys"])("%s writes a fixed column as a plain attribute", (format) => {
        const notes = registry.exporter(format).check(snapshot, {});
        expect(notes.find((n) => n.code === "W_ROLE_DROPPED" && n.column === "pin")).toBeDefined();
    });
});
