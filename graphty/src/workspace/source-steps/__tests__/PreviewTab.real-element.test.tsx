/**
 * The join workspace's table on the REAL graphty-element with the source-steps experiment on
 * (design/data/multiple-data-sources-design.md, section 5.4), driven by clicks and keys, in the
 * owner's founding example. Door entries made into edges to the people who badged in: a click on the
 * card's new edges count lists its rows in the workspace table, selecting the test badge's row and
 * Exclude leaves that edge out, and Include brings it back. HR's list merged into people: a click
 * on dept in the card lists its cells, Use incoming on one cell marks it R and lists it under Decided,
 * Ctrl+A on the open cells and Use existing decides them all, and Clear takes the picks back. Each
 * field's header says whether its values repeat and how many of its cells are empty.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import {
    draftOf,
    drop,
    emptyProject,
    joinAs,
    openJoins,
    pickFields,
    pickSources,
    rowWith,
    select,
} from "./sourceSteps";

withFeatures(["source-steps"]);

/** T0 is the test badge: a person, so its entry makes an edge like any other. */
const PEOPLE = "badge,name,dept\nB1,Ann,Ops\nB2,Bo,Lab\nB3,Cy,Sales\nT0,Test badge,QA";
/** B9 badges no person; E7 is the test badge's entry. */
const ENTRIES = "entry,badge,door\nE1,B1,D1\nE2,B1,D2\nE3,B2,D1\nE4,B9,D1\nE6,B2,D2\nE7,T0,D1";
/** HR's list: B1 and B2 name another department than people.csv does. */
const HR = "badge,dept\nB1,Operations\nB2,Research\nB3,Sales";

/**
 * People in the graph as type person, one more file dropped and staged, and the join workspace
 * open with its card matching people's badge to the staged file's, with a way to join picked.
 * @param name - the staged file's name.
 * @param text - its contents.
 * @param result - whether its rows become fields on people, or nodes linked to them.
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
    const modal = await openJoins();
    const source = name.replace(".csv", "");
    // A space two sources' rows are is picked as its node kind.
    const nodes = staff === undefined ? "people" : "person";
    await pickSources(modal, nodes, source);
    await pickFields(modal, "badge", "badge");
    await joinAs(
        modal,
        result === "Merge" ? `Fields of ${source} on ${nodes}` : `Node per ${source} row, linked to ${nodes}`,
    );
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

    it("entries in the graph, people staged: excluding and restoring a row redraws After as the card counts it", async () => {
        await page.viewport(1440, 900);
        const { session } = await emptyProject();
        await session.data.import(
            { type: "csv", config: { data: ENTRIES }, name: "entries.csv" },
            { key: "entry", type: "entry" },
        );
        drop("people.csv", PEOPLE);
        await screen.findByRole("listitem", { name: "people.csv" });
        const modal = await openJoins();
        await pickSources(modal, "entries", "people");
        await pickFields(modal, "badge", "badge");
        await joinAs(modal, "Edge from people to entries");
        const drawn = (): string[] =>
            session.data
                .edges()
                .map((edge) => `${String(edge.source)}-${String(edge.target)}`)
                .sort();
        const all = ["B1-E1", "B1-E2", "B2-E3", "B2-E6", "T0-E7"];
        await waitFor(() => {
            assert.deepStrictEqual(drawn(), all);
        });
        await userEvent.click(await within(modal).findByRole("button", { name: "5 new edges" }));
        await select(rowWith(await within(modal).findByRole("grid", { name: "Rows" }), "T0"));
        await userEvent.click(await within(modal).findByRole("button", { name: "Exclude" }));
        await waitFor(() => {
            assert.deepStrictEqual(drawn(), all.slice(0, 4), "redrawn without the test badge's edge");
        });
        await within(modal).findByRole("button", { name: "4 new edges" });
        await userEvent.click(await within(modal).findByRole("button", { name: "Include E7" }));
        await waitFor(() => {
            assert.deepStrictEqual(drawn(), all);
        });
    });

    it("HR dept: Use incoming on one cell marks it R and Decided lists it; Use existing on every open cell decides them all", async () => {
        const { session, modal } = await joinOn("hr.csv", HR, "Merge");
        const cells = (only: "open" | "decided"): number =>
            draftOf(session).preview().cells({ column: "dept", only }).total;
        assert.strictEqual(cells("open"), 2, "B1 and B2");

        await userEvent.click(await within(modal).findByRole("button", { name: "Cells dept" }));
        const grid = await within(modal).findByRole("grid", { name: "Cells" });
        assert.lengthOf(within(grid).getAllByRole("rowheader"), 2);
        await select(rowWith(grid, "B2"));
        await userEvent.click(within(modal).getByRole("button", { name: "Use incoming" }));
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
        await userEvent.click(within(modal).getByRole("button", { name: "Use existing" }));
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

    it("Use existing decides every selected cell when person is built from two files", async () => {
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
        await userEvent.click(within(modal).getByRole("button", { name: "Use existing" }));
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

    it("each field's header says its facts: whether its values repeat, and its empty cells", async () => {
        const { modal } = await joinOn("hr.csv", `${HR}\n,Ops`, "Merge");
        const headers = (name: string): (string | null)[] =>
            within(within(modal).getByRole("grid", { name }))
                .getAllByRole("columnheader")
                .map((header) => header.textContent);
        assert.deepStrictEqual(headers("hr"), ["badge (unique, 1 empty)", "dept (unique)"]);
        assert.include(headers("people"), "badge (unique)");
        assert.lengthOf(within(modal).getAllByRole("img", { name: "Matched" }), 2, "the matched ones are marked");
    });
});
