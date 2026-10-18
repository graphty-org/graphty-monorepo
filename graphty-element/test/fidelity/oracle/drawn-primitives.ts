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
import {
    type ArrowShape,
    compareIds,
    type DashClass,
    type PArrow,
    type PGradient,
    type PNode,
    type PScene,
    type PShape,
    type PText,
} from "./primitives";

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
    // the words' own box, as an SVG text's box is its letters', not the plane they are drawn on with its margins
    const b = d.textBox ?? d.box;
    const box = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    const n = Math.max(1, d.lineCount);
    const lineH = (box.y1 - box.y0) / n;
    const bg = d.background;
    return {
        content: d.text,
        x: (box.x0 + box.x1) / 2,
        y: (box.y0 + box.y1) / 2,
        box,
        sizePx: d.fontPx,
        family: d.family,
        weight: d.weight,
        style: d.style === "italic" || d.style === "oblique" ? d.style : "normal",
        anchor: "middle",
        rotation: d.rotation,
        color: d.color,
        opacity: d.opacity,
        // graphty draws its lines in one plane: their count is read, their alignment declared
        lines: Array.from({ length: n }, (_, i) => ({ ...box, y0: box.y0 + i * lineH, y1: box.y0 + (i + 1) * lineH })),
        align: d.align,
        outline: d.outline,
        background:
            bg === null
                ? null
                : {
                      box: bg.box,
                      fill: bg.color === null ? null : { color: bg.color, opacity: bg.opacity, gradient: null },
                      stroke:
                          bg.border === null
                              ? null
                              : {
                                    color: bg.border.color,
                                    opacity: bg.border.opacity,
                                    width: bg.border.width,
                                    dash: null,
                                    dashClass: "solid",
                                },
                      shape: bg.rounded ? "roundrect" : "rect",
                  },
    };
}

/**
 * The line class of each pattern graphty draws an edge or a border in. Its discrete patterns are elements one and a half
 * element lengths apart (`patternElementPeriod`), a gap no reader takes for a solid line, so the dash class
 * `dashClassOf` reads a dash array by is the element's: a dash three widths long is a dash, a dot or a square box one
 * width long a dot. A star or a diamond is a pattern no class names.
 */
const LINE_CLASS: Readonly<Record<string, DashClass>> = {
    solid: "solid",
    dashed: "dashed",
    dotted: "dotted",
    double: "double",
    dash: "dashed",
    dot: "dotted",
    box: "dotted",
    "dash-dot": "dash-dot",
    sinewave: "sinewave",
    zigzag: "zigzag",
};

/** The shape class of each cap type graphty draws; a hollow cap's is its filled twin's. */
const ARROW_SHAPE: Readonly<Record<string, ArrowShape>> = {
    normal: "triangle",
    "open-normal": "triangle",
    inverted: "inverted",
    vee: "vee",
    crow: "crow",
    diamond: "diamond",
    "open-diamond": "diamond",
    dot: "circle",
    "open-dot": "circle",
    "sphere-dot": "circle",
    box: "box",
    tee: "tee",
    "half-open": "half",
};

/**
 * A cap's shape class by its mesh's name (`arrow-2d-open-normal`, `sphere-dot-arrow-3d`): the longest cap type the name
 * holds, so "open-normal" is not read as "normal".
 * @param name - the cap's mesh name
 * @returns the class
 */
function arrowShapeNamed(name: string): ArrowShape {
    const type = Object.keys(ARROW_SHAPE)
        .filter((t) => name.includes(t))
        .sort((a, b) => b.length - a.length)[0];
    return type === undefined ? "other" : (ARROW_SHAPE[type] ?? "other");
}

/**
 * A node's gradient as graphty paints it: its colors as evenly spaced stops, a linear one along its direction.
 * @param ramp - the drawn ramp
 * @returns the gradient, or null
 */
function gradientOf(
    ramp: { kind: "linear" | "radial"; colors: string[]; direction: number | null } | null,
): PGradient | null {
    if (ramp === null) {
        return null;
    }
    const last = Math.max(ramp.colors.length - 1, 1);
    return {
        kind: ramp.kind,
        stops: ramp.colors.map((color, i) => ({ offset: i / last, color, opacity: 1 })),
        angle: ramp.kind === "linear" ? (ramp.direction ?? 0) : null,
    };
}

/**
 * graphty's drawing as primitives.
 * @param scene - `extractScene` of the drawing
 * @param drawn - `readDrawn` of the same frame
 * @param options - what to read
 * @param options.groups - false to compare every node as a node: a node drawn over smaller ones is no group box
 * @returns the scene in the primitive model
 */
export function drawnPrimitives(
    scene: Scene,
    drawn: DrawnGraph,
    options: { groups: boolean } = { groups: true },
): PScene {
    const sceneGroups = options.groups ? scene.groups : [];
    const groupIds = new Set(sceneGroups.map((g) => g.id));
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
                          gradient: d?.gradient === true ? gradientOf(d.ramp) : null,
                      },
            stroke:
                n.border.color !== null && n.border.width > 0
                    ? {
                          color: n.border.color,
                          opacity: 1,
                          width: n.border.width,
                          dash: null,
                          // the style the ring was built in: the scene folds a double border into "other"
                          dashClass: LINE_CLASS[d?.border?.style ?? n.border.style] ?? "other",
                          ...(d?.border?.screen === true ? { screen: true } : {}),
                      }
                    : null,
            label,
            inset: inset > 0,
        });
    }
    const edges = scene.edges.flatMap((e) => {
        const d = drawn.edges.get(e.id);
        if (d === undefined || !d.shown || e.points.length < 2 || e.width <= 0 || e.opacity <= 0) {
            return [];
        }
        // a cap drawn at no opacity or no size draws nothing
        const arrows: PArrow[] = d.caps
            .filter((c) => c.opacity > 0 && c.sizePx > 0)
            .map((c) => {
                const end = c.end === "arrowHead" ? "target" : "source";
                const look = { filled: !c.name.includes("open"), color: c.color, shape: arrowShapeNamed(c.name) };
                return c.outline === null
                    ? { end, length: c.sizePx, width: c.sizePx, ...look }
                    : measureArrow(c.outline, d.points, end, look);
            });
        // by the pattern graphty drew (the scene folds a dash-dot, a zigzag and a sine wave into "other")
        const dashClass = (d.pattern === null ? LINE_CLASS[e.style] : LINE_CLASS[d.pattern]) ?? "other";
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
                    dashClass,
                    // graphty draws no edge in a gradient
                    gradient: null,
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
    const groups = sceneGroups.map((g) => {
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
                          dashClass: LINE_CLASS[d?.border?.style ?? n.border.style] ?? "other",
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
        // the labels graphty draws for nodes it draws no body for (a label-only node), which no node carries here
        texts: scene.nodes.flatMap((n) => {
            const d = drawn.nodes.get(n.id);
            return !n.visible && !groupIds.has(n.id) && n.label?.visible === true && d?.label ? [textOf(d.label)] : [];
        }),
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
