/**
 * The binding popover on the REAL graphty-element, driven by real input (tier3 design, section 4
 * and decision 1.7): dragging the ramp's start moves the domain and the color a node is painted;
 * Logarithmic redraws the axis; a clamp shows the preview's count. On a Louvain layer, editing
 * one community's chit recolors only that community, a palette change leaves it, its minus
 * returns it to the palette, and "New layer for <value>" adds a layer above whose rule is that
 * value. The same rows work on a hand layer bound to a data column.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { paletteWord } from "../words";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Four groups of five nodes, each a clique, joined in a ring by one edge: four communities. */
const NODES = Array.from({ length: 20 }, (_, i) => ({
    id: `n${String(i)}`,
    score: i + 1,
    dept: ["police", "students", "family", "church"][Math.floor(i / 5)],
}));
const EDGES = [
    ...[0, 1, 2, 3].flatMap((group) =>
        [0, 1, 2, 3, 4].flatMap((a) =>
            [0, 1, 2, 3, 4]
                .filter((b) => b > a)
                .map((b) => ({ source: `n${String(group * 5 + a)}`, target: `n${String(group * 5 + b)}` })),
        ),
    ),
    ...[0, 1, 2, 3].map((group) => ({
        source: `n${String(group * 5)}`,
        target: `n${String(((group + 1) % 4) * 5 + 1)}`,
    })),
];

/**
 * Renders the workspace and loads the graph.
 * @returns the session and the store.
 */
async function open(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Bindings", id: 1 }, inspected: null });
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
    await session.data.addNodes(NODES);
    await session.data.addEdges(EDGES);
    await session.styles.settled();
    return { session, store };
}

/**
 * Opens a layer's Style tab and its color binding popover, by clicking the color's value pill.
 * @param store - the workspace store.
 * @param layer - the layer.
 * @returns the popover.
 */
async function openBinding(store: WorkspaceStore, layer: Layer): Promise<HTMLElement> {
    store.set({ inspected: { kind: "layer-row", id: layer.id } });
    const tab = await screen.findByTestId("style-tab", {}, { timeout: TIMEOUT_MS });
    const pill = await waitFor(() => {
        const found = tab.querySelector<HTMLElement>(".cm-var-fill-button");
        assert.isNotNull(found);
        return found;
    });
    if (pill === null) {
        throw new Error("no value pill");
    }
    await userEvent.click(pill);
    return screen.findByRole("group", { name: "Color binding" });
}

/**
 * The color a node is painted, as `#rrggbb`.
 * @param session - the session.
 * @param id - the node.
 * @returns the color.
 */
function colorOfNode(session: GraphSession, id: string): string | undefined {
    return session.styles.explain({ node: id }).merged["node.color"]?.hex.slice(0, 7).toLowerCase();
}

/**
 * The color a layer paints one value, from its legend.
 * @param session - the session.
 * @param layerId - the layer.
 * @param value - the value, as the legend spells it.
 * @returns the color.
 */
function colorOfValue(session: GraphSession, layerId: string, value: unknown): string | undefined {
    return session.styles
        .legendOf(layerId)
        .find((block) => block.channel === "node.color")
        ?.swatches.find((swatch) => String(swatch.value) === String(value))
        ?.color?.slice(0, 7)
        .toLowerCase();
}

/**
 * The tooltips of the ramp's bars, lowest first: its axis.
 * @param popover - the popover.
 * @returns the bars' words.
 */
function axisOf(popover: HTMLElement): string[] {
    return [...popover.querySelectorAll<HTMLElement>("[data-testid=histogram-bar]")].map((bar) => bar.title);
}

/**
 * The name the canvas key gives a value of a layer's color: "Group 3" for a run's group, by its
 * rank, else the value itself.
 * @param session - the session.
 * @param layerId - the layer.
 * @param value - the value.
 * @returns the name.
 */
function keyName(session: GraphSession, layerId: string, value: string): string {
    const swatch = session.styles
        .legendOf(layerId)
        .find((block) => block.channel === "node.color")
        ?.swatches.find((each) => String(each.value) === value);
    return swatch?.rank === undefined ? value : `Group ${String(swatch.rank)}`;
}

/**
 * The grid row of one value in a binding popover's group list.
 * @param popover - the popover.
 * @param value - the value, as the legend spells it.
 * @returns the row.
 */
function rowOf(popover: HTMLElement, value: string): HTMLElement {
    const cell = popover.querySelector(`[data-group-row="${value}"]`);
    const row = cell?.closest<HTMLElement>("[role=row]");
    if (row === null || row === undefined) {
        throw new Error(`no row for ${value}`);
    }
    return row;
}

/**
 * Opens a group row's menu and picks an item.
 * @param popover - the popover.
 * @param row - the row.
 * @param name - the row's name.
 * @param item - the item's name.
 */
async function rowMenu(popover: HTMLElement, row: HTMLElement, name: string, item: string | RegExp): Promise<void> {
    await userEvent.click(within(row).getByRole("button", { name: new RegExp(` ${name} actions$`) }));
    await userEvent.click(await within(popover).findByRole("menuitem", { name: item }));
}

/**
 * Edits one value's chit through its hex box, then checks the entry, its minus and its own
 * layer, on any categorical color layer.
 * @param session - the session.
 * @param store - the store.
 * @param layer - the categorical color layer.
 * @param value - the value to edit.
 * @param other - another value of the same layer.
 */
async function editValue(
    session: GraphSession,
    store: WorkspaceStore,
    layer: Layer,
    value: string,
    other: string,
): Promise<void> {
    const popover = await openBinding(store, layer);
    const category = session.styles.categories(layer.id, "node.color").find((c) => String(c.value) === value);
    assert.isDefined(category, `the layer paints ${value}`);
    const name = keyName(session, layer.id, value);
    const row = rowOf(popover, value);
    const otherBefore = colorOfValue(session, layer.id, other);

    await userEvent.click(within(row).getByTestId("compact-color-input-chip"));
    const hex = await screen.findByTestId("color-picker-value");
    await userEvent.tripleClick(hex);
    await userEvent.keyboard("00AA00{Enter}");
    await waitFor(() => {
        assert.equal(colorOfValue(session, layer.id, value), "#00aa00", `${value} takes its own color`);
    });
    assert.equal(colorOfValue(session, layer.id, other), otherBefore, "every other value keeps its color");
    // Enter keeps the picker open (Figma); Escape closes it and only it.
    await userEvent.keyboard("{Escape}");
    await waitFor(() => {
        assert.isNull(screen.queryByTestId("color-picker-value"), "Escape closes the picker");
    });
    assert.isTrue(popover.isConnected, "and leaves the popover open");

    // A palette change reaches every value without an entry and leaves the entry alone.
    await userEvent.click(within(popover).getByRole("combobox", { name: /^Palette/ }));
    const options = await screen.findAllByRole("option");
    // The layer sets no palette, so none is shown as chosen: pick one other than the one in force.
    const inForce = session.styles.legendOf(layer.id).find((block) => block.channel === "node.color")?.palette?.name;
    const next = options.find((o) => o.textContent !== paletteWord(inForce ?? ""));
    assert.isDefined(next);
    if (next !== undefined) {
        await userEvent.click(next);
    }
    await waitFor(() => {
        assert.notEqual(colorOfValue(session, layer.id, other), otherBefore, "the palette recolors the rest");
    });
    assert.equal(colorOfValue(session, layer.id, value), "#00aa00", "and leaves the entry");

    // Clear, in the row's menu, returns the value to the palette.
    await rowMenu(popover, rowOf(popover, value), name, /^Clear color/);
    await waitFor(() => {
        const back = session.styles.categories(layer.id, "node.color").find((c) => String(c.value) === value);
        assert.isUndefined(back?.entry);
        assert.notEqual(colorOfValue(session, layer.id, value), "#00aa00");
    });

    // "New layer for <value>": a layer directly above its source, its rule that value, carrying
    // what the value paints, so the drawing does not change.
    await rowMenu(popover, rowOf(popover, value), name, `New layer for ${name}`);
    const binding = layer.encode?.["node.color"];
    const by = binding !== undefined && "by" in binding ? binding.by : "";
    const added = await waitFor(() => {
        const stack = session.styles.list();
        const above = stack[stack.findIndex((l) => l.id === layer.id) + 1];
        assert.deepEqual(above?.selector, {
            match: "rule",
            where: { kind: "categories", attribute: by, values: [value] },
        });
        return above;
    });
    await session.styles.settled();
    assert.equal(session.styles.counts(added.id).matched, category?.count, "it matches the value's elements");
    await waitFor(() => {
        const { inspected } = store.get();
        assert.deepEqual(inspected, { kind: "layer-row", id: added.id }, "and opens");
    });
    await waitFor(() => {
        assert.isTrue(
            screen.getByTestId("style-tab").contains(document.activeElement),
            "focus is in the new layer's Style tab",
        );
    });
    assert.equal(store.get().announcement, `Layer ${added.name} added above ${layer.name}`, "and it is announced");
}

describe("the binding popover on the real element", () => {
    it("a ramp end dragged in can be dragged back out: the axis stays the data's extent", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await open();
        const layer = await session.styles.add({
            name: "Score",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.score" } },
        });
        await session.styles.settled();
        const popover = await openBinding(store, layer);
        const domainOf = (): number[] | undefined =>
            (session.styles.get(layer.id)?.encode?.["node.color"] as { domain?: number[] }).domain;
        const handle = within(popover).getByRole("slider", { name: "Ramp end" });
        const track = within(popover).getByTestId("ramp-editor-track");
        const { width } = track.getBoundingClientRect();

        await userEvent.dragAndDrop(handle, track, { targetPosition: { x: width * 0.5, y: 8 } });
        await waitFor(() => {
            assert.isBelow(domainOf()?.[1] ?? Infinity, 20, "the drag narrows the ramp");
        });
        assert.equal(handle.getAttribute("aria-valuemax"), "20", "the end can still reach the data's end");
        assert.equal(axisOf(popover)[0]?.split(" to ")[0], "1", "the axis still starts at the data's start");

        await userEvent.dragAndDrop(handle, track, { targetPosition: { x: width - 1, y: 8 } });
        await waitFor(() => {
            assert.equal(domainOf()?.[1], 20, "dragged back out to the data's end");
        });

        await userEvent.dragAndDrop(handle, track, { targetPosition: { x: width * 0.5, y: 8 } });
        await waitFor(() => {
            assert.isBelow(domainOf()?.[1] ?? Infinity, 20);
        });
        handle.focus();
        await userEvent.keyboard("{End}");
        await waitFor(() => {
            assert.equal(domainOf()?.[1], 20, "End reaches the data's end too");
        });
    });

    it("a dragged ramp start moves the domain and a node's color; Log redraws the axis; a clamp counts", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await open();
        const layer = await session.styles.add({
            name: "Score",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.score" } },
        });
        await session.styles.settled();
        const popover = await openBinding(store, layer);
        const low = colorOfNode(session, "n4");
        const lowest = colorOfNode(session, "n0");
        assert.notEqual(low, lowest, "score 5 and score 1 differ before the drag");

        const handle = within(popover).getByRole("slider", { name: "Ramp start" });
        const track = within(popover).getByTestId("ramp-editor-track");
        const { width } = track.getBoundingClientRect();
        await userEvent.dragAndDrop(handle, track, { targetPosition: { x: width * 0.5, y: 8 } });
        await waitFor(() => {
            const { domain } = session.styles.get(layer.id)?.encode?.["node.color"] as { domain?: unknown };
            assert.isArray(domain, "the drag writes a domain");
            assert.isAbove((domain as number[])[0], 1, "the ramp starts higher");
        });
        await waitFor(() => {
            assert.equal(colorOfNode(session, "n4"), lowest, "score 5 now paints as the ramp's start");
        });
        const from = within(popover).getByTestId("ramp-editor-from");
        assert.notEqual((from as HTMLInputElement).value, "1", "the ramp's start field follows");

        await userEvent.click(within(popover).getByRole("button", { name: "Fit to the data" }));
        const linear = await waitFor(() => {
            const bars = axisOf(popover);
            assert.equal(bars[0]?.split(" to ")[0], "1");
            return bars;
        });
        await userEvent.click(within(popover).getByRole("combobox", { name: /^Scale/ }));
        await userEvent.click(await screen.findByRole("option", { name: /^Logarithmic/ }));
        await waitFor(() => {
            assert.notDeepEqual(axisOf(popover), linear, "Log redraws the axis");
        });

        await userEvent.click(within(popover).getByRole("switch", { name: "Clamp outliers" }));
        await waitFor(() => {
            const binding = session.styles.get(layer.id)?.encode?.["node.color"];
            assert.isDefined(binding);
            if (binding === undefined || !("by" in binding)) {
                return;
            }
            const { below } = session.styles.preview(binding, { channel: "node.color" });
            assert.equal(
                within(popover).getByTestId("ramp-editor-outside-low").textContent,
                `${String(below)} outside`,
            );
        });

        // A stepped ramp lists its steps, each with the count the element gives it.
        await userEvent.click(within(popover).getByRole("combobox", { name: /^Scale/ }));
        await userEvent.click(await screen.findByRole("option", { name: /^Equal bins/ }));
        await waitFor(() => {
            const steps = within(within(popover).getByRole("list", { name: "Steps" })).getAllByRole("listitem");
            assert.isAtLeast(steps.length, 2);
            const total = steps
                .map((step) => Number.parseInt((step.getAttribute("aria-label") ?? "").split(", ").pop() ?? "", 10))
                .reduce((sum, count) => sum + count, 0);
            assert.equal(total, NODES.length, "every node is in one step");
        });
    });

    it("on Louvain: a chit recolors one community, survives a palette change, clears, and makes a layer", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await open();
        await session.runs.start("louvain");
        await session.styles.settled();
        const layer = session.styles
            .list()
            .find((l) => l.source.by === "run" && l.encode?.["node.color"] !== undefined);
        assert.isDefined(layer, "Louvain colors the nodes");
        if (layer === undefined) {
            return;
        }
        const values = session.styles.categories(layer.id, "node.color").map((c) => String(c.value));
        assert.isAtLeast(values.length, 2);
        const value = values.includes("3") ? "3" : values[values.length - 1];
        await editValue(session, store, layer, value, values.find((v) => v !== value) ?? "");
    });

    it("on Louvain: rows show name and count beside the chit, named as the key; beside the panel; Escape back", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await open();
        await session.runs.start("louvain");
        await session.styles.settled();
        const layer = session.styles
            .list()
            .find((l) => l.source.by === "run" && l.encode?.["node.color"] !== undefined);
        assert.isDefined(layer, "Louvain colors the nodes");
        if (layer === undefined) {
            return;
        }
        const popover = await openBinding(store, layer);
        const grid = within(popover).getByRole("grid", { name: /groups$/ });
        const rows = within(grid)
            .getAllByRole("row")
            .filter((row) => row.querySelector("[role=gridcell]") !== null);
        const categories = session.styles.categories(layer.id, "node.color");
        assert.lengthOf(rows, Math.min(8, categories.length), "the largest 8 groups");
        const keyNames = categories.map((c) => keyName(session, layer.id, String(c.value)));
        assert.isTrue(
            keyNames.every((name) => name.startsWith("Group ")),
            "the key names Louvain's groups by rank",
        );
        rows.forEach((row, at) => {
            const [chit, name, count] = [...row.querySelectorAll<HTMLElement>("[role=gridcell]")];
            assert.equal(
                name.querySelector("[data-group-name]")?.firstChild?.textContent,
                keyNames[at],
                "named as the key",
            );
            assert.equal(count.textContent, String(categories[at].count), "the count in its own column");
            const box = chit.querySelector("[data-testid=compact-color-input-chip]")?.getBoundingClientRect();
            const words = name.getBoundingClientRect();
            assert.isAtMost(box?.right ?? Infinity, words.left, `the color chip stops before ${keyNames[at]}'s name`);
            assert.isAtLeast(count.getBoundingClientRect().left, words.right - 1, "the count follows the name");
            // The row reads its name, size and every property it varies but the list's own, color,
            // which its field says: the field is named for the group and the color.
            assert.match(name.textContent, new RegExp(`^${keyNames[at]}, ${String(categories[at].count)} nodes?$`));
            assert.isNotNull(
                chit.querySelector(`[aria-label*="${keyNames[at]} color, "]`),
                `${keyNames[at]}'s field names its color`,
            );
        });
        assert.isDefined(
            within(rows[0]).getByRole("button", { name: new RegExp(`^Hide .* ${keyNames[0]}$`) }),
            "the eye names the source and the value",
        );

        const dialog = popover.closest<HTMLElement>("[role=dialog]");
        const inspector = screen.getByRole("complementary", { name: "Inspector" });
        assert.closeTo(
            dialog?.getBoundingClientRect().right ?? 0,
            inspector.getBoundingClientRect().left,
            1,
            "the popover opens flush with the inspector's edge",
        );

        const pill = screen.getByTestId("style-tab").querySelector<HTMLElement>(".cm-var-fill-button");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("group", { name: "Color binding" }), "Escape closes it");
            assert.equal(document.activeElement, pill, "and gives focus back to the pill that opened it");
        });
    });

    it("the same rows work on a hand layer bound to a data column", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await open();
        const layer = await session.styles.add({
            name: "Departments",
            target: "node",
            selector: { match: "everything" },
            encode: { "node.color": { by: "data.dept", scale: "ordinal" } },
        });
        await session.styles.settled();
        await editValue(session, store, layer, "police", "students");
    });

    it("on Louvain: Rename names a group, kept by the element and shown in the popover and the key", async () => {
        await page.viewport(1440, 900);
        const { session, store } = await open();
        const { runId } = await session.runs.start("louvain");
        await session.styles.settled();
        const layer = session.styles
            .list()
            .find((l) => l.source.by === "run" && l.encode?.["node.color"] !== undefined);
        assert.isDefined(layer, "Louvain colors the nodes");
        if (layer === undefined) {
            return;
        }
        const value = String(session.styles.categories(layer.id, "node.color")[0]?.value);
        const name = keyName(session, layer.id, value);
        const popover = await openBinding(store, layer);
        await rowMenu(popover, rowOf(popover, value), name, /^Rename/);
        const field = await within(popover).findByRole("textbox", { name: new RegExp(`^Name of .* ${name}$`) });
        await userEvent.clear(field);
        await userEvent.type(field, "Students{Enter}");
        const path = session.results.path(runId);
        await waitFor(() => {
            assert.equal(session.data.valueLabels(path).get(value), "Students");
        });
        await waitFor(() => {
            assert.equal(rowOf(popover, value).querySelector("[data-group-name]")?.firstChild?.textContent, "Students");
        });
        const legend = await screen.findByRole("region", { name: "Legend" });
        await within(legend).findByText("Students");
    });
});
