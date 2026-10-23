/**
 * Bulk editing a run's folder of group layers on the REAL graphty-element, driven by real clicks
 * and keys, after the first pilot walk: a varied fill and shape are copied into every group layer,
 * and a re-run names its new groups apart; several selected rows move together and stay selected;
 * a row moves out of a run's folder; each group's own color shows at rest, and "One value for all"
 * then a color by name writes them; a field every setting row agrees on shows its value; Vary
 * copies the rule into a layer that holds several groups too; a receipt warns before setting a
 * layer that covers every node, names its Undo, and goes with the selection; "+" in bulk writes nothing until a value is picked; group rows show
 * their color and node count; the key lists a run's groups as one section.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, StyleRow } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { findTreeRow } from "../../graph-place/rows";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables with Louvain's groups as layers in a "Louvain" folder, named as the app names
 * them.
 * @returns The session, the store and the run's id.
 */
async function openScene(): Promise<{ session: GraphSession; store: WorkspaceStore; runId: string }> {
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
    const run = await session.runs.start(
        "louvain",
        {},
        {
            seed: 1,
            style: {
                groups: "layers",
                name: "Louvain",
                groupName: ({ rank, taken }) => {
                    let n = rank;
                    while (taken.includes(`Group ${String(n)}`)) {
                        n += 1;
                    }
                    return `Group ${String(n)}`;
                },
            },
        },
    );
    await session.styles.settled();
    return { session, store, runId: run.runId };
}

/**
 * A hand-made layer that covers every node, "Top 10 labels", put at the top of the run's folder.
 * @param session - The session.
 * @returns The layer.
 */
async function addLabelsToFolder(session: GraphSession): Promise<Layer> {
    const folder = session.styles.tree().find((each) => each.name === "Louvain");
    const labels = await session.styles.add({
        name: "Top 10 labels",
        target: "node",
        selector: { match: "everything" },
        set: { "node.label": "x" },
    });
    await session.styles.moveRow(labels.row ?? labels.id, { parent: folder?.id ?? null, index: 0 });
    return labels;
}

/**
 * The style tree.
 * @returns The tree.
 */
async function tree(): Promise<HTMLElement> {
    return screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
}

/**
 * A row of the style tree by its name.
 * @param name - The row's name.
 * @returns The row.
 */
async function row(name: string): Promise<HTMLElement> {
    return within(await tree()).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * Opens the Louvain folder in the tree from the keyboard, so its rows are drawn.
 */
async function openFolder(): Promise<void> {
    await userEvent.click(await row("Louvain"));
    await userEvent.keyboard("{ArrowRight}");
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
 * The Louvain folder's rows, top first.
 * @param session - The session.
 * @returns The rows.
 */
function folderRows(session: GraphSession): StyleRow[] {
    return [...(session.styles.tree().find((each) => each.name === "Louvain")?.children ?? [])].reverse();
}

/**
 * The group a layer selects, as its rule spells it.
 * @param layer - The layer.
 * @returns The path and the value, or undefined.
 */
function groupOf(layer: Layer | undefined): { path: string; value: string } | undefined {
    const where = layer?.selector.match === "rule" ? layer.selector.where : undefined;
    return where?.kind === "categories" ? { path: where.attribute, value: where.values[0] } : undefined;
}

/**
 * Each node's group layer and what it paints the node: its color and its shape.
 * @param session - The session.
 * @returns Per node id.
 */
function paintedGroups(session: GraphSession): Map<string, { layer: string; color?: string; shape?: unknown }> {
    const layers = session.styles.list().filter((layer) => groupOf(layer) !== undefined);
    return new Map(
        session.data.nodes().map((node) => {
            const id = String(node.id);
            const layer = layers.find((each) => {
                const group = groupOf(each);
                return group !== undefined && String(session.styles.valueAt({ node: id }, group.path)) === group.value;
            });
            const { merged } = session.styles.explain({ node: id });
            return [id, { layer: layer?.id ?? "", color: merged["node.color"]?.hex, shape: merged["node.shape"] }];
        }),
    );
}

/**
 * Picks the run's group as a field's source, which opens the binding popover: from the Vary list,
 * or, when each layer holds its own value, from the pill's popover by Change source.
 * @param field - The property row.
 * @param name - The field's accessible name, "Node color".
 * @returns The popover.
 */
async function varyByGroup(field: HTMLElement, name: string): Promise<HTMLElement> {
    const fromEach = within(field).queryByRole("button", { name: new RegExp(`^${name}: from each layer, `) });
    if (fromEach === null) {
        await userEvent.hover(field);
        await userEvent.click(within(field).getByRole("button", { name: `${name} by attribute` }));
    } else {
        await userEvent.click(fromEach);
        const byLayer = await screen.findByRole("dialog", { name: / from each layer$/ });
        await userEvent.click(within(byLayer).getByRole("button", { name: "Change source" }));
    }
    const options = await screen.findAllByRole("option", { name: /group|community|louvain/i });
    await userEvent.click(options[0]);
    return screen.findByRole("dialog", { name: / by / });
}

describe("bulk editing a run's folder of group layers, after the first pilot", () => {
    it("copies a varied fill and shape into every group layer", async () => {
        const { session } = await openScene();
        await userEvent.click(await row("Louvain"));

        // Fill > Vary > the run's group, with a palette to pick; Escape hands focus back to the
        // field's pill that opened the popover, never to the page.
        const fill = await line("node.color");
        const popover = await varyByGroup(fill, "Node color");
        assert.isNotNull(within(popover).getByText("Palette"), "a palette to pick");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(
                document.activeElement,
                fill.querySelector(".ws-varied button"),
                "focus goes back to the field's pill",
            );
        });

        // Shape: "+" adds it to the panel and writes nothing until a value is picked.
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const shape = await line("node.shape");
        assert.isTrue(
            folderRows(session).every((each) => session.styles.get(each.id)?.set?.["node.shape"] === undefined),
            "adding Shape to several layers writes no shape yet",
        );
        await varyByGroup(shape, "Node shape");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            for (const each of folderRows(session)) {
                const binding = session.styles.get(each.id)?.encode?.["node.shape"];
                assert.isTrue(binding !== undefined && "by" in binding, `${each.name} holds its own shape rule`);
            }
        });
        // Each layer's copy is the very rule one layer would get on its own: no table of its own.
        for (const each of folderRows(session)) {
            const binding = session.styles.get(each.id)?.encode?.["node.color"];
            assert.isTrue(binding !== undefined && "by" in binding && binding.map === undefined, each.name);
        }
    });

    // Its own test, with the rules the Vary steps above write set directly: in one with them it
    // took 16 to 17 s on a busy CI runner, past the 15 s limit (issue #3271).
    it("lists a run's varied groups once per property in the key, each shape drawn as the node", async () => {
        const { session } = await openScene();
        await session.styles.updateMany(
            folderRows(session).map((each) => {
                const layer = session.styles.get(each.id);
                const by = groupOf(layer)?.path ?? "";
                // Vary replaces the group's own color, as the Fill row's Vary does.
                const { "node.color": _ownColor, ...set } = layer?.set ?? {};
                return {
                    id: each.id,
                    patch: {
                        set,
                        encode: {
                            "node.color": { by, scale: "ordinal", overflow: "other" },
                            "node.shape": { by, scale: "ordinal" },
                        },
                    },
                };
            }),
        );
        await session.styles.settled();
        // The key lists the run's groups once per property, not once per layer.
        const legend = screen.getByRole("region", { name: "Legend" });
        assert.lengthOf(within(legend).getAllByRole("group", { name: "Color: Louvain" }), 1);
        assert.lengthOf(within(legend).getAllByRole("group", { name: "Shape: Louvain" }), 1);
        // Each shape row draws the shape beside its name: the picker's glyph at once, then the
        // node itself as graphty-element draws it (its nodeThumbnail).
        const shapeKey = within(legend).getByRole("group", { name: "Shape: Louvain" });
        const icons = within(shapeKey).getAllByTestId("data-row-icon");
        assert.isNotEmpty(icons);
        await waitFor(
            () => {
                for (const icon of icons) {
                    const picture = icon.querySelector<HTMLImageElement>("img[data-node-picture]");
                    assert.match(picture?.src ?? "", /^data:image\/png/, "the node's own picture");
                }
            },
            { timeout: 30_000 },
        );
    });

    // Its own test: in one with the bulk edit above it took 16 to 17 s on a busy CI runner, past
    // the 15 s limit (issue #3271).
    it("a re-run names its new groups apart from the groups it keeps", async () => {
        const { session, runId } = await openScene();
        const before = paintedGroups(session);
        const run = session.runs.get(runId);
        await session.runs.start("louvain", { ...run?.params, resolution: 2 }, { as: runId, seed: 1 });
        await session.styles.settled();
        const after = paintedGroups(session);
        const kept = [...before].filter(([node, was]) => was.layer !== "" && after.get(node)?.layer === was.layer);
        assert.isNotEmpty(kept, "some nodes stay in their group's layer");
        const names = folderRows(session).map((each) => each.name);
        assert.lengthOf(new Set(names), names.length, `no two group layers share a name: ${names.join(", ")}`);
    });

    it("moves several selected rows together, out of a run's folder too, and groups rows into a folder", async () => {
        const { session, store } = await openScene();
        const [first, second, third, fourth] = folderRows(session);
        await openFolder();
        // A group row shows the color its group paints and how many nodes it holds.
        const firstRow = await row(first.name);
        assert.isNotNull(firstRow.querySelector("[data-row-swatch]"), "a color swatch");
        assert.match(firstRow.querySelector(".ws-row-count")?.textContent ?? "", /^\d+$/, "a node count");

        await session.styles.addFolder("Fantine's");
        await userEvent.click(await row(third.name));
        await userEvent.click(await row(fourth.name), { modifiers: ["Shift"] });
        const heading = (): string =>
            screen
                .getAllByRole("heading", { level: 2 })
                .map((each) => each.textContent ?? "")
                .join(" | ");
        await waitFor(() => {
            assert.include(heading(), "2 layers", "the panel counts the layers an edit reaches");
        });
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Move to folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Fantine's" }));
        await waitFor(() => {
            for (const id of [third.id, fourth.id]) {
                assert.equal(findTreeRow(session.styles.tree(), id)?.folders.at(-1)?.name, "Fantine's");
            }
        });
        const { inspected } = store.get();
        assert.equal(inspected?.kind, "rows");
        assert.sameMembers(JSON.parse(inspected?.id ?? "[]") as string[], [third.id, fourth.id], "still selected");

        // A hand-made layer moved into the run's folder, then out of it by the row menu.
        const labels = await session.styles.add({
            name: "Top 10 labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "x" },
        });
        const folder = session.styles.tree().find((each) => each.name === "Louvain");
        await session.styles.moveRow(labels.row ?? labels.id, { parent: folder?.id ?? null, index: 0 });
        await userEvent.click(await row("Top 10 labels"));
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        await userEvent.click(await screen.findByRole("menuitem", { name: "Move to folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Out of Louvain" }));
        await waitFor(() => {
            const found = findTreeRow(session.styles.tree(), labels.row ?? labels.id);
            assert.lengthOf(found?.folders ?? ["?"], 0, "at the top level");
            const top = [...session.styles.tree()].reverse().map((each) => each.name);
            assert.equal(top[top.indexOf("Louvain") - 1], "Top 10 labels", "just above the folder it left");
        });

        // "+ > Layer" with the folder selected lands inside it.
        await userEvent.click(await row("Louvain"));
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await waitFor(() => {
            const id = store.get().inspected?.id ?? "";
            assert.equal(findTreeRow(session.styles.tree(), id)?.folders.at(-1)?.name, "Louvain");
        });
        await userEvent.keyboard("{Escape}");

        // "+ > Folder" with two rows selected puts them in it.
        await userEvent.click(await row(first.name));
        await userEvent.click(await row(second.name), { modifiers: ["Shift"] });
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Folder" }));
        await waitFor(() => {
            for (const id of [first.id, second.id]) {
                assert.equal(findTreeRow(session.styles.tree(), id)?.folders.at(-1)?.name, "New folder");
            }
        });
    });

    it("shows what setting rows agree on, takes a color by name, and warns before covering every node", async () => {
        const { session, store } = await openScene();
        const groups = folderRows(session);
        await addLabelsToFolder(session);
        await session.styles.updateMany(
            groups.slice(0, 3).map((each) => ({
                id: each.id,
                patch: { set: { ...session.styles.get(each.id)?.set, "node.size": 2 } },
            })),
        );
        await session.styles.settled();
        await openFolder();

        // Three groups at size 2 and a layer that sets no size: Size reads 2, and says who is unset.
        await userEvent.click(await row(groups[0].name));
        await userEvent.click(await row(groups[2].name), { modifiers: ["Shift"] });
        await userEvent.click(await row("Top 10 labels"), { modifiers: ["Control"] });
        const size = await line("node.size");
        assert.equal(within(size).getByRole<HTMLInputElement>("spinbutton", { name: /^Node size/ }).value, "2");
        assert.match(within(size).getByText(/not set: Top 10 labels/).textContent ?? "", /3 layers set size/);

        // The folder: Fill shows each group's color; "One value for all", then a color typed by
        // name writes to every group that sets one.
        await userEvent.click(await row("Louvain"));
        const fill = await line("node.color");
        assert.equal(
            within(fill).getByRole("button", { name: "Remove node color from every layer" }).tagName,
            "BUTTON",
        );
        const breakdown = within(fill).getByText(/^Not set: Top 10 labels$/);
        assert.equal(getComputedStyle(breakdown).fontSize, "11px", "the breakdown is legible");
        assert.lengthOf(
            fill.querySelectorAll("[data-varied-line] .ws-varied-chit"),
            groups.length <= 6 ? groups.length : 5,
        );
        await userEvent.hover(fill);
        await userEvent.click(within(fill).getByRole("button", { name: /^Give all \d+ layers one node color$/ }));
        assert.isNotNull(
            await within(fill).findByRole("button", { name: /^Pick node color/ }),
            "a swatch to pick from",
        );
        await userEvent.click(within(fill).getByRole("textbox", { name: /^Node color/ }));
        await userEvent.keyboard("blue{Enter}");
        await waitFor(() => {
            for (const each of groups) {
                assert.equal(session.styles.get(each.id)?.set?.["node.color"], "#0000FF", each.name);
            }
        });
        const receipt = await waitFor(() => {
            const found = fill.querySelector<HTMLElement>("[data-receipt]");
            assert.isNotNull(found, "the receipt is drawn");
            return found;
        });
        assert.match(
            within(receipt).getByText(/covers every node/).textContent ?? "",
            /^Top 10 labels covers every node/,
        );
        assert.isNotNull(within(receipt).getByRole("button", { name: "Undo the color change" }));
        await userEvent.click(within(receipt).getByRole("button", { name: "Undo the color change" }));
        await waitFor(() => {
            assert.notEqual(session.styles.get(groups[0].id)?.set?.["node.color"], "#0000FF");
        });
        // The step goes by what it did: Control+Z says "Undid changing node color on 6 layers."
        await userEvent.click(within(await line("node.color")).getByRole("textbox", { name: /^Node color/ }));
        await userEvent.keyboard("teal{Enter}");
        await waitFor(() => {
            assert.equal(session.styles.get(groups[0].id)?.set?.["node.color"], "#008080");
        });
        await userEvent.keyboard("{Escape}{Control>}z{/Control}");
        await waitFor(() => {
            assert.equal(store.get().notice?.message, `Undid changing node color on ${String(groups.length)} layers.`);
        });
    });

    // Its own test: in one with the color edits above it took 15 to 17 s on a busy CI runner, past
    // the 15 s limit (issue #3271).
    it("varies a shape into a layer that holds every group too, and its receipt goes with the selection", async () => {
        const { session } = await openScene();
        const groups = folderRows(session);
        const labels = await addLabelsToFolder(session);
        await openFolder();
        await userEvent.click(await row("Louvain"));

        // Shape, set by none: Vary copies the rule into every layer, the one holding every group too.
        // A "+" with one thing left adds it at once; with more, it opens a menu.
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        const shapeItem = await waitFor(() => {
            const found = screen.queryByRole("menuitem", { name: "Shape" });
            assert.isTrue(found !== null || tab.querySelector('.ws-row[data-line="node.shape"]') !== null);
            return found;
        });
        if (shapeItem !== null) {
            await userEvent.click(shapeItem);
        }
        await varyByGroup(await line("node.shape"), "Node shape");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            const binding = session.styles.get(labels.id)?.encode?.["node.shape"];
            assert.isTrue(binding !== undefined && "by" in binding, "Top 10 labels holds its own copy");
        });
        const atNodeShape = await line("node.shape");
        const shapeReceipt = await waitFor(() => {
            const found = atNodeShape.querySelector<HTMLElement>("[data-receipt]");
            assert.isNotNull(found, "the receipt is drawn");
            return found;
        });
        assert.notMatch(shapeReceipt.textContent ?? "", /more than one group/);

        // Another selection: the last one's receipt goes.
        await userEvent.click(await row(groups[1].name));
        await userEvent.click(await row(groups[3].name), { modifiers: ["Control"] });
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-receipt]"), "no receipt from the folder's edit");
        });
    });
});
