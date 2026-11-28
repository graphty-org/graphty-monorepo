/**
 * Autosave keeps the draft `data.prepare` handed back and still holds (issue #9846): restored,
 * `data.prepared()` hands back that draft read again, so a page can reopen the join screen it
 * showed for a second file. The clock and the locks are faked; the session, the writer and the
 * store are real.
 */

import { assert, describe, it } from "vitest";

import type { GraphSession } from "../../session";
import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import type { AutosaveStore } from "../../src/autosave/types";
import { sessionWithRuns } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.autosave-prepared-draft";
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

describe("autosave and a prepared draft", () => {
    it("a second file's draft comes back after a restore, read again from its kept bytes, and again after a second", async () => {
        const store = memoryAutosaveStore();
        const before = page(store);
        await before.session.data.import({ config: { file: new File([LINKS], "links.csv") } });
        const file = new File([DEPTS], "depts.csv");
        const draft = await before.session.data.prepare({ config: { file }, name: "depts.csv" }, { onto: "graph" });
        assert.strictEqual(before.session.data.prepared()?.draft, draft);
        await before.saver.flush();
        before.saver.stop();

        const after = page(store);
        assert.isNotNull(await after.saver.recover(), "the entry was restored");
        const held = after.session.data.prepared();
        assert.isNotNull(held);
        assert.strictEqual(held?.source.name, "depts.csv");
        assert.strictEqual(held?.onto, "graph");
        // Prepared onto the graph again: the join screen's suggestion works on it.
        assert.deepStrictEqual(held?.draft.suggestJoin().keys, draft.suggestJoin().keys);
        await after.saver.flush();
        after.saver.stop();

        const again = page(store);
        assert.isNotNull(await again.saver.recover());
        assert.strictEqual(again.session.data.prepared()?.source.name, "depts.csv");
        again.saver.stop();
    });

    it("a draft loaded or disposed is no longer held, and a restore brings none back", async () => {
        const store = memoryAutosaveStore();
        const before = page(store);
        await before.session.data.import({ config: { file: new File([LINKS], "links.csv") } });
        const draft = await before.session.data.prepare({ type: "csv", config: { data: DEPTS } }, { onto: "graph" });
        await before.saver.flush();
        draft.dispose();
        assert.isNull(before.session.data.prepared());
        await before.saver.flush();
        before.saver.stop();

        const after = page(store);
        assert.isNotNull(await after.saver.recover());
        assert.isNull(after.session.data.prepared());
        after.saver.stop();
    });

    it("the element's own reads offer no draft", async () => {
        const session = sessionWithRuns();
        await session.data.import({ config: { file: new File([LINKS], "links.csv") } });
        assert.isNull(session.data.prepared());
    });
});
