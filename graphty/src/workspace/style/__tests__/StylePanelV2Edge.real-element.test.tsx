/**
 * Style panel v2's edge things on the REAL graphty-element, driven by real clicks and typing
 * (design/ui/style-panel-v2/design.md, sections 4.2, 7.2 and 8): Arrows adds a Target arrow whose
 * arrow comes from a list shown one section at a time, with a Size line under it; the Line's Width
 * line, its Pattern sub-group and the dash length | gap pair; a caption's distance from its end in
 * its Position sub-group; the Route row's value list; the Line's Color from, Source taper and Strands kind and
 * Pattern's Custom dash list, each changing the picture. Each write is undone in one step (edits of
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
import { openGroup, pickKind, picture, pixelsApart, popoverLine, sectionOf, written } from "./v2Harness";

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
    // The fields a reader types in: a slider's hidden value input is not one.
    const input = [...line.querySelectorAll<HTMLInputElement>("input")].filter((each) => each.type !== "hidden")[which];
    assert.isDefined(input);
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
}

/**
 * Adds a thing from an empty section's title and its "+" menu.
 * @param tab - the Style tab.
 * @param section - the section's id ("edge-arrows").
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

/**
 * Opens a row's settings pop-over and waits for one of its lines: an unset line shows only there (design 2.5).
 * @param row - the row.
 * @param title - the thing's name with its kind ("Edge target").
 * @param selector - the line.
 * @returns the line.
 */
async function settingsLine(row: HTMLElement, title: string, selector: string): Promise<HTMLElement> {
    await userEvent.click(within(row).getByRole("button", { name: new RegExp(`^${title} settings`) }));
    const pop = await found(document, "[data-thing-popover]");
    return popoverLine(pop, selector);
}

/**
 * Picks a route from the Route row's value list (ia-design 2: the route is a list, each route with its icon).
 * @param row - the Route row.
 * @param name - the route's name.
 */
async function pickRoute(row: HTMLElement, name: RegExp): Promise<void> {
    await userEvent.click(await found(row, '[data-value-listbox="edge.route"]'));
    const list = await screen.findByRole("group", { name: /values$/ });
    await userEvent.click(within(list).getByRole("option", { name }));
}

/**
 * Holds the graph still with one long edge across the middle, so a picture changes only by how edges are drawn.
 * @param session - the session.
 * @returns the element.
 */
async function stillEdge(session: GraphSession): Promise<HTMLElementTagNameMap["graphty-element"]> {
    await session.layout.set("fixed");
    await session.data.addNodes([
        { id: "p", position: { x: -20, y: 0, z: 0 } },
        { id: "q", position: { x: 20, y: 0, z: 0 } },
    ]);
    await session.data.addEdges([{ source: "p", target: "q" }]);
    await session.styles.settled();
    const element = document.querySelector("graphty-element");
    if (element === null) {
        throw new Error("no graphty-element");
    }
    // Still: two pictures in a row are the same, so a change after an edit is the edit's.
    assert.equal(pixelsApart(await picture(element), await picture(element)), 0, "the graph holds still");
    return element;
}

/**
 * The picture once the styles have settled.
 * @param session - the session.
 * @param element - the element.
 * @returns its pixels.
 */
async function settledPicture(
    session: GraphSession,
    element: HTMLElementTagNameMap["graphty-element"],
): Promise<ImageData> {
    await session.styles.settled();
    return picture(element);
}

describe("Style panel v2's edge things", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("Arrows' '+' adds a Target arrow; its arrow comes from a sectioned list; Size writes and undoes", async () => {
        const { session, id, tab } = await openEdges();
        // Arrows holds one item, Arrow (C6): its "+" adds it at once, the first free end being the target.
        const arrows = sectionOf(tab, "edge-arrows");
        await userEvent.click(within(arrows).getByRole("button", { name: /^Add to edge arrows/ }));
        const row = await found(arrows, '[data-thing="arrow"]');
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

        const size = await settingsLine(row, "Edge target", '.ws-row[data-line="edge.arrowHeadSize"]');
        await typeInto(size, "3");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.arrowHeadSize"), 3);
            assert.isNotNull(
                row.querySelector('.ws-row[data-line="edge.arrowHeadSize"]'),
                "set, Size shows under the row",
            );
        });
        await userEvent.keyboard("{Escape}");
        await undo();
        await waitFor(() => {
            // "+" Arrow started the size at graphty-element's 1, so its Size line shows (ia-design 2).
            assert.equal(written(session, id, "edge.arrowHeadSize"), 1, "one Undo takes the size back to its start");
        });
    });

    it("the Line's Width, its Pattern and the dash length | gap pair write, each undone in one step", async () => {
        const { session, id, tab } = await openEdges();
        const line = sectionOf(tab, "edge-line");
        const row = await found(line, '[data-thing="line"]');
        const width = await settingsLine(row, "Edge line", '.ws-row[data-line="edge.width"]');
        await typeInto(width, "2");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.width"), 2);
        });
        await userEvent.keyboard("{Escape}");
        await undo();
        await waitFor(() => {
            assert.isUndefined(written(session, id, "edge.width"), "one Undo takes the width off");
        });

        // Pattern is the Line section's own item (ia-design 2): its "+" starts a dashed line.
        await userEvent.click(within(line).getByRole("button", { name: /^Add to edge line/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pattern" }));
        await waitFor(() => {
            assert.equal(written(session, id, "edge.style"), "dash", "'+' Pattern starts a pattern that shows");
        });
        const patternRow = await found(line, '[data-thing="pattern"]');
        await userEvent.click(await found(patternRow, '[data-value-listbox="edge.style"]'));
        const list = await screen.findByRole("group", { name: /values$/ });
        await userEvent.click(within(list).getByRole("option", { name: /^Dot/ }));
        await waitFor(() => {
            assert.equal(written(session, id, "edge.style"), "dot", "the row's list picks the pattern");
        });

        await userEvent.click(within(patternRow).getByRole("button", { name: /^Edge pattern settings/ }));
        const pop = await found(document, "[data-thing-popover]");
        // A dot pattern draws its dash and gap, so the line is the pop-over's own (design "Input rules").
        const dash = await found(pop, '.ws-row[data-line="edge.dashLength"]');
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
        const row = await addFromTitle(tab, "edge-text", "End caption", "endCaption");
        await userEvent.keyboard("{Escape}");
        // Size is a line of the row itself (ia-design 2).
        await typeInto(await found(row, '.ws-row[data-line="edge.arrowHeadTextStyle.size"]'), "12");
        await waitFor(() => {
            assert.deepEqual(written(session, id, "edge.arrowHeadTextStyle"), { size: 12 });
        });
        await userEvent.click(within(row).getByRole("button", { name: /^Edge target settings/ }));
        const pop = await found(document, "[data-thing-popover]");
        // A caption's label groups are its "..." menu's, as a label's are (design "Input rules"): no "+".
        assert.isNull(within(pop).queryByRole("button", { name: "Add to edge target settings" }));
        const position = (await openGroup(pop, "Position")).closest<HTMLElement>("[data-popout-id]");
        assert.isNotNull(position, "the Position pop-over");
        await typeInto(await found(position, '.ws-row[data-line="edge.arrowHeadTextDistance"]'), "0.5");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.arrowHeadTextDistance"), 0.5);
        });

        await userEvent.click(within(position).getByRole("button", { name: "Remove position" }));
        await waitFor(() => {
            assert.isUndefined(written(session, id, "edge.arrowHeadTextDistance"), "the distance goes");
        });
        assert.deepEqual(written(session, id, "edge.arrowHeadTextStyle"), { size: 12 }, "the size stays");
        // Escape closes the Position pop-over, then the pop-over.
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await undo();
        await waitFor(() => {
            assert.equal(written(session, id, "edge.arrowHeadTextDistance"), 0.5, "one Undo brings it back");
        });
    });

    it("the Route row switches to Arc from its value list, and one Undo switches back", async () => {
        const { session, id, tab } = await openEdges();
        const row = await addFromTitle(tab, "edge-route", "Route", "route");
        const start = await waitFor(() => {
            const value = written(session, id, "edge.route");
            assert.isDefined(value, "Route starts with its route");
            return value;
        });
        assert.notEqual(start, "arc");
        await pickRoute(row, /^Arc/);
        await waitFor(() => {
            assert.equal(written(session, id, "edge.route"), "arc");
        });
        await undo();
        await waitFor(() => {
            assert.notEqual(written(session, id, "edge.route"), "arc", "one Undo switches back");
        });
    });

    it("the Route row's Bundling draws the edges bundled: the graph changes", async () => {
        const { session, id, tab } = await openEdges();
        // Six near-parallel edges, held still, so the picture changes only by how they are drawn.
        await session.layout.set("fixed");
        await session.data.addNodes(
            Array.from({ length: 6 }, (_, i) => [
                { id: `l${String(i)}`, position: { x: -20, y: i * 2, z: 0 } },
                { id: `r${String(i)}`, position: { x: 20, y: i * 2 + 1, z: 0 } },
            ]).flat(),
        );
        await session.data.addEdges(
            Array.from({ length: 6 }, (_, i) => ({ source: `l${String(i)}`, target: `r${String(i)}` })),
        );
        await session.styles.settled();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        if (element === null) {
            return;
        }
        const row = await addFromTitle(tab, "edge-route", "Route", "route");
        await waitFor(() => {
            assert.isDefined(written(session, id, "edge.route"));
        });
        await session.styles.settled();
        const before = await picture(element);
        await pickRoute(row, /^Bundl/);
        await waitFor(() => {
            assert.equal(written(session, id, "edge.route"), "bundled");
        });
        await session.styles.settled();
        assert.isAbove(pixelsApart(before, await picture(element)), 0, "the edges are drawn bundled");
    });
    it("the Line's Color from draws the line in its source node's color", async () => {
        const { session, id, tab } = await openEdges();
        const element = await stillEdge(session);
        await session.styles.add({
            name: "Blue nodes",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#1C7ED6" },
        });
        const before = await settledPicture(session, element);
        const row = await found(sectionOf(tab, "edge-line"), '[data-thing="line"]');
        const colorFrom = await settingsLine(row, "Edge line", '.ws-row[data-line="edge.colorFrom"]');
        // Three choices: grouped buttons (design "Input rules"), in the line's Advanced dialog.
        await userEvent.click(within(colorFrom).getByText("Source"));
        await waitFor(() => {
            assert.equal(written(session, id, "edge.colorFrom"), "source");
        });
        assert.isAbove(
            pixelsApart(before, await settledPicture(session, element)),
            0,
            "the line takes the node's color",
        );
        // The color from a node is a Solid line's: another kind takes it off. Escape first closes the Advanced
        // dialog, back to the pop-over.
        await userEvent.keyboard("{Escape}");
        await pickKind(row, "Edge line", "Strands");
        await waitFor(() => {
            assert.isDefined(written(session, id, "edge.strandColors"));
            assert.isUndefined(written(session, id, "edge.colorFrom"), "Strands take Color from off");
        });
    });

    it("the Line's Source taper narrows the line at its source", async () => {
        const { session, id, tab } = await openEdges();
        const element = await stillEdge(session);
        const before = await settledPicture(session, element);
        const row = await found(sectionOf(tab, "edge-line"), '[data-thing="line"]');
        await typeInto(await settingsLine(row, "Edge line", '.ws-row[data-line="edge.taperSource"]'), "0");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.taperSource"), 0);
        });
        assert.isAbove(pixelsApart(before, await settledPicture(session, element)), 0, "the source end narrows");
    });

    it("the Line's Kind switches to Strands, which draw at once, and Spacing spreads them", async () => {
        const { session, id, tab } = await openEdges();
        const element = await stillEdge(session);
        const before = await settledPicture(session, element);
        const line = sectionOf(tab, "edge-line");
        const row = await found(line, '[data-thing="line"]');
        await pickKind(row, "Edge line", "Strands");
        await waitFor(() => {
            const colors = written(session, id, "edge.strandColors");
            assert.isString(colors);
            assert.lengthOf(String(colors).split(" "), 2, "two strands to start");
            assert.isUndefined(written(session, id, "edge.color"), "strands draw in place of the color");
        });
        const strands = await settledPicture(session, element);
        assert.isAbove(pixelsApart(before, strands), 0, "the strands are drawn");

        const pop = await found(document, "[data-thing-popover]");
        await typeInto(await found(pop, '.ws-row[data-line="edge.strandSpacing"]'), "3");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.strandSpacing"), 3);
        });
        assert.isAbove(pixelsApart(strands, await settledPicture(session, element)), 0, "the strands spread apart");
        // The strands' list opens beside the pop-over from its line, as a pie's slices do: each strand a line.
        await userEvent.click(within(pop).getByRole("button", { name: /^Edit strands/ }));
        await found(document, '[data-line="edge.strandColors:1"]');
    });

    it("Pattern's Custom dash list draws its own dashes on a dashed line", async () => {
        const { session, id, tab } = await openEdges();
        const element = await stillEdge(session);
        const line = sectionOf(tab, "edge-line");
        await userEvent.click(within(line).getByRole("button", { name: /^Add to edge line/ }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Pattern" }));
        await waitFor(() => {
            assert.equal(written(session, id, "edge.style"), "dash");
        });
        const before = await settledPicture(session, element);
        const patternRow = await found(line, '[data-thing="pattern"]');
        await userEvent.click(within(patternRow).getByRole("button", { name: /^Edge pattern settings/ }));
        const pop = await found(document, "[data-thing-popover]");
        await typeInto(await found(pop, '.ws-row[data-line="edge.dashArray"]'), "8 1 2 1");
        await waitFor(() => {
            assert.equal(written(session, id, "edge.dashArray"), "8 1 2 1");
        });
        assert.isAbove(pixelsApart(before, await settledPicture(session, element)), 0, "the dashes follow the list");
    });
});
