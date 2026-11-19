/**
 * @file What a source-steps change costs the graph: the diff apply writes only what changed, so a
 * one-cell edit or a type declaration retains the same bytes on a graph four times larger, and a
 * staged source retains bytes in step with its rows.
 */

import { describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import { assertScalesLinearly } from "../../helpers/cost";

/**
 * A session holding one edge file of `size` rows under the source-steps experiment.
 * @param size - How many rows.
 * @returns The session.
 */
async function loaded(size: number): Promise<GraphSession> {
    const session = createGraphSession({ features: ["source-steps"] });
    const rows = Array.from({ length: size }, (_, i) => `n${String(i)},n${String((i * 7 + 1) % size)}`);
    await session.data.import({ type: "csv", config: { data: `source,target\n${rows.join("\n")}` }, name: "e.csv" });
    return session;
}

/**
 * The bytes the newest step retains.
 * @param session - The session.
 * @returns The bytes.
 */
function stepBytes(session: GraphSession): number {
    return session.history.steps.at(-1)?.bytes ?? 0;
}

describe("source-steps: counted work of the diff apply", () => {
    it("a one-cell reader edit retains the same bytes however large the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await loaded(size);
                await session.data.updateNodes([{ id: "n1", values: { score: 1 } }]);
                const bytes = stepBytes(session);
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], growth: "constant", counter: "bytes the edit's step retains" },
        );
    });

    it("declaring a type and taking back an edit write nothing to unchanged elements", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await loaded(size);
                const [source] = session.data.sources();
                await session.data.declareType({ name: "thing", kind: "node", rules: [{ source: source.key }] });
                const declared = stepBytes(session);
                await session.data.addNodes([{ id: "extra" }]);
                const [edit] = session.data.edits();
                await session.data.removeEdit(edit.id);
                const removed = stepBytes(session);
                session.dispose();
                return declared + removed;
            },
            { sizes: [500, 2_000], growth: "constant", counter: "bytes the two steps retain" },
        );
    });

    it("a staged source retains bytes in step with its rows", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await loaded(10);
                const rows = Array.from({ length: size }, (_, i) => `k${String(i)},${String(i)}`);
                await session.data.stage(
                    { type: "csv", config: { data: `id,v\n${rows.join("\n")}` }, name: "s.csv" },
                    { key: "id" },
                );
                const bytes = stepBytes(session);
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], counter: "bytes the staging step retains" },
        );
    });
});
