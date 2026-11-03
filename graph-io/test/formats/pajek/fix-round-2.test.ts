/**
 * What Pajek 6.02's SVG export draws for the settings the Pajek specimen pages showed graph-io read otherwise: label
 * places by `lr` and `lphi`, labels turned by `la` 360 and above, PostScript font names, the color names it draws
 * otherwise or not at all, line labels outside Mark Lines / with Labels, and the 3D effect's gradients.
 */

import { describe, expect, it } from "vitest";

import { createRegistry } from "../../../src/index.js";
import { resolveStyles } from "../../../src/styles/internal.js";

const registry = createRegistry();

/**
 * Imports a Pajek document with its styles.
 * @param doc - the document
 * @param pajekDraw - the draw settings, or undefined for none
 * @returns a getter of what graphty draws for a property of every element, and the import
 */
async function load(doc: string, pajekDraw?: Record<string, unknown>) {
    const result = await registry.importGraph(doc, {
        format: "pajek",
        styles: true,
        errorLimit: Infinity,
        ...(pajekDraw === undefined ? {} : { pajekDraw }),
    });
    const { snapshot, styles } = result;
    if (styles === null || styles === undefined) {
        throw new Error("no styles");
    }
    const get = (target: "node" | "edge", property: string): readonly unknown[] =>
        resolveStyles(styles, target, property as never, snapshot);
    return { get, result };
}

describe("Pajek label places (lr, lphi)", () => {
    it("starts the text at the polar point, its baseline through it, and centers it at lr 0", async () => {
        // pajek-specimen-labels: `default` (no lr, lphi) starts at (+5.18, +19.32) from the center at size 15;
        // `lphi-135` (lr 20, fos 10) at (-14.14, -14.14), the label's middle 3.5 above that
        const { get } = await load(
            "*Vertices 3\n1 a 0.1 0.1 0.5\n2 b 0.2 0.2 0.5 ellipse lr 20 lphi 135 fos 10\n3 c 0.3 0.3 0.5 ellipse lr 0\n",
        );
        expect(get("node", "labelPosition")).toEqual(["center", "center", "center"]);
        expect(get("node", "labelShiftX")).toEqual([0.5, 0.5, 0]);
        const x = get("node", "labelOffsetX") as number[];
        const y = get("node", "labelOffsetY") as number[];
        expect(x[0]).toBeCloseTo(5.176, 3);
        expect(y[0]).toBeCloseTo(19.319 - 0.3465 * 15, 3);
        expect(x[1]).toBeCloseTo(-14.142, 3);
        expect(y[1]).toBeCloseTo(-14.142 - 3.465, 3);
        expect([x[2], y[2]]).toEqual([0, 0]);
    });

    it("writes the place back as lr and lphi, leaving out Pajek's default", async () => {
        const doc =
            "*Vertices 3\n1 a 0.1 0.1 0.5\n2 b 0.2 0.2 0.5 ellipse lr 12 lphi 135 fos 10\n3 c 0.3 0.3 0.5 ellipse lr 0\n";
        const { result } = await load(doc);
        const out = await registry.exportGraphToString(result.snapshot, "pajek", {
            styles: result.styles ?? undefined,
        });
        const vertices = out.split("\n").filter((l) => /^\d /.test(l));
        expect(vertices[0]).not.toMatch(/\blr\b|\blphi\b/);
        expect(vertices[1]).toMatch(/\blr 12\b/);
        expect(vertices[1]).toMatch(/\blphi 135\b/);
        expect(vertices[2]).toMatch(/\blr 0\b/);
    });
});

describe("Pajek label fonts", () => {
    it("reads a PostScript font name as its family with a generic one after it, drawn upright", async () => {
        // pajek-specimen-labels `font-courier-bold`, `font-helvetica-oblique`: Pajek writes the name as the SVG's
        // family, drawn monospace and sans-serif, upright
        const { get, result } = await load(
            "*Vertices 3\n1 a font Courier-Bold\n2 b font Helvetica-Oblique\n3 c font Arial\n",
        );
        expect(get("node", "labelFont")).toEqual(["Courier, monospace", "Helvetica, sans-serif", "Arial"]);
        expect(get("node", "labelItalic")).toEqual([null, null, null]);
        // Pajek draws every label bold whatever the name says
        expect(get("node", "labelWeight")).toEqual(["bold", "bold", "bold"]);
        const out = await registry.exportGraphToString(result.snapshot, "pajek", {
            styles: result.styles ?? undefined,
        });
        expect(out).toMatch(/^1 a .*font Courier$/m);
        expect(out).toMatch(/^2 b .*font Helvetica$/m);
    });
});

describe("Pajek's empty vertex label", () => {
    it("is drawn white at size 1 where the line sets neither, in the place lr and lphi give any label", async () => {
        // pajek-synth-vertices: `empty 6` (nothing set) starts 5.18 right of its center, its middle 18.97 below;
        // `empty 14` (lr 12 lphi 225) starts at (-8.49, +8.49); `empty 22` (lc Yellow) is yellow, v71 (fos 18) 18
        const { get } = await load(
            "*Vertices 4\n1 a 0.1 0.1 0.5 empty\n2 b 0.2 0.2 0.5 empty lr 12 lphi 225\n" +
                "3 c 0.3 0.3 0.5 empty lc Yellow fos 18\n4 d 0.4 0.4 0.5 ellipse\n",
        );
        expect(get("node", "labelSize")).toEqual([1, 1, 18, 15]);
        expect(get("node", "labelColor")).toEqual(["#ffffff", "#ffffff", "#ffff00", "#ad0000"]);
        expect(get("node", "labelShiftX").slice(0, 3)).toEqual([0.5, 0.5, 0.5]);
        const [x, y] = [get("node", "labelOffsetX"), get("node", "labelOffsetY")];
        expect(x[0]).toBeCloseTo(5.18, 2);
        expect(y[0]).toBeCloseTo(18.97, 1);
        expect(x[1]).toBeCloseTo(-8.49, 2);
        expect(y[1]).toBeCloseTo(8.14, 1);
    });

    it("has no size, so its lines run to its center, whatever x_fact and y_fact say", async () => {
        // pajek-lin-rel4 v228 -> v23, pajek-synth-vertices 6 -> 7 (`empty s_size 3`): Pajek draws the line from the
        // empty vertex's center; a sized box stopped graphty's line half that box short of it
        const { get } = await load(
            "*Vertices 3\n1 a 0.1 0.1 0.5 empty\n2 b 0.2 0.2 0.5 empty x_fact 2 y_fact 1.5\n3 c 0.3 0.3 0.5 ellipse\n",
        );
        expect(get("node", "width").slice(0, 2)).toEqual([0, 0]);
        expect(get("node", "height").slice(0, 2)).toEqual([0, 0]);
        expect(get("node", "width")[2]).not.toBe(0);
    });
});

describe("Pajek color names its SVG export draws otherwise", () => {
    it("draws LightOrange as its default vertex fill, and a name it does not know white on a vertex, black on a line", async () => {
        // pajek-specimen-node-fills-borders-p2 `ic-lightorange` (#ffd9bc), -p3 `ic-unknown-name`, `ic-lowercase-name`
        const { get } = await load(
            "*Vertices 3\n1 a ic LightOrange\n2 b ic red\n3 c ic NoSuchColor\n*Arcs\n1 2 1 c red\n2 3 1 c Blue\n",
        );
        expect(get("node", "fill")).toEqual(["#ffd9bc", "#ffffff", "#ffffff"]);
        expect(get("edge", "color")).toEqual(["#000000", "#0000ff"]);
    });
});

describe("Pajek line labels", () => {
    const doc = '*Vertices 2\n1 a\n2 b\n*Edges\n1 2 1 l "Ab"\n';

    it("draws none but under Mark Lines / with Labels, and still writes the file's own label back", async () => {
        // pajek-specimen-edge-labels-p2 (Pajek's default) draws none; pajek-specimen-edge-labels (Form8.withLabels1)
        const plain = await load(doc);
        expect(plain.get("edge", "label")).toEqual([null]);
        expect((await load(doc, { ini: { "Form8.MarkVerticesUsing": 4 } })).get("edge", "label")).toEqual([null]);
        expect((await load(doc, { ini: { "Form8.withLabels1": "" } })).get("edge", "label")).toEqual(["Ab"]);
        const out = await registry.exportGraphToString(plain.result.snapshot, "pajek", {
            styles: plain.result.styles ?? undefined,
        });
        expect(out).toMatch(/^1 2 1 .*\bl "?Ab"?/m);
    });
});

describe("Pajek line label places (lp, lr, lphi, la)", () => {
    it("hangs the label at lp from the target, out by lr at lphi, and turns it along the line and by la", async () => {
        // pajek-specimen-edge-labels in a 1200 x 900 window: each line 76 long, level; `lp 0.2` is drawn 15.2 from
        // the target, `lp 20` 20 from it, `lr 12 lphi 90` 12 above, `la 45` rotate(-45); the label's middle 3.465
        // above its baseline at size 10
        const doc = [
            "*Vertices 8",
            "1 a 0.1 0.5 0.5",
            "2 b 0.163333333333 0.5 0.5",
            "3 c 0.3 0.5 0.5",
            "4 d 0.363333333333 0.5 0.5",
            "5 e 0.5 0.5 0.5",
            "6 f 0.563333333333 0.5 0.5",
            "7 g 0.7 0.5 0.5",
            "8 h 0.7 0.6 0.5",
            "*Edges",
            '1 2 1 l "Ab" lp 0.2 fos 10',
            '3 4 1 l "Ab" lp 20 fos 10',
            '5 6 1 l "Ab" lr 12 lphi 90 la 45 fos 10',
            '7 8 1 l "Ab" fos 10',
            "",
        ].join("\n");
        const { get } = await load(doc, { width: 1200, height: 900, ini: { "Form8.withLabels1": "" } });
        const x = get("edge", "labelOffsetX") as number[];
        const y = get("edge", "labelOffsetY") as number[];
        expect(x[0]).toBeCloseTo(0.3 * 76, 3);
        expect(x[1]).toBeCloseTo(38 - 20, 3);
        // turned 45 counterclockwise about its baseline point, its middle 3.465 above it in its own frame
        const half = 3.465 * Math.SQRT1_2;
        expect(x[2]).toBeCloseTo(-half, 3);
        expect(y[2]).toBeCloseTo(-12 - half, 3);
        expect(y[0]).toBeCloseTo(-3.465, 3);
        // a level line's label turned by la; a line straight down (90 degrees on screen) turns its label with it
        expect(get("edge", "labelRotation")).toEqual([0, 0, 315, 90]);
    });
});

describe("Pajek Bezier lines (a1, k1, a2, k2)", () => {
    const doc = [
        "*Vertices 6",
        "1 a 0.1 0.5 0.5",
        "2 b 0.163333333333 0.5 0.5",
        "3 c 0.3 0.5 0.5",
        "4 d 0.363333333333 0.5 0.5",
        "5 e 0.5 0.5 0.5",
        "6 f 0.563333333333 0.5 0.5",
        "*Edges",
        '1 2 1 a1 40 k1 1.5 a2 -40 k2 1.5 l "Ab"',
        "3 4 1 a1 0 k1 -1 a2 0 k2 20",
        "5 5 1 a1 -130 k1 0.6 a2 -130 k2 0.6",
        "",
    ].join("\n");

    it("draws one cubic curve through the control points k / 2 of the line out, turned by a1 and a2", async () => {
        // pajek-specimen-edges-lines-p2 `3 4`: M 170 128.5 C 213.66 165.14 202.34 91.86 246 128.5 on a line 76 long:
        // the first control 0.5745 along and 0.4821 to the right, the second 0.4255 along and 0.4821 to the left
        const { get } = await load(doc, { width: 1200, height: 900, ini: { "Form8.withLabels1": "" } });
        // the loop `5 5` is the same route of a line 500 long to the right, both its ends on its node (10 across half)
        const loop = "-9.6418,11.4907 9.6418,11.4907";
        expect(get("edge", "bends")).toEqual(["0.5745,-0.4821 0.4255,0.4821", null, loop]);
        expect(get("edge", "bendCurve")).toEqual(["bezier", null, "bezier"]);
        expect(get("edge", "curved")).toEqual([true, null, true]);
        // its label is turned along the curve at its middle (`pajek-specimen-edge-labels` `on-bezier`: rotate(-48.57))
        expect(get("edge", "labelRotation")[0]).toBeCloseTo(360 - 48.57, 1);
        // Straight Lines leaves a line's own Bezier route and a loop curved, as the SVG export draws them, and only the
        // other lines straight (`pajek-specimen-edges-lines-p4`: route-bezier-* drawn as on -p2)
        const straight = await load(doc, { width: 1200, height: 900, ini: { "Form10.StraightLinesOnly1": "" } });
        expect(straight.get("edge", "bends")).toEqual(["0.5745,-0.4821 0.4255,0.4821", null, loop]);
        expect(straight.get("edge", "curved")).toEqual([true, false, true]);
    });

    it("draws a loop with no route parameters up from its node, as Pajek's SVG export does", async () => {
        // pajek-specimen-edges-lines-p2 `loop`: a cubic from the center of a vertex 12 across, its controls 74.9 out
        // at 70 and 110 degrees up from the right; its label turned along the loop's top, right to left (179.97)
        const { get } = await load('*Vertices 1\n1 a 0.5 0.5 0.5 x_fact 0.6 y_fact 0.6\n*Arcs\n1 1 1 l "Ab"\n', {
            width: 1200,
            height: 900,
            ini: { "Form8.withLabels1": "" },
        });
        expect(get("edge", "bends")).toEqual(["4.2753,11.7462 -4.2753,11.7462"]);
        expect(get("edge", "bendCurve")).toEqual(["bezier"]);
        expect(get("edge", "labelRotation")[0]).toBeCloseTo(180, 1);
        // an arc's head is drawn at the node's center, under it: none shows
        expect(get("edge", "targetArrow")).toEqual(["none"]);
    });
});

describe("Pajek's SVG Vertices 3D Effect", () => {
    it("fills each vertex with a gradient from its color at the top to half of it at the bottom", async () => {
        // pajek-specimen-node-shapes-p2: #ffd9bc runs to rgb(128,108,94), #c8c8c8 to rgb(100,100,100)
        const doc = "*Vertices 2\n1 a\n2 b ic RGBC8C8C8\n";
        expect((await load(doc)).get("node", "fillGradient")).toEqual([null, null]);
        const { get } = await load(doc, { ini: { "Form10.effect3d": "" } });
        expect(get("node", "fill")).toEqual(["#ffd9bc", "#c8c8c8"]);
        expect(get("node", "fillGradient")).toEqual(["#806c5e", "#646464"]);
        expect(get("node", "fillGradientAngle")).toEqual([90, 90]);
        // the gradient turns with the vertex (`pajek-specimen-node-shapes-p2` `phi-90-box`: left to right)
        const turned = await load("*Vertices 1\n1 a 0.1 0.1 0.5 box phi 90\n", { ini: { "Form10.effect3d": "" } });
        expect(turned.get("node", "fillGradientAngle")).toEqual([0]);
    });
});
