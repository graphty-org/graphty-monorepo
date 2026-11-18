/**
 * @file The rejected and unmatched rows of an import, each with its reason and line, before the
 * load (`LoadDraft.rows`) and after it (`data.lastImport().rows`), capped at `IMPORT_ROWS_KEPT`.
 */
import { assert, describe, it } from "vitest";

import { IMPORT_ROWS_KEPT } from "../../src/data/report";
import { createGraphSession } from "../../src/session";

const PEOPLE = "id,name\na,Ann\n,Nobody\nb,Bo\n";
const TIES = "source,target\na,b\n,b\na,z\n";

describe("the rejected and unmatched rows of an import", () => {
    it("gives each rejected and unmatched row its line and reason, before and after the load", async () => {
        const session = createGraphSession();
        const draft = await session.data.prepare({
            config: { nodeFile: new File([PEOPLE], "people.csv"), edgeFile: new File([TIES], "ties.csv") },
        });

        const rejectedNodes = await draft.rows("nodes", { only: "rejected" });
        const rejectedEdges = await draft.rows("edges", { only: "rejected" });
        const unmatched = await draft.rows("edges", { only: "unmatched" });
        // The node row with no id is keyless, not rejected: it makes a node of its own.
        assert.deepEqual(rejectedNodes.records, []);
        assert.deepEqual(
            rejectedEdges.records.map((row) => [row.line, row.reason]),
            [[3, { code: "refused-row", params: { rowsAre: "edges", ends: ["source"] } }]],
        );
        assert.deepEqual(
            unmatched.records.map((row) => [row.line, row.reason]),
            [[4, { code: "unknown-end", params: { ends: ["target"], ids: ["z"] } }]],
        );

        await draft.load();
        const rows = session.data.lastImport()?.rows;
        assert.deepEqual(
            rows?.rejected.map((row) => [row.line, row.reason?.code, row.reason?.params.rowsAre]),
            [[3, "refused-row", "edges"]],
        );
        assert.deepEqual(
            rows?.unmatched.map((row) => [row.line, row.values.target, row.missingEnds, row.reason]),
            [[4, "z", ["target"], { code: "unknown-end", params: { ends: ["target"], ids: ["z"] } }]],
        );
        session.dispose();
    });

    it("has no rows for a clean load", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "csv", config: { data: "source,target\na,b\n" } });
        assert.isUndefined(session.data.lastImport()?.rows);
        session.dispose();
    });

    it("keeps the first IMPORT_ROWS_KEPT rejected rows of a large file and counts the rest", async () => {
        const session = createGraphSession();
        const bad = IMPORT_ROWS_KEPT + 50;
        // An edge row with no source is refused.
        const text = `source,target,name\n${Array.from({ length: bad }, (_, i) => `,b,n${i}`).join("\n")}\na,b,Ok\n`;
        const draft = await session.data.prepare({ type: "csv", config: { data: text } });
        assert.strictEqual((await draft.rows("rows", { only: "rejected", offset: bad - 1 })).records[0].line, bad + 1);
        await draft.load();
        const report = session.data.lastImport();
        assert.strictEqual(report?.counts.rejected, bad);
        assert.strictEqual(report?.rows?.rejected.length, IMPORT_ROWS_KEPT);
        assert.strictEqual(report?.rows?.rejected[0].values.name, "n0");
        session.dispose();
    });
});
