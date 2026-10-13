// Multi-hop reference scene (route sigma): a GEXF file as graphology-gexf reads it for sigma.js, with
// sigma's own display defaults for what the file leaves out. Used for edge colors only: sigma draws
// circles with no border, and graphology-gexf keeps viz:thickness as a plain `size`.
//
//   SIGMA_DIR=<dir with graphology, graphology-gexf and sigma installed> node sigma.mjs <sample.gexf> <out.json>
//
// sigma's y axis points up, so y is negated.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

import { finishScene, parseColor, sha256File } from "./common.mjs";

/** sigma 4's DEFAULT_NODE_DISPLAY_DATA and DEFAULT_EDGE_DISPLAY_DATA (types-*.esm.js). */
export const SIGMA_DEFAULTS = {
    nodeSize: 10,
    nodeColor: "#666666",
    labelColor: "#000000",
    labelSize: 12,
    edgeSize: 1,
    edgeColor: "#cccccc",
};

/**
 * The scene of a graphology graph read from GEXF, drawn with sigma's defaults.
 * @param g - the graphology graph
 * @returns nodes, edges, groups and gaps
 */
export function sceneFromGraphology(g) {
    let z = 0;
    const nodes = g.mapNodes((id, a) => {
        const fill = parseColor(a.color) ?? { hex: SIGMA_DEFAULTS.nodeColor, alpha: 1 };
        const size = 2 * (a.size ?? SIGMA_DEFAULTS.nodeSize);
        return {
            id,
            x: a.x ?? 0,
            y: -(a.y ?? 0),
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
                      visible: true,
                  }
                : null,
            visible: true,
            z: z++,
        };
    });
    const pos = new Map(nodes.map((n) => [n.id, [n.x, n.y]]));
    const ordinal = new Map();
    const edges = g.mapEdges((key, a, s, t) => {
        const k = ordinal.get(`${s}\u0000${t}`) ?? 0;
        ordinal.set(`${s}\u0000${t}`, k + 1);
        return {
            id: `${s}->${t}${k ? `#${k}` : ""}`,
            source: s,
            target: t,
            points: [pos.get(s), pos.get(t)],
            curved: false,
            color: parseColor(a.color)?.hex ?? SIGMA_DEFAULTS.edgeColor,
            opacity: 1,
            width: a.size ?? SIGMA_DEFAULTS.edgeSize,
            style: "solid",
            arrow: { source: "none", target: g.isDirected(key) ? "filled-triangle" : "none" },
            label: a.label ?? null,
        };
    });
    const gaps = ["size", "labelPosition", "fontSize"].map((property) => ({
        property,
        reason: "sigma's drawn size and label placement depend on its camera ratio; this route is read for edge colors only",
    }));
    return { nodes, edges, groups: [], gaps };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [sample, out] = process.argv.slice(2);
    const dir = process.env.SIGMA_DIR ?? process.cwd();
    const require = createRequire(`${dir}/package.json`);
    const Graph = (await import(pathToFileURL(require.resolve("graphology")).href)).default;
    const { parse } = await import(pathToFileURL(`${dir}/node_modules/graphology-gexf/node/index.js`).href);
    const version = (name) => JSON.parse(readFileSync(`${dir}/node_modules/${name}/package.json`, "utf8")).version;
    const g = parse(Graph, readFileSync(sample, "utf8"), { allowUndeclaredAttributes: true });
    finishScene(
        {
            provenance: {
                side: "reference",
                route: "sigma",
                tool: "graphology-gexf with sigma display defaults",
                version: `graphology-gexf ${version("graphology-gexf")}, graphology ${version("graphology")}, sigma ${version("sigma")}`,
                command: "parse(Graph, <file>, { allowUndeclaredAttributes: true })",
                sourceSha256: sha256File(sample),
                generatedAt: new Date().toISOString(),
            },
            canCarry: {},
            ...sceneFromGraphology(g),
        },
        out,
    );
}
