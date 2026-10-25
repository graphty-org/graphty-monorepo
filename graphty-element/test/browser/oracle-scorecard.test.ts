/**
 * The style fidelity scorecard against the programs' REAL drawings, CI tier: the samples below,
 * each mounted in a real `<graphty-element>` at the oracle canvas size and compared, property by
 * property, with the program's own SVG export of the same file (`graph-io/test/fidelity/oracles/`,
 * compared by `test/fidelity/oracle/`), region by region with its rasterized PNG, and again with graphty's nodes at the
 * program's own positions, every pass rate held to its floor in `test/fidelity/oracle-floors.json` and every element
 * that fails a property listed in `test/fidelity/oracle-known-failures.json`. Both only ratchet, so a regression fails CI.
 *
 * The set is the oracles whose comparison fits a browser shard's budget under SwiftShader; every
 * oracle, with the raster comparison and the report pages, is `test/fidelity/oracle-report.test.ts`
 * (the `fidelity` project). Record floors after a fix with
 *
 *     GRAPHTY_FIDELITY_RECORD=1 npx vitest run --project=fidelity test/fidelity/oracle-report.test.ts
 */
import { afterEach, assert, describe, it } from "vitest";

import { unmount } from "../fidelity/mount";
import { checkFloors, ORACLE_IDS, readOracleFloors, runOracle } from "../fidelity/oracle/run-oracle";
import CI_SAMPLES from "./oracle-scorecard-samples.json";

/**
 * The CI set: one or more samples per program whose comparison took under 3 s on the workstation
 * (the full run takes 2 to 26 s a sample): Cytoscape desktop (CX, CX2, XGMML, GML), Graphviz,
 * Gephi, draw.io standing in for yEd, Cytoscape.js, vis-network and Pajek. The list is a JSON file so CI's test job
 * can fetch exactly these oracles' pictures from Git LFS for the raster comparison (`.github/workflows/ci.yml`).
 */
const CI_ORACLES: readonly string[] = CI_SAMPLES;

const stored = await readOracleFloors();

afterEach(() => {
    unmount();
});

describe("style fidelity against the programs' own SVG drawings", () => {
    it("names only samples that have an oracle and a floor", () => {
        assert.deepEqual(
            CI_ORACLES.filter(
                (id) => !ORACLE_IDS.includes(id) || (stored.floors[id] ?? stored.standInFloors[id]) === undefined,
            ),
            [],
        );
    });

    it.each(CI_ORACLES)("%s", async (id) => {
        const run = await runOracle(id, { write: false });
        const { dropped, unfloored, newlyFailing } = checkFloors(run, stored);
        assert.deepEqual(dropped, [], `${id}: a property fell below its floor in oracle-floors.json`);
        assert.deepEqual(unfloored, [], `${id}: a property is judged that has no floor; record the floors`);
        assert.deepEqual(newlyFailing, [], `${id}: an element fails that oracle-known-failures.json does not list`);
    });
});
