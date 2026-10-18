// Reference scene from Gephi (route gephi-noscale): runs GephiExport.java with the Gephi Toolkit on a
// GEXF file, with the file's own coordinates kept (noscale) and labels on, and reads what the
// preview drew from the SVG export (circles, edge paths, label text) plus the preview items.
//
//   JAVA_HOME=<jdk 17> GEPHI_JAR=<gephi-toolkit-0.11.3-all.jar> node gephi.mjs <sample.gexf> <out.json>
//
// Gephi's SVG is already y down. Its arcs (the preview draws curved edges by default) are flattened.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { bends, finishScene, parseColor, requireOutput, sha256File } from "./common.mjs";

const attrs = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
const unescape = (s) =>
    s
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");

/**
 * Points along an SVG path made of M, L and circular A commands, as Gephi writes them.
 * @param d - the path data
 * @param [steps] - points per arc
 * @returns the polyline
 */
export function svgPathPoints(d, steps = 8) {
    const t = d.match(/[MLA]|-?[\d.]+(?:e-?\d+)?/gi) ?? [];
    const pts = [];
    for (let i = 0; i < t.length;) {
        const cmd = t[i++];
        if (cmd === "M" || cmd === "L") {
            pts.push([+t[i], +t[i + 1]]);
            i += 2;
        } else if (cmd === "A") {
            const [r, , , large, sweep, x, y] = t.slice(i, i + 7).map(Number);
            i += 7;
            const [x0, y0] = pts[pts.length - 1];
            const mx = (x0 + x) / 2;
            const my = (y0 + y) / 2;
            const half = Math.hypot(x - x0, y - y0) / 2;
            const off = Math.sqrt(Math.max(0, r * r - half * half));
            const sign = large === sweep ? -1 : 1;
            const nx = -(y - y0) / (2 * half || 1);
            const ny = (x - x0) / (2 * half || 1);
            const cx = mx + sign * off * nx;
            const cy = my + sign * off * ny;
            const a0 = Math.atan2(y0 - cy, x0 - cx);
            let da = Math.atan2(y - cy, x - cx) - a0;
            if (sweep && da < 0) {
                da += 2 * Math.PI;
            } else if (!sweep && da > 0) {
                da -= 2 * Math.PI;
            }
            for (let s = 1; s <= steps; s++) {
                const a = a0 + (da * s) / steps;
                pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
            }
        } else {
            throw new Error(`unexpected SVG path command ${cmd} in ${d}`);
        }
    }
    return pts;
}

/**
 * The scene of Gephi's SVG export and preview items.
 * @param svg - the SVG export
 * @param items - the preview items dump
 * @returns nodes, edges and gaps
 */
export function sceneFromGephi(svg, items) {
    const labels = new Map();
    for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
        const a = attrs(m[1]);
        labels.set(a.class.slice(3), {
            text: unescape(m[2].trim()),
            fontSize: +a["font-size"],
            color: parseColor(a.fill)?.hex ?? "#000000",
        });
    }
    const nodes = [];
    for (const m of svg.matchAll(/<circle\b([^>]*)\/>/g)) {
        const a = attrs(m[1]);
        const id = a.class.slice(3);
        const fill = parseColor(a.fill);
        const label = labels.get(id);
        nodes.push({
            id,
            x: +a.cx,
            y: +a.cy,
            w: 2 * a.r,
            h: 2 * a.r,
            shape: "ellipse",
            fill: fill?.hex ?? null,
            fillOpacity: +(a["fill-opacity"] ?? 1),
            border: { color: parseColor(a.stroke)?.hex ?? null, width: +(a["stroke-width"] ?? 0), style: "solid" },
            label: label ? { ...label, position: "inside", visible: true } : null,
            visible: true,
            z: nodes.length,
        });
    }
    const directed = new Map(items.edge.map((e) => [`${e._src}\u0000${e._dst}`, e.directed === "true"]));
    const ordinal = new Map();
    const edges = [];
    for (const m of svg.matchAll(/<path\b([^>]*)\/>/g)) {
        const a = attrs(m[1]);
        const [s, t] = a.class.split(/\s+/).map((c) => c.slice(3));
        const key = `${s}\u0000${t}`;
        const k = ordinal.get(key) ?? 0;
        ordinal.set(key, k + 1);
        const pts = svgPathPoints(a.d);
        edges.push({
            id: `${s}->${t}${k ? `#${k}` : ""}`,
            source: s,
            target: t,
            points: pts,
            curved: bends(pts),
            color: parseColor(a.stroke)?.hex ?? "#000000",
            opacity: +(a["stroke-opacity"] ?? 1),
            width: +(a["stroke-width"] ?? 1),
            style: "solid",
            arrow: { source: "none", target: directed.get(key) ? "filled-triangle" : "none" },
            label: null,
        });
    }
    const gaps = [];
    const hidden = nodes.filter((n) => !n.label).length;
    if (hidden > 0) {
        gaps.push({
            property: "labelText",
            reason: `Gephi's label overlap avoidance hid ${hidden} labels, so the preview shows no text for them`,
        });
    }
    return { nodes, edges, groups: [], gaps };
}

const here = dirname(fileURLToPath(import.meta.url));
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [sample, out] = process.argv.slice(2);
    const java = join(process.env.JAVA_HOME ?? "", "bin", "java");
    const jar = process.env.GEPHI_JAR;
    const prefix = join(mkdtempSync(join(tmpdir(), "gephi-")), basename(sample));
    const args = [
        "-Djava.awt.headless=true",
        "-cp",
        jar,
        `${here}/GephiExport.java`,
        sample,
        prefix,
        "labels",
        "noscale",
    ];
    execFileSync(java, args, { stdio: ["ignore", "inherit", "ignore"] });
    const svg = readFileSync(requireOutput(`${prefix}.svg`), "utf8");
    const items = JSON.parse(readFileSync(requireOutput(`${prefix}.items.json`), "utf8"));
    finishScene(
        {
            provenance: {
                side: "reference",
                route: "gephi-noscale",
                tool: "Gephi Toolkit (gephi-toolkit-0.11.3-all.jar), GephiExport.java, on Temurin JDK 17",
                version: "0.11.3",
                command:
                    "java -Djava.awt.headless=true -cp gephi-toolkit-0.11.3-all.jar GephiExport.java <file> <out> labels noscale",
                sourceSha256: sha256File(sample),
                generatedAt: new Date().toISOString(),
            },
            canCarry: {},
            ...sceneFromGephi(svg, items),
        },
        out,
    );
}
