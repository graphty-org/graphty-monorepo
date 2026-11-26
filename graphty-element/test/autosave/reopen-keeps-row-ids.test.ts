/**
 * A reload reopens this tab's kept work with every style row under the id it had: the app holds
 * the reader's picked layer, the row being inspected and the open selection workspace by row id,
 * so a row that comes back under a new id loses them all. Ids were minted from a layer's name on
 * the way in, so a layer renamed after it was added ("Layer 5" to "test") came back as `test_1`
 * and the app showed Everything instead (issue #9973).
 */

import { assert, it } from "vitest";

import type { GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { sessionWithRuns } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.reopen-keeps-row-ids";

/**
 * Every row's id and name, folders' children included, depth first.
 * @param session - The session.
 * @returns One `name=id` per row.
 */
function rowIds(session: GraphSession): string[] {
    const walk = (rows: ReturnType<GraphSession["styles"]["tree"]>): string[] =>
        rows.flatMap((row) => [`${row.name}=${row.id}`, ...walk(row.children)]);
    return walk(session.styles.tree());
}

/**
 * A session with the app's starting choices.
 * @returns The session.
 */
async function startingSession(): Promise<GraphSession> {
    const session = sessionWithRuns();
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

it("reopening kept work keeps the id of a renamed layer, a renamed folder and every other row", async () => {
    const store = memoryAutosaveStore();
    const first = await startingSession();
    const writer = new Autosaver({ key: KEY, session: first, store, clock: new FakeClock(), locks: new FakeLocks() });
    await first.data.addNodes([{ id: "a" }, { id: "b" }]);
    await first.data.addEdges([{ source: "a", target: "b" }]);
    const added = await first.styles.addRow({ name: "Layer 5", target: "both", selector: { match: "everything" } });
    await first.styles.renameRow(added.id, "test");
    const folder = await first.styles.addFolder("Folder 1");
    await first.styles.renameRow(folder.id, "Mine");
    await first.styles.moveRow(added.id, { parent: folder.id });
    await writer.flush();
    const saved = rowIds(first);
    const id = writer.status.entry ?? "";
    writer.stop();
    assert.include(saved, `test=${added.id}`);

    const second = await startingSession();
    const reader = new Autosaver({ key: KEY, session: second, store, clock: new FakeClock(), locks: new FakeLocks() });
    const report = await reader.restore(id, true);

    assert.deepStrictEqual(rowIds(second), saved);
    assert.notInclude(
        report.problems.map((problem) => problem.code),
        "W_LAYER_ID_CHANGED",
    );
    reader.stop();
});

it("a style document gives back saved ids that are free and mints new ones for those that are taken", async () => {
    const session = await startingSession();
    const added = await session.styles.addRow({ name: "Layer 5", target: "node", selector: { match: "everything" } });
    await session.styles.renameRow(added.id, "test");
    const document = session.styles.toDocument();
    assert.include(document.ids ?? [], added.id);

    // Every id is taken: the copies get new ones, and the originals keep theirs.
    const own = (): string[] =>
        session.styles
            .list()
            .filter((layer) => !layer.locked)
            .map((layer) => layer.id);
    const before = own();
    await session.styles.applyTemplate(document);
    const after = own();
    assert.strictEqual(after.length, before.length * 2);
    assert.strictEqual(new Set(after).size, after.length);
    assert.includeMembers(after, before);

    // Into an empty session, every saved id comes back.
    const other = sessionWithRuns();
    await other.styles.applyTemplate(document);
    assert.deepStrictEqual(
        other.styles
            .list()
            .filter((layer) => !layer.locked)
            .map((layer) => layer.id),
        document.ids,
    );
});
