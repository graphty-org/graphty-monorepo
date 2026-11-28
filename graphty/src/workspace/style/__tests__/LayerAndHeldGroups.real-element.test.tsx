/**
 * The group rows of the two sources other than one layer's data value, on the REAL graphty-element
 * with real clicks and keys. By Layer (a folder's layers, each one group): a row has no detail, so a
 * click opens nothing; F2 then Enter with the name unchanged, or emptied,
 * renames nothing; two picked rows offer Select these alone and select both layers' nodes. A data field held across a
 * folder's layers: a row's eye hides the group and shows it again, and closing writes the hidden
 * group into every layer; F2 then Enter with the name unchanged labels nothing.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { type Locator, page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withoutFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The Style panel the app shows with file styles off, as VaryByLayer.real-element.test.tsx drives it.
withoutFeatures(["file-styles"]);

/**
 * Les Miserables in the workspace, its layout at rest before the first frame is drawn (#4239).
 * @returns The session.
 */
async function lesMis(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Groups", id: 1 } })} />);
    const session = await waitFor(() => {
        const element = document.querySelector("graphty-element");
        assert.isDefined(element?.session);
        return element?.session;
    });
    if (session === undefined) {
        throw new Error("no session");
    }
    await session.config.set({ layoutBehavior: { preSteps: 1000 } });
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * Clicks a row of the style tree.
 * @param name - The row's name.
 */
async function pickTreeRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(page.elementLocator(tree).getByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

/**
 * The Fill row of the Style tab.
 * @returns The row.
 */
async function fillRow(): Promise<HTMLElement> {
    const tab = await screen.findByTestId("style-tab");
    return waitFor(() => {
        const row = tab.querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
        assert.isNotNull(row);
        return row;
    });
}

/**
 * The data rows of a popover's group grid, top first.
 * @param popover - The popover.
 * @returns The rows.
 */
function rowsOf(popover: HTMLElement): HTMLElement[] {
    const grid = within(popover).getByRole("grid", { name: /groups$/ });
    return within(grid)
        .getAllByRole("row")
        .filter((row) => row.querySelector("[role=gridcell]") !== null);
}

/**
 * A row's name as it shows it.
 * @param row - The row.
 * @returns The name.
 */
function shownName(row: HTMLElement): string {
    return row.querySelector("[data-group-name]")?.firstChild?.textContent ?? "";
}

/**
 * F2 on the first row, then Enter on its name box, emptied first or left as it is.
 * @param popover - The popover.
 * @param edit - "clear" empties the box first; "" leaves it.
 */
async function renameFirst(popover: HTMLElement, edit: string): Promise<void> {
    rowsOf(popover)[0].querySelector<HTMLElement>("[role=gridcell]")?.focus();
    await userEvent.keyboard("{F2}");
    const box = (): Locator => page.elementLocator(popover).getByRole("textbox", { name: /^Name of / });
    if (edit !== "") {
        await userEvent.clear(box());
    }
    await userEvent.type(box(), "{Enter}");
    await waitFor(() => {
        assert.isNull(within(popover).queryByRole("textbox", { name: /^Name of / }));
    });
}

describe("group rows by Layer and held across layers", () => {
    it("by Layer: a click opens nothing, an unchanged or empty name renames nothing, two picked rows select both layers", async () => {
        const session = await lesMis();
        const folder = await session.styles.addFolder("Story");
        const ids = session.data.nodes().map((node) => String(node.id));
        await session.transaction("add Story", async (tx) => {
            const layers = await Promise.all(
                ["One", "Two", "Three"].map((name, at) =>
                    tx.styles.add({
                        name: `Story ${name}`,
                        target: "node",
                        selector: { match: "ids", nodes: ids.slice(at * 2, at * 2 + 2) },
                        set: { "node.color": "#cccccc" },
                    }),
                ),
            );
            await Promise.all(layers.map((layer) => tx.styles.moveRow(layer.id, { parent: folder.id })));
        });
        await session.styles.settled();
        const names = (): string[] =>
            (session.styles.tree().find((row) => row.name === "Story")?.children ?? []).map((row) => row.name);
        const before = names();
        await pickTreeRow("Story");

        const fill = await fillRow();
        await userEvent.hover(fill);
        await userEvent.click(page.elementLocator(fill).getByRole("button", { name: / by attribute$/ }));
        await userEvent.click(page.getByRole("option", { name: /^Each layer's own value/ }));
        const popover = await screen.findByRole("dialog", { name: / from each layer$/ });
        await within(popover).findByRole("grid", { name: /groups$/ });

        // A layer is a group with no detail: a click on its row leaves the list as it was.
        const [first] = rowsOf(popover);
        const firstName = first.querySelector<HTMLElement>("[data-group-name]");
        assert.isNotNull(firstName);
        await userEvent.click(page.elementLocator(first).getByCss("[data-group-name]").first());
        assert.isNull(screen.queryByRole("group", { name: / properties$/ }), "no detail opens");
        assert.lengthOf(rowsOf(popover), 3, "the list stays");

        // Enter on the name unchanged, then emptied: the layer keeps its name.
        await renameFirst(popover, "");
        await renameFirst(popover, "clear");
        assert.deepEqual(names(), before, "no layer renamed");

        // Shift+ArrowDown picks two: Select these, and no Set properties, selects both layers' nodes.
        rowsOf(popover)[0].querySelector<HTMLElement>("[role=gridcell]")?.focus();
        await userEvent.keyboard("{Shift>}{ArrowDown}{/Shift}");
        await within(popover).findByRole("button", { name: "Select these" });
        assert.isNull(within(popover).queryByRole("button", { name: /^Set properties for / }), "a layer has none");
        await userEvent.click(page.elementLocator(popover).getByRole("button", { name: "Select these", exact: true }));
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 4, "two layers of two characters each");
        });
    });

    it("a field held across a folder's layers: the eye hides a group and shows it again; closing writes it hidden", async () => {
        const session = await lesMis();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        const folder = session.styles.tree().find((row) => row.name === "Louvain");
        const layers = [...session.styles.layersUnder([folder?.id ?? ""])].map(
            (reach) => session.styles.parts(reach.row)?.node ?? reach.row,
        );
        await pickTreeRow("Louvain");

        // Each group layer holds its own color; Change source picks a field, held until close.
        const fill = await fillRow();
        await userEvent.click(
            page.elementLocator(fill).getByRole("button", { name: /^Node color: from each layer, / }),
        );
        const byLayer = await screen.findByRole("dialog", { name: "Color from each layer" });
        await userEvent.click(page.elementLocator(byLayer).getByRole("button", { name: "Change source", exact: true }));
        await userEvent.click(page.getByRole("option", { name: /^Node id\b/ }));
        const popover = await screen.findByRole("dialog", { name: /^Color by / });
        await within(popover).findByRole("grid", { name: /groups$/ });

        // F2 then Enter with the name unchanged labels nothing.
        const name = shownName(rowsOf(popover)[0]);
        await renameFirst(popover, "");
        assert.equal(shownName(rowsOf(popover)[0]), name);

        // The eye hides the group, then shows it again.
        const eye = (): HTMLElement => within(rowsOf(popover)[0]).getByRole("button", { name: /^Hide / });
        await userEvent.click(eye());
        await waitFor(() => {
            assert.equal(eye().getAttribute("aria-pressed"), "true", "hidden");
        });
        await userEvent.click(eye());
        await waitFor(() => {
            assert.equal(eye().getAttribute("aria-pressed"), "false", "shown again");
        });
        await userEvent.click(eye());
        await waitFor(() => {
            assert.equal(eye().getAttribute("aria-pressed"), "true", "hidden again");
        });

        // Closed, every layer holds the field with that one group hidden.
        await userEvent.click(page.elementLocator(popover).getByRole("button", { name: /^Close / }));
        await waitFor(() => {
            for (const id of layers) {
                const binding = session.styles.get(id)?.encode?.["node.color"];
                assert.isTrue(binding !== undefined && "by" in binding, "each layer holds its own copy");
                assert.deepEqual(
                    binding !== undefined && "by" in binding ? binding.hidden?.map(String) : undefined,
                    [name],
                    "the one group hidden",
                );
            }
        });
    });
});
