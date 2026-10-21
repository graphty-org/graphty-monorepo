/**
 * The graphty scene extractor's vocabulary: how graphty-element's shapes, arrows, line patterns,
 * label locations and colors become the fidelity scene's classes. The reader itself runs in the
 * browser (`fidelity.test.ts`); these are the parts that decide what a value means.
 */
import { assert, describe, it } from "vitest";

import type { SceneNode } from "../../../graph-io/test/fidelity/scene";
import { EdgeArrowTypes, EdgeLineTypes, NodeShapes } from "../../schema";
import { FILE_STYLE_SHAPES } from "../../src/session/styles/fileStyles/shapes";
import type { DrawnNode } from "./drawn-scene";
import {
    arrowClassOf,
    capClassOf,
    colorOf,
    GRAPHTY_GAPS,
    groupsOf,
    labelPositionOf,
    lineStyleOf,
    occluders,
    polygonClassOf,
    sceneNode,
    shapeClassOf,
} from "./extract-scene";

/**
 * A drawn node for the occlusion and group readers: a box on screen at a view depth.
 * @param x0 - left
 * @param y0 - top
 * @param x1 - right
 * @param y1 - bottom
 * @param near - the depth of its front face (smaller is nearer the camera)
 * @param fillOpacity - its fill's opacity
 * @returns the node
 */
function drawn(x0: number, y0: number, x1: number, y1: number, near: number, fillOpacity = 1): DrawnNode {
    return {
        x: (x0 + x1) / 2,
        y: (y0 + y1) / 2,
        box: { x0, y0, x1, y1, near, far: near + 1 },
        meshName: "box",
        shapeType: "box",
        polygon: undefined,
        shown: true,
        insetPx: 0,
        fillDrawn: "#cccccc",
        fillOpacity,
        gradient: false,
        ramp: null,
        instanceColor: false,
        visible: true,
        ring: null,
        border: null,
        label: null,
        pieces: [],
    };
}

/**
 * The scene node of a drawn node, as far as the group reader looks.
 * @param id - the id
 * @param d - the drawn node
 * @param visible - whether it is visible
 * @returns the scene node
 */
function sceneOf(id: string, d: DrawnNode, visible = true): SceneNode {
    return {
        id,
        x: d.x,
        y: d.y,
        w: d.box.x1 - d.box.x0,
        h: d.box.y1 - d.box.y0,
        shape: "rect",
        fill: "#cccccc",
        fillOpacity: 1,
        border: { color: "#000000", width: 1, style: "solid" },
        label: null,
        visible,
        z: -d.box.near,
    };
}

describe("what the graphty scene extractor counts as hidden, and as a group", () => {
    const member = drawn(40, 40, 60, 60, 35);
    const other = drawn(70, 40, 90, 60, 35);

    it("counts a node wholly behind an opaque node in front of it as hidden", () => {
        const group = drawn(0, 0, 100, 100, 24);
        const hidden = occluders(
            new Map([
                ["g", group],
                ["m", member],
                ["o", other],
            ]),
        );
        assert.deepEqual(
            [...hidden],
            [
                ["m", "g"],
                ["o", "g"],
            ],
        );
    });

    it("hides nothing behind a group drawn behind its members, or a translucent one in front", () => {
        assert.strictEqual(
            occluders(
                new Map([
                    ["g", drawn(0, 0, 100, 100, 36)],
                    ["m", member],
                ]),
            ).size,
            0,
        );
        assert.strictEqual(
            occluders(
                new Map([
                    ["g", drawn(0, 0, 100, 100, 24, 0.5)],
                    ["m", member],
                ]),
            ).size,
            0,
        );
        // In front, but only over part of the node: the rest of it shows.
        assert.strictEqual(
            occluders(
                new Map([
                    ["g", drawn(50, 0, 100, 100, 24)],
                    ["m", member],
                ]),
            ).size,
            0,
        );
    });

    it("reads a group as the node holding visible leaf nodes, and none when they are hidden", () => {
        const outer = drawn(0, 0, 200, 100, 37);
        const inner = drawn(10, 10, 100, 90, 36);
        const nodes = new Map([
            ["outer", outer],
            ["inner", inner],
            ["m", member],
            ["o", other],
        ]);
        const scene = [...nodes].map(([id, d]) => sceneOf(id, d));
        assert.deepEqual(
            groupsOf(scene, nodes).map((g) => [g.id, g.members]),
            [
                ["outer", ["m", "o"]],
                ["inner", ["m", "o"]],
            ],
        );
        // Members hidden (by a group drawn over them): no group lists them, and the inner group,
        // showing nothing inside it, is only a box inside the outer one.
        const hidden = [...nodes].map(([id, d]) => sceneOf(id, d, id === "outer" || id === "inner"));
        assert.deepEqual(
            groupsOf(hidden, nodes).map((g) => [g.id, g.members]),
            [["outer", ["inner"]]],
        );
    });

    it("draws an unfilled node with an outline: visible, with no fill", () => {
        // Graphviz's default node is an unfilled ellipse: a transparent body and its outline
        const outlined: DrawnNode = {
            ...drawn(40, 40, 60, 60, 35, 0),
            border: { color: "#000000", widthPx: 1, style: "solid", screen: false, opacity: 1 },
        };
        const n = sceneNode("a", outlined, {}, null);
        assert.isTrue(n.visible);
        assert.isNull(n.fill);
        assert.strictEqual(n.border.color, "#000000");
        assert.strictEqual(sceneNode("b", drawn(40, 40, 60, 60, 35), {}, null).fill, "#cccccc");
    });

    it("counts an outline drawn round a node as its border, and a glow as none", () => {
        const ring = (kind: "outline" | "glow"): DrawnNode => ({
            ...drawn(40, 40, 60, 60, 35),
            ring: { kind, color: "#ff0000", reachPx: 3, inner: false },
        });
        assert.deepEqual(sceneNode("a", ring("outline"), {}, null).border, {
            color: "#ff0000",
            width: 3,
            style: "solid",
        });
        assert.deepEqual(sceneNode("a", ring("glow"), {}, null).border, { color: null, width: 0, style: "solid" });
    });
});

describe("the graphty scene extractor's vocabulary", () => {
    it("reads every file shape back as the class it was imported from", () => {
        // The file-style import maps a file's 2D shape onto a mesh; reading the mesh back must give
        // the 2D class, except where the import already lost it (several shapes share "box").
        const expected: Record<string, string> = {
            ellipse: "ellipse",
            rectangle: "rect",
            "round-rectangle": "roundrect",
            parallelogram: "parallelogram",
            trapezoid: "other",
            triangle: "triangle",
            diamond: "diamond",
            hexagon: "hexagon",
            octagon: "octagon",
            star: "star",
            pentagon: "other",
            vee: "other",
            // a polygon's class comes from its corners (polygonClassOf), not its name
            polygon: "other",
            // a node with no body, and Pajek's cross, house and figures, have no 2D class of their own
            none: "other",
            "other:cross": "other",
            "other:house": "other",
            "other:man": "other",
            "other:woman": "other",
            // Cytoscape.js's rounded polygons are curved shapes of no class; its barrel, vis-network's database and
            // Graphviz's cylinder (drawn as a database) read as rounded boxes, as the programs' own do
            "other:round-triangle": "other",
            "other:round-diamond": "other",
            "other:round-pentagon": "other",
            "other:round-hexagon": "other",
            "other:round-octagon": "other",
            "other:round-polygon": "other",
            "other:barrel": "roundrect",
            "other:database": "roundrect",
            "other:cylinder": "roundrect",
            "other:icon": "other",
        };
        for (const [fileShape, mesh] of Object.entries(FILE_STYLE_SHAPES)) {
            assert.strictEqual(shapeClassOf(mesh), expected[fileShape], `${fileShape} -> ${mesh}`);
        }
    });

    it("classes a polygon by its corners, as a reader of the program's drawing does", () => {
        assert.strictEqual(polygonClassOf("0,1 -1,-1 1,-1"), "triangle");
        assert.strictEqual(polygonClassOf("1,1 -1,1 -1,-1 1,-1"), "rect");
        assert.strictEqual(polygonClassOf("0,1 -1,0 0,-1 1.4,0"), "diamond");
        assert.strictEqual(polygonClassOf("1,0.7 -0.6,0.7 -1,-0.7 0.6,-0.7"), "other", "a parallelogram");
        assert.strictEqual(polygonClassOf("1,0 0.5,1 -0.5,1 -1,0 -0.5,-1 0.5,-1"), "hexagon");
        assert.strictEqual(polygonClassOf("1,0 0,1 -1,0 0,-1 0.5,-0.5 0.7,-0.2 0.9,-0.1"), "other");
        // without corners graphty draws the node's box
        assert.strictEqual(polygonClassOf(undefined), "rect");
    });

    it("gives every node shape the element has a class, and anything else other", () => {
        for (const shape of NodeShapes.options) {
            assert.isString(shapeClassOf(shape));
        }
        assert.strictEqual(shapeClassOf("no-such-shape"), "other");
        assert.strictEqual(shapeClassOf(undefined), "other");
    });

    it("folds arrowheads the way the reference extractors do", () => {
        assert.strictEqual(arrowClassOf("normal"), "filled-triangle");
        assert.strictEqual(arrowClassOf("vee"), "filled-triangle");
        assert.strictEqual(arrowClassOf("open-normal"), "open-triangle");
        assert.strictEqual(arrowClassOf("open-diamond"), "diamond");
        assert.strictEqual(arrowClassOf("sphere-dot"), "circle");
        assert.strictEqual(arrowClassOf("tee"), "tee");
        assert.strictEqual(arrowClassOf("crow"), "other");
        assert.strictEqual(arrowClassOf("none"), "none");
        assert.strictEqual(arrowClassOf(undefined), "none");
        for (const arrow of EdgeArrowTypes.options) {
            assert.isString(arrowClassOf(arrow));
        }
    });

    it("maps line patterns to solid, dashed, dotted or other", () => {
        assert.strictEqual(lineStyleOf(undefined), "solid");
        assert.strictEqual(lineStyleOf("solid"), "solid");
        assert.strictEqual(lineStyleOf("dash"), "dashed");
        assert.strictEqual(lineStyleOf("dot"), "dotted");
        assert.strictEqual(lineStyleOf("dash-dot"), "other");
        assert.deepEqual(
            EdgeLineTypes.options.filter((p) => lineStyleOf(p) !== "other"),
            ["solid", "dot", "dash"],
        );
    });

    it("reads an unset label location as the element's default, above the node", () => {
        assert.strictEqual(labelPositionOf(undefined), "above");
        assert.strictEqual(labelPositionOf("center"), "inside");
        assert.strictEqual(labelPositionOf("bottom"), "below");
        assert.strictEqual(labelPositionOf("left"), "left");
        assert.strictEqual(labelPositionOf("top-right"), "other");
        assert.strictEqual(labelPositionOf("automatic"), "other");
    });

    it("splits a carried color into #rrggbb and its alpha", () => {
        assert.deepEqual(colorOf({ r: 255, g: 0, b: 0, a: 1, hex: "#FF0000" }), { hex: "#ff0000", alpha: 1 });
        assert.deepEqual(colorOf("#f0c"), { hex: "#ff00cc", alpha: 1 });
        assert.deepEqual(colorOf("#00000080"), { hex: "#000000", alpha: 128 / 255 });
        assert.deepEqual(colorOf("#1234"), { hex: "#112233", alpha: 68 / 255 });
        assert.isNull(colorOf("red"));
        assert.isNull(colorOf(undefined));
        assert.isNull(colorOf({ hex: 3 }));
    });

    it("lists each API gap once", () => {
        const properties = GRAPHTY_GAPS.map((gap) => gap.property);
        assert.strictEqual(new Set(properties).size, properties.length);
    });

    it("reads a drawn arrowhead's class off its mesh name, 2D and 3D", () => {
        assert.strictEqual(capClassOf("arrow-2d-normal"), "filled-triangle");
        assert.strictEqual(capClassOf("arrow-2d-diamond"), "diamond");
        assert.strictEqual(capClassOf("filled-circle-arrow"), "circle");
        assert.strictEqual(capClassOf("sphere-dot-arrow-3d"), "circle");
        assert.strictEqual(capClassOf("something-else"), "other");
    });
});
