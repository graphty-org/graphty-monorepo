/**
 * A filter draft is the reader's unfinished edit of a condition. Autosave keeps every open draft
 * with the work and reopens it after a restore, so a page that reloads (Safari ends a background
 * tab) gets the edit back, still uncommitted, through `visibility.draftOf` (issue #9655).
 */

import { assert, it } from "vitest";

import { Autosaver } from "../../src/autosave/Autosaver";
import { memoryAutosaveStore } from "../../src/autosave/memoryStore";
import { reopenFilterDrafts } from "../../src/session/visibility/VisibilityApi";
import { baseSession } from "../helpers/project-session";
import { FakeClock, FakeLocks } from "./fakes";

const KEY = "test.filter-drafts";

it("open drafts come back after a restore, uncommitted, and commit as the reader left them", async () => {
    const store = memoryAutosaveStore();
    const first = await baseSession();
    const writer = new Autosaver({ key: KEY, session: first, store, clock: new FakeClock(), locks: new FakeLocks() });
    await first.visibility.addCondition({
        id: "dept",
        effect: "keep",
        rule: { kind: "range", attribute: "data.dept", min: 1 },
    });

    // A draft of the existing condition, and a draft of a new one, both changed and neither committed.
    const editing = first.visibility.draft("dept");
    editing.update({ rule: { kind: "range", attribute: "data.dept", min: 2 } });
    const adding = first.visibility.draft({ id: "new", effect: "exclude", rule: { kind: "degree", min: 2 } });
    adding.update({ name: "Busy" });
    await writer.flush();
    const id = writer.status.entry ?? "";
    writer.stop();
    first.dispose();

    const second = await baseSession();
    const reader = new Autosaver({ key: KEY, session: second, store, clock: new FakeClock(), locks: new FakeLocks() });
    // A view of the open drafts hears that autosave opened them again.
    const heard: (readonly string[])[] = [];
    second.on("visibility:draft-changed", ({ open }) => heard.push(open));
    await reader.restore(id, true);
    assert.deepStrictEqual(heard.at(-1), ["dept", "new"]);
    const { visibility } = second;

    assert.deepStrictEqual(
        visibility.openDrafts().map((each) => [each.id, each.rule, each.name]),
        [
            ["dept", { kind: "range", attribute: "data.dept", min: 2 }, undefined],
            ["new", { kind: "degree", min: 2 }, "Busy"],
        ],
    );
    // Nothing shown changed: the written condition keeps every node, and the new one is not written.
    assert.deepStrictEqual(
        visibility.conditions.map((each) => [each.id, each.rule]),
        [["dept", { kind: "range", attribute: "data.dept", min: 1 }]],
    );
    assert.strictEqual(visibility.nodes.size, 3);

    const reopened = visibility.draftOf("dept");
    assert.isNotNull(reopened);
    assert.isNull(visibility.draftOf("none"));
    await reopened?.commit();
    assert.deepStrictEqual(visibility.conditions[0].rule, { kind: "range", attribute: "data.dept", min: 2 });
    assert.strictEqual(visibility.nodes.size, 1, "only b has dept 2");

    await visibility.draftOf("new")?.commit();
    assert.deepStrictEqual(
        visibility.conditions.map((each) => each.id),
        ["dept", "new"],
    );
    assert.deepStrictEqual(visibility.openDrafts(), []);
    reader.stop();
    second.dispose();
});

it("a kept draft that cannot be opened again is named, not dropped silently", async () => {
    const session = await baseSession();
    const dropped = reopenFilterDrafts(session.visibility, [
        { id: "gone", edits: { name: "x" } },
        { condition: { id: "new", effect: "keep", rule: { kind: "degree", min: 1 }, on: true } },
    ]);
    assert.deepStrictEqual(dropped, ["gone"]);
    assert.deepStrictEqual(
        session.visibility.openDrafts().map((each) => each.id),
        ["new"],
    );
    session.dispose();
});
