/**
 * @file A load draft's report counts, in `repeated.seen`, the edges an addition would bring that
 * repeat an edge the graph already holds (same two ends, same direction), as the load itself
 * counts them. Measured against the graph, not only against the file's own rows.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import type { GraphSession } from "../../src/session/types";

const FILES = resolve(__dirname, "../../../design/ui/studio/tool/files");

/**
 * A participant file from the design studio, as a File.
 * @param name - The file name.
 * @returns The file.
 */
function file(name: string): File {
    return new File([readFileSync(resolve(FILES, name), "utf8")], name);
}

/**
 * A session holding friends.csv: 20 people, 41 ties.
 * @returns The session.
 */
async function friends(): Promise<GraphSession> {
    const session = createGraphSession();
    await session.data.import({ config: { file: file("friends.csv") } });
    assert.strictEqual(session.data.statistics().edgeCount, 41);
    return session;
}

describe("LoadDraft.report: edges that repeat the graph's", () => {
    it("counts the 41 ties a newer copy of friends.csv repeats, as the merge does", async () => {
        const session = await friends();
        const draft = await session.data.prepare({ config: { file: file("friends-v2.csv") } });

        const report = await draft.report({ mode: "merge" });
        assert.strictEqual(report.repeated.seen, 41);
        assert.strictEqual(report.repeated.kept, 41, "the default policy keeps a repeat as its own edge");
        assert.strictEqual(report.counts.edges, 82);

        await draft.load({ mode: "merge" });
        assert.strictEqual(session.data.lastImport()?.repeated.seen, 41, "the load counts the same");
    });

    it("counts none for a file of other ties, and none for a replacing load", async () => {
        const session = await friends();
        const other = await session.data.prepare({ config: { data: "source,target\nZed,Yan\nAva,Zed\n" } });
        assert.strictEqual((await other.report({ mode: "merge" })).repeated.seen, 0);

        const newer = await session.data.prepare({ config: { file: file("friends-v2.csv") } });
        assert.strictEqual((await newer.report()).repeated.seen, 0, "a replace leaves no edge to repeat");
    });

    it("counts a reversed tie only when the graph is undirected", async () => {
        const reversed = "source,target\nBen,Ava\n";
        for (const directed of [true, false]) {
            const session = createGraphSession();
            await session.data.import({ config: { data: "source,target\nAva,Ben\n" } }, { directed });
            const draft = await session.data.prepare({ config: { data: reversed } });
            const report = await draft.report({ mode: "merge" });
            assert.strictEqual(report.repeated.seen, directed ? 0 : 1, `directed: ${String(directed)}`);
        }
    });

    it("counts what a folding policy does with them", async () => {
        const session = createGraphSession({ config: { data: { knownFields: { repeatedEdges: "first" } } } });
        await session.data.import({ config: { file: file("friends.csv") } });
        const draft = await session.data.prepare({ config: { file: file("friends-v2.csv") } });
        const report = await draft.report({ mode: "merge" });
        assert.deepEqual(report.repeated, { seen: 41, kept: 0, dropped: 41, merged: 0 });
        assert.strictEqual(report.counts.edges, 41);
    });
});
