/**
 * The join workspace's table on the REAL graphty-element with the source-steps experiment on
 * (design/data/multiple-data-sources-design.md, section 5.4), driven by clicks and keys, in the
 * owner's founding example. Door entries made into edges to the people who badged in: a click on the
 * card's new edges count lists its rows in the workspace table, selecting the test badge's row and
 * Exclude leaves that edge out, and Include brings it back. HR's list merged into people: a click
 * on dept in the card lists its cells, Pick 2 on one cell marks it R and lists it under Decided,
 * Ctrl+A on the open cells and Pick 1 decides them all, and Clear takes the picks back. The Fields
 * view profiles the card's two fields.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, SourceDraft } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { choose, drop, emptyProject, rowWith, select } from "./sourceSteps";

withFeatures(["source-steps"]);

/** T0 is the test badge: a person, so its entry makes an edge like any other. */
const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales\nT0,Test badge,QA";
/** B9 badges no person; E7 is the test badge's entry. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE6,B2,D2\nE7,T0,D1";
/** HR's list: B1 and B2 name another department than people.csv does. */
const HR = "badge,dept\nB1,Operations\nB2,Research\nB3,Sales";

/**
 * People in the graph as type person, one more file dropped and staged, and the join workspace
 * open with its card matching Key of person to the staged file's badge, with a result picked.
 * @param name - the staged file's name.
 * @param text - its contents.
 * @param result - the card's result.
 * @param staff - a second people file added as person too, when given.
 * @returns the session and the workspace.
 */
async function joinOn(
    name: string,
    text: string,
    result: "Merge" | "Connect",
    staff?: string,
): Promise<{ session: GraphSession; modal: HTMLElement }> {
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
    await screen.findByRole("listitem", { name });
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard("{Shift>}J{/Shift}");
    const modal = await screen.findByRole("dialog", { name: "Join" });
    await choose(modal, "In graph type", "person");
    await choose(modal, "In graph field", "Key");
    await choose(modal, "Incoming field", "badge");
    const becomes = result === "Merge" ? "Fields on a node" : "A node linked to what it names";
    await userEvent.click(within(modal).getByRole("radio", { name: becomes }));
    await waitFor(() => {
        assert.isAbove(
            draftOf(project.session)
                .steps()
                .filter((row) => row.act !== null).length,
            0,
        );
    });
    return { session: project.session, modal };
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

describe("the join workspace's table (source-steps)", () => {
    it("excludes the test badge's row from the new edges and Include restores it", async () => {
        const { session, modal } = await joinOn("entries.csv", ENTRIES, "Connect");
        const newEdges = (): number => draftOf(session).preview().steps.at(-1)?.buckets?.newEdges ?? -1;
        assert.strictEqual(newEdges(), 5, "E1, E2, E3, E6 and E7");

        await userEvent.click(await within(modal).findByRole("button", { name: /new edges$/ }));
        const grid = await within(modal).findByRole("grid", { name: "Rows" });
        assert.lengthOf(within(grid).getAllByRole("rowheader"), 5, "one row per new edge");
        await select(rowWith(grid, "T0"));
        await userEvent.click(within(modal).getByRole("button", { name: "Exclude" }));
        await waitFor(() => {
            assert.strictEqual(newEdges(), 4);
        });
        const include = await within(modal).findByRole("button", { name: "Include E7" });
        await userEvent.click(include);
        await waitFor(() => {
            assert.strictEqual(newEdges(), 5);
        });
        assert.isNull(within(modal).queryByRole("button", { name: "Include E7" }));
    });

    it("HR dept: Pick 2 on one cell marks it R and Decided lists it; Pick 1 on every open cell decides them all", async () => {
        const { session, modal } = await joinOn("hr.csv", HR, "Merge");
        const cells = (only: "open" | "decided"): number =>
            draftOf(session).preview().cells({ column: "dept", only }).total;
        assert.strictEqual(cells("open"), 2, "B1 and B2");

        await userEvent.click(await within(modal).findByRole("button", { name: "Cells dept" }));
        const grid = await within(modal).findByRole("grid", { name: "Cells" });
        assert.lengthOf(within(grid).getAllByRole("rowheader"), 2);
        await select(rowWith(grid, "B2"));
        await userEvent.click(within(modal).getByRole("button", { name: "Pick 2" }));
        await waitFor(() => {
            assert.strictEqual(cells("decided"), 1);
        });
        await waitFor(() => {
            const row = rowWith(within(modal).getByRole("grid", { name: "Cells" }), "B2");
            assert.include(row.textContent ?? "", "Research");
            assert.include(within(row).getAllByRole("gridcell").at(-1)?.textContent ?? "", "R");
        });

        const filter = within(modal).getByRole("radiogroup", { name: "Cells" });
        await userEvent.click(within(filter).getByText("Open"));
        const open = await within(modal).findByRole("grid", { name: "Cells" });
        await waitFor(() => {
            assert.lengthOf(within(open).getAllByRole("rowheader"), 1);
        });
        await select(rowWith(open, "B1"));
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.click(within(modal).getByRole("button", { name: "Pick 1" }));
        await waitFor(() => {
            assert.strictEqual(cells("open"), 0);
        });
        assert.strictEqual(cells("decided"), 2);

        await userEvent.click(within(filter).getByText("Decided"));
        const decided = await within(modal).findByRole("grid", { name: "Cells" });
        await waitFor(() => {
            assert.lengthOf(within(decided).getAllByRole("rowheader"), 2);
        });
        await select(rowWith(decided, "B1"));
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.click(within(modal).getByRole("button", { name: "Clear" }));
        await waitFor(() => {
            assert.strictEqual(cells("open"), 2);
        });
    });

    it("Pick 1 decides every selected cell when person is built from two files", async () => {
        const staff = "badge,name,dept\nB5,Di,Ops";
        const hr = "badge,dept\nB1,Operations\nB5,Facilities";
        const { session, modal } = await joinOn("hr.csv", hr, "Merge", staff);
        const cells = (only: "open" | "decided"): number =>
            draftOf(session).preview().cells({ column: "dept", only }).total;
        assert.strictEqual(cells("open"), 2, "B1 from people.csv and B5 from staff.csv");

        await userEvent.click(await within(modal).findByRole("button", { name: "Cells dept" }));
        const grid = await within(modal).findByRole("grid", { name: "Cells" });
        await select(rowWith(grid, "B5"));
        await userEvent.keyboard("{Control>}a{/Control}");
        await userEvent.click(within(modal).getByRole("button", { name: "Pick 1" }));
        await waitFor(() => {
            assert.strictEqual(cells("decided"), 2);
        });
        assert.deepStrictEqual(
            draftOf(session)
                .preview()
                .cells({ column: "dept" })
                .cells.map((each) => each.shown),
            ["Ops", "Ops"],
            "each cell shows the value it held before HR's list",
        );
    });

    it("the Fields view profiles the card's two fields", async () => {
        const { modal } = await joinOn("hr.csv", HR, "Merge");
        const view = within(modal).getByRole("radiogroup", { name: "Fields" });
        await userEvent.click(within(view).getByText("Fields"));
        await within(modal).findByLabelText("hr.csv.badge distinct");
        assert.strictEqual(within(modal).getByLabelText("hr.csv.badge distinct").textContent, "3");
    });
});
