/**
 * The join workspace on the REAL graphty-element with the source-steps experiment on lists each file's
 * fields in the file's own column order (issue #10206): the fields a card offers, the columns of a
 * source's table and the columns of the rows a count lists. The files' columns are in no alphabetical
 * order, and their number columns come last, so an order by name or by type shows.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { choose, drop, emptyProject, joinAs, openJoins, pickFields } from "./sourceSteps";

withFeatures(["source-steps"]);

const PEOPLE = "zid,name,dept,age\nZ1,Ann,Ops,31\nZ2,Bo,Lab,42\nZ3,Cy,Ops,27";
const ENTRIES = "zentry,zid,door,amount\nE1,Z1,D1,3\nE2,Z1,D2,5\nE3,Z2,D1,8";

/**
 * People in the graph as type person, entries dropped and staged, and the workspace opened.
 * @returns the workspace.
 */
async function opened(): Promise<HTMLElement> {
    await page.viewport(1440, 900);
    const { store, session } = await emptyProject();
    await session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "zid", type: "person" },
    );
    store.set({ dockOpen: false, dockMaximized: false });
    drop("entries.csv", ENTRIES);
    await screen.findByRole("listitem", { name: "entries.csv" });
    return openJoins();
}

/**
 * The fields named by a table's column headers, in the order they are drawn.
 * @param modal - the workspace.
 * @param name - the table.
 * @returns each header's text.
 */
function headers(modal: HTMLElement, name: string): string[] {
    const grid = within(modal).getByRole("grid", { name });
    return within(grid)
        .getAllByRole("columnheader")
        .map((header) => (header.textContent ?? "").trim());
}

describe("the join workspace's field order (source-steps)", () => {
    it("lists each file's fields in its own column order: the card's choices, each table's columns and a count's rows", async () => {
        const modal = await opened();
        await choose(modal, "Source 1", "entries");
        await within(modal).findByRole("grid", { name: "entries" });
        assert.deepStrictEqual(headers(modal, "entries"), [
            "zentry (unique)",
            "zid (repeats)",
            "door (repeats)",
            "amount (unique)",
        ]);
        await choose(modal, "Source 2", "people");
        await userEvent.click(within(modal).getByRole("combobox", { name: "Field 1" }));
        const options = await screen.findAllByRole("option");
        assert.deepStrictEqual(
            options.map((option) => (option.textContent ?? "").split(" ")[0]),
            ["zentry", "zid", "door", "amount"],
            "the card offers entries' fields as the file has them",
        );
        await userEvent.keyboard("{Escape}");
        // The likeliest field is kept at the start; the rest follow the file.
        assert.deepStrictEqual(headers(modal, "entries"), [
            "zid (repeats)",
            "zentry (unique)",
            "door (repeats)",
            "amount (unique)",
        ]);
        assert.deepStrictEqual(headers(modal, "people"), [
            "zid (unique)",
            "name (unique)",
            "dept (repeats)",
            "age (unique)",
        ]);
        await pickFields(modal, "zid", "zid");
        await joinAs(modal, "Node per entries row, linked to people");
        await userEvent.click(await within(modal).findByRole("button", { name: /new edges$/ }));
        await waitFor(() => {
            assert.deepStrictEqual(headers(modal, "Rows").slice(-4), ["zentry", "zid", "door", "amount"]);
        });
    });
});
