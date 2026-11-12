// Reference scene for a JSON file (routes cyjs-computed, sigma and vis-network): draws the file with the
// library its dialect was written for, in headless Chromium, and reads what that library drew.
//
//   node json-library.mjs <cyjs|sigma|vis> <file.json[.gz]> <out.ref.json> [--canvas <width>x<height>]
//   (run it under tools/with-browser.sh)
//
// cyjs:  Cytoscape.js (graph-io's devDependency), read as cyjs.mjs reads it (sceneFromCyjs), plus the
//        hollow arrow fill, which sceneFromCyjs does not read. Positions stored for every node draw
//        with the "preset" layout, else Cytoscape.js's "grid".
// sigma: graphology import + sigma (graph-io's devDependencies); the scene from graphology's attributes
//        with sigma's defaults, as sigma.mjs, at the positions and sizes sigma drew, plus `hidden` and
//        arrow edge types. A Gephi JSON export (keys at the top level) is moved into graphology's
//        { key, attributes } shape first, which is what a sigma user does.
// vis:   vis-network standalone (graph-io's devDependency); each node's and edge's resolved options and
//        formatting values (groups, defaults, scaling and color inheritance resolved by vis-network).
//
// The canvas is 1200 x 900 unless --canvas says otherwise; sigma draws label sizes in canvas pixels
// over positions it fits to the canvas, so its scene depends on it (TOOLS.md). The file is hashed as
// stored. Values Cytoscape.js throws on and other page errors are printed on stderr.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import console from "node:console";
import process from "node:process";

import { bends, finishScene, parseColor, sha256File } from "./common.mjs";
import { sceneFromCyjs } from "./cyjs.mjs";
import { SIGMA_DEFAULTS } from "./sigma.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const graphIo = resolve(here, "../../..");
const req = createRequire(join(graphIo, "package.json"));
const versionOf = (pkg) => JSON.parse(readFileSync(join(graphIo, "node_modules", pkg, "package.json"), "utf8")).version;

const args = process.argv.slice(2);
const canvasAt = args.indexOf("--canvas");
const [W, H] = canvasAt >= 0 ? args.splice(canvasAt, 2)[1].split("x").map(Number) : [1200, 900];
const [family, input, out] = args;
if (!["cyjs", "sigma", "vis"].includes(family) || !input || !out || !(W > 0 && H > 0)) {
    console.error("usage: json-library.mjs <cyjs|sigma|vis> <file.json[.gz]> <out.ref.json> [--canvas <w>x<h>]");
    process.exit(2);
}
const bytes = readFileSync(input);
const doc = JSON.parse((input.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8"));
const { chromium } = createRequire(resolve(graphIo, "../graphty-element/package.json"))("playwright");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const color = (v, d = "#000000") => parseColor(v) ?? { hex: d, alpha: 1 };
const canvasNote = canvasAt >= 0 ? `, ${W}x${H} canvas` : "";

/**
 * A Gephi JSON node's or edge's top-level keys as graphology attributes: its own `attributes` key,
 * which Gephi writes for the columns, is not one of the drawing's.
 * @param keys - the element's keys other than its id and ends
 * @returns the attributes
 */
function withoutAttributes(keys) {
    const rest = { ...keys };
    delete rest.attributes;
    return rest;
}

/**
 * graphology and sigma as one script for the page, bundled from graph-io's devDependencies.
 * @returns the script
 */
async function sigmaBundle() {
    const r = await req("esbuild").build({
        stdin: {
            contents:
                'import Graph from "graphology"; import Sigma from "sigma"; globalThis.Graph = Graph; globalThis.Sigma = Sigma;',
            resolveDir: here,
        },
        bundle: true,
        format: "iife",
        write: false,
        logLevel: "silent",
    });
    return r.outputFiles[0].text;
}

try {
    const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.setContent(
        `<html><body style="margin:0;background:#fff"><div id=c style="width:${W}px;height:${H}px"></div></body></html>`,
    );
    let scene;
    let route;
    let tool;
    let version;
    if (family === "cyjs") {
        version = versionOf("cytoscape");
        await page.addScriptTag({ content: readFileSync(req.resolve("cytoscape/dist/cytoscape.min.js"), "utf8") });
        const els = Array.isArray(doc.elements)
            ? doc.elements
            : [...(doc.elements.nodes ?? []), ...(doc.elements.edges ?? [])];
        const parents = new Set(els.map((e) => e.data?.parent).filter(Boolean));
        const positioned = els
            .filter((e) => !e.data?.source && !parents.has(e.data?.id))
            .every((e) => e.position && Number.isFinite(e.position.x));
        const raw = await page.evaluate(
            async ({ elements, style, layout }) => {
                // A stylesheet value Cytoscape.js itself throws on is dropped (and listed), so the rest draws.
                const dropped = [];
                if (Array.isArray(style)) {
                    style = style.map((r) => ({
                        ...r,
                        style: Object.fromEntries(
                            Object.entries(r.style ?? r.css ?? {}).filter(([k, v]) => {
                                try {
                                    globalThis.cytoscape({
                                        headless: true,
                                        styleEnabled: true,
                                        style: [{ selector: "node", style: { [k]: v } }],
                                    });
                                    return true;
                                } catch (err) {
                                    dropped.push(`${r.selector} { ${k}: ${v} }: ${err}`);
                                    return false;
                                }
                            }),
                        ),
                    }));
                }
                const cy = globalThis.cytoscape({
                    container: globalThis.document.getElementById("c"),
                    elements,
                    style,
                    layout: { name: layout },
                });
                await new Promise((drawn) => {
                    let draws = 0;
                    cy.on("render", () => {
                        draws += 1;
                        if (draws === 2) drawn();
                    });
                    cy.forceRender();
                });
                const S = (e, keys) =>
                    Object.fromEntries(
                        keys.map((k) => {
                            try {
                                return [k, e.style(k)];
                            } catch {
                                return [k, null];
                            }
                        }),
                    );
                const nodeKeys = [
                    "shape",
                    "background-color",
                    "background-opacity",
                    "opacity",
                    "border-width",
                    "border-color",
                    "border-style",
                    "label",
                    "font-size",
                    "color",
                    "text-valign",
                    "text-halign",
                    "text-opacity",
                    "visibility",
                    "display",
                    "z-index",
                ];
                const edgeKeys = [
                    "curve-style",
                    "line-color",
                    "line-opacity",
                    "opacity",
                    "width",
                    "line-style",
                    "source-arrow-shape",
                    "target-arrow-shape",
                    "source-arrow-fill",
                    "target-arrow-fill",
                    "label",
                    "visibility",
                    "display",
                ];
                const p = (q) => [q.x, q.y];
                return {
                    dropped,
                    nodes: cy.nodes().map((n) => {
                        const b = n.boundingBox({
                            includeLabels: false,
                            includeOverlays: false,
                            includeOutlines: false,
                        });
                        return {
                            id: n.id(),
                            parent: n.isParent(),
                            members: n.isParent()
                                ? n
                                      .descendants()
                                      .filter((d) => !d.isParent())
                                      .map((d) => d.id())
                                : [],
                            x: n.position("x"),
                            y: n.position("y"),
                            w: n.isParent() ? b.w : n.width(),
                            h: n.isParent() ? b.h : n.height(),
                            style: S(n, nodeKeys),
                        };
                    }),
                    edges: cy.edges().map((e) => {
                        const rs = e._private.rscratch;
                        const quad = ["bezier", "multibezier", "self", "compound"].includes(rs.edgeType)
                            ? rs.allpts
                            : null;
                        return {
                            id: e.id(),
                            source: e.source().id(),
                            target: e.target().id(),
                            points: (() => {
                                try {
                                    return [
                                        p(e.sourceEndpoint()),
                                        ...(e.segmentPoints() ?? []).map(p),
                                        p(e.targetEndpoint()),
                                    ];
                                } catch {
                                    return [p(e.source().position()), p(e.target().position())];
                                }
                            })(),
                            quad,
                            style: S(e, edgeKeys),
                        };
                    }),
                };
            },
            { elements: doc.elements, style: doc.style, layout: positioned ? "preset" : "grid" },
        );
        if (raw.dropped.length)
            errors.push(
                `stylesheet values Cytoscape.js throws on, dropped for the reference: ${raw.dropped.length}`,
                ...raw.dropped.slice(0, 20),
            );
        scene = sceneFromCyjs(raw);
        // edges between two compound parents: the scene has groups, not nodes, for those
        const ids = new Set(scene.nodes.map((n) => n.id));
        const between = scene.edges.filter((e) => !ids.has(e.source) || !ids.has(e.target));
        if (between.length)
            errors.push(
                `edges touching a compound parent left out of the scene: ${between.map((e) => e.id).join(", ")}`,
            );
        scene.edges = scene.edges.filter((e) => ids.has(e.source) && ids.has(e.target));
        // arrow-fill hollow, and hidden or display:none edges, which sceneFromCyjs does not read
        const byId = new Map(raw.edges.map((e) => [e.id, e.style]));
        for (const e of scene.edges) {
            const s = byId.get(e.id);
            for (const end of ["source", "target"]) {
                if (s[`${end}-arrow-fill`] === "hollow" && /triangle|vee/.test(e.arrow[end]))
                    e.arrow[end] = "open-triangle";
            }
            e.visible = s.visibility === "visible" && s.display !== "none" && +s.opacity > 0;
        }
        for (const e of scene.edges) delete e.visible; // the scene schema has no edge visibility; kept in raw.json
        if (!positioned) scene.gaps.push({ property: "position", reason: "no stored positions; Cytoscape.js grid" });
        route = "cyjs-computed";
        tool = "Cytoscape.js in Playwright Chromium";
    } else if (family === "sigma") {
        await page.addScriptTag({ content: await sigmaBundle() });
        version = `graphology ${versionOf("graphology")}, sigma ${versionOf("sigma")}`;
        // Gephi's JSON export (id/label/x/y/size/color at the top level) is the sigma v1 shape; sigma 4
        // reads it after a move of those keys into attributes, which is what a sigma user does.
        const gephi = doc.nodes.length > 0 && !("key" in doc.nodes[0]);
        const data = gephi
            ? {
                  options: { type: "directed", multi: true, allowSelfLoops: true },
                  nodes: doc.nodes.map(({ id, ...a }) => ({ key: String(id), attributes: withoutAttributes(a) })),
                  edges: doc.edges.map(({ id, source, target, ...a }) => ({
                      key: String(id),
                      source: String(source),
                      target: String(target),
                      attributes: withoutAttributes(a),
                  })),
              }
            : doc;
        const raw = await page.evaluate(async (data) => {
            const g = new globalThis.Graph({ multi: true, allowSelfLoops: true, type: data.options?.type ?? "mixed" });
            g.import(data);
            const KNOWN_N = new Set(["circle"]);
            const KNOWN_E = new Set(["line", "arrow", "rectangle"]);
            const unknown = { nodes: 0, edges: 0 };
            const s = new globalThis.Sigma(g, globalThis.document.getElementById("c"), {
                renderEdgeLabels: true,
                nodeReducer: (_n, a) =>
                    a.type && !KNOWN_N.has(a.type) ? (unknown.nodes++, { ...a, type: "circle" }) : a,
                edgeReducer: (_e, a) =>
                    a.type && !KNOWN_E.has(a.type) ? (unknown.edges++, { ...a, type: undefined }) : a,
            });
            s.refresh(); // draws at once, so where sigma drew each node is known below
            const cx = globalThis.document.createElement("canvas").getContext("2d");
            const norm = (a) => {
                if (typeof a.color !== "string") return a;
                cx.fillStyle = "#010203";
                cx.fillStyle = a.color;
                return { ...a, color: cx.fillStyle === "#010203" ? a.color : cx.fillStyle };
            };
            // Where sigma drew each node, in viewport pixels: its center, and its radius as drawn
            // at the camera's ratio (sigma's sizes are screen pixels, its positions fitted).
            const drawn = (id) => {
                const d = s.getNodeDisplayData(id);
                if (!d) return null;
                const p = s.framedGraphToViewport({ x: d.x, y: d.y });
                return { x: p.x, y: p.y, r: s.scaleSize(d.size) };
            };
            return {
                directed: g.mapEdges((k) => g.isDirected(k)),
                nodes: g.mapNodes((id, a) => ({ id, a: norm(a), drawn: drawn(id) })),
                edges: g.mapEdges((key, a, src, tgt) => ({ key, a: norm(a), src, tgt })),
                unknown,
                settings: { defaultEdgeType: s.getSetting("defaultEdgeType") },
            };
        }, data);
        let z = 0;
        const nodes = raw.nodes.map(({ id, a, drawn }) => {
            const fill = color(a.color, SIGMA_DEFAULTS.nodeColor);
            const size = 2 * drawn.r;
            return {
                id,
                x: drawn.x,
                y: drawn.y,
                w: size,
                h: size,
                shape: "ellipse",
                fill: fill.hex,
                fillOpacity: 1,
                border: { color: null, width: 0, style: "solid" },
                label: a.label
                    ? {
                          text: String(a.label),
                          fontSize: SIGMA_DEFAULTS.labelSize,
                          color: SIGMA_DEFAULTS.labelColor,
                          position: "right",
                          visible: !a.hidden,
                      }
                    : null,
                visible: !a.hidden,
                z: (a.zIndex ?? 0) * 1e6 + z++,
            };
        });
        const pos = new Map(nodes.map((n) => [n.id, [n.x, n.y]]));
        const edges = raw.edges.map(({ key, a, src, tgt }) => ({
            id: key,
            source: src,
            target: tgt,
            points: [pos.get(src), pos.get(tgt)],
            curved: false,
            color: color(a.color, SIGMA_DEFAULTS.edgeColor).hex,
            opacity: a.hidden ? 0 : 1,
            width: a.size ?? SIGMA_DEFAULTS.edgeSize,
            style: "solid",
            // sigma draws an arrow for type "arrow" only (an unknown type falls back to the default "line")
            arrow: {
                source: "none",
                target:
                    a.type === "arrow" || (a.type === undefined && raw.settings.defaultEdgeType === "arrow")
                        ? "filled-triangle"
                        : "none",
            },
            label: a.label ?? null,
        }));
        const gaps = [
            {
                property: "labelPosition",
                reason: "sigma places a label beside its node, at a distance that depends on its camera ratio",
            },
        ];
        const uncolored = raw.edges.filter(({ a }) => parseColor(a.color) === null).length;
        if (uncolored > 0)
            gaps.push({
                property: "edgeColor",
                reason: `${uncolored} of ${raw.edges.length} edges have no color; sigma draws its default`,
            });
        if (raw.unknown.nodes || raw.unknown.edges)
            errors.push(`types sigma does not draw, drawn as its defaults: ${JSON.stringify(raw.unknown)}`);
        scene = { nodes, edges, groups: [], gaps };
        route = "sigma";
        tool = "graphology import + sigma 4 in Playwright Chromium";
    } else if (family === "vis") {
        await page.addScriptTag({ path: req.resolve("vis-network/standalone/umd/vis-network.min.js") });
        version = `vis-network ${versionOf("vis-network")}`;
        const positioned = doc.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
        const raw = await page.evaluate(
            async ({ doc, positioned }) => {
                const options = { ...(doc.options ?? {}) };
                if (positioned) options.physics = false;
                const net = new globalThis.vis.Network(
                    globalThis.document.getElementById("c"),
                    { nodes: doc.nodes, edges: doc.edges },
                    options,
                );
                // without stored positions, vis-network's stabilization run lays the graph out first
                const stabilization =
                    !positioned && net.physics.options.enabled !== false && net.physics.options.stabilization.enabled;
                if (stabilization) await new Promise((r) => net.once("stabilizationIterationsDone", r));
                net.setOptions({ physics: false });
                net.fit();
                net.redraw(); // draws at once
                const cx = globalThis.document.createElement("canvas").getContext("2d");
                const norm = (c) => {
                    if (typeof c !== "string") return c;
                    cx.fillStyle = "#010203";
                    cx.fillStyle = c;
                    return cx.fillStyle === "#010203" && c.toLowerCase() !== "#010203" ? c : cx.fillStyle;
                };
                const pos = net.getPositions();
                const body = net.body;
                const nodes = Object.values(body.nodes)
                    .filter((n) => !n.isCluster && body.nodeIndices.includes(n.id))
                    .map((n) => {
                        const v = n.getFormattingValues();
                        const o = n.options;
                        return {
                            id: String(n.id),
                            x: pos[n.id].x,
                            y: pos[n.id].y,
                            w: n.shape.width,
                            h: n.shape.height,
                            shape: o.shape,
                            fill: norm(v.color),
                            border: norm(v.borderColor),
                            borderWidth: v.borderWidth,
                            dashes: v.borderDashes,
                            opacity: o.opacity ?? 1,
                            hidden: o.hidden,
                            label: o.label,
                            font: { size: o.font.size, color: norm(o.font.color) },
                            size: v.size,
                        };
                    });
                const edges = Object.values(body.edges)
                    .filter((e) => body.edgeIndices.includes(e.id))
                    .map((e) => {
                        const v = e.getFormattingValues();
                        const o = e.options;
                        const inherit = o.color.inherit;
                        let c = v.color;
                        if (inherit === "from" || inherit === "both") c = e.from.options.color.border;
                        if (inherit === "to") c = e.to.options.color.border;
                        const via = e.edgeType.via;
                        return {
                            id: String(e.id),
                            source: String(e.fromId),
                            target: String(e.toId),
                            color: norm(c),
                            inherit,
                            opacity: v.opacity,
                            width: v.width,
                            dashes: v.dashes,
                            hidden: o.hidden,
                            to: v.toArrow ? v.toArrowType : "none",
                            from: v.fromArrow ? v.fromArrowType : "none",
                            label: o.label ?? null,
                            smooth: o.smooth.enabled ? o.smooth.type : false,
                            points: [[e.from.x, e.from.y], ...(via ? [[via.x, via.y]] : []), [e.to.x, e.to.y]],
                            self: e.fromId === e.toId,
                        };
                    });
                return { nodes, edges };
            },
            { doc, positioned },
        );
        const VIS_SHAPE = {
            dot: "ellipse",
            circle: "ellipse",
            ellipse: "ellipse",
            database: "other",
            box: "roundrect",
            text: "other",
            diamond: "diamond",
            star: "star",
            triangle: "triangle",
            triangleDown: "triangle",
            hexagon: "hexagon",
            square: "rect",
            image: "image",
            circularImage: "image",
            icon: "other",
            customShape: "other",
        };
        const VIS_ARROW = {
            arrow: "filled-triangle",
            triangle: "filled-triangle",
            vee: "filled-triangle",
            inv_triangle: "filled-triangle",
            bar: "tee",
            circle: "circle",
            diamond: "diamond",
            none: "none",
        };
        let z = 0;
        const nodes = raw.nodes.map((n) => {
            const f = color(n.fill);
            const label = n.label === undefined || n.label === null || n.label === "" ? null : String(n.label);
            return {
                id: n.id,
                x: n.x,
                y: n.y,
                w: n.w,
                h: n.h,
                shape: VIS_SHAPE[n.shape] ?? "other",
                fill: n.shape === "text" ? null : f.hex,
                fillOpacity: f.alpha * n.opacity,
                // vis-network's text shape draws its label alone: no box, no border
                border:
                    n.shape !== "text" && n.borderWidth > 0
                        ? { color: color(n.border).hex, width: n.borderWidth, style: n.dashes ? "dashed" : "solid" }
                        : { color: null, width: 0, style: "solid" },
                label: label
                    ? {
                          text: label,
                          fontSize: n.font.size,
                          color: color(n.font.color).hex,
                          position: [
                              "dot",
                              "star",
                              "triangle",
                              "triangleDown",
                              "hexagon",
                              "square",
                              "diamond",
                              "image",
                              "circularImage",
                              "icon",
                          ].includes(n.shape)
                              ? "below"
                              : "inside",
                          visible: !n.hidden,
                      }
                    : null,
                visible: !n.hidden,
                z: z++,
            };
        });
        const edges = raw.edges.map((e) => {
            const c = color(e.color);
            const curved = e.smooth !== false && !e.self;
            return {
                id: e.id,
                source: e.source,
                target: e.target,
                points: e.points,
                curved: curved && e.points.length > 2 && bends(e.points),
                color: c.hex,
                opacity: e.hidden ? 0 : c.alpha * (e.opacity ?? 1),
                width: e.width,
                style: e.dashes ? "dashed" : "solid",
                arrow: { source: VIS_ARROW[e.from] ?? "other", target: VIS_ARROW[e.to] ?? "other" },
                label: e.label,
            };
        });
        const gaps = [];
        if (!doc.nodes.every((n) => Number.isFinite(n.x)))
            gaps.push(
                { property: "position", reason: "no stored positions; vis-network physics laid it out" },
                { property: "edgePath", reason: "vis physics layout" },
            );
        gaps.push({
            property: "edgePath",
            reason: "vis-network bends a smooth edge through one internal control point, read only approximately",
        });
        scene = { nodes, edges, groups: [], gaps };
        route = "vis-network";
        tool = "vis-network in Playwright Chromium";
    } else {
        throw new Error(`unknown family ${family}`);
    }
    for (const e of errors) console.error(e);
    finishScene(
        {
            provenance: {
                side: "reference",
                route,
                tool,
                version,
                command: `json-library.mjs ${family}${canvasNote}`,
                sourceSha256: sha256File(input),
                generatedAt: new Date().toISOString(),
            },
            canCarry: {},
            ...scene,
        },
        out,
    );
} finally {
    await browser.close();
}
