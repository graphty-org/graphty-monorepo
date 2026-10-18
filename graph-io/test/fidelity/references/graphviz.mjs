// Reference scene from Graphviz: what Graphviz drew, read from its -Tjson draw operations (xdot 1.7).
//
//   node graphviz.mjs <sample.gv> <out.json>
//     route graphviz-json: lays the file out with @hpcc-js/wasm-graphviz (pinned, so CI can rebuild it)
//     using the engine the file names (`layout=`), else dot.
//   node graphviz.mjs --json <layout.json> <route> <sample> <tool> <version> <command> <out.json>
//     a multi-hop route (graphviz-n2, gml2gv) whose -Tjson a native Graphviz already wrote.
//
// Graphviz units are points with y up; the scene flips y against the bounding box, so one point is one
// reference pixel. Gradient fills keep their first stop and say so in the scene's gaps.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

import {
    arrowClass,
    bends,
    finishScene,
    flattenCubic,
    lineStyle,
    parseColor,
    sha256File,
    shapeClass,
} from "./common.mjs";

/**
 * The facts of one draw-operation list: pen and fill colors, line width and styles, the shape drawn,
 * the path, the font and the text.
 * @param ops - an xdot operation list
 * @param gaps - collects gap reasons
 * @returns the facts
 */
export function opsFacts(ops, gaps) {
    const f = { styles: [], text: [] };
    for (const o of ops ?? []) {
        const color = o.grad && o.grad !== "none" ? o.stops?.[0]?.color : o.color;
        if (o.grad && o.grad !== "none") {
            gaps.add(`a ${o.grad} gradient is reduced to its first stop`);
        }
        switch (o.op) {
            case "c":
                f.stroke = color;
                break;
            case "C":
                f.fill = color;
                break;
            case "S":
                if (o.style.startsWith("setlinewidth(")) {
                    f.penwidth = parseFloat(o.style.slice(13, -1));
                } else {
                    f.styles.push(o.style);
                }
                break;
            case "e":
            case "E":
                f.geom = { kind: "ellipse", filled: o.op === "E" };
                break;
            case "p":
            case "P":
                f.geom = { kind: "polygon", filled: o.op === "P", points: o.points };
                break;
            case "b":
            case "B":
            case "L":
                f.path = o.points;
                f.pathOp = o.op;
                break;
            case "F":
                f.font = o.size;
                break;
            case "T":
                f.text.push({ text: o.text, pt: o.pt, color: f.stroke });
                break;
            default:
                break;
        }
    }
    return f;
}

/**
 * The scene of a Graphviz -Tjson document.
 * @param d - the parsed -Tjson
 * @returns the drawing, y down
 */
export function sceneFromGvJson(d) {
    const gaps = new Set();
    const [, , , top] = d.bb.split(",").map(Number);
    const flipY = (y) => top - y;
    const nsub = d._subgraph_cnt ?? 0;
    const name = (gvid) => d.objects[gvid].name;
    const nodes = d.objects.slice(nsub).map((o) => {
        const [x, y] = o.pos.split(",").map(Number);
        const shape = opsFacts(o._draw_, gaps);
        const lab = opsFacts(o._ldraw_, gaps);
        const fill = shape.geom?.filled ? parseColor(shape.fill) : null;
        const stroke = parseColor(shape.stroke);
        const w = parseFloat(o.width) * 72;
        const h = parseFloat(o.height) * 72;
        const text = lab.text.map((t) => t.text).join("\n");
        const inside = lab.text.every((t) => Math.abs(t.pt[0] - x) <= w / 2 && Math.abs(t.pt[1] - y) <= h / 2);
        const styles = String(o.style ?? "");
        return {
            id: o.name,
            x,
            y: flipY(y),
            w,
            h,
            shape: shapeClass(o.shape ?? "ellipse"),
            fill: fill?.hex ?? null,
            fillOpacity: fill?.alpha ?? 0,
            border: {
                color: stroke?.alpha ? stroke.hex : null,
                width: stroke?.alpha ? (shape.penwidth ?? 1) : 0,
                style: lineStyle(shape.styles[0]),
            },
            label: lab.text.length
                ? {
                      text,
                      fontSize: lab.font ?? 14,
                      color: parseColor(lab.text[0].color)?.hex ?? "#000000",
                      position: inside ? "inside" : "other",
                      visible: true,
                  }
                : null,
            visible: !styles.includes("invis"),
            z: o._gvid,
        };
    });
    const ordinal = new Map();
    const edges = (d.edges ?? []).map((e) => {
        const body = opsFacts(e._draw_, gaps);
        const color = parseColor(body.stroke) ?? { hex: "#000000", alpha: 1 };
        const raw = body.path ?? [];
        let pts = body.pathOp === "L" ? raw.map(([x, y]) => [x, y]) : flattenCubic(raw);
        // -Tjson's spline stops at the arrowhead's base; pos names the tips ("s,x,y" and "e,x,y").
        const pos = String(e.pos ?? "");
        const start = /(?:^|\s)s,([-\d.]+),([-\d.]+)/.exec(pos);
        const end = /(?:^|\s)e,([-\d.]+),([-\d.]+)/.exec(pos);
        if (start) {
            pts = [[+start[1], +start[2]], ...pts];
        }
        if (end) {
            pts = [...pts, [+end[1], +end[2]]];
        }
        const key = `${name(e.tail)}\u0000${name(e.head)}`;
        const k = ordinal.get(key) ?? 0;
        ordinal.set(key, k + 1);
        const lab = opsFacts(e._ldraw_, gaps);
        return {
            id: e.id ?? `${name(e.tail)}->${name(e.head)}${k ? `#${k}` : ""}`,
            source: name(e.tail),
            target: name(e.head),
            points: pts.map(([x, y]) => [x, flipY(y)]),
            curved: bends(pts),
            color: color.hex,
            opacity: String(e.style ?? "").includes("invis") ? 0 : color.alpha,
            width: body.penwidth ?? 1,
            style: lineStyle(body.styles[0]),
            arrow: {
                source: e._tdraw_ ? arrowClass(e.arrowtail ?? "normal") : "none",
                target: e._hdraw_ ? arrowClass(e.arrowhead ?? "normal") : "none",
            },
            label: lab.text.length ? lab.text.map((t) => t.text).join("\n") : null,
        };
    });
    const groups = d.objects
        .slice(0, nsub)
        .filter((o) => o.name.startsWith("cluster"))
        .map((o) => {
            const [x0, y0, x1, y1] = o.bb.split(",").map(Number);
            const f = opsFacts(o._draw_, gaps);
            const lab = opsFacts(o._ldraw_, gaps);
            return {
                id: o.name,
                members: (o.nodes ?? []).map(name),
                bbox: { x: x0, y: flipY(y1), w: x1 - x0, h: y1 - y0 },
                fill: f.geom?.filled ? (parseColor(f.fill)?.hex ?? null) : null,
                border: parseColor(f.stroke)?.hex ?? null,
                label: lab.text.length ? lab.text.map((t) => t.text).join("\n") : null,
            };
        });
    const bg = parseColor(opsFacts(d._draw_, gaps).fill);
    return { nodes, edges, groups, ...(bg ? { background: bg.hex } : {}), gaps };
}

/**
 * Writes the scene of a -Tjson document with its provenance.
 * @param d - the parsed -Tjson
 * @param provenance - the scene's provenance
 * @param out - the file to write
 * @param extraGaps - gaps the route adds
 * @returns the scene
 */
function write(d, provenance, out, extraGaps = []) {
    const { gaps, ...scene } = sceneFromGvJson(d);
    return finishScene(
        {
            provenance,
            canCarry: {},
            ...scene,
            gaps: [...[...gaps].map((reason) => ({ property: "fill", reason })), ...extraGaps],
        },
        out,
    );
}

/**
 * A DOT file pinning every node of a scene at its position (points, y up) with its size and shape,
 * for `neato -n2`: the graphviz-n2 route's input. It carries geometry and labels only.
 * @param scene - a reference scene
 * @returns the DOT text
 */
export function pinnedDot(scene) {
    const q = (v) => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    const shape = {
        ellipse: "ellipse",
        rect: "box",
        roundrect: "box",
        diamond: "diamond",
        triangle: "triangle",
        hexagon: "hexagon",
        octagon: "octagon",
    };
    const directed = scene.edges.some((e) => e.arrow.target !== "none");
    const lines = [`${directed ? "digraph" : "graph"} pinned {`, "  node [fixedsize=false];"];
    for (const n of scene.nodes) {
        const attrs = [
            `pos="${n.x},${-n.y}!"`,
            `width=${n.w / 72}`,
            `height=${n.h / 72}`,
            `shape=${shape[n.shape] ?? "ellipse"}`,
            `label=${q(n.label?.text ?? "")}`,
        ];
        lines.push(`  ${q(n.id)} [${attrs.join(", ")}];`);
    }
    for (const e of scene.edges) {
        lines.push(`  ${q(e.source)} ${directed ? "->" : "--"} ${q(e.target)} [id=${q(e.id)}];`);
    }
    lines.push("}");
    return `${lines.join("\n")}\n`;
}

const argv = process.argv[1] === fileURLToPath(import.meta.url) ? process.argv.slice(2) : [];
if (argv[0] === "--pin") {
    process.stdout.write(pinnedDot(JSON.parse(readFileSync(argv[1], "utf8"))));
} else if (argv[0] === "--json") {
    const [, json, route, sample, tool, version, command, out] = argv;
    write(
        JSON.parse(readFileSync(json, "utf8")),
        {
            side: "reference",
            route,
            tool,
            version,
            command,
            sourceSha256: sha256File(sample),
            generatedAt: new Date().toISOString(),
        },
        out,
    );
} else if (argv.length === 2) {
    const [sample, out] = argv;
    // The pinned wasm build lives in the tools directory (regenerate.sh), or any directory that installed it.
    const dir = process.env.GRAPHVIZ_WASM_DIR ?? process.cwd();
    const require = createRequire(`${dir}/package.json`);
    const { Graphviz } = await import(pathToFileURL(require.resolve("@hpcc-js/wasm-graphviz")).href);
    const pkg = JSON.parse(readFileSync(`${dir}/node_modules/@hpcc-js/wasm-graphviz/package.json`, "utf8"));
    const dot = readFileSync(sample, "utf8");
    const engine = /\blayout\s*=\s*"?(\w+)/.exec(dot)?.[1] ?? "dot";
    const gv = await Graphviz.load();
    write(
        JSON.parse(gv.layout(dot, "json", engine)),
        {
            side: "reference",
            route: "graphviz-json",
            tool: "@hpcc-js/wasm-graphviz",
            version: `${pkg.version} (Graphviz ${gv.version()})`,
            command: `Graphviz.layout(<file>, "json", "${engine}")`,
            sourceSha256: sha256File(sample),
            generatedAt: new Date().toISOString(),
        },
        out,
    );
}
