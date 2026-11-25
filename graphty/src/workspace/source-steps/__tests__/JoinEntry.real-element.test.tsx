/**
 * The doors into the join workspace on the REAL graphty-element with the source-steps experiment
 * on, driven by clicks and keys, in the owner's founding example: people in the graph and door
 * entries staged. "Join +" below the data sources opens the workspace, as Shift+J does; it is never
 * disabled, even while a draft is open; the sidebar holds no join information; and the inspector's
 * Join on a person opens the workspace with people as its first source.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import type { WorkspaceStore } from "../../state/store";
import { drop, emptyProject, joinLines } from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales";
const BUILDINGS = "door,building\nD1,North\nD2,South";
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1";

/**
 * People in the graph as type person, and entries.csv dropped and staged.
 * @returns the store and the session.
 */
async function foundingProject(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    await page.viewport(1280, 900);
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    drop("entries.csv", ENTRIES);
    await screen.findByRole("listitem", { name: "entries.csv" });
    return { store, session };
}

/**
 * The Data place's Join + button.
 * @returns the button.
 */
async function joinPlus(): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    return within(place).findByRole("button", { name: "Join" });
}

describe("the doors into the join workspace (source-steps)", () => {
    it("Join + below the data sources opens the workspace, showing its Shift+J key", async () => {
        await foundingProject();
        const plus = await joinPlus();
        assert.strictEqual(plus.getAttribute("aria-keyshortcuts"), "Shift+J");
        const row = plus.closest("[data-join-plus]");
        assert.include(row?.textContent ?? "", "J", "the key is drawn beside the +");
        const list = screen.getByRole("list", { name: "Data sources" });
        assert.isTrue(
            (list.compareDocumentPosition(plus) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            "Join + comes after every source",
        );
        await userEvent.click(plus);
        const modal = await screen.findByRole("dialog", { name: "Join" });
        assert.deepStrictEqual(joinLines(modal), ["New join"], "a blank card, nothing picked");
        assert.strictEqual(within(modal).getByRole<HTMLInputElement>("combobox", { name: "Source 1" }).value, "");
    });

    it("the sidebar holds no join information: no Join card, steps list or join buttons", async () => {
        await foundingProject();
        const place = await screen.findByRole("region", { name: "Data place" });
        assert.isNull(within(place).queryByRole("form", { name: "Join" }));
        assert.isNull(within(place).queryByText("Steps"));
        assert.isNull(within(place).queryByRole("button", { name: /Edit joins/ }));
        assert.lengthOf(within(place).getAllByRole("button", { name: "Join" }), 1, "only Join +");
        const staged = within(place).getByRole("listitem", { name: "entries.csv" });
        assert.isNull(within(staged).queryByRole("button", { name: /^(Add|Join)/ }), "no Add or Join on the entry");
    });

    it("two sources and an open draft: Join + still opens the workspace, which adopts the draft", async () => {
        const { session } = await foundingProject();
        drop("buildings.csv", BUILDINGS);
        await screen.findByRole("listitem", { name: "buildings.csv" });
        const draft = session.data.draft();
        const plus = await joinPlus();
        assert.isFalse((plus as HTMLButtonElement).disabled, "never disabled");
        await userEvent.click(plus);
        await screen.findByRole("dialog", { name: "Join" });
        assert.strictEqual(session.data.currentDraft(), draft, "the workspace works in the open draft");
    });

    it("Shift+J opens it with one source loaded and nothing staged", async () => {
        const { session } = await foundingProject();
        await session.data.removeSource(session.data.staged()[0]?.key ?? "");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("listitem", { name: "entries.csv" }));
        });
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Shift>}J{/Shift}");
        await screen.findByRole("dialog", { name: "Join" });
    });

    it("the inspector's Join on a person opens the workspace with people as its first source", async () => {
        const { session } = await foundingProject();
        await session.selection.apply({ nodes: ["B1"] });
        const inspector = await screen.findByRole("complementary", { name: "Inspector" });
        await userEvent.click(await within(inspector).findByRole("button", { name: "Join" }));
        const modal = await screen.findByRole("dialog", { name: "Join" });
        await waitFor(() => {
            assert.strictEqual(
                within(modal).getByRole<HTMLInputElement>("combobox", { name: "Source 1" }).value,
                "people",
            );
        });
    });
});
