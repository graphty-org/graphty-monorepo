/**
 * @file The runnable example of "Preview a Load Before Loading It" in `docs/guide/data-sources.md`,
 * kept here so the documented code keeps working. The body is the guide's code with its comments
 * turned into assertions.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

describe("the load preview guide's example", () => {
    it("previews, fixes the weight column, and loads what it described", async () => {
        const session = createGraphSession();
        const file = new File(["source,target,trips\nx,y,10\ny,z,3\nz,x,7\n"], "trips.csv");

        const source = { config: { file } };

        const preview = await session.data.preview(source);
        assert.strictEqual(preview.format, "csv");
        const edges = preview.tables.find((table) => table.role === "edges");
        assert.strictEqual(edges?.rowCount, 3);
        assert.include(edges?.columns.map((column) => `${column.name}: ${column.role}`) ?? [], "trips: attribute");

        const mapping = { weight: "trips" };
        const checked = await session.data.preview(source, { mapping });
        assert.strictEqual(checked.weight, "trips");
        await session.data.import(source, { mapping });
        assert.deepEqual(session.data.lastImport()?.counts, checked.report.counts);

        const reads: number[] = [];
        session.on("data:progress", ({ read }) => reads.push(read));
        await session.data.import(source, { mapping });
        assert.isAbove(reads.length, 0);
        session.dispose();
    });
});
