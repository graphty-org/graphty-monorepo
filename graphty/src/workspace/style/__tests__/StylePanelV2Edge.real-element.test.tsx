/**
 * Style panel v2's edge things on the REAL graphty-element, driven by real clicks and typing
 * (design/ui/style-panel-v2/design.md, sections 4.2, 7.2 and 8): Ends adds a Target end whose
 * arrow comes from a list shown one section at a time, with a Size line under it; the Line's Width
 * line, its Pattern sub-group and the dash length | gap pair; a caption's distance from its end in
 * its Position sub-group; the Route row's icon segments. Each write is undone in one step (edits of
 * one layer within the element's coalescing window may share that step, so an Undo is checked only
 * for the write it must take back).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";
import { sectionOf, written } from "./v2Harness";

/**
 * Opens three nodes, two edges and a layer "Links" over every edge that sets only its color, on
 * the layer's Style tab, edge tab.
 * @returns the session, the layer's id and the Style tab.
 */
async function openEdges(): Promise<{ session: GraphSession; id: string; tab: HTMLElement }> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "b", target: "c" },
    ]);
    const { id } = await session.styles.add({
        name: "Links",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#E8590C" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Links, / }));
    const inspector = screen.getByRole("complementary", { name: "Inspector" });
    const style = await within(inspector).findByRole("tab", { name: "Style" });
    if (style.getAttribute("aria-selected") !== "true") {
        await userEvent.click(style);
    }
    const tab = await screen.findByTestId("style-tab");
    await showKind("edge");
    return { session, id, tab };
}

/**
 * Waits for an element in a part of the page.
 * @param root - where it is.
 * @param selector - what it is.
 * @returns the element.
 */
async function found(root: ParentNode, selector: string): Promise<HTMLElement> {
    return waitFor(() => {
        const each = root.querySelector<HTMLElement>(selector);
        assert.isNotNull(each, selector);
        return each;
    });
}

/**
 * Types a number into a line's field and commits it with Enter.
 * @param line - the line.
 * @param text - what to type.
 * @param which - which of the line's fields (0, or 1 for a pair's second).
 */
async function typeInto(line: HTMLElement, text: string, which = 0): Promise<void> {
    const input = line.querySelectorAll<HTMLInputElement>("input")[which];
    assert.isDefined(input);
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
}

/**
 * Adds a thing from an empty section's title and its "+" menu.
 * @param tab - the Style tab.
 * @param section - the section's id ("edge-ends").
 * @param item - the menu item.
 * @param thing - the thing's id.
 * @returns the thing's row.
 */
async function addFromTitle(tab: HTMLElement, section: string, item: string, thing: string): Promise<HTMLElement> {
    const where = sectionOf(tab, section);
    const plus = where.querySelector<HTMLElement>("[data-plus]");
    assert.isNotNull(plus, 'the section\'s "+"');
    await userEvent.click(plus);
    await userEvent.click(await screen.findByRole("menuitem", { name: item }));
    return found(where, `[data-thing="${thing}"]`);
}

/** Clicks the Undo button once. */
async function undo(): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
}

/**
 * The rows the open value list shows.
 * @param list - the list.
 * @returns their names.
 */
function rowNames(list: HTMLElement): string[] {
    return within(list)
        .getAllByRole("option")
        .map((option) => option.textContent ?? "");
}

describe("Style panel v2's edge things", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Ends adds a Target end once; its arrow comes from a sectioned list; Size writes and undoes", async () => {
        const { session, id, tab } = await openEdges();
        const row = await addFromTitle(tab, "edge-ends", "Target end", "target");
        await waitFor(() => {
            assert.isDefined(written(session, id, "edge.arrowHead"), "the end starts with its arrow");
        });

        await userEvent.click(await found(row, '[data-value-listbox="edge.arrowHead"]'));
        const list = await screen.findByRole("group", { name: /values$/ });
        assert.isAtMost(rowNames(list).length, 12, "one section's rows");
        assert.isNotNull(screen.getByRole("combobox", { name: / section$/ }), "a section select");
        await userEvent.click(within(list).getByRole("combobox", { name: "Search" }));
        await userEvent.keyboard("crow");
        await waitFor(() => {
            assert.isTrue(
                rowNames(list).some((name) => name.startsWith("Crow")),
                "search reaches another section",
            );
        });
        await userEvent.click(within(list).getByRole("option", { name: /^Crow/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "edge.arrowHead"), "crow");
        });

        const size = await found(row, '.ws-row[data-line="edge.arrowHeadSize"]');
        await typeInto(size, "3");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.arrowHeadSize"), 3);
        });
        await userEvent.click(within(sectionOf(tab, "edge-ends")).getByRole("button", { name: /^Add/ }));
        await screen.findByRole("menuitem", { name: "Source end" });
        assert.isNull(screen.queryByRole("menuitem", { name: "Target end" }), "each end is added once");
        await userEvent.keyboard("{Escape}");
        await undo();
        await waitFor(() => {
            assert.isUndefined(written(session, id, "edge.arrowHeadSize"), "one Undo takes the size off");
        });
    });

    it("the Line's Width, its Pattern and the dash length | gap pair write, each undone in one step", async () => {
        const { session, id, tab } = await openEdges();
        const line = sectionOf(tab, "edge-line");
        const row = await found(line, '[data-thing="line"]');
        const width = await found(row, '.ws-row[data-line="edge.width"]');
        await typeInto(width, "2");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.width"), 2);
        });
        await undo();
        await waitFor(() => {
            assert.isUndefined(written(session, id, "edge.width"), "one Undo takes the width off");
        });

        await userEvent.click(within(row).getByRole("button", { name: "Edge line settings" }));
        const pop = await found(document, "[data-thing-popover]");
        await userEvent.click(within(pop).getByRole("button", { name: "Add to edge line settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pattern" }));
        const pattern = await within(pop).findByRole("group", { name: "Pattern" });
        await userEvent.click(await found(pattern, '[data-value-listbox="edge.style"]'));
        const list = await screen.findByRole("group", { name: /values$/ });
        await userEvent.click(within(list).getByRole("option", { name: /^Dashed/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "edge.style"), "dash");
        });

        const dash = await found(pattern, '.ws-row[data-line="edge.dashLength"]');
        await typeInto(dash, "0.4");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.dashLength"), 0.4);
        });
        await typeInto(dash, "0.2", 1);
        await waitFor(() => {
            assert.equal(written(session, id, "edge.dashGap"), 0.2);
        });
        await undo();
        await waitFor(() => {
            assert.isUndefined(written(session, id, "edge.dashGap"), "one Undo takes the gap off");
        });
    });

    it("a caption's Position adds its distance from its end, and the legend's minus takes it off in one step", async () => {
        const { session, id, tab } = await openEdges();
        const row = await addFromTitle(tab, "edge-text", "Target caption", "targetCaption");
        await userEvent.keyboard("{Escape}");
        await typeInto(await found(row, '.ws-row[data-line="edge.arrowHeadTextStyle.size"]'), "12");
        await waitFor(() => {
            assert.deepEqual(written(session, id, "edge.arrowHeadTextStyle"), { size: 12 });
        });

        await userEvent.click(within(row).getByRole("button", { name: "Edge target caption settings" }));
        const pop = await found(document, "[data-thing-popover]");
        await userEvent.click(within(pop).getByRole("button", { name: "Add to edge target caption settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Position" }));
        const position = await within(pop).findByRole("group", { name: "Position" });
        await typeInto(await found(position, '.ws-row[data-line="edge.arrowHeadTextDistance"]'), "0.5");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.arrowHeadTextDistance"), 0.5);
        });

        await userEvent.click(within(position).getByRole("button", { name: "Remove position" }));
        await waitFor(() => {
            assert.isUndefined(written(session, id, "edge.arrowHeadTextDistance"), "the distance goes");
        });
        assert.deepEqual(written(session, id, "edge.arrowHeadTextStyle"), { size: 12 }, "the size stays");
        await userEvent.keyboard("{Escape}");
        await undo();
        await waitFor(() => {
            assert.equal(written(session, id, "edge.arrowHeadTextDistance"), 0.5, "one Undo brings it back");
        });
    });

    it("the Route row switches to Arc by its icon segment, and one Undo switches back", async () => {
        const { session, id, tab } = await openEdges();
        const row = await addFromTitle(tab, "edge-route", "Route", "route");
        const start = await waitFor(() => {
            const value = written(session, id, "edge.route");
            assert.isDefined(value, "Route starts with its route");
            return value;
        });
        assert.notEqual(start, "arc");
        const radio = within(row).getByRole("radio", { name: "Arc" });
        const label = document.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
        assert.isNotNull(label);
        await userEvent.click(label);
        await waitFor(() => {
            assert.equal(written(session, id, "edge.route"), "arc");
        });
        await undo();
        await waitFor(() => {
            assert.notEqual(written(session, id, "edge.route"), "arc", "one Undo switches back");
        });
    });
});
