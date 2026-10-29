/**
 * The full oracle scorecard: every sample with an oracle SVG in `graph-io/test/fidelity/oracles/`
 * (the program's own SVG export of the committed file), compared with graphty's drawing of it
 * property by property and region by region (`test/fidelity/oracle/`), each report written to
 * `tmp/oracle-report/` with graphty's canvas, the oracle aligned into graphty's frame and the two
 * overlaid. A few large samples take longer than a browser shard's budget, so this runs in the `fidelity` project, by
 * hand:
 *
 *     npx vitest run --project=fidelity test/fidelity/oracle-report.test.ts
 *     node scripts/oracle-report.mjs            # the report pages
 *     npm run fidelity:ratchet                  # take what passes now off the known failures, raise the floors
 *
 * Each sample is judged twice: as graphty draws it, and with graphty's nodes moved to where the program drew them
 * (`<sample>@matched`), so style is judged apart from layout. A sample fails only when an element fails a property that
 * `test/fidelity/oracle-known-failures.json` does not list for it (`oracle/floors.ts`). The pass rates are a report
 * (`tmp/oracle-report/gate.txt`, against `test/fidelity/oracle-floors.json`), never a gate. With
 * `GRAPHTY_ORACLE_BASELINE=<an earlier run's report directory>` each sample's earlier drawing is judged again by this
 * comparator, and every change is said to come from the drawing or from the comparator. The CI subset is
 * `test/browser/oracle-scorecard.test.ts`.
 */
import { afterAll, afterEach, assert, describe, it } from "vitest";

import { unmount } from "./mount";
import { gateMessages, type KeyGate } from "./oracle/floors";
import {
    gateRun,
    ORACLE_IDS,
    oraclesWithoutMetadata,
    readOracleStored,
    runOracle,
    writeOracleGate,
} from "./oracle/run-oracle";

const stored = await readOracleStored();
const gates: KeyGate[] = [];

afterEach(() => {
    unmount();
});

describe("style fidelity against the programs' own SVG drawings (every oracle)", () => {
    it("has metadata beside every oracle", () => {
        assert.deepEqual(oraclesWithoutMetadata(), []);
    });

    it.each(ORACLE_IDS)("%s", async (id) => {
        const run = await runOracle(id, { write: true });
        if (run.oracleSha256 !== null) {
            assert.strictEqual(
                run.oracleSha256,
                run.sha256,
                `${id}: the oracle was drawn from another file than the committed sample`,
            );
        }
        const verdicts = gateRun(run, stored);
        gates.push(...verdicts);
        assert.deepEqual(
            verdicts.flatMap(gateMessages),
            [],
            `${id}: an element fails that oracle-known-failures.json does not list`,
        );
    });

    afterAll(async () => {
        await writeOracleGate(gates);
    });
});
