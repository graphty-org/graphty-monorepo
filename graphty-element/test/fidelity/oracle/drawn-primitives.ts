/**
 * graphty-element's drawing in the oracle comparison's primitive model (`primitives.ts`): the
 * scene `extractScene` built from the renderer (with its precedence rules: a hidden node, a
 * covered fill, an occluded label are not drawn) plus what only the raw drawn read
 * (`drawn-scene.ts`) carries -- a label's weight, style, family and rotation, a gradient fill,
 * each flat arrowhead's outline. Lengths are render pixels, y down. Pure: no DOM.
 */
import type { Scene, ShapeClass } from "../../../../graph-io/test/fidelity/scene";
import type { DrawnGraph, DrawnLabel } from "../drawn-scene";
import { borderInset } from "../extract-scene";
import { measureArrow, mergeTexts } from "./associate";
import { compareIds, dashClassOf, type PArrow, type PNode, type PScene, type PShape, type PText } from "./primitives";

const SHAPES: Partial<Record<ShapeClass, PShape>> = {
    ellipse: "ellipse",
    rect: "rect",
    roundrect: "roundrect",
    triangle: "triangle",
    diamond: "diamond",
    hexagon: "hexagon",
    octagon: "octagon",
};

function textOf(d: DrawnLabel): PText {
    const x = (d.box.x0 + d.box.x1) / 2;
    const y = (d.box.y0 + d.box.y1) / 2;
    return {
        content: d.text,
        x,
        y,
        box: { x0: d.box.x0, y0: d.box.y0, x1: d.box.x1, y1: d.box.y1 },
        sizePx: d.fontPx,
        family: d.family,
        weight: d.weight,
        style: d.style === "italic" || d.style === "oblique" ? d.style : "normal",
        anchor: "middle",
        rotation: d.rotation,
        color: d.color,
        opacity: 1,
    };
}

/**
 * graphty's line styles by the class of their first dash, the rule `dashClassOf` reads an SVG dash array by: a
 * dash-dot or long-dash line starts with a dash, as a program's own dash-dot dash array does.
 */
const DASH: Readonly<Record<string, "solid" | "dashed" | "dotted" | "other">> = {
    solid: "solid",
    dashed: "dashed",
    dotted: "dotted",
    dash: "dashed",
    dot: "dotted",
    "dash-dot": "dashed",
};

/**
 * graphty's drawing as primitives.
 * @param scene - `extractScene` of the drawing
 * @param drawn - `readDrawn` of the same frame
 * @returns the scene in the primitive model
 */
export function drawnPrimitives(scene: Scene, drawn: DrawnGraph): PScene {
    const groupIds = new Set(scene.groups.map((g) => g.id));
    const nodes: PNode[] = [];
    for (const n of scene.nodes) {
        if (!n.visible || groupIds.has(n.id)) {
            continue;
        }
        const d = drawn.nodes.get(n.id);
        const inset = d === undefined ? 0 : 2 * borderInset(d);
        const label = n.label?.visible === true && d?.label ? textOf(d.label) : null;
        // A fill under one render pixel is drawn all the same: the comparison judges it at the oracle's scale, where a
        // layout graphty spreads wider than the program's does not shrink it out of sight (`compareOracle`).
        const sub = n.drawn;
        const tiny = n.visible && sub?.subPixel === true && !sub.fillCovered && n.fillOpacity > 0;
        const fill: string | null = n.fill ?? (tiny && typeof sub.fillDrawn === "string" ? sub.fillDrawn : null);
        nodes.push({
            id: n.id,
            cx: n.x,
            cy: n.y,
            // the fill, which graphty's border rings from outside (the scene's size takes the inset back)
            w: n.w - inset,
            h: n.h - inset,
            shape: SHAPES[n.shape] ?? "other",
            fill:
                fill === null
                    ? null
                    : {
                          color: fill,
                          opacity: n.fillOpacity,
                          gradient: d?.gradient === true ? { kind: "linear", stops: [] } : null,
                      },
            stroke:
                n.border.color !== null && n.border.width > 0
                    ? {
                          color: n.border.color,
                          opacity: 1,
                          width: n.border.width,
                          dash: null,
                          dashClass: n.border.style,
                          ...(d?.border?.screen === true ? { screen: true } : {}),
                      }
                    : null,
            label,
            inset: inset > 0,
        });
    }
    const edges = scene.edges.flatMap((e) => {
        const d = drawn.edges.get(e.id);
        if (d === undefined || e.points.length < 2 || e.width <= 0 || e.opacity <= 0) {
            return [];
        }
        const arrows: PArrow[] = d.caps.map((c) => {
            const end = c.end === "arrowHead" ? "target" : "source";
            return c.outline === null
                ? { end, length: c.sizePx, width: c.sizePx, filled: true }
                : measureArrow(c.outline, d.points, end, !c.name.includes("open"));
        });
        // by the pattern graphty drew (a dash-dot is no class of the scene's four, and would read "other")
        const dashClass = (d.pattern === null ? undefined : DASH[d.pattern]) ?? DASH[e.style] ?? "other";
        return [
            {
                id: e.id,
                source: e.source,
                target: e.target,
                points: e.points,
                stroke: {
                    color: e.color,
                    opacity: e.opacity,
                    width: e.width,
                    dash: null,
                    dashClass: dashClass === "solid" ? dashClassOf(null, e.width) : dashClass,
                },
                arrows,
                // the texts at its ends belong to it too, as the oracle reads every text beside an edge
                label: mergeTexts(
                    [e.label !== null ? d.label : null, ...d.endLabels]
                        .filter((l): l is DrawnLabel => l !== null && l.enabled && l.fontPx >= 1 && l.text !== "")
                        .map(textOf),
                ),
            },
        ];
    });
    const groups = scene.groups.map((g) => {
        const n = scene.nodes.find((x) => x.id === g.id);
        const d = drawn.nodes.get(g.id);
        return {
            id: g.id,
            box: { x0: g.bbox.x, y0: g.bbox.y, x1: g.bbox.x + g.bbox.w, y1: g.bbox.y + g.bbox.h },
            fill: g.fill === null ? null : { color: g.fill, opacity: n?.fillOpacity ?? 1, gradient: null },
            stroke:
                n !== undefined && n.border.color !== null && n.border.width > 0
                    ? {
                          color: n.border.color,
                          opacity: 1,
                          width: n.border.width,
                          dash: null,
                          dashClass: n.border.style,
                      }
                    : null,
            label: g.label !== null && d?.label ? textOf(d.label) : null,
            members: [...g.members].sort(),
        };
    });
    return {
        side: "graphty",
        width: drawn.width,
        height: drawn.height,
        background: scene.background ?? null,
        nodes: nodes.sort((a, b) => compareIds(a.id, b.id)),
        edges: edges.sort((a, b) => compareIds(a.id, b.id)),
        groups: groups.sort((a, b) => (a.id < b.id ? -1 : 1)),
        texts: [],
        strays: (scene.annotations ?? []).map((a, i) => ({
            index: i,
            tag: `annotation-${a.kind}`,
            kind: a.kind === "text" ? "text" : "shape",
            box: { x0: a.bbox.x, y0: a.bbox.y, x1: a.bbox.x + a.bbox.w, y1: a.bbox.y + a.bbox.h },
            fill: null,
            stroke: null,
            text: a.text ?? null,
        })),
    };
}
