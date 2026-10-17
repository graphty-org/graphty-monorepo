/**
 * Vary by Layer on several layers, on the REAL graphty-element with real clicks and keys: with a
 * folder or several layers selected, a property's Vary list ("Vary by") offers "Layer", which opens
 * the same binding popover a value of the data opens -- a palette, the very group list Louvain's
 * groups draw (graphty-element's `styles.layerGroups`, each layer one group, top first), what
 * happens past the palette, a size range; closing it writes each layer its own plain value in one
 * undo step.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { channelsFor } from "@graphty/graphty-element/catalog";
import type { Channel } from "@graphty/graphty-element/schema";
import { type GraphSession, OVERFLOW_SHAPES } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables in the workspace.
 * @returns The session.
 */
async function openSample(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
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
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * A folder of hand-made layers, each on two characters and writing `set`.
 * @param session - The session.
 * @param name - The folder's name.
 * @param target - Nodes or edges.
 * @param set - What each layer writes.
 * @param names - The layers' names after the folder's, top last.
 * @returns The layers, top first as the tree lists them.
 */
async function handMade(
    session: GraphSession,
    name: string,
    target: "node" | "edge",
    set: Readonly<Partial<Record<Channel, string | number>>>,
    names: readonly string[] = ["First", "Second", "Third"],
): Promise<string[]> {
    const folder = await session.styles.addFolder(name);
    const ids = session.data.nodes().map((node) => String(node.id));
    for (const [at, layerName] of names.entries()) {
        const layer = await session.styles.add({
            name: `${name} ${layerName}`,
            target,
            selector:
                target === "node"
                    ? { match: "ids", nodes: ids.slice(at * 2, at * 2 + 2) }
                    : { match: "rule", where: { kind: "range", attribute: "data.value", min: at + 1, max: at + 1 } },
            set,
        });
        await session.styles.moveRow(layer.id, { parent: folder.id });
    }
    await session.styles.settled();
    return [...session.styles.layersUnder([folder.id])].reverse().flatMap((reach) => {
        const parts = session.styles.parts(reach.row);
        return [parts?.node ?? parts?.edge ?? reach.row];
    });
}

/**
 * Select a row of the style tree by clicking it.
 * @param name - The row's name.
 */
async function clickRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(within(tree).getByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

/**
 * A property row of the Style tab.
 * @param channel - The channel.
 * @returns The row.
 */
async function line(channel: string): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab");
    return waitFor(() => {
        const found = tab.querySelector<HTMLElement>(`.ws-row[data-line="${channel}"]`);
        assert.isNotNull(found);
        return found;
    });
}

/**
 * Open a property's Vary list, check its heading, and pick "Layer".
 * @param row - The property row.
 * @returns The binding popover with Layer as its source.
 */
async function varyByLayer(row: HTMLElement): Promise<HTMLElement> {
    await userEvent.hover(row);
    await userEvent.click(within(row).getByRole("button", { name: / by attribute$/ }));
    await screen.findByRole("dialog", { name: "Vary by" });
    await userEvent.click(await screen.findByRole("option", { name: /^Layer/ }));
    const popover = await screen.findByRole("dialog", { name: / by layer$/ });
    await within(popover).findByText("Layer", { selector: "strong" });
    return popover;
}

/**
 * The data rows of a popover's group grid.
 * @param popover - The popover.
 * @returns The rows, top first.
 */
function gridRows(popover: HTMLElement): HTMLElement[] {
    const grid = within(popover).getByRole("grid", { name: /groups$/ });
    return within(grid)
        .getAllByRole("row")
        .filter((row) => row.querySelector("[role=gridcell]") !== null);
}

/**
 * How a group list is built, row by row: the grid's column count, each first-row cell's controls
 * by role, the name cell, the eye and the actions menu, and the menu's items with each group's name
 * taken out. Two lists drawn by the same component give the same shape.
 * @param popover - The popover.
 * @returns The shape, and the menu's items.
 */
async function rowShape(popover: HTMLElement): Promise<{ shape: unknown; items: string[] }> {
    const grid = within(popover).getByRole("grid", { name: /groups$/ });
    const [first] = gridRows(popover);
    const cells = within(first).getAllByRole("gridcell");
    const name = first.querySelector("[data-group-name]")?.textContent?.split(",")[0] ?? "";
    const shape = {
        columns: within(grid).getAllByRole("columnheader").length,
        cells: cells.map((cell) => [...cell.querySelectorAll("button, input")].map((c) => c.tagName).join(" ")),
        named: first.querySelector("[data-group-name]") !== null,
        eye: within(first).getAllByRole("button", { name: /^Hide / }).length,
    };
    const actions = within(first).getByRole("button", { name: / actions$/ });
    await userEvent.click(actions);
    const items = (await screen.findAllByRole("menuitem")).map((item) =>
        (item.textContent ?? "").replace(name, "<group>").replace(/\d+ nodes?/, "<n> nodes"),
    );
    await userEvent.click(actions);
    return { shape, items };
}

/**
 * Close the popover, which writes each layer its value.
 * @param popover - The popover.
 */
async function close(popover: HTMLElement): Promise<void> {
    await userEvent.click(within(popover).getByRole("button", { name: "Close panel" }));
}

/**
 * What each layer writes for a channel, as plain values.
 * @param session - The session.
 * @param ids - The layers.
 * @param channel - The channel.
 * @returns The values.
 */
function written(session: GraphSession, ids: readonly string[], channel: Channel): unknown[] {
    return ids.map((id) => session.styles.get(id)?.set?.[channel]);
}

/**
 * The sections of a binding popover in order, outside its group list: each labelled control with
 * its kind, each button but a field's Reset, and the group list itself. The words that name the source ("values",
 * "layers") are taken out, so two popovers drawn by one component give the same structure.
 * @param popover - The popover.
 * @returns The sections.
 */
function sections(popover: HTMLElement): string[] {
    const body = within(popover).getByRole("group", { name: / binding$/ });
    return (
        [...body.querySelectorAll<HTMLElement>("label, button, [data-group-list]")]
            .filter((el) => el.parentElement?.closest("[data-group-list]") === null)
            // A field's Reset shows while it holds a value of its own: state, not structure.
            .filter((el) => !(el.getAttribute("aria-label") ?? "").startsWith("Reset "))
            .map((el) => {
                if (el.hasAttribute("data-group-list")) {
                    return "group list";
                }
                const words = (el.textContent ?? "").replace(/\b(values|layers)\b/, "<groups>").trim();
                if (el.tagName === "LABEL") {
                    const control = document.getElementById((el as HTMLLabelElement).htmlFor);
                    return `${words}: ${control?.getAttribute("role") ?? control?.tagName.toLowerCase() ?? "none"}`;
                }
                return `button ${el.getAttribute("aria-label") ?? words}`;
            })
    );
}

/**
 * Where a popover draws No value: its label's and its field's place and size within the popover's
 * body, and what the field reads.
 * @param popover - The popover.
 * @returns The layout.
 */
function noValueLayout(popover: HTMLElement): unknown {
    const body = within(popover).getByRole("group", { name: / binding$/ });
    const box = body.getBoundingClientRect();
    const label = [...body.querySelectorAll("label")].find((each) => each.textContent?.trim() === "No value");
    const control = document.getElementById(label?.htmlFor ?? "") as HTMLInputElement | null;
    assert.isNotNull(control, "No value has its field");
    const at = (el: Element): number[] => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.left - box.left), Math.round(r.width), Math.round(r.height)];
    };
    return {
        label: label === undefined ? null : at(label),
        control: control === null ? null : at(control),
        value: control?.value,
    };
}

/**
 * A folder of hand-made node layers, each on two characters and setting its own value.
 * @param session - The session.
 * @param name - The folder's name.
 * @param channel - The property each sets.
 * @param values - One value per layer.
 * @returns The layers, top first as the tree lists them, holding `values` in that order.
 */
async function eachOwn(
    session: GraphSession,
    name: string,
    channel: Channel,
    values: readonly (string | number)[],
): Promise<string[]> {
    const layers = await handMade(
        session,
        name,
        "node",
        { [channel]: values[0] },
        values.map((_, at) => `L${String(at + 1)}`),
    );
    // The top layer takes the first value.
    await session.styles.updateMany(
        layers.map((id, at) => ({
            id,
            patch: { set: { ...session.styles.get(id)?.set, [channel]: values[at] } },
        })),
    );
    await session.styles.settled();
    return layers;
}

/**
 * Each layer's value as a property row shows it at rest: chit, picture or words, then "+N".
 * @param row - The property row.
 * @returns What it shows, and its "+N".
 */
function atRest(row: HTMLElement): { readonly shown: Element[]; readonly more: string | null } {
    const spread = row.querySelector("[data-spread]");
    assert.isNotNull(spread, "each layer's own value at rest");
    return {
        shown: [...(spread?.querySelectorAll(".ws-varied-chit, .ws-spread-chip") ?? [])],
        more: spread?.querySelector("[data-more]")?.textContent ?? null,
    };
}

describe("vary by layer", () => {
    it("gives a folder's layers a palette's colors in list order, plain values, one Undo; no Selection colors", async () => {
        const session = await openSample();
        const groups = await handMade(
            session,
            "Twelve",
            "node",
            { "node.color": "#CCCCCC" },
            Array.from({ length: 12 }, (_, at) => `L${String(at + 1)}`),
        );
        const before = written(session, groups, "node.color");
        await clickRow("Twelve");

        assert.isNull(screen.queryByRole("heading", { name: "Selection colors" }), "Selection colors is gone");
        assert.isNull(screen.queryByRole("button", { name: /selection colors?$/ }));

        const fill = await line("node.color");
        const panel = await varyByLayer(fill);
        assert.lengthOf(gridRows(panel), Math.min(groups.length, 8), "one row per layer, the first 8 shown");
        await waitFor(() => {
            assert.isTrue(panel.contains(document.activeElement), "focus goes into the panel");
        });
        await close(panel);

        const palette = session.catalog.palettes().filter((p) => p.kind === "categorical" && p.colors.length > 2)[0];
        await waitFor(() => {
            const colors = written(session, groups, "node.color");
            const shown = Math.min(groups.length, palette.colors.length);
            assert.deepEqual(
                colors.slice(0, shown),
                palette.colors.slice(0, shown).map((c) => c.slice(0, 7).toUpperCase()),
                "the palette's colors, top layer first",
            );
            assert.strictEqual(new Set(colors).size, groups.length, "every layer its own color");
        });
        for (const id of groups) {
            assert.isUndefined(session.styles.get(id)?.encode?.["node.color"], "a plain value, no rule");
        }
        await within(fill).findByText(new RegExp(`: ${String(groups.length)} changed`));

        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(written(session, groups, "node.color"), before, "one undo restores every layer");
        });
        // Undone, the write's receipt goes: its Undo would undo a step that is not its own.
        await waitFor(async () => {
            assert.isNull(within(await line("node.color")).queryByRole("status"));
        });
    });

    it("lists Louvain's groups and the layers of a folder with the same group rows", async () => {
        const session = await openSample();
        // Louvain's flow: its layer's Fill varies by the community; the pill opens the popover.
        const run = session.runs.start("louvain", {}, { seed: 1 });
        await run;
        await session.styles.settled();
        const runId = run.id;
        const louvain = session.styles
            .list()
            .find((l) => session.runs.bindings(runId).includes(l.id) && l.encode?.["node.color"] !== undefined);
        assert.isDefined(louvain);
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        const name = session.styles.tree().find((row) => row.id === (louvain?.row ?? louvain?.id))?.name ?? "";
        await userEvent.click(within(tree).getByRole("treeitem", { name: (n) => n.startsWith(`${name}, `) }));
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(await within(tab).findByRole("button", { name: /^Node color: / }));
        const byGroup = await screen.findByRole("group", { name: "Color binding" });
        const fromData = await rowShape(byGroup);
        await userEvent.keyboard("{Escape}");

        // Layer's flow: a hand-made folder's Fill varies by Layer.
        await handMade(session, "Story", "node", { "node.color": "#cccccc" });
        await clickRow("Story");
        const byLayer = await varyByLayer(await line("node.color"));
        const fromLayers = await rowShape(byLayer);

        assert.deepEqual(fromLayers.shape, fromData.shape, "the same row component: cells, name, eye and menu");
        for (const item of ["Select these <n> nodes", "Rename"]) {
            assert.include(fromData.items.join("|"), item.replace("<n> nodes", ""));
            assert.include(fromLayers.items.join("|"), item.replace("<n> nodes", ""));
        }
        assert.isTrue(fromData.items.some((item) => item.startsWith("New layer for")));
        assert.isFalse(
            fromLayers.items.some((item) => item.startsWith("New layer for")),
            "a layer is a layer already",
        );

        // The eye hides the layer itself, as the layer list's does.
        const top = session.styles.tree().find((row) => row.name === "Story")?.children[0];
        await userEvent.click(within(byLayer).getByRole("button", { name: `Hide Layer ${top?.name ?? ""}` }));
        await waitFor(() => {
            const row = session.styles.tree().find((r) => r.name === "Story")?.children[0];
            assert.isTrue(row?.hidden, "the top layer of the folder is hidden");
        });
    });

    it("starts Shape by Layer with the overflow's distinct shapes, then the rest", async () => {
        const session = await openSample();
        const groups = await handMade(session, "Many", "node", { "node.size": 2 }, [
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
        ]);
        assert.isAbove(groups.length, OVERFLOW_SHAPES.length, "more layers than distinct shapes");
        await clickRow("Many");

        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const panel = await varyByLayer(await line("node.shape"));
        await close(panel);

        const channel = channelsFor("node").find((c) => c.channel === "node.shape");
        const rest = (channel?.values ?? []).filter((shape) => !(OVERFLOW_SHAPES as readonly string[]).includes(shape));
        await waitFor(() => {
            assert.deepEqual(
                written(session, groups, "node.shape"),
                [...OVERFLOW_SHAPES, ...rest].slice(0, groups.length),
                "the six distinct shapes first, then the rest of the list",
            );
        });
    });

    it("gives each layer of a hand-made folder a different shape", async () => {
        const session = await openSample();
        const layers = await handMade(session, "Story", "node", { "node.size": 2 });
        await clickRow("Story");

        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const panel = await varyByLayer(await line("node.shape"));
        const before = written(session, layers, "node.shape");
        // One row's own value, picked in its row as a group's is.
        await userEvent.click(within(panel).getByLabelText("Layer Story Second shape"));
        await userEvent.click(await screen.findByRole("option", { name: /cylinder/i }));
        assert.isTrue(panel.isConnected, "picking a row's value keeps the popover open");
        await userEvent.click(within(panel).getByRole("button", { name: "Layer Story Second actions" }));
        await screen.findByRole("menuitem", { name: "Clear shape: back to the palette" });
        // Escape closes the row's menu only, never the popover around it.
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("menuitem", { name: "Clear shape: back to the palette" }));
        });
        assert.isTrue(panel.isConnected, "the popover stays open");
        assert.deepEqual(written(session, layers, "node.shape"), before, "nothing written while it is open");
        await close(panel);

        await waitFor(() => {
            assert.deepEqual(
                written(session, layers, "node.shape"),
                [OVERFLOW_SHAPES[0], "cylinder", OVERFLOW_SHAPES[2]],
                "the distinct shapes first, and the row's own pick",
            );
        });
    });

    it.each([true, false])(
        "opens a clicked '+' menu on its first item, so Enter adds it (several layers: %s)",
        async (many) => {
            const session = await openSample();
            for (const name of ["Story One", "Story Two"]) {
                await session.styles.add({
                    name,
                    target: "node",
                    selector: { match: "ids", nodes: ["0"] },
                    set: { "node.size": 2 },
                });
            }
            await session.styles.settled();
            await clickRow("Story One");
            const tree = await screen.findByRole("tree", { name: "Style layers" });
            if (many) {
                await userEvent.click(within(tree).getByRole("treeitem", { name: /^Story Two, / }), {
                    modifiers: ["Control"],
                });
            }
            const tab = await screen.findByTestId("style-tab");
            await waitFor(() => {
                assert.lengthOf(within(tree).getAllByRole("treeitem", { selected: true }), many ? 2 : 1);
            });

            await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
            const first = (await screen.findAllByRole("menuitem"))[0];
            await waitFor(() => {
                assert.strictEqual(document.activeElement, first, "the first item is active on open");
            });
            await userEvent.keyboard("{Enter}");
            await line("node.shape");
        },
    );

    it("spreads a size range over the layers, and a line pattern per edge layer", async () => {
        const session = await openSample();
        const layers = await handMade(session, "Sizes", "node", { "node.size": 1 });
        await clickRow("Sizes");

        const size = await line("node.size");
        const panel = await varyByLayer(size);
        await userEvent.click(within(panel).getByLabelText("Paints from"));
        await userEvent.keyboard("{Control>}a{/Control}1{Enter}");
        await userEvent.click(within(panel).getByLabelText("Paints to"));
        await userEvent.keyboard("{Control>}a{/Control}3{Enter}");
        await waitFor(() => {
            const third = within(panel).getByLabelText("Layer Sizes First size");
            assert.strictEqual((third as HTMLInputElement).value, "3", "the preview follows the range");
        });
        await close(panel);
        await waitFor(() => {
            assert.deepEqual(written(session, layers, "node.size"), [1, 2, 3], "top layer first, evenly spread");
        });

        const edges = await handMade(session, "Lines", "edge", { "edge.style": "solid" });
        await clickRow("Lines");
        const pattern = await line("edge.style");
        await close(await varyByLayer(pattern));
        await waitFor(() => {
            assert.strictEqual(new Set(written(session, edges, "edge.style")).size, edges.length);
        });
    });

    it("opens one popover: a layer's Fill by Louvain and a folder's Fill by Layer have the same sections, No value too", async () => {
        const session = await openSample();
        await session.runs.start("louvain", {}, { seed: 1 });
        await session.styles.settled();
        // One plain layer: its Fill varies by Louvain's communities.
        const plain = await session.styles.add({
            name: "Plain",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": "#cccccc" },
        });
        await session.styles.settled();
        await clickRow("Plain");
        const fill = await line("node.color");
        await userEvent.hover(fill);
        await userEvent.click(within(fill).getByRole("button", { name: "Node color by attribute" }));
        const options = await screen.findAllByRole("option", { name: /community|louvain/i });
        await userEvent.click(options[0]);
        await waitFor(() => {
            const binding = session.styles.get(plain.id)?.encode?.["node.color"];
            assert.isTrue(binding !== undefined && "by" in binding, "the layer varies by Louvain");
        });
        await userEvent.click(await within(await line("node.color")).findByRole("button", { name: /^Node color: / }));
        const byLouvain = await screen.findByRole("dialog", { name: /^Color by / });
        await within(byLouvain).findByRole("grid", { name: /groups$/ });
        const fromData = sections(byLouvain);
        const louvainNoValue = noValueLayout(byLouvain);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(byLouvain.isConnected);
        });

        await handMade(session, "Story", "node", { "node.color": "#cccccc" });
        await clickRow("Story");
        const byLayer = await varyByLayer(await line("node.color"));
        const fromLayers = sections(byLayer);

        // No value too: Layer is a source like any other.
        assert.include(fromData, "No value: combobox");
        assert.deepEqual(fromLayers, fromData, "the same sections, in the same order, with the same controls");
        assert.deepEqual(noValueLayout(byLayer), louvainNoValue, "No value laid out alike");
        assert.include(fromData, "More <groups> than colors: combobox");
        assert.isNotNull(within(byLayer).queryByText("More layers than colors"), "the source's own word");
    });

    it("opens the same binding popover for a data field on a folder, and copies it into each layer on close", async () => {
        const session = await openSample();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        const folder = session.styles.tree().find((row) => row.name === "Louvain");
        const groups = [...session.styles.layersUnder([folder?.id ?? ""])].reverse().map((reach) => {
            const parts = session.styles.parts(reach.row);
            return parts?.node ?? reach.row;
        });
        const before = written(session, groups, "node.color");
        await clickRow("Louvain");

        const fill = await line("node.color");
        await userEvent.hover(fill);
        await userEvent.click(within(fill).getByRole("button", { name: "Node color by attribute" }));
        await userEvent.click(await screen.findByRole("option", { name: /^id\b/i }));
        const popover = await screen.findByRole("dialog", { name: /^Color by / });
        await within(popover).findByRole("grid", { name: /groups$/ });
        assert.isNull(within(fill).queryByRole("group", { name: /in each layer/ }), "no per-layer preview");
        assert.include(sections(popover), "More <groups> than colors: combobox", "the single layer's sections");
        assert.deepEqual(written(session, groups, "node.color"), before, "nothing written while it is open");

        await close(popover);
        await waitFor(() => {
            for (const id of groups) {
                const binding = session.styles.get(id)?.encode?.["node.color"];
                assert.isTrue(binding !== undefined && "by" in binding, "each layer holds its own copy");
            }
        });
        await within(await line("node.color")).findByRole("status");
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(written(session, groups, "node.color"), before, "one undo restores every layer");
        });
    });
});

/** Twelve colors, one per layer. */
const TWELVE_COLORS = [
    "#E69F00",
    "#56B4E9",
    "#009E73",
    "#F0E442",
    "#0072B2",
    "#D55E00",
    "#CC79A7",
    "#000000",
    "#999999",
    "#AA4499",
    "#117733",
    "#882255",
];

/**
 * A color as the browser computes a background.
 * @param hex - The color.
 * @returns Its rgb().
 */
function rgbOf(hex: string): string {
    const n = Number.parseInt(hex.slice(1), 16);
    return `rgb(${String(n >> 16)}, ${String((n >> 8) & 255)}, ${String(n & 255)})`;
}

/**
 * The values a case's layers hold, one per layer.
 * @param channel - The property.
 * @param n - How many layers.
 * @returns The values.
 */
function valuesFor(channel: Channel, n: number): (string | number)[] {
    if (channel === "node.color") {
        return TWELVE_COLORS.slice(0, n);
    }
    if (channel === "node.shape") {
        return (channelsFor("node").find((c) => c.channel === "node.shape")?.values ?? []).slice(0, n);
    }
    return Array.from({ length: n }, (_, at) => at + 1);
}

describe("several layers holding different values", () => {
    it.each([
        ["node.color", 3],
        ["node.color", 12],
        ["node.shape", 3],
        ["node.shape", 12],
        ["node.size", 3],
        ["node.size", 12],
    ] as const)("shows each layer's own %s at rest, %i layers, the first 8 then +N", async (channel, n) => {
        const session = await openSample();
        const values = valuesFor(channel, n);
        assert.lengthOf(values, n);
        const layers = await eachOwn(session, "Own", channel, values);
        await clickRow("Own");

        const row = await line(channel);
        const { shown, more } = atRest(row);
        assert.lengthOf(shown, Math.min(n, 8), "one per layer, the first 8");
        assert.strictEqual(more, n > 8 ? `+${String(n - 8)}` : null);
        assert.notInclude(row.textContent ?? "", "Mixed");
        // Every value and the "+N" is drawn whole inside the field, none clipped by its edge.
        const box = row.querySelector("[data-spread]")?.getBoundingClientRect();
        for (const each of [...shown, ...row.querySelectorAll("[data-spread] [data-more]")]) {
            const r = each.getBoundingClientRect();
            assert.isTrue(
                box !== undefined && r.left >= box.left && r.right <= box.right && r.bottom <= box.bottom,
                "inside the field",
            );
        }
        assert.isNull(row.querySelector("[data-breakdown]"), "every layer sets it: no breakdown");
        for (const [at, each] of shown.entries()) {
            const name = session.styles.get(layers[at])?.name ?? "";
            assert.isTrue(each.getAttribute("title")?.startsWith(`${name}: `), "in layer order, top first");
            if (channel === "node.color") {
                assert.strictEqual(getComputedStyle(each).backgroundColor, rgbOf(String(values[at])));
            } else if (channel === "node.shape") {
                assert.isNotNull(each.querySelector("svg"), "the catalog's picture of the shape");
            } else {
                assert.strictEqual(each.textContent, String(values[at]));
            }
        }

        // A click opens all of them, by Layer.
        await userEvent.click(within(row).getByRole("button", { name: /^Node \w+: / }));
        const popover = await screen.findByRole("dialog", { name: / by layer$/ });
        assert.lengthOf(gridRows(popover), Math.min(n, 8));
        await close(popover);
        await waitFor(() => {
            assert.isFalse(popover.isConnected);
        });
        assert.deepEqual(written(session, layers, channel), values, "closed unchanged: nothing written");
    });

    it("reopens on each layer's current value, writes the edited one as a plain value, and keeps nothing", async () => {
        const session = await openSample();
        const layers = await eachOwn(session, "Sizes", "node.size", [1, 2, 3]);
        const count = session.styles.list().length;
        await clickRow("Sizes");
        const nameOf = (id: string): string => session.styles.get(id)?.name ?? "";

        const open = async (): Promise<HTMLElement> => {
            await userEvent.click(within(await line("node.size")).getByRole("button", { name: /^Node size: / }));
            return screen.findByRole("dialog", { name: / by layer$/ });
        };
        let popover = await open();
        for (const [at, id] of layers.entries()) {
            const field = within(popover).getByLabelText<HTMLInputElement>(`Layer ${nameOf(id)} size`);
            assert.strictEqual(field.value, String(at + 1), "each row starts on its layer's value");
        }
        await userEvent.click(within(popover).getByLabelText(`Layer ${nameOf(layers[1])} size`));
        await userEvent.keyboard("{Control>}a{/Control}7{Enter}");
        await close(popover);

        await waitFor(() => {
            assert.deepEqual(written(session, layers, "node.size"), [1, 7, 3], "the edited row, the rest as they were");
        });
        // Only the edited layer changed, and the receipt says so.
        await within(await line("node.size")).findByText(/: 1 changed/);
        for (const id of layers) {
            assert.isUndefined(session.styles.get(id)?.encode?.["node.size"], "a plain value, no rule");
        }
        assert.strictEqual(session.styles.list().length, count, "nothing added: Layer is not kept");

        // Opened again, it is rebuilt from the layers' values.
        popover = await open();
        assert.strictEqual(
            within(popover).getByLabelText<HTMLInputElement>(`Layer ${nameOf(layers[1])} size`).value,
            "7",
        );
        await close(popover);
    });

    it("counts only the layer edited, on a run's group layers whose colors are written in lower case", async () => {
        const session = await openSample();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        await clickRow("Louvain");
        await userEvent.click(within(await line("node.color")).getByRole("button", { name: /^Node color: / }));
        const popover = await screen.findByRole("dialog", { name: / by layer$/ });
        await userEvent.click(within(popover).getAllByRole("button", { name: /^Layer .* color/ })[1]);
        await screen.findByRole("dialog", { name: "Color" });
        await userEvent.keyboard("{Control>}a{/Control}000000{Enter}");
        await userEvent.keyboard("{Escape}");
        await userEvent.keyboard("{Escape}");
        await within(await line("node.color")).findByText(/: 1 changed/);
    });

    it("closes a row's color picker on Escape, then the popover on the next, writing the pick", async () => {
        const session = await openSample();
        const layers = await eachOwn(session, "Hues", "node.color", TWELVE_COLORS.slice(0, 3));
        await clickRow("Hues");
        await userEvent.click(within(await line("node.color")).getByRole("button", { name: /^Node color: / }));
        const popover = await screen.findByRole("dialog", { name: / by layer$/ });
        const second = session.styles.get(layers[1])?.name ?? "";
        await userEvent.click(within(popover).getByRole("button", { name: new RegExp(`^Layer ${second} color`) }));
        const picker = await screen.findByRole("dialog", { name: "Color" });
        await userEvent.keyboard("{Control>}a{/Control}000000{Enter}");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(picker.isConnected, "Escape closes the picker");
        });
        assert.isTrue(popover.isConnected, "and only the picker");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(popover.isConnected, "the next Escape closes the popover");
        });
        await waitFor(() => {
            assert.deepEqual(written(session, layers, "node.color"), [TWELVE_COLORS[0], "#000000", TWELVE_COLORS[2]]);
        });
        await within(await line("node.color")).findByText(/: 1 changed/);
    });

    it("gives each hand-made layer of many groups its own real Degree rule, as one layer gets alone; same popover", async () => {
        const session = await openSample();
        await session.runs.start("degree");
        await session.styles.settled();
        const ids = session.data.nodes().map((node) => String(node.id));
        const add = async (name: string, nodes: string[]): Promise<string> =>
            (
                await session.styles.add({
                    name,
                    target: "node",
                    selector: { match: "ids", nodes },
                    set: { "node.color": "#CCCCCC" },
                })
            ).id;
        const folder = await session.styles.addFolder("Crowds");
        const crowds = [await add("Crowd A", ids.slice(0, 12)), await add("Crowd B", ids.slice(12, 24))];
        for (const id of crowds) {
            await session.styles.moveRow(id, { parent: folder.id });
        }
        const solo = await add("Solo", ids.slice(24, 36));
        await session.styles.settled();

        const pickDegree = async (): Promise<void> => {
            const fill = await line("node.color");
            await userEvent.hover(fill);
            await userEvent.click(within(fill).getByRole("button", { name: "Node color by attribute" }));
            const options = await screen.findAllByRole("option", { name: /^Degree$/ });
            await userEvent.click(options[0]);
        };

        // One layer on its own: the rule is written at once; its pill opens the popover.
        await clickRow("Solo");
        await pickDegree();
        await waitFor(() => {
            assert.isDefined(session.styles.get(solo)?.encode?.["node.color"]);
        });
        if (screen.queryByRole("dialog", { name: /^Color by / }) === null) {
            await userEvent.click(within(await line("node.color")).getByRole("button", { name: /^Node color: / }));
        }
        const alone = await screen.findByRole("dialog", { name: /^Color by / });
        const aloneSections = sections(alone);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(alone.isConnected);
        });

        // Two layers, each holding many degrees: the same popover, then each its own copy.
        await clickRow("Crowds");
        await pickDegree();
        const together = await screen.findByRole("dialog", { name: /^Color by / });
        assert.deepEqual(sections(together), aloneSections, "the same sections as one layer's");
        await close(together);
        const rule = session.styles.get(solo)?.encode?.["node.color"];
        await waitFor(() => {
            for (const id of crowds) {
                assert.deepEqual(session.styles.get(id)?.encode?.["node.color"], rule, "as if set on it alone");
                assert.isUndefined(session.styles.get(id)?.set?.["node.color"]);
            }
        });
        const receipt = await within(await line("node.color")).findByRole("status");
        assert.match(receipt.textContent ?? "", /: 2 changed/);
    });
});
