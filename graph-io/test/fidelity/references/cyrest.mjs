// Reference scene from Cytoscape desktop (route cytoscape-desktop, or cytoscape-gml for a GML file):
// loads a file into a running Cytoscape 3.10.5 through CyREST and reads every node's and edge's
// resolved visual properties from the network view (after mappings, defaults, dependencies and
// bypasses), plus the session's annotations. Optionally also writes the view as a Cytoscape.js
// document (desktop's own element and style exports), the input of the cyjs-hop route.
//
//   node cyrest.mjs <rest port> <file to load> <sample as stored> <route> <out.json> [<cydoc out.json>]
//
// A session (.cys) is opened with `session open`; anything else with `network load file`, never
// `network import`, which drops the file's style. A .gz sample is loaded decompressed (regenerate.sh)
// and hashed as stored. Ids are the node `name` column (the file's own names); edge ids are
// "<source name>-><target name>", with "#k" for the k-th parallel edge in SUID order (the order the
// file lists them, which is how graphty numbers them; the view's topology lists them in another order).
// Cytoscape's canvas is y down and node locations are centers.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { clipPath, clipToNode, finishScene, parseColor, sha256File } from "./common.mjs";

const POSITION = { "C,C": "inside", "S,N": "below", "N,S": "above", "E,W": "right", "W,E": "left" };

/**
 * The scene ids of a Cytoscape view's elements: each node's `name` (with "#k" for the k-th repeat of
 * a name), and "<source>-><target>" for each edge (with "#k" for the k-th parallel edge in SUID order, the order the
 * file lists them), keyed by SUID.
 * @param topology - the view's Cytoscape.js JSON
 * @returns the node and edge ids by SUID, and whether a name repeats
 */
export function cyrestIds(topology) {
    const seen = new Map();
    const nodes = new Map();
    for (const n of topology.elements.nodes) {
        const name = String(n.data.name ?? n.data.id);
        const k = seen.get(name) ?? 0;
        seen.set(name, k + 1);
        nodes.set(String(n.data.SUID), k ? `${name}#${k}` : name);
    }
    const ordinal = new Map();
    const edges = new Map();
    for (const e of [...topology.elements.edges].sort((a, b) => Number(a.data.SUID) - Number(b.data.SUID))) {
        const key = `${nodes.get(String(e.data.source))}->${nodes.get(String(e.data.target))}`;
        const k = ordinal.get(key) ?? 0;
        ordinal.set(key, k + 1);
        edges.set(String(e.data.SUID), k ? `${key}#${k}` : key);
    }
    return { nodes, edges, repeated: [...seen.values()].some((k) => k > 1) };
}

/** A Cytoscape gradient custom graphic, as the desktop writes it (`<class>:{...}`) or as an object (CX2). */
const GRADIENT_GRAPHIC = /org\.cytoscape\.(Linear|Radial)Gradient/;

/**
 * Whether a node row's custom graphics slots hold a gradient, which the desktop paints over the node's whole face.
 * @param r - the node's CyREST row
 * @returns whether one does
 */
function paintsGradient(r) {
    return Array.from({ length: 9 }, (_, k) => r[`NODE_CUSTOMGRAPHICS_${String(k + 1)}`]).some((v) =>
        GRADIENT_GRAPHIC.test(typeof v === "string" ? v : JSON.stringify(v ?? "")),
    );
}

/**
 * Where a centered label sits once its offset moves it: outside the node's box when its center leaves it, on the
 * side it went furthest, as the drawn scene reads a label from its box (graphty-element extract-scene.ts labelPlace).
 * ponytail: only a centered label is moved; an offset on a side anchor keeps the anchor's class
 * @param place - the class its anchors give
 * @param dx - the label position's x offset, px
 * @param dy - the label position's y offset, px, down
 * @param w - the node's width
 * @param h - the node's height
 * @returns the class
 */
function offsetPosition(place, dx, dy, w, h) {
    const [x, y] = [Number.isFinite(dx) ? dx : 0, Number.isFinite(dy) ? dy : 0];
    if (place !== "inside" || (Math.abs(x) <= w / 2 && Math.abs(y) <= h / 2)) {
        return place;
    }
    if (Math.abs(y) >= Math.abs(x)) {
        return y < 0 ? "above" : "below";
    }
    return x < 0 ? "left" : "right";
}

/** The border line types desktop draws as their own outline, not as a plain stroke under the node's fill. */
const PATTERNED_BORDERS = new Set([
    "DOT",
    "ZIGZAG",
    "SINEWAVE",
    "PARALLEL_LINES",
    "BACKWARD_SLASH",
    "FORWARD_SLASH",
    "VERTICAL_SLASH",
    "SEPARATE_ARROW",
    "CONTIGUOUS_ARROW",
]);

/**
 * The width of a node's border as desktop shows it: it strokes a plain border along the outline inset by half the
 * width and paints an opaque fill over the stroke's inner half, so half of it shows; a patterned border, one under a
 * translucent fill, and an invisible one (which still insets the fill by all of it) are recorded whole (graph-io's cytoscape/lexicon.ts `borderUnderFill`).
 * @param width - NODE_BORDER_WIDTH
 * @param stroke - NODE_BORDER_STROKE
 * @param transparency - the fill's 0..255 transparency
 * @param borderTransparency - NODE_BORDER_TRANSPARENCY
 * @returns the width showing
 */
export function visibleBorder(width, stroke, transparency, borderTransparency) {
    const under =
        !PATTERNED_BORDERS.has(String(stroke ?? "SOLID").toUpperCase()) &&
        transparency >= 255 &&
        borderTransparency > 0;
    return under ? width / 2 : width;
}

/**
 * The scene of one Cytoscape network view as CyREST reports it.
 * Under "lock node width and height", Cytoscape draws a node at NODE_SIZE, except where the node
 * itself sets its width or height (a bypass): that dimension is drawn at the node's own value. The
 * resolved rows cannot tell the two apart, so `bypassed` names them.
 * @param v - { nodes, edges } (visual property rows by SUID), topology (the view's Cytoscape.js JSON), background, annotations, locked, bypassed (SUID to the node's own { w, h }, either absent), textSizes (a text annotation's uuid to the { w, h } desktop draws it at, from `textSizesOf`)
 * @returns nodes, edges, groups, annotations, background and gaps
 */
export function sceneFromCyrest(v) {
    const {
        nodes: nodeRows,
        edges: edgeRows,
        topology,
        background,
        annotations,
        locked,
        bypassed = {},
        textSizes = {},
    } = v;
    const gaps = [];
    const ids = cyrestIds(topology);
    const idOf = ids.nodes;
    if (ids.repeated) {
        gaps.push({
            property: "position",
            reason: "node names repeat, so some ids carry a #k suffix and may not match the other side",
        });
    }
    const geo = new Map();
    const nodes = nodeRows.map((r) => {
        const id = idOf.get(String(r.SUID));
        const own = bypassed[String(r.SUID)] ?? {};
        const w = locked ? (own.w ?? r.NODE_SIZE) : r.NODE_WIDTH;
        const h = locked ? (own.h ?? r.NODE_SIZE) : r.NODE_HEIGHT;
        geo.set(String(r.SUID), [
            r.NODE_X_LOCATION,
            r.NODE_Y_LOCATION,
            w,
            h,
            r.NODE_SHAPE === "ELLIPSE" ? "ellipse" : "rect",
        ]);
        const fill = parseColor(r.NODE_FILL_COLOR);
        const border = parseColor(r.NODE_BORDER_PAINT);
        const text = String(r.NODE_LABEL ?? "");
        const placed = String(r.NODE_LABEL_POSITION ?? "C,C").split(",");
        const anchor = placed.slice(0, 2).join(",");
        return {
            id,
            x: r.NODE_X_LOCATION,
            y: r.NODE_Y_LOCATION,
            w,
            h,
            shape: r.NODE_SHAPE,
            fill: fill?.hex ?? null,
            fillOpacity: fill ? (r.NODE_TRANSPARENCY ?? 255) / 255 : 0,
            border: {
                color: border && r.NODE_BORDER_WIDTH > 0 && (r.NODE_BORDER_TRANSPARENCY ?? 255) > 0 ? border.hex : null,
                width: visibleBorder(
                    r.NODE_BORDER_WIDTH ?? 0,
                    r.NODE_BORDER_STROKE,
                    fill ? (r.NODE_TRANSPARENCY ?? 255) : 0,
                    r.NODE_BORDER_TRANSPARENCY ?? 255,
                ),
                style: r.NODE_BORDER_STROKE ?? "SOLID",
            },
            label: text
                ? {
                      text,
                      fontSize: r.NODE_LABEL_FONT_SIZE ?? 12,
                      color: parseColor(r.NODE_LABEL_COLOR)?.hex ?? "#000000",
                      position: offsetPosition(POSITION[anchor] ?? "other", Number(placed[3]), Number(placed[4]), w, h),
                      visible: (r.NODE_LABEL_TRANSPARENCY ?? 255) > 0,
                  }
                : null,
            visible: r.NODE_VISIBLE !== false,
            z: r.NODE_Z_LOCATION ?? 0,
            // a gradient custom graphic is painted over the node's whole face: NODE_FILL_COLOR is the color under it
            ...(paintsGradient(r) ? { paintedOver: true } : {}),
        };
    });
    const ends = new Map(
        topology.elements.edges.map((e) => [String(e.data.SUID), [String(e.data.source), String(e.data.target)]]),
    );
    const anchors = autoAnchors(topology, edgeRows, geo);
    let bent = 0;
    const edges = edgeRows.map((r) => {
        const [s, t] = ends.get(String(r.SUID));
        if (r.EDGE_BEND) {
            bent++;
        }
        const anchor = anchors.get(String(r.SUID));
        const color = parseColor(r.EDGE_STROKE_UNSELECTED_PAINT ?? r.EDGE_UNSELECTED_PAINT) ?? {
            hex: "#000000",
            alpha: 1,
        };
        return {
            id: ids.edges.get(String(r.SUID)),
            source: idOf.get(s),
            target: idOf.get(t),
            points: clipPath(
                anchor === undefined
                    ? [geo.get(s).slice(0, 2), geo.get(t).slice(0, 2)]
                    : anchoredPath(geo.get(s), anchor, geo.get(t), r.EDGE_CURVED !== false),
                geo.get(s),
                geo.get(t),
            ),
            curved: (Boolean(r.EDGE_BEND) || anchor !== undefined) && r.EDGE_CURVED !== false,
            color: color.hex,
            opacity: (r.EDGE_TRANSPARENCY ?? 255) / 255,
            width: r.EDGE_WIDTH ?? 1,
            style: r.EDGE_LINE_TYPE ?? "SOLID",
            arrow: { source: r.EDGE_SOURCE_ARROW_SHAPE ?? "NONE", target: r.EDGE_TARGET_ARROW_SHAPE ?? "NONE" },
            label: r.EDGE_LABEL ? String(r.EDGE_LABEL) : null,
        };
    });
    if (bent > 0) {
        gaps.push({
            property: "edgePath",
            reason: `${bent} edges have bend handles, which CyREST reports as an opaque string; their paths are drawn straight here`,
        });
    }
    const kinds = {
        ShapeAnnotation: "shape",
        TextAnnotation: "text",
        ArrowAnnotation: "arrow",
        BoundedTextAnnotation: "shape",
    };
    const byId = new Map(annotations.map((a) => [a.uuid, a]));
    const annots = annotations.map((a) => {
        const kind = kinds[a.type.split(".").pop()] ?? "shape";
        const bbox =
            kind === "arrow"
                ? arrowBox(a, byId, textSizes, [...geo.values()])
                : { x: +a.x, y: +a.y, w: +(a.width ?? 0), h: +(a.height ?? (a.fontSize ? +a.fontSize : 0)) };
        return { kind, bbox, ...(a.text ? { text: a.text } : {}) };
    });
    const bg = parseColor(background);
    return {
        nodes,
        edges,
        groups: [],
        ...(annots.length ? { annotations: annots } : {}),
        ...(bg ? { background: bg.hex } : {}),
        gaps,
    };
}

/**
 * The middle of the side of a box that faces a point: a left or right side when the point lies more across than along,
 * against the box's own proportions, else the top or bottom (graph-io's styles/annotations.ts `facing`, measured on
 * desktop's SVG of the tutorial session).
 * @param b - the box, { x, y, w, h } with x, y its top-left corner
 * @param p - the point [x, y]
 * @returns the side's middle [x, y]
 */
export function facingSide(b, p) {
    const [cx, cy] = [b.x + b.w / 2, b.y + b.h / 2];
    const [dx, dy] = [p[0] - cx, p[1] - cy];
    if (Math.abs(dx) * b.h >= Math.abs(dy) * b.w) {
        return [cx + (Math.sign(dx) * b.w) / 2, cy];
    }
    return [cx, cy + (Math.sign(dy) * b.h) / 2];
}

/**
 * The box of the line desktop draws for an arrow annotation: from the side of its source annotation that faces its end,
 * to its end, which is a point (`targetPoint`), the outline of the node at `targetNode` (CyREST gives the node's
 * center), or the side of its target annotation that faces the source. An arrow's own `x`, `y` is where desktop last
 * placed its component, not where its line starts, so it is the start only for an arrow with no measurable source.
 * @param a - the arrow's CyREST annotation row
 * @param byId - every annotation row by uuid
 * @param textSizes - a text annotation's uuid to the { w, h } desktop draws it at (CyREST lists no size for a text)
 * @param nodes - each node's [x, y, w, h, shape]
 * @returns the line's box { x, y, w, h }
 */
export function arrowBox(a, byId, textSizes, nodes) {
    const boxOf = (row) => {
        const size = textSizes[row?.uuid] ?? {};
        const [w, h] = [+(row?.width ?? size.w ?? 0), +(row?.height ?? size.h ?? 0)];
        return row && w > 0 && h > 0 ? { x: +row.x, y: +row.y, w, h } : null;
    };
    const pointOf = (raw) => (raw ? String(raw).split(",").map(Number) : null);
    const centerOf = (b) => [b.x + b.w / 2, b.y + b.h / 2];
    const source = boxOf(byId.get(a.sourceAnnotation));
    const target = boxOf(byId.get(a.targetAnnotation));
    const node = a.targetPoint ? null : pointOf(a.targetNode);
    const aim = pointOf(a.targetPoint) ?? node ?? (target && centerOf(target));
    const from = source && aim ? facingSide(source, aim) : [+a.x, +a.y];
    let to = aim ?? from;
    if (node) {
        const near = (g) => Math.hypot(g[0] - node[0], g[1] - node[1]);
        const at = nodes.reduce((best, g) => (best === null || near(g) < near(best) ? g : best), null);
        to = at ? clipToNode(at, from) : node;
    } else if (!a.targetPoint && target) {
        to = facingSide(target, source ? centerOf(source) : from);
    }
    return {
        x: Math.min(from[0], to[0]),
        y: Math.min(from[1], to[1]),
        w: Math.abs(to[0] - from[0]),
        h: Math.abs(to[1] - from[1]),
    };
}

/**
 * The size desktop draws each text annotation at that an arrow leaves from, which `annotation list` does not give: a
 * bounded text annotation added with the same text and font and no size is sized by desktop to the text plus 4 on
 * every side (its height, 31.28 at 20 and 40.59 at 28 in Dialog, is the font's 1.164 line height plus 8), so the
 * text's own box is that less 8 each way. Each probe is deleted again.
 * @param cmd - a CyREST command: (namespace, command, args) to the parsed body
 * @param view - the view SUID
 * @param annotations - the annotation rows
 * @returns uuid to { w, h }
 */
export async function textSizesOf(cmd, view, annotations) {
    const sources = new Set(annotations.map((a) => a.sourceAnnotation).filter(Boolean));
    const out = {};
    for (const a of annotations) {
        if (!sources.has(a.uuid) || !a.type.endsWith(".TextAnnotation")) {
            continue;
        }
        const probe = (
            await cmd("annotation", "add bounded text", {
                view: `SUID:${view}`,
                text: a.text,
                fontFamily: a.fontFamily,
                fontSize: a.fontSize,
                fontStyle: a.fontStyle,
                x: "0",
                y: "0",
            })
        ).data;
        await cmd("annotation", "delete", { uuidOrName: probe.uuid });
        out[a.uuid] = { w: +probe.width - 8, h: +probe.height - 8 };
    }
    return out;
}

/**
 * The anchor Cytoscape desktop bends each parallel edge round (ding's `DEdgeDetails.getAnchors` in 3.10.5, with
 * `EDGE_STACKING` `AUTO_BEND`, the default). Desktop walks the edges in the order it makes their views
 * (`SimpleNetwork.getEdgeList`): by source node, newest (highest SUID) first, and each node's outgoing edges newest
 * first. Among the edges joining two nodes either way round, the k-th in that walk (from 0) gets one anchor beside
 * the midpoint of the line from the newer node to the older, `ceil(k / 2)` steps to the side (alternating, the first
 * to the right of that line in a y-down frame), a step being the largest width or height of the two nodes times twice
 * the stacking density (0.5 by default). The first edge has none; when it has bends, every anchor falls on the line
 * (ding counts the first edge's handles, not each edge's), so none is recorded. Loops are left out. The same rule as
 * graph-io's cytoscape/resolve.ts `fanPlaces` and `fanAnchors`.
 * @param topology - the view's Cytoscape.js JSON
 * @param edgeRows - the edge visual property rows
 * @param geo - SUID to [x, y, w, h, shape] of each node
 * @returns SUID to the anchor [x, y], for the edges that have one
 */
export function autoAnchors(topology, edgeRows, geo) {
    const rows = new Map(edgeRows.map((r) => [String(r.SUID), r]));
    const bundles = new Map();
    const walk = [...topology.elements.edges].sort(
        (a, b) => Number(b.data.source) - Number(a.data.source) || Number(b.data.SUID) - Number(a.data.SUID),
    );
    for (const e of walk) {
        const [s, t] = [Number(e.data.source), Number(e.data.target)];
        if (s === t) {
            continue;
        }
        const key = `${Math.max(s, t)},${Math.min(s, t)}`;
        bundles.set(key, [...(bundles.get(key) ?? []), String(e.data.SUID)]);
    }
    const out = new Map();
    for (const [key, suids] of bundles) {
        if (rows.get(suids[0])?.EDGE_BEND) {
            continue;
        }
        // the fan's direction: from the newer node (desktop makes its view first) to the older
        const [from, to] = key.split(",").map((k) => geo.get(k));
        const dx = to[0] - from[0];
        const dy = to[1] - from[1];
        const len = Math.hypot(dx, dy);
        if (Math.fround(len) === 0) {
            continue;
        }
        const size = Math.max(from[2], from[3], to[2], to[3]);
        suids.forEach((suid, k) => {
            const r = rows.get(suid);
            if (k === 0 || !r || r.EDGE_BEND || (r.EDGE_STACKING ?? "AUTO_BEND") !== "AUTO_BEND") {
                return;
            }
            const density = 2 * Math.min(1, Math.max(0, r.EDGE_STACKING_DENSITY ?? 0.5));
            const n = Math.floor((k + 1) / 2) * (k % 2 === 0 ? 1 : -1) * size * density;
            out.set(suid, [(from[0] + to[0]) / 2 + (n * dy) / len, (from[1] + to[1]) / 2 - (n * dx) / len]);
        });
    }
    return out;
}

/**
 * The path ding draws through one anchor: a quadratic curve with the anchor as its control point when the edge is
 * curved, else two straight segments through it. From center to center; the caller clips the ends.
 * @param s - the source [x, y, ...]
 * @param a - the anchor [x, y]
 * @param t - the target [x, y, ...]
 * @param curved - EDGE_CURVED
 * @returns the points
 */
export function anchoredPath(s, a, t, curved) {
    if (!curved) {
        return [s.slice(0, 2), a, t.slice(0, 2)];
    }
    const steps = 16;
    return Array.from({ length: steps + 1 }, (_, i) => {
        const u = i / steps;
        return [0, 1].map((k) => (1 - u) * (1 - u) * s[k] + 2 * (1 - u) * u * a[k] + u * u * t[k]);
    });
}

/**
 * The width and height each node sets itself (its bypasses), which Cytoscape draws even under
 * "lock node width and height".
 * @param call - a CyREST call: (method, path) to the parsed body, throwing when not ok
 * @param net - the network SUID
 * @param view - the view SUID
 * @param rows - the view's node rows
 * @returns SUID to { w, h }, each present only when bypassed
 */
export async function sizeBypasses(call, net, view, rows) {
    const out = {};
    for (const r of rows) {
        const own = {};
        for (const [vp, key] of [
            ["NODE_WIDTH", "w"],
            ["NODE_HEIGHT", "h"],
        ]) {
            const got = await call("GET", `/networks/${net}/views/${view}/nodes/${r.SUID}/${vp}/bypass`).catch(
                () => null,
            );
            const value = got?.data?.value ?? got?.value;
            if (typeof value === "number") {
                own[key] = value;
            }
        }
        if (own.w !== undefined || own.h !== undefined) {
            out[String(r.SUID)] = own;
        }
    }
    return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [port, input, sample, route, out, cydocOut] = process.argv.slice(2);
    const base = `http://localhost:${port}/v1`;
    const call = async (method, path, body) => {
        const res = await globalThis.fetch(base + path, {
            method,
            headers: body ? { "content-type": "application/json" } : {},
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
        }
        return text ? JSON.parse(text) : null;
    };
    const cmd = (ns, c, args) => call("POST", `/commands/${ns}/${encodeURIComponent(c)}`, args);
    const file = resolve(input);
    await cmd("session", "new", { destroyCurrentSession: true });
    if (file.endsWith(".cys")) {
        await cmd("session", "open", { file });
    } else {
        await cmd("network", "load file", { file });
    }
    const viewed = [];
    for (const net of await call("GET", "/networks")) {
        for (const view of await call("GET", `/networks/${net}/views`)) {
            viewed.push({ net, view, n: (await call("GET", `/networks/${net}/nodes`)).length });
        }
    }
    if (viewed.length === 0) {
        throw new Error(`Cytoscape made no network view of ${file}`);
    }
    // a session can hold several networks: the reference is the largest view
    const { net, view } = viewed.sort((a, b) => b.n - a.n)[0];
    const keep = (rows) =>
        rows.map((r) => ({ SUID: r.SUID, ...Object.fromEntries(r.view.map((v) => [v.visualProperty, v.value])) }));
    const nodes = keep(await call("GET", `/networks/${net}/views/${view}/nodes`));
    const edges = keep(await call("GET", `/networks/${net}/views/${view}/edges`));
    const netProps = Object.fromEntries(
        (await call("GET", `/networks/${net}/views/${view}/network`)).map((v) => [v.visualProperty, v.value]),
    );
    const topology = await call("GET", `/networks/${net}/views/${view}`);
    const style = await call("GET", `/networks/${net}/views/${view}/currentStyle`);
    const deps = await call("GET", `/styles/${encodeURIComponent(style.title)}/dependencies`);
    const locked = deps.some((d) => d.visualPropertyDependency === "nodeSizeLocked" && d.enabled);
    const bypassed = locked ? await sizeBypasses(call, net, view, nodes) : {};
    const annotations = (await cmd("annotation", "list", { network: `SUID:${net}` })).data ?? [];
    const textSizes = await textSizesOf(cmd, view, annotations);
    const version = (await call("GET", "/version")).cytoscapeVersion;
    const extra =
        viewed.length > 1
            ? [
                  {
                      property: "position",
                      reason: `the file holds ${viewed.length} network views; this scene is the largest`,
                  },
              ]
            : [];
    const scene = sceneFromCyrest({
        nodes,
        edges,
        topology,
        background: netProps.NETWORK_BACKGROUND_PAINT,
        annotations,
        locked,
        bypassed,
        textSizes,
    });
    finishScene(
        {
            provenance: {
                side: "reference",
                route,
                tool: "Cytoscape desktop over CyREST, Temurin JDK 17",
                version,
                command: `${file.endsWith(".cys") ? "session open" : "network load file"} <file>; GET /v1/networks/{n}/views/{v}/nodes|edges|network; annotation list`,
                sourceSha256: sha256File(sample),
                generatedAt: new Date().toISOString(),
            },
            canCarry: {},
            ...scene,
            gaps: [...scene.gaps, ...extra],
        },
        out,
    );
    if (cydocOut) {
        const cystyle = (await call("GET", `/styles/${encodeURIComponent(style.title)}.json`))[0];
        // desktop's style selects elements by id (= SUID), so the ids stay; sceneIds renames them in the cyjs-hop scene
        const ids = cyrestIds(topology);
        const sceneIds = { nodes: Object.fromEntries(ids.nodes), edges: Object.fromEntries(ids.edges) };
        const doc = {
            elements: topology.elements,
            style: cystyle.style,
            background: netProps.NETWORK_BACKGROUND_PAINT,
            sceneIds,
        };
        writeFileSync(cydocOut, JSON.stringify(doc));
    }
}
