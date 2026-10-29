/**
 * Per-group settings on the REAL graphty-element, driven by real input (tier3 decisions, round 6:
 * "any property per group", "dozens or hundreds of groups", "no color-only controls"). On Les
 * Miserables' Louvain groups: a group's detail sets a shape for that group alone, the property row
 * keeps the one shape the rest have and says which group differs, a property already varying by
 * another value says why, several groups are edited at once in one undo step, and "New layer for"
 * carries what the group is painted by, nothing else of its source's, and sits directly above it. On College football's Leiden groups
 * (more than 8): the largest 8 then "N more", search by name and value, sort, fold into Other, the
 * selected node's group pinned first, "Select these", and repeated colors drawn in other shapes.
 * A column of 300 values scrolls as a virtualized list; a shape binding's No value offers shapes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { START_SAMPLES } from "../../../data/sampleManifest";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** Layout steps taken before the first frame is drawn, so the layout is at rest when it is. */
const PRE_STEPS = 1000;

/**
 * Opens one of the app's samples as a project, its force layout at rest before the first frame.
 *
 * Not from the start screen, and not left to settle on screen: these tests are about per-group
 * settings, and both draw a frame after frame (the start screen's turning graph, then the layout,
 * a frame per step). On a software GPU each frame holds the page's main thread until it is read
 * back, hundreds of milliseconds on a busy machine, so the clicks made meanwhile wait behind
 * those frames (issue #4239).
 * @param sample - the sample's name, as the start screen lists it.
 * @param nodes - how many nodes it has.
 * @returns the session and the store.
 */
async function openSample(sample: string, nodes: number): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const url = START_SAMPLES.find((each) => each.name === sample)?.url;
    if (url === undefined) {
        throw new Error(`no sample ${sample}`);
    }
    const { session, store } = await openProject(sample);
    await session.data.import({ config: { url }, name: sample });
    assert.equal(session.data.statistics().nodeCount, nodes);
    await session.styles.settled();
    return { session, store };
}

/**
 * An empty project in the workspace, its force layout set to come to rest before the first frame.
 * @param name - the project's name.
 * @returns the session and the store.
 */
async function openProject(name: string): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name, id: 1 }, inspected: null });
    render(<Workspace store={store} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.config.set({ layoutBehavior: { preSteps: PRE_STEPS } });
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
    const tab = await screen.findByTestId("style-tab", {});
    const pill = await waitFor(() => {
        const found = within(tab).getByRole("button", { name: new RegExp(`^Node ${name.toLowerCase()}: `) });
        return found;
    });
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

    it("Les Miserables: a group's number box just added takes focus with its value selected, so typing replaces it", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer, path } = await runGroups(session, "louvain");
        const popover = await openBinding(store, layer);
        const [row] = gridRows(popover);
        const name = nameCell(row).firstChild?.textContent ?? "";
        await userEvent.click(nameCell(row));
        const detail = await screen.findByRole("group", { name: `${name} properties` });
        await userEvent.click(within(detail).getByRole("button", { name: `Set another property for ${name}` }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const size = await within(detail).findByRole("spinbutton", { name: new RegExp(`^${name} size`) });
        await waitFor(() => {
            assert.equal(document.activeElement, size, "focus is handed to the new box");
        });
        const shown = (size as HTMLInputElement).value;
        assert.notEqual(shown, "", "the box shows the size drawn now");
        await userEvent.keyboard("2{Enter}");
        await waitFor(() => {
            assert.equal(
                session.styles.groups(layer.id, path)[0]?.entries["node.size"],
                2,
                `typing 2 over ${shown} gives 2, not ${shown}2`,
            );
        });
    });

    it("Les Miserables: the group grid is one Tab stop, and Escape on a row's actions closes the popover", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer } = await runGroups(session, "louvain");
        const popover = await openBinding(store, layer);
        const grid = within(popover).getByRole("grid", { name: /groups$/ });
        const pill = within(screen.getByTestId("style-tab")).getByRole("button", { name: /^Node color: / });

        // Tab walks into the grid at one cell, and the next Tab leaves it: no row's controls on the way.
        for (let step = 0; step < 20 && !grid.contains(document.activeElement); step++) {
            await userEvent.tab();
        }
        assert.isTrue(grid.contains(document.activeElement), "Tab reaches the grid");
        await userEvent.tab();
        assert.isFalse(grid.contains(document.activeElement), "one more Tab leaves the grid");

        // The arrows reach the second row's actions cell; Tab then reaches its eye and its menu.
        await userEvent.tab({ shift: true });
        assert.isTrue(grid.contains(document.activeElement), "Shift+Tab comes back to the grid");
        await userEvent.keyboard("{ArrowDown}{ArrowDown}{End}");
        const second = gridRows(popover)[1];
        await waitFor(() => {
            assert.isTrue(second.contains(document.activeElement));
        });
        await userEvent.tab();
        assert.match(document.activeElement?.getAttribute("aria-label") ?? "", /^Hide /);
        await userEvent.tab();
        assert.match(document.activeElement?.getAttribute("aria-label") ?? "", / actions$/);

        // Escape there closes the popover, as from any control in it, and focus goes back to the pill.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Color binding" }));
        });
        await waitFor(() => {
            assert.equal(document.activeElement, pill);
        });
    });

    it("Les Miserables: back from a group, Shift+arrow picks two, Enter opens both, Mixed, one undo step", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer, path } = await runGroups(session, "louvain");
        const popover = await openBinding(store, layer);
        const grid = within(popover).getByRole("grid", { name: /groups$/ });
        assert.equal(grid.getAttribute("aria-multiselectable"), "true");
        const groups = session.styles.groups(layer.id, path);

        // A click opens the first group; Escape comes back to its row; Shift+ArrowDown adds the
        // second; Enter opens both.
        const [first] = gridRows(popover);
        const firstName = nameCell(first).firstChild?.textContent ?? "";
        await userEvent.click(nameCell(first));
        await screen.findByRole("group", { name: `${firstName} properties` });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("role"), "gridcell");
        });
        await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
        await waitFor(() => {
            assert.lengthOf(
                gridRows(popover).filter((row) => row.getAttribute("aria-selected") === "true"),
                2,
            );
        });
        await userEvent.keyboard("{Enter}");
        const detail = await screen.findByRole("group", { name: "2 groups properties" });
        // Neither has a color of its own, but the palette paints them apart: Mixed.
        assert.isNotNull(detail.querySelector("[data-group-field='node.color'] [data-mixed]"), "the two differ: Mixed");
        const before = drawn(session, nodeOf(session, path, String(groups[0].value)), "node.color");

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
        assert.equal(drawn(session, a, "node.color"), before, "one undo takes both back");
        assert.notEqual(drawn(session, b, "node.color"), "#00aa55");
    });

    it("Les Miserables: New layer for a group carries what it is painted by and sits directly above its source", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer, path } = await runGroups(session, "louvain");
        const [group] = session.styles.groups(layer.id, path);
        const key = String(group.value);
        await session.styles.setValueEntries(layer.id, path, [
            { channel: "node.shape", value: group.value as number, entry: "box" },
        ]);
        // A value the source sets for every node, which the group's own layer leaves to it.
        await session.styles.update(layer.id, { set: { ...session.styles.get(layer.id)?.set, "node.size": 3 } });
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
        assert.isUndefined(added.set?.["node.size"], "not the source's other values");
        await session.styles.settled();
        assert.equal(drawn(session, node, "node.color"), color, "the drawing does not change");
        assert.equal(drawn(session, node, "node.shape"), "box");
    });

    it("Les Miserables: New layer for two groups keeps each group's own color", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("Les Miserables", 77);
        const { layer, path } = await runGroups(session, "louvain");
        const [one, two] = session.styles.groups(layer.id, path);
        const a = nodeOf(session, path, String(one.value));
        const b = nodeOf(session, path, String(two.value));
        const colors = [drawn(session, a, "node.color"), drawn(session, b, "node.color")];
        assert.notEqual(colors[0], colors[1]);
        const popover = await openBinding(store, layer);
        await userEvent.keyboard("{Control>}");
        await userEvent.click(nameCell(gridRows(popover)[0]));
        await userEvent.click(nameCell(gridRows(popover)[1]));
        await userEvent.keyboard("{/Control}");
        await userEvent.click(within(popover).getByRole("button", { name: "Set properties for 2 groups" }));
        const detail = await screen.findByRole("group", { name: "2 groups properties" });
        await userEvent.click(within(detail).getByRole("button", { name: "New layer for 2 groups" }));
        await waitFor(() => {
            const stack = session.styles.list();
            assert.equal(stack[stack.findIndex((l) => l.id === layer.id) + 1]?.name, "Louvain 2 groups");
        });
        await session.styles.settled();
        assert.deepEqual(
            [drawn(session, a, "node.color"), drawn(session, b, "node.color")],
            colors,
            "each group keeps its color: the drawing does not change",
        );
    });

    /**
     * College football's Leiden groups in the layer's color binding, the largest 8 listed.
     * @returns the session, the layer, its path, the groups and the popover.
     */
    async function footballGroups(): Promise<{
        session: GraphSession;
        store: WorkspaceStore;
        layer: Layer;
        path: string;
        groups: ReturnType<GraphSession["styles"]["groups"]>;
        popover: HTMLElement;
    }> {
        await page.viewport(1440, 900);
        const { session, store } = await openSample("College football", 115);
        const { layer, path } = await runGroups(session, "leiden");
        const groups = session.styles.groups(layer.id, path);
        assert.isAbove(groups.length, 8, "Leiden finds more than 8 groups");
        const popover = await openBinding(store, layer);
        assert.lengthOf(gridRows(popover), 8, "the largest 8");
        return { session, store, layer, path, groups, popover };
    }

    /**
     * Lists every group: "N more" under the largest 8.
     * @param popover - the binding popover.
     * @param groups - the groups.
     */
    async function showAll(popover: HTMLElement, groups: readonly unknown[]): Promise<void> {
        await userEvent.click(within(popover).getByRole("button", { name: `${String(groups.length - 8)} more` }));
        await waitFor(() => {
            assert.lengthOf(gridRows(popover), groups.length);
        });
    }

    // One case per step group: the whole walk in one case sat at its time limit on a loaded machine.
    it("College football: the largest 8, N more, and search by value and by name", async () => {
        const { groups, popover } = await footballGroups();
        await showAll(popover, groups);

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
    });

    it("College football: sort by name, and fold small groups into Other and back", async () => {
        const { session, layer, path, groups, popover } = await footballGroups();
        const foldedBefore = groups.filter((g) => g.folded === true).length;
        await showAll(popover, groups);

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
    });

    it("College football: Select these selects a group, and the selected node's group is pinned first", async () => {
        const { session, store, layer, path, popover: list } = await footballGroups();

        // Select these: the group's nodes, from its row's menu. The second row, so pinning it
        // first is a move.
        const target = gridRows(list)[1];
        const targetKey = target.querySelector("[data-group-row]")?.getAttribute("data-group-row") ?? "";
        const targetName = nameCell(target).firstChild?.textContent ?? "";
        await userEvent.click(within(target).getByRole("button", { name: new RegExp(` ${targetName} actions$`) }));
        await userEvent.click(await within(list).findByRole("menuitem", { name: /^Select these / }));
        const count = session.styles.groups(layer.id, path).find((g) => String(g.value) === targetKey)?.count;
        await waitFor(() => {
            assert.equal(session.selection.nodes.length, count);
        });

        // The inspector now shows the selection. Back on the layer, the selected node's group is
        // pinned first, saying which node it has.
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Color binding" }));
        });
        const popover = await openBinding(store, layer);
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
        const { session, store } = await openProject("Many");
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
