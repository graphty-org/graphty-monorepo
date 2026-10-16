/**
 * Vary by Layer on several layers, on the REAL graphty-element with real clicks and keys: with a
 * folder or several layers selected, a property's Vary list offers "Layer", which spreads the
 * property's own per-value control -- a palette, a shape list, a size range, a line pattern list --
 * over the layers in list order, previews each layer's value, and on Apply writes each layer its
 * own plain value in one undo step. The folder's panel has no Selection colors.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { Channel } from "@graphty/graphty-element/schema";
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
 * @returns The layers, top first as the tree lists them.
 */
async function handMade(
    session: GraphSession,
    name: string,
    target: "node" | "edge",
    set: Readonly<Partial<Record<Channel, string | number>>>,
): Promise<string[]> {
    const folder = await session.styles.addFolder(name);
    const ids = session.data.nodes().map((node) => String(node.id));
    for (const [at, layerName] of ["First", "Second", "Third"].entries()) {
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
 * Open a property's Vary list and pick "Layer".
 * @param row - The property row.
 * @returns The Vary by Layer panel under the row.
 */
async function varyByLayer(row: HTMLElement): Promise<HTMLElement> {
    await userEvent.hover(row);
    await userEvent.click(within(row).getByRole("button", { name: / by attribute$/ }));
    await userEvent.click(await screen.findByRole("option", { name: /^Layer/ }));
    return within(row).findByRole("group", { name: / by layer$/ });
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

describe("vary by layer", () => {
    it("gives Louvain's group layers a palette's colors in list order, plain values, one Undo; no Selection colors", async () => {
        const session = await openSample();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        const folder = session.styles.tree().find((row) => row.name === "Louvain");
        const groups = [...session.styles.layersUnder([folder?.id ?? ""])].reverse().map((reach) => reach.row);
        const before = written(session, groups, "node.color");
        await clickRow("Louvain");

        assert.isNull(screen.queryByRole("heading", { name: "Selection colors" }), "Selection colors is gone");
        assert.isNull(screen.queryByRole("button", { name: /selection colors?$/ }));

        const fill = await line("node.color");
        const panel = await varyByLayer(fill);
        assert.lengthOf(within(panel).getAllByRole("listitem"), groups.length, "one line per layer");
        await waitFor(() => {
            assert.isTrue(panel.contains(document.activeElement), "focus goes into the panel");
        });
        await userEvent.click(within(panel).getByRole("button", { name: "Apply" }));

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
    });

    it("gives each layer of a hand-made folder a different shape", async () => {
        const session = await openSample();
        const layers = await handMade(session, "Story", "node", { "node.size": 2 });
        await clickRow("Story");

        const tab = await screen.findByTestId("style-tab");
        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
        const panel = await varyByLayer(await line("node.shape"));
        await userEvent.click(within(panel).getByRole("button", { name: "Apply" }));

        await waitFor(() => {
            const shapes = written(session, layers, "node.shape");
            assert.isTrue(shapes.every((shape) => typeof shape === "string"));
            assert.strictEqual(new Set(shapes).size, layers.length, "a different shape per layer");
        });
    });

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
            const third = within(panel).getByLabelText("Size of Sizes First");
            assert.strictEqual((third as HTMLInputElement).value, "3", "the preview follows the range");
        });
        await userEvent.click(within(panel).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.deepEqual(written(session, layers, "node.size"), [1, 2, 3], "top layer first, evenly spread");
        });

        const edges = await handMade(session, "Lines", "edge", { "edge.style": "solid" });
        await clickRow("Lines");
        const pattern = await line("edge.style");
        await userEvent.click(within(await varyByLayer(pattern)).getByRole("button", { name: "Apply" }));
        await waitFor(() => {
            assert.strictEqual(new Set(written(session, edges, "edge.style")).size, edges.length);
        });
    });
});
