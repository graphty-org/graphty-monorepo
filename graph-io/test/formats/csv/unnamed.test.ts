/**
 * @file The `unnamed` option: a table whose header names neither endpoints nor an id, read as nodes by
 * its values.
 */

import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import {
    csvImporter,
    NO_ENDPOINT_COLUMNS_CODE,
    NO_UNIQUE_ID_CODE,
    ROWS_AS_NODES_CODE,
} from "../../../src/formats/csv/importer.js";
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

    it("keeps the first row of a guessed key that repeats, and gives the row left out", async () => {
        const text =
            "protein_id,symbol\n" + Array.from({ length: 39 }, (_, i) => `P${i},S${i}`).join("\n") + "\nP0,again\n";
        const { snapshot, report } = await load(text, { unnamed: "nodes" });
        expect(report.resolved).toEqual({ idColumn: "protein_id" });
        expect(snapshot.nodeCount).toBe(39);
        const symbol = snapshot.nodes.get("symbol");
        expect(symbol?.value(snapshot.ids.indexOf("P0"))).toBe("S0");
        const repeats = report.issues.filter((issue) => issue.code === "W_DUPLICATE_NODE");
        expect(repeats.map((issue) => [issue.line, issue.element, issue.params])).toEqual([
            [41, "P0", { record: { protein_id: "P0", symbol: "again" } }],
        ]);
    });

    it("says the rows were read as nodes when the header names neither ends nor an id", async () => {
        const said = async (input: string): Promise<unknown[]> =>
            (await load(input, { unnamed: "nodes" })).report.issues
                .filter((issue) => issue.code === ROWS_AS_NODES_CODE)
                .map((issue) => issue.params);
        expect(await said("payer,payee,tx\n1,2,t1\n2,3,t2\n3,1,t3\n")).toEqual([{ columns: ["payer", "payee", "tx"] }]);
        expect(await said("value,kind\na,x\na,y\nb,x\n")).toHaveLength(1);
        expect(await said("person_id,name\np1,a\np2,b\n")).toEqual([]);
        expect(await said("source,target\na,b\n")).toEqual([]);
    });

    it("still stops on two columns that mostly name the same things, which are an edge list's ends", async () => {
        expect(await failure("user,friend\na,b\nb,c\nc,a\n", { header: true, unnamed: "nodes" })).toBe(
            NO_ENDPOINT_COLUMNS_CODE,
        );
    });

    it.each([
        "citing,cited\n1,2\n3,4\n",
        "node1,node2\n1,2\n2,3\n3,1\n",
        "follower,followee,weight\n1,2,0.5\n2,3,1.5\n3,1,2.5\n",
        "left,right,kind\n1,2,x\n2,3,x\n3,1,y\n",
    ])("still stops on an edge list of numbers: %j", async (input) => {
        expect(await failure(input, { header: true, unnamed: "nodes" })).toBe(NO_ENDPOINT_COLUMNS_CODE);
    });

    it("changes nothing of a table whose header names its ends or its id", async () => {
        expect((await load("source,target\na,b\n", { unnamed: "nodes" })).snapshot.edgeCount).toBe(1);
        expect((await load("id,name\na,b\n", { unnamed: "nodes" })).snapshot.nodeCount).toBe(1);
        expect(await failure("a,b\n", { unnamed: "rows" as "nodes" })).toMatchObject({ code: "E_UNSUPPORTED" });
    });
});
