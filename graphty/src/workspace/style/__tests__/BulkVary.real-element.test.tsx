/**
 * Vary by data on several layers, on the REAL graphty-element with real clicks and keys: on the
 * Louvain folder, Fill > Vary > the run's group opens the binding popover one layer gets, and
 * closing it writes the binding into each layer as its own rule, one undo step; Shape the same; on
 * a folder of layers that share no field's value, Vary stays on because it offers Layer.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and a run finishing, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/**
 * Les Miserables with Louvain's groups as layers in a "Louvain" folder.
 * @returns The session and the group layers, largest first.
 */
async function openScene(): Promise<{ session: GraphSession; groups: string[] }> {
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
    await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
    await session.styles.settled();
    const folder = session.styles.tree().find((row) => row.name === "Louvain");
    return { session, groups: [...(folder?.children ?? [])].reverse().map((row) => row.id) };
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

describe("vary by data on several layers", () => {
    it("copies Fill by the run's group into each group layer when its popover closes, one Undo; Shape the same", async () => {
        const { session, groups } = await openScene();
        const before = groups.map((id) => session.styles.get(id)?.set?.["node.color"]);
        await clickRow("Louvain");

        const fill = await line("node.color");
        await userEvent.hover(fill);
        await userEvent.click(within(fill).getByRole("button", { name: "Node color by attribute" }));
        const options = await screen.findAllByRole("option", { name: /group|community|louvain/i });
        await userEvent.click(options[0]);

        // The binding popover a single layer gets, holding the binding until it closes.
        const popover = await screen.findByRole("dialog", { name: /^Color by / });
        await within(popover).findByRole("group", { name: "Color binding" });
        assert.isTrue(
            groups.every((id) => session.styles.get(id)?.encode?.["node.color"] === undefined),
            "nothing is written while it is open",
        );
        await userEvent.keyboard("{Escape}");

        await waitFor(() => {
            for (const id of groups) {
                const binding = session.styles.get(id)?.encode?.["node.color"];
                assert.isTrue(binding !== undefined && "by" in binding, "each layer holds its own rule");
            }
        });
        await session.styles.settled();
        // Each community paints its own color: as many colors among the nodes as group layers.
        const colors = new Set(
            session.data.nodes().map((node) => session.styles.explain({ node: node.id }).merged["node.color"]?.hex),
        );
        assert.strictEqual(colors.size, groups.length);
        assert.lengthOf(
            session.styles.legend().filter((block) => block.channel === "node.color"),
            1,
            "the key shows one block",
        );

        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            assert.deepEqual(
                groups.map((id) => session.styles.get(id)?.set?.["node.color"]),
                before,
                "one undo restores every layer's color",
            );
        });

        // Shape: "+" adds it to every layer, then Vary copies a shape rule into each.
        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const shape = await line("node.shape");
        await userEvent.hover(shape);
        await userEvent.click(within(shape).getByRole("button", { name: "Node shape by attribute" }));
        const shapeOptions = await screen.findAllByRole("option", { name: /group|community|louvain/i });
        await userEvent.click(shapeOptions[0]);
        await screen.findByRole("dialog", { name: /^Shape by / });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            for (const id of groups) {
                const binding = session.styles.get(id)?.encode?.["node.shape"];
                assert.isTrue(binding !== undefined && "by" in binding, "each layer holds its own shape rule");
            }
        });
    });

    it("stays on for layers that share no field's value, offering Layer", async () => {
        const { session } = await openScene();
        const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
        const folder = await session.styles.addFolder("Story highlights");
        for (const [name, nodes] of [
            ["Heroes", ["Valjean", "Cosette"]],
            ["Law", ["Javert", "Champmathieu"]],
        ] as const) {
            const layer = await session.styles.add({
                name,
                target: "node",
                selector: { match: "ids", nodes: nodes.map(idOf) },
                set: { "node.color": name === "Law" ? "#0072B2" : "#D55E00" },
            });
            await session.styles.moveRow(layer.id, { parent: folder.id });
        }
        await session.styles.settled();
        await clickRow("Story highlights");

        const fill = await line("node.color");
        await userEvent.hover(fill);
        const vary = within(fill).getByRole("button", { name: "Node color by attribute" });
        assert.notEqual(vary.getAttribute("aria-disabled"), "true", "Layer is offered");
        await userEvent.click(vary);
        await screen.findByRole("option", { name: /^Layer/ });
        // "One value for all", then a typed Fill writes to both.
        await userEvent.click(await screen.findByRole("option", { name: /^One value for all/ }));
        await userEvent.click(await within(fill).findByRole("textbox", { name: /^Node color/ }));
        await userEvent.keyboard("009E73{Enter}");
        await waitFor(() => {
            const colors = session.styles
                .list()
                .filter((layer) => layer.name === "Heroes" || layer.name === "Law")
                .map((layer) => layer.set?.["node.color"]);
            assert.deepEqual(colors, ["#009E73", "#009E73"]);
        });
    });
});
