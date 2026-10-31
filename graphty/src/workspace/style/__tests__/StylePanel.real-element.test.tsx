/**
 * The Style tab on the REAL graphty-element, driven by real input (tier3 design, decision 1.1 and
 * section 2.2): every core field drawn, empty with what lies beneath as its placeholder; typing
 * writes on that row only; Clear on the minus, by an emptied field and Enter, and by Delete on a
 * select, each one undo step; the glyph grid; a rare property set in the settings pop-out drawn as
 * its own row; a group hidden when the row does not paint that kind; the route layer's height.
 * Every assertion reads the element's own layers or the page.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { act, findValuePicker, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { showKind } from "./kindTab";

/**
 * A new project on a five-node path with the starting rows on.
 * @returns the session.
 */
async function openProject(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.addNodes([1, 2, 3, 4, 5].map((id) => ({ id, name: `N${String(id)}` })));
    await session.data.addEdges([1, 2, 3, 4].map((id) => ({ source: id, target: id + 1 })));
    await session.config.set({ startingRows: true, editableBase: true });
    await session.styles.settled();
    return session;
}

/**
 * Opens a tree row's Style tab by a click on the row.
 * @param name - the row's visible name.
 * @returns the Style tab.
 */
async function openRow(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    return screen.findByTestId("style-tab");
}

/**
 * The node part of a starting row, found by its name.
 * @param session - the session.
 * @param name - the row's name.
 * @returns the layer's id.
 */
function nodePart(session: GraphSession, name: string): string {
    const layer = session.styles.list().find((l) => l.name === name && l.target === "node");
    if (layer === undefined) {
        throw new Error(`no node layer ${name}`);
    }
    return layer.id;
}

/**
 * What one layer writes for a channel.
 * @param session - the session.
 * @param id - the layer.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
function written(session: GraphSession, id: string, channel: string): unknown {
    const layer = session.styles.get(id);
    return (layer?.set as Record<string, unknown> | undefined)?.[channel];
}

describe("the Style tab's fields on the real element", () => {
    it("Size on Selected: added from '+' at the size beneath, typed on that row only, removed by the minus and undone in one step", async () => {
        await page.viewport(1440, 900);
        const session = await openProject();
        const selected = nodePart(session, "Selected");
        const tab = await openRow("Selected");
        assert.isNull(tab.querySelector('[data-line="node.size"]'), "Selected sets no size: no row");
        const others = (): unknown[] =>
            session.styles
                .list()
                .filter((l) => l.id !== selected)
                .map((l) => (l.set as Record<string, unknown> | undefined)?.["node.size"]);
        const before = JSON.stringify(others());

        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const size = await within(tab).findByRole<HTMLInputElement>("spinbutton", { name: /^Node size/ });
        assert.equal(size.value, "1", "it shows the size beneath");
        assert.isUndefined(written(session, selected, "node.size"), "and writes nothing before a value");
        await userEvent.tripleClick(size);
        await userEvent.keyboard("2{Enter}");
        await waitFor(() => {
            assert.equal(written(session, selected, "node.size"), 2);
        });
        assert.equal(JSON.stringify(others()), before, "no other layer changed");

        await userEvent.click(within(tab).getByRole("button", { name: "Remove node size" }));
        await waitFor(() => {
            assert.isUndefined(written(session, selected, "node.size"));
            assert.isNull(tab.querySelector('[data-line="node.size"]'), "the row is gone");
        });

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, selected, "node.size"), 2, "one Undo restores 2");
        });

        // Emptying the field and pressing Enter removes it too.
        const again = await within(tab).findByRole("spinbutton", { name: /^Node size/ });
        await userEvent.click(again);
        await userEvent.keyboard("{Control>}a{/Control}{Backspace}{Enter}");
        await waitFor(() => {
            assert.isUndefined(written(session, selected, "node.size"));
        });
    });

    it("Shape: the grid picks Octahedron, Delete removes it, and Show set to Hidden is a Visibility row", async () => {
        await page.viewport(1440, 900);
        const session = await openProject();
        const selected = nodePart(session, "Selected");
        const tab = await openRow("Selected");

        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        await userEvent.click(await within(tab).findByRole("combobox", { name: /^Node shape/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Octahedron" }));
        await waitFor(() => {
            assert.equal(written(session, selected, "node.shape"), "octahedron");
        });
        within(tab)
            .getByRole("combobox", { name: /^Node shape/ })
            .focus();
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.isUndefined(written(session, selected, "node.shape"));
        });

        const visibility = within(tab).getByRole("group", { name: "Visibility" });
        await userEvent.click(within(visibility).getByRole("button", { name: "Add to node visibility" }));
        // Hide and Show are two items, and Show is offered with no layer beneath hiding anything.
        assert.isNotNull(await screen.findByRole("menuitem", { name: "Show elements a layer beneath hides" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Hide" }));
        await waitFor(() => {
            assert.isFalse(written(session, selected, "node.visible"));
        });
        assert.isNotNull(within(visibility).getByRole("button", { name: "Remove node show" }));
    });

    it("an edges-only layer opens on its Edge tab, its Node tab off", async () => {
        await page.viewport(1440, 900);
        const session = await openProject();
        await session.styles.add({
            name: "Edge betweenness",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.width": 3 },
        });
        const tab = await openRow("Edge betweenness");
        const kinds = within(tab).getByRole("tablist", { name: "Style for" });
        assert.strictEqual(within(kinds).getByRole("tab", { name: /^Edge/ }).getAttribute("aria-selected"), "true");
        assert.include(within(kinds).getByRole("tab", { name: /^Node/ }).textContent ?? "", "not styled");
        assert.isNotNull(tab.querySelector('[data-group="edge"]'));
        assert.isNull(tab.querySelector('[data-group="node"]'));
    });

    it("the route layer's height at 1440 x 900 and 900 x 700 is recorded", async ({ annotate }) => {
        await page.viewport(1440, 900);
        const session = await openProject();
        await session.styles.addRow({
            name: "Route N1 to N4",
            target: "both",
            selector: { match: "ids", nodes: [1, 2, 3, 4] },
            set: { color: "#D55E00", "node.size": 1.5, "edge.width": 3, "edge.arrowHead": "normal" },
            encode: { "node.label": { by: "data.name" } },
        });
        const tab = await openRow("Route N1 to N4");
        assert.isNotNull(within(tab).getByRole("tablist", { name: "Style for" }));
        assert.isNotNull(tab.querySelector('[data-group="node"]'));

        /**
         * The panel's scroll box: the nearest ancestor of the tab that scrolls.
         * @returns the box.
         */
        const scroller = (): HTMLElement => {
            let box: HTMLElement | null = tab.parentElement;
            while (box !== null && !["auto", "scroll"].includes(getComputedStyle(box).overflowY)) {
                box = box.parentElement;
            }
            return box ?? document.documentElement;
        };
        const tall = scroller();
        const wide = `route layer at 1440 x 900: content ${String(tall.scrollHeight)} px in a ${String(tall.clientHeight)} px panel`;
        console.warn(wide);
        await annotate(wide);

        await page.viewport(900, 700);
        await waitFor(() => {
            assert.isAbove(scroller().clientHeight, 0);
        });
        const box = scroller();
        const height = `route layer at 900 x 700: content ${String(box.scrollHeight)} px in a ${String(box.clientHeight)} px panel`;
        // Recorded in the run's output for the design's 900 x 700 measurement.
        console.warn(height);
        await annotate(height);
    });
});

/** A small graph with columns to vary by: a name, a department and a code. */
const NODES = [
    { id: "1", name: "Alpha", dept: "east", code: 1 },
    { id: "2", name: "Beta", dept: "west", code: 2 },
    { id: "3", name: "Gamma", dept: "east", code: 1 },
    { id: "4", name: "Delta", dept: "north", code: 3 },
];
const EDGES = [
    { source: "1", target: "2" },
    { source: "2", target: "3" },
    { source: "3", target: "4" },
    { source: "4", target: "1" },
];

/** The workspace with a project open on the Everything row, the session and the store. */
interface Opened {
    readonly session: GraphSession;
    readonly element: HTMLElementTagNameMap["graphty-element"];
    readonly store: WorkspaceStore;
}

/**
 * Renders the workspace on the Everything row, as a click on it opens it, and loads the graph.
 * @returns the session, the element and the store.
 */
async function openEverything(): Promise<Opened> {
    const store = createWorkspaceStore({ project: { name: "Ring", id: 1 }, inspected: { kind: "everything-row" } });
    render(<Workspace store={store} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isDefined(found?.session);
        return found;
    });
    if (element === null) {
        throw new Error("the element never came up");
    }
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    return { session: element.session, element, store };
}

/**
 * The Style tab.
 * @returns the tab.
 */
function styleTab(): HTMLElement {
    return screen.getByTestId("style-tab");
}

/**
 * Picks the inspector's Style tab, as a reader does on a row that opens on Values.
 */
async function pickStyleTab(): Promise<void> {
    const tab = await screen.findByRole("tab", { name: "Style" });
    if (tab.getAttribute("aria-selected") !== "true") {
        await userEvent.click(tab);
    }
}

/**
 * The reader's own layers: everything but the element's.
 * @param session - the element's session.
 * @returns the layers, bottom first.
 */
function readerLayers(session: GraphSession): ReturnType<GraphSession["styles"]["list"]> {
    return session.styles.list().filter((l) => l.source.by !== "element");
}

/**
 * The reader's layers that name ids: the selections' own rows.
 * @param session - the element's session.
 * @returns the layers, bottom first.
 */
function idLayers(session: GraphSession): ReturnType<GraphSession["styles"]["list"]> {
    return readerLayers(session).filter((l) => l.selector.match === "ids");
}

/** Where each field the tests use is added from: its section's "+" and its menu item. */
const ADDED_FROM: Readonly<Record<string, readonly [string, string, string]>> = {
    "Node color": ["Add to node fill", "Color", "node.color"],
    "Node size": ["Add to node shape", "Size", "node.size"],
    "Edge color": ["Add to edge line", "Color", "edge.color"],
};

/**
 * A field's row, added from its section's "+" when the layer does not set it yet, as a reader
 * adds it.
 * @param field - the field's name, as "Node size".
 * @returns the row.
 */
async function rowOf(field: string): Promise<HTMLElement> {
    const [plus, item, channel] = ADDED_FROM[field];
    await showKind(field.startsWith("Edge") ? "edge" : "node");
    const selector = `.ws-row[data-line="${channel}"]`;
    if (styleTab().querySelector(selector) === null) {
        await userEvent.click(within(styleTab()).getByRole("button", { name: plus }));
        // A "+" with one thing left adds it at once; with more, it opens a menu.
        const menu = await waitFor(() => {
            const found = screen.queryByRole("menuitem", { name: item });
            assert.isTrue(found !== null || styleTab().querySelector(selector) !== null, "a menu or the line");
            return found;
        });
        if (menu !== null) {
            await userEvent.click(menu);
        }
    }
    return waitFor(() => {
        const found = styleTab().querySelector<HTMLElement>(selector);
        assert.isNotNull(found, `a ${field} row`);
        return found;
    });
}

/**
 * A field's vary glyph, which shows while the pointer is over the field.
 * @param field - the field's name, as "Node size".
 * @returns the glyph's button.
 */
async function varyGlyph(field: string): Promise<HTMLElement> {
    const box = await rowOf(field);
    await userEvent.hover(box);
    return within(box).findByRole("button", { name: `${field} by attribute` });
}

/**
 * Picks a value to vary a field by, from its vary glyph.
 * @param field - the field's name, as "Node color".
 * @param option - the value's name in the list.
 */
async function varyBy(field: string, option: string): Promise<void> {
    await userEvent.click(await varyGlyph(field));
    const list = await findValuePicker();
    await userEvent.click(within(list).getByRole("option", { name: new RegExp(`^${option}(,|$)`) }));
}

/**
 * A written color as `#RRGGBB`.
 * @param value - what a layer sets.
 * @returns the hex, or null when it is not a written hex.
 */
function hexOf(value: unknown): string | null {
    return typeof value === "string" ? value.toUpperCase().slice(0, 7) : null;
}

/**
 * Types a hex into a color field.
 * @param field - the field's name, as "Edge color".
 * @param hex - six hex digits.
 */
async function typeColor(field: string, hex: string): Promise<void> {
    const input = within(await rowOf(field)).getByRole("textbox", { name: new RegExp(`^${field}(,|$)`) });
    await userEvent.clear(input);
    await userEvent.type(input, `${hex}{Enter}`);
}

describe("the Style tab's rows on the real element", () => {
    it("has no two controls with one accessible name", async () => {
        await page.viewport(1366, 768);
        await openEverything();
        const tab = await screen.findByTestId("style-tab", {});
        const names = [...tab.querySelectorAll("button, input")]
            // ponytail: the label entries are named per kind by the label unit, in flight beside this one.
            .filter((el) => el.closest('[data-section="label"], [aria-hidden="true"]') === null)
            .map((el) => el.getAttribute("aria-label") ?? el.textContent ?? "")
            .filter((name) => name !== "");
        assert.deepEqual(
            names.filter((name, i) => names.indexOf(name) !== i),
            [],
            "names used twice",
        );
    });

    it("colors Everything by a file attribute on the row it is on, with no new row", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        await screen.findByTestId("style-tab", {});
        await varyBy("Node color", "dept");
        await waitFor(() => {
            const mine = readerLayers(session);
            assert.lengthOf(mine, 1, "one Everything layer, no other row");
            const proposal = session.styles.proposeEncoding({
                column: { kind: "node", name: "dept" },
                channel: "node.color",
            });
            assert.isTrue(proposal.ok);
            assert.deepEqual(mine[0].encode?.["node.color"], proposal.ok ? proposal.binding : undefined);
        });
        assert.isNotNull(within(styleTab()).getByRole("button", { name: /Stop varying node color by data/ }));
    });

    it("a declared code column colors one color per group, and a group column cannot size", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        const code = session.data.attributes().find((a) => a.kind === "node" && a.name === "code");
        if (code === undefined) {
            throw new Error("no code column");
        }
        await session.data.declare(code, { measurement: "categorical" });
        await screen.findByTestId("style-tab", {});
        await varyBy("Node color", "code");
        await waitFor(() => {
            const binding = readerLayers(session)[0]?.encode?.["node.color"];
            assert.equal(binding !== undefined && "by" in binding ? binding.scale : undefined, "ordinal");
        });
        await userEvent.click(await varyGlyph("Node size"));
        const sizes = await findValuePicker();
        await userEvent.click(within(sizes).getByRole("option", { name: /^\d+ attributes?, (hidden|shown),/ }));
        const dept = await within(sizes).findByRole("option", { name: /^dept(,|$)/ });
        assert.equal(dept.getAttribute("aria-disabled"), "true");
        // The fixture's few rows make every dept its own: the element reads it as text.
        assert.equal(dept.getAttribute("aria-label"), "dept, Holds text, not groups or amounts");
    });

    it("a run's row shows the run's varied color, and sizing it by its result stores the range 1 to 3", async () => {
        await page.viewport(1366, 768);
        const { session, store } = await openEverything();
        const { runId } = await session.runs.start("pagerank");
        await session.styles.settled();
        const measure = readerLayers(session).find((l) => l.source.by === "run");
        if (measure === undefined) {
            throw new Error("PageRank painted nothing");
        }
        store.set({ inspected: { kind: "measure-row", id: runId } });
        await pickStyleTab();
        await waitFor(() => {
            assert.isNotNull(within(styleTab()).getByRole("button", { name: /Stop varying node color by data/ }));
        });
        const chip = styleTab().querySelector<HTMLElement>(".cm-var-chit");
        assert.include(chip?.style.background ?? "", "linear-gradient", "the chip shows the ramp");
        // PageRank paints only nodes: no Edge tab.
        assert.isNull(within(styleTab()).queryByRole("tablist", { name: "Style for" }));

        await userEvent.click(await varyGlyph("Node size"));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: /^PageRank(,|$)/ }));
        await waitFor(() => {
            const size = session.styles.get(measure.id)?.encode?.["node.size"];
            assert.equal(size !== undefined && "by" in size ? size.by : undefined, session.results.path(runId));
            assert.deepEqual(size !== undefined && "by" in size ? size.range : undefined, [1, 3]);
        });
        assert.lengthOf(readerLayers(session), 1, "the bind edited the PageRank row; no new row");
    });

    it("sizes Everything by a run's result on Everything itself, and Stop varying fixes it again", async () => {
        await page.viewport(1366, 768);
        const { session, element } = await openEverything();
        await session.data.addEdges([{ source: "1", target: "3" }]);
        const { runId } = await session.runs.start("degree");
        await session.styles.settled();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(await varyGlyph("Node size"));
        const list = await findValuePicker();
        await userEvent.click(within(list).getByRole("option", { name: /^Degree(,|$)/ }));
        const path = session.results.path(runId);
        await waitFor(() => {
            const mine = readerLayers(session).filter((l) => l.userData?.graphtyEverything === true);
            assert.lengthOf(mine, 1);
            // The element skips an element the run did not measure, so the layer keeps its rule.
            assert.deepEqual(mine[0].selector, { match: "everything" });
            assert.equal((mine[0].encode?.["node.size"] as { by?: string } | undefined)?.by, path);
            assert.isAbove(element.getNode("1")?.size ?? 0, element.getNode("2")?.size ?? 0);
        });
        await userEvent.click(within(styleTab()).getByRole("button", { name: /Stop varying node size by data/ }));
        await waitFor(() => {
            const mine = readerLayers(session).filter((l) => l.userData?.graphtyEverything === true);
            assert.lengthOf(mine, 1);
            assert.deepEqual(mine[0].selector, { match: "everything" });
            assert.isUndefined(mine[0].encode?.["node.size"]);
        });
    });

    it("Palette and Reverse write the binding; the field's Stop varying puts one value back", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        await screen.findByTestId("style-tab", {});
        await varyBy("Node color", "code");
        // The way back to one color is the field's own button, and its tooltip says so. A tooltip
        // opens a second after the pointer arrives (compact-mantine's open delay), as long as
        // waitFor's own default wait, so the wait is the hang guard, not that default.
        await userEvent.hover(within(styleTab()).getByRole("button", { name: "Stop varying node color by data" }));
        await waitFor(() => {
            assert.include(
                screen.queryAllByRole("tooltip", { hidden: true }).map((t) => t.textContent),
                "Stop varying node color by data",
            );
        });
        await userEvent.click(await within(styleTab()).findByRole("button", { name: /^Node color: code,/ }));
        const popover = await screen.findByRole("group", { name: "Color binding" });
        const binding = (): Record<string, unknown> => readerLayers(session)[0]?.encode?.["node.color"] ?? {};
        await userEvent.click(within(popover).getByRole("combobox", { name: /^Palette/ }));
        await userEvent.click(await screen.findByRole("option", { name: /^Shades of blue/ }));
        await waitFor(() => {
            assert.equal(binding().palette, "blues");
        });
        await userEvent.click(within(popover).getByRole("button", { name: "Reverse palette" }));
        await waitFor(() => {
            assert.equal(binding().reverse, true);
        });
        assert.isNull(within(popover).queryByRole("button", { name: /^Use one color/ }), "not in the popover");
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(styleTab()).getByRole("button", { name: "Stop varying node color by data" }));
        await waitFor(() => {
            assert.isUndefined(readerLayers(session)[0]?.encode?.["node.color"]);
            assert.isDefined(readerLayers(session)[0]?.set?.["node.color"], "a fixed value again");
        });
    });

    it("binds with the keyboard alone: Tab from the field to the vary glyph, then the list", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        await screen.findByTestId("style-tab", {});
        // The vary glyph is the next tab stop after the field's controls.
        const color = await rowOf("Node color");
        within(color)
            .getByRole("textbox", { name: /^Node color(,|$)/ })
            .focus();
        await userEvent.tab();
        assert.equal(document.activeElement?.getAttribute("aria-label"), "Node color by attribute");
        await userEvent.keyboard("{Enter}");
        const list = await findValuePicker();
        // Named by aria-label, its fact after a comma ("dept, 4 values").
        const firstOption = within(list).getAllByRole("option")[0];
        const first = (firstOption.getAttribute("aria-label") ?? firstOption.textContent).split(", ")[0];
        // The list opens with nothing active, as a select's does: Down reaches the first value.
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await waitFor(() => {
            const bound = readerLayers(session)[0]?.encode?.["node.color"] as { by?: string } | undefined;
            assert.equal(bound?.by, `data.${first}`);
        });
    });

    it("a drag across the color picker is one undo step", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        await screen.findByTestId("style-tab", {});
        const color = await rowOf("Node color");
        await userEvent.click(within(color).getByRole("button", { name: /^Pick node color/ }));
        const field = await screen.findByTestId("color-picker-saturation");
        const before = session.history.steps.length;
        const box = field.getBoundingClientRect();
        await userEvent.hover(field, { position: { x: box.width * 0.2, y: box.height * 0.2 } });
        await userEvent.dragAndDrop(field, field, {
            sourcePosition: { x: box.width * 0.2, y: box.height * 0.2 },
            targetPosition: { x: box.width * 0.9, y: box.height * 0.9 },
        });
        await waitFor(() => {
            assert.isString(readerLayers(session)[0]?.set?.["node.color"]);
        });
        await session.styles.settled();
        assert.equal(session.history.steps.length, before + 1, "the drag wrote once, on release");
    });

    it("Everything's edge color goes to the Everything layer, and an edge's to its own row", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        await screen.findByTestId("style-tab", {});
        await typeColor("Edge color", "FF0000");
        await waitFor(() => {
            const everything = readerLayers(session).filter((l) => l.userData?.graphtyEverything === true);
            assert.deepEqual(
                everything.map((l) => [l.target, hexOf(l.set?.["edge.color"])]),
                [["edge", "#FF0000"]],
            );
        });
        const [edge] = session.data.edges();
        await act(async () => {
            await session.selection.apply({ edges: [edge.id] });
        });
        await pickStyleTab();
        await typeColor("Edge color", "00FF00");
        await waitFor(() => {
            assert.deepEqual(
                idLayers(session).map((l) => [l.target, hexOf(l.set?.["edge.color"])]),
                [["edge", "#00FF00"]],
            );
        });
    });

    it("a node's first edit adds its row named for it and selects it; selecting it again edits that row", async () => {
        await page.viewport(1366, 768);
        const { session, store } = await openEverything();
        await session.selection.apply({ nodes: ["1"] });
        await pickStyleTab();
        const size = within(await rowOf("Node size")).getByRole("spinbutton", { name: /^Node size/ });
        await userEvent.tripleClick(size);
        await userEvent.keyboard("3{Enter}");
        await waitFor(() => {
            assert.equal(idLayers(session).length, 1);
        });
        const [row] = idLayers(session);
        assert.equal(row.name, "1");
        assert.deepEqual(row.selector, { match: "ids", nodes: ["1"], edges: [] });
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "layer-row", id: row.id });
        });

        session.selection.clear();
        await session.selection.apply({ nodes: ["1"] });
        await pickStyleTab();
        await typeColor("Node color", "00FF00");
        await waitFor(() => {
            assert.equal(hexOf(session.styles.get(row.id)?.set?.["node.color"]), "#00FF00");
        });
        assert.equal(idLayers(session).length, 1, "the same ids reuse their row");
    });

    it("several selected share one row, named by their count, and Undo takes it away", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        await session.selection.apply({ nodes: ["2", "3", "4"] });
        await pickStyleTab();
        await userEvent.click(await within(styleTab()).findByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Tooltip/ }));
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: /^Node id(,|$)/ }));
        await waitFor(() => {
            assert.deepEqual(
                idLayers(session).map((l) => l.name),
                ["3 nodes"],
            );
        });
        await userEvent.keyboard("{Escape}");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(idLayers(session).length, 0);
        });
    });

    it("a new Tooltip asks what it reads; Fixed text keeps typed words, and Undo takes them back", async () => {
        await page.viewport(1366, 768);
        const { session } = await openEverything();
        await screen.findByTestId("style-tab", {});
        await userEvent.click(within(styleTab()).getByRole("button", { name: "Add to node text" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Tooltip/ }));
        await userEvent.click(
            within(await findValuePicker()).getByRole("option", {
                name: "Fixed text",
            }),
        );
        const field = await within(styleTab()).findByRole("textbox", { name: "Node tooltip text" });
        await userEvent.type(field, "hello{Enter}");
        await waitFor(() => {
            assert.equal(readerLayers(session)[0]?.set?.["node.tooltip"], "hello");
        });
        await session.undo();
        await waitFor(() => {
            assert.equal(
                within(styleTab()).queryByRole("textbox", { name: "Node tooltip text" }),
                null,
                "Undo takes the typed tooltip away",
            );
        });
    });

    it("says what a varied field reads: the element's unresolved path reads nothing", async () => {
        await page.viewport(1366, 768);
        const { session, store } = await openEverything();
        const layer = await session.styles.add({
            name: "Missing",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.department", scale: "ordinal" } },
        });
        store.set({ inspected: { kind: "layer-row", id: layer.id } });
        await waitFor(() => {
            assert.isNotNull(
                within(styleTab()).getByRole("button", { name: "Node color: data.department, reads nothing" }),
            );
        });
    });

    it("shows no Style tab for an inspected thing that is not a layer, instead of editing Everything", async () => {
        await page.viewport(1366, 768);
        const { session, store } = await openEverything();
        await screen.findByTestId("style-tab", {});
        const { runId } = await session.runs.start("degree");
        store.set({ inspected: { kind: "run", id: runId } });
        await waitFor(() => {
            assert.isNull(screen.queryByTestId("style-tab"));
        });
    });
});
