/**
 * The style fidelity scorecard against the programs' REAL drawings, CI tier: the samples below,
 * each mounted in a real `<graphty-element>` at the oracle canvas size and compared, property by
 * property, with the program's own SVG export of the same file (`graph-io/test/fidelity/oracles/`,
 * compared by `test/fidelity/oracle/`), region by region with its rasterized PNG, and again with graphty's nodes at the
 * program's own positions. A sample fails when an element fails a property that
 * `test/fidelity/oracle-known-failures.json` does not list for it; pass rates are never a gate here.
 *
 * The set is the oracles whose comparison fits a browser shard's budget under SwiftShader; every
 * oracle, with the raster comparison and the report pages, is `test/fidelity/oracle-report.test.ts`
 * (the `fidelity` project). After a fix, run it and take what passes now off the known failures with
 *
 *     npx vitest run --project=fidelity test/fidelity/oracle-report.test.ts && npm run fidelity:ratchet
 */
import { afterEach, assert, describe, it } from "vitest";

import { unmount } from "../fidelity/mount";
import { gateMessages } from "../fidelity/oracle/floors";
import { gateRun, ORACLE_IDS, readOracleStored, runOracle } from "../fidelity/oracle/run-oracle";
import CI_SAMPLES from "./oracle-scorecard-samples.json";

/**
 * The CI set: one or more samples per program whose comparison took under 3 s on the workstation
 * (the full run takes 2 to 26 s a sample): Cytoscape desktop (CX, CX2, XGMML, GML), Graphviz,
 * Gephi, draw.io standing in for yEd, Cytoscape.js, vis-network and Pajek. The list is a JSON file so CI's test job
 * can fetch exactly these oracles' pictures from Git LFS for the raster comparison (`.github/workflows/ci.yml`).
 */
const CI_ORACLES: readonly string[] = CI_SAMPLES;

const stored = await readOracleStored();

afterEach(() => {
    unmount();
});

describe("style fidelity against the programs' own SVG drawings", () => {
    it("names only samples that have an oracle and a known-failures record", () => {
        assert.deepEqual(
            CI_ORACLES.filter((id) => !ORACLE_IDS.includes(id) || stored.known.known[id] === undefined),
            [],
        );
    });

    it.each(CI_ORACLES)("%s", async (id) => {
        const run = await runOracle(id, { write: false });
        assert.deepEqual(
            gateRun(run, stored).flatMap(gateMessages),
            [],
            `${id}: an element fails that oracle-known-failures.json does not list`,
        );
    });
});
