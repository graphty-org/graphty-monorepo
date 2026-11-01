/**
 * The date condition card on the REAL graphty-element, driven by real clicks and keys: a column
 * graphty-element says measures time is listed with the calendar glyph, its card offers Before,
 * After and Between, and "2005" typed in Before writes the element's range leaf read as time,
 * counting while the reader types. The same card in the Data place's Filters and in a Style layer's
 * Which nodes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, RuleTree } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { GRAPH_FILE_GML } from "../../data-place/fixtures";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Install dates for the small graph's nodes, in node order: three before 2005. */
const INSTALLED = ["1998-05-12", "2003-07-01", "2004-12-31", "2005-01-01", "2010-09-09", "2018-06-27"];

/** Before 2005, as the card writes it. */
const BEFORE_2005: RuleTree = { kind: "range", attribute: "data.installed", max: Date.UTC(2005, 0, 1) - 1, as: "time" };

/**
 * The workspace on a place, with the small graph whose nodes carry `installed`, typed as dates and
 * set as the time.
 * @param place - where it opens.
 * @returns the session.
 */
async function openWithDates(place: "data" | "graph"): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Gauges", id: 1 }, place });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "graph.gml", config: { data: GRAPH_FILE_GML } });
    const ids = session.data.nodes().map((node) => node.id);
    await session.data.updateNodes(
        ids.flatMap((id, at) => (at < INSTALLED.length ? [{ id, values: { installed: INSTALLED[at] } }] : [])),
    );
    await session.data.setType({ kind: "node", name: "installed" }, "date");
    await session.time.setField({ nodes: { start: "installed" } });
    return session;
}

/**
 * Types "2005" into a date card's Before box, checking the count follows the typing.
 * @param card - the card.
 */
async function typeBefore2005(card: HTMLElement): Promise<void> {
    assert.strictEqual(
        within(card).getByRole("combobox", { name: "installed: how to match" }).getAttribute("value"),
        "Before",
    );
    const box = within(card).getByRole("combobox", { name: "installed before, a date or a year" });
    await userEvent.click(box);
    assert.isNull(screen.queryByRole("listbox"), "focus alone lists no dates over the card");
    await userEvent.keyboard("2005");
}

/**
 * The first step's rule of a selection.
 * @param rule - the selection.
 * @returns the step's rule, or undefined.
 */
function stepOf(rule: RuleTree): RuleTree | undefined {
    return rule.kind === "union" ? rule.branches[0]?.steps[0]?.rule : undefined;
}

describe("the date condition card", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("in Filters: installed is listed as a date, and Before 2005 keeps the three put in before", async () => {
        const session = await openWithDates("data");
        await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
        const option = await screen.findByRole("option", { name: /^installed(,|$)/ });
        assert.isNotNull(option.querySelector("svg.lucide-calendar"), "listed with the calendar glyph");
        await userEvent.click(option);
        const list = within(screen.getByRole("region", { name: "Data place" })).getByRole("list", { name: "Filters" });
        const card = await within(list).findByRole("group", { name: /^installed/ });
        await typeBefore2005(card);
        await userEvent.keyboard("{Enter}");
        // A card says what stays: All nodes, then Keep the range.
        await waitFor(() => {
            assert.deepEqual(
                session.visibility.conditions.map((each) => stepOf(each.rule)),
                [BEFORE_2005],
            );
        });
        await waitFor(() => {
            assert.strictEqual([...session.visibility.nodes].length, 3);
        });
    });

    it("in a Style layer's Which nodes: Before 2005 writes the range read as time, and paints three", async () => {
        const session = await openWithDates("graph");
        const layer = await session.styles.add({
            name: "Old",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Old, / }));
        await userEvent.click(await screen.findByRole("button", { name: "Keep..." }));
        const option = await screen.findByRole("option", { name: /^installed(,|$)/ });
        assert.isNotNull(option.querySelector("svg.lucide-calendar"), "listed with the calendar glyph");
        await userEvent.click(option);
        const card = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-step-pane]");
            assert.isNotNull(found);
            return found;
        });
        await typeBefore2005(card);
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const selector = session.styles.get(layer.id)?.selector;
            assert.deepEqual(selector?.match === "rule" ? stepOf(selector.where) : undefined, BEFORE_2005);
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.counts(layer.id).matched, 3);
    });
});
