/**
 * Autosave keeps what each load the reader read was read from (issue #9848): restored, a file
 * load can still be read again with new choices (`reloadSource`), as before the reload. The clock
 * and the locks are faked; the session, the writer and the store are real.
 */

import { assert, describe, it, vi } from "vitest";

import type { GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import type { AutosaveStore } from "../../src/autosave/types";
import type { SessionData } from "../../src/session/data";
import { sessionWithRuns } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.autosave-reload-inputs";
const LINKS = "source,target\nB1,B2\nB2,B3";
const DEPTS = "badge,floor\nB1,1\nB2,2\nB3,3";

/**
 * A page load writing to a store.
 * @param store - The store.
 * @returns The session and its writer.
 */
function page(store: AutosaveStore): { session: GraphSession; saver: Autosaver } {
    const session = sessionWithRuns();
    const saver = new Autosaver({ key: KEY, session, store, clock: new FakeClock(), locks: new FakeLocks() });
    return { session, saver };
}

describe("autosave and what each load was read from", () => {
    it("a restored file load and inline load stay reloadable, and reloadSource reads them again", async () => {
        const store = memoryAutosaveStore();
        const before = page(store);
        await before.session.data.import({ config: { file: new File([LINKS], "links.csv") } });
        await before.session.data.import(
            { type: "csv", config: { data: DEPTS }, name: "depts.csv" },
            { mode: "merge", mapping: { rowsAre: "nodes", key: "badge" } },
        );
        assert.deepStrictEqual(
            before.session.data.sources().map((each) => each.reloadable),
            [true, true],
        );
        // The file's bytes are read once the import has kept it.
        await vi.waitFor(() => {
            assert.lengthOf(Object.keys((before.session.data as unknown as SessionData).savedInputs()), 2);
        });
        await before.saver.flush();
        before.saver.stop();

        const after = page(store);
        assert.isNotNull(await after.saver.recover(), "the entry was restored");
        const sources = after.session.data.sources();
        assert.deepStrictEqual(
            sources.map((each): readonly unknown[] => [each.key, each.reloadable]),
            before.session.data.sources().map((each): readonly unknown[] => [each.key, true]),
        );

        // Read again with the ends swapped: still three nodes and two edges.
        const [links] = sources;
        await after.session.data.reloadSource(links.key, {
            mapping: { edges: { source: "target", target: "source" } },
        });
        assert.strictEqual(after.session.data.statistics({ scope: "all" }).edgeCount, 2);
        assert.isTrue(after.session.data.sources()[0].reloadable);
        await after.saver.flush();
        after.saver.stop();

        // And again after a second reload: the restored inputs are kept too.
        const again = page(store);
        assert.isNotNull(await again.saver.recover());
        assert.deepStrictEqual(
            again.session.data.sources().map((each) => each.reloadable),
            [true, true],
        );
        again.saver.stop();
    });
});
