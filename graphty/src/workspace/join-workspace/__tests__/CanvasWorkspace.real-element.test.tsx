/**
 * The model canvas build of the join workspace, on the REAL graphty-element, driven by real input:
 * open from Join +, hold a table with Table +, drag a column onto another box's column, pick the
 * join kind on the tile menu, change a key in the bar, read the counts, then Done joins (one undo
 * step), Cancel changes nothing, and Ctrl+Z takes a join back inside the workspace.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { dragTo } from "../../../test/real-pointer";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["selection-workspace", "join-workspace"]);

/** Four people, each with a badge. */
const PEOPLE = ["person_id,badge,name", "P1,B-1,Ana", "P2,B-2,Ben", "P3,B-3,Cy", "P4,B-4,Di"].join("\n");

/** Two buildings. */
const BUILDINGS = ["id,name", "b1,North", "b2,South"].join("\n");

/** Five badge entries: one badge the graph lacks, one building in upper case. */
const ENTRIES = ["badge,building", "B-1,b1", "B-2,b1", "B-3,B2", "B-4,b2", "B-9,b1"].join("\n");

/**
 * The workspace on the Data place with the people and the buildings loaded, each its own source.
 * @returns the session.
 */
async function open(): Promise<GraphSession> {
    await page.viewport(1440, 1000);
    const store = createWorkspaceStore({ project: { name: "Join", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    const people = await session.data.prepare({ type: "csv", config: { data: PEOPLE }, name: "people.csv" });
    await people.load({ mapping: { rowsAre: "nodes", key: "person_id" } });
    const buildings = await session.data.prepare({ type: "csv", config: { data: BUILDINGS }, name: "buildings.csv" });
    await buildings.load({ mode: "merge", mapping: { rowsAre: "nodes", key: "id" } });
    return session;
}

/** Badge entries with the minutes each stayed: B-1 into b1 twice. */
const STAYS = ["badge,building,minutes", "B-1,b1,5", "B-1,b1,7", "B-2,b2,3"].join("\n");

/**
 * Opens the workspace from Join + and holds the entries with Table +.
 * @param entries - the entries file's text.
 * @returns the workspace's dialog.
 */
async function workspaceWithEntries(entries = ENTRIES): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    await userEvent.click(await within(place).findByRole("button", { name: "Join" }));
    const dialog = await screen.findByRole("dialog", { name: "Join" });
    const input = dialog.querySelector<HTMLInputElement>('input[aria-label="Table file"]');
    assert.isNotNull(input);
    if (input !== null) {
        await userEvent.upload(input, new File([entries], "entries.csv", { type: "text/csv" }));
    }
    await within(dialog).findByRole("group", { name: "entries.csv" });
    return dialog;
}

/**
 * A box's column row.
 * @param dialog - the workspace.
 * @param box - the box's name.
 * @param column - the column.
 * @returns the row.
 */
function column(dialog: HTMLElement, box: string, column: string): HTMLElement {
    const row = within(within(dialog).getByRole("group", { name: box })).getByLabelText(`${box} ${column}`);
    return row;
}

/**
 * Drags one box's column onto another's, as a reader does, and waits for the tile menu.
 * @param dialog - the workspace.
 * @param from - the dragged box and column.
 * @param to - the box and column let go on.
 * @returns the tile menu.
 */
async function connect(
    dialog: HTMLElement,
    from: readonly [string, string],
    to: readonly [string, string],
): Promise<HTMLElement> {
    const target = column(dialog, ...to).getBoundingClientRect();
    await dragTo(column(dialog, ...from), { x: target.left + target.width / 2, y: target.top + target.height / 2 });
    return screen.findByRole("menu", { name: "Join kind" });
}

/**
 * The bar's text, its spaces collapsed.
 * @param dialog - the workspace.
 * @returns the text.
 */
function bar(dialog: HTMLElement): string {
    return (within(dialog).getByRole("region", { name: "Joins" }).textContent ?? "").replaceAll(/\s+/g, " ");
}

describe("the model canvas join workspace", () => {
    it("joins rows as edges by a drag, a tile and a key changed in the bar; Done applies it as one step", async () => {
        const session = await open();
        const before = session.history.steps.length;
        const dialog = await workspaceWithEntries();
        const menu = await connect(dialog, ["entries.csv", "badge"], ["people.csv", "badge"]);
        // Every tile shows its number key; the suggested one is picked by Enter.
        const edges = within(menu).getByRole("menuitem", { name: /Turn rows into edges/ });
        assert.strictEqual(edges.getAttribute("aria-keyshortcuts"), "2");
        await userEvent.keyboard("2");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu", { name: "Join kind" }));
        });
        const tab = await within(dialog).findByRole("tab", { name: /Edges entries/ });
        assert.strictEqual(tab.getAttribute("aria-selected"), "true");

        // The second end: the building column, onto the buildings' ids.
        await userEvent.click(within(dialog).getByLabelText("Key 2 column"));
        await userEvent.click(await screen.findByRole("option", { name: "building" }));
        await waitFor(() => {
            assert.include(bar(dialog), "+5 edges");
        });
        // B2 is a new end until case is ignored.
        const hint = await within(dialog).findByRole("button", { name: /^Ignore case \+1/ });
        await userEvent.click(hint);
        await waitFor(() => {
            assert.notInclude(bar(dialog), "Ignore case +");
            assert.include(bar(dialog), "+1 nodes");
        });
        assert.strictEqual(session.data.edges().length, 0, "nothing changes before Done");

        await userEvent.keyboard("{Control>}{Enter}{/Control}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 5);
        });
        assert.strictEqual(session.history.steps.length, before + 1);
        assert.deepEqual(
            session.data.joins().map((join) => join.table.name),
            ["entries.csv"],
        );
    });

    it("discards on Cancel, and takes a join back with Ctrl+Z inside the workspace", async () => {
        const session = await open();
        const nodes = session.data.nodes().length;
        const dialog = await workspaceWithEntries();
        await connect(dialog, ["entries.csv", "badge"], ["people.csv", "badge"]);
        await userEvent.click(await screen.findByRole("menuitem", { name: /Put values on nodes/ }));
        await within(dialog).findByRole("tab", { name: /Values entries/ });
        // The values join's count is on its pill and its tab: four badges match.
        assert.include(within(dialog).getByRole("tab", { name: /Values entries/ }).textContent, "4");

        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.isNull(within(dialog).queryByRole("tab", { name: /Values entries/ }));
        });
        await userEvent.keyboard("{Shift>}{Control>}z{/Control}{/Shift}");
        await within(dialog).findByRole("tab", { name: /Values entries/ });

        await userEvent.click(within(dialog).getByRole("button", { name: /^Cancel/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.strictEqual(session.data.nodes().length, nodes);
        assert.deepEqual(session.data.joins(), []);
        assert.isUndefined(session.data.node("P1")?.building);
    });

    it("makes one edge per pair, its rows counted and a column summed", async () => {
        const session = await open();
        const dialog = await workspaceWithEntries(STAYS);
        await connect(dialog, ["entries.csv", "badge"], ["people.csv", "badge"]);
        await userEvent.keyboard("2");
        await userEvent.click(await within(dialog).findByLabelText("Key 2 column"));
        await userEvent.click(await screen.findByRole("option", { name: "building" }));
        // B-1 into b1 twice is one pair: one edge either way.
        await waitFor(() => {
            assert.include(bar(dialog), "+2 edges");
        });
        await userEvent.click(within(within(dialog).getByRole("radiogroup", { name: "Edges" })).getByText("Per pair"));
        await userEvent.click(within(dialog).getByLabelText("Pair column"));
        await userEvent.click(await screen.findByRole("option", { name: "minutes" }));
        await userEvent.click(within(dialog).getByLabelText("Pair reduction"));
        await userEvent.click(await screen.findByRole("option", { name: "Sum" }));

        await userEvent.keyboard("{Control>}{Enter}{/Control}");
        await waitFor(() => {
            assert.strictEqual(session.data.edges().length, 2);
        });
        const stay = session.data.edges().find((edge) => edge.source === "P1");
        assert.deepInclude(stay, { target: "b1", minutes: 12, "badge (count)": 2 });
        assert.strictEqual(session.data.nodes().length, 6, "no end is made of a count");
    });

    it("closes only the tile menu on Esc after a click on empty canvas", async () => {
        await open();
        const dialog = await workspaceWithEntries();
        await connect(dialog, ["entries.csv", "badge"], ["people.csv", "badge"]);
        // The click takes focus out of the menu, which stays open until a tile or Esc.
        await userEvent.click(within(dialog).getByTestId("join-canvas"), { position: { x: 8, y: 8 } });
        assert.isNotNull(screen.queryByRole("menu", { name: "Join kind" }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu", { name: "Join kind" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }), "the workspace stays open");
    });

    it("closes the tile menu on Esc, and a second Esc cancels the workspace", async () => {
        await open();
        const dialog = await workspaceWithEntries();
        await connect(dialog, ["entries.csv", "badge"], ["people.csv", "badge"]);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menu", { name: "Join kind" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Join" }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
    });
});
