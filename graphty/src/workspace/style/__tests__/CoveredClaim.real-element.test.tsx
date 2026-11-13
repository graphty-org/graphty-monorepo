/**
 * A layer whose Which nodes gains an Or group in the workspace still decides its own Fill over
 * Everything on the REAL graphty-element and Les Miserables, driven by real clicks and keys: after
 * Done, the Fill row says nothing covers it, as the canvas draws the layer's color.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace with its starting rows, Everything painting every node.
 * @returns The session.
 */
async function openSample(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/** One group: degree 10 or more. */
const BUSY: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        {
            id: "a",
            name: "A",
            start: "none",
            steps: [{ id: "a1", op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 10 } }],
        },
    ],
};

describe("a layer's Fill after an Or group is added to its Which nodes", () => {
    it("is not read as covered by Everything", async () => {
        const session = await openSample();
        const layer = await session.styles.add({
            name: "Busy",
            target: "node",
            selector: { match: "rule", where: BUSY },
            set: { "node.color": "#d55e00" },
        });
        await session.styles.settled();
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(await within(tree).findByRole("treeitem", { name: /^Busy, / }));
        await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
        const ws = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found, "the workspace is open");
            return found;
        });
        await userEvent.click(await within(ws).findByRole("button", { name: "Or..." }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Largest component");
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            const where = session.styles.get(layer.id)?.selector;
            assert.lengthOf(where?.match === "rule" && where.where.kind === "union" ? where.where.branches : [], 2);
        });
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "the workspace closed");
        });
        await session.styles.settled();
        // The canvas draws Busy's color on every node it matches...
        const entry = session.styles
            .agreement("graph", "node.color", { over: layer.id })
            .channels.find((each) => each.channel === "node.color");
        assert.strictEqual(entry?.state === "agree" ? entry.layerId : undefined, layer.id);
        // ...and the Fill row says nothing covers it.
        await screen.findByRole("button", { name: /^Style Nodes\.\.\./ });
        assert.isNull(document.querySelector("[data-covered-caption]"), "no covered caption under Fill");
    });
});
