/**
 * vis-network settings the specimen sheets showed graph-io still misreading after the second fix round: each read the
 * way vis-network 9.1.9 draws it (`graph-io/test/fidelity/specimens/vis-network/`).
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../src/registry.js";
import { resolveStyles, type StyleProperty, type StyleTarget } from "../../src/styles/internal.js";

const registry = createRegistry();

/**
 * The value of a property for one node or edge of a vis-network document.
 * @param doc - the document
 * @param target - nodes or edges
 * @param property - the property
 * @param i - the element's index
 * @returns the value
 */
async function value(doc: object, target: StyleTarget, property: string, i: number): Promise<unknown> {
    const r = await registry.importGraph(JSON.stringify(doc), { format: "json", styles: true });
    if (r.styles === null || r.styles === undefined) {
        throw new Error("no styles");
    }
    return resolveStyles(r.styles, target, property as StyleProperty, r.snapshot)[i];
}

describe("vis-network labels below a node sized by `size`", () => {
    it("hangs the label lower the larger its font, as vis-network's hanging text does", async () => {
        // ShapeBase._drawShape and Label.calculateLabelSize hang the text's top 4 + size / 2 below the outline
        const doc = (size: number): object => ({
            nodes: [{ id: "a", x: 0, y: 0, shape: "dot", size: 18, label: "Aa", font: { size } }],
            edges: [],
            options: { physics: false },
        });
        expect(await value(doc(6), "node", "labelPosition", 0)).toBe("bottom");
        expect(await value(doc(6), "node", "labelOffsetY", 0)).toBeCloseTo(3, 9);
        expect(await value(doc(40), "node", "labelOffsetY", 0)).toBeCloseTo(2 + 40 / 6, 9);
    });

    it("leaves a node with no label, and a label inside a node sized by it, where they were", async () => {
        const doc = {
            nodes: [
                { id: "a", x: 0, y: 0, shape: "dot", size: 18 },
                { id: "b", x: 50, y: 0, shape: "box", label: "B" },
            ],
            edges: [],
            options: { physics: false },
        };
        expect(await value(doc, "node", "labelOffsetY", 0)).toBeNull();
        expect(await value(doc, "node", "labelOffsetY", 1)).toBeNull();
    });
});

describe("vis-network edge background", () => {
    it("draws the band in its own dashes, stroked with butt caps", async () => {
        const doc = (dashes: unknown): object => ({
            nodes: [
                { id: "s", x: 0, y: 0 },
                { id: "t", x: 100, y: 0 },
            ],
            edges: [
                {
                    from: "s",
                    to: "t",
                    smooth: { enabled: true, type: "curvedCW" },
                    background: { enabled: true, dashes },
                },
            ],
            options: { physics: false },
        });
        // [6, 4] at the default size of 10: dots no longer than one and a half widths
        expect(await value(doc([6, 4]), "edge", "outlineStyle", 0)).toBe("dotted");
        expect(await value(doc([30, 10]), "edge", "outlineStyle", 0)).toBe("dashed");
        expect(await value(doc(false), "edge", "outlineStyle", 0)).toBeNull();
    });

    it("closes the band's gaps with round caps once a dashed edge has been drawn", async () => {
        // EdgeBase._drawDashedLine sets the canvas's round caps and nothing sets them back: [6, 4] at size 8 is solid
        const doc = {
            nodes: [
                { id: "a", x: 0, y: 0 },
                { id: "b", x: 100, y: 0 },
                { id: "c", x: 0, y: 50 },
                { id: "d", x: 100, y: 50 },
            ],
            edges: [
                { from: "a", to: "b", dashes: true },
                {
                    from: "c",
                    to: "d",
                    smooth: { enabled: true, type: "curvedCCW" },
                    background: { enabled: true, size: 8, dashes: [6, 4] },
                },
            ],
            options: { physics: false },
        };
        expect(await value(doc, "edge", "outlineStyle", 1)).toBe("solid");
    });
});
