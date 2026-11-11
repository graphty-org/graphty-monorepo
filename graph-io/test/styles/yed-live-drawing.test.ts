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

describe("yEd Live's BPMN events on ports and choreography messages", () => {
    it("draws a port's event past the node's bottom, the picture sized and moved to reach it", async () => {
        const read = await sheet("specimen-node-shapes-p6");
        const id = "bpmn-event-port-type-message";
        // the node is 60 x 40 and its port sits on the bottom at a quarter across: a 20 x 20 event reaches 10 below
        expect([read("imageFit", id), read("imageClip", id)]).toEqual(["none", "none"]);
        expect([read("imageWidth", id), read("imageHeight", id)]).toEqual([59, 49]);
        expect([read("imageOffsetX", id), read("imageOffsetY", id)]).toEqual([0, 5]);
        const svg = svgOf(read("image", id));
        expect(svg).toContain('viewBox="0.5 0.5 59 49"');
        // two rings in the port's colors, centered on the port
        expect(svg.match(/<ellipse fill="#c8c8c8" stroke="#505050"[^>]* cx="15" cy="40"/g)).toHaveLength(2);
    });

    it("draws one ring for a starting event and a thick one for an ending event, and nothing for a port yEd Live rejects", async () => {
        const read = await sheet("specimen-node-shapes-p6");
        expect(svgOf(read("image", "bpmn-event-port-characteristic-start")).match(/<ellipse/g)).toHaveLength(1);
        expect(svgOf(read("image", "bpmn-event-port-characteristic-end"))).toContain('stroke-width="3"');
        expect(svgOf(read("image", "bpmn-event-port-characteristic-boundary-non-interrupting"))).toContain(
            'stroke-dasharray="2,2"',
        );
        expect(read("image", "bpmn-event-port-checked")).toBeNull();
    });

    it("draws a choreography's initiating message above it and its response below it", async () => {
        const read = await sheet("specimen-node-shapes-p6");
        // a 70 x 50 node: the envelope and its line reach 29 past its top or bottom
        expect([
            read("imageHeight", "bpmn-choreography-initiating-message"),
            read("imageOffsetY", "bpmn-choreography-initiating-message"),
        ]).toEqual([78, -14.5]);
        expect([
            read("imageHeight", "bpmn-choreography-response-message"),
            read("imageOffsetY", "bpmn-choreography-response-message"),
        ]).toEqual([78, 14.5]);
        expect(svgOf(read("image", "bpmn-choreography-response-message"))).toContain('fill="#808080"');
        expect(read("imageFit", "bpmn-choreography-type-task")).toBeNull();
    });
});

describe("yEd Live's keepIntrinsicAspectRatio", () => {
    it("draws a five-pointed star at its own proportions, as large as fits its box", async () => {
        const read = await sheet("specimen-node-shapes");
        // stored 60 x 30; yEd Live draws the star 31.54 x 30
        expect(read("width", "shape-keep-aspect")).toBeCloseTo(31.54, 2);
        expect(read("height", "shape-keep-aspect")).toBe(30);
    });
});
