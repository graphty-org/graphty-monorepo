/**
 * The style fidelity comparer's self-test: color difference against Sharma's published CIEDE2000
 * pairs, the similarity fit (rotation, scale, reflection, degenerate input), Frechet distance,
 * element matching (id maps, edge ordinals, reversed edges) and property selection across routes.
 */
import { describe, expect, it } from "vitest";

import {
    apply,
    ciede2000,
    compareSample,
    compareScenes,
    deltaE,
    fitSimilarity,
    frechet,
    iou,
    jaccard,
    matchScenes,
    resample,
    zOrderTau,
} from "./compare.js";
import { canCarry } from "./routes.js";
import { PROPERTIES, type RouteId, type Scene, type SceneEdge, type SceneNode } from "./scene.js";

const node = (id: string, x: number, y: number, extra: Partial<SceneNode> = {}): SceneNode => ({
    id,
    x,
    y,
    w: 10,
    h: 10,
    shape: "ellipse",
    fill: "#ff0000",
    fillOpacity: 1,
    border: { color: "#000000", width: 1, style: "solid" },
    label: { text: id, fontSize: 12, color: "#000000", position: "inside", visible: true },
    visible: true,
    z: 0,
    ...extra,
});

const edge = (
    id: string,
    source: string,
    target: string,
    points: [number, number][],
    extra: Partial<SceneEdge> = {},
): SceneEdge => ({
    id,
    source,
    target,
    points,
    curved: false,
    color: "#000000",
    opacity: 1,
    width: 1,
    style: "solid",
    arrow: { source: "none", target: "filled-triangle" },
    label: null,
    ...extra,
});

const scene = (route: RouteId, nodes: SceneNode[], edges: SceneEdge[] = [], gaps: Scene["gaps"] = []): Scene => ({
    provenance: {
        side: route === "graphty" ? "graphty" : "reference",
        route,
        tool: "t",
        version: "1",
        command: "c",
        sourceSha256: "0",
        generatedAt: "now",
    },
    canCarry: canCarry(route, PROPERTIES),
    nodes,
    edges,
    groups: [],
    gaps,
});

describe("CIEDE2000", () => {
    // Sharma, Wu and Dalal (2005), Table 1, pairs 1, 7, 17 and 25.
    it.each([
        [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
        [[50, 0, 0], [50, -1, 2], 2.3669],
        [[50, 2.5, 0], [73, 25, -18], 27.1492],
        [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    ])("matches the published difference for %j vs %j", (a, b, want) => {
        expect(ciede2000(a, b)).toBeCloseTo(want, 4);
        expect(ciede2000(b, a)).toBeCloseTo(want, 4);
    });

    it("is zero for equal colors, about 100 for black and white, and small for near colors", () => {
        expect(deltaE("#1e88e5", "#1e88e5")).toBe(0);
        expect(deltaE("#000000", "#ffffff")).toBeCloseTo(100, 0);
        expect(deltaE("#808080", "#818181")).toBeLessThan(1);
        expect(deltaE("#ff0000", "#00ff00")).toBeGreaterThan(50);
    });
});

describe("similarity fit", () => {
    const pts: [number, number][] = [
        [0, 0],
        [10, 0],
        [0, 5],
        [7, 9],
    ];

    it("recovers a rotation, scale and translation", () => {
        const t = { scale: 2.5, rotation: 0.7, reflect: false, tx: 100, ty: -40 };
        const fit = fitSimilarity(
            pts,
            pts.map((p) => apply(t, p)),
        );
        expect(fit?.reflect).toBe(false);
        expect(fit?.scale).toBeCloseTo(2.5, 9);
        expect(fit?.rotation).toBeCloseTo(0.7, 9);
        expect(fit?.sse).toBeCloseTo(0, 9);
    });

    it("recovers a reflection (y up against y down)", () => {
        const t = { scale: 0.5, rotation: 0, reflect: true, tx: 3, ty: 3 };
        const to = pts.map((p) => apply(t, p));
        const fit = fitSimilarity(pts, to);
        expect(fit?.reflect).toBe(true);
        expect(fit?.scale).toBeCloseTo(0.5, 9);
        if (fit) {
            pts.forEach((p, i) => {
                expect(apply(fit, p)[0]).toBeCloseTo(to[i][0], 9);
                expect(apply(fit, p)[1]).toBeCloseTo(to[i][1], 9);
            });
        }
    });

    it("refuses points that all sit at one place", () => {
        expect(
            fitSimilarity(
                pts.map(() => [3, 3]),
                pts,
            ),
        ).toBeNull();
        expect(
            fitSimilarity(
                pts,
                pts.map(() => [0, 0]),
            ),
        ).toBeNull();
        expect(fitSimilarity([[1, 1]], [[2, 2]])).toBeNull();
    });
});

describe("path and box measures", () => {
    it("Frechet distance of resampled paths ignores vertex count but sees a bend", () => {
        const straight: [number, number][] = [
            [0, 0],
            [10, 0],
        ];
        const many: [number, number][] = Array.from({ length: 11 }, (_, i): [number, number] => [i, 0]);
        expect(frechet(resample(straight, 32), resample(many, 32))).toBeCloseTo(0, 9);
        const bent: [number, number][] = [
            [0, 0],
            [5, 4],
            [10, 0],
        ];
        // the apex falls between samples, so the discrete distance is within one sample spacing of 4
        expect(Math.abs(frechet(resample(straight, 32), resample(bent, 32)) - 4)).toBeLessThan(0.4);
        expect(frechet([], straight)).toBe(Number.POSITIVE_INFINITY);
    });

    it("IoU, Jaccard and Kendall tau", () => {
        expect(iou({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 0, w: 2, h: 2 })).toBeCloseTo(1 / 3, 9);
        expect(iou({ x: 0, y: 0, w: 1, h: 1 }, { x: 5, y: 5, w: 1, h: 1 })).toBe(0);
        expect(jaccard(new Set(["a", "b"]), new Set(["b", "c"]))).toBeCloseTo(1 / 3, 9);
        expect(jaccard(new Set(), new Set())).toBe(1);
        const a = node("a", 0, 0, { z: 1 });
        const b = node("b", 2, 0, { z: 2 });
        const far = node("c", 100, 0, { z: 3 });
        expect(
            zOrderTau([
                [a, { ...a, z: 5 }],
                [b, { ...b, z: 9 }],
                [far, far],
            ]),
        ).toEqual({ tau: 1, n: 1 });
        expect(
            zOrderTau([
                [a, { ...a, z: 9 }],
                [b, { ...b, z: 5 }],
            ]),
        ).toEqual({ tau: -1, n: 1 });
        expect(
            zOrderTau([
                [a, a],
                [far, far],
            ]),
        ).toBeNull();
    });
});

describe("matching", () => {
    it("maps node ids, pairs parallel edges by ordinal and finds reversed edges", () => {
        const ref = scene(
            "cytoscape-desktop",
            [node("A", 0, 0), node("B", 10, 0), node("C", 0, 10)],
            [edge("A->B", "A", "B", []), edge("A->B#1", "A", "B", []), edge("C->A", "C", "A", [])],
        );
        const sub = scene(
            "graphty",
            [node("1", 0, 0), node("2", 10, 0), node("3", 0, 10), node("4", 5, 5)],
            [edge("0", "1", "2", []), edge("1", "1", "2", []), edge("2", "1", "3", []), edge("3", "4", "1", [])],
        );
        const m = matchScenes(
            ref,
            sub,
            new Map([
                ["1", "A"],
                ["2", "B"],
                ["3", "C"],
            ]),
        );
        expect(m.counts).toMatchObject({ matchedNodes: 3, matchedEdges: 3, reversedEdges: 1, extraSubjectEdges: 1 });
        expect(m.counts.unmatchedSubjectNodes).toEqual(["4"]);
        expect(m.edges.map(([r, s, rev]) => [r.id, s.id, rev])).toEqual([
            ["A->B", "0", false],
            ["A->B#1", "1", false],
            ["C->A", "2", true],
        ]);
    });

    it("takes an id match only when its ends agree", () => {
        const ref = scene("yed-file", [node("a", 0, 0), node("b", 1, 0)], [edge("0", "a", "b", [])]);
        const sub = scene(
            "graphty",
            [node("a", 0, 0), node("b", 1, 0)],
            [edge("0", "b", "b", []), edge("1", "a", "b", [])],
        );
        const m = matchScenes(ref, sub);
        expect(m.edges.map(([r, s]) => [r.id, s.id])).toEqual([["0", "1"]]);
    });
});

describe("scene comparison", () => {
    const ref = scene(
        "yed-file",
        [node("a", 0, 0), node("b", 100, 0, { fill: "#00ff00" }), node("c", 0, 100, { shape: "rect" })],
        [
            edge("e", "a", "b", [
                [0, 0],
                [100, 0],
            ]),
        ],
    );
    // graphty draws it at half scale, y flipped, b's fill slightly off and c a circle
    const sub = scene(
        "graphty",
        [
            node("a", 400, 300, {
                w: 5,
                h: 5,
                border: { color: "#000000", width: 0.5, style: "solid" },
                label: { text: "a", fontSize: 6, color: "#000000", position: "inside", visible: true },
            }),
            node("b", 450, 300, {
                w: 5,
                h: 5,
                fill: "#00fe01",
                border: { color: "#000000", width: 0.5, style: "solid" },
                label: { text: "b", fontSize: 6, color: "#000000", position: "inside", visible: true },
            }),
            node("c", 400, 250, {
                w: 5,
                h: 5,
                border: { color: "#000000", width: 0.5, style: "solid" },
                label: { text: "c", fontSize: 6, color: "#000000", position: "inside", visible: true },
            }),
        ],
        [
            edge(
                "0",
                "a",
                "b",
                [
                    [400, 300],
                    [450, 300],
                ],
                { width: 0.5 },
            ),
        ],
        [{ property: "zOrder", reason: "no read-back" }],
    );

    it("scores each property after the fit", () => {
        const c = compareScenes(ref, sub);
        expect(c.transform?.scale).toBeCloseTo(2, 9);
        expect(c.transform?.reflect).toBe(true);
        expect(c.properties.position.status).toBe("pass");
        expect(c.properties.size.status).toBe("pass");
        expect(c.properties.fill.status).toBe("pass");
        expect(c.properties.fontSize.status).toBe("pass");
        expect(c.properties.edgeWidth.status).toBe("pass");
        expect(c.properties.edgePath.status).toBe("pass");
        expect(c.properties.shape).toMatchObject({
            status: "fail",
            n: 3,
            worst: [{ id: "c", value: "ellipse", ref: "rect" }],
        });
        expect(c.properties.shape.passRate).toBeCloseTo(2 / 3, 9);
        expect(c.properties.zOrder).toMatchObject({ status: "gap", passRate: 0 });
        expect(c.properties.groups.status).toBe("unjudged");
    });

    it("marks positions at one point degenerate, not passed", () => {
        const flat = { ...sub, nodes: sub.nodes.map((n) => ({ ...n, x: 0, y: 0 })) };
        const c = compareScenes(ref, flat);
        expect(c.transform).toBeNull();
        expect(c.properties.position.status).toBe("degenerate");
        expect(c.properties.size.status).toBe("degenerate");
        expect(c.properties.fill.status).toBe("pass");
    });

    it("takes each property from the best route that carries it, and checks the routes against each other", () => {
        // gephi's ledger cannot carry shape; sigma's cannot carry border
        const gephi = {
            ...ref,
            provenance: { ...ref.provenance, route: "gephi-noscale" as const },
            canCarry: canCarry("gephi-noscale", PROPERTIES),
        };
        const sigma = {
            ...ref,
            provenance: { ...ref.provenance, route: "sigma" as const },
            canCarry: canCarry("sigma", PROPERTIES),
        };
        const r = compareSample("s", [gephi, sigma], sub);
        expect(r.references).toEqual(["gephi-noscale", "sigma"]);
        expect(r.properties.fill.judgedAgainst).toBe("gephi-noscale");
        expect(r.properties.shape).toMatchObject({ judgedAgainst: null, status: "unjudged" });
        expect(r.properties.edgeOpacity.judgedAgainst).toBe("sigma");
        expect(r.properties.borderWidth).toMatchObject({ judgedAgainst: "gephi-noscale" });
        expect(r.routeChecks.sigma?.against).toBe("gephi-noscale");
        expect(r.routeChecks.sigma?.ledger.shape).toBe("no");
        expect(r.routeChecks.sigma?.properties.position.status).toBe("pass");
    });

    it("reports a property no route carries as unjudged", () => {
        const sigma = {
            ...ref,
            provenance: { ...ref.provenance, route: "sigma" as const },
            canCarry: canCarry("sigma", PROPERTIES),
        };
        const r = compareSample("s", [sigma], sub);
        expect(r.properties.borderWidth).toMatchObject({ judgedAgainst: null, status: "unjudged", passRate: null });
    });

    it("maps graphty ids through a name column and an id-named route through labels", () => {
        const desktop = scene("cytoscape-desktop", [node("A", 0, 0), node("B", 10, 0), node("C", 0, 10)]);
        const g = scene("graphty", [node("1", 0, 0), node("2", 10, 0), node("3", 0, 10)]);
        const r = compareSample("s", [desktop], g, {
            name: new Map([
                ["1", "A"],
                ["2", "B"],
                ["3", "C"],
            ]),
        });
        expect(r.counts.matchedNodes).toBe(3);

        const yed = scene("yed-file", [
            node("0", 0, 0, {
                label: { text: "x", fontSize: 12, color: "#000000", position: "inside", visible: true },
            }),
            node("1", 10, 0, {
                label: { text: "y", fontSize: 12, color: "#000000", position: "inside", visible: true },
            }),
            node("2", 0, 10),
        ]);
        const gml = scene("cytoscape-gml", [node("x", 0, 0), node("y", 10, 0), node("2", 0, 10)]);
        const r2 = compareSample("s", [yed, gml], g);
        expect(r2.routeChecks["cytoscape-gml"]?.counts.matchedNodes).toBe(3);
    });
});
