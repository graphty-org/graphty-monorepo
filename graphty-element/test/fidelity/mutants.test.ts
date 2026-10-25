/**
 * The planted-defect test of the oracle comparator: plants one visual defect at a time in graphty's drawn primitives
 * just before the comparison, and asserts that the comparison catches every defect on every sample it changes: an
 * element fails a property it passes unplanted, or the floors fail where the unplanted run passes them (a property
 * falls below its floor, is judged with no floor, or an element fails that the known failures do not list). A
 * planted defect the floors pass is a blind spot of the comparator: fix the comparator, never the defect. A defect
 * is excused only where it cannot test anything: where it changes nothing, where it lands only on elements already
 * failing the property it is for (`absorbedByKnownFailures`), or where it cannot be planted (a mirror or a turn
 * between unrelated layouts).
 *
 * The default samples between them exercise every planted defect the drawings can show, and the last test asserts
 * that: every defect is caught on at least one of them, except the few no sample can exercise yet (`UNTESTABLE`,
 * each with its reason), which must stay uncaught until their reason is gone.
 *
 * About twenty minutes on the workstation GPU, so it runs in the fidelity project only, not in CI or the pre-push
 * gate (no pull request runs the fidelity project):
 *
 *     GRAPHTY_BROWSER_GPU=nvidia npx vitest run --project=fidelity test/fidelity/mutants.test.ts
 *
 * VITE_MUTANT_IDS (comma-separated sample ids, or "all") and VITE_MUTANT_ONLY (|-separated defect names) narrow or
 * widen a run; each sample's outcomes land in tmp/<VITE_MUTANT_OUT, default comparator-mutants>/<sample id>.json.
 */
import { afterEach, assert, describe, it } from "vitest";
import { commands } from "vitest/browser";

import { CORPUS_SAMPLES } from "../../../graph-io/test/fidelity/corpus-samples";
import { SAMPLES } from "../../../graph-io/test/fidelity/samples";
import { SPECIMEN_SAMPLES } from "../../../graph-io/test/fidelity/specimens/index";
import { mountSample, unmount } from "./mount";
import { absorbedByKnownFailures, MUTATIONS } from "./mutations";
import { type OracleReport, withoutCaptions } from "./oracle/compare-oracle";
import {
    compareWithOracle,
    isStandIn,
    ORACLE_CANVAS,
    oracleFormatOptions,
    oracleGraphName,
    oracleMeta,
} from "./oracle/oracle-library";
import type { PScene } from "./oracle/primitives";
import { checkFloors, partsOf, readOracleFloors } from "./oracle/run-oracle";

/**
 * The samples that between them exercise every planted defect: synthetic files, and the specimen sheets that hold
 * what they lack (label backgrounds and wrapped labels, edge-label placement, group outlines and opacity, edge
 * patterns, annotations, outer rings). cx-syn-mappings, and the same Cytoscape desktop network saved as CX2 and as a
 * session, catch nothing the specimen sheets do not and take about eight minutes each; VITE_MUTANT_IDS=all adds them.
 */
const DEFAULT_IDS = [
    "cx-syn-bypass",
    "cx-specimen-edges-lines",
    "cytoscapejs-specimen-node-fills-borders",
    "json-cyjs-synth-edges-saved",
    "json-cyjs-synth-nodes",
    "gexf-miserables",
    "gexf-synth-nx-viz",
    "graphml-synthetic-nodes",
    "graphml-synthetic-edges",
    "dot-synth-nodes",
    "json-vis-synth",
    "xgmml-syn-bypass",
    "dot-synth-edges-clusters",
    "cytoscapejs-specimen-edge-labels",
    "cytoscapejs-specimen-edges-lines",
    "cytoscapejs-specimen-groups",
    "cytoscapejs-specimen-labels-p2",
    "vis-network-specimen-arrows",
    "gml-specimen-groups",
];
const ALL_IDS = [...DEFAULT_IDS, "cx-syn-mappings", "cx2-syn-mappings", "cys-syn-mappings"];
const ONLY = (import.meta.env.VITE_MUTANT_ONLY as string | undefined)?.split("|");

/**
 * Planted defects no sample can exercise yet, and why: graphty draws nothing they could change where the oracle
 * draws the same (graph-io/test/fidelity/oracles/ISSUES.md, "Not testable yet"). Each must be caught as soon as its
 * reason is gone, so the last test fails if one is caught: then take it off this list.
 */
const UNTESTABLE: Readonly<Record<string, string>> = {
    "node gradient removed":
        "graphty draws no gradient where an oracle draws the same one (Cytoscape.js background-fill gradients are not imported)",
    "label background removed": "graph-io's style vocabulary has no label background, so graphty draws none",
    "label background opacity 0.5": "graph-io's style vocabulary has no label background, so graphty draws none",
    "label background border opacity 0.5": "graph-io's style vocabulary has no label background, so graphty draws none",
    "label background border added": "graph-io's style vocabulary has no label background, so graphty draws none",
    "label outline removed": "graph-io's style vocabulary has no label outline, so graphty draws none",
    "label outline opacity 0.5": "graph-io's style vocabulary has no label outline, so graphty draws none",
};
/** Every defect caught on some sample this run. */
const caughtSomewhere = new Set<string>();
const ASKED = (import.meta.env.VITE_MUTANT_IDS as string | undefined) ?? DEFAULT_IDS.join(",");
const IDS = ASKED === "all" ? ALL_IDS : ASKED.split(",");

/**
 * Every element failing a property, as "property id".
 * @param report - a comparison
 * @returns the pairs
 */
const failingPairs = (report: OracleReport): Set<string> =>
    new Set(Object.entries(report.failures).flatMap(([p, ids]) => (ids ?? []).map((x) => `${p} ${x}`)));

afterEach(() => {
    unmount();
});

const stored = await readOracleFloors();

describe("comparator mutants", () => {
    it.each(IDS)("%s", async (id) => {
        const sample = [...SAMPLES, ...CORPUS_SAMPLES, ...SPECIMEN_SAMPLES].find((s) => s.id === id);
        if (sample === undefined) {
            throw new Error(`${id} is not a sample`);
        }
        const meta = oracleMeta(id);
        const { element, sha256, command } = await mountSample(
            sample,
            ORACLE_CANVAS,
            oracleGraphName(meta),
            oracleFormatOptions(meta, sample.format),
        );
        const out: Record<string, unknown> = {};
        const baseline = new Set<string>();
        let base: OracleReport | null = null;
        let oracle: PScene | null = null;
        // an oracle that records only where its program drew the nodes, or the labels' words and not their geometry
        // (a raster), cannot judge the rest: a defect only there is not judged by it
        let blind = false;
        const missed: string[] = [];
        for (const [name, { mutate, targets, applies }] of Object.entries(MUTATIONS)) {
            if (ONLY !== undefined && name !== "none" && !ONLY.includes(name)) {
                continue;
            }
            // the property it is for first: the rest are what it is judged after
            if (base !== null && blind && targets.length > 0 && base.properties[targets[0]].n === 0) {
                out[name] = { outcome: "not judged by this oracle" };
                continue;
            }
            if (base !== null && oracle !== null && !applies(base, oracle)) {
                out[name] = { outcome: "not plantable here" };
                continue;
            }
            let before: PScene | null = null;
            let after: PScene | null = null;
            const r = await compareWithOracle(id, element, sha256, command, (g) => {
                before = structuredClone(g);
                after = mutate(g);
                return after;
            });
            const standIn = isStandIn(oracleMeta(id));
            const { dropped, unfloored, newlyFailing } = checkFloors(
                {
                    report: r.report,
                    scores: r.scores,
                    sha256,
                    oracleSha256: null,
                    standIn,
                    matched: null,
                    parts: partsOf(id, r, r.scores, standIn),
                },
                stored,
            );
            const fresh = [...dropped.map((d) => d.split(":")[0]), ...unfloored, ...newlyFailing];
            if (base === null) {
                // the first is the unplanted run ("none"), the baseline every defect is judged against
                fresh.forEach((x) => baseline.add(x));
                base = r.report;
                oracle = r.association.scene;
                blind = r.association.scene.nodesOnly === true || r.association.scene.labelGeometry === false;
                continue;
            }
            // what the comparison judges: a specimen sheet's captions are left out on both sides
            before = before === null ? null : withoutCaptions(before);
            after = after === null ? null : withoutCaptions(after);
            if (before === null || after === null || JSON.stringify(before) === JSON.stringify(after)) {
                out[name] = { outcome: "not exercised" };
                continue;
            }
            // what the floors fail that the unplanted run does not, and every element newly failing a property: the
            // floors' own check where the sample is recorded, and the same judgement where it is not yet
            const was = failingPairs(base);
            const caughtBy = [
                ...fresh.filter((x) => !baseline.has(x)),
                ...[...failingPairs(r.report)].filter((x) => !was.has(x)),
            ];
            let outcome = "caught";
            if (caughtBy.length === 0) {
                outcome = absorbedByKnownFailures(before, after, base, targets)
                    ? "absorbed by known failures"
                    : "MISSED";
            }
            if (outcome === "MISSED") {
                missed.push(name);
            }
            if (outcome === "caught") {
                caughtSomewhere.add(name);
            }
            out[name] = { outcome, caughtBy: caughtBy.slice(0, 20), scores: r.scores };
        }
        await commands.writeFile(
            `tmp/${(import.meta.env.VITE_MUTANT_OUT as string | undefined) ?? "comparator-mutants"}/${id}.json`,
            `${JSON.stringify(out, null, 1)}\n`,
        );
        assert.deepEqual(missed, [], `${id}: planted defects the oracle comparator passes`);
    });

    // only a run of the default samples and every defect says whether they exercise every defect
    it.runIf(ASKED === DEFAULT_IDS.join(",") && ONLY === undefined)("catches every defect on some sample", () => {
        const defects = Object.keys(MUTATIONS).filter((n) => n !== "none");
        assert.deepEqual(
            defects.filter((n) => !caughtSomewhere.has(n) && !(n in UNTESTABLE)),
            [],
            "planted defects no default sample catches: add a sample that exercises them to DEFAULT_IDS",
        );
        assert.deepEqual(
            defects.filter((n) => caughtSomewhere.has(n) && n in UNTESTABLE),
            [],
            "planted defects now caught: take them off UNTESTABLE",
        );
    });
});
