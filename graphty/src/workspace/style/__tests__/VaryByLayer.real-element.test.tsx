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
import { fieldName, valueWords } from "../words";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** Layout steps taken before the first frame is drawn, so the layout is at rest when it is. */
const PRE_STEPS = 1000;

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
    // The force layout settles before the first frame: these tests are about the Style panel, not
    // the layout, and a layout left to settle on screen draws a frame per step. On a software GPU
    // each frame holds the page's main thread until it is read back (hundreds of milliseconds on
    // a busy machine), the layout keeps to the clock so it draws on through the whole test, and
    // every click waits behind those frames (issue #4239).
    await session.config.set({ layoutBehavior: { preSteps: PRE_STEPS } });
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
    // One step and one repaint for the whole folder, as a project file loads it.
    await session.transaction(`add ${name}`, async (tx) => {
        // Dispatched together, not awaited one by one: each await lets a repaint pass and a
        // style:changed event run, and the panels re-read the whole stack on every one of them.
        const layers = await Promise.all(
            names.map((layerName, at) =>
                tx.styles.add({
                    name: `${name} ${layerName}`,
                    target,
                    selector:
                        target === "node"
                            ? {
                                  match: "ids",
                                  nodes: ids.slice((at * 2) % (ids.length - 1), ((at * 2) % (ids.length - 1)) + 2),
                              }
                            : {
                                  match: "rule",
                                  where: { kind: "range", attribute: "data.value", min: at + 1, max: at + 1 },
                              },
                    set,
                }),
            ),
        );
        await Promise.all(layers.map((layer) => tx.styles.moveRow(layer.id, { parent: folder.id })));
    });
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
    await screen.findByRole("dialog", { name: / by attribute$/ });
    await userEvent.click(await screen.findByRole("option", { name: /^Each layer's own value/ }));
    const popover = await screen.findByRole("dialog", { name: / from each layer$/ });
    // The source line sets Layer off as the field does: the marks drawn, the word spoken.
    const token = await waitFor(() => {
        const found = popover.querySelector<HTMLElement>("[data-layer-source]");
        assert.isNotNull(found);
        return found;
    });
    assert.strictEqual(token?.textContent, "\u00ABLayer\u00BB");
    assert.lengthOf(token?.querySelectorAll("[aria-hidden]") ?? [], 2, "the guillemets are not spoken");
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
                    // A field's name goes on to say its state ("Palette, not set, ..."): only its
                    // first part is structure.
                    const field = words.split(", ")[0];
                    return `${field}: ${control?.getAttribute("role") ?? control?.tagName.toLowerCase() ?? "none"}`;
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
 * What a bound field shows at rest: its strip, its pill's name and the line under it -- the
 * line's chits, its "+N" and its words.
 * @param row - The property row.
 * @returns What it shows.
 */
function atRest(row: HTMLElement): {
    readonly name: Element | null;
    readonly strip: HTMLElement | null;
    readonly chits: HTMLElement[];
    readonly more: string | null;
    readonly words: string;
} {
    const varied = row.querySelector(".ws-varied");
    assert.isNotNull(varied, "drawn as a bound field");
    const lineOf = varied?.querySelector("[data-varied-line]");
    assert.isNotNull(lineOf, "with its line under the pill");
    return {
        name: varied?.querySelector(".cm-var-name, .cm-var-pill") ?? null,
        strip: varied?.querySelector<HTMLElement>(".cm-var-chit") ?? null,
        chits: [...(lineOf?.querySelectorAll<HTMLElement>(".ws-varied-chit") ?? [])],
        more: lineOf?.querySelector("[data-more]")?.textContent ?? null,
        words: lineOf?.textContent ?? "",
    };
}

/**
 * The colors a strip draws, in order, and whether its stops are hard (groups) or smooth (a ramp).
 * @param strip - The strip.
 * @returns Its colors as rgb(), and whether every stop is hard.
 */
function stopsOf(strip: HTMLElement | null): { readonly colors: string[]; readonly hard: boolean } {
    const image = strip === null ? "" : getComputedStyle(strip).backgroundImage;
    const colors = [...image.matchAll(/rgba?\([^)]*\)/g)].map((m) => m[0]);
    // A hard stop repeats its color at its two ends: keep each once.
    return { colors: colors.filter((c, at) => c !== colors[at - 1]), hard: image.includes("%") };
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

        // Twelve layers take the first group palette with twelve colors, never one of eight extended
        // past its end (which drew near-identical oranges).
        const palette = session.catalog
            .palettes()
            .find((p) => p.kind === "categorical" && p.colors.length >= groups.length);
        if (palette === undefined) {
            throw new Error("the catalog has no palette of twelve colors");
        }
        await waitFor(() => {
            const colors = written(session, groups, "node.color");
            assert.deepEqual(
                colors,
                palette.colors.slice(0, groups.length).map((c) => c.slice(0, 7).toUpperCase()),
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
            assert.isNull((await line("node.color")).querySelector("[data-receipt]"));
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
        await userEvent.click(within(panel).getByLabelText(/^Layer Story Second shape, /));
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
        // Each change shows on the drawing as it is made, while the popover is open.
        await waitFor(() => {
            assert.notDeepEqual(written(session, layers, "node.shape"), before, "written while it is open");
            assert.strictEqual(written(session, layers, "node.shape")[1], "cylinder");
        });
        const steps = session.history.position;
        await close(panel);

        await waitFor(() => {
            assert.deepEqual(
                written(session, layers, "node.shape"),
                [OVERFLOW_SHAPES[0], "cylinder", OVERFLOW_SHAPES[2]],
                "the distinct shapes first, and the row's own pick",
            );
        });
        assert.strictEqual(session.history.position, steps, "the open's writes are one undo step");
    });

    it.each([true, false])(
        "opens a clicked '+' menu, and ArrowDown then Enter adds its first item (several layers: %s)",
        async (many) => {
            const session = await openSample();
            // A color, not a size: Shape's "+" then has Shape and Size to offer, so it opens a menu.
            for (const name of ["Story One", "Story Two"]) {
                await session.styles.add({
                    name,
                    target: "node",
                    selector: { match: "ids", nodes: ["0"] },
                    set: { "node.color": "#E8590C" },
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
            // Opened by a click, the menu itself has focus and no row is highlighted (Figma).
            await waitFor(() => {
                assert.strictEqual(document.activeElement, screen.getByRole("menu"), "the menu is focused on open");
            });
            await userEvent.keyboard("{ArrowDown}");
            await waitFor(() => {
                assert.strictEqual(document.activeElement, first, "ArrowDown reaches the first item");
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
        await userEvent.click(within(panel).getByLabelText("Size from"));
        await userEvent.keyboard("{Control>}a{/Control}1{Enter}");
        await userEvent.click(within(panel).getByLabelText("Size to"));
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
        // Louvain's groups here are fewer than the palette's colors: neither offers the overflow.
        assert.notInclude(fromData, "More <groups> than colors: combobox", "said only when true");
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

        // Each group layer holds its own color: the pill opens by Layer, and Change source picks the field.
        const fill = await line("node.color");
        await userEvent.click(within(fill).getByRole("button", { name: /^Node color: from each layer, / }));
        const byLayer = await screen.findByRole("dialog", { name: "Color from each layer" });
        await userEvent.click(within(byLayer).getByRole("button", { name: "Change source" }));
        await userEvent.click(await screen.findByRole("option", { name: /^Node id\b/ }));
        const popover = await screen.findByRole("dialog", { name: /^Color by / });
        await within(popover).findByRole("grid", { name: /groups$/ });
        assert.isNull(within(fill).queryByRole("group", { name: /in each layer/ }), "no per-layer preview");
        assert.include(sections(popover), "More <groups> than colors: combobox", "the single layer's sections");
        // The source picked is written at once, so the drawing shows it while the popover is open.
        await waitFor(() => {
            assert.notDeepEqual(written(session, groups, "node.color"), before, "written while it is open");
        });

        await close(popover);
        await waitFor(() => {
            for (const id of groups) {
                const binding = session.styles.get(id)?.encode?.["node.color"];
                assert.isTrue(binding !== undefined && "by" in binding, "each layer holds its own copy");
            }
        });
        const atNodeColor = await line("node.color");
        await waitFor(() => {
            const found = atNodeColor.querySelector<HTMLElement>("[data-receipt]");
            assert.isNotNull(found, "the receipt is drawn");
            return found;
        });
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
    ] as const)("draws each layer's own %s at rest as a field bound to Layer, %i layers", async (channel, n) => {
        const session = await openSample();
        const values = valuesFor(channel, n);
        assert.lengthOf(values, n);
        const layers = await eachOwn(session, "Own", channel, values);
        await clickRow("Own");
        const descriptor = channelsFor("node").find((c) => c.channel === channel);
        if (descriptor === undefined) {
            throw new Error(`no ${channel}`);
        }

        const row = await line(channel);
        const { name, chits, more, words } = atRest(row);
        assert.strictEqual(name?.textContent, "\u00ABLayer\u00BB", "Layer, set off, where the source's name goes");
        assert.strictEqual(name?.getAttribute("data-tone"), "component");
        const kind = channel === "node.color" ? "colors" : "values";
        within(row).getByRole("button", {
            // Then each layer's value, by the layer's name.
            name: new RegExp(`^${fieldName(channel)}: from each layer, ${String(n)} layers, ${String(n)} ${kind}: `),
        });
        assert.notInclude(row.textContent ?? "", "Mixed");
        assert.isNull(row.querySelector("[data-breakdown]"), "every layer sets it: no breakdown");
        if (channel === "node.color") {
            const drawn = n <= 6 ? n : 5;
            assert.lengthOf(chits, drawn, "every chit up to 6, else the first 5");
            assert.strictEqual(more, n <= 6 ? null : `+${String(n - 5)}`);
            for (const [at, chit] of chits.entries()) {
                assert.strictEqual(
                    chit.dataset.name,
                    session.styles.get(layers[at])?.name,
                    "in layer order, top first",
                );
                assert.strictEqual(getComputedStyle(chit).backgroundColor, rgbOf(String(values[at])));
            }
            // The line is one row inside the field: nothing wraps, nothing is clipped.
            const box = row.querySelector(".ws-field-control")?.getBoundingClientRect();
            const tops = new Set(chits.map((chit) => Math.round(chit.getBoundingClientRect().top)));
            assert.strictEqual(tops.size, 1, "one row");
            for (const each of [...chits, ...row.querySelectorAll("[data-varied-line] [data-more]")]) {
                assert.isTrue(box !== undefined && each.getBoundingClientRect().right <= box.right, "inside the field");
            }
        } else {
            // Not a color: the first 3 values in words, then "+N".
            const first = values.slice(0, 3).map((value) => valueWords(descriptor, value));
            assert.strictEqual(words, `${first.join(", ")}${n > 3 ? ` +${String(n - 3)}` : ""}`);
        }

        // A click opens all of them, by Layer.
        await userEvent.click(within(row).getByRole("button", { name: /^Node \w+: / }));
        const popover = await screen.findByRole("dialog", { name: / from each layer$/ });
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
            return screen.findByRole("dialog", { name: / from each layer$/ });
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

    it("recolors every row from a palette picked by Layer, as a palette repaints one layer's groups", async () => {
        const session = await openSample();
        const values = ["#111111", "#222222", "#333333"];
        const layers = await eachOwn(session, "Own", "node.color", values);
        await clickRow("Own");
        await userEvent.click(within(await line("node.color")).getByRole("button", { name: /^Node color: / }));
        const popover = await screen.findByRole("dialog", { name: / from each layer$/ });
        const palette = within(popover).getByRole<HTMLInputElement>("combobox", { name: "Palette" });
        const shown = palette.value;
        await userEvent.click(palette);
        const option = (await screen.findAllByRole("option")).find((o) => o.textContent !== shown);
        if (option === undefined) {
            throw new Error("no other palette");
        }
        await userEvent.click(option);
        await close(popover);
        await waitFor(() => {
            const now = written(session, layers, "node.color").map((v) => String(v).toLowerCase());
            for (const [at, value] of now.entries()) {
                assert.notStrictEqual(value, values[at], "each row took the palette's color");
            }
            assert.lengthOf(new Set(now), 3, "three colors apart");
        });
    });

    it("counts only the layer edited, on a run's group layers whose colors are written in lower case", async () => {
        const session = await openSample();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        await clickRow("Louvain");
        await userEvent.click(within(await line("node.color")).getByRole("button", { name: /^Node color: / }));
        const popover = await screen.findByRole("dialog", { name: / from each layer$/ });
        await userEvent.click(within(popover).getAllByRole("button", { name: /^Layer .* color/ })[1]);
        const picker = await screen.findByRole("dialog", { name: "Color" });
        // Enter applies the value and keeps the picker open (Figma); Escape closes it, then the popover.
        await userEvent.click(within(picker).getByRole("textbox", { name: "Color value" }));
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
        const popover = await screen.findByRole("dialog", { name: / from each layer$/ });
        const second = session.styles.get(layers[1])?.name ?? "";
        await userEvent.click(within(popover).getByRole("button", { name: new RegExp(`^Layer ${second} color`) }));
        const picker = await screen.findByRole("dialog", { name: "Color" });
        // The picker opens focused on itself (Figma); the reader clicks into the value box, and Tab
        // out of it applies the value and leaves the picker open.
        await userEvent.click(within(picker).getByRole("textbox", { name: "Color value" }));
        await userEvent.keyboard("{Control>}a{/Control}000000{Tab}");
        assert.isTrue(picker.isConnected, "the picker is still open");
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
            const options = await screen.findAllByRole("option", { name: /^Degree(,|$)/ });
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
        const atNodeColor = await line("node.color");
        const receipt = await waitFor(() => {
            const found = atNodeColor.querySelector<HTMLElement>("[data-receipt]");
            assert.isNotNull(found, "the receipt is drawn");
            return found;
        });
        assert.match(receipt.textContent ?? "", /: 2 changed/);
    });
});

/**
 * Distinct colors, as many as asked, one per layer.
 * @param n - How many.
 * @returns The colors.
 */
function manyColors(n: number): string[] {
    return Array.from(
        { length: n },
        (_, at) => `#${(((at + 1) * 0x050f1d) % 0x1000000).toString(16).padStart(6, "0").toUpperCase()}`,
    );
}

/**
 * Les Miserables with Louvain run, and its layer that colors nodes by the community selected.
 * @returns The session and the layer.
 */
async function louvainSelected(): Promise<{ readonly session: GraphSession; readonly layerId: string }> {
    const session = await openSample();
    const run = session.runs.start("louvain", {}, { seed: 1 });
    await run;
    await session.styles.settled();
    const louvain = session.styles
        .list()
        .find((l) => session.runs.bindings(run.id).includes(l.id) && l.encode?.["node.color"] !== undefined);
    if (louvain === undefined) {
        throw new Error("Louvain colored no layer");
    }
    const name = session.styles.tree().find((row) => row.id === (louvain.row ?? louvain.id))?.name ?? "";
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(within(tree).getByRole("treeitem", { name: (n) => n.startsWith(`${name}, `) }));
    return { session, layerId: louvain.id };
}

describe("color sets from 2 to dozens", () => {
    it.each([
        [2, 2],
        [3, 3],
        [6, 4],
        [40, 4],
    ] as const)("draws hard stops in the strip for %i colors: the first %i", async (n, stops) => {
        const session = await openSample();
        const colors = manyColors(n);
        await eachOwn(session, `Set${String(n)}`, "node.color", colors);
        await clickRow(`Set${String(n)}`);
        const { strip } = atRest(await line("node.color"));
        const drawn = stopsOf(strip);
        assert.isTrue(drawn.hard, `${String(n)} colors: hard stops`);
        assert.deepEqual(
            drawn.colors,
            colors.slice(0, stops).map(rgbOf),
            `${String(n)} colors: the first in list order`,
        );
        assert.strictEqual(strip?.getBoundingClientRect().width, 24, "a 24 px strip");
    });

    it("draws a ramp as a gradient", async () => {
        const session = await openSample();
        // One layer bound to Degree: a smooth ramp, and its ends under it.
        await session.runs.start("degree");
        const ramp = await session.styles.add({
            name: "Ramp",
            target: "node",
            selector: { match: "ids", nodes: session.data.nodes().map((node) => String(node.id)) },
            set: { "node.color": "#CCCCCC" },
        });
        await session.styles.settled();
        await clickRow("Ramp");
        const fill = await line("node.color");
        await userEvent.hover(fill);
        await userEvent.click(within(fill).getByRole("button", { name: "Node color by attribute" }));
        await userEvent.click((await screen.findAllByRole("option", { name: /^Degree(,|$)/ }))[0]);
        await waitFor(() => {
            assert.isDefined(session.styles.get(ramp.id)?.encode?.["node.color"]);
        });
        if (screen.queryByRole("dialog", { name: /^Color by / }) !== null) {
            await userEvent.keyboard("{Escape}");
        }
        const bound = await line("node.color");
        await waitFor(() => {
            const { strip } = atRest(bound);
            const drawn = stopsOf(strip);
            assert.isFalse(drawn.hard, "a ramp is smooth");
            assert.isAbove(drawn.colors.length, 1);
        });
        within(bound).getByRole("button", { name: /^Node color: Degree, \d+ to \d+, / });
        assert.lengthOf(bound.querySelectorAll("[data-varied-line] .ws-varied-ends span"), 2, "the ramp's two ends");
    });

    // 38, not 40: each layer paints two of the sample's 77 nodes, so a 39th would land on the
    // first layer's nodes, painted over everywhere, and the line leaves such a layer out.
    it.each([
        [6, 6, null],
        [7, 5, "+2"],
        [38, 5, "+33"],
    ] as const)("draws every chit up to 6, else the first 5 and +N, never +1: %i colors", async (n, chits, more) => {
        const session = await openSample();
        await eachOwn(session, `Line${String(n)}`, "node.color", manyColors(n));
        await clickRow(`Line${String(n)}`);
        const row = await line("node.color");
        const shown = atRest(row);
        assert.lengthOf(shown.chits, chits, `${String(n)} colors`);
        assert.strictEqual(shown.more, more, `${String(n)} colors`);
        assert.notInclude(shown.words, "+1");
        within(row).getByRole("button", {
            name: new RegExp(`^Node color: from each layer, ${String(n)} layers, ${String(n)} colors: `),
        });
    });

    it("extends the palette shown, not a ramp, when 35 numbered groups go past it", async () => {
        const session = await openSample();
        const run = session.runs.start("hierarchical-clustering", { clusters: 35 });
        await run;
        await session.styles.settled();
        const layer = session.styles
            .list()
            .find((l) => session.runs.bindings(run.id).includes(l.id) && l.encode?.["node.color"] !== undefined);
        if (layer === undefined) {
            throw new Error("the run colored no layer");
        }
        const name = session.styles.tree().find((r) => r.id === (layer.row ?? layer.id))?.name ?? "";
        const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
        await userEvent.click(within(tree).getByRole("treeitem", { name: (n) => n.startsWith(`${name}, `) }));
        const row = await line("node.color");
        await userEvent.click(within(row).getByRole("button", { name: /^Node color: / }));
        const popover = await screen.findByRole("dialog", { name: /^Color by / });
        // Not set: the palette is the one the element paints with, named last ("Palette, not set, <name>").
        const palette = within(popover).getByRole<HTMLInputElement>("combobox", { name: /^Palette, not set, / });
        const shown = (palette.getAttribute("aria-label") ?? "").split(", ").at(-1) ?? "";
        await userEvent.click(within(popover).getByRole("combobox", { name: /^More values than colors/ }));
        await userEvent.click(await screen.findByRole("option", { name: "Extend the palette" }));
        await close(popover);
        await waitFor(() => {
            const block = session.styles.legendOf(layer.id).find((b) => b.channel === "node.color");
            assert.strictEqual(block?.kind, "categorical", "still one color per group, not a ramp");
            const { chits, more } = atRest(row);
            assert.lengthOf(chits, 5);
            assert.match(more ?? "", /^\+\d+$/);
        });
        within(row).getByRole("button", { name: new RegExp(`${shown}: `) });
    });

    it("draws the lumped Other chit last, uncounted, with its note", async () => {
        const { session, layerId } = await louvainSelected();
        const binding = session.styles.get(layerId)?.encode?.["node.color"];
        const by = binding !== undefined && "by" in binding ? binding.by : "";
        await session.styles.setFoldBelow(layerId, by, 12);
        await session.styles.settled();
        const block = session.styles.legendOf(layerId).find((b) => b.channel === "node.color");
        const other = block?.swatches.find((s) => s.role === "other");
        assert.isDefined(other, "groups under 12 nodes are lumped into Other");
        const groups = (block?.swatches.length ?? 1) - 1 + (block?.overflow?.hidden ?? 0);
        const row = await line("node.color");
        await waitFor(() => {
            const { chits, more } = atRest(row);
            const last = chits.at(-1);
            assert.isTrue(last?.hasAttribute("data-other"), "Other is the last chit");
            assert.strictEqual(last?.style.background, rgbOf(other?.color ?? "#000000"));
            assert.lengthOf(chits, (groups <= 6 ? groups : 5) + 1, "Other is not counted in +N");
            assert.strictEqual(more, groups <= 6 ? null : `+${String(groups - 5)}`);
        });
        assert.isAbove(row.querySelectorAll("[data-varied-note]").length, 0, "the lumped note stays");
    });

    it("draws one layer bound to Louvain and the same colors from each layer alike, but for the Layer token", async () => {
        const { session, layerId } = await louvainSelected();
        // Read at once: selecting another row draws a new field.
        const drawnOf = (shown: ReturnType<typeof atRest>): unknown => ({
            strip: stopsOf(shown.strip),
            chits: shown.chits.map((c) => getComputedStyle(c).backgroundColor),
            more: shown.more,
            tone: shown.name?.getAttribute("data-tone") ?? null,
        });
        const single = drawnOf(atRest(await line("node.color")));
        const block = session.styles.legendOf(layerId).find((b) => b.channel === "node.color");
        const colors = (block?.swatches ?? []).filter((s) => s.role !== "other").map((s) => s.color ?? "");
        assert.isAbove(colors.length, 1);
        const pillOf = async (): Promise<string> =>
            (await line("node.color")).querySelector(".ws-varied")?.firstElementChild?.className ?? "";
        const singlePill = await pillOf();

        await eachOwn(
            session,
            "Same",
            "node.color",
            colors.map((c) => c.toUpperCase()),
        );
        await clickRow("Same");
        const bulk = drawnOf(atRest(await line("node.color")));
        assert.strictEqual(await pillOf(), singlePill, "the same pill");
        // The same strip, chits and +N; only the token's tone differs.
        assert.deepEqual(bulk, { ...(single as object), tone: "component" });
        assert.propertyVal(single, "tone", null, "a data source is drawn plain");
        assert.isNull(document.querySelector(".ws-spread, [data-spread]"), "no second drawing anywhere");
    });

    it("names the bulk pill with its counts and its layers by name", async () => {
        const session = await openSample();
        const colors = TWELVE_COLORS.slice(0, 7);
        const layers = await eachOwn(session, "Named", "node.color", colors);
        await clickRow("Named");
        const row = await line("node.color");
        const pill = within(row).getByRole("button", { name: /^Node color: from each layer, 7 layers, 7 colors: / });
        const named = pill.getAttribute("aria-label") ?? "";
        const names = layers.map((id) => session.styles.get(id)?.name ?? "");
        for (const name of names.slice(0, 5)) {
            assert.include(named, name, "each drawn layer by name");
        }
        assert.match(named, / and 2 more$/);
        assert.isTrue(row.querySelector("[data-varied-line]")?.getAttribute("aria-hidden") === "true");
        assert.isTrue(atRest(row).strip?.getAttribute("aria-hidden") === "true");
    });

    it("opens from the keyboard on each layer's value, and Escape closes it on the pill, writing nothing", async () => {
        const session = await openSample();
        const colors = TWELVE_COLORS.slice(0, 3);
        const layers = await eachOwn(session, "Keys", "node.color", colors);
        await clickRow("Keys");
        const row = await line("node.color");
        const pill = within(row).getByRole("button", { name: /^Node color: from each layer, / });
        for (let tab = 0; tab < 60 && document.activeElement !== pill; tab += 1) {
            await userEvent.keyboard("{Tab}");
        }
        assert.strictEqual(document.activeElement, pill, "Tab reaches the pill");
        await userEvent.keyboard("{Enter}");
        const popover = await screen.findByRole("dialog", { name: "Color from each layer" });
        for (const [at, id] of layers.entries()) {
            const chip = within(popover).getByRole("button", {
                name: new RegExp(`^Layer ${session.styles.get(id)?.name ?? ""} color`),
            });
            const painted = [chip, ...chip.querySelectorAll("*")].some(
                (el) => getComputedStyle(el).backgroundColor === rgbOf(colors[at]),
            );
            assert.isTrue(painted, "each row starts on its layer's color");
        }
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isFalse(popover.isConnected);
        });
        await waitFor(() => {
            const again = within(row).getByRole("button", { name: /^Node color: from each layer, / });
            assert.strictEqual(document.activeElement, again, "focus is back on the pill");
        });
        assert.deepEqual(written(session, layers, "node.color"), colors, "nothing written");
        assert.isNull(row.querySelector("[data-receipt]"), "no receipt");
    });
});
