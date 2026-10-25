/**
 * The full oracle scorecard: every sample with an oracle SVG in `graph-io/test/fidelity/oracles/`
 * (the program's own SVG export of the committed file), compared with graphty's drawing of it
 * property by property and region by region (`test/fidelity/oracle/`), each report written to
 * `tmp/oracle-report/` with graphty's canvas, the oracle aligned into graphty's frame and the two
 * overlaid, and every pass rate held to `test/fidelity/oracle-floors.json`. A few large samples
 * take longer than a browser shard's budget, so this runs in the `fidelity` project, by hand:
 *
 *     npx vitest run --project=fidelity test/fidelity/oracle-report.test.ts
 *     node scripts/oracle-report.mjs            # the report pages
 *
 * Each sample is judged twice: as graphty draws it, and with graphty's nodes moved to where the program drew them
 * (`<sample>@matched`), so style is judged apart from layout. A sample fails when a pass rate falls below its floor or
 * when any element fails a property that `test/fidelity/oracle-known-failures.json` does not list for it.
 * `GRAPHTY_FIDELITY_RECORD=1` records the floors (never lowering one) and the known failures (never adding to a
 * property already recorded). The CI subset is `test/browser/oracle-scorecard.test.ts`.
 */
import { afterAll, afterEach, assert, describe, it } from "vitest";

import { unmount } from "./mount";
import {
    checkFloors,
    ORACLE_IDS,
    type OracleRecord,
    oraclesWithoutMetadata,
    readOracleFloors,
    recordOf,
    runOracle,
    writeOracleFloors,
} from "./oracle/run-oracle";

const RECORD = (import.meta.env.GRAPHTY_FIDELITY_RECORD as string | undefined) === "1";
const stored = await readOracleFloors();
const recorded: OracleRecord = {};

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
        Object.assign(recorded, recordOf(run));
        if (RECORD) {
            return;
        }
        const { dropped, unfloored, newlyFailing } = checkFloors(run, stored);
        assert.deepEqual(dropped, [], `${id}: a property fell below its floor in oracle-floors.json`);
        assert.deepEqual(unfloored, [], `${id}: a property is judged that has no floor; record the floors`);
        assert.deepEqual(newlyFailing, [], `${id}: an element fails that oracle-known-failures.json does not list`);
    });

    afterAll(async () => {
        if (RECORD) {
            await writeOracleFloors(stored, recorded);
        }
    });
});
