/**
 * Every field of the workspace state is classified once for a reload of this tab, and what this
 * tab saves is exactly the kept fields (beside the project's name, entry and opener).
 */

import { afterEach, assert, describe, it } from "vitest";

import { createWorkspaceStore, keepPlace, KEPT_FIELDS, keptName, keptPlace, ON_RELOAD } from "../store";

/** The session storage item this tab's screen state is saved under. */
const ITEM = "app.graphty.workspace.place";

/** What is saved beside the kept fields, about the project. */
const PROJECT_FIELDS = ["name", "blank", "opened", "entry"];

describe("what a reload of this tab puts back", () => {
    afterEach(() => {
        sessionStorage.removeItem(ITEM);
    });

    it("classifies every field of the state, each fresh one with a reason", () => {
        assert.sameMembers(Object.keys(ON_RELOAD), Object.keys(createWorkspaceStore().get()));
        for (const [field, rule] of Object.entries(ON_RELOAD)) {
            assert.match(rule, /^(kept|fresh: \S.{5,})$/, field);
        }
        assert.includeMembers([...KEPT_FIELDS], ["timelineOpen", "dockOpen", "dockMaximized", "dockTab", "place"]);
    });

    it("saves exactly the kept fields while a project is open, and forgets them once none is", () => {
        const store = createWorkspaceStore({ project: { name: "Saved", id: 1, entry: "e1" } });
        const stop = keepPlace(store);
        store.set({ timelineOpen: true, dockOpen: true, notice: { message: "Hello" } });
        const saved = JSON.parse(sessionStorage.getItem(ITEM) ?? "{}") as Record<string, unknown>;
        assert.sameMembers(
            Object.keys(saved).filter((key) => !PROJECT_FIELDS.includes(key)),
            [...KEPT_FIELDS],
        );
        assert.isTrue(saved.timelineOpen);
        assert.equal(saved.entry, "e1");
        assert.include(keptPlace(), { timelineOpen: true, dockOpen: true });
        store.set({ project: null });
        assert.isNull(sessionStorage.getItem(ITEM));
        stop();
    });

    it("restores an entry saved in the older, shorter form, and drops a field that is now fresh", () => {
        sessionStorage.setItem(
            ITEM,
            JSON.stringify({
                page: "panels",
                place: "data",
                tabs: {},
                dataTab: "calculated",
                name: "Old",
                notice: "x",
            }),
        );
        assert.deepEqual(keptPlace(), { page: "panels", place: "data", tabs: {}, dataTab: "calculated" });
        assert.equal(keptName(), "Old");
    });
});
