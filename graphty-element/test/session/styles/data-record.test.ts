/**
 * @file A record from data (`node.recordData`): table cells and points, a header, rule and zebra rows, a cap with
 * its "+n" row, text entries, missing values dropped or written as text, markup in data escaped, and the refusals
 * beside a layer's own table or texts.
 */

import { assert, describe, it } from "vitest";

import type { RecordData } from "../../../src/catalog/data-lists";
import { createGraphSession } from "../../../src/session";

type Session = ReturnType<typeof createGraphSession>;

/**
 * A session holding one node, with one record layer over it.
 * @param node - The node.
 * @param record - The record spec.
 * @returns The session.
 */
async function recordOf(node: Record<string, unknown>, record: RecordData): Promise<Session> {
    const session = createGraphSession();
    await session.data.addNodes([node]);
    await session.styles.add({
        name: "Record",
        target: "node",
        selector: { match: "everything" },
        set: { "node.recordData": record },
    });
    await session.styles.settled();
    return session;
}

interface Table {
    readonly rows: readonly {
        readonly rule?: boolean;
        readonly cells: readonly {
            readonly colspan?: number;
            readonly align?: string;
            readonly fill?: string;
            readonly lines: readonly { readonly text: string }[];
        }[];
    }[];
}

/**
 * The table the node draws.
 * @param session - The session.
 * @returns The table.
 */
function tableOf(session: Session): Table {
    const merged = session.styles.explain({ node: "n" }).merged as Record<string, unknown>;
    return JSON.parse(String(merged["node.labelTable"])) as Table;
}

/**
 * The words of each row's cells.
 * @param table - The table.
 * @returns The words.
 */
function words(table: Table): string[][] {
    return table.rows.map((row) => row.cells.map((cell) => cell.lines.map((line) => line.text).join("")));
}

const GENE = { id: "n", gene: "TP53", degree: 34, logFC: -2.31, padj: 3.2e-8, note: "<b>hi" };

describe("a record from data", () => {
    it("lays rows out as name and value cells, numbers right-aligned, in each entry's format", async () => {
        const session = await recordOf(GENE, {
            entries: [
                { field: "data.degree" },
                { field: "data.logFC", format: { signDisplay: "always" } },
                { field: "data.padj", format: { notation: "scientific", maximumFractionDigits: 1 }, label: "p" },
            ],
        });
        const table = tableOf(session);
        assert.deepStrictEqual(words(table), [
            ["degree", "34"],
            ["logFC", "-2.31"],
            ["p", "3.2E-8"],
        ]);
        assert.strictEqual(table.rows[0].cells[1].align, "right");
    });

    it("puts a header first, draws rules or zebra rows, and caps the rows with a +n row", async () => {
        const lines = await recordOf(GENE, {
            entries: [{ field: "data.degree" }, { field: "data.logFC" }, { field: "data.padj" }],
            header: "data.gene",
            rows: "lines",
            most: 2,
        });
        const table = tableOf(lines);
        assert.deepStrictEqual(words(table)[0], ["TP53"]);
        assert.strictEqual(table.rows[0].cells[0].colspan, 2);
        assert.deepStrictEqual(words(table).at(-1), ["+1"]);
        assert.strictEqual(table.rows.length, 4);
        assert.strictEqual(table.rows[1].rule, true);

        const zebra = await recordOf(GENE, {
            entries: [{ field: "data.degree" }, { field: "data.logFC" }],
            rows: "zebra",
        });
        assert.strictEqual(tableOf(zebra).rows[1].cells[0].fill !== undefined, true);
        assert.strictEqual(tableOf(zebra).rows[0].cells[0].fill, undefined);
    });

    it("writes text entries, drops a missing row or writes its text, and escapes markup in data", async () => {
        const session = await recordOf(GENE, {
            entries: [
                { text: "Cluster" },
                { field: "data.none" },
                { field: "data.gone", missing: { text: "n/a" } },
                { field: "data.note" },
            ],
        });
        assert.deepStrictEqual(words(tableOf(session)), [["Cluster"], ["gone", "n/a"], ["note", "<lt>b>hi"]]);
    });

    it("draws points as the value alone at each row's point, in its color", async () => {
        const session = await recordOf(GENE, {
            layout: "points",
            entries: [{ field: "data.degree", at: [0, 0.5], color: "#ff0000" }, { field: "data.gene" }],
        });
        const merged = session.styles.explain({ node: "n" }).merged as Record<string, unknown>;
        assert.deepStrictEqual(JSON.parse(String(merged["node.shapeTexts"])), [
            [0, 0.5, "34", { color: "#ff0000" }],
            ["TP53"],
        ]);
        assert.strictEqual(merged["node.labelTable"], undefined);
    });

    it("refuses its table layout beside the layer's own table, and its points beside the layer's own texts", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "n" }]);
        const reasonOf = async (set: Record<string, unknown>): Promise<unknown> => {
            try {
                await session.styles.add({ name: "R", target: "node", selector: { match: "everything" }, set });
            } catch (error) {
                return (error as { details?: { reason?: unknown } }).details?.reason;
            }

            return undefined;
        };
        assert.strictEqual(
            await reasonOf({ "node.recordData": { entries: [] }, "node.labelTable": "{}" }),
            "data-and-fixed",
        );
        assert.strictEqual(
            await reasonOf({ "node.recordData": { entries: [], layout: "points" }, "node.shapeTexts": "[]" }),
            "data-and-fixed",
        );
        assert.strictEqual(
            await reasonOf({ "node.recordData": { entries: [], layout: "points" }, "node.labelTable": "{}" }),
            undefined,
            "points fill the texts, so the layer may hold its own table",
        );
    });
});
