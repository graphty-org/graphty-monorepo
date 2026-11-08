/**
 * Reads a program's own SVG export into drawing primitives (`primitives.ts`), in the browser: the
 * SVG is put in the page and Chromium's SVG engine resolves what the file says -- every transform
 * (getScreenCTM against the root's), CSS and presentation attributes, inheritance, `pt` and
 * `viewBox` units -- so this reader does no SVG arithmetic of its own. Coordinates are the SVG's
 * rendered CSS pixels (its width and height at 96 dpi), the frame the rasterized oracle PNG is
 * drawn in at scale 1.
 *
 * Test code only; nothing here is graphty-element API.
 */
import { pictureGradient, type Pixels } from "./picture-gradient";
import {
    boxOfPoints,
    crossedStrokes,
    dashAsDrawn,
    dashClassOf,
    dented,
    isLettering,
    outlinePaintedAsFill,
    PAINTED_OUTLINE,
    type PBox,
    type PFill,
    type PGradient,
    type Prim,
    type PStroke,
    type Pt,
    type PText,
    rampAngleOnScreen,
    solidOuter,
    spreadStops,
} from "./primitives";

const GEOMETRY = new Set(["rect", "circle", "ellipse", "line", "polyline", "polygon", "path"]);
const CLOSED = new Set(["rect", "circle", "ellipse", "polygon"]);
/** Points an outline is sampled to, by arc length. */
const SAMPLES = 48;
/** Points a curved figure's outline is sampled to (`Prim.fine`): a few to a pixel round a node. */
const FIGURE_SAMPLES = 512;
/** Points an open path (an edge's line) is sampled to, by arc length: enough for a route's wave or bend. */
const PATH_SAMPLES = 128;

const r3 = (v: number): number => Math.round(v * 1000) / 1000;

/**
 * Parses a computed CSS color.
 * @param css - `rgb(...)`, `rgba(...)` or `#rrggbb`
 * @returns the hex and alpha, or null for none / transparent / url()
 */
export function parseCssColor(css: string): { hex: string; alpha: number } | null {
    const m = /rgba?\(([^)]+)\)/.exec(css);
    if (m === null) {
        return /^#[\da-f]{6}$/i.test(css) ? { hex: css.toLowerCase(), alpha: 1 } : null;
    }
    const parts = m[1]
        .split(/[\s,/]+/)
        .filter((s) => s !== "")
        .map(Number);
    const [r, g, b] = parts;
    const a = parts.length > 3 ? parts[3] : 1;
    if (a === 0) {
        return null;
    }
    const hex = `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
    return { hex, alpha: a };
}

/** Opacity of an element times every ancestor's, up to the root, memoized per element. */
function groupOpacity(el: Element, root: Element, memo: Map<Element, number>): number {
    const known = memo.get(el);
    if (known !== undefined) {
        return known;
    }
    const own = Number(getComputedStyle(el).opacity || "1");
    const parent = el.parentElement;
    const o = own * (el === root || parent === null ? 1 : groupOpacity(parent, root, memo));
    memo.set(el, o);
    return o;
}

/**
 * The vertices of a path drawn only with straight segments (M, L, H, V, Z), in its user space, or
 * null when it has a curve or an arc. Each subpath's start is repeated at a Z, so the vertices
 * trace the outline the way the path draws it.
 * @param d - the path data
 * @returns the vertices
 */
export function straightPathVertices(d: string): Pt[] | null {
    if (/[CcSsQqTtAa]/.test(d)) {
        return null;
    }
    const tokens = d.match(/[MmLlHhVvZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
    const out: Pt[] = [];
    let cmd = "M";
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    let i = 0;
    const num = (): number => Number(tokens[i++]);
    while (i < tokens.length) {
        const t = tokens[i];
        // a command is one letter: a number's exponent (`3.55e-15`, yEd Live's arrow tip) is no command
        if (/^[A-Za-z]$/.test(t)) {
            cmd = t;
            i++;
            if (cmd === "Z" || cmd === "z") {
                x = sx;
                y = sy;
                out.push([x, y]);
            }
            continue;
        }
        switch (cmd) {
            case "M":
            case "m":
            case "L":
            case "l": {
                const rel = cmd === "m" || cmd === "l";
                const nx = num();
                const ny = num();
                x = rel ? x + nx : nx;
                y = rel ? y + ny : ny;
                if (cmd === "M" || cmd === "m") {
                    sx = x;
                    sy = y;
                    // later pairs after a moveto are linetos
                    cmd = cmd === "M" ? "L" : "l";
                }
                break;
            }
            case "H":
                x = num();
                break;
            case "h":
                x += num();
                break;
            case "V":
                y = num();
                break;
            case "v":
                y += num();
                break;
            default:
                i++;
                continue;
        }
        out.push([x, y]);
    }
    return out;
}

/**
 * A gradient attribute as a number: a percentage as a fraction, a length in user units.
 * @param el - the gradient element
 * @param name - the attribute
 * @param fallback - its default
 * @returns the value
 */
function gradientAttr(el: Element, name: string, fallback: number): number {
    const raw = el.getAttribute(name);
    if (raw === null || raw.trim() === "") {
        return fallback;
    }
    const v = Number.parseFloat(raw);
    if (!Number.isFinite(v)) {
        return fallback;
    }
    return raw.trim().endsWith("%") ? v / 100 : v;
}

/**
 * The gradient a `url(#id)` paint names, with its stops resolved and, for a linear one, the screen direction it runs
 * in, through its gradientTransform, its element's box (objectBoundingBox units, the default) and the element's matrix
 * to the root's pixels. A fill's is the direction its color changes along across the area it paints
 * (`rampAngleOnScreen`: yEd Live's corner-to-corner ramp on a 220 x 94 box changes color along 66.9 degrees, not along
 * its 23.1-degree vector); a stroke's is its vector (x1, y1) to (x2, y2) on screen, which an edge's is judged against
 * its line's chord by.
 * @param paint - the computed fill or stroke
 * @param doc - the root
 * @param el - the painted element, or null when its direction is not wanted
 * @param m - the element's matrix to the root's pixels
 * @param across - read the direction its color changes along (a fill), not its vector (a stroke)
 * @returns the gradient, or null for a flat paint
 */
function gradientOf(
    paint: string,
    doc: Element,
    el: SVGGraphicsElement | null = null,
    m: DOMMatrix | null = null,
    across = false,
): PGradient | null {
    const id = /url\(["']?#([^"')]+)["']?\)/.exec(paint)?.[1];
    if (id === undefined) {
        return null;
    }
    const g = doc.querySelector(`[id="${CSS.escape(id)}"]`);
    if (g === null || !/^(linear|radial)Gradient$/.test(g.localName)) {
        return null;
    }
    // a gradient may take its stops from another through href
    let source: Element = g;
    for (let i = 0; i < 4 && source.querySelectorAll("stop").length === 0; i++) {
        const href = source.getAttribute("href") ?? source.getAttributeNS("http://www.w3.org/1999/xlink", "href");
        const next = href?.startsWith("#") ? doc.querySelector(`[id="${CSS.escape(href.slice(1))}"]`) : null;
        if (next === null) {
            break;
        }
        source = next;
    }
    let stops = [...source.querySelectorAll("stop")].map((s) => {
        const cs = getComputedStyle(s);
        const c = parseCssColor(cs.stopColor) ?? { hex: "#000000", alpha: 0 };
        const off = s.getAttribute("offset") ?? "0";
        const offset = off.endsWith("%") ? Number.parseFloat(off) / 100 : Number.parseFloat(off);
        return { offset: r3(offset), color: c.hex, opacity: r3(c.alpha * Number(cs.stopOpacity || "1")) };
    });
    const kind = g.localName.startsWith("linear") ? "linear" : "radial";
    let angle: number | null = null;
    if (kind === "linear" && el !== null && m !== null) {
        // ponytail: x1..y2 and the units are read off this gradient only, not inherited through href
        const userSpace = g.getAttribute("gradientUnits") === "userSpaceOnUse";
        const transform =
            (g as SVGLinearGradientElement).gradientTransform.baseVal.consolidate()?.matrix ?? new DOMMatrix();
        const b = el.getBBox();
        const [u1, v1] = [gradientAttr(g, "x1", 0), gradientAttr(g, "y1", 0)];
        const [u2, v2] = [gradientAttr(g, "x2", userSpace ? 0 : 1), gradientAttr(g, "y2", 0)];
        if (across) {
            // the gradient's units to the root's pixels: its transform, its element's box, the element's matrix
            const box = userSpace ? new DOMMatrix() : new DOMMatrix([b.width, 0, 0, b.height, b.x, b.y]);
            const t = m.multiply(box).multiply(transform);
            const deg = rampAngleOnScreen([u2 - u1, v2 - v1], [t.a, t.b, t.c, t.d]);
            angle = deg === null ? null : r3(deg);
            // a reflected or repeated ramp is judged by the colors it paints across its element's box, from where the
            // box starts along the ramp to where it ends (t over the box's corners in the gradient's own units)
            // ponytail: spreadMethod is read off this gradient only, not inherited through href
            const spread = g.getAttribute("spreadMethod") ?? "pad";
            const [du, dv] = [u2 - u1, v2 - v1];
            const len2 = du * du + dv * dv;
            if (spread !== "pad" && len2 > 1e-12) {
                const inv = transform.inverse();
                const corners: Pt[] = userSpace
                    ? [
                          [b.x, b.y],
                          [b.x + b.width, b.y],
                          [b.x, b.y + b.height],
                          [b.x + b.width, b.y + b.height],
                      ]
                    : [
                          [0, 0],
                          [1, 0],
                          [0, 1],
                          [1, 1],
                      ];
                const ts = corners.map(([x, y]) => {
                    const p = new DOMPoint(x, y).matrixTransform(inv);
                    return ((p.x - u1) * du + (p.y - v1) * dv) / len2;
                });
                stops = spreadStops(stops, spread, Math.min(...ts), Math.max(...ts));
            }
        } else {
            const toUser = (u: number, v: number): Pt => {
                const t = new DOMPoint(u, v).matrixTransform(transform);
                return userSpace ? [t.x, t.y] : [b.x + t.x * b.width, b.y + t.y * b.height];
            };
            const a = at(m, ...toUser(u1, v1));
            const z = at(m, ...toUser(u2, v2));
            angle =
                Math.hypot(z[0] - a[0], z[1] - a[1]) > 1e-9
                    ? r3((Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI)
                    : null;
        }
    }
    return { kind, stops, angle };
}

function fillOf(
    el: SVGGraphicsElement,
    cs: CSSStyleDeclaration,
    opacity: number,
    doc: Element,
    m: DOMMatrix,
): PFill | null {
    // a <line> has no inside, so its fill (black unless set: Pajek's edges) paints nothing
    if (cs.fill === "none" || el.localName === "line") {
        return null;
    }
    const gradient = gradientOf(cs.fill, doc, el, m, true);
    const flat = parseCssColor(cs.fill);
    const first = gradient?.stops[0];
    const color = flat?.hex ?? first?.color;
    if (color === undefined) {
        return null;
    }
    const alpha = (flat?.alpha ?? first?.opacity ?? 1) * Number(cs.fillOpacity || "1") * opacity;
    if (alpha <= 0) {
        return null;
    }
    return { color, opacity: r3(alpha), gradient };
}

function strokeOf(
    el: SVGGraphicsElement,
    cs: CSSStyleDeclaration,
    opacity: number,
    scale: number,
    doc: Element,
    m: DOMMatrix,
): PStroke | null {
    if (cs.stroke === "none") {
        return null;
    }
    const gradient = gradientOf(cs.stroke, doc, el, m);
    const first = gradient?.stops[0];
    const flat = parseCssColor(cs.stroke) ?? (first ? { hex: first.color, alpha: first.opacity } : null);
    const width = Number.parseFloat(cs.strokeWidth || "1") * scale;
    if (flat === null || width <= 0) {
        return null;
    }
    const alpha = flat.alpha * Number(cs.strokeOpacity || "1") * opacity;
    if (alpha <= 0) {
        return null;
    }
    const dash =
        cs.strokeDasharray === "none" || cs.strokeDasharray === ""
            ? null
            : cs.strokeDasharray.split(/[\s,]+/).map((d) => r3(Number.parseFloat(d) * scale));
    const solid = dash === null || dash.every((d) => !(d > 0));
    return {
        color: flat.hex,
        opacity: r3(alpha),
        width: r3(width),
        dash: solid ? null : dashAsDrawn(dash, width, cs.strokeLinecap),
        dashClass: dashClassOf(solid ? null : dash, width, cs.strokeLinecap),
        gradient,
    };
}

/**
 * The smaller side of a rect, as drawn.
 * @param el - the rect
 * @returns its width or its height, whichever is smaller
 */
function rectSize(el: SVGRectElement): number {
    return Math.min(el.width.baseVal.value, el.height.baseVal.value);
}

/** The straight-sided vertex count of a shape, 0 when it has a curve. */
function cornersOf(el: SVGElement): number {
    const tag = el.localName;
    if (tag === "rect") {
        return Number(el.getAttribute("rx") ?? 0) > 0 ? 0 : 4;
    }
    if (tag === "polygon" || tag === "polyline") {
        const pts = (el as SVGPolygonElement).points;
        let n = pts.numberOfItems;
        if (n > 1) {
            const a = pts.getItem(0);
            const b = pts.getItem(n - 1);
            if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-6) {
                n--;
            }
        }
        return n;
    }
    if (tag === "path") {
        const d = el.getAttribute("d") ?? "";
        if (/[CcSsQqTtAa]/.test(d)) {
            return roundedPolygonSides(d);
        }
        // vertices of the first subpath, up to its close: lines drawn on from there (yEd's BPMN envelope, its flap after
        // its box) are no sides of it
        const first = (d.split(/[Mm]/).find((s) => s.trim() !== "") ?? "").replace(/[Zz].*$/s, "");
        const n = (first.match(/[LlHhVv]/g)?.length ?? 0) + 1;
        const coords = first
            .replace(/[A-Za-z]/g, " ")
            .trim()
            .split(/[\s,]+/)
            .map(Number);
        const closedRepeat =
            coords.length >= 4 &&
            Math.abs(coords[0] - coords[coords.length - 2]) < 1e-6 &&
            Math.abs(coords[1] - coords[coords.length - 1]) < 1e-6;
        return closedRepeat ? n - 1 : n;
    }
    return 0;
}

/**
 * The sides of a polygon with rounded corners drawn as one path of cubic segments, straight sides alternating with
 * corner curves (Graphviz's `style=rounded` on a hexagon or a triangle): the number of straight sides, so the outline
 * classes as the polygon it rounds. A rounded four-sided outline stays 0, a rounded rectangle; any other path is 0.
 * @param d - the path's data
 * @returns the side count, or 0
 */
function roundedPolygonSides(d: string): number {
    if (!/^\s*M[^M]*$/.test(d) || /[^MC\d\s,.eE+-]/.test(d)) {
        return 0;
    }
    const nums = d
        .replace(/[MC]/g, " ")
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    if (nums.length < 8 || (nums.length - 2) % 6 !== 0 || !nums.every(Number.isFinite)) {
        return 0;
    }
    let straight = 0;
    let curved = 0;
    for (let i = 2; i + 6 <= nums.length; i += 6) {
        const [x0, y0] = [nums[i - 2], nums[i - 1]];
        const [x3, y3] = [nums[i + 4], nums[i + 5]];
        const len = Math.hypot(x3 - x0, y3 - y0);
        if (len < 1e-6) {
            continue;
        }
        // a control point off the chord by more than a hundredth of it bends the segment
        const off = (x: number, y: number): number => Math.abs((x - x0) * (y3 - y0) - (y - y0) * (x3 - x0)) / len;
        if (Math.max(off(nums[i], nums[i + 1]), off(nums[i + 2], nums[i + 3])) <= 0.01 * len) {
            straight++;
        } else {
            curved++;
        }
    }
    return straight >= 3 && straight !== 4 && curved === straight ? straight : 0;
}

/**
 * Whether a path draws some corners of its box square and rounds others: a segment ends on the box's corner, as none
 * of a rectangle with rounded corners does, and all four do where a rounding of 0 draws a plain box. Nothing is known of
 * a path with relative commands.
 * @param d - the path data
 * @param box - the path's box, in the path's own space
 * @param box.x - its left
 * @param box.y - its top
 * @param box.width - its width
 * @param box.height - its height
 * @returns whether it does
 */
export function hasSquareCorner(d: string, box: { x: number; y: number; width: number; height: number }): boolean {
    if (/[a-y]/.test(d)) {
        return false;
    }
    const side = (v: number, a: number, b: number): number | null => {
        if (Math.abs(v - a) < 0.01) {
            return 0;
        }
        return Math.abs(v - b) < 0.01 ? 1 : null;
    };
    const corners = new Set<string>();
    for (const m of d.matchAll(/[MLCSQTA]([^A-Z]*)/g)) {
        const [x, y] = m[1]
            .trim()
            .split(/[\s,]+/)
            .map(Number)
            .slice(-2);
        const [sx, sy] = [side(x, box.x, box.x + box.width), side(y, box.y, box.y + box.height)];
        if (sx !== null && sy !== null) {
            corners.add(`${String(sx)}${String(sy)}`);
        }
    }
    return corners.size > 0 && corners.size < 4;
}

function isClosed(el: SVGElement, pts: readonly Pt[]): boolean {
    if (CLOSED.has(el.localName)) {
        return true;
    }
    if (el.localName === "path" && /[Zz]\s*([LlHhVv]|$)/.test(el.getAttribute("d") ?? "")) {
        return true;
    }
    const a = pts[0];
    const b = pts.at(-1);
    return a !== undefined && b !== undefined && pts.length > 2 && Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-3;
}

const PAJEK_MARK = /^\s*(Vertex|Arc|Edge):\s+(\d+)(?:\s+(\d+))?\s*$/;

/**
 * Pajek: inside its network layer (`<g id="PajekNet">`) each vertex, arc and edge is the run of
 * elements after a comment naming it (`<!-- Vertex: 3 -->`, `<!-- Arc: 1 12 -->`); vertex numbers
 * are graphty's node ids. Each comment is its own key, so parallel lines stay apart. A line's label
 * (a `<text>` in its own `<g transform>`) is the one exception: Pajek 6.02 writes it before its
 * line's comment, after the line before (`pajek-specimen-edge-labels.svg`: the label of `3 4`, at
 * the middle of `3 4`, comes after the line `1 2`, which has none), so it belongs to the next comment;
 * a vertex's turned label, in the same markup, follows its vertex's comment.
 * @param el - an element of the oracle
 * @returns the hint, or null outside a Pajek network layer
 */
function pajekHint(el: Element): Prim["hint"] {
    const layer = el.closest("#PajekNet");
    if (layer === null) {
        return null;
    }
    let top: Element = el;
    while (top.parentElement !== null && top.parentElement !== layer) {
        top = top.parentElement;
    }
    const mark = (from: Node, back: boolean): { m: RegExpExecArray | null; n: Node } | null => {
        for (
            let n = back ? from.previousSibling : from.nextSibling;
            n !== null;
            n = back ? n.previousSibling : n.nextSibling
        ) {
            if (n.nodeType === Node.COMMENT_NODE) {
                return { m: PAJEK_MARK.exec(n.textContent ?? ""), n };
            }
        }
        return null;
    };
    let found = mark(top, true);
    if (el.localName === "text" && top !== el && found?.m?.[1] !== "Vertex") {
        const next = mark(top, false);
        if (next?.m !== null && next?.m !== undefined && next.m[1] !== "Vertex") {
            found = next;
        }
    }
    const m = found?.m ?? null;
    if (found === null || m === null) {
        return null;
    }
    if (m[1] === "Vertex") {
        return { role: "node", id: m[2], key: m[2] };
    }
    const key = [...layer.childNodes].indexOf(found.n as ChildNode);
    return { role: "edge", id: `${m[2]}->${m[3]}`, key: `${m[2]}->${m[3]}@${String(key)}`, ends: [m[2], m[3]] };
}

/**
 * Whether Gephi's drawing has a node of this id among its nodes.
 * @param el - an element of the drawing
 * @param id - the id its class names
 * @returns true when a node's shape carries the id
 */
function gephiNode(el: Element, id: string): boolean {
    return [...(el.ownerDocument.querySelector("g#nodes")?.children ?? [])].some((n) =>
        n.classList.contains(`id_${id}`),
    );
}

/**
 * The node a Gephi border ring belongs to. Gephi draws a node not opaque as two circles (NodeRenderer): its fill, of
 * radius 0.84 size, which names the node (`id_<node>`), then its border, an unfilled ring out to its size, which names
 * nothing (`gexf-specimen-node-sizes-opacity-p3`). The ring is the circle right after the fill, on the same center.
 * @param el - the element
 * @returns the node's id, or null when the element is no such ring
 */
function gephiRingOf(el: Element): string | null {
    const fill = el.previousElementSibling;
    if (el.localName !== "circle" || fill?.localName !== "circle" || el.parentElement?.id !== "nodes") {
        return null;
    }
    const ids = [...fill.classList].filter((c) => c.startsWith("id_"));
    const same = (a: string): boolean => Number(el.getAttribute(a)) === Number(fill.getAttribute(a));
    return ids.length === 1 && same("cx") && same("cy") && el.getAttribute("fill") === "none" ? ids[0].slice(3) : null;
}

/** What the program's markup says an element belongs to. */
function hintOf(el: Element): Prim["hint"] {
    // Graphviz: <g class="node|edge|cluster"><title>id</title>
    const g = el.closest("g.node, g.edge, g.cluster");
    if (g !== null) {
        const title = [...g.children].find((c) => c.localName === "title")?.textContent?.trim() ?? "";
        let role: "node" | "edge" | "group" = "group";
        if (g.classList.contains("node")) {
            role = "node";
        } else if (g.classList.contains("edge")) {
            role = "edge";
        }
        return { role, id: title, key: g.id === "" ? title : g.id };
    }
    const pajek = pajekHint(el);
    if (pajek !== null) {
        return pajek;
    }
    // Gephi: class="id_<node>" on a node's circle and label, "id_<source> id_<target>" on an edge
    const ids = [...el.classList].filter((c) => c.startsWith("id_")).map((c) => c.slice(3));
    const ring = ids.length === 0 ? gephiRingOf(el) : null;
    if (ring !== null) {
        return { role: "node", id: ring, key: ring };
    }
    // an edge label (and its outline, which Gephi writes among the node labels) names its edge's own id, not a
    // node: left to be matched to its edge by where it is drawn
    if (ids.length === 1 && el.closest("g#edge-labels, g#node-labels") !== null && !gephiNode(el, ids[0])) {
        return null;
    }
    if (ids.length === 1) {
        // a self-loop names its one node: in Gephi's edge and arrow groups it is an edge, not the node
        if (el.closest("g#edges, g#arrows") !== null) {
            const key = `${ids[0]}->${ids[0]}`;
            return { role: "edge", id: key, key, ends: [ids[0], ids[0]] };
        }
        return { role: "node", id: ids[0], key: ids[0] };
    }
    if (ids.length === 2) {
        return { role: "edge", id: `${ids[0]}->${ids[1]}`, key: `${ids[0]}->${ids[1]}`, ends: [ids[0], ids[1]] };
    }
    return null;
}

/** Composes the matrix from an element's user space to the root's rendered pixels. */
function matrixOf(el: SVGGraphicsElement, rootInverse: DOMMatrix): DOMMatrix | null {
    const m = el.getScreenCTM();
    return m === null ? null : rootInverse.multiply(m);
}

const at = (m: DOMMatrix, x: number, y: number): Pt => {
    const p = new DOMPoint(x, y).matrixTransform(m);
    return [r3(p.x), r3(p.y)];
};

/**
 * The box an embedded `<svg>` draws in, in its own user space (through its viewBox): the viewBox when it has one, else
 * its width and height from its origin.
 * @param svg - the embedded SVG
 * @returns the box
 */
function viewportOf(svg: SVGSVGElement): DOMRect {
    const view = svg.viewBox.baseVal as SVGRect | null;
    return view !== null && view.width > 0 && view.height > 0
        ? new DOMRect(view.x, view.y, view.width, view.height)
        : new DOMRect(0, 0, svg.width.baseVal.value, svg.height.baseVal.value);
}

function boxThrough(m: DOMMatrix, b: DOMRect): PBox {
    return boxOfPoints([
        at(m, b.x, b.y),
        at(m, b.x + b.width, b.y),
        at(m, b.x, b.y + b.height),
        at(m, b.x + b.width, b.y + b.height),
    ]);
}

/**
 * The words a text element draws, one line per `<tspan>` that places itself (draw.io writes a
 * wrapped label as one `<text>` of positioned `<tspan>` lines): its text content alone runs the
 * lines together.
 * @param el - the text element
 * @returns the words, whitespace folded within each line, lines joined by a newline
 */
export function textContentOf(el: Element): string {
    // zero-width characters (Cytoscape.js puts a zero-width space between the letters of a label it may break
    // anywhere) draw nothing: the words are the same without them
    const fold = (s: string | null): string =>
        (s ?? "")
            .replace(/[\u200b-\u200d\u2060\ufeff]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    const lines = [...el.children].filter(
        (c) => c.localName === "tspan" && (c.hasAttribute("y") || c.hasAttribute("dy")),
    );
    if (lines.length < 2) {
        return fold(el.textContent);
    }
    return lines
        .map((t) => fold(t.textContent))
        .filter((t) => t !== "")
        .join("\n");
}

/**
 * The outline a text's stroke draws round its letters: its color, opacity and the width it reaches outside them (half
 * the stroke, whose other half lies over the letters), or null for an unstroked text.
 * @param cs - the text's computed style
 * @param opacity - every group opacity above it
 * @param scale - its matrix's scale
 * @returns the outline
 */
function textOutlineOf(
    cs: CSSStyleDeclaration,
    opacity: number,
    scale: number,
): { color: string; opacity: number; width: number } | null {
    const color = parseCssColor(cs.stroke);
    const width = Number.parseFloat(cs.strokeWidth) * scale;
    if (color === null || !(width > 0)) {
        return null;
    }
    return {
        color: color.hex,
        opacity: r3(color.alpha * Number(cs.strokeOpacity || "1") * opacity),
        width: r3(width / 2),
    };
}

/**
 * Which half of an outline's stroke its clip keeps, where the clip is the outline itself (`inside`: Cytoscape.js's
 * `border-position: inside`, a stroke twice the border's width clipped to the node) or a box with the outline cut
 * out of it by the evenodd rule (`outside`). Any other clip, or none, is null: the stroke is read whole.
 * @param el - the stroked outline
 * @param root - the SVG
 * @returns the half kept, or null
 */
function clippedBand(el: Element, root: SVGSVGElement): "inside" | "outside" | null {
    const ref = /url\(\s*["']?#([^"')]+)["']?\s*\)/.exec(el.closest("[clip-path]")?.getAttribute("clip-path") ?? "");
    const clip = ref === null ? null : root.querySelector(`clipPath[id="${ref[1]}"] > path`);
    const own = (el.getAttribute("d") ?? "").replace(/\s+/g, " ").trim();
    if (clip === null || own === "") {
        return null;
    }
    const d = (clip.getAttribute("d") ?? "").replace(/\s+/g, " ").trim();
    if (d === own) {
        return "inside";
    }
    const evenodd = (clip.getAttribute("clip-rule") ?? getComputedStyle(clip).clipRule) === "evenodd";
    // the outline's own path data ends the clip's; svgcanvas writes its first move as a line from the box's last point
    const tail = own.replace(/^[Mm]\s*/, "");
    return evenodd && d.length > tail.length && d.endsWith(tail) ? "outside" : null;
}

/**
 * The box a filled shape's own clip keeps of it, where the clip is a box on the screen that cuts the shape: yEd paints
 * an entity relationship node twice, each time whole, and clips one to its header and the other to the rest. Any other
 * clip, a box the shape lies inside or one it lies outside, is null: the shape is read whole.
 * @param el - the shape
 * @param root - the SVG
 * @param m - the shape's matrix, which the clip's user space shares
 * @param shape - the shape's box
 * @returns the box kept, or null
 */
function clipCut(el: Element, root: SVGSVGElement, m: DOMMatrix, shape: PBox): PBox | null {
    const ref = /url\(\s*["']?#([^"')]+)["']?\s*\)/.exec(el.getAttribute("clip-path") ?? "");
    const clip = ref === null ? null : root.querySelector(`clipPath[id="${ref[1]}"] > path:only-child`);
    const corners = straightPathVertices(clip?.getAttribute("d") ?? "")?.map(([x, y]) => at(m, x, y));
    const box = corners === undefined || corners.length < 4 ? null : boxOfPoints(corners);
    if (box === null || !corners?.every(([x, y]) => (x === box.x0 || x === box.x1) && (y === box.y0 || y === box.y1))) {
        return null;
    }
    const kept = {
        x0: Math.max(box.x0, shape.x0),
        y0: Math.max(box.y0, shape.y0),
        x1: Math.min(box.x1, shape.x1),
        y1: Math.min(box.y1, shape.y1),
    };
    const cuts = kept.x0 > shape.x0 || kept.y0 > shape.y0 || kept.x1 < shape.x1 || kept.y1 < shape.y1;
    return cuts && kept.x0 < kept.x1 && kept.y0 < kept.y1 ? kept : null;
}

/**
 * The shapes without a cut fill painted over by a solid fill of the same box: nothing of it shows (yEd's panel group
 * clips a flat fill to its label's band and draws the band over it).
 * @param prims - the shapes, in drawing order
 * @returns the shapes a reader sees
 */
function withoutHiddenCuts(prims: readonly Prim[]): Prim[] {
    const same = (a: PBox, b: PBox): boolean =>
        Math.max(Math.abs(a.x0 - b.x0), Math.abs(a.y0 - b.y0), Math.abs(a.x1 - b.x1), Math.abs(a.y1 - b.y1)) <= 0.5;
    return prims.filter(
        (p, i) =>
            p.uncut === undefined ||
            !prims.slice(i + 1).some((q) => q.fill !== null && q.fill.opacity === 1 && same(q.box, p.box)),
    );
}

/**
 * An outline's points moved out (or in, for a negative distance) by a distance from its box's center on each axis:
 * the middle of the half of its stroke a clip keeps.
 * @param points - the outline
 * @param by - how far each side moves out
 * @returns the moved points
 */
function bandCenter(points: readonly Pt[], by: number): Pt[] {
    const b = boxOfPoints(points);
    const [cx, cy] = [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
    const [hx, hy] = [(b.x1 - b.x0) / 2, (b.y1 - b.y0) / 2];
    const sx = hx > 0 ? Math.max(0, hx + by) / hx : 1;
    const sy = hy > 0 ? Math.max(0, hy + by) / hy : 1;
    return points.map(([x, y]): Pt => [cx + (x - cx) * sx, cy + (y - cy) * sy]);
}

/**
 * The faces Java drew the logical fonts in that Cytoscape desktop's SVG writer (FreeHEP) names by their PostScript
 * stand-ins or by their Java names: it writes Dialog and SansSerif as Helvetica, Serif as Times and Monospaced as
 * Courier, and a styled logical font it cannot map by its Java name (`Dialog.bolditalic`), but Java laid each line out
 * (and placed it) with the JRE's own face, DejaVu with the pinned fonts. Measured on Cytoscape 3.10.5's SVGs: a
 * centered line starts half a DejaVu Sans width left of its node's middle ("Multidrug " in cys-import-and-save,
 * 71.07 px at 14 px against Liberation Sans's 61.47), the Serif specimen half a DejaVu Serif width
 * (cys-specimen-labels font-face-serif), and a `Dialog.bolditalic` label's background box is its DejaVu Sans Bold
 * Oblique width (cys-syn-mappings). Java draws a font named `Default`, which it does not have, in Dialog.
 *
 * yEd is a Java program too, and its SVG writer (ySVG) names the same logical fonts: `'Dialog'` on the root, which any
 * text without a family of its own inherits, and `sans-serif`, `serif` and `monospace`. Measured on its drawings:
 * "patm" at 12 px starts 15.68 px left of its node's middle (gml-yed-pmodel), half its DejaVu Sans width of 31.4, and a
 * label `Agj` at 10 px starts half its DejaVu Sans Mono width (18.06) left of the middle of the fontFamily=Monospaced
 * node and half its DejaVu Serif width (16.72) left of the fontFamily=Serif one (yed-graphml-specimen-labels).
 */
const JAVA_FACES: Readonly<Record<string, string>> = {
    helvetica: "DejaVu Sans",
    dialog: "DejaVu Sans",
    sansserif: "DejaVu Sans",
    default: "DejaVu Sans",
    // CX2's generic `sans-serif`, which Java has no font of and draws in Dialog: "Mitochondria " starts 73.0 px left
    // of its node's middle at 21.38 px in cx2-u2os-hierarchy, half its DejaVu Sans width (146.0 px)
    "sans-serif": "DejaVu Sans",
    // Calibri, which the oracles' Java has no font of either: cx-radiation-bibliography's `Calibri-Bold` labels lie
    // where their DejaVu Sans (regular) width centers them on their nodes (within 0.022 em on 52 centered lines), not
    // where Carlito's or the browser's stand-in's would; every PostScript style of it (`Calibri-Italic`) is looked up
    // by its family
    calibri: "DejaVu Sans",
    times: "DejaVu Serif",
    serif: "DejaVu Serif",
    courier: "DejaVu Sans Mono",
    monospaced: "DejaVu Sans Mono",
    monospace: "DejaVu Sans Mono",
    dialoginput: "DejaVu Sans Mono",
};

/**
 * Whether a Java SVG writer made this drawing: FreeHEP says so in its `desc`, ySVG in a comment at the root.
 * @param svg - the drawing
 * @returns true for FreeHEP's and ySVG's
 */
function writtenByJava(svg: SVGSVGElement | null): boolean {
    return (
        (svg?.querySelector(":scope > desc")?.textContent ?? "").includes("FreeHEP") ||
        [...(svg?.childNodes ?? [])].some((n) => n.nodeType === Node.COMMENT_NODE && n.nodeValue?.includes("ySVG"))
    );
}

/**
 * Lays a text of a Java program's SVG out in the face Java drew it in, so its box is the one the program measured.
 * @param el - the text
 * @param first - the first family it declares, lowercased, with any Java style suffix (`dialog.bolditalic`)
 * @returns a call that puts the text's own font back
 */
function measureInJavaFace(el: SVGTextElement, first: string): () => void {
    const [name, javaStyle = ""] = first.split(".");
    // a PostScript name's style suffix (`Calibri-Bold`) after the family, where the whole name is not a face itself
    const face = JAVA_FACES[name] ?? JAVA_FACES[name.split("-")[0]];
    if (face === undefined || !writtenByJava(el.ownerSVGElement)) {
        return () => undefined;
    }
    const { fontFamily, fontWeight, fontStyle } = el.style;
    el.style.fontFamily = `"${face}"`;
    if (javaStyle.includes("bold")) {
        el.style.fontWeight = "bold";
    }
    if (javaStyle.includes("italic")) {
        el.style.fontStyle = "italic";
    }
    return () => {
        Object.assign(el.style, { fontFamily, fontWeight, fontStyle });
    };
}

/** A text drawn under this many screen pixels is laid out again larger for its line box (`lineBoxOf`). */
const SMALL_TEXT_PX = 6;
/** How much larger. */
const SMALL_TEXT_SCALE = 100;
/** The font size a text is laid out again at for `lineDropOf`. */
const LINE_DROP_PX = 1000;

/**
 * A text's box in its own user units: its laid-out width, and the line box of its font from its baseline. The browser
 * lays a text out at the size it is drawn on screen and rounds the font's ascent and descent to whole pixels there, so a
 * text drawn a pixel high has a line box twice its font size, wholly above its baseline (dot-real-depcruise's 0.8 px
 * labels: 1.88 em tall, its middle 0.62 em above the words' middle), and its letters' advances too, so a line centered
 * on its anchor reads a fifth of a pixel off it (json-cyjs-winecheese 107's two lines, both `text-anchor: middle` at one
 * x, read as right-aligned). A text drawn small is laid out again a hundred times larger, where the rounding is nothing,
 * and its box taken from there. A text under `text-rendering: geometricPrecision` is laid out at its own size, not the
 * size on screen, so its advances were never rounded there and it keeps its width (graphml-cla-checker-graph).
 * @param el - the text
 * @param size - its font size in user units
 * @param screenPx - its font size on screen
 * @returns the box
 */
function lineBoxOf(el: SVGTextElement, size: number, screenPx: number): DOMRect {
    const bb = el.getBBox();
    // lines placed by their own y or dy do not move with the font size: such a text is measured as it is
    const placed = [...el.children].some(
        (c) => c.localName === "tspan" && (c.hasAttribute("y") || c.hasAttribute("dy")),
    );
    if (placed || !(screenPx > 0 && screenPx < SMALL_TEXT_PX && bb.height > 0)) {
        return bb;
    }
    const x = el.x.baseVal.numberOfItems > 0 ? el.x.baseVal.getItem(0).value : 0;
    const y = el.y.baseVal.numberOfItems > 0 ? el.y.baseVal.getItem(0).value : 0;
    const before = el.style.fontSize;
    el.style.fontSize = `${String(size * SMALL_TEXT_SCALE)}px`;
    const big = el.getBBox();
    el.style.fontSize = before;
    if (!(big.height > 0)) {
        return bb;
    }
    const top = y + (big.y - y) / SMALL_TEXT_SCALE;
    const height = big.height / SMALL_TEXT_SCALE;
    return getComputedStyle(el).textRendering.toLowerCase() === "geometricprecision"
        ? new DOMRect(bb.x, top, bb.width, height)
        : new DOMRect(x + (big.x - x) / SMALL_TEXT_SCALE, top, big.width / SMALL_TEXT_SCALE, height);
}

/**
 * How far a text's box stands under its font's line, in user units. The browser rounds a font's ascent and descent to
 * whole pixels at the size it lays the text out, and where that leaves the descent short it moves a pixel from the
 * ascent to the descent: a 10 px DejaVu Sans line, 9.28 up and 2.36 down, reads 8 up and 3 down, its middle 0.96 px under
 * the line's (yed-graphml-specimen-labels two-labels, whose line stands exactly 2 px inside yEd's box). Read from the
 * text laid out again much larger, where the rounding is nothing.
 * @param el - the text
 * @param size - its font size in user units
 * @param box - its box
 * @returns the distance, down being positive; 0 for a text whose lines place themselves
 */
function lineDropOf(el: SVGTextElement, size: number, box: DOMRect): number {
    if ([...el.children].some((c) => c.localName === "tspan" && (c.hasAttribute("y") || c.hasAttribute("dy")))) {
        return 0;
    }
    const y = el.y.baseVal.numberOfItems > 0 ? el.y.baseVal.getItem(0).value : 0;
    const before = el.style.fontSize;
    el.style.fontSize = `${String(LINE_DROP_PX)}px`;
    const big = el.getBBox();
    el.style.fontSize = before;
    const middle = y + ((big.y + big.height / 2 - y) * size) / LINE_DROP_PX;
    return big.height > 0 ? box.y + box.height / 2 - middle : 0;
}

function textOf(
    el: SVGTextElement,
    m: DOMMatrix,
    cs: CSSStyleDeclaration,
    opacity: number,
    scale: number,
): PText | null {
    const content = textContentOf(el);
    // An unfilled text is a label's outline (Cytoscape.js strokes `text-outline` as its own text
    // before it fills the label over it): the label is the filled text, not this one
    // (`readSvgPrimitives` gives that text this one's outline).
    if (content === "" || cs.fill === "none") {
        return null;
    }
    const x = el.x.baseVal.numberOfItems > 0 ? el.x.baseVal.getItem(0).value : 0;
    const y = el.y.baseVal.numberOfItems > 0 ? el.y.baseVal.getItem(0).value : 0;
    const [ax, ay] = at(m, x, y);
    const color = parseCssColor(cs.fill) ?? { hex: "#000000", alpha: 1 };
    const computed = cs.fontFamily.replace(/["']/g, "");
    // A Java font name Cytoscape's SVG export could not map to a CSS family (`Dialog.bolditalic`) still names the
    // face its own canvas draws: bold, italic or both, whatever the font-weight and font-style beside it say.
    // (read from the attribute: a name with a dot is no CSS family, so the computed style has fallen back)
    const declared = el.closest("[font-family]")?.getAttribute("font-family") ?? computed;
    // A family CSS rejects outright (Java's `Default`, a CSS-wide keyword, or a dotted Java name) leaves the computed
    // style at the browser's own default face, which the program never drew: the program drew the name it wrote.
    const first = declared.split(",")[0].replace(/["']/g, "").trim().toLowerCase();
    const family = computed.toLowerCase().includes(first) ? computed : declared.replace(/["']/g, "");
    const javaStyle = /\.(bold|italic|bolditalic)["']?$/i.exec(declared.trim())?.[1].toLowerCase() ?? "";
    let style: "normal" | "italic" | "oblique" = javaStyle.includes("italic") ? "italic" : "normal";
    if (cs.fontStyle === "italic" || cs.fontStyle === "oblique") {
        style = cs.fontStyle;
    }
    const anchor = cs.textAnchor === "middle" || cs.textAnchor === "end" ? cs.textAnchor : "start";
    // A text the browser does not lay out (draw.io's fallback beside a foreignObject) has an empty
    // box: estimate it from its anchor, size and length instead.
    const restore = measureInJavaFace(el, first);
    const size = Number.parseFloat(cs.fontSize) || 12;
    const bb = lineBoxOf(el, size, size * scale);
    const lineDrop = bb.width > 0 && bb.height > 0 ? lineDropOf(el, size, bb) * m.d : 0;
    const w = 0.55 * size * content.length;
    let x0 = x;
    if (anchor === "middle") {
        x0 = x - w / 2;
    } else if (anchor === "end") {
        x0 = x - w;
    }
    const box =
        bb.width > 0 && bb.height > 0 ? boxThrough(m, bb) : boxThrough(m, new DOMRect(x0, y - 0.8 * size, w, size));
    // each positioned tspan line's own box, which the lines' alignment is read off
    const tspans = [...el.children].filter(
        (c): c is SVGTSpanElement => c.localName === "tspan" && (c.hasAttribute("y") || c.hasAttribute("dy")),
    );
    const lineBoxes = tspans
        .filter((t) => (t.textContent ?? "").trim() !== "")
        .flatMap((t) => {
            const b = t.getBBox();
            return b.width > 0 && b.height > 0 ? [boxThrough(m, b)] : [];
        });
    restore();
    return {
        content,
        x: ax,
        y: ay,
        box,
        ...(lineDrop === 0 ? {} : { lineDrop }),
        sizePx: r3(Number.parseFloat(cs.fontSize) * scale),
        family,
        weight: Math.max(
            Number(cs.fontWeight) || (cs.fontWeight === "bold" ? 700 : 400),
            javaStyle.includes("bold") ? 700 : 0,
        ),
        style,
        anchor,
        rotation: r3((Math.atan2(m.b, m.a) * 180) / Math.PI),
        color: color.hex,
        opacity: r3(color.alpha * Number(cs.fillOpacity || "1") * opacity),
        lines: lineBoxes.length >= 2 ? lineBoxes : [box],
        outline: textOutlineOf(cs, opacity, scale),
        blank: blankEnds(el, cs),
    };
}

/**
 * Whether a text draws blanks before or after its words: only where its white space is kept (`xml:space="preserve"`,
 * which Graphviz writes on every text), else SVG drops them.
 * @param el - the text element
 * @param cs - its computed style
 * @returns the blanks at each end
 */
function blankEnds(el: SVGTextElement, cs: CSSStyleDeclaration): { before: boolean; after: boolean } {
    const kept =
        el.getAttributeNS("http://www.w3.org/XML/1998/namespace", "space") === "preserve" ||
        cs.whiteSpace.startsWith("pre");
    const raw = el.textContent ?? "";
    return { before: kept && /^\s/.test(raw), after: kept && /\s$/.test(raw) };
}

function geometryPoints(el: SVGGeometryElement, m: DOMMatrix, samples: number): Pt[] {
    const tag = el.localName;
    if (tag === "polygon" || tag === "polyline") {
        const pts = (el as unknown as SVGPolygonElement).points;
        const out: Pt[] = [];
        for (let i = 0; i < pts.numberOfItems; i++) {
            const p = pts.getItem(i);
            out.push(at(m, p.x, p.y));
        }
        if (tag === "polygon" && out.length > 0) {
            out.push(out[0]);
        }
        return out;
    }
    if (tag === "line") {
        const l = el as unknown as SVGLineElement;
        return [at(m, l.x1.baseVal.value, l.y1.baseVal.value), at(m, l.x2.baseVal.value, l.y2.baseVal.value)];
    }
    if (tag === "path") {
        const straight = straightPathVertices(el.getAttribute("d") ?? "");
        if (straight !== null && straight.length > 0) {
            return straight.map(([x, y]) => at(m, x, y));
        }
    }
    const len = el.getTotalLength();
    if (!(len > 0)) {
        const b = el.getBBox();
        return [at(m, b.x, b.y)];
    }
    const out: Pt[] = [];
    for (let i = 0; i < samples; i++) {
        const p = el.getPointAtLength((len * i) / (samples - 1));
        out.push(at(m, p.x, p.y));
    }
    return out;
}

/**
 * A filled path's subpaths, each sampled evenly by arc length through Chromium's own path geometry (about one point a
 * pixel, at least 48): what a pattern drawn as a fill is read from (`outlinePaintedAsFill`, `bandPaintedAsFill`).
 * @param el - a filled, unstroked element
 * @param m - its matrix to the root's pixels
 * @returns the subpaths, or null for no path or one with a relative moveto
 */
function subpathsOf(el: SVGGraphicsElement, m: DOMMatrix): Pt[][] | null {
    const d = el.localName === "path" ? (el.getAttribute("d") ?? "") : "";
    // absolute subpaths only: a relative `m` starts where the last one ended
    if (/m/.test(d) || !d.includes("M")) {
        return null;
    }
    const probe = el.cloneNode(false) as SVGPathElement;
    el.parentNode?.insertBefore(probe, el);
    try {
        const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
        // a subpath that is only a moveto draws nothing
        return d
            .split(/(?=M)/)
            .filter((s) => /[LlHhVvCcSsQqTtAa]/.test(s))
            .flatMap((s) => {
                probe.setAttribute("d", s);
                const len = probe.getTotalLength();
                if (!(len > 0)) {
                    return [];
                }
                const n = Math.max(SAMPLES, Math.min(1024, Math.round(len * scale)));
                return [
                    Array.from({ length: n }, (_, k): Pt => {
                        const p = probe.getPointAtLength((len * k) / n);
                        return at(m, p.x, p.y);
                    }),
                ];
            });
    } finally {
        probe.remove();
    }
}

/**
 * Whether an element sits in a branch of a `<switch>` the browser does not draw: it draws the switch's first branch
 * only (draw.io ends every export with a switch whose first branch is an empty `<g>` and whose second is the warning
 * "Text is not SVG - cannot display", never on the canvas). A fallback beside a first branch that is a foreignObject
 * stays: it stands for the HTML label drawn there, which this reader cannot read (draw.io's labels).
 * @param el - the element
 * @returns whether it is not drawn
 */
function inUndrawnBranch(el: Element): boolean {
    // ponytail: the first child is the drawn one; conditions (systemLanguage, requiredExtensions) are not evaluated,
    // since no oracle program writes one that fails
    for (let c = el; c.parentElement !== null; c = c.parentElement) {
        const drawn = c.parentElement.localName === "switch" ? c.parentElement.firstElementChild : c;
        if (drawn !== c && drawn?.localName !== "foreignObject") {
            return true;
        }
    }
    return false;
}

/** What is defined for later use or not drawn at all, not drawn where it stands. */
const NOT_DRAWN = "defs, marker, clipPath, mask, pattern, symbol, title, desc, metadata";

/** Marks the `<g>` that stands where a `<use>` stood. */
const STAMPED = "data-oracle-stamped";

/**
 * Puts what each drawn `<use>` draws in its place: a `<g>` with the `<use>`'s attributes around a copy of what it names,
 * so the copy is read like any drawn element, through the `<use>`'s transform and with what it inherits (yEd Live draws
 * every arrowhead so, from one path in `<defs>`). A `<symbol>` becomes the `<svg>` the specification makes of it
 * (draw.io's pictures). A `<use>` in a `<defs>` waits for what uses it, and nested ones are put in place on later turns.
 * @param root - the SVG, in the page
 */
function expandUses(root: SVGSVGElement): void {
    const svgElement = (name: string): SVGElement => document.createElementNS("http://www.w3.org/2000/svg", name);
    // a `<use>` cycle draws nothing and would grow here for ever
    for (let turn = 0; turn < 8; turn++) {
        const uses = [...root.querySelectorAll("use")].filter((u) => u.closest(NOT_DRAWN) === null);
        if (uses.length === 0) {
            return;
        }
        for (const use of uses) {
            const href = use.getAttribute("href") ?? use.getAttributeNS("http://www.w3.org/1999/xlink", "href");
            const named = href?.startsWith("#") ? root.querySelector(`[id="${CSS.escape(href.slice(1))}"]`) : null;
            if (named === null) {
                use.remove();
                continue;
            }
            const [x, y] = [use.getAttribute("x") ?? "0", use.getAttribute("y") ?? "0"];
            const placed = svgElement("g");
            placed.setAttribute(STAMPED, "");
            for (const { name, value } of use.attributes) {
                if (!["x", "y", "width", "height", "href", "xlink:href"].includes(name)) {
                    placed.setAttribute(name, value);
                }
            }
            placed.setAttribute("transform", `${use.getAttribute("transform") ?? ""} translate(${x} ${y})`);
            const copy = named.cloneNode(true) as Element;
            copy.removeAttribute("id");
            if (copy.localName === "symbol") {
                const inner = svgElement("svg");
                inner.append(...copy.childNodes);
                for (const name of ["viewBox", "preserveAspectRatio"]) {
                    const value = copy.getAttribute(name);
                    if (value !== null) {
                        inner.setAttribute(name, value);
                    }
                }
                inner.setAttribute("width", use.getAttribute("width") ?? "100%");
                inner.setAttribute("height", use.getAttribute("height") ?? "100%");
                placed.append(inner);
            } else {
                placed.append(copy);
            }
            use.replaceWith(placed);
        }
    }
}

/**
 * A base64 picture's address as the page reads it back: without the breaks written across its lines, whether as white
 * space or, in yEd's SVGs, as `&#10;` (the page has turned that into white space by then).
 * @param href - the address, as written or as read
 * @returns the address, unbroken
 */
export const unbrokenHref = (href: string): string => href.replace(/&#1[03];|\s+/g, "");

/**
 * The PNGs an SVG file embeds, by their unbroken addresses.
 * @param svg - the file's text
 * @returns the addresses
 */
export function embeddedPngs(svg: string): Set<string> {
    return new Set((svg.match(/data:image\/png;base64,[^"']+/gi) ?? []).map(unbrokenHref));
}

/**
 * Whether a path's subpaths enclose any area.
 * @param d - the path data
 * @returns whether they do, or null for a path with a curve, not reckoned here
 */
function encloses(d: string): boolean | null {
    const parts = d.split(/(?=[Mm])/).map((s) => straightPathVertices(s));
    if (parts.includes(null)) {
        return null;
    }
    return parts.some((q) =>
        (q ?? []).some(([x, y], i, all) => {
            const [a, b] = [all[i + 1] ?? all[0], all[0]];
            return Math.abs((a[0] - b[0]) * (y - b[1]) - (a[1] - b[1]) * (x - b[0])) > 1e-6;
        }),
    );
}

/**
 * The fill of the panel a yFiles group lays over its tab, which leaves the tab showing as a band round it. The group's
 * outline carries it too: a tab with a hole for a see-through panel is read as a painted outline, and makes no group.
 * @param el - the element read
 * @param root - the SVG
 * @param opacities - the group opacities read so far
 * @param m - the element's matrix to the root's pixels
 * @returns the panel's fill, or null for anything but a tab or outline with a filled panel
 */
function panelFillOf(el: Element, root: Element, opacities: Map<Element, number>, m: DOMMatrix): PFill | null {
    const panel = el.matches(".yfiles-group-node-tab, .yfiles-group-node-stroke")
        ? el.parentElement?.querySelector<SVGGraphicsElement>(".yfiles-group-node-content")
        : null;
    return panel ? fillOf(panel, getComputedStyle(panel), groupOpacity(panel, root, opacities), root, m) : null;
}

/** The SVG primitives of a document, in document order. */
export interface SvgPrimitives {
    width: number;
    height: number;
    prims: Prim[];
}

/**
 * Reads every visible drawing primitive of an SVG document.
 * @param svgText - the SVG file's text
 * @param pictures - the pictures it embeds, decoded, by their `href`: an image whose pixels are a gradient carries it
 * @returns its rendered size and its primitives
 */
export function readSvgPrimitives(svgText: string, pictures: ReadonlyMap<string, Pixels> = new Map()): SvgPrimitives {
    const parsed = new DOMParser().parseFromString(svgText, "image/svg+xml");
    const error = parsed.querySelector("parsererror");
    if (error !== null) {
        throw new Error(`the oracle SVG does not parse: ${error.textContent ?? ""}`);
    }
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;opacity:0";
    const root = document.importNode(parsed.documentElement, true) as unknown as SVGSVGElement;
    // An SVG with only a viewBox (Pajek writes no width or height) is drawn at its viewBox's size,
    // as an image viewer would; inside the zero-sized host it would otherwise collapse to nothing.
    const view = root.viewBox.baseVal as SVGRect | null;
    if (view !== null && view.width > 0 && !root.hasAttribute("width") && !root.hasAttribute("height")) {
        root.setAttribute("width", String(view.width));
        root.setAttribute("height", String(view.height));
    }
    host.appendChild(root);
    document.body.appendChild(host);
    try {
        expandUses(root);
        const rect = root.getBoundingClientRect();
        const rootM = root.getScreenCTM();
        // the root's own CTM includes its viewBox; the frame we want is its rendered box
        const rootInverse = new DOMMatrix().translate(rect.left, rect.top).inverse();
        if (rootM === null) {
            throw new Error("the oracle SVG has no screen matrix");
        }
        const prims: Prim[] = [];
        // the `d` of the last filled path read, whose outline a stroke-only twin may draw
        let lastFilledPath = "";
        // the geometry read last (a path's `d`, matrix and sample count) and its points
        let lastGeometry: { key: string; points: Pt[] } = { key: "", points: [] };
        const opacities = new Map<Element, number>();
        // the outline of a label stroked as an unfilled text of its own, kept for the filled text drawn over it: right
        // after it (Cytoscape.js) or after every other outline (Gephi writes all its label outlines, then the labels)
        const pendingOutlines = new Map<string, NonNullable<PText["outline"]>>();
        const textKey = (el: SVGTextElement): string =>
            `${textContentOf(el)}\u0000${el.getAttribute("x") ?? ""}\u0000${el.getAttribute("y") ?? ""}\u0000${el.getAttribute("transform") ?? ""}`;
        let index = 0;
        for (const el of root.querySelectorAll<SVGGraphicsElement>("*")) {
            const tag = el.localName;
            // a picture the program embeds as an SVG of its own (yEd's SVGNode) is one picture, as an `<image>` is: what
            // it draws inside is the picture's content, not shapes of the drawing (graphty draws the picture as one)
            const embedded = el.parentElement?.closest("svg");
            if (embedded !== root && embedded?.closest(`[${STAMPED}]`) === null) {
                continue;
            }
            const picture = tag === "svg" && el !== root && el.closest(`[${STAMPED}]`) === null;
            if (!GEOMETRY.has(tag) && tag !== "text" && tag !== "image" && !picture) {
                continue;
            }
            // #PajekSig: the spider logo Pajek adds to every SVG export, not part of the network
            if (el.closest(`${NOT_DRAWN}, #PajekSig`) !== null) {
                continue;
            }
            // yFiles (yEd Live) lays a group's panel over its tab: read with the tab (`panelFillOf`), not a box of its own
            if (el.matches(".yfiles-group-node-content") && el.parentElement?.querySelector(".yfiles-group-node-tab")) {
                continue;
            }
            if (inUndrawnBranch(el)) {
                continue;
            }
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") {
                continue;
            }
            // a rect of no width or no height is not drawn at all (SVG 1.1 section 9.2): OGDF writes its root
            // cluster as one at 0, 0
            if (tag === "rect" && !(rectSize(el as unknown as SVGRectElement) > 0)) {
                continue;
            }
            const m = matrixOf(el, rootInverse);
            if (m === null) {
                continue;
            }
            const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
            const opacity = groupOpacity(el, root, opacities);
            const i = index++;
            if (tag === "text") {
                const key = textKey(el as SVGTextElement);
                if (cs.fill === "none") {
                    const outline = textOutlineOf(cs, opacity, scale);
                    if (outline === null) {
                        pendingOutlines.delete(key);
                    } else {
                        pendingOutlines.set(key, outline);
                    }
                    continue;
                }
                const text = textOf(el as SVGTextElement, m, cs, opacity, scale);
                const outline = pendingOutlines.get(key);
                if (text !== null && outline !== undefined) {
                    text.outline ??= outline;
                }
                pendingOutlines.delete(key);
                if (text !== null) {
                    prims.push({
                        index: i,
                        tag,
                        kind: "text",
                        box: text.box,
                        points: [],
                        closed: false,
                        corners: 0,
                        fill: null,
                        stroke: null,
                        text,
                        markers: { start: false, end: false },
                        hint: hintOf(el),
                    });
                }
                continue;
            }
            if (tag === "image" || picture) {
                const href = el.getAttribute("href") ?? el.getAttributeNS("http://www.w3.org/1999/xlink", "href");
                const pixels = href === null ? undefined : pictures.get(unbrokenHref(href));
                const gradient = pixels === undefined ? null : pictureGradient(pixels);
                // an embedded SVG's viewport, in the coordinates its own matrix (which holds its viewBox) maps from
                const b = picture ? viewportOf(el as unknown as SVGSVGElement) : el.getBBox();
                prims.push({
                    ...(gradient === null ? {} : { gradient }),
                    index: i,
                    tag,
                    kind: "image",
                    box: boxThrough(m, b),
                    quad: [
                        at(m, b.x, b.y),
                        at(m, b.x + b.width, b.y),
                        at(m, b.x + b.width, b.y + b.height),
                        at(m, b.x, b.y + b.height),
                    ],
                    points: [],
                    closed: true,
                    corners: 4,
                    fill: null,
                    stroke: null,
                    text: null,
                    markers: { start: false, end: false },
                    hint: hintOf(el),
                });
                continue;
            }
            let fill = fillOf(el, cs, opacity, root, m);
            let stroke = strokeOf(el, cs, opacity, scale, root, m);
            if (fill === null && stroke === null) {
                continue;
            }
            // vis-network's canvas2svg writes a shape's fill and its outline as two paths of one geometry, the outline
            // left open where the canvas path it copies was (its database cylinder): the outline of the filled shape
            // drawn just before it, closed as that shape is
            const d = tag === "path" ? (el.getAttribute("d") ?? "") : "";
            const outlineOfFill = fill === null && d !== "" && d === lastFilledPath;
            lastFilledPath = fill !== null ? d : lastFilledPath;
            const open =
                fill === null && !outlineOfFill && !CLOSED.has(tag) && !/[Zz]\s*$/.test(el.getAttribute("d") ?? "");
            // a path drawn again at once with the same geometry (vis-network's outline over its fill) is not sampled
            // through the DOM again: the same points, copied
            const samples = open ? PATH_SAMPLES : SAMPLES;
            const geometry = d === "" ? "" : [d, m.a, m.b, m.c, m.d, m.e, m.f, samples].join("\u0000");
            if (geometry === "" || geometry !== lastGeometry.key) {
                lastGeometry = { key: geometry, points: geometryPoints(el as SVGGeometryElement, m, samples) };
            }
            let points = lastGeometry.points.map(([x, y]): Pt => [x, y]);
            const band = fill === null && stroke !== null ? clippedBand(el, root) : null;
            if (band !== null && stroke !== null) {
                points = bandCenter(points, band === "inside" ? -stroke.width / 4 : stroke.width / 4);
                stroke = { ...stroke, width: r3(stroke.width / 2) };
            }
            const uncut = boxOfPoints(points);
            const cut = fill !== null && stroke === null ? clipCut(el, root, m, uncut) : null;
            if (cut !== null) {
                points = points.map(([x, y]) => [
                    Math.min(cut.x1, Math.max(cut.x0, x)),
                    Math.min(cut.y1, Math.max(cut.y0, y)),
                ]);
            }
            // yEd fills a bar arrowhead's line there and back before stroking it: a fill with nothing inside paints
            // nothing, and the stroke after it stays next to its line (`index` is what says what follows a line)
            if (stroke === null && d !== "" && encloses(d) === false) {
                index = i;
                continue;
            }
            // a filled shape with no area and no stroke paints nothing (Gephi writes an arrowhead of arrow.size 0 as
            // a polyline of three equal points), nor does a stroked one with butt caps (SVG 1.1 section 11.4: a
            // zero-length subpath draws a cap only when it is round or square; Graphviz writes an arrowsize=0 head as a
            // stroked polygon of four equal points), nor a polygon whose points do not parse (Graphviz writes
            // `points="-nan,nan ..."` for a filled shape=plain with no label, which the browser reads as no points)
            const extent = boxOfPoints(points);
            const capless = stroke === null || cs.strokeLinecap === "butt";
            if (
                points.length === 0 ||
                !points.every(([x, y]) => Number.isFinite(x) && Number.isFinite(y)) ||
                (capless && extent.x1 - extent.x0 === 0 && extent.y1 - extent.y0 === 0)
            ) {
                continue;
            }
            // a painted fill closes any outline (Gephi draws its arrowheads as filled polylines)
            // and what a `<use>` stamps is a shape however it is drawn, no line of a route: an open stroke (yEd Live's
            // open and cross arrowheads) is its line there and back, an outline with nothing inside
            const stamped = el.closest(`[${STAMPED}]`) !== null;
            if (stamped && open) {
                points = [...points, ...points.slice(0, -1).reverse()];
            }
            const closed = isClosed(el, points) || fill !== null || outlineOfFill || stamped;
            // a curved figure with a dent (Pajek's man) read again finely, its corners where it draws them (`figureOf`)
            const fine =
                closed && points.length === SAMPLES && dented(points)
                    ? geometryPoints(el as SVGGeometryElement, m, FIGURE_SAMPLES)
                    : undefined;
            // words drawn as glyph outlines, filled or stroked as a halo, are no line drawn in pieces
            const pieces = closed && (el.getAttribute("d")?.split("M").length ?? 0) > 3 ? subpathsOf(el, m) : null;
            const lettering = pieces !== null && isLettering(pieces);
            const nonzero = cs.fillRule !== "evenodd";
            const subpaths = fill !== null && stroke === null && !lettering ? (pieces ?? subpathsOf(el, m)) : null;
            const painted = subpaths !== null && subpaths.length >= 2 ? outlinePaintedAsFill(subpaths, nonzero) : null;
            const solid = subpaths !== null && nonzero ? solidOuter(subpaths) : null;
            if (solid !== null) {
                points = [...solid];
            }
            if (fill !== null && painted !== null) {
                stroke = {
                    color: fill.color,
                    opacity: fill.opacity,
                    width: painted.width === null ? Number.NaN : r3(painted.width),
                    dash: null,
                    dashClass: painted.dashClass,
                    painted: true,
                    ...(painted.patterned ? { patterned: true } : {}),
                };
                fill = null;
            }
            // two stroked subpaths are read apart only as a cross: their outline, run from one to the other, makes no shape
            const twoStrokes =
                stroke !== null && subpaths === null && (el.getAttribute("d")?.split("M").length ?? 0) === 3
                    ? subpathsOf(el, m)
                    : null;
            const panel = panelFillOf(el, root, opacities, m);
            prims.push({
                index: i,
                tag: painted === null ? tag : PAINTED_OUTLINE,
                kind: closed ? "shape" : "path",
                box: painted?.box ?? boxOfPoints(points),
                points,
                ...(fine === undefined ? {} : { fine }),
                closed,
                corners: painted === null ? cornersOf(el) : 0,
                ...(el.localName === "path" && hasSquareCorner(el.getAttribute("d") ?? "", el.getBBox())
                    ? { squareCorner: true }
                    : {}),
                fill: closed ? fill : null,
                stroke,
                text: null,
                markers: {
                    start: cs.markerStart !== "none" && cs.markerStart !== "",
                    end: cs.markerEnd !== "none" && cs.markerEnd !== "",
                },
                hint: hintOf(el),
                ...(subpaths !== null && painted === null ? { subpaths } : {}),
                ...(twoStrokes !== null && crossedStrokes(twoStrokes) ? { subpaths: twoStrokes } : {}),
                ...(lettering ? { lettering: true as const } : {}),
                ...(panel === null ? {} : { panel }),
                ...(cut === null ? {} : { uncut }),
            });
        }
        return { width: r3(rect.width), height: r3(rect.height), prims: withoutHiddenCuts(prims) };
    } finally {
        host.remove();
    }
}
