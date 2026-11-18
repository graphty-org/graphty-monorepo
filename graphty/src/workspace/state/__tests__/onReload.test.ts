/**
 * Every field of the workspace state is classified once for a reload of this tab, and what this
 * tab saves is exactly the kept fields (beside the project's name, entry and opener).
 */

import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import { afterEach, assert, describe, it } from "vitest";

import {
    createWorkspaceStore,
    keepPlace,
    KEPT_FIELDS,
    keptName,
    keptPlace,
    ON_RELOAD,
    STASHED_FIELDS,
    stashedPlace,
    stashPlace,
} from "../store";

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
            assert.match(rule, /^(kept|(this tab|fresh): \S.{5,})$/, field);
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

    it("stashes only the kept fields with autosaved work: typing a draft or dragging a size writes nothing", async () => {
        const stashes: unknown[] = [];
        const element = Object.assign(new EventTarget(), {
            autosaver: {
                status: { entry: "e1" },
                stash: (_name: string, value: unknown) => stashes.push(value),
                stashed: () => ({ timelineOpen: true, assistantDraft: "secret", leftWidth: 400 }),
            },
        }) as unknown as GraphtyElement;
        const store = createWorkspaceStore({ project: { name: "Saved", id: 1, entry: "e1" } });
        const stop = stashPlace(store, element);
        // Once the opening settles, it stashes the place it has.
        while (stashes.length === 0) {
            await Promise.resolve();
        }
        const before = stashes.length;
        store.set({ assistantDraft: "hello", leftWidth: 300, rightWidth: 300, dockHeight: 200, assistantWidth: 300 });
        assert.equal(stashes.length, before);
        store.set({ timelineOpen: true });
        assert.equal(stashes.length, before + 1);
        assert.sameMembers(Object.keys(stashes.at(-1) as object), [...STASHED_FIELDS]);
        assert.notInclude([...STASHED_FIELDS], "assistantDraft");
        assert.deepEqual(stashedPlace(element), { timelineOpen: true });
        stop();
    });
});
