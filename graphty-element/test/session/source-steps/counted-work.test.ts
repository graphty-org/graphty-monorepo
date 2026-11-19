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

    it("a merge, Make an edge, pick, Use and Add of ten rows retain the same bytes however large the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await loaded(size);
                const [edges] = session.data.sources();
                const rows = Array.from({ length: 10 }, (_, i) => `n${String(i)},v${String(i)}`).join("\n");
                const stage = (): Promise<string> =>
                    session.data.stage(
                        { type: "csv", config: { data: `id,v\n${rows}` }, name: "s.csv" },
                        { key: "id" },
                    );
                let bytes = 0;
                await session.data.merge({ from: { source: await stage(), field: "id" }, into: { source: edges.key } });
                bytes += stepBytes(session);
                const linked = await stage();
                await session.data.connect({ from: { source: linked, field: "id" }, into: { source: edges.key } });
                bytes += stepBytes(session);
                await session.data.pick({ space: `source:${linked}`, key: "n1" }, "v", linked);
                bytes += stepBytes(session);
                await session.data.use({ space: `source:${linked}`, key: "n2" }, "v", linked);
                bytes += stepBytes(session);
                await session.data.add(await stage());
                bytes += stepBytes(session);
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], growth: "constant", counter: "bytes the five steps retain" },
        );
    });

    it("Extract, Move columns and deleting a step retain bytes in step with the rows they touch", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await loaded(size);
                const [edges] = session.data.sources();
                let bytes = 0;
                await session.data.extract(edges.key, { column: "target", space: "other" });
                bytes += stepBytes(session);
                await session.data.moveColumns(edges.key, { columns: ["target"], to: "source" });
                bytes += stepBytes(session);
                await session.data.removeStep(1);
                bytes += stepBytes(session);
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], counter: "bytes the three steps retain" },
        );
    });

    it("turning a step off and back on retains bytes in step with the rows it builds", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await loaded(size);
                await session.data.setStepOff(0, true);
                let bytes = stepBytes(session);
                await session.data.setStepOff(0, false);
                bytes += stepBytes(session);
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], counter: "bytes the two steps retain" },
        );
    });

    it("settling an edit after a one-cell refresh retains the same bytes however large the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = createGraphSession({ features: ["source-steps"] });
                const rows = (first: string): string =>
                    Array.from({ length: size }, (_, i) => `n${String(i)},${i === 1 ? first : "x"}`).join("\n");
                await session.data.import({ type: "csv", config: { data: `id,v\n${rows("a")}` }, name: "n.csv" });
                const [source] = session.data.sources();
                await session.data.updateNodes([{ id: "n1", values: { v: "mine" } }]);
                await session.data.replaceSource(source.key, { type: "csv", config: { data: `id,v\n${rows("b")}` } });
                const [edit] = session.data.edits();
                await session.data.settleEdit(edit.id, "keep");
                const bytes = stepBytes(session);
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], growth: "constant", counter: "bytes the settling step retains" },
        );
    });

    it("resolving a held step retains bytes in step with the rows it builds again", async () => {
        await assertScalesLinearly(
            async (size) => {
                const session = await loaded(size);
                const [source] = session.data.sources();
                const rows = Array.from({ length: size }, (_, i) => `n${String(i)},n${String((i * 7 + 1) % size)}`);
                await session.data.replaceSource(source.key, {
                    type: "csv",
                    config: { data: `from,target\n${rows.join("\n")}` },
                });
                await session.data.resolveStep(0, { column: "from" });
                const bytes = stepBytes(session);
                session.dispose();
                return bytes;
            },
            { sizes: [500, 2_000], counter: "bytes the resolving step retains" },
        );
    });
});
