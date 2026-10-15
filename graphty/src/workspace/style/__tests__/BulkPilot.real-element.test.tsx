/**
 * Bulk editing a run's folder of group layers on the REAL graphty-element, driven by real clicks
 * and keys, after the first pilot walk: a varied fill and shape stay on their groups through a
 * re-run, which names its new groups apart; several selected rows move together and stay
 * selected; a row moves out of a run's folder; a Mixed color takes a color by name; a field every
 * setting row agrees on shows its value; Vary leaves out the layer that holds several groups and
 * says so; a receipt warns before setting a layer that covers every node, names its Undo, and
 * goes with the selection; "+" in bulk writes nothing until a value is picked; group rows show
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
 * Picks the run's group in a field's Vary list and opens the per-layer preview.
 * @param field - The property row.
 * @param name - The field's accessible name, "Node color".
 * @returns The preview.
 */
async function varyByGroup(field: HTMLElement, name: string): Promise<HTMLElement> {
    await userEvent.hover(field);
    await userEvent.click(within(field).getByRole("button", { name: `${name} by attribute` }));
    const options = await screen.findAllByRole("option", { name: /group|community|louvain/i });
    await userEvent.click(options[0]);
    return within(field).findByRole("group", { name: /, in each layer$/ });
}

describe("bulk editing a run's folder of group layers, after the first pilot", () => {
    it("keeps a varied fill and shape on their groups through a re-run, which names new groups apart", async () => {
        const { session, runId } = await openScene();
        await userEvent.click(await row("Louvain"));

        // Fill > Vary > the run's group, with a palette to pick; Apply hands focus to the receipt.
        const fill = await line("node.color");
        const preview = await varyByGroup(fill, "Node color");
        assert.isNotNull(within(preview).getByText("Palette"), "a palette to pick");
        await userEvent.click(within(preview).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.isNotNull(
                document.activeElement?.closest("[data-receipt]"),
                "focus goes to the receipt, not the field's chip",
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
        await userEvent.click(within(await varyByGroup(shape, "Node shape")).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            for (const each of folderRows(session)) {
                const binding = session.styles.get(each.id)?.encode?.["node.shape"];
                assert.isTrue(binding !== undefined && "by" in binding, `${each.name} holds its own shape rule`);
            }
        });
        await session.styles.settled();
        // The key lists the run's groups once per property, not once per layer.
        const legend = screen.getByRole("region", { name: "Legend" });
        assert.lengthOf(within(legend).getAllByRole("group", { name: "Color: Louvain" }), 1);
        assert.lengthOf(within(legend).getAllByRole("group", { name: "Shape: Louvain" }), 1);

        const before = paintedGroups(session);
        const run = session.runs.get(runId);
        await session.runs.start("louvain", { ...run?.params, resolution: 2 }, { as: runId, seed: 1 });
        await session.styles.settled();
        const after = paintedGroups(session);

        let kept = 0;
        for (const [node, was] of before) {
            const now = after.get(node);
            if (now !== undefined && now.layer === was.layer && was.layer !== "") {
                kept += 1;
                assert.equal(now.color, was.color, `node ${node} keeps its group's color`);
                assert.deepEqual(now.shape, was.shape, `node ${node} keeps its group's shape`);
            }
        }
        assert.isAbove(kept, 0, "some nodes stay in their group's layer");
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
        const folder = session.styles.tree().find((each) => each.name === "Louvain");
        const labels = await session.styles.add({
            name: "Top 10 labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "x" },
        });
        await session.styles.moveRow(labels.row ?? labels.id, { parent: folder?.id ?? null, index: 0 });
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
        assert.equal(within(size).getByRole<HTMLInputElement>("combobox", { name: /^Node size/ }).value, "2");
        assert.match(within(size).getByText(/not set: Top 10 labels/).textContent ?? "", /3 layers set size/);

        // The folder: Fill is Mixed; a color typed by name writes to every group that sets one.
        await userEvent.click(await row("Louvain"));
        const fill = await line("node.color");
        assert.equal(
            within(fill).getByRole("button", { name: "Remove node color from every layer" }).tagName,
            "BUTTON",
        );
        const breakdown = within(fill).getByText(/set node color|set color/i);
        assert.equal(getComputedStyle(breakdown).fontSize, "11px", "the breakdown is legible");
        assert.isNotNull(within(fill).getByRole("button", { name: /^Pick Node color/ }), "a swatch to pick from");
        await userEvent.click(within(fill).getByRole("textbox", { name: /^Node color/ }));
        await userEvent.keyboard("blue{Enter}");
        await waitFor(() => {
            for (const each of groups) {
                assert.equal(session.styles.get(each.id)?.set?.["node.color"], "#0000FF", each.name);
            }
        });
        const receipt = await within(fill).findByRole("status");
        assert.match(
            within(receipt).getByText(/covers every node/).textContent ?? "",
            /^Top 10 labels covers every node/,
        );
        assert.isNotNull(within(receipt).getByRole("button", { name: "Undo the color change" }));
        await userEvent.click(within(receipt).getByRole("button", { name: "Undo the color change" }));
        await waitFor(() => {
            assert.notEqual(session.styles.get(groups[0].id)?.set?.["node.color"], "#0000FF");
        });
        // The step goes by what it did: Control+Z says "Undid changing color on 6 layers."
        await userEvent.click(within(await line("node.color")).getByRole("textbox", { name: /^Node color/ }));
        await userEvent.keyboard("teal{Enter}");
        await waitFor(() => {
            assert.equal(session.styles.get(groups[0].id)?.set?.["node.color"], "#008080");
        });
        await userEvent.keyboard("{Escape}{Control>}z{/Control}");
        await waitFor(() => {
            assert.equal(store.get().notice?.message, `Undid changing color on ${String(groups.length)} layers.`);
        });

        // Shape, set by none: Vary is on, and leaves out the layer that holds every group.
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const preview = await varyByGroup(await line("node.shape"), "Node shape");
        assert.match(within(preview).getByText(/^Left as it is:/).textContent ?? "", /Top 10 labels/);
        await userEvent.click(within(preview).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.isUndefined(session.styles.get(labels.id)?.encode?.["node.shape"], "Top 10 labels is left alone");
        });
        assert.isNotNull(await within(await line("node.shape")).findByRole("status"), "a receipt");

        // Another selection: the last one's receipt goes.
        await userEvent.click(await row(groups[1].name));
        await userEvent.click(await row(groups[3].name), { modifiers: ["Control"] });
        await waitFor(() => {
            assert.isNull(document.querySelector("[data-receipt]"), "no receipt from the folder's edit");
        });
    });
});
