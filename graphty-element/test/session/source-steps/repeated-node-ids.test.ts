/**
 * @file A node file whose key repeats keeps the first row's values, read from a web address or
 * opened as a file, and says how many rows it left out: the `repeated-id` issue without the
 * source-steps experiment, the source's `rowsLeftOut["left-out:repeated-key"]` with it.
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";

/** Proteins keyed by an id that repeats twice, the repeats naming the protein differently. */
const PROTEINS = [
    "protein_id,symbol",
    ...Array.from({ length: 38 }, (_, i) => `P-${i},S${i}`),
    "P-0,p53",
    "P-3,p16INK4a",
].join("\n");

const FEATURES = [[], ["source-steps"]] as const;

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * What a reader is told about the repeats: the issue's count, or the source's left-out count.
 * @param session - the session
 * @returns the count, or 0
 */
function told(session: GraphSession): number {
    const issue = session.data.issues().find((each) => each.code === "repeated-id");
    const source = session.data.sources()[0];
    return issue?.count ?? source?.rowsLeftOut?.["left-out:repeated-key"] ?? 0;
}

describe("a node file that repeats its key", () => {
    for (const features of FEATURES) {
        const named = features.join() || "no experiment";

        it(`read from a web address keeps the first row and says two were left out (${named})`, async () => {
            vi.spyOn(globalThis, "fetch").mockImplementation(() =>
                Promise.resolve(new Response(PROTEINS, { status: 200 })),
            );
            const session = createGraphSession({ features: [...features] });
            await session.data.import({ source: "url", config: { url: "https://data.example.com/p.csv" } });
            const symbol = (id: string): unknown => session.data.nodes().find((n) => n.id === id)?.symbol;
            assert.strictEqual(session.data.nodes().length, 38);
            assert.strictEqual(symbol("P-0"), "S0");
            assert.strictEqual(symbol("P-3"), "S3");
            assert.strictEqual(told(session), 2);
            session.dispose();
        });

        it(`opened as a file keeps the first row and says two were left out (${named})`, async () => {
            const session = createGraphSession({ features: [...features] });
            const draft = await session.data.prepare({ config: { data: PROTEINS }, name: "p.csv" });
            await draft.load({ mapping: { rowsAre: "nodes", key: "protein_id" } });
            assert.strictEqual(session.data.nodes().find((n) => n.id === "P-0")?.symbol, "S0");
            assert.strictEqual(told(session), 2);
            session.dispose();
        });
    }
});
