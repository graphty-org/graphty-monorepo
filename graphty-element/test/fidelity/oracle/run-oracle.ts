/**
 * One oracle comparison, end to end, for the browser tests that run it: mount a sample in a real
 * `<graphty-element>` at the oracle canvas size, read what it drew, read the program's own SVG of
 * the same file, associate, compare, and (when asked) capture graphty's canvas and compare it
 * region by region with the rasterized oracle and write the report files. Also the floors file
 * both tests check, which only ever ratchets up.
 *
 * Browser only.
 */
import { commands } from "vitest/browser";

import { CORPUS_SAMPLES } from "../../../../graph-io/test/fidelity/corpus-samples";
import { SAMPLES } from "../../../../graph-io/test/fidelity/samples";
import type { Graphty } from "../../../index.js";
import { readDrawn } from "../drawn-scene";
import { extractScene } from "../extract-scene";
import { mountSample, readJson } from "../mount";
import { associate } from "./associate";
import { compareOracle, ORACLE_PROPERTIES, type OracleProperty, type OracleReport } from "./compare-oracle";
import { drawnPrimitives } from "./drawn-primitives";
import { rasterCompare } from "./raster";
import { readSvgPrimitives } from "./svg-primitives";

/** The oracle canvas every program draws at, where it allows one. */
export const ORACLE_CANVAS = { width: 1200, height: 900 };
/** The floors file, relative to graphty-element. */
export const ORACLE_FLOORS = "test/fidelity/oracle-floors.json";
/** Where reports are written, relative to graphty-element (gitignored). */
export const ORACLE_OUT = "tmp/oracle-report";

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
 * graphty's canvas as a PNG: one more frame of the settled scene, read back in the same task (so
 * the drawing buffer still holds it). A locator screenshot waits for the element to stop
 * changing, which a live canvas never does.
 * @param element - the mounted element
 * @returns the PNG, base64
 */
function captureCanvas(element: Graphty): string {
    const scene = element.graph.getScene();
    scene.render();
    const canvas = scene.getEngine().getRenderingCanvas();
    if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error("the element has no rendering canvas");
    }
    return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

/** What one comparison measured. */
export interface OracleRun {
    report: OracleReport;
    /** Pass rate per judged property, rounded to 4 places. */
    scores: Record<string, number>;
    /** The sample file's sha256 and the oracle's record of it. */
    sha256: string;
    oracleSha256: string | null;
}

/**
 * Runs one sample's oracle comparison. The caller unmounts afterwards.
 * @param id - the sample id
 * @param options - what else to do
 * @param options.write - also capture the canvas, run the raster comparison and write the report files
 * @returns what it measured
 */
export async function runOracle(id: string, options: { write: boolean }): Promise<OracleRun> {
    const sample = [...SAMPLES, ...CORPUS_SAMPLES].find((s) => s.id === id);
    if (sample === undefined) {
        throw new Error(`${id} is not a fidelity sample`);
    }
    const meta = metas[pathOf(metas, id) ?? ""] ?? {};
    const { element, sha256, command } = await mountSample(sample, ORACLE_CANVAS);
    const drawn = readDrawn(element.graph);
    const scene = extractScene(element, drawn, { version: "source", command, sourceSha256: sha256 });
    const graphty = drawnPrimitives(scene, drawn);
    const svg = await svgs[pathOf(svgs, id) ?? ""]();
    const { width, height, prims } = readSvgPrimitives(svg);
    const assoc = associate(prims, width, height, graphty);
    const report = compareOracle(id, assoc.scene, graphty, {
        method: assoc.method,
        guide: assoc.guide,
        oracle: {
            program: meta.program ?? null,
            version: meta.version ?? null,
            standIn: meta.standIn ?? null,
            width,
            height,
        },
        graphty: { command, width: graphty.width, height: graphty.height },
    });
    // A stand-in is not the program's drawing (the program could not run): it is reported, never scored.
    const scores: Record<string, number> = {};
    for (const p of meta.standIn === true ? [] : ORACLE_PROPERTIES) {
        const rate = report.properties[p].passRate;
        if (rate !== null) {
            scores[p] = Math.round(rate * 10000) / 10000;
        }
    }
    if (options.write) {
        const pngPath = pathOf(pngs, id);
        const shot = captureCanvas(element);
        const raster =
            pngPath === undefined
                ? null
                : await rasterCompare(shot, await pngs[pngPath](), { width, height }, graphty, report);
        await commands.writeFile(`${ORACLE_OUT}/${id}.graphty.png`, shot, { encoding: "base64" });
        if (raster !== null) {
            await commands.writeFile(`${ORACLE_OUT}/${id}.aligned.png`, raster.images.oracleAligned, {
                encoding: "base64",
            });
            await commands.writeFile(`${ORACLE_OUT}/${id}.overlay.png`, raster.images.overlay, { encoding: "base64" });
        }
        const rasterSummary =
            raster === null
                ? null
                : { width: raster.width, height: raster.height, regions: raster.regions, worst: raster.worst };
        await commands.writeFile(
            `${ORACLE_OUT}/${id}.json`,
            `${JSON.stringify({ ...report, oracleMeta: meta, raster: rasterSummary, scenes: { oracle: assoc.scene, graphty } }, null, 1)}\n`,
        );
    }
    return { report, scores, sha256, oracleSha256: typeof meta.sha256 === "string" ? meta.sha256 : null };
}

/** The floors file. */
export interface OracleFloors {
    about: string;
    floors: Record<string, Record<string, number>>;
    allowedDrops: Record<string, string>;
}

const EPSILON = 1e-9;

/**
 * Reads the floors file.
 * @returns the floors
 */
export async function readOracleFloors(): Promise<OracleFloors> {
    return (await readJson<OracleFloors>(ORACLE_FLOORS)) ?? { about: "", floors: {}, allowedDrops: {} };
}

/**
 * What fell below its floor, and what is judged with no floor yet.
 * @param id - the sample
 * @param run - its measurement
 * @param stored - the floors
 * @returns the drop messages and the properties missing a floor
 */
export function checkFloors(
    id: string,
    run: OracleRun,
    stored: OracleFloors,
): { dropped: string[]; unfloored: string[] } {
    const floors = stored.floors[id] ?? {};
    const dropped = Object.entries(floors).flatMap(([p, floor]) => {
        const rate = run.scores[p];
        if ((rate !== undefined && rate >= floor - EPSILON) || `${id}/${p}` in stored.allowedDrops) {
            return [];
        }
        const worst = (run.report.properties[p as OracleProperty]?.worst ?? [])
            .slice(0, 3)
            .map((w) => `${w.id} (oracle ${JSON.stringify(w.oracle)}, graphty ${JSON.stringify(w.graphty)})`);
        return [
            `${id} ${p}: ${rate === undefined ? "no longer judged" : rate.toFixed(4)} < floor ${floor.toFixed(4)}; worst: ${worst.join("; ")}`,
        ];
    });
    return { dropped, unfloored: Object.keys(run.scores).filter((p) => !(p in floors)) };
}

/**
 * Writes the floors, keeping the higher of the stored and the measured rate: a floor never drops.
 * @param stored - the floors as read
 * @param recorded - the measured rates by sample
 */
export async function writeOracleFloors(
    stored: OracleFloors,
    recorded: Record<string, Record<string, number>>,
): Promise<void> {
    const fresh = (await readJson<OracleFloors>(ORACLE_FLOORS)) ?? stored;
    const floors: OracleFloors["floors"] = { ...fresh.floors };
    for (const [id, scores] of Object.entries(recorded)) {
        const old = fresh.floors[id] ?? {};
        const merged: Record<string, number> = { ...old };
        for (const [p, rate] of Object.entries(scores)) {
            merged[p] = Math.max(rate, old[p] ?? 0);
        }
        floors[id] = Object.fromEntries(
            Object.keys(merged)
                .sort(
                    (a, b) =>
                        ORACLE_PROPERTIES.indexOf(a as OracleProperty) - ORACLE_PROPERTIES.indexOf(b as OracleProperty),
                )
                .map((p) => [p, merged[p]]),
        );
    }
    const sorted = Object.fromEntries(
        Object.keys(floors)
            .sort()
            .map((k) => [k, floors[k]]),
    );
    await commands.writeFile(ORACLE_FLOORS, `${JSON.stringify({ ...fresh, floors: sorted }, null, 4)}\n`);
}
