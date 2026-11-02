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
import { GRAPHVIZ_ENGINES, graphvizLayoutId } from "../../../src/layout/graphviz/engines";
import { readDrawn } from "../drawn-scene";
import { extractScene, groupsOf } from "../extract-scene";
import {
    associate,
    type Association,
    diskColor,
    type DrawnNodes,
    nameDrawnNodes,
    type RasterDrawing,
    rasterScene,
    withoutCovered,
} from "./associate";
import {
    compareOracle,
    namedCaptions,
    ORACLE_PROPERTIES,
    type OracleReport,
    specimenRoleNames,
    specimenSettingNames,
} from "./compare-oracle";
import { drawnPrimitives } from "./drawn-primitives";
import { judgesFor, type Reference, SHEET_JUDGES, specificationScene } from "./judges";
import type { Pixels } from "./picture-gradient";
import type { PScene } from "./primitives";
import { pngPixels } from "./raster";
import { readSvgPrimitives, type SvgPrimitives } from "./svg-primitives";

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
// the stand-in programs' drawings of a sheet judged per setting (judges.ts): <sample>.<route>.svg and .oracle.json
const standInSvgs = import.meta.glob<string>("../../../../graph-io/test/fidelity/oracles/stand-ins/*.svg", {
    query: "?raw",
    import: "default",
});
const standInMetas = import.meta.glob<Record<string, unknown>>(
    "../../../../graph-io/test/fidelity/oracles/stand-ins/*.oracle.json",
    { import: "default", eager: true },
);
const specimenPages = import.meta.glob<{ pages: { id: string; names?: Record<string, string> }[] }>(
    "../../../../graph-io/test/fidelity/specimens/*/pages.json",
    { import: "default", eager: true },
);
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
 * The reader options a program's drawing was made with that the file cannot carry: the Gephi Preview
 * settings of a GEXF page (`previewProperties`), which graphty-element's GEXF reader takes as
 * `gephiPreview`, and the sigma.js settings of a graphology page (`settings`), which its JSON reader takes as
 * `sigmaSettings`.
 * @param meta - the oracle's metadata
 * @param format - graph-io's format name of the sample
 * @returns the options, empty for none
 */
export function oracleFormatOptions(meta: Record<string, unknown>, format: string): Record<string, unknown> {
    const preview = meta.previewProperties;
    if (format === "pajek" && meta.program === "Pajek") {
        return { pajekDraw: pajekDrawOf(meta) };
    }
    if (
        format === "json" &&
        meta.program === "sigma.js" &&
        typeof meta.settings === "object" &&
        meta.settings !== null
    ) {
        return { sigmaSettings: meta.settings };
    }
    return format === "gexf" && typeof preview === "object" && preview !== null ? { gephiPreview: preview } : {};
}

/**
 * How Pajek drew a sample (graphty-element's Pajek reader takes it as `pajekDraw`): its Draw window's size, the ini
 * options of a specimen page, and the partition and vectors its `E 1 DRAW <partition> <vector> <vector2>` macro drew.
 * @param meta - the oracle's metadata
 * @returns the draw settings
 */
function pajekDrawOf(meta: Record<string, unknown>): Record<string, unknown> {
    const canvas = meta.canvas as { widthPx?: number; heightPx?: number } | undefined;
    const draw = /\bDRAW (\d+) (\d+) (\d+)/.exec(typeof meta.command === "string" ? meta.command : "");
    return {
        ...(canvas?.widthPx === undefined ? {} : { width: canvas.widthPx }),
        ...(canvas?.heightPx === undefined ? {} : { height: canvas.heightPx }),
        ...(typeof meta.ini === "object" && meta.ini !== null ? { ini: meta.ini } : {}),
        ...(draw === null ? {} : { partition: Number(draw[1]), vector: Number(draw[2]), vector2: Number(draw[3]) }),
    };
}

/**
 * The setting ids of a specimen sheet whose format ids its nodes by number (Pajek): `pages.json` `names`, vertex
 * number -> setting id (`anchor-*`, `cap-*`, a specimen's own id), so both sides name each node by its setting.
 * @param id - the sample
 * @returns the names, empty for a sheet without them
 */
export function specimenNames(id: string): ReadonlyMap<string, string> {
    for (const [path, file] of Object.entries(specimenPages)) {
        const format = /specimens\/([^/]+)\/pages\.json$/.exec(path)?.[1];
        const page = file.pages.find((p) => `${format ?? ""}-${p.id}` === id);
        if (page?.names !== undefined) {
            return new Map(Object.entries(page.names));
        }
    }
    return new Map();
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
    ownLayout: boolean,
): Promise<Association> {
    const drawing = meta.drawn as RasterDrawing | undefined;
    const pngUrl = await oraclePngUrl(id);
    if (meta.svgKind !== "raster" || drawing === undefined || pngUrl === undefined) {
        // a vector oracle whose program said where it drew each node (vis-network) names its shapes by that
        const named =
            meta.svgKind !== "raster" && drawing !== undefined
                ? nameDrawnNodes(prims, meta.drawn as DrawnNodes)
                : prims;
        return associate(named, size.width, size.height, graphty, { ownLayout });
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

/**
 * Whether an oracle stands in for the program that wrote the file: another program's drawing (draw.io for yEd,
 * Graphviz for GML), or a raster, whose program records where it drew its nodes and nothing more (sigma.js). Its
 * scores are kept apart from the real programs' (`standInFloors` in the floors file, its own table in the report).
 * @param meta - the oracle's metadata
 * @returns whether it is a stand-in
 */
export function isStandIn(meta: Record<string, unknown>): boolean {
    return meta.standIn === true || meta.svgKind === "raster";
}

/** The oracle programs that draw no group box, whatever the file says. */
const NO_GROUP_PROGRAMS: ReadonlySet<string> = new Set(["Gephi Toolkit", "Pajek"]);

/**
 * What a comparison takes from the mounted element besides its drawing, so the same comparison can be run again on a
 * drawing kept from another run (`judgeDrawing`): the specimen names both sides are named by, and whether graphty ran
 * its own layout. These follow from the sample file, not from how graphty drew it.
 */
export interface JudgeInputs {
    /** Node id to its specimen role name (`cap-*`, `anchor-*`), from the sample's own data. */
    captionOf: [string, string][];
    /** Node id to its specimen setting id, for a sheet whose format numbers its nodes. */
    names: [string, string][];
    /** The file placed no node: graphty laid it out itself. */
    ownLayout: boolean;
    /** ...and with its own layout, not the program's (Graphviz lays a DOT file out on both sides alike). */
    ownLayouts: boolean;
    /** How the sample was loaded, for the provenance. */
    command: string;
}

/**
 * One reference's judgments of a sheet judged per setting: the sheet's oracle, a stand-in program or the
 * specification, each scoring only the properties of the settings it draws (judges.json).
 */
export interface ReferenceJudgment {
    reference: Reference;
    /** Who drew it: the program's metadata, or the specification's citation. */
    meta: Record<string, unknown>;
    report: OracleReport;
    scores: Record<string, number>;
    /** Its drawing, associated with graph elements. */
    scene: PScene;
}

/** One comparison of a drawing with the program's own. */
export interface OracleComparison {
    /** The sheet's oracle's report: for a sheet judged per setting, only what the oracle judges. */
    report: OracleReport;
    /** Pass rate per judged property, rounded to 4 places; empty for a sketch no program drew. */
    scores: Record<string, number>;
    meta: Record<string, unknown>;
    association: Association;
    graphty: PScene;
    /** Each node id the comparison renamed to its specimen setting (`specimenNames`). */
    names: ReadonlyMap<string, string>;
    /** The SVG's rendered size. */
    width: number;
    height: number;
    /** What the comparison took from the element, to judge another drawing of the same sample alike. */
    inputs: JudgeInputs;
    /** A sheet judged per setting: every reference's judgments, the oracle's first; empty for any other sample. */
    references: ReferenceJudgment[];
}

/**
 * Pass rate per judged property, rounded to 4 places.
 * @param report - the comparison
 * @returns the scores
 */
function scoresOf(report: OracleReport): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const p of ORACLE_PROPERTIES) {
        const rate = report.properties[p].passRate;
        if (rate !== null) {
            scores[p] = Math.round(rate * 10000) / 10000;
        }
    }
    return scores;
}

/**
 * Compares what a mounted element drew of a sample with the program's own SVG of the same file.
 * @param id - the sample
 * @param element - the element, the sample loaded and settled
 * @param sha256 - the sample file's sha256
 * @param command - how it was loaded, for the provenance
 * @param mutate - a planted defect, applied to graphty's drawing before it is judged
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
    // nodes there, a big one drawn over smaller ones included, never as group boxes. So are they where the program
    // draws no group box at all: Gephi draws a GEXF hierarchy as plain nodes, Pajek has no groups (a plain node drawn
    // round a smaller one, Gephi's `label-overlap`, was read as a group and its oracle node as missing).
    const raster = meta.svgKind === "raster" && meta.drawn !== undefined;
    const groupless = raster || NO_GROUP_PROGRAMS.has(String(meta.program));
    // A label under one render pixel is not shown here, as the oracle's is not (`compareOracle`); the scene shows it
    // and leaves its size to `fontSize`, which the reference scenes judge in their own units.
    const nodes = scene.nodes.map((n) => {
        const d = drawn.nodes.get(n.id);
        const fontPx = (d?.label ?? d?.tableLabel)?.fontPx ?? 0;
        return n.label === null || fontPx >= 1 ? n : { ...n, label: { ...n.label, visible: false } };
    });
    // An SVG names no group, so a box graphty draws round others is read as one by its drawing alone, as the oracle's
    // is, not only where the file nests nodes (the scene's groups, which the reference scenes are judged by)
    const unmutated = drawnPrimitives({ ...scene, nodes, groups: groupsOf(nodes, drawn.nodes) }, drawn, {
        groups: !groupless,
    });
    // A specimen sheet whose format ids its nodes otherwise (Cytoscape desktop by SUID, GML by number) keeps `cap-*`
    // and `anchor-*` in an attribute (`name`, GML's `comment` or `template`): its captions and corner anchors are
    // named by that on both sides, so the comparison leaves the captions out and fixes the frame on the anchors
    const captionOf = specimenRoleNames(element.session.data.nodes());
    // a sheet whose vertices are numbers names each by its setting, on both sides, once the oracle is associated
    // (Pajek's from its pages.json; GML's from each node's comment, the setting id the sheet keeps there)
    const names = id.startsWith("gml-specimen-")
        ? specimenSettingNames(element.session.data.nodes())
        : specimenNames(id);
    const named = namedCaptions(namedCaptions(unmutated, captionOf), names);
    const graphty = mutate === undefined ? named : mutate(structuredClone(named));
    const ownLayout = element.session.seededNodeCount === 0;
    return judgeDrawing(id, graphty, {
        captionOf: [...captionOf],
        names: [...names],
        ownLayout,
        // the file placed no node and graphty ran its own layout, not the program's (Graphviz lays a DOT file out on
        // both sides alike)
        ownLayouts: ownLayout && !GRAPHVIZ_ENGINES.some((engine) => graphvizLayoutId(engine) === element.layout),
        command,
    });
}

/** The SVG read last, and what was read from it. */
let lastRead: { svg: string; read: SvgPrimitives } | undefined;

/**
 * Reads an oracle SVG's primitives, once for back-to-back comparisons of the same drawing: a matched run compares
 * twice, and reading a large SVG through the DOM is a second of its work (json-vis-siblings, 1,000 elements, 128
 * points sampled along each curve). Each caller gets its own copy.
 * @param svg - the SVG's text
 * @returns its primitives
 */
async function readSvgOnce(svg: string): Promise<SvgPrimitives> {
    if (lastRead?.svg !== svg) {
        // the PNGs it embeds (Cytoscape desktop's gradient custom graphics), decoded so their pixels can be read
        // keyed without whitespace: base64 written across lines reads back from the DOM with spaces for the breaks
        const hrefs = new Set((svg.match(/data:image\/png;base64,[^"']+/gi) ?? []).map((h) => h.replace(/\s+/g, "")));
        const pictures = new Map<string, Pixels>();
        for (const href of hrefs) {
            pictures.set(href, await pngPixels(href));
        }
        lastRead = { svg, read: readSvgPrimitives(svg, pictures) };
    }
    return structuredClone(lastRead.read);
}

/**
 * Judges a drawing of graphty's, already read and named (`compareWithOracle`, or one kept in an earlier run's report),
 * against the program's own SVG of the same sample: the comparator alone, so a drawing kept from another run is judged
 * by this run's comparator exactly as this run's drawing is.
 * @param id - the sample
 * @param graphty - graphty's drawing, named
 * @param inputs - what the comparison takes from the element
 * @returns the comparison
 */
export async function judgeDrawing(id: string, graphty: PScene, inputs: JudgeInputs): Promise<OracleComparison> {
    const meta = oracleMeta(id);
    const captionOf = new Map(inputs.captionOf);
    const names = new Map(inputs.names);
    const numbers = new Map([...names].map(([k, v]) => [v, k]));
    const svgPath = pathOf(svgs, id);
    if (svgPath === undefined) {
        throw new Error(`${id} has no oracle SVG`);
    }
    const sheet = SHEET_JUDGES[id] as (typeof SHEET_JUDGES)[string] | undefined;
    // one drawing associated with graph elements and judged: the oracle's, or a stand-in program's
    const judge = async (
        svg: string,
        drawnBy: Record<string, unknown>,
        reference: Reference,
    ): Promise<{ association: Association; report: OracleReport; width: number; height: number }> => {
        const read = await readSvgOnce(svg);
        const associated = await associateOracle(
            id,
            drawnBy,
            read.prims,
            { width: read.width, height: read.height },
            namedCaptions(graphty, numbers),
            inputs.ownLayout,
        );
        // the oracle's nodes take graphty's ids, so a caption the program drew as a node is named a caption there too
        const association = {
            ...associated,
            scene: withoutCovered(namedCaptions(namedCaptions(associated.scene, captionOf), names), graphty),
        };
        const report = compareOracle(
            id,
            association.scene,
            graphty,
            {
                method: association.method,
                guide: association.guide,
                oracle: {
                    program: drawnBy.program ?? null,
                    version: drawnBy.version ?? null,
                    standIn: drawnBy.standIn ?? null,
                    width: read.width,
                    height: read.height,
                },
                graphty: { command: inputs.command, width: graphty.width, height: graphty.height },
            },
            {
                mirror: drawnBy.mirrored === true,
                standIn: isStandIn(drawnBy),
                ownLayouts: inputs.ownLayouts,
                ...(sheet === undefined ? {} : { judges: judgesFor(sheet, reference) }),
            },
        );
        return { association, report, width: read.width, height: read.height };
    };
    const { association, report, width, height } = await judge(await svgs[svgPath](), meta, "oracle");
    // A stand-in drawn by no program at all (a sketch of our own reading of the file) is reported,
    // never scored; another program's real drawing standing in (draw.io for yEd) is scored.
    const sketch = meta.standIn === true && typeof meta.program === "string" && meta.program.startsWith("none");
    const scores = sketch ? {} : scoresOf(report);
    const references: ReferenceJudgment[] = [];
    if (sheet !== undefined) {
        references.push({ reference: "oracle", meta, report, scores, scene: association.scene });
        for (const route of sheet.standIns) {
            const name = `${id}.${route}`;
            const svg = pathOf(standInSvgs, name);
            const drawnBy = standInMetas[pathOf(standInMetas, name) ?? ""] as Record<string, unknown> | undefined;
            if (svg === undefined || drawnBy === undefined) {
                throw new Error(`${id}: judges.json names the stand-in ${route}, which oracles/stand-ins/ lacks`);
            }
            const r = await judge(await standInSvgs[svg](), drawnBy, route);
            references.push({
                reference: route,
                meta: drawnBy,
                report: r.report,
                scores: scoresOf(r.report),
                scene: r.association.scene,
            });
        }
        // the specification's drawing: the oracle's, with each setting's expectation written over it
        const expected = specificationScene(
            association.scene,
            sheet,
            references.map((r) => r.scene).filter((s) => s !== association.scene),
        );
        const spec = compareOracle(
            id,
            expected,
            graphty,
            {
                method: "specification",
                guide: null,
                graphty: { command: inputs.command, width: graphty.width, height: graphty.height },
            },
            { judges: judgesFor(sheet, "specification") },
        );
        references.push({
            reference: "specification",
            meta: { program: "specification", about: SPECIFICATION_ABOUT },
            report: spec,
            scores: scoresOf(spec),
            scene: expected,
        });
    }
    return { report, scores, meta, association, graphty, names, width, height, inputs, references };
}

/** What the specification reference is (each expectation cites its own section in judges.json). */
const SPECIFICATION_ABOUT =
    "not a program: each setting's expected drawing, derived from the format's specification and recorded in " +
    "graph-io/test/fidelity/specimens/<format>/judges.json with the section it comes from";
