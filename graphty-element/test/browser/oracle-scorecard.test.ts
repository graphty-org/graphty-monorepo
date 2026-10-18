/**
 * The style fidelity scorecard against the programs' REAL drawings, CI tier: the samples below,
 * each mounted in a real `<graphty-element>` at the oracle canvas size and compared, property by
 * property, with the program's own SVG export of the same file (`graph-io/test/fidelity/oracles/`,
 * compared by `test/fidelity/oracle/`), every pass rate held to its floor in
 * `test/fidelity/oracle-floors.json`. The floors only ratchet up, so a regression fails CI.
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

/**
 * The CI set: one or more samples per program whose comparison took under 3 s on the workstation
 * (the full run takes 2 to 26 s a sample): Cytoscape desktop (CX, CX2, XGMML, GML), Graphviz,
 * Gephi, draw.io standing in for yEd, Cytoscape.js, vis-network and Pajek.
 */
const CI_ORACLES: readonly string[] = [
    "cx-repro-locked-own-size",
    "cx-repro-unplaced-boxes",
    "cx2-repro-shared-interaction",
    "cx2-u2os-hierarchy",
    "cyjs-genemania",
    "cyjs-glycolysis",
    "dot-real-crazy",
    "dot-real-happiness",
    "dot-real-linux-kernel",
    "gexf-miserables",
    "gml-dunnart-autobahn",
    "gml-dunnart-planar-orthogonal",
    "gml-jgrapht-grid-territorio",
    "gml-visualgraph-tree30",
    "gml-yed-pmodel",
    "graphml-libcitygml-mapping",
    "graphml-open-archaeo",
    "graphml-yed-voctomix",
    "json-cyjs-synth-edges",
    "json-vis-synth",
    "json-vis-transparency",
    "pajek-c",
    "pajek-football",
    "pajek-kdorola",
    "xgmml-dream4-signaling",
    "xgmml-gcmodeller-demo",
    "xgmml-repro-name-only-labels",
];

const stored = await readOracleFloors();

afterEach(() => {
    unmount();
});

describe("style fidelity against the programs' own SVG drawings", () => {
    it("names only samples that have an oracle and a floor", () => {
        assert.deepEqual(
            CI_ORACLES.filter((id) => !ORACLE_IDS.includes(id) || stored.floors[id] === undefined),
            [],
        );
    });

    it.each(CI_ORACLES)("%s", async (id) => {
        const run = await runOracle(id, { write: false });
        const { dropped, unfloored } = checkFloors(id, run, stored);
        assert.deepEqual(dropped, [], `${id}: a property fell below its floor in oracle-floors.json`);
        assert.deepEqual(unfloored, [], `${id}: a property is judged that has no floor; record the floors`);
    });
});
