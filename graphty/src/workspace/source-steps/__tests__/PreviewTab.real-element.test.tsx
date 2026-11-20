/**
 * The dock's Preview tab on the REAL graphty-element with the source-steps experiment on
 * (design/data/multiple-data-sources-design.md, section 5.4), driven by clicks and keys, in the
 * owner's founding example. Door entries made into edges to the people who badged in: a click on the
 * new edges count lists its rows in the dock, selecting the test badge's row offers Exclude selected
 * (1) in the card, which leaves that edge out, and removing it from the excluded list brings it
 * back. HR's list merged into people: a click on dept's Values differ lists its cells, Pick 2 on one
 * cell marks it R and lists it under Decided, Ctrl+A on the open cells and Pick 1 decides them all,
 * and Clear picks takes the picks back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceDraft } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { choose, drop, emptyProject } from "./sourceSteps";

withFeatures(["source-steps"]);

/** T0 is the test badge: a person, so its entry makes an edge like any other. */
const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales\nT0,Test badge,QA";
/** B9 badges no person; E7 is the test badge's entry. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE6,B2,D2\nE7,T0,D1";
/** HR's list: B1 and B2 name another department than people.csv does. */
const HR = "badge,dept\nB1,Operations\nB2,Research\nB3,Sales";

/**
 * People in the graph as type person, one more file dropped and staged, and the Join card open on
 * Key of person and the staged file's badge.
 * @param name - the staged file's name.
 * @param text - its contents.
 * @param staff - a second people file added as person too, when given.
 * @returns the session and the card.
 */
async function joinOn(
    name: string,
    text: string,
    staff?: string,
): Promise<{ session: GraphSession; card: HTMLElement }> {
    await page.viewport(1440, 900);
    const project = await emptyProject();
    await project.session.data.import(
        { type: "csv", config: { data: PEOPLE }, name: "people.csv" },
        { key: "badge", type: "person" },
    );
    if (staff !== undefined) {
        const id = await project.session.data.stage(
            { type: "csv", config: { data: staff }, name: "staff.csv" },
            { key: "badge", type: "person" },
        );
        await project.session.data.add(id, { overlap: "merge" });
    }
    drop(name, text);
    await screen.findByRole("region", { name });
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("j");
    const card = await screen.findByRole("form", { name: "Join" });
    await choose(card, "Field 1 type", "person");
    await choose(card, "Field 1 field", "Key");
    await choose(card, "Field 2 field", "badge");
    return { session: project.session, card };
}

/**
 * Picks an act and clicks Preview.
 * @param card - the card.
 * @param act - the act's name.
 * @returns the card's Preview section.
 */
async function preview(card: HTMLElement, act: string): Promise<HTMLElement> {
    await userEvent.click(within(card).getByRole("radio", { name: act }));
    await userEvent.click(within(card).getByRole("button", { name: /^Preview/ }));
    return within(card).findByRole("region", { name: "Preview" });
}

/**
 * The open draft.
 * @param session - the session.
 * @returns it.
 */
function draftOf(session: GraphSession): SourceDraft {
    const draft = session.data.currentDraft();
    if (draft === null) {
        throw new Error("no draft");
    }
    return draft;
}

/**
 * The table's body row with a cell that reads a text.
 * @param grid - the table.
 * @param text - the text.
 * @returns the row.
 */
function rowWith(grid: HTMLElement, text: string): HTMLElement {
    const row = within(grid)
        .getAllByRole("row")
        .find((each) =>
            [...within(each).queryAllByRole("rowheader"), ...within(each).queryAllByRole("gridcell")].some(
                (cell) => cell.textContent === text,
            ),
        );
    assert.isDefined(row, `a row for ${text}`);
    if (row === undefined) {
        throw new Error(`no row for ${text}`);
    }
    return row;
}

/**
 * Clicks a row's first cell, as a reader selects it.
 * @param row - the row.
 */
async function select(row: HTMLElement): Promise<void> {
    await userEvent.click(within(row).getByRole("rowheader"));
}

describe("the dock's Preview tab (source-steps)", () => {
    it("excludes the test badge's row from the new edges and removing it from the list restores it", async () => {
        const { session, card } = await joinOn("entries.csv", ENTRIES);
        const section = await preview(card, "Make an edge");
        const newEdges = (): number => draftOf(session).preview().steps.at(-1)?.buckets?.newEdges ?? -1;
        assert.strictEqual(newEdges(), 5, "E1, E2, E3, E6 and E7");

        await userEvent.click(within(section).getByRole("button", { name: "Show new edges rows" }));
        const grid = await screen.findByRole("grid", { name: "Rows" });
        assert.isTrue(screen.getByRole("tab", { name: "Preview" }).getAttribute("aria-selected") === "true");
        assert.lengthOf(within(grid).getAllByRole("rowheader"), 5, "one row per new edge");
        // Each row is keyed by its entry, the column an edge step leaves rows out by.
        await select(rowWith(grid, "T0"));

        await userEvent.click(await within(card).findByRole("button", { name: "Exclude selected (1)" }));
        await waitFor(() => {
            assert.strictEqual(newEdges(), 4);
        });
        const excluded = within(card).getByRole("group", { name: "Excluded" });
        assert.isNotNull(within(excluded).getByText("E7"));
        await waitFor(() => {
            assert.lengthOf(within(screen.getByRole("grid", { name: "Rows" })).getAllByRole("rowheader"), 4);
        });

        await userEvent.click(within(excluded).getByRole("button", { name: "Remove E7" }));
        await waitFor(() => {
            assert.strictEqual(newEdges(), 5);
        });
        assert.isNull(within(card).queryByRole("group", { name: "Excluded" }));
    });

    it("HR dept: Pick 2 on one cell marks it R and Decided lists it; Pick 1 on every open cell decides them all", async () => {
        const { session, card } = await joinOn("hr.csv", HR);
        const section = await preview(card, "Merge 2 into 1");
        const cells = (only: "open" | "decided"): number =>
            draftOf(session).preview().cells({ column: "dept", only }).total;
        assert.strictEqual(cells("open"), 2, "B1 and B2");

        await userEvent.click(within(section).getByRole("button", { name: "Show dept cells" }));
        const grid = await screen.findByRole("grid", { name: "Cells" });
        assert.lengthOf(within(grid).getAllByRole("rowheader"), 2);
        await select(rowWith(grid, "B2"));
        await userEvent.click(await within(card).findByRole("button", { name: "Pick 2 (1)" }));
        await waitFor(() => {
            assert.strictEqual(cells("decided"), 1);
        });
        await waitFor(() => {
            const row = rowWith(screen.getByRole("grid", { name: "Cells" }), "B2");
            assert.include(row.textContent ?? "", "Research");
            assert.include(within(row).getAllByRole("gridcell").at(-1)?.textContent ?? "", "R");
        });
        assert.strictEqual(within(section).getByLabelText("dept decided").textContent, "decided 1");

        const filter = screen.getByRole("radiogroup", { name: "Cells" });
        await userEvent.click(within(filter).getByText("Decided"));
        await waitFor(() => {
            const decided = within(screen.getByRole("grid", { name: "Cells" })).getAllByRole("rowheader");
            assert.deepStrictEqual(
                decided.map((each) => each.textContent),
                ["B2"],
            );
        });

        await userEvent.click(within(filter).getByText("Open"));
        const open = await screen.findByRole("grid", { name: "Cells" });
        await waitFor(() => {
            assert.lengthOf(within(open).getAllByRole("rowheader"), 1);
        });
        await select(rowWith(open, "B1"));
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.click(await within(card).findByRole("button", { name: "Pick 1 (1)" }));
        await waitFor(() => {
            assert.strictEqual(cells("open"), 0);
        });
        assert.strictEqual(cells("decided"), 2);

        // Clear picks on every decided cell takes both back.
        await userEvent.click(within(filter).getByText("Decided"));
        const decided = await screen.findByRole("grid", { name: "Cells" });
        await waitFor(() => {
            assert.lengthOf(within(decided).getAllByRole("rowheader"), 2);
        });
        await select(rowWith(decided, "B1"));
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.click(await within(card).findByRole("button", { name: "Clear picks (2)" }));
        await waitFor(() => {
            assert.strictEqual(cells("open"), 2);
        });
    });

    it("Pick 1 decides every selected cell when person is built from two files", async () => {
        const staff = "badge,name,dept\nB5,Di,Ops";
        const hr = "badge,dept\nB1,Operations\nB5,Facilities";
        const { session, card } = await joinOn("hr.csv", hr, staff);
        const section = await preview(card, "Merge 2 into 1");
        const cells = (only: "open" | "decided"): number =>
            draftOf(session).preview().cells({ column: "dept", only }).total;
        assert.strictEqual(cells("open"), 2, "B1 from people.csv and B5 from staff.csv");

        await userEvent.click(within(section).getByRole("button", { name: "Show dept cells" }));
        const grid = await screen.findByRole("grid", { name: "Cells" });
        await select(rowWith(grid, "B5"));
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.click(await within(card).findByRole("button", { name: "Pick 1 (2)" }));
        await waitFor(() => {
            assert.strictEqual(cells("decided"), 2);
        });
        assert.strictEqual(cells("open"), 0);
        assert.deepStrictEqual(
            draftOf(session)
                .preview()
                .cells({ column: "dept" })
                .cells.map((each) => each.shown),
            ["Ops", "Ops"],
            "each cell shows the value it held before HR's list",
        );
    });
});
