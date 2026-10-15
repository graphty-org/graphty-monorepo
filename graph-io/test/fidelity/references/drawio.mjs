// Multi-hop reference scene (route drawio): a yEd GraphML file decoded by draw.io's own GraphML codec
// (mxGraphMlCodec, Apache-2.0) in headless Chromium, then read back from draw.io's cells. Each cell
// keeps the GraphML id as `graphMlID` in its style, which is how the scene's ids match the file's.
//
//   DRAWIO_WEBAPP=<draw.io 32.4.1 src/main/webapp> node drawio.mjs <sample.graphml> <out.json>
//   (run it under design/ui/studio/tool/with-browser.sh)
//
// The codec is patched in the page so parents never grow to fit their children (setExtendParents
// false, maintainEdgeParent false): otherwise draw.io moves group boxes and the geometry is not the file's.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import console from "node:console";

import { bends, clipPath, finishScene, labelPosition, parseColor, sha256File } from "./common.mjs";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The scene of draw.io cells, as the page returns them.
 * @param cells - { id, parent, vertex, edge, source, target, value, style, geometry, points }
 * @returns nodes, edges, groups and gaps
 */
export function sceneFromDrawioCells(cells) {
    const byId = new Map(cells.map((c) => [c.id, c]));
    const origin = (id) => {
        let x = 0;
        let y = 0;
        for (let c = byId.get(id); c?.vertex; c = byId.get(c.parent)) {
            x += c.geometry.x ?? 0;
            y += c.geometry.y ?? 0;
        }
        return [x, y];
    };
    const gid = (c) => c.style.graphMlID;
    const children = (id) => cells.filter((c) => c.parent === id);
    const nodes = [];
    const groups = [];
    const geo = new Map();
    for (const c of cells) {
        if (!c.vertex || !gid(c)) {
            continue;
        }
        const [x, y] = origin(c.id);
        const { width: w = 0, height: h = 0 } = c.geometry;
        const label = children(c.id).find((k) => !gid(k) && k.vertex && (k.style.text !== undefined || k.value));
        const ls = label?.style ?? {};
        const text = (label?.value ?? c.value ?? "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .trim();
        const fill = parseColor(c.style.fillColor);
        const stroke = parseColor(c.style.strokeColor);
        const base =
            c.style.shape ??
            (c.style.ellipse !== undefined ? "ellipse" : c.style.rhombus !== undefined ? "diamond" : "rect");
        // draw.io spells a rounded rectangle as a rectangle with rounded=1
        const shape = c.style.rounded === "1" && ["rect", "rectangle", "label"].includes(base) ? "roundrect" : base;
        const isGroup =
            c.style.swimlane !== undefined ||
            c.style.shape === "swimlane" ||
            cells.some((k) => k.parent === c.id && gid(k) && k.vertex);
        geo.set(gid(c), [x + w / 2, y + h / 2, w, h, shape === "ellipse" ? "ellipse" : "rect"]);
        if (isGroup) {
            groups.push({
                id: gid(c),
                members: [],
                bbox: { x, y, w, h },
                fill: fill?.hex ?? null,
                border: stroke?.hex ?? null,
                label: text || null,
                _cell: c.id,
            });
            continue;
        }
        nodes.push({
            id: gid(c),
            x: x + w / 2,
            y: y + h / 2,
            w,
            h,
            shape,
            fill: fill?.hex ?? null,
            fillOpacity: fill ? fill.alpha * (+(c.style.fillOpacity ?? 100) / 100) : 0,
            border: {
                color: stroke?.hex ?? null,
                width: stroke ? +(c.style.strokeWidth ?? 1) : 0,
                style: c.style.dashed === "1" ? "dashed" : "solid",
            },
            label: text
                ? {
                      text,
                      fontSize: +(ls.fontSize ?? c.style.fontSize ?? 12),
                      color: parseColor(ls.fontColor ?? c.style.fontColor)?.hex ?? "#000000",
                      position: label?.geometry.width ? labelPosition(w, h, label.geometry) : "inside",
                      visible: true,
                  }
                : null,
            visible: true,
            z: cells.indexOf(c),
            _cell: c.id,
        });
    }
    // group membership: every gid-carrying vertex below a group cell
    for (const g of groups) {
        const stack = [g._cell];
        while (stack.length) {
            for (const k of children(stack.pop())) {
                if (k.vertex && gid(k)) {
                    if (!groups.some((x) => x._cell === k.id)) {
                        g.members.push(gid(k));
                    }
                    stack.push(k.id);
                }
            }
        }
    }
    const byCell = new Map([...nodes, ...groups].map((n) => [n._cell, n.id]));
    const edges = [];
    for (const c of cells) {
        if (!c.edge || !gid(c)) {
            continue;
        }
        const s = byCell.get(c.source);
        const t = byCell.get(c.target);
        if (!s || !t) {
            continue;
        }
        // waypoints are absolute when the edge's parent is the root layer, else relative to the parent
        const [ox, oy] = byId.get(c.parent)?.vertex ? origin(c.parent) : [0, 0];
        // an exit / entry constraint is a port on the outline, as a fraction of the node's box
        const port = (n, fx, fy) =>
            fx === undefined ? n.slice(0, 2) : [n[0] - n[2] / 2 + +fx * n[2], n[1] - n[3] / 2 + +fy * n[3]];
        const ends = [port(geo.get(s), c.style.exitX, c.style.exitY), port(geo.get(t), c.style.entryX, c.style.entryY)];
        const pts = clipPath([ends[0], ...c.points.map(([x, y]) => [x + ox, y + oy]), ends[1]], geo.get(s), geo.get(t));
        const color = parseColor(c.style.strokeColor) ?? { hex: "#000000", alpha: 1 };
        const label = children(c.id).find((k) => k.value);
        edges.push({
            id: gid(c),
            source: s,
            target: t,
            points: pts,
            curved: c.style.curved === "1" || bends(pts),
            color: color.hex,
            opacity: color.alpha * (+(c.style.opacity ?? 100) / 100),
            width: +(c.style.strokeWidth ?? 1),
            style: c.style.dashed === "1" ? (c.style.dashPattern === "1 1" ? "dotted" : "dashed") : "solid",
            arrow: { source: c.style.startArrow ?? "none", target: c.style.endArrow ?? "classic" },
            label: label
                ? String(label.value)
                      .replace(/<br\s*\/?>/gi, "\n")
                      .replace(/<[^>]+>/g, "")
                      .trim() || null
                : null,
        });
    }
    const strip = (o) => {
        const rest = { ...o };
        delete rest._cell;
        return rest;
    };
    return { nodes: nodes.map(strip), edges, groups: groups.map(strip), gaps: [] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [sample, out] = process.argv.slice(2);
    const web = process.env.DRAWIO_WEBAPP;
    const require = createRequire(`${here}/../../../../graphty-element/package.json`);
    const { chromium } = require("playwright");
    const browser = await chromium.launch();
    try {
        const page = await (await browser.newContext()).newPage();
        page.on("pageerror", (e) => console.error("pageerror", e.message));
        await page.goto(`file://${web}/export3.html`);
        await page.waitForFunction(() => typeof globalThis.mxGraphMlCodec === "function");
        const cells = await page.evaluate(
            (xml) =>
                new Promise((resolve, reject) => {
                    const { mxGraphMlCodec, Graph } = globalThis;
                    mxGraphMlCodec.prototype.createMxGraph = function createMxGraph() {
                        const g = new Graph();
                        g.setExtendParents(false);
                        g.setExtendParentsOnAdd(false);
                        g.setConstrainChildren(false);
                        g.setHtmlLabels(true);
                        g.getModel().maintainEdgeParent = false;
                        return g;
                    };
                    const read = (text) => {
                        const doc = new globalThis.DOMParser().parseFromString(text, "text/xml");
                        const out = [];
                        for (const d of doc.querySelectorAll("diagram")) {
                            const model =
                                d.querySelector("mxGraphModel") ??
                                new globalThis.DOMParser().parseFromString(Graph.decompress(d.textContent), "text/xml");
                            for (const c of model.querySelectorAll("mxCell")) {
                                const g = c.querySelector(":scope > mxGeometry");
                                const style = Object.fromEntries(
                                    (c.getAttribute("style") ?? "")
                                        .split(";")
                                        .filter(Boolean)
                                        .map((kv) => (kv.includes("=") ? kv.split(/=(.*)/s).slice(0, 2) : [kv, ""])),
                                );
                                out.push({
                                    id: c.getAttribute("id"),
                                    parent: c.getAttribute("parent"),
                                    vertex: c.getAttribute("vertex") === "1",
                                    edge: c.getAttribute("edge") === "1",
                                    source: c.getAttribute("source"),
                                    target: c.getAttribute("target"),
                                    value: c.getAttribute("value"),
                                    style,
                                    geometry: Object.fromEntries(
                                        ["x", "y", "width", "height"]
                                            .filter((k) => g?.hasAttribute(k))
                                            .map((k) => [k, +g.getAttribute(k)]),
                                    ),
                                    points: g
                                        ? [...g.querySelectorAll(":scope > Array > mxPoint")].map((p) => [
                                              +(p.getAttribute("x") ?? 0),
                                              +(p.getAttribute("y") ?? 0),
                                          ])
                                        : [],
                                });
                            }
                        }
                        return out;
                    };
                    try {
                        new mxGraphMlCodec().decode(xml, (text) => resolve(read(text)), reject);
                    } catch (e) {
                        reject(String(e));
                    }
                }),
            readFileSync(sample, "utf8"),
        );
        if (cells.length === 0) {
            throw new Error("draw.io decoded no cells");
        }
        finishScene(
            {
                provenance: {
                    side: "reference",
                    route: "drawio",
                    tool: "draw.io mxGraphMlCodec (patched: parents never extend) in Playwright Chromium",
                    version: readFileSync(`${web}/../../../VERSION`, "utf8").trim(),
                    command: "new mxGraphMlCodec().decode(<file>) in export3.html, cells read with DOMParser",
                    sourceSha256: sha256File(sample),
                    generatedAt: new Date().toISOString(),
                },
                canCarry: {},
                ...sceneFromDrawioCells(cells),
            },
            out,
        );
    } finally {
        await browser.close();
    }
}
