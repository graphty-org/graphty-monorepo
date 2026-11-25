/**
 * @file The `unnamed` option: a table whose header names neither endpoints nor an id, read as nodes by
 * its values.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { csvImporter, NO_ENDPOINT_COLUMNS_CODE, NO_UNIQUE_ID_CODE } from "../../../src/formats/csv/importer.js";
import { ImportError, type ImportReport } from "../../../src/types.js";

type Options = Parameters<typeof csvImporter.import>[2];

async function load(input: string, options?: Options): Promise<{ snapshot: GraphSnapshot; report: ImportReport }> {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    const report = await csvImporter.import(input, builder, options);
    return { snapshot: builder.freeze(), report };
}

async function failure(input: string, options?: Options): Promise<unknown> {
    try {
        await load(input, options);
    } catch (err) {
        return err instanceof ImportError ? err.issue?.code : err;
    }
    return null;
}

/** An expression table: the first column names each row, but one gene is listed twice. */
const GENES = ["symbol,log2FC", ...Array.from({ length: 39 }, (_, i) => `G${i},${i}.5`), "G0,9.5", ""].join("\n");

describe("csv unnamed option", () => {
    it("fails by default, and under unnamed: nodes keys the rows by their first nearly unique text column", async () => {
        expect(await failure(GENES)).not.toBeNull();
        const { snapshot, report } = await load(GENES, { unnamed: "nodes" });
        expect(snapshot.nodeCount).toBe(39);
        expect(snapshot.edgeCount).toBe(0);
        expect(report.resolved).toEqual({ idColumn: "symbol" });
    });

    it("keys by an id column that repeats a little, and numbers the rows when no column keys them", async () => {
        const mapped = GENES.replace("symbol,log2FC", "protein_id,log2FC");
        expect((await load(mapped, { unnamed: "nodes" })).report.resolved).toEqual({ idColumn: "protein_id" });
        const { snapshot, report } = await load("value,kind\na,x\na,y\nb,x\n", { unnamed: "nodes" });
        expect(snapshot.nodeCount).toBe(3);
        expect(report.resolved?.idColumn).toBe(undefined);
        expect(report.issues.map((issue) => issue.code)).toContain(NO_UNIQUE_ID_CODE);
    });

    it("still stops on two columns that mostly name the same things, which are an edge list's ends", async () => {
        expect(await failure("user,friend\na,b\nb,c\nc,a\n", { header: true, unnamed: "nodes" })).toBe(
            NO_ENDPOINT_COLUMNS_CODE,
        );
    });

    it("changes nothing of a table whose header names its ends or its id", async () => {
        expect((await load("source,target\na,b\n", { unnamed: "nodes" })).snapshot.edgeCount).toBe(1);
        expect((await load("id,name\na,b\n", { unnamed: "nodes" })).snapshot.nodeCount).toBe(1);
        expect(await failure("a,b\n", { unnamed: "rows" as "nodes" })).toMatchObject({ code: "E_UNSUPPORTED" });
    });
});
