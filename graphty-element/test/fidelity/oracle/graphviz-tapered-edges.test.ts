/**
 * Graphviz draws a `style=tapered` edge as one filled polygon and no line (#706): the outline runs along one side of
 * the edge and back along the other, as wide as the pen at the tail and a point at the head (`dir=both`: a point at
 * each end, widest in the middle). The markup names the polygon as the edge's, but with no line in it no edge was
 * read: the edge was missing and its polygon a stray (dot-specimen-edges-lines style-tapered, style-tapered-both,
 * style-tapered-back; dot-synth-edges-clusters c1_0 -> c2_0). The points are the oracle's own.
 */
import { assert, describe, it } from "vitest";

import { associate } from "./associate";
import { type PNode, type Prim, type PScene, type Pt, taperedOutline } from "./primitives";

/** style-tapered (dir=forward, penwidth 7), as the SVG's polygon writes it, closed. */
const FORWARD: Pt[] = [
    [1018.15, -541.61], [1020.44, -541.48], [1023.01, -541.34], [1025.82, -541.18], [1028.84, -541.02],
    [1032.04, -540.84], [1035.39, -540.65], [1038.86, -540.46], [1042.41, -540.26], [1046.03, -540.06],
    [1049.68, -539.86], [1053.33, -539.66], [1056.95, -539.46], [1060.5, -539.26], [1063.97, -539.07],
    [1067.32, -538.88], [1070.51, -538.7], [1073.53, -538.54], [1076.34, -538.38], [1078.91, -538.24],
    [1081.2, -538.11], [1081.2, -538.11], [1078.91, -537.98], [1076.34, -537.84], [1073.53, -537.68],
    [1070.51, -537.52], [1067.32, -537.34], [1063.97, -537.15], [1060.5, -536.96], [1056.95, -536.76],
    [1053.33, -536.56], [1049.68, -536.36], [1046.03, -536.16], [1042.41, -535.96], [1038.86, -535.76],
    [1035.39, -535.57], [1032.04, -535.38], [1028.84, -535.2], [1025.82, -535.04], [1023.01, -534.88],
    [1020.44, -534.74], [1018.15, -534.61], [1018.15, -541.61],
]; // prettier-ignore

/** style-tapered-both (dir=both), as the SVG's polygon writes it: its second side ends on the first point. */
const BOTH: Pt[] = [
    [84.81, -447], [87.11, -447.25], [89.68, -447.54], [92.49, -447.85], [95.51, -448.19], [98.7, -448.54],
    [102.05, -448.91], [105.52, -449.3], [109.08, -449.69], [112.7, -450.09], [116.35, -450.5], [119.99, -450.09],
    [123.61, -449.69], [127.17, -449.3], [130.64, -448.91], [133.98, -448.54], [137.18, -448.19], [140.2, -447.85],
    [143.01, -447.54], [145.57, -447.25], [147.87, -447], [147.87, -447], [145.57, -446.74], [143.01, -446.46],
    [140.2, -446.15], [137.18, -445.81], [133.98, -445.46], [130.64, -445.09], [127.17, -444.7], [123.61, -444.31],
    [119.99, -443.9], [116.35, -443.5], [112.7, -443.9], [109.08, -444.3], [105.52, -444.7], [102.05, -445.08],
    [98.7, -445.46], [95.51, -445.81], [92.49, -446.15], [89.68, -446.46], [87.11, -446.74], [84.81, -447],
    [84.81, -447],
]; // prettier-ignore

/** The points as the SVG reader gives them: it closes a polygon once more. */
const read = (points: readonly Pt[]): Pt[] => [...points, points[0]];

describe("Graphviz's tapered edge outline", () => {
    it("reads dir=forward as a line from the pen's width at the tail to a point at the head", () => {
        const band = taperedOutline(read(FORWARD));
        assert.isNotNull(band);
        assert.strictEqual(band.dashClass, "tapered");
        assert.closeTo(band.width ?? Number.NaN, 7, 0.01);
        const route = band.route ?? [];
        assert.deepEqual(route[0], [1018.15, -538.11]);
        assert.deepEqual(route.at(-1), [1081.2, -538.11]);
    });

    it("reads dir=both as a line widest in the middle, a point at each end", () => {
        const band = taperedOutline(read(BOTH));
        assert.isNotNull(band);
        assert.closeTo(band.width ?? Number.NaN, 7, 0.01);
        const route = band.route ?? [];
        assert.deepEqual(route[0], [84.81, -447]);
        assert.deepEqual(route.at(-1), [147.87, -447]);
    });

    it("reads no taper in a filled box or an arrowhead", () => {
        assert.isNull(
            taperedOutline([
                [0, 0],
                [10, 0],
                [10, 10],
                [0, 10],
                [0, 0],
            ]),
        );
        assert.isNull(
            taperedOutline([
                [0, 0],
                [10, 3.5],
                [0, 7],
                [0, 0],
            ]),
        );
    });

    it("is the edge the markup names, its polygon no stray", () => {
        const node = (id: string, x: number): PNode => ({
            id,
            cx: x,
            cy: -538,
            w: 12,
            h: 12,
            shape: "ellipse",
            fill: null,
            stroke: null,
            label: null,
        });
        const disc = (index: number, id: string, x: number): Prim => ({
            index,
            tag: "ellipse",
            kind: "shape",
            box: { x0: x - 6, y0: -544, x1: x + 6, y1: -532 },
            points: Array.from({ length: 24 }, (_, i): Pt => [
                x + 6 * Math.cos((i * Math.PI) / 12),
                -538 + 6 * Math.sin((i * Math.PI) / 12),
            ]),
            closed: true,
            corners: 0,
            fill: { color: "#c8c8c8", opacity: 1, gradient: null },
            stroke: { color: "#505050", opacity: 1, width: 1, dash: null, dashClass: "solid" },
            text: null,
            markers: { start: false, end: false },
            hint: { role: "node", id, key: id },
        });
        const points = read(FORWARD);
        const polygon: Prim = {
            index: 2,
            tag: "polygon",
            kind: "shape",
            box: {
                x0: Math.min(...points.map(([x]) => x)),
                y0: Math.min(...points.map(([, y]) => y)),
                x1: Math.max(...points.map(([x]) => x)),
                y1: Math.max(...points.map(([, y]) => y)),
            },
            points,
            closed: true,
            corners: 42,
            fill: { color: "#505050", opacity: 1, gradient: null },
            stroke: null,
            text: null,
            markers: { start: false, end: false },
            hint: { role: "edge", id: "s->t", key: "s->t", ends: ["s", "t"] },
        };
        const guide: PScene = {
            side: "graphty",
            width: 1200,
            height: 900,
            background: "#ffffff",
            nodes: [node("s", 1012), node("t", 1088)],
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const { scene } = associate([disc(0, "s", 1012), disc(1, "t", 1088), polygon], 1200, 900, guide);
        assert.deepEqual(
            scene.edges.map((e) => [e.id, e.stroke?.dashClass, e.stroke?.color]),
            [["s->t#0", "tapered", "#505050"]],
        );
        assert.deepEqual(scene.strays, []);
    });
});
