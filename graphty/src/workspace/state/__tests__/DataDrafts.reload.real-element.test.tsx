/**
 * A reload of this tab puts back the Data page's join work the reader was in the middle of (issue
 * #9660): the join screen editing a joined table's join, and, with sources and steps on, the join
 * workspace with its draft, drawn on the side the reader left it. The draft is
 * graphty-element's, which its autosave keeps. Safari ends a background tab and loads it again,
 * often with its session storage emptied, so each case runs with that storage kept and with it
 * emptied. Real element, real autosave, real input.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { forgetAutosave, reload } from "../../../test/reload";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { drop } from "../../source-steps/__tests__/sourceSteps";
import { Workspace } from "../../Workspace";
import { createWorkspaceStore } from "../store";

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

/**
 * The opened element's session.
 * @returns it.
 */
async function sessionNow(): Promise<GraphSession> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(found);
        return found;
    });
}

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
/** B9 badges no person, b3 is B3 typed in lower case. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE5,b3,D3\nE6,B2,D2";
/** Who badges in after whom. */
const LINKS = "source,target\nB1,B2\nB2,B3";
/** Floors by badge, to join onto the people the links name. */
const DEPTS = "badge,floor\nB1,1\nB2,2\nB3,3";

/**
 * An empty project autosave keeps, on the Data place.
 * @returns the workspace and its session.
 */
async function emptyKept(): Promise<{ before: Parameters<typeof reload>[0]; session: GraphSession }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ autosave: true, project: { name: "Doors", id: 1 }, place: "data" });
    const view = render(<Workspace store={store} />);
    store.set({ dockOpen: false, dockMaximized: false });
    return { before: { store, view }, session: await sessionNow() };
}

/**
 * A project autosave keeps, on the Data place, with people loaded.
 * @returns the workspace and its session.
 */
async function peopleProject(): Promise<{ before: Parameters<typeof reload>[0]; session: GraphSession }> {
    const { before, session } = await emptyKept();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    return { before, session };
}

describe.each([{ lostSession: false }, { lostSession: true }])(
    "the Data page's join work, across a reload (session storage emptied: $lostSession)",
    ({ lostSession }) => {
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(forget);
        afterEach(forget);

        describe("with sources and steps off", () => {
            withFeatures([]);

            it("reopens the join screen editing a joined table's join", async () => {
                const { before, session } = await emptyKept();
                drop("links.csv", LINKS);
                await waitFor(() => {
                    assert.lengthOf(session.data.nodes(), 3);
                });
                drop("depts.csv", DEPTS);
                const join = await screen.findByRole("region", { name: "Join depts.csv" });
                await userEvent.click(within(join).getByRole("button", { name: "Join" }));
                await waitFor(() => {
                    assert.lengthOf(session.data.joins(), 1);
                });
                const row = await screen.findByRole("listitem", { name: "depts.csv" });
                await userEvent.hover(row);
                await userEvent.click(within(row).getByRole("button", { name: "depts.csv menu" }));
                await userEvent.click(await screen.findByRole("menuitem", { name: "Edit join" }));
                await screen.findByRole("region", { name: "Join depts.csv" });

                const after = await reload(before, {
                    lostSession,
                    // gap #9848: Fields drops the edge file's controls after any reload that follows a join.
                    lost: ["value: Rows are = edges", "value: Source = source", "value: Target = target"],
                });
                // The join screen itself, with what it matched on, is checked by reload().
                await screen.findByRole("region", { name: "Join depts.csv" });
                after.view.unmount();
            });
        });

        describe("with sources and steps on", () => {
            withFeatures(["source-steps"]);

            it("reopens the join workspace on its draft, on the side it showed, and Done commits it", async () => {
                const { before, session } = await peopleProject();
                drop("entries.csv", ENTRIES);
                await screen.findByRole("listitem", { name: "entries.csv" });
                (document.activeElement as HTMLElement | null)?.blur();
                await userEvent.keyboard("{Shift>}J{/Shift}");
                const modal = await screen.findByRole("dialog", { name: "Join" });
                await userEvent.click(within(modal).getByRole("radio", { name: "A node linked to what it names" }));
                await userEvent.click(await within(modal).findByLabelText("Edge type"));
                await userEvent.keyboard("entered{Enter}");
                await waitFor(() => {
                    assert.strictEqual(session.data.currentDraft()?.steps().at(-1)?.act?.edgeType, "entered");
                });
                within(modal).getByRole("button", { name: "Done" }).focus();
                await userEvent.keyboard("b");
                await waitFor(() => {
                    assert.strictEqual(session.data.currentDraft()?.side, "before");
                });

                const after = await reload(before, { lostSession });
                const back = await screen.findByRole("dialog", { name: "Join" });
                assert.lengthOf(
                    [...back.querySelectorAll("[data-join-card]:not([data-join-card^='add:'])")],
                    1,
                    "the join's own card, and no second one",
                );
                const reopened = await sessionNow();
                await waitFor(() => {
                    const draft = reopened.data.currentDraft();
                    assert.isTrue(draft?.displayed, "the draft is drawn again");
                    assert.strictEqual(draft?.side, "before");
                });
                const chip = within(back).getByRole("radiogroup", { name: "Before / After" });
                assert.isTrue(within(chip).getByRole<HTMLInputElement>("radio", { name: "Before" }).checked);

                await userEvent.click(within(back).getByRole("button", { name: "Done" }));
                await waitFor(() => {
                    assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
                });
                assert.isNull(reopened.data.currentDraft());
                assert.strictEqual(reopened.data.statistics({ scope: "all" }).edgeCount, 4, "E1, E2, E3 and E6");
                after.view.unmount();
            });

            it("reopens the join workspace on a source's removal, which Done still makes", async () => {
                const { before, session } = await peopleProject();
                const people = session.data.sources()[0]?.key;
                assert.isDefined(people);
                const row = await screen.findByRole("listitem", { name: "people.csv" });
                await userEvent.click(within(row).getByRole("button", { name: "people.csv menu" }));
                await userEvent.click(await screen.findByRole("menuitem", { name: "Remove" }));
                const modal = await screen.findByRole("dialog", { name: "Join" });
                await within(modal).findByRole("region", { name: "Remove people.csv" });

                const after = await reload(before, { lostSession });
                const back = await screen.findByRole("dialog", { name: "Join" });
                await within(back).findByRole("region", { name: "Remove people.csv" });
                const reopened = await sessionNow();
                assert.lengthOf(reopened.data.sources(), 1, "nothing removed yet");
                await userEvent.click(within(back).getByRole("button", { name: "Done" }));
                await waitFor(() => {
                    assert.lengthOf(reopened.data.sources(), 0);
                });
                after.view.unmount();
            });
        });
    },
);
