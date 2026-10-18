/**
 * One oracle comparison, end to end, for the browser tests that run it: mount a sample in a real
 * `<graphty-element>` at the oracle canvas size, read what it drew, read the program's own SVG of
 * the same file, associate, compare, capture graphty's canvas and compare it region by region with
 * the rasterized oracle, then move graphty's nodes to where the program drew them and compare again
 * (style judged apart from layout), and (when asked) write the report files. Also the floors files
 * both tests check, which only ever ratchet up: pass rates per property (`oracle-floors.json`) and
 * the elements known to fail each property (`oracle-known-failures.json`).
 *
 * Browser only.
 */
import { commands } from "vitest/browser";

import { fitSimilarity } from "../../../../graph-io/test/fidelity/compare";
import { CORPUS_SAMPLES } from "../../../../graph-io/test/fidelity/corpus-samples";
import { SAMPLES } from "../../../../graph-io/test/fidelity/samples";
import { SPECIMEN_SAMPLES } from "../../../../graph-io/test/fidelity/specimens/index";
import type { Graphty } from "../../../index.js";
import { mountSample, readJson } from "../mount";
import { pairNodes } from "./compare-oracle";
import {
    checkScored,
    type FloorCheck,
    mergeRecords,
    type OracleFloors,
    type OracleRecord,
    type OracleScored,
} from "./floors";
import {
    compareWithOracle,
    isStandIn,
    ORACLE_CANVAS,
    type OracleComparison,
    oracleGraphName,
    oracleMeta,
    oraclePngUrl,
} from "./oracle-library";
import { boxOfPoints, type Pt } from "./primitives";
import { RASTER_REGIONS, rasterCompare } from "./raster";

export type { AllowedDrop, FloorCheck, OracleFloors, OracleRecord, OracleScored } from "./floors";
export { ORACLE_CANVAS, ORACLE_IDS, oracleGraphName, oraclesWithoutMetadata } from "./oracle-library";

/** The floors file, relative to graphty-element. */
export const ORACLE_FLOORS = "test/fidelity/oracle-floors.json";
/** The elements known to fail, relative to graphty-element. */
export const ORACLE_KNOWN_FAILURES = "test/fidelity/oracle-known-failures.json";
/** Where reports are written, relative to graphty-element (gitignored). */
export const ORACLE_OUT = "tmp/oracle-report";
/** The floors key of a sample's position-matched comparison. */
export const matchedKey = (id: string): string => `${id}@matched`;

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
export interface OracleRun extends OracleScored {
    /** The sample file's sha256 and the oracle's record of it. */
    sha256: string;
    oracleSha256: string | null;
    /** The oracle stands in for the file's own program: its floors are kept apart. */
    standIn: boolean;
    /** graphty drawn at the program's own node positions, so style is judged apart from layout; null when no node pairs. */
    matched: OracleScored | null;
}

/** The inverse of a fitted similarity: the point it takes to `q`. */
function unapply(t: NonNullable<ReturnType<typeof fitSimilarity>>, q: Pt): Pt {
    const x = q[0] - t.tx;
    const y = q[1] - t.ty;
    const c = Math.cos(-t.rotation) / t.scale;
    const s = Math.sin(-t.rotation) / t.scale;
    const ry = s * x + c * y;
    return [c * x - s * y, t.reflect ? -ry : ry];
}

/**
 * Moves graphty's nodes to where the program drew them, pinned, so a second comparison judges style with the layout
 * taken out: each oracle node's center is taken into graphty's pixels through the comparison's frame (between
 * unrelated layouts, by matching the two drawings' extents), and from there into the world through graphty's own
 * camera, read off where it draws its nodes.
 * @param element - the mounted element
 * @param first - the first comparison
 * @param mirror - the program's drawing is known to be mirrored
 * @returns whether any node was moved
 */
async function matchPositions(element: Graphty, first: OracleComparison, mirror: boolean): Promise<boolean> {
    const { pairs } = pairNodes(first.association.scene, first.graphty);
    if (pairs.length < 2) {
        return false;
    }
    const world = new Map<string, { key: string | number; at: Pt }>();
    for (const [key, node] of element.graph.getDataManager().nodes) {
        world.set(String(key), { key, at: [node.mesh.position.x, node.mesh.position.y] });
    }
    const drawn = first.graphty.nodes.filter((n) => world.has(n.id));
    const toPx = fitSimilarity(
        drawn.map((n) => world.get(n.id)?.at ?? [0, 0]),
        drawn.map((n): Pt => [n.cx, n.cy]),
    );
    if (toPx === null) {
        return false;
    }
    const anchors = pairs.filter(([o]) => o.id.startsWith("anchor-"));
    const frame = anchors.length >= 2 ? anchors : pairs;
    const fit =
        first.report.transform?.unrelatedLayout === false
            ? fitSimilarity(
                  frame.map(([, g]): Pt => [g.cx, g.cy]),
                  frame.map(([o]): Pt => [o.cx, o.cy]),
                  { reflect: mirror },
              )
            : null;
    // between unrelated layouts: the oracle's centers onto graphty's, extent onto extent
    const bo = boxOfPoints(pairs.map(([o]): Pt => [o.cx, o.cy]));
    const bg = boxOfPoints(pairs.map(([, g]): Pt => [g.cx, g.cy]));
    const k = Math.hypot(bg.x1 - bg.x0, bg.y1 - bg.y0) / Math.max(Math.hypot(bo.x1 - bo.x0, bo.y1 - bo.y0), 1e-9);
    const intoGraphty = (p: Pt): Pt =>
        fit === null
            ? [
                  (bg.x0 + bg.x1) / 2 + (p[0] - (bo.x0 + bo.x1) / 2) * k,
                  (bg.y0 + bg.y1) / 2 + (p[1] - (bo.y0 + bo.y1) / 2) * k,
              ]
            : unapply(fit, p);
    const entries = pairs.flatMap(([o, g]) => {
        const w = world.get(g.id);
        if (w === undefined) {
            return [];
        }
        const [x, y] = unapply(toPx, intoGraphty([o.cx, o.cy]));
        return [{ id: w.key, x, y, z: 0 }];
    });
    // ponytail: edge bends a file stores stay where they were; the nodes move by the layout residual only where the
    // layouts are related, and a related layout's bends were already placed by the file.
    await element.session.positions.set(entries);
    await element.session.positions.pin(entries.map((e) => e.id));
    await element.waitForSettled();
    await element.waitForStableFrame();
    return entries.length > 0;
}

/**
 * Runs one sample's oracle comparison, with the raster comparison and the position-matched comparison. The caller
 * unmounts afterwards.
 * @param id - the sample id
 * @param options - what else to do
 * @param options.write - also write the report files
 * @returns what it measured
 */
export async function runOracle(id: string, options: { write: boolean }): Promise<OracleRun> {
    const sample = [...SAMPLES, ...CORPUS_SAMPLES, ...SPECIMEN_SAMPLES].find((s) => s.id === id);
    if (sample === undefined) {
        throw new Error(`${id} is not a fidelity sample`);
    }
    const meta = oracleMeta(id);
    const { element, sha256, command } = await mountSample(sample, ORACLE_CANVAS, oracleGraphName(meta));
    const first = await compareWithOracle(id, element, sha256, command);
    const { report, association, graphty, width, height } = first;
    const scores = { ...first.scores };
    const pngUrl = await oraclePngUrl(id);
    const shot = captureCanvas(element);
    const raster = pngUrl === undefined ? null : await rasterCompare(shot, pngUrl, { width, height }, graphty, report);
    // The raster regions are asserted like every property, at 2 places (a region's similarity is a mean over its
    // pixels, which a renderer's antialiasing moves in the third), and only where the layouts are related: between
    // unrelated layouts the regions of one drawing fall on nothing of the other.
    if (raster !== null && report.transform?.unrelatedLayout === false) {
        for (const r of RASTER_REGIONS) {
            const sim = raster.regions[r].similarity;
            if (sim !== null) {
                scores[`raster.${r}`] = Math.floor(sim * 100) / 100;
            }
        }
    }
    const scenes = { oracle: association.scene, graphty };
    let matched: OracleScored | null = null;
    if (await matchPositions(element, first, meta.mirrored === true)) {
        const second = await compareWithOracle(
            id,
            element,
            sha256,
            `${command}; nodes moved to the oracle's positions`,
        );
        matched = { report: second.report, scores: { ...second.scores } };
    }
    if (options.write) {
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
                : {
                      width: raster.width,
                      height: raster.height,
                      regions: raster.regions,
                      worst: raster.worst,
                      labelInkRatio: raster.labelInkRatio,
                  };
        await commands.writeFile(
            `${ORACLE_OUT}/${id}.json`,
            `${JSON.stringify({ ...report, oracleMeta: meta, raster: rasterSummary, scores, positionMatched: matched, scenes }, null, 1)}\n`,
        );
    }
    return {
        report,
        scores,
        sha256,
        oracleSha256: typeof meta.sha256 === "string" ? meta.sha256 : null,
        standIn: isStandIn(meta),
        matched,
    };
}

/**
 * Reads the floors files.
 * @returns the floors
 */
export async function readOracleFloors(): Promise<OracleFloors> {
    const f = (await readJson<Partial<OracleFloors>>(ORACLE_FLOORS)) ?? {};
    const k = (await readJson<{ known?: OracleFloors["known"] }>(ORACLE_KNOWN_FAILURES)) ?? {};
    return {
        about: f.about ?? "",
        floors: f.floors ?? {},
        standInFloors: f.standInFloors ?? {},
        allowedDrops: f.allowedDrops ?? {},
        lowered: f.lowered ?? {},
        known: k.known ?? {},
    };
}

/**
 * What fell below its floor, what is judged with no floor yet, and which elements newly fail, for a sample and its
 * position-matched comparison.
 * @param id - the sample
 * @param run - its measurement
 * @param stored - the floors
 * @param today - `YYYY-MM-DD`, for the allowed drops' expiry
 * @returns the messages
 */
export function checkFloors(
    id: string,
    run: OracleRun,
    stored: OracleFloors,
    today = new Date().toISOString().slice(0, 10),
): FloorCheck {
    const parts = [checkScored(id, run, run.standIn, stored, today)];
    if (run.matched !== null) {
        parts.push(checkScored(matchedKey(id), run.matched, run.standIn, stored, today));
    }
    return {
        dropped: parts.flatMap((p) => p.dropped),
        unfloored: parts.flatMap((p) => p.unfloored),
        newlyFailing: parts.flatMap((p) => p.newlyFailing),
    };
}

/**
 * A run's records, by floors key.
 * @param id - the sample
 * @param run - its measurement
 * @returns the records
 */
export function recordOf(id: string, run: OracleRun): OracleRecord {
    const out: OracleRecord = { [id]: { scores: run.scores, failures: run.report.failures, standIn: run.standIn } };
    if (run.matched !== null) {
        out[matchedKey(id)] = {
            scores: run.matched.scores,
            failures: run.matched.report.failures,
            standIn: run.standIn,
        };
    }
    return out;
}

/**
 * Writes the floors and the known failures a run recorded (`mergeRecords`).
 * @param stored - the floors as read
 * @param recorded - the measurements by floors key
 */
export async function writeOracleFloors(stored: OracleFloors, recorded: OracleRecord): Promise<void> {
    const fresh = await readOracleFloors().catch(() => stored);
    const { floors, standInFloors, known } = mergeRecords(fresh, recorded);
    const file = {
        about: fresh.about,
        floors,
        standInFloors,
        allowedDrops: fresh.allowedDrops,
        lowered: fresh.lowered,
    };
    await commands.writeFile(ORACLE_FLOORS, `${JSON.stringify(file, null, 4)}\n`);
    await commands.writeFile(ORACLE_KNOWN_FAILURES, `${JSON.stringify({ about: KNOWN_ABOUT, known }, null, 1)}\n`);
}

const KNOWN_ABOUT =
    "The elements known to fail each property of the oracle scorecard (test/fidelity/oracle-report.test.ts), per sample " +
    "(and per sample@matched, its position-matched comparison). An element failing a property that is not listed here " +
    "fails its sample; recording drops an element that passes again and never adds one to a property already recorded. " +
    "This is the fix list, by element id.";
