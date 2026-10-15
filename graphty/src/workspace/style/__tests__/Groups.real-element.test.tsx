/**
 * Per-group settings on the REAL graphty-element, driven by real input (tier3 decisions, round 6:
 * "any property per group", "dozens or hundreds of groups", "no color-only controls"). On Les
 * Miserables' Louvain groups: a group's detail sets a shape for that group alone, the property row
 * keeps the one shape the rest have and says which group differs, a property already varying by
 * another value says why, several groups are edited at once in one undo step, and "New layer for"
 * carries every setting and sits directly above its source. On College football's Leiden groups
 * (more than 8): the largest 8 then "N more", search by name and value, sort, fold into Other, the
 * selected node's group pinned first, "Select these", and repeated colors drawn in other shapes.
 * A column of 300 values scrolls as a virtualized list; a shape binding's No value offers shapes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and loading a sample, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Opens a sample from the start screen and waits for its nodes.
 * @param sample - the sample's name on its button.
 * @param nodes - how many nodes it has.
 * @returns the session and the store.
 */
async function openSample(sample: string, nodes: number): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    await userEvent.click(await screen.findByRole("button", { name: `Open the ${sample} sample` }));
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.equal(found?.data.statistics().nodeCount, nodes);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.styles.settled();
    return { session, store };
}

/**
 * Runs a community algorithm and returns the layer that colors its groups, and the path it reads.
 * @param session - the session.
 * @param algorithm - "louvain" or "leiden".
 * @returns the layer and the path.
 */
async function runGroups(session: GraphSession, algorithm: string): Promise<{ layer: Layer; path: string }> {
    const { runId } = await session.runs.start(algorithm);
    await session.styles.settled();
    const layer = session.styles
        .list()
        .find((l) => session.runs.bindings(runId).includes(l.id) && l.encode?.["node.color"] !== undefined);
    const binding = layer?.encode?.["node.color"];
    if (layer === undefined || binding === undefined || !("by" in binding)) {
        throw new Error(`${algorithm} colored nothing`);
    }
    return { layer, path: binding.by };
}

/**
 * Opens a layer's Style tab and the binding popover of one property, by clicking its value pill.
 * @param store - the workspace store.
 * @param layer - the layer.
 * @param name - the property's name, such as "Color".
 * @returns the popover.
 */
async function openBinding(store: WorkspaceStore, layer: Layer, name = "Color"): Promise<HTMLElement> {
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    const pill = await waitFor(
        () => {
            const found = within(tab).getByRole("button", { name: new RegExp(`^Node ${name.toLowerCase()}: `) });
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    await userEvent.click(pill);
    return screen.findByRole("group", { name: `${name} binding` });
}

/**
 * The data rows of the popover's group grid.
 * @param popover - the popover.
 * @returns the rows, top first.
 */
function gridRows(popover: HTMLElement): HTMLElement[] {
    const grid = within(popover).getByRole("grid", { name: /groups$/ });
    return within(grid)
        .getAllByRole("row")
        .filter((row) => row.querySelector("[role=gridcell]") !== null);
}

/**
 * The name cell of a grid row.
 * @param row - the row.
 * @returns its first cell.
 */
function nameCell(row: HTMLElement): HTMLElement {
    const cell = row.querySelector<HTMLElement>("[data-group-name]");
    if (cell === null) {
        throw new Error("a row with no name");
    }
    return cell;
}

/**
 * A node of a group, by the group's value.
 * @param session - the session.
 * @param path - the category path.
 * @param value - the group, as the legend spells it.
 * @returns a node id.
 */
function nodeOf(session: GraphSession, path: string, value: string): string {
    const node = session.data.nodes().find((n) => String(session.styles.valueAt({ node: n.id }, path)) === value);
    if (node === undefined) {
        throw new Error(`no node in group ${value}`);
    }
    return String(node.id);
}

/**
 * What a node is drawn with on one channel.
 * @param session - the session.
 * @param id - the node.
 * @param channel - the channel.
 * @returns the value, a color as `#rrggbb`.
 */
function drawn(session: GraphSession, id: string, channel: "node.color" | "node.shape"): unknown {
    const value = session.styles.explain({ node: id }).merged[channel];
    if (channel === "node.color") {
        return (value as { hex?: string } | undefined)?.hex?.slice(0, 7).toLowerCase();
    }
    return value;
}

describe("per-group settings", () => {
    it("Les Miserables: a group's detail sets a shape for that group alone; the row keeps one shape", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer, path } = await runGroups(session, "louvain");
        const popover = await openBinding(store, layer);
        const [first, second] = session.styles.groups(layer.id, path);
        const firstKey = String(first.value);
        const inFirst = nodeOf(session, path, firstKey);
        const inSecond = nodeOf(session, path, String(second.value));
        const before = drawn(session, inSecond, "node.shape");

        // A click on the largest group's row opens its detail in the same popover.
        const [row] = gridRows(popover);
        const name = nameCell(row).firstChild?.textContent ?? "";
        await userEvent.click(nameCell(row));
        const opened = await screen.findByRole("group", { name: `${name} properties` });
        assert.isNotNull(within(opened).queryByRole("textbox", { name: new RegExp(`^Name of .* ${name}$`) }));
        await waitFor(() => {
            assert.equal(document.activeElement, within(opened).getByRole("button", { name: "Back to the groups" }));
        });
        // Escape right away goes back to the list, not out of the popover.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: `${name} properties` }));
        });
        assert.isNotNull(screen.queryByRole("group", { name: "Color binding" }), "the popover stays open");
        // Back on the list, focus lands on the row it left; then the row opens again.
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("role"), "gridcell");
        });
        // Enter on the focused row opens it again, as a click does.
        await userEvent.keyboard("{Enter}");
        const detail = await screen.findByRole("group", { name: `${name} properties` });

        // "+ Set another property": Shape, then a shape picked from its own glyph grid.
        await userEvent.click(within(detail).getByRole("button", { name: `Set another property for ${name}` }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const shape = await within(detail).findByRole("combobox", { name: new RegExp(`^${name} shape`) });
        await userEvent.click(shape);
        const options = await screen.findAllByRole("option");
        const box = options.find((o) => /box|cube/i.test(o.getAttribute("aria-label") ?? o.textContent ?? ""));
        assert.isDefined(box, "the shape picker offers shapes");
        if (box !== undefined) {
            await userEvent.click(box);
        }
        await waitFor(() => {
            assert.equal(session.styles.groups(layer.id, path)[0]?.entries["node.shape"], "box");
            assert.equal(drawn(session, inFirst, "node.shape"), "box", "the group draws the shape");
        });
        assert.equal(drawn(session, inSecond, "node.shape"), before, "every other group keeps its shape");

        // Escape returns to the list; a second Escape closes the popover.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: `${name} properties` }));
            assert.lengthOf(gridRows(popover), Math.min(8, session.styles.groups(layer.id, path).length));
        });
        await waitFor(() => {
            const focused = document.activeElement;
            assert.equal(focused?.getAttribute("role"), "gridcell", "focus is back in the list");
            assert.isNotNull(focused?.querySelector(`[data-group-row="${firstKey}"]`), "on the group just left");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Color binding" }));
        });

        // The Shape row shows the one shape the rest have, and a line for the group that differs.
        const tab = screen.getByTestId("style-tab");
        const line = await within(tab).findByRole("button", { name: /^Node shape: Box for 1 group by / });
        assert.equal(line.textContent, "Box for 1 group");
        const rowShape = within(tab).getByRole("combobox", { name: /^Node shape/ });
        await userEvent.click(rowShape);
        const others = await screen.findAllByRole("option");
        const cone = others.find((o) => /cone/i.test(o.getAttribute("aria-label") ?? o.textContent ?? ""));
        assert.isDefined(cone);
        if (cone !== undefined) {
            await userEvent.click(cone);
        }
        await waitFor(() => {
            assert.equal(drawn(session, inSecond, "node.shape"), "cone", "the row changes every other group");
        });
        assert.equal(drawn(session, inFirst, "node.shape"), "box", "and leaves the group's own");
    });

    it("Les Miserables: a property already varying by another value says why instead of replacing it", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer: run, path } = await runGroups(session, "louvain");
        const { runId } = await session.runs.start("degree");
        await session.styles.settled();
        const layer = await session.styles.add({
            name: "Groups and degree",
            target: "node",
            selector: run.selector,
            encode: {
                "node.color": { by: path, scale: "ordinal" },
                "node.size": { by: session.results.path(runId), range: [1, 3] },
            },
        });
        await session.styles.settled();
        const popover = await openBinding(store, layer);
        const [row] = gridRows(popover);
        const name = nameCell(row).firstChild?.textContent ?? "";
        await userEvent.click(nameCell(row));
        const detail = await screen.findByRole("group", { name: `${name} properties` });
        await userEvent.click(within(detail).getByRole("button", { name: `Set another property for ${name}` }));
        const size = await screen.findByRole("menuitem", { name: /^Size: Size already varies by / });
        assert.equal(size.getAttribute("data-disabled"), "true", "it cannot be picked");
        await userEvent.keyboard("{Escape}");
        const binding = session.styles.get(layer.id)?.encode?.["node.size"];
        assert.isTrue(binding !== undefined && "by" in binding && binding.by !== path, "size still varies by degree");
    });

    it("Les Miserables: several groups picked with Shift+arrow open together, Mixed, and write in one step", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer, path } = await runGroups(session, "louvain");
        const popover = await openBinding(store, layer);
        const grid = within(popover).getByRole("grid", { name: /groups$/ });
        assert.equal(grid.getAttribute("aria-multiselectable"), "true");
        const groups = session.styles.groups(layer.id, path);
        // Give the first group a color of its own, so the two differ.
        await session.styles.setValueEntries(layer.id, path, [
            { channel: "node.color", value: groups[0].value as number, entry: "#AA0000" },
        ]);
        await session.styles.settled();

        // Control-click picks the first row without opening it; Shift+ArrowDown adds the second.
        const [first] = gridRows(popover);
        await userEvent.keyboard("{Control>}");
        await userEvent.click(nameCell(first));
        await userEvent.keyboard("{/Control}");
        await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
        await waitFor(() => {
            assert.lengthOf(
                gridRows(popover).filter((row) => row.getAttribute("aria-selected") === "true"),
                2,
            );
        });
        await userEvent.keyboard("{Enter}");
        const detail = await screen.findByRole("group", { name: "2 groups properties" });
        assert.isNotNull(detail.querySelector("[data-group-field='node.color'] [data-mixed]"), "the two differ: Mixed");

        const hex = within(detail).getByRole("textbox", { name: /color/i });
        await userEvent.clear(hex);
        await userEvent.type(hex, "00AA55{Enter}");
        const a = nodeOf(session, path, String(groups[0].value));
        const b = nodeOf(session, path, String(groups[1].value));
        await waitFor(() => {
            assert.equal(drawn(session, a, "node.color"), "#00aa55");
            assert.equal(drawn(session, b, "node.color"), "#00aa55");
        });
        await session.undo();
        await session.styles.settled();
        assert.equal(drawn(session, a, "node.color"), "#aa0000", "one undo takes both back");
        assert.notEqual(drawn(session, b, "node.color"), "#00aa55");
    });

    it("Les Miserables: New layer for a group carries every setting and sits directly above its source", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer, path } = await runGroups(session, "louvain");
        const [group] = session.styles.groups(layer.id, path);
        const key = String(group.value);
        await session.styles.setValueEntries(layer.id, path, [
            { channel: "node.shape", value: group.value as number, entry: "box" },
        ]);
        await session.styles.settled();
        const node = nodeOf(session, path, key);
        const color = drawn(session, node, "node.color");
        const popover = await openBinding(store, layer);
        const [row] = gridRows(popover);
        const name = nameCell(row).firstChild?.textContent ?? "";
        await userEvent.click(nameCell(row));
        const detail = await screen.findByRole("group", { name: `${name} properties` });
        await userEvent.click(within(detail).getByRole("button", { name: `New layer for ${name}` }));
        const added = await waitFor(() => {
            const stack = session.styles.list();
            const at = stack.findIndex((l) => l.id === layer.id);
            const above = stack[at + 1];
            assert.deepEqual(above?.selector, {
                match: "rule",
                where: { kind: "categories", attribute: path, values: [key] },
            });
            return above;
        });
        assert.equal(added.set?.["node.shape"], "box", "it carries the group's shape");
        const carried = added.set?.["node.color"];
        assert.equal(typeof carried === "string" ? carried.toLowerCase() : carried, color, "and its color");
        await session.styles.settled();
        assert.equal(drawn(session, node, "node.color"), color, "the drawing does not change");
        assert.equal(drawn(session, node, "node.shape"), "box");
    });

    it("College football: the largest 8, N more, search, sort, fold, the selected node's group, Select these", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("College football", 115);
        const { layer, path } = await runGroups(session, "leiden");
        const groups = session.styles.groups(layer.id, path);
        assert.isAbove(groups.length, 8, "Leiden finds more than 8 groups");
        const foldedBefore = groups.filter((g) => g.folded === true).length;
        let popover = await openBinding(store, layer);
        assert.lengthOf(gridRows(popover), 8, "the largest 8");
        await userEvent.click(within(popover).getByRole("button", { name: `${String(groups.length - 8)} more` }));
        await waitFor(() => {
            assert.lengthOf(gridRows(popover), groups.length);
        });

        // Search finds a group by its raw value and by its name.
        const last = groups[groups.length - 1];
        const search = within(popover).getByRole("textbox", { name: /groups$/ });
        await userEvent.type(search, String(last.value));
        await waitFor(() => {
            assert.isTrue(
                gridRows(popover).some((row) => row.querySelector(`[data-group-row="${String(last.value)}"]`) !== null),
            );
        });
        await userEvent.clear(search);
        await userEvent.type(search, "Group 3");
        await waitFor(() => {
            const names = gridRows(popover).map((row) => nameCell(row).firstChild?.textContent);
            assert.include(names, "Group 3");
        });
        await userEvent.clear(search);

        // Sort by name.
        await userEvent.click(within(popover).getByRole("combobox", { name: /^Sort by/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Name" }));
        await waitFor(() => {
            const names = gridRows(popover).map((row) => nameCell(row).firstChild?.textContent ?? "");
            const sorted = [...names].sort(new Intl.Collator(undefined, { numeric: true }).compare);
            assert.deepEqual(names, sorted);
        });

        // Fold groups under N into Other: every property of the layer folds them.
        await userEvent.click(within(popover).getByRole("switch", { name: "Fold small groups into Other" }));
        const sizes = groups.map((g) => g.count).sort((a, b) => a - b);
        const under = sizes[2] + 1;
        const field = await within(popover).findByLabelText(/^Under/);
        await userEvent.clear(field);
        await userEvent.type(field, `${String(under)}{Enter}`);
        await waitFor(() => {
            const folded = session.styles.groups(layer.id, path).filter((g) => g.folded === true);
            assert.isAtLeast(folded.length, 3, "the small groups fold");
            assert.isTrue(folded.every((g) => g.count < under));
        });
        await waitFor(() => {
            assert.isTrue(gridRows(popover).some((row) => (row.textContent ?? "").includes("in Other")));
        });
        await userEvent.click(within(popover).getByRole("switch", { name: "Fold small groups into Other" }));
        await waitFor(() => {
            // Back to what the palette alone folds: past its 8 colors, under "Fold into Other".
            const binding = session.styles.get(layer.id)?.encode?.["node.color"];
            assert.isTrue(binding !== undefined && "by" in binding && binding.other === undefined);
            assert.equal(session.styles.groups(layer.id, path).filter((g) => g.folded === true).length, foldedBefore);
        });

        // Select these: the group's nodes, from its row's menu.
        const target = gridRows(popover)[0];
        const targetKey = target.querySelector("[data-group-row]")?.getAttribute("data-group-row") ?? "";
        const targetName = nameCell(target).firstChild?.textContent ?? "";
        await userEvent.click(within(target).getByRole("button", { name: new RegExp(` ${targetName} actions$`) }));
        await userEvent.click(await within(popover).findByRole("menuitem", { name: /^Select these / }));
        const count = session.styles.groups(layer.id, path).find((g) => String(g.value) === targetKey)?.count;
        await waitFor(() => {
            assert.equal(session.selection.nodes.length, count);
        });

        // The inspector now shows the selection. Back on the layer, the selected node's group is
        // pinned first, saying which node it has.
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Color binding" }));
        });
        popover = await openBinding(store, layer);
        const selectedName = session.data.name(session.selection.nodes[0]) ?? "";
        await waitFor(() => {
            const [top] = gridRows(popover);
            assert.equal(top.querySelector("[data-group-row]")?.getAttribute("data-group-row"), targetKey);
            assert.include(top.textContent ?? "", `has ${selectedName}`);
        });
    });

    it("College football: repeated colors are drawn in other shapes, never color alone", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("College football", 115);
        const { layer, path } = await runGroups(session, "leiden");
        const popover = await openBinding(store, layer);
        await userEvent.click(within(popover).getByRole("combobox", { name: /^More values than colors/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Repeat colors, change shape" }));
        await waitFor(() => {
            const binding = session.styles.get(layer.id)?.encode?.["node.color"];
            assert.isTrue(binding !== undefined && "by" in binding && binding.overflow === "shape");
        });
        await session.styles.settled();
        const looks = new Map<string, string>();
        for (const group of session.styles.groups(layer.id, path)) {
            const node = nodeOf(session, path, String(group.value));
            looks.set(
                String(group.value),
                `${String(drawn(session, node, "node.color"))}|${String(drawn(session, node, "node.shape"))}`,
            );
        }
        assert.equal(new Set(looks.values()).size, looks.size, "no two groups look the same");
    });

    it("300 values: the full list is virtualized, scrolls to the last, and search finds it", async () => {
        await page.viewport(1440, 900);
        const store = createWorkspaceStore({ project: { name: "Many", id: 1 }, inspected: null });
        render(<Workspace store={store} />);
        const session = await waitFor(
            () => {
                const found = document.querySelector("graphty-element")?.session;
                assert.isDefined(found);
                return found;
            },
            { timeout: TIMEOUT_MS },
        );
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.addNodes(
            Array.from({ length: 300 }, (_, i) => ({ id: `n${String(i)}`, kind: `k${String(i)}` })),
        );
        const layer = await session.styles.add({
            name: "Kinds",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.kind", scale: "ordinal", overflow: "other" } },
        });
        await session.styles.settled();
        const popover = await openBinding(store, layer);
        await userEvent.click(within(popover).getByRole("button", { name: "292 more" }));
        const grid = within(popover).getByRole("grid", { name: /groups$/ });
        await waitFor(() => {
            assert.equal(grid.getAttribute("aria-rowcount"), "301", "every group is a row");
        });
        assert.isBelow(gridRows(popover).length, 60, "only the rows on screen are drawn");
        const scroller = grid.closest<HTMLElement>("[data-testid=data-table-scroll]") ?? grid.parentElement;
        assert.isNotNull(scroller);
        scroller?.scrollTo({ top: scroller.scrollHeight });
        await waitFor(() => {
            assert.equal(
                gridRows(popover).at(-1)?.getAttribute("aria-rowindex"),
                "301",
                "the last group is drawn once scrolled to",
            );
        });
        const search = within(popover).getByRole("textbox", { name: /groups$/ });
        await userEvent.type(search, "k299");
        await waitFor(() => {
            assert.lengthOf(gridRows(popover), 1);
        });
    });

    it("a shape binding's No value offers shapes, not a number", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer: run, path } = await runGroups(session, "louvain");
        const layer = await session.styles.add({
            name: "Shapes",
            target: "node",
            // A run's value paints only what the run measured: the run layer's own rule.
            selector: run.selector,
            encode: { "node.shape": { by: path, scale: "ordinal", overflow: "other" } },
        });
        await session.styles.settled();
        const popover = await openBinding(store, layer, "Shape");
        await userEvent.click(within(popover).getByRole("combobox", { name: /^No value/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Use one value" }));
        const value = await within(popover).findByRole("combobox", { name: /^Value/ });
        await userEvent.click(value);
        const options = await screen.findAllByRole("option");
        assert.isTrue(
            options.some((o) => /box|cube|sphere/i.test(o.getAttribute("aria-label") ?? o.textContent ?? "")),
            "it offers shapes",
        );
        assert.isNull(within(popover).queryByRole("spinbutton", { name: /^Value/ }), "no number box");
    });
});
