/**
 * The Data panel's Join list (issue #10394): a join's menu renames it and turns it off and on, each one undo
 * step, in the words a join card's menu uses, and an off join reads as off.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import { done, emptyProject, joinAs, joinLines, openJoins, pickFields, pickSources, stageFile } from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name\nB1,Ann\nB2,Bo";
const ENTRIES = "entry,badge\nE1,B1\nE2,B1\nE3,B2";

/**
 * A graph of people with one join of entries committed, and the Data place it is listed in.
 * @param entries - the entries file's name
 * @param height - the window's height
 * @returns the store, the session and the Data place
 */
async function joined(
    entries = "entries.csv",
    height = 900,
): Promise<{ store: WorkspaceStore; session: GraphSession; place: HTMLElement }> {
    await page.viewport(1280, height);
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    const base = entries.replace(/\.csv$/u, "");
    await stageFile(entries, ENTRIES);
    await screen.findByRole("listitem", { name: entries });
    const modal = await openJoins();
    await pickSources(modal, "people", base);
    await pickFields(modal, "badge", "badge");
    await joinAs(modal, `Node per ${base} row, linked to people`);
    await done(modal);
    const place = await screen.findByRole("region", { name: "Data place" });
    await waitFor(() => {
        assert.deepStrictEqual(joinLines(place), [`people + ${base}`]);
    });
    return { store, session, place };
}

/**
 * Runs an item of a listed join's menu.
 * @param name - the join's line
 * @param item - the item
 */
async function fromMenu(name: string, item: string): Promise<void> {
    await userEvent.click(page.getByRole("button", { name: `${name} menu` }));
    await userEvent.click(page.getByRole("menuitem", { name: new RegExp(`^${item}`, "u") }));
}

describe("the Data panel's Join list (source-steps)", () => {
    it("offers Open, Rename, Turn off and Delete, in a join card's words", async () => {
        await joined();
        await userEvent.click(page.getByRole("button", { name: "people + entries menu" }));
        const menu = await screen.findByRole("menu");
        const items = within(menu)
            .getAllByRole("menuitem")
            .map((each) => each.textContent ?? "");
        assert.deepStrictEqual(items, ["Open", "Rename", "Turn off", "Delete"]);
        await userEvent.keyboard("{Escape}");
    });

    it("turns a join off, reads it as off, and turns it back on, each one undo step", async () => {
        const { store, session, place } = await joined();
        const edges = session.data.edges().length;
        assert.isAbove(edges, 0);
        await fromMenu("people + entries", "Turn off");
        await waitFor(() => {
            assert.isTrue(
                session.data
                    .steps()
                    .filter((step) => step.join !== undefined)
                    .every((step) => step.off),
                "every step of the join is off",
            );
        });
        await waitFor(() => {
            assert.include(within(place).getByRole("grid", { name: "Joins" }).textContent ?? "", "Off");
        });
        assert.strictEqual(store.get().announcement, "people + entries off");
        assert.strictEqual(store.get().notice?.message, "people + entries off", "its notice says what changed");
        await fromMenu("people + entries", "Turn on");
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, edges, "on, it builds its edges again");
        });
        await waitFor(() => {
            assert.strictEqual(store.get().notice?.message, "people + entries on");
        });
        assert.notInclude(within(place).getByRole("grid", { name: "Joins" }).textContent ?? "", "Off");
        await session.undo();
        await waitFor(() => {
            assert.isTrue(
                session.data
                    .steps()
                    .filter((step) => step.join !== undefined)
                    .every((step) => step.off),
                "one Undo takes back Turn on",
            );
        });
    });

    it("renames a join from its menu, and an unchanged name renames nothing", async () => {
        const { store, session, place } = await joined();
        await fromMenu("people + entries", "Rename");
        await within(place).findByRole("textbox", { name: "Join name" });
        await userEvent.fill(page.elementLocator(place).getByRole("textbox", { name: "Join name" }), "Badge entries");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.deepStrictEqual(joinLines(place), ["Badge entries"]);
        });
        assert.strictEqual(session.data.steps().find((step) => step.join !== undefined)?.join?.name, "Badge entries");
        assert.strictEqual(store.get().announcement, "Renamed Badge entries");
        assert.strictEqual(store.get().notice?.message, "Renamed Badge entries");
        const undoId = (): string | undefined => {
            const next = session.history.nextUndo;
            return next?.kind === "undo" ? next.step.id : undefined;
        };
        const undoable = undoId();
        await fromMenu("Badge entries", "Rename");
        await within(place).findByRole("textbox", { name: "Join name" });
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isNull(within(place).queryByRole("textbox", { name: "Join name" }));
        });
        assert.strictEqual(undoId(), undoable, "no undo step for a name left as it was");
    });

    it("draws a join's whole name at 1280x720 on its open card, the count short beside it", async () => {
        await joined("door_entries_badge.csv", 720);
        const whole = (title: Element | null | undefined, where: string): void => {
            assert.isNotNull(title ?? null, where);
            assert.strictEqual(title?.textContent, "people + door_entries_badge", where);
            assert.isAtMost(title?.scrollWidth ?? Infinity, title?.clientWidth ?? 0, `${where}: the name is not cut`);
        };
        const place = await screen.findByRole("region", { name: "Data place" });
        await userEvent.click(page.elementLocator(place).getByText("people + door_entries_badge"));
        const modal = await screen.findByRole("dialog", { name: "Join" });
        const card = (): Element | null => modal.querySelector("[data-card-id]");
        await waitFor(() => {
            assert.isNotNull(card()?.querySelector(".cm-card-head .sel-count"), "the open card counts its rows");
        });
        whole(card()?.querySelector(".cm-card-title"), "the open card");
    });
});
