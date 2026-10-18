/**
 * The oracle library and one comparison against it, with nothing tied to a test runner: every program's own
 * drawing of a sample (`graph-io/test/fidelity/oracles/<sample>.svg`, its rasterized `.png` and its provenance in
 * `.oracle.json`), and the comparison of what a mounted `<graphty-element>` drew with that SVG. The browser tests
 * (`run-oracle.ts`) and the fidelity Storybook (`graph-io/fidelity-stories`) both run it, so the Storybook's table
 * is the tests' own numbers.
 *
 * Browser only (it reads graphty's Babylon scene).
 */
import type { Graphty } from "../../../index.js";
import { readDrawn } from "../drawn-scene";
import { extractScene } from "../extract-scene";
import { associate, type Association, diskColor, type RasterDrawing, rasterScene } from "./associate";
import { compareOracle, ORACLE_PROPERTIES, type OracleReport } from "./compare-oracle";
import { drawnPrimitives } from "./drawn-primitives";
import type { PScene } from "./primitives";
import { pngPixels } from "./raster";
import { readSvgPrimitives } from "./svg-primitives";

/** The oracle canvas every program draws at, where it allows one. */
export const ORACLE_CANVAS = { width: 1200, height: 900 };

const svgs = import.meta.glob<string>("../../../../graph-io/test/fidelity/oracles/*.svg", {
    query: "?raw",
    import: "default",
});
const pngs = import.meta.glob<string>("../../../../graph-io/test/fidelity/oracles/*.png", {
    query: "?url",
    import: "default",
});
const metas = import.meta.glob<Record<string, unknown>>("../../../../graph-io/test/fidelity/oracles/*.oracle.json", {
    import: "default",
    eager: true,
});
const idOf = (path: string): string => path.replace(/^.*\//, "").replace(/\.(svg|png|oracle\.json)$/, "");
const pathOf = (table: Record<string, unknown>, id: string): string | undefined =>
    Object.keys(table).find((p) => idOf(p) === id);

/** Every sample with an oracle SVG, sorted. */
export const ORACLE_IDS: readonly string[] = Object.keys(svgs).map(idOf).sort();

/**
 * Oracle SVGs with no metadata beside them.
 * @returns their ids
 */
export function oraclesWithoutMetadata(): string[] {
    return ORACLE_IDS.filter((id) => pathOf(metas, id) === undefined);
}

/**
 * An oracle's provenance: which program drew it, which version, whether it stands in for another program.
 * @param id - the sample
 * @returns the metadata, empty when there is none
 */
export function oracleMeta(id: string): Record<string, unknown> {
    return metas[pathOf(metas, id) ?? ""] ?? {};
}

/**
 * Where the rasterized oracle is served.
 * @param id - the sample
 * @returns its URL, or undefined when the library has no PNG of it
 */
export async function oraclePngUrl(id: string): Promise<string | undefined> {
    const path = pathOf(pngs, id);
    return path === undefined ? undefined : pngs[path]();
}

/**
 * The graph the program drew, by name, when the file holds several: Cytoscape desktop draws a
 * session's largest network view and records its title, so graphty reads that network too.
 * @param meta - the oracle's metadata
 * @returns the network title, or undefined for the file's first graph
 */
export function oracleGraphName(meta: Record<string, unknown>): string | undefined {
    const network = meta.network as { title?: unknown; views?: unknown } | undefined;
    return typeof network?.title === "string" && typeof network.views === "number" && network.views > 1
        ? network.title
        : undefined;
}

/**
 * The oracle's drawing associated with graph elements: from its SVG's primitives, or, for a
 * raster oracle (a program with no vector output) that recorded where it drew each node, from
 * that record with the fills read off its pixels.
 * @param id - the sample
 * @param meta - the oracle's metadata
 * @param prims - the SVG's primitives
 * @param size - the SVG's rendered size
 * @param size.width - width
 * @param size.height - height
 * @param graphty - graphty's drawing, the guide
 * @returns the association
 */
async function associateOracle(
    id: string,
    meta: Record<string, unknown>,
    prims: Parameters<typeof associate>[0],
    size: { width: number; height: number },
    graphty: PScene,
): Promise<Association> {
    const drawing = meta.drawn as RasterDrawing | undefined;
    const pngUrl = await oraclePngUrl(id);
    if (meta.svgKind !== "raster" || drawing === undefined || pngUrl === undefined) {
        return associate(prims, size.width, size.height, graphty);
    }
    const png = await pngPixels(pngUrl);
    const k = png.width / size.width;
    return {
        method: "markup",
        guide: null,
        scene: rasterScene(drawing, size.width, size.height, (x, y, r) =>
            diskColor(png.data, png.width, png.height, x * k, y * k, Math.max(0.5, r * k)),
        ),
    };
}

/** One comparison of a mounted element's drawing with the program's own. */
export interface OracleComparison {
    report: OracleReport;
    /** Pass rate per judged property, rounded to 4 places; empty for a sketch no program drew. */
    scores: Record<string, number>;
    meta: Record<string, unknown>;
    association: Association;
    graphty: PScene;
    /** The SVG's rendered size. */
    width: number;
    height: number;
}

/**
 * Compares what a mounted element drew of a sample with the program's own SVG of the same file.
 * @param id - the sample
 * @param element - the element, the sample loaded and settled
 * @param sha256 - the sample file's sha256
 * @param command - how it was loaded, for the provenance
 * @returns the comparison
 */
export async function compareWithOracle(
    id: string,
    element: Graphty,
    sha256: string,
    command: string,
    mutate?: (g: PScene) => PScene,
): Promise<OracleComparison> {
    const meta = oracleMeta(id);
    const drawn = readDrawn(element.graph);
    const scene = extractScene(element, drawn, { version: "source", command, sourceSha256: sha256 });
    // A raster oracle names every node its program drew (sigma.js draws no groups): graphty's nodes are compared as
    // nodes there, a big one drawn over smaller ones included, never as group boxes.
    const raster = meta.svgKind === "raster" && meta.drawn !== undefined;
    const unmutated = drawnPrimitives(scene, drawn, { groups: !raster });
    const graphty = mutate === undefined ? unmutated : mutate(structuredClone(unmutated));
    const svgPath = pathOf(svgs, id);
    if (svgPath === undefined) {
        throw new Error(`${id} has no oracle SVG`);
    }
    const { width, height, prims } = readSvgPrimitives(await svgs[svgPath]());
    const association = await associateOracle(id, meta, prims, { width, height }, graphty);
    const report = compareOracle(
        id,
        association.scene,
        graphty,
        {
            method: association.method,
            guide: association.guide,
            oracle: {
                program: meta.program ?? null,
                version: meta.version ?? null,
                standIn: meta.standIn ?? null,
                width,
                height,
            },
            graphty: { command, width: graphty.width, height: graphty.height },
        },
        { mirror: meta.mirrored === true },
    );
    // A stand-in drawn by no program at all (a sketch of our own reading of the file) is reported,
    // never scored; another program's real drawing standing in (draw.io for yEd) is scored.
    const sketch = meta.standIn === true && typeof meta.program === "string" && meta.program.startsWith("none");
    const scores: Record<string, number> = {};
    for (const p of sketch ? [] : ORACLE_PROPERTIES) {
        const rate = report.properties[p].passRate;
        if (rate !== null) {
            scores[p] = Math.round(rate * 10000) / 10000;
        }
    }
    return { report, scores, meta, association, graphty, width, height };
}
