// Shared by every reference extractor: color, shape, arrow and line-style vocabularies, curve
// flattening, and finishScene(), which stamps a scene's canCarry from the route ledger, validates it
// against scene.schema.json and writes it. Python extractors print their scene and pipe it through
// `node common.mjs finish <out.json>`, so every scene passes the same check.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

import { canCarry } from "../routes.ts";
import { PROPERTIES } from "../scene.ts";

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMA = JSON.parse(readFileSync(`${here}/../scene.schema.json`, "utf8"));

const hex2 = (n) =>
    Math.max(0, Math.min(255, Math.round(n)))
        .toString(16)
        .padStart(2, "0");

/** CSS and Graphviz names the tools here print instead of a hex value. */
const NAMED = {
    black: "#000000",
    white: "#ffffff",
    red: "#ff0000",
    green: "#008000",
    blue: "#0000ff",
    gray: "#808080",
    grey: "#808080",
    yellow: "#ffff00",
};

/**
 * Reads a color as one of the tools writes it.
 * @param value - `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `java.awt.Color[r=,g=,b=]`, `r,g,b` or a basic name
 * @returns lowercase `#rrggbb` and alpha in 0..1, or null when unreadable or transparent-by-name
 */
export function parseColor(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const v = String(value).trim().toLowerCase();
    if (v === "" || v === "none" || v === "transparent") {
        return null;
    }
    if (NAMED[v]) {
        return { hex: NAMED[v], alpha: 1 };
    }
    let m = /^#([0-9a-f]{3,4})$/.exec(v);
    if (m) {
        const d = [...m[1]].map((c) => parseInt(c + c, 16));
        return { hex: `#${d.slice(0, 3).map(hex2).join("")}`, alpha: d.length === 4 ? d[3] / 255 : 1 };
    }
    m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(v);
    if (m) {
        return { hex: `#${m[1]}`, alpha: m[2] ? parseInt(m[2], 16) / 255 : 1 };
    }
    m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(v);
    if (m) {
        return { hex: `#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}`, alpha: m[4] === undefined ? 1 : +m[4] };
    }
    m = /^java\.awt\.color\[r=(\d+),g=(\d+),b=(\d+)\]$/.exec(v);
    if (m) {
        return { hex: `#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}`, alpha: 1 };
    }
    m = /^(\d+),(\d+),(\d+)$/.exec(v);
    if (m) {
        return { hex: `#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}`, alpha: 1 };
    }
    return null;
}

// Every tool's shape names, lowercased with spaces, dashes and underscores removed.
const SHAPES = {
    ellipse: "ellipse",
    oval: "ellipse",
    circle: "ellipse",
    point: "ellipse",
    doublecircle: "ellipse",
    ellipse2: "ellipse",
    rect: "rect",
    rectangle: "rect",
    box: "rect",
    square: "rect",
    record: "rect",
    rectangle3d: "rect",
    process: "rect",
    roundrect: "roundrect",
    roundrectangle: "roundrect",
    roundedrectangle: "roundrect",
    mrecord: "roundrect",
    roundsquare: "roundrect",
    diamond: "diamond",
    rhombus: "diamond",
    mdiamond: "diamond",
    triangle: "triangle",
    invtriangle: "triangle",
    roundtriangle: "triangle",
    hexagon: "hexagon",
    roundhexagon: "hexagon",
    concavehexagon: "hexagon",
    octagon: "octagon",
    doubleoctagon: "octagon",
    tripleoctagon: "octagon",
    roundoctagon: "octagon",
    star: "star",
    star5: "star",
    star6: "star",
    star8: "star",
    parallelogram: "parallelogram",
    rhomboid: "parallelogram",
    fatarrow: "other",
    image: "image",
    svg: "image",
};

/**
 * The shape class of a tool's shape name.
 * @param name - the tool's name for the shape
 * @returns a ShapeClass; "other" for a name no tool here shares
 */
export function shapeClass(name) {
    const k = String(name ?? "")
        .toLowerCase()
        .replace(/[\s_-]/g, "");
    return SHAPES[k] ?? "other";
}

// Every tool's arrowhead names. A filled arrowhead of any outline (triangle, vee, delta) is
// filled-triangle; its hollow form is open-triangle.
const ARROWS = {
    none: "none",
    "": "none",
    no: "none",
    filledtriangle: "filled-triangle",
    opentriangle: "open-triangle",
    other: "other",
    normal: "filled-triangle",
    triangle: "filled-triangle",
    vee: "filled-triangle",
    delta: "filled-triangle",
    standard: "filled-triangle",
    arrow: "filled-triangle",
    classic: "filled-triangle",
    block: "filled-triangle",
    inv: "filled-triangle",
    crow: "other",
    onormal: "open-triangle",
    empty: "open-triangle",
    whitedelta: "open-triangle",
    opendelta: "open-triangle",
    open: "open-triangle",
    hollowtriangle: "open-triangle",
    triangleopen: "open-triangle",
    plain: "open-triangle",
    openthin: "open-triangle",
    diamond: "diamond",
    odiamond: "diamond",
    whitediamond: "diamond",
    opendiamond: "diamond",
    ediamond: "diamond",
    dot: "circle",
    odot: "circle",
    circle: "circle",
    transparentcircle: "circle",
    oval: "circle",
    opencircle: "circle",
    tee: "tee",
    t: "tee",
    tshape: "tee",
    dash: "tee",
    bar: "tee",
};

/**
 * The arrow class of a tool's arrowhead name.
 * @param name - the tool's name for the arrowhead
 * @returns an ArrowClass or "none"
 */
export function arrowClass(name) {
    const k = String(name ?? "")
        .toLowerCase()
        .replace(/[\s_-]/g, "");
    return ARROWS[k] ?? "other";
}

/**
 * The line style of a tool's dash name.
 * @param name - the tool's line style or dash pattern name
 * @returns the style
 */
export function lineStyle(name) {
    const k = String(name ?? "solid")
        .toLowerCase()
        .replace(/[\s_-]/g, "");
    if (k === "" || k === "solid" || k === "line") {
        return "solid";
    }
    if (k.includes("dot")) {
        return k.includes("dash") ? "other" : "dotted";
    }
    if (k.includes("dash")) {
        return "dashed";
    }
    return "other";
}

/**
 * Flattens a piecewise cubic Bezier (Graphviz's spline: p0, then three points per segment) to a polyline.
 * @param pts - the control points
 * @param [steps] - points per segment
 * @returns the polyline, both ends included
 */
export function flattenCubic(pts, steps = 8) {
    if (pts.length < 4) {
        return pts.map(([x, y]) => [x, y]);
    }
    const out = [[pts[0][0], pts[0][1]]];
    for (let i = 0; i + 3 < pts.length; i += 3) {
        const [a, b, c, d] = pts.slice(i, i + 4);
        for (let s = 1; s <= steps; s++) {
            const t = s / steps;
            const u = 1 - t;
            const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
            out.push([
                w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0],
                w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1],
            ]);
        }
    }
    return out;
}

/**
 * Whether a polyline bends: any interior point off the straight line between its ends by more than tol.
 * @param pts - the polyline
 * @param [tol] - the distance that counts as straight
 * @returns true when it bends
 */
export function bends(pts, tol = 0.5) {
    if (pts.length < 3) {
        return false;
    }
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[pts.length - 1];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    return pts.some(([x, y]) => Math.abs((x1 - x0) * (y0 - y) - (x0 - x) * (y1 - y0)) / len > tol);
}

/**
 * Where the segment from a node's center toward a point leaves the node's outline: an ellipse for
 * "ellipse", else the bounding box. The same rule as refcommon.py's clip_to_node.
 * @param node - center x, center y, width, height, "ellipse" or "rect"
 * @param p - the point the segment heads for
 * @returns the exit point; the center when p lies inside the node
 */
export function clipToNode(node, p) {
    const [cx, cy, w, h, shape] = node;
    const [px, py] = p;
    const dx = px - cx;
    const dy = py - cy;
    if ((dx === 0 && dy === 0) || w <= 0 || h <= 0) {
        return [cx, cy];
    }
    const t =
        shape === "ellipse"
            ? 1 / Math.hypot(dx / (w / 2), dy / (h / 2))
            : Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity);
    return t >= 1 ? [cx, cy] : [cx + dx * t, cy + dy * t];
}

/**
 * A path from the source's center to the target's center with its ends moved onto the two outlines.
 * An end that is not at its node's center (an explicit port) is kept.
 * @param pts - the path, source end first
 * @param src - the source node, as clipToNode takes it
 * @param dst - the target node, as clipToNode takes it
 * @returns the clipped path
 */
export function clipPath(pts, src, dst) {
    if (pts.length < 2) {
        return pts;
    }
    const at = (p, n) => p[0] === n[0] && p[1] === n[1];
    const first = at(pts[0], src) ? clipToNode(src, pts[1]) : pts[0];
    const last = at(pts[pts.length - 1], dst) ? clipToNode(dst, pts[pts.length - 2]) : pts[pts.length - 1];
    return [first, ...pts.slice(1, -1), last].map(([x, y]) => [x, y]);
}

/**
 * The position class of a label box relative to its node's top-left corner (refcommon.py's label_position).
 * @param nw - node width
 * @param nh - node height
 * @param box - the label box
 * @returns inside, below, above, right, left or other
 */
export function labelPosition(nw, nh, box) {
    const { x = 0, y = 0, width, height } = box;
    const cx = x + width / 2;
    const cy = y + height / 2;
    if (cx >= 0 && cx <= nw && cy >= 0 && cy <= nh) {
        return "inside";
    }
    if (y >= nh - 0.5) {
        return "below";
    }
    if (y + height <= 0.5) {
        return "above";
    }
    if (x >= nw - 0.5) {
        return "right";
    }
    return x + width <= 0.5 ? "left" : "other";
}

/**
 * The sha256 of a file, hex.
 * @param path - the file
 * @returns the digest
 */
export function sha256File(path) {
    return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Fails unless a tool's output file exists and is not empty (a failed CyREST export leaves 0 bytes).
 * @param path - the output file
 * @returns the path
 */
export function requireOutput(path) {
    if (!existsSync(path) || statSync(path).size === 0) {
        throw new Error(`expected output missing or empty: ${path}`);
    }
    return path;
}

const round = (v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v);

function roundDeep(v) {
    if (Array.isArray(v)) {
        return v.map(roundDeep);
    }
    if (v && typeof v === "object") {
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x)]));
    }
    return round(v);
}

/**
 * Checks a value against the subset of JSON Schema scene.schema.json uses (type, enum, pattern,
 * required, properties, additionalProperties, propertyNames, items, anyOf, $ref, minimum, maximum,
 * minItems, maxItems, minLength), so Node, Python and Java read one contract with no validator dependency.
 * @param schema - the (sub)schema
 * @param v - the value
 * @param at - the path for messages
 * @param errors - collects one line per error
 * @returns errors
 */
export function checkSchema(schema, v, at = "", errors = []) {
    if (schema.$ref) {
        return checkSchema(SCHEMA.definitions[schema.$ref.split("/").pop()], v, at, errors);
    }
    if (schema.anyOf) {
        if (!schema.anyOf.some((s) => checkSchema(s, v, at).length === 0)) {
            errors.push(`${at} matches no allowed form`);
        }
        return errors;
    }
    const kind = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
    const types = [schema.type ?? []].flat();
    if (types.length > 0 && !types.includes(kind) && !(kind === "number" && types.includes("integer"))) {
        errors.push(`${at} is ${kind}, not ${types.join("|")}`);
        return errors;
    }
    if (schema.enum && !schema.enum.includes(v)) {
        errors.push(`${at} ${JSON.stringify(v)} is not one of the allowed values`);
    }
    if (typeof v === "string") {
        if (schema.pattern && !new RegExp(schema.pattern).test(v)) {
            errors.push(`${at} ${JSON.stringify(v)} does not match ${schema.pattern}`);
        }
        if (schema.minLength !== undefined && v.length < schema.minLength) {
            errors.push(`${at} is too short`);
        }
    }
    if (typeof v === "number") {
        if (!Number.isFinite(v)) {
            errors.push(`${at} is not finite`);
        }
        if (
            (schema.minimum !== undefined && v < schema.minimum) ||
            (schema.maximum !== undefined && v > schema.maximum)
        ) {
            errors.push(`${at} ${v} is out of range`);
        }
    }
    if (kind === "array") {
        if (
            (schema.minItems !== undefined && v.length < schema.minItems) ||
            (schema.maxItems !== undefined && v.length > schema.maxItems)
        ) {
            errors.push(`${at} has ${v.length} items`);
        }
        if (schema.items) {
            v.forEach((x, i) => checkSchema(schema.items, x, `${at}/${i}`, errors));
        }
    }
    if (kind === "object") {
        for (const k of schema.required ?? []) {
            if (!(k in v)) {
                errors.push(`${at} lacks ${k}`);
            }
        }
        for (const [k, x] of Object.entries(v)) {
            if (schema.propertyNames) {
                checkSchema(schema.propertyNames, k, `${at}/${k} (name)`, errors);
            }
            const sub =
                schema.properties?.[k] ??
                (typeof schema.additionalProperties === "object" ? schema.additionalProperties : null);
            if (sub) {
                checkSchema(sub, x, `${at}/${k}`, errors);
            } else if (schema.additionalProperties === false) {
                errors.push(`${at} has unknown property ${k}`);
            }
        }
    }
    return errors;
}

/**
 * The schema errors of a scene, empty when it is valid, plus the checks a schema cannot state.
 * @param scene - a scene
 * @returns one line per error
 */
export function sceneErrors(scene) {
    const errors = checkSchema(SCHEMA, scene);
    if (scene.nodes?.length === 0) {
        errors.push("no nodes");
    }
    const ids = new Set(scene.nodes?.map((n) => n.id));
    if (ids.size !== scene.nodes?.length) {
        errors.push("duplicate node ids");
    }
    for (const e of scene.edges ?? []) {
        if (!ids.has(e.source) || !ids.has(e.target)) {
            errors.push(`edge ${e.id} names a node the scene does not have`);
        }
    }
    return errors;
}

/**
 * Drops the edges whose end is not a node of the scene: an edge to a group box, which yEd allows and a
 * scene cannot carry. Says on stderr how many it dropped.
 * @param scene - a scene
 * @returns the scene without those edges
 */
export function dropGroupEdges(scene) {
    const ids = new Set(scene.nodes.map((n) => n.id));
    const edges = scene.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    if (edges.length !== scene.edges.length) {
        console.error(`dropped ${scene.edges.length - edges.length} edges ending at a group box`);
    }
    return { ...scene, edges };
}

/**
 * Maps a tool's shape, arrowhead and dash names to the scene vocabulary (a scene name maps to itself),
 * so an extractor may write the names its tool uses.
 * @param scene - a scene
 * @returns the scene with every shape, arrow and line style a scene class
 */
export function normalizeNames(scene) {
    return {
        ...scene,
        nodes: scene.nodes.map((n) => ({
            ...n,
            shape: shapeClass(n.shape),
            border: { ...n.border, style: lineStyle(n.border.style) },
        })),
        edges: scene.edges.map((e) => ({
            ...e,
            style: lineStyle(e.style),
            arrow: { source: arrowClass(e.arrow.source), target: arrowClass(e.arrow.target) },
        })),
    };
}

/**
 * Stamps canCarry from the route's ledger, rounds numbers to 0.001, validates and writes a scene.
 * @param scene - the scene; canCarry is replaced
 * @param out - the file to write
 * @returns the scene as written
 */
export function finishScene(scene, out) {
    const done = roundDeep({ ...normalizeNames(scene), canCarry: canCarry(scene.provenance.route, PROPERTIES) });
    const errors = sceneErrors(done);
    if (errors.length > 0) {
        throw new Error(`${out}: invalid scene\n  ${errors.slice(0, 20).join("\n  ")}`);
    }
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${JSON.stringify(done, null, 1)}\n`);
    console.log(
        `${out}: ${done.nodes.length} nodes, ${done.edges.length} edges, ${done.groups.length} groups, ${done.gaps.length} gaps`,
    );
    return done;
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv[2] === "finish") {
    // node common.mjs finish [--drop-group-edges] <out.json>, the scene on stdin.
    // stdin can be a non-blocking pipe (EAGAIN on a synchronous read), so read it as a stream
    const chunks = [];
    process.stdin.setEncoding("utf8");
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    const drop = process.argv[3] === "--drop-group-edges";
    const scene = JSON.parse(chunks.join(""));
    finishScene(drop ? dropGroupEdges(scene) : scene, process.argv[drop ? 4 : 3]);
}
