/**
 * @file `session.labels`: how many node labels the overlap rule hid, and which, and the overlap
 * rule's switch as a project setting.
 *
 * A session with no renderer draws no labels, so its counts are zero. The renderer reports what
 * each placement decided through the session's internal label report, and these tests stand in
 * for it.
 */

import { assert, describe, it } from "vitest";

import { createElementSession, labelReportOf } from "../../src/session/GraphSession";
import type { LabelCounts } from "../../src/session/labels";

describe("session.labels", () => {
    it("counts nothing on a session no renderer draws", () => {
        const session = createElementSession();

        assert.deepEqual(session.labels.counts(), { requested: 0, drawn: 0, hiddenByOverlap: 0 });
        assert.deepEqual(session.labels.hiddenIds(), []);
        assert.isFalse(session.labels.declutter, "off by default");
        session.dispose();
    });

    it("reads what the renderer reported, and publishes labels:changed only when it moved", () => {
        const session = createElementSession();
        const heard: LabelCounts[] = [];
        session.on("labels:changed", (counts) => heard.push(counts));

        labelReportOf(session).report(5, ["b", "c"]);
        assert.deepEqual(session.labels.counts(), { requested: 5, drawn: 3, hiddenByOverlap: 2 });
        assert.deepEqual(session.labels.hiddenIds(), ["b", "c"]);
        assert.lengthOf(heard, 1);
        assert.deepEqual(heard[0], { requested: 5, drawn: 3, hiddenByOverlap: 2 });

        labelReportOf(session).report(5, ["b", "c"]);
        assert.lengthOf(heard, 1, "the same answer twice is one event");

        labelReportOf(session).report(5, ["b", "d"]);
        assert.lengthOf(heard, 2, "a different label hidden is a change even when the counts are equal");

        labelReportOf(session).report(6, ["b", "d"]);
        assert.lengthOf(heard, 3);
        session.dispose();
    });

    it("hands out a copy of the hidden ids", () => {
        const session = createElementSession();
        labelReportOf(session).report(2, ["a"]);

        const ids = session.labels.hiddenIds() as unknown[];
        assert.throws(() => ids.push("b"));
        assert.deepEqual(session.labels.hiddenIds(), ["a"]);
        session.dispose();
    });

    it("saves the overlap switch with the project, as a step undo takes back", async () => {
        const session = createElementSession();

        await session.labels.setDeclutter(true);
        assert.isTrue(session.labels.declutter);
        assert.isTrue(session.config.layoutBehavior.labels.declutter);
        assert.lengthOf(session.history.steps, 1);

        await session.undo();
        assert.isFalse(session.labels.declutter);

        await session.redo();
        assert.isTrue(session.labels.declutter);

        await session.config.set({ layoutBehavior: { labels: { declutter: false } } });
        assert.isFalse(session.labels.declutter, "the same setting, written through config.set");
        session.dispose();
    });
});
