/**
 * What yEd Live draws inside its UML and BPMN nodes, read from the specimen sheets as a picture over the node, and the
 * size it gives a UML node.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles } from "../../src/styles/internal.js";
import type { StyleProperty } from "../../src/styles/types.js";

const registry = createRegistry();
const SPECIMENS = resolve(import.meta.dirname, "../fidelity/specimens/yed-live-graphml");

/**
 * Imports a sheet.
 * @param sheet - its name
 * @returns a reader of a node's resolved property
 */
async function sheet(sheet: string): Promise<(property: StyleProperty, id: string) => unknown> {
    const bytes = new Uint8Array(readFileSync(resolve(SPECIMENS, `${sheet}.graphml`)));
    const { snapshot, styles } = await registry.importGraph(bytes, {
        format: "graphml",
        styles: { toolDefaults: true },
        errorLimit: Infinity,
    });
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    const ids = Array.from({ length: snapshot.nodeCount }, (_, n) => String(snapshot.ids.idOf(n)));
    return (property, id) => resolveStyles(styles, "node", property, snapshot)[ids.indexOf(id)];
}

const svgOf = (url: unknown): string => decodeURIComponent(String(url).slice(String(url).indexOf(",") + 1));

describe("yEd Live's UML nodes", () => {
    it("draws a class at the size its open rows need, about its stored center", async () => {
        const read = await sheet("specimen-node-shapes-p7");
        expect([read("width", "uml-class"), read("height", "uml-class")]).toEqual([125, 134]);
        expect(read("height", "uml-attributes-open-false")).toBe(118);
    });

    it("writes a closed section's name and no rows", async () => {
        const read = await sheet("specimen-node-shapes-p7");
        const open = svgOf(read("image", "uml-class"));
        const closed = svgOf(read("image", "uml-attributes-open-false"));
        expect(open).toContain("a: int");
        expect(closed).toContain("Attributes");
        expect(closed).not.toContain("a: int");
        expect(closed).toContain("m()");
    });

    it("escapes a stereotype's brackets", async () => {
        const read = await sheet("specimen-node-shapes-p7");
        expect(svgOf(read("image", "uml-stereotype"))).toContain("&lt;&lt;entity&gt;&gt;");
    });
});

describe("yEd Live's picture nodes", () => {
    it("draws a colored icon's picture and no body", async () => {
        const read = await sheet("specimen-node-shapes-p7");
        expect(read("shape", "colored-icon-red")).toBe("none");
        expect(String(read("image", "colored-icon-red"))).toMatch(/^data:image\/svg\+xml/);
    });
});

describe("yEd Live's BPMN symbols", () => {
    it("draws a symbol in its icon color and none on a plain node", async () => {
        const events = await sheet("specimen-node-shapes-p5");
        expect(svgOf(events("image", "bpmn-event-type-message"))).toContain('stroke="#000000"');
        expect(events("image", "bpmn-event-type-plain")).toBeNull();
        const activities = await sheet("specimen-node-shapes-p4");
        expect(svgOf(activities("image", "bpmn-activity-sub-state-collapsed"))).toContain("M50,20V80");
        expect(svgOf(activities("image", "bpmn-activity-sub-state-expanded"))).not.toContain("M50,20V80");
    });
});
