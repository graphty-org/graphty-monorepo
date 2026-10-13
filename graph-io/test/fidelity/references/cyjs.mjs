// Reference scene from Cytoscape.js (route cyjs-computed, or cyjs-hop for a document Cytoscape desktop
// exported): draws a Cytoscape.js document with Cytoscape.js itself in headless Chromium, so the
// stylesheet's cascade, mappers and label measurement are Cytoscape.js's own, and reads what it drew
// from each element's computed style() and rendered geometry. Units are Cytoscape.js model
// coordinates (y down). A compound parent becomes a group.
//
//   node cyjs.mjs <doc.json[.gz]> <sample as stored> <route> <out.json>
//   (run it under design/ui/studio/tool/with-browser.sh)
//
// The document is { elements, style } (a saved cy.json() or desktop's export). With no stored
// positions it is laid out on a grid and the scene says position is not judged.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import process from "node:process";

import { bends, finishScene, parseColor, sha256File } from "./common.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const POSITION = {
    "center,center": "inside",
    "bottom,center": "below",
    "top,center": "above",
    "center,right": "right",
    "center,left": "left",
};

/**
 * Flattens Cytoscape.js's piecewise quadratic path (flat [x0, y0, cx1, cy1, x1, y1, ...]) to a polyline.
 * @param a - rscratch.allpts
 * @param [steps] - points per piece
 * @returns the polyline
 */
export function flattenQuadratic(a, steps = 8) {
    const out = [[a[0], a[1]]];
    for (let i = 0; i + 5 < a.length; i += 4) {
        for (let k = 1; k <= steps; k++) {
            const t = k / steps;
            const u = 1 - t;
            out.push([
                u * u * a[i] + 2 * u * t * a[i + 2] + t * t * a[i + 4],
                u * u * a[i + 1] + 2 * u * t * a[i + 3] + t * t * a[i + 5],
            ]);
        }
    }
    return out;
}

/**
 * The scene of what Cytoscape.js drew, from the raw per-element facts the page collects.
 * @param raw - { nodes, edges } as collected in the page
 * @returns nodes, edges, groups and gaps
 */
export function sceneFromCyjs(raw) {
    const color = (v) => parseColor(v) ?? { hex: "#000000", alpha: 1 };
    const nodes = raw.nodes
        .filter((n) => !n.parent)
        .map((n, i) => {
            const s = n.style;
            const fill = color(s["background-color"]);
            const text = String(s.label ?? "");
            return {
                id: n.id,
                x: n.x,
                y: n.y,
                w: n.w,
                h: n.h,
                shape: s.shape,
                fill: fill.hex,
                fillOpacity: +s["background-opacity"] * +s.opacity * fill.alpha,
                border: {
                    color: +s["border-width"].replace("px", "") > 0 ? color(s["border-color"]).hex : null,
                    width: parseFloat(s["border-width"]),
                    style: s["border-style"],
                },
                label: text
                    ? {
                          text,
                          fontSize: parseFloat(s["font-size"]),
                          color: color(s.color).hex,
                          position: POSITION[`${s["text-valign"]},${s["text-halign"]}`] ?? "other",
                          visible: s.visibility === "visible" && +s["text-opacity"] > 0,
                      }
                    : null,
                visible: s.visibility === "visible" && s.display !== "none" && +s.opacity > 0,
                z: +s["z-index"] * 1e6 + i,
            };
        });
    const edges = raw.edges.map((e) => {
        const s = e.style;
        const c = color(s["line-color"]);
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            points: e.quad ? flattenQuadratic(e.quad) : e.points,
            curved: Boolean(e.quad) && bends(flattenQuadratic(e.quad)),
            color: c.hex,
            opacity: +s.opacity * +s["line-opacity"] * c.alpha,
            width: parseFloat(s.width),
            style: s["line-style"],
            arrow: { source: s["source-arrow-shape"], target: s["target-arrow-shape"] },
            label: s.label ? String(s.label) : null,
        };
    });
    const groups = raw.nodes
        .filter((n) => n.parent)
        .map((n) => ({
            id: n.id,
            members: n.members,
            bbox: { x: n.x - n.w / 2, y: n.y - n.h / 2, w: n.w, h: n.h },
            fill: color(n.style["background-color"]).hex,
            border: +parseFloat(n.style["border-width"]) > 0 ? color(n.style["border-color"]).hex : null,
            label: n.style.label ? String(n.style.label) : null,
        }));
    return { nodes, edges, groups, gaps: [] };
}

/**
 * Renames a scene's element ids through a map, as cyrest.mjs writes one beside desktop's export
 * (whose style selects elements by SUID, so the document keeps SUIDs as ids).
 * @param scene - the scene
 * @param map - { nodes: { [id]: sceneId }, edges: { [id]: sceneId } }, or undefined to keep the ids
 * @returns the scene with the mapped ids
 */
export function renameIds(scene, map) {
    if (!map) {
        return scene;
    }
    const n = (id) => map.nodes[id] ?? id;
    return {
        ...scene,
        nodes: scene.nodes.map((x) => ({ ...x, id: n(x.id) })),
        edges: scene.edges.map((e) => ({
            ...e,
            id: map.edges[e.id] ?? e.id,
            source: n(e.source),
            target: n(e.target),
        })),
        groups: scene.groups.map((g) => ({ ...g, id: n(g.id), members: g.members.map(n) })),
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [docPath, sample, route, out] = process.argv.slice(2);
    const bytes = readFileSync(docPath);
    const doc = JSON.parse((docPath.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8"));
    const els = Array.isArray(doc.elements)
        ? doc.elements
        : [...(doc.elements.nodes ?? []), ...(doc.elements.edges ?? [])];
    const positioned = els.filter((e) => !e.data?.source).every((e) => e.position && Number.isFinite(e.position.x));
    const cyjsPath = createRequire(`${here}/../../../package.json`).resolve("cytoscape/dist/cytoscape.min.js");
    const version = JSON.parse(readFileSync(`${dirname(cyjsPath)}/../package.json`, "utf8")).version;
    const { chromium } = createRequire(`${here}/../../../../graphty-element/package.json`)("playwright");
    const browser = await chromium.launch();
    try {
        const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
        await page.setContent(
            `<html><body style="margin:0"><div id=cy style="width:1200px;height:900px"></div></body></html>`,
        );
        await page.addScriptTag({ content: readFileSync(cyjsPath, "utf8") });
        const raw = await page.evaluate(
            async ({ elements, style, layout }) => {
                const cy = globalThis.cytoscape({
                    container: globalThis.document.getElementById("cy"),
                    elements,
                    style,
                    layout: { name: layout },
                });
                cy.forceRender();
                // endpoints and label boxes are settled by the renderer's first frames
                await new Promise((frame) =>
                    globalThis.requestAnimationFrame(() => globalThis.requestAnimationFrame(frame)),
                );
                const S = (e, keys) => Object.fromEntries(keys.map((k) => [k, e.style(k)]));
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
                    "label",
                ];
                const p = (q) => [q.x, q.y];
                return {
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
                            // the shape's outline, the border centered on it, as the other tools report a node's size
                            w: n.isParent() ? b.w : n.width(),
                            h: n.isParent() ? b.h : n.height(),
                            style: S(n, nodeKeys),
                        };
                    }),
                    edges: cy.edges().map((e) => {
                        const rs = e._private.rscratch;
                        // a curved edge's drawn path: rscratch.allpts holds its quadratic pieces (p0, c1, p1, c2, p2, ...)
                        const quad = ["bezier", "multibezier", "self", "compound"].includes(rs.edgeType)
                            ? rs.allpts
                            : null;
                        return {
                            id: e.id(),
                            source: e.source().id(),
                            target: e.target().id(),
                            points: [p(e.sourceEndpoint()), ...(e.segmentPoints() ?? []).map(p), p(e.targetEndpoint())],
                            quad,
                            style: S(e, edgeKeys),
                        };
                    }),
                };
            },
            { elements: doc.elements, style: doc.style, layout: positioned ? "preset" : "grid" },
        );
        const scene = renameIds(sceneFromCyjs(raw), doc.sceneIds);
        if (!positioned) {
            scene.gaps.push({
                property: "position",
                reason: "the document stores no positions; Cytoscape.js laid it out on a grid",
            });
        }
        finishScene(
            {
                provenance: {
                    side: "reference",
                    route,
                    tool: "Cytoscape.js in Playwright Chromium",
                    version,
                    command: `cytoscape({ elements, style, layout: { name: "${positioned ? "preset" : "grid"}" } }); style(), position(), width(), endpoints`,
                    sourceSha256: sha256File(sample),
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
}
