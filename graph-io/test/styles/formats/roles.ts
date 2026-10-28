/**
 * Graphs made by code whose style columns carry only a style role (`color`, `size`, `shape`, `thickness`,
 * `hidden`), read by graph-io's generic reader: an importer with no `styles()` of its own. Seeded, so every run
 * checks the same graphs.
 */

import { GraphBuilder } from "@graphty/graph-format";

import { ImportReportBuilder } from "../../../src/common/report.js";
import type { GraphImporter } from "../../../src/types.js";
import { registerStyleFormat, type StyleInput } from "../harness.js";

/**
 * A seeded generator of numbers in [0, 1).
 * @param seed - the seed
 * @returns the generator
 */
export function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** An importer with no `styles()`: the generic reader reads its role columns, spelled as CSS. */
const ROLES_IMPORTER: GraphImporter = {
    format: "roles",
    extensions: [],
    mimeTypes: [],
    import: () => Promise.reject(new Error("the roles inputs are built in memory")),
};

/** One spelling per group of the same four colors, mixed per element. */
const SPELLINGS: readonly (readonly string[])[] = [
    ["#ff0000", "red", "rgb(255, 0, 0)", "#F00"],
    ["#0000ff", "blue", "rgb(0,0,255)", "#00F"],
    ["#008000", "green", "rgb(0, 128, 0)", "#008000FF"],
    ["#ffa500", "orange", "rgb(255,165,0)", "#FFA500"],
];
const SHAPES = ["ellipse", "diamond", "rectangle", "triangle"];

/** What a synthetic graph's style columns hold. */
type Kind = "by-group" | "channels" | "random" | "sparse";

/**
 * A synthetic graph with role columns.
 * @param kind - what its styles look like
 * @param n - its node count
 * @param seed - the seed
 * @returns the input
 */
function rolesInput(kind: Kind, n: number, seed: number): StyleInput {
    return {
        name: `roles/${kind}-${String(n)}`,
        load: () => {
            const next = seeded(seed);
            const b = new GraphBuilder({ directed: true });
            const group = b.declareNodeColumn({ name: "group", dtype: "string", nullable: true });
            const score = b.declareNodeColumn({ name: "score", dtype: "f64", nullable: true });
            const color =
                kind === "channels"
                    ? b.declareNodeColumn({ name: "rgba", dtype: "f32", components: 4, role: "color", nullable: true })
                    : b.declareNodeColumn({ name: "paint", dtype: "string", role: "color", nullable: true });
            const size = b.declareNodeColumn({ name: "radius", dtype: "f32", role: "size", nullable: true });
            const shape = b.declareNodeColumn({ name: "form", dtype: "dict", role: "shape", nullable: true });
            const hidden = b.declareNodeColumn({ name: "gone", dtype: "bool", role: "hidden", nullable: true });
            for (let i = 0; i < n; i++) {
                b.addNode(`n${String(i)}`);
                const g = Math.floor(next() * 4);
                const s = Math.round(next() * 100);
                b.setNodeValue(group, i, `g${String(g)}`);
                b.setNodeValue(score, i, s);
                const edited = next() < 0.05;
                if (kind === "channels") {
                    b.setNodeValue(color, i, [next(), next(), next(), 1]);
                } else if (kind === "random") {
                    b.setNodeValue(
                        color,
                        i,
                        `#${Math.floor(next() * 0xffffff)
                            .toString(16)
                            .padStart(6, "0")}`,
                    );
                } else if (kind === "sparse" && next() < 0.5) {
                    // left to the program's default
                } else {
                    const spelled = SPELLINGS[edited ? (g + 1) % 4 : g];
                    b.setNodeValue(color, i, spelled[Math.floor(next() * spelled.length)]);
                }
                b.setNodeValue(size, i, kind === "random" ? Math.round(next() * 40) : 4 + s / 10);
                b.setNodeValue(shape, i, kind === "random" ? SHAPES[Math.floor(next() * 4)] : SHAPES[g]);
                if (kind !== "sparse" || next() < 0.5) {
                    b.setNodeValue(hidden, i, next() < 0.1);
                }
            }
            const weight = b.declareEdgeColumn({ name: "w", dtype: "f64", nullable: true });
            const edgeColor = b.declareEdgeColumn({ name: "stroke", dtype: "string", role: "color", nullable: true });
            const thickness = b.declareEdgeColumn({ name: "t", dtype: "f32", role: "thickness", nullable: true });
            for (let k = 0; n > 1 && k < n * 2; k++) {
                const e = b.addEdge(`n${String(Math.floor(next() * n))}`, `n${String(Math.floor(next() * n))}`);
                const w = Math.round(next() * 10);
                b.setEdgeValue(weight, e, w);
                if (kind !== "sparse" || next() < 0.5) {
                    b.setEdgeValue(edgeColor, e, next() < 0.9 ? "#999999" : "black");
                }
                b.setEdgeValue(thickness, e, kind === "random" ? next() * 5 : 1 + w / 2);
            }
            const report = new ImportReportBuilder("roles", Infinity).finish();
            return Promise.resolve({ snapshot: b.freeze(), importer: ROLES_IMPORTER, report });
        },
    };
}

/**
 * Every synthetic graph: each kind of styles at 0, 1, 9, 60 and 300 nodes.
 * @returns the inputs
 */
export function rolesInputs(): StyleInput[] {
    const out: StyleInput[] = [];
    let seed = 20261011;
    for (const kind of ["by-group", "channels", "random", "sparse"] as const) {
        for (const n of [0, 1, 9, 60, 300]) {
            out.push(rolesInput(kind, n, seed++));
        }
    }
    return out;
}

registerStyleFormat({ name: "roles", corpus: false, inputs: rolesInputs });
