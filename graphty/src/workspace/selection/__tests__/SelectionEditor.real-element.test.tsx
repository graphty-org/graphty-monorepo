/**
 * The selection editor (design/ui/selection-groups/spec.md, section 3) on the REAL graphty-element
 * and Les Miserables, driven by real clicks and keys. In a style layer's Which nodes: the outline
 * is drawn at rest, one line per row, with no control in it; "And..." adds a step and opens the
 * value picker at once; a value with no test is kept and reads "No test"; Escape on a step with no
 * value takes it back; a number written in the pane's box narrows the layer; a flat tier 4 rule
 * opens as All nodes and a Keep step; Mod+[ and a drag reorder steps; a Relative to step takes its
 * reference from the picker; selecting a row draws the picking view until Escape. In a filter
 * card: the verb segment writes the verb and Hovered or selected is not offered. The title pane's
 * Table opens the table on Matches only; a group pane's count selects its members (a style layer)
 * or opens the table (a filter). The start page's hover look is four layers built in the editor,
 * drawing what the built-in hover layers draw; the Style Layers + menu has no template for it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer, RuleTree, Selector, UnionLeaf } from "@graphty/graphty-element/session";
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
 * Les Miserables in the workspace.
 * @param place - the place to open on.
 * @returns The session.
 */
async function openSample(place?: "data"): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({
        project: { name: "Untitled", id: 1 },
        ...(place === undefined ? {} : { place }),
    });
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

/**
 * A reader's layer, selected in the style tree: its Which nodes outline is drawn.
 * @param session - The session.
 * @param name - Its name.
 * @param selector - What it picks.
 * @returns The layer.
 */
async function openLayer(session: GraphSession, name: string, selector: Selector): Promise<Layer> {
    const layer = await session.styles.add({ name, target: "node", selector, set: { "node.color": "#d55e00" } });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-editor"));
    });
    return layer;
}

const DEGREE_6_TO_10: RuleTree = { kind: "range", attribute: "graphty.degree", min: 6, max: 10 };

/** Two groups: A, degree 6 to 10 from All; B, Valjean alone. */
const TWO_GROUPS: UnionLeaf = {
    kind: "union",
    side: "nodes",
    within: "visible",
    branches: [
        { id: "a", start: "all", steps: [{ id: "deg", op: "keep", rule: DEGREE_6_TO_10 }] },
        {
            id: "b",
            start: "none",
            steps: [{ id: "val", op: "add", rule: { kind: "hops", of: { nodes: ["Valjean"] }, max: 0 } }],
        },
    ],
};

describe("the start page's hover look, built with the editor (spec 7, acceptance 14)", () => {
    it("the Style Layers + menu offers no Hover highlight template", async () => {
        await openSample();
        await userEvent.click(await screen.findByRole("button", { name: "Add a layer or a folder" }));
        await screen.findByRole("menuitem", { name: "Folder" });
        assert.isNull(screen.queryByRole("menuitem", { name: /hover highlight/i }));
        await userEvent.keyboard("{Escape}");
    });
});

describe("a style layer's selection at rest (the owner, 2026-11-11, issue #6810)", () => {
    it("is one line, Style Nodes... with the open-in-new-window icon, and no outline rows", async () => {
        const session = await openSample();
        await openLayer(session, "Two", { match: "rule", where: TWO_GROUPS });
        const editor = document.querySelector<HTMLElement>(".sel-rest");
        if (editor === null) {
            throw new Error("the editor is drawn");
        }
        const shown = [...editor.querySelectorAll<HTMLElement>("button, input, [role=checkbox]")].filter(
            (each) => each.getClientRects().length > 0,
        );
        assert.deepEqual(
            shown.map((each) => each.textContent),
            ["Style Nodes..."],
        );
        assert.isNotNull(shown[0]?.querySelector("svg"), "the open-in-new-window icon");
        assert.lengthOf(editor.querySelectorAll(".sel-row, [role=tree]"), 0, "no Which nodes title or All nodes row");
        assert.notMatch(editor.textContent ?? "", /Which nodes|All nodes/);
    });
});
