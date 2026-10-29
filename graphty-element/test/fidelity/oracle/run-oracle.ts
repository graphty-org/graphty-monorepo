/**
 * One oracle comparison, end to end, for the browser tests that run it: mount a sample in a real
 * `<graphty-element>` at the oracle canvas size, read what it drew, read the program's own SVG of
 * the same file, associate, compare, capture graphty's canvas and compare it region by region with
 * the rasterized oracle, then move graphty's nodes to where the program drew them and compare again
 * (style judged apart from layout), and (when asked) write the report files. With a baseline (an earlier run's report
 * directory, `GRAPHTY_ORACLE_BASELINE`), the baseline's drawings of the same sample are judged again by this run's
 * comparator, so a change is said to come from the drawing or from the comparator.
 *
 * The verdict is the elements' (`floors.ts`): a sample fails when an element fails a property that
 * `oracle-known-failures.json` does not list; the pass rates in `oracle-floors.json` are recorded values the run is
 * reported against, never a gate. `scripts/fidelity-ratchet.ts` applies a run's report to both files.
 *
 * Browser only.
 */
import { commands } from "vitest/browser";

import { fitSimilarity } from "../../../../graph-io/test/fidelity/compare";
import { CORPUS_SAMPLES } from "../../../../graph-io/test/fidelity/corpus-samples";
import { SAMPLES } from "../../../../graph-io/test/fidelity/samples";
import { SPECIMEN_SAMPLES } from "../../../../graph-io/test/fidelity/specimens/index";
import type { Graphty } from "../../../index.js";
import { GPU, mountSample, readJson } from "../mount";
import { type OracleReport, pairNodes } from "./compare-oracle";
import {
    type Baseline,
    type Floors,
    type FloorSection,
    gateReportText,
    judgeKey,
    type Judgement,
    type KeyGate,
    type KnownRecords,
    oracleFileSha256,
} from "./floors";
import {
    compareWithOracle,
    isStandIn,
    judgeDrawing,
    type JudgeInputs,
    ORACLE_CANVAS,
    type OracleComparison,
    oracleFormatOptions,
    oracleGraphName,
    oracleMeta,
    oraclePngUrl,
} from "./oracle-library";
import { boxOfPoints, placeUndrawn, type PScene, type Pt } from "./primitives";
import { RASTER_REGIONS, rasterCompare } from "./raster";

export { ORACLE_CANVAS, ORACLE_IDS, oracleGraphName, oraclesWithoutMetadata } from "./oracle-library";

/** The recorded pass rates, relative to graphty-element. */
export const ORACLE_FLOORS = "test/fidelity/oracle-floors.json";
/** The elements known to fail, relative to graphty-element. */
export const ORACLE_KNOWN_FAILURES = "test/fidelity/oracle-known-failures.json";
/** Where reports are written, relative to graphty-element (gitignored). */
export const ORACLE_OUT = "tmp/oracle-report";
/** The run's verdicts and report, by key: what `scripts/fidelity-ratchet.ts` reads. */
export const ORACLE_GATE = `${ORACLE_OUT}/gate.json`;
/** An earlier run's report directory whose drawings this run judges again, relative to graphty-element (or absolute). */
export const ORACLE_BASELINE = (import.meta.env.GRAPHTY_ORACLE_BASELINE as string | undefined) || undefined;
/** The floors key of a sample's position-matched comparison. */
export const matchedKey = (id: string): string => `${id}@matched`;
/** The floors key of what one reference judged of a sheet judged per setting (the sheet's own oracle keeps the id). */
export const referenceKey = (id: string, reference: string): string =>
    reference === "oracle" ? id : `${id}~${reference}`;

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

/** One comparison's report and its scores, and the baseline drawing's judgements when the run judged one. */
export interface OracleScored {
    report: OracleReport;
    /** Pass rate per judged property, rounded to 4 places; the raster regions' similarity as `raster.<region>`. */
    scores: Record<string, number>;
    baseline?: Baseline;
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
    /** Every floors key the run measured: the sample and its position-matched comparison, per reference. */
    parts: OraclePart[];
}

/** One floors key's measurement: a comparison, or one reference's judgments of a sheet judged per setting. */
export interface OraclePart {
    key: string;
    section: FloorSection;
    scored: OracleScored;
}

/**
 * The floors keys of one comparison: the sample's own, or, for a sheet judged per setting, one per reference, each
 * kept with the programs, the stand-ins or the specification by what judged it.
 * @param id - the floors key of the comparison (the sample, or its position-matched key)
 * @param comparison - the comparison
 * @param own - the sample's own key's measurement (with the raster regions where they are reported, and its baseline)
 * @param standIn - the sample's oracle is a stand-in
 * @returns the parts
 */
export function partsOf(
    id: string,
    comparison: Pick<OracleComparison, "references">,
    own: OracleScored,
    standIn: boolean,
): OraclePart[] {
    if (comparison.references.length === 0) {
        return [{ key: id, section: standIn ? "standInFloors" : "floors", scored: own }];
    }
    const [base, matched] = id.split("@");
    return comparison.references.map((r) => {
        const key = referenceKey(base, r.reference);
        let section: FloorSection = "standInFloors";
        if (r.reference === "specification") {
            section = "specificationFloors";
        } else if (!isStandIn(r.meta)) {
            section = "floors";
        }
        return {
            key: matched === undefined ? key : `${key}@${matched}`,
            section,
            scored: r.reference === "oracle" ? own : { report: r.report, scores: r.scores },
        };
    });
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
 * unrelated layouts, about the two drawings' middles at the scale their node sizes fit, so the nodes stand as far
 * apart beside their sizes as the program drew them), and from there into the world through graphty's own
 * camera, read off where it draws its nodes.
 * @param element - the mounted element
 * @param first - the first comparison
 * @param mirror - the program's drawing is known to be mirrored
 * @returns whether any node was moved
 */
async function matchPositions(element: Graphty, first: OracleComparison, mirror: boolean): Promise<boolean> {
    const pairs = pairNodes(first.association.scene, first.graphty).pairs.filter(
        ([o, g]) => Number.isFinite(o.cx + o.cy) && Number.isFinite(g.cx + g.cy),
    );
    if (pairs.length < 2) {
        return false;
    }
    const world = new Map<string, { key: string | number; at: Pt }>();
    for (const [key, node] of element.graph.getDataManager().nodes) {
        world.set(first.names.get(String(key)) ?? String(key), {
            key,
            at: [node.mesh.position.x, node.mesh.position.y],
        });
    }
    const finite = (p: Pt): boolean => Number.isFinite(p[0]) && Number.isFinite(p[1]);
    const drawn = first.graphty.nodes.filter((n) => {
        const w = world.get(n.id);
        return w !== undefined && finite(w.at) && finite([n.cx, n.cy]);
    });
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
    // between unrelated layouts: the oracle's middle onto graphty's, at the scale the node sizes fit (oracle pixels per
    // graphty pixel), so the program's spacing beside its node sizes is kept; matching extents instead drew the
    // program's arrangement at graphty's own spacing, and every node then failed its size against the fitted frame
    const bo = boxOfPoints(pairs.map(([o]): Pt => [o.cx, o.cy]));
    const bg = boxOfPoints(pairs.map(([, g]): Pt => [g.cx, g.cy]));
    const k = 1 / Math.max(first.report.transform?.lengthScale ?? 1, 1e-9);
    const intoGraphty = (p: Pt): Pt =>
        fit === null
            ? [
                  (bg.x0 + bg.x1) / 2 + (p[0] - (bo.x0 + bo.x1) / 2) * k,
                  (bg.y0 + bg.y1) / 2 + (p[1] - (bo.y0 + bo.y1) / 2) * k,
              ]
            : unapply(fit, p);
    const inGraphty = new Map(pairs.map(([o, g]): [string, Pt] => [g.id, intoGraphty([o.cx, o.cy])]));
    // between unrelated layouts, a node the program's drawing does not show goes among its neighbours, not where
    // graphty's own layout put it
    const undrawn =
        fit === null
            ? placeUndrawn(
                  inGraphty,
                  [...world.keys()],
                  first.graphty.edges.map((e): [string, string] => [e.source, e.target]),
              )
            : new Map<string, Pt>();
    const entries = [...inGraphty, ...undrawn].flatMap(([id, p]) => {
        const w = world.get(id);
        if (w === undefined) {
            return [];
        }
        const [x, y] = unapply(toPx, p);
        // a node either side drew with no center (Graphviz's shape=plain with no label box) stays where it is
        return Number.isFinite(x) && Number.isFinite(y) ? [{ id: w.key, x, y, z: 0 }] : [];
    });
    if (entries.length === 0) {
        return false;
    }
    // ponytail: edge bends a file stores stay where they were; the nodes move by the layout residual only where the
    // layouts are related, and a related layout's bends were already placed by the file.
    await element.session.positions.set(entries);
    await element.session.positions.pin(entries.map((e) => e.id));
    // between unrelated layouts, framed as graphty frames a drawing it loads: the program's spacing can be wider or
    // narrower than graphty's own
    if (fit === null) {
        element.zoomToFit();
    }
    await element.waitForSettled();
    await element.waitForStableFrame();
    return true;
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
    const { element, sha256, command } = await mountSample(
        sample,
        ORACLE_CANVAS,
        oracleGraphName(meta),
        oracleFormatOptions(meta, sample.format),
    );
    const first = await compareWithOracle(id, element, sha256, command);
    const { report, association, graphty, width, height } = first;
    const scores = { ...first.scores };
    const pngUrl = await oraclePngUrl(id);
    const shot = captureCanvas(element);
    const raster = pngUrl === undefined ? null : await rasterCompare(shot, pngUrl, { width, height }, graphty, report);
    // The raster regions are reported like every property, at 2 places (a region's similarity is a mean over its
    // pixels, which a renderer's antialiasing moves in the third), and only where the layouts are related: between
    // unrelated layouts the regions of one drawing fall on nothing of the other. They never fail a sample.
    // A sheet judged per setting has no raster score: a region's similarity is a mean over every element in it, whatever
    // reference judges each one's properties, so no one drawing can judge it.
    if (raster !== null && report.transform?.unrelatedLayout === false && first.references.length === 0) {
        for (const r of RASTER_REGIONS) {
            const sim = raster.regions[r].similarity;
            if (sim !== null) {
                scores[`raster.${r}`] = Math.floor(sim * 100) / 100;
            }
        }
    }
    const scenes = { oracle: association.scene, graphty };
    let second: OracleComparison | null = null;
    if (await matchPositions(element, first, meta.mirrored === true)) {
        second = await compareWithOracle(id, element, sha256, `${command}; nodes moved to the oracle's positions`);
    }
    const matched: OracleScored | null =
        second === null ? null : { report: second.report, scores: { ...second.scores } };
    const base = ORACLE_BASELINE === undefined ? null : await readJson<BaselineReport>(`${ORACLE_BASELINE}/${id}.json`);
    const baseline = base === null ? undefined : await rejudge(id, base, first.inputs);
    const pm = base?.positionMatched;
    if (matched !== null && second !== null && pm?.graphty !== undefined) {
        matched.baseline = await rejudge(
            id,
            {
                failures: pm.report.failures,
                judged: pm.report.judged,
                scores: pm.scores,
                scenes: { graphty: pm.graphty },
            },
            second.inputs,
        );
    }
    if (options.write) {
        await commands.writeFile(`${ORACLE_OUT}/${id}.graphty.png`, shot, { encoding: "base64" });
        // between unrelated layouts the oracle carried into graphty's frame is the fit of two unrelated arrangements
        // (json-vis-siblings: stretched 4x and turned 106 degrees), no picture of anything: the report page shows the
        // program's own drawing beside graphty's instead
        if (raster !== null && report.transform?.unrelatedLayout === false) {
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
        // graphty's drawing with its nodes moved is kept with the report: whether a routed edge follows its moved node
        // is read off it, not guessed from the scores, and a later run judges it again as its baseline
        const positionMatched =
            matched === null || second === null
                ? null
                : { report: matched.report, scores: matched.scores, graphty: second.graphty };
        await commands.writeFile(
            `${ORACLE_OUT}/${id}.json`,
            `${JSON.stringify({ ...report, oracleMeta: meta, raster: rasterSummary, scores, positionMatched, scenes, references: referencesOf(first, second) }, null, 1)}\n`,
        );
    }
    const own: OracleScored = { report, scores, ...(baseline === undefined ? {} : { baseline }) };
    const parts = partsOf(id, first, own, isStandIn(meta));
    if (matched !== null && second !== null) {
        parts.push(...partsOf(matchedKey(id), second, matched, isStandIn(meta)));
    }
    return {
        ...own,
        sha256,
        oracleSha256: oracleFileSha256(meta),
        standIn: isStandIn(meta),
        matched,
        parts,
    };
}

/**
 * For the report files: which reference judged what of a sheet judged per setting, each with its report, its
 * position-matched report and its drawing.
 * @param first - the comparison
 * @param second - the position-matched comparison, or null
 * @returns one entry per reference, empty for any other sample
 */
function referencesOf(first: OracleComparison, second: OracleComparison | null): unknown[] {
    return first.references.map((r, i) => ({
        reference: r.reference,
        meta: r.meta,
        report: r.report,
        scores: r.scores,
        positionMatched: second?.references[i]?.report ?? null,
        scene: r.scene,
    }));
}

/** What a run's report file keeps that a later run judges again: its judgement and graphty's drawing. */
interface BaselineReport {
    failures: OracleReport["failures"];
    judged?: OracleReport["judged"];
    scores: Record<string, number>;
    scenes: { graphty: PScene };
    positionMatched?: { report: OracleReport; scores: Record<string, number>; graphty?: PScene } | null;
}

/**
 * A baseline drawing as its own run judged it, and as this run's comparator judges it. The raster regions are not
 * compared again (the baseline's picture is not re-read): they keep the baseline's own values on both sides.
 * @param id - the sample
 * @param base - the baseline report
 * @param inputs - this run's comparison inputs for the sample
 * @returns both judgements
 */
async function rejudge(
    id: string,
    base: Pick<BaselineReport, "failures" | "judged" | "scores" | "scenes">,
    inputs: JudgeInputs,
): Promise<Baseline> {
    const again = await judgeDrawing(id, base.scenes.graphty, inputs);
    const raster = Object.fromEntries(Object.entries(base.scores).filter(([p]) => p.startsWith("raster.")));
    return {
        recorded: { failures: base.failures, judged: base.judged, scores: base.scores },
        rejudged: {
            failures: again.report.failures,
            judged: again.report.judged,
            scores: { ...again.scores, ...raster },
        },
    };
}

/** The committed records the oracle gate reads: the known failures and the recorded pass rates. */
export interface OracleStored {
    known: KnownRecords;
    floors: Floors;
    standInFloors: Floors;
    specificationFloors: Floors;
}

/**
 * Reads the known failures and the recorded pass rates.
 * @returns them
 */
export async function readOracleStored(): Promise<OracleStored> {
    const f = (await readJson<Partial<Record<FloorSection, Floors>>>(ORACLE_FLOORS)) ?? {};
    const k = (await readJson<Partial<KnownRecords>>(ORACLE_KNOWN_FAILURES)) ?? {};
    return {
        known: { about: k.about ?? "", known: k.known ?? {}, reasons: k.reasons ?? [] },
        floors: f.floors ?? {},
        standInFloors: f.standInFloors ?? {},
        specificationFloors: f.specificationFloors ?? {},
    };
}

const judgementOf = (scored: OracleScored): Judgement => ({
    failures: scored.report.failures,
    judged: scored.report.judged,
    scores: scored.scores,
});

/**
 * The verdicts of every key a run measured (`judgeKey`): the sample, its position-matched comparison, and for a sheet
 * judged per setting each reference's: which elements fail that the known failures do not list, and the report beside
 * the recorded values.
 * @param run - its measurement
 * @param stored - the committed records
 * @returns one verdict per key
 */
export function gateRun(run: OracleRun, stored: OracleStored): KeyGate[] {
    return run.parts.map(({ key, section, scored }) =>
        judgeKey(
            key,
            judgementOf(scored),
            stored.known.known[key],
            stored[section][key] ?? stored.floors[key] ?? stored.standInFloors[key] ?? stored.specificationFloors[key],
            { baseline: scored.baseline, section, gpu: GPU },
        ),
    );
}

/**
 * Writes a run's verdicts and report (`ORACLE_GATE`, and the same as text beside it), which the ratchet reads.
 * @param gates - every key's verdict
 */
export async function writeOracleGate(gates: readonly KeyGate[]): Promise<void> {
    const file = { gpu: GPU, baseline: ORACLE_BASELINE ?? null, keys: gates };
    await commands.writeFile(ORACLE_GATE, `${JSON.stringify(file)}\n`);
    await commands.writeFile(`${ORACLE_OUT}/gate.txt`, gateReportText(gates, GPU, ORACLE_BASELINE ?? null));
}
