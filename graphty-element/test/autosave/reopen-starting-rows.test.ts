/**
 * A reload reopens this tab's kept work into a fresh session that already took the app's starting
 * rows (graphty's Workspace sets `startingRows` before the restore). The work must come back with
 * exactly the rows it was saved with: none added twice. A time field read from the work adds the
 * Ghost row by itself, which once brought every starting row back beside the saved ones (issue
 * #7843).
 */

import { assert, it } from "vitest";

import type { GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { sessionWithRuns } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.reopen-starting-rows";

/**
 * The app's starting choices for every project it opens.
 * @param session - The session.
 */
async function startingChoices(session: GraphSession): Promise<void> {
    await session.config.set({
        startingRows: true,
        editableBase: true,
        runPlacement: "top",
        pinnedStyle: { color: "#868e96", scale: 1.3, opacity: 1 },
    });
}

/**
 * The names of the style tree's top rows.
 * @param session - The session.
 * @returns The names, in order.
 */
function names(session: GraphSession): string[] {
    return session.styles.tree().map((row) => row.name);
}

it.each([
    { features: [], timed: false },
    { features: ["timeline"], timed: true },
])("reopening kept work over the starting rows keeps each row once: %o", async ({ features, timed }) => {
    const store = memoryAutosaveStore();
    const first = sessionWithRuns(features);
    const writer = new Autosaver({ key: KEY, session: first, store, clock: new FakeClock(), locks: new FakeLocks() });
    await startingChoices(first);
    await first.data.addNodes([
        { id: "a", year: 2001 },
        { id: "b", year: 2002 },
    ]);
    await first.data.addEdges([{ source: "a", target: "b" }]);
    if (timed) {
        await first.time.setField({ nodes: { start: "year" } });
    }
    await writer.flush();
    const id = writer.status.entry ?? "";
    const saved = names(first);
    writer.stop();
    assert.isAbove(saved.length, 0);

    const second = sessionWithRuns(features);
    const reader = new Autosaver({ key: KEY, session: second, store, clock: new FakeClock(), locks: new FakeLocks() });
    await startingChoices(second);
    await reader.restore(id, true);

    assert.deepStrictEqual(names(second), saved);
    reader.stop();
});
