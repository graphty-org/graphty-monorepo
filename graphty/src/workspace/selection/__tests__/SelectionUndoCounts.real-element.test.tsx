/**
 * The style tree after an undo, on the REAL graphty-element and Les Miserables, driven by real
 * clicks and keys: a layer row reads the layer's count again when Mod+Z takes a filter back.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, UnionLeaf } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// Every experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace, and every announcement made.
 * @returns The session and the announcements heard.
 */
async function openSample(): Promise<{ session: GraphSession; heard: string[] }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    // Every announcement made, each time it is made (a repeated one is said again).
    const heard: string[] = [];
    const set = store.set.bind(store);
    store.set = (patch) => {
        const said = (patch as { announcement?: unknown }).announcement;
        if (typeof said === "string" && said !== "") {
            heard.push(said);
        }
        set(patch);
    };
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
    return { session, heard };
}

/**
 * A reader's layer, selected in the style tree.
 * @param session - The session.
 * @param name - Its name.
 * @param where - Its selection, or everything.
 * @returns The layer.
 */
async function openLayer(session: GraphSession, name: string, where?: UnionLeaf): Promise<Layer> {
    const layer = await session.styles.add({
        name,
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
        set: { "node.color": "#d55e00" },
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return layer;
}

describe("the style tree after an undo", () => {
    it("a layer row reads the layer's count again when Mod+Z takes a filter back", async () => {
        const { session } = await openSample();
        const layer = await openLayer(session, "Counted", {
            kind: "union",
            side: "nodes",
            within: "visible",
            branches: [
                {
                    start: "none",
                    steps: [{ op: "add", rule: { kind: "range", attribute: "graphty.degree", min: 5 } }],
                },
            ],
        });
        await session.visibility.addCondition({
            id: "cut",
            effect: "keep",
            rule: { kind: "range", attribute: "graphty.degree", min: 10 },
        });
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        const rowSays = (): string =>
            within(tree)
                .getByRole("treeitem", { name: /^Counted, / })
                .getAttribute("aria-label") ?? "";
        await waitFor(() => {
            assert.include(rowSays(), `${String(session.styles.counts(layer.id).matched)} node`);
        });
        const before = session.styles.counts(layer.id).matched;
        within(tree)
            .getByRole("treeitem", { name: /^Counted, / })
            .focus();
        await userEvent.keyboard("{Control>}z{/Control}");
        await waitFor(() => {
            const now = session.styles.counts(layer.id).matched;
            assert.notStrictEqual(now, before, "the undo changed the layer's count");
            assert.include(rowSays(), `${String(now)} node`);
        });
    });
});
