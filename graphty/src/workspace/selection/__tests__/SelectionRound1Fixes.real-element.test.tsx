/**
 * Tier 5 round 1's fix pass (design/ui/studio/tier5/rounds/round-1/insights.md) on the REAL
 * graphty-element and Les Miserables, driven by real clicks and keys: a filter step picked from a
 * run over what was showing stays bound to that run and says so; By position says which end and
 * in what it counts, and claims no limit it does not apply; "Is exactly" takes on an empty text
 * step; Clear then Escape (or Done) on a reopened filter card keeps the card; the empty Fill box
 * says what it takes and its picker stays open over the first pick; a new Or group shows no "0";
 * the add buttons say And... and Or...; Tab past the workspace's last control reaches its header,
 * which is an F6 stop, and Done shows Escape as its key.
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

// Every experiment stays off here.
withFeatures([]);

/**
 * Les Miserables in the workspace.
 * @param place - the place it opens on.
 * @returns The session.
 */
async function openSample(place: "graph" | "data" = "graph"): Promise<GraphSession> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place });
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
    return session;
}

/**
 * A reader's layer on everything, selected in the style tree.
 * @param session - The session.
 * @param name - Its name.
 * @param set - What it sets.
 * @param where - Its selection, or everything.
 * @returns The layer's id.
 */
async function openLayer(
    session: GraphSession,
    name: string,
    set: Record<string, unknown>,
    where?: UnionLeaf,
): Promise<string> {
    const { id } = await session.styles.add({
        name,
        target: "node",
        selector: where === undefined ? { match: "everything" } : { match: "rule", where },
        set,
    });
    await session.styles.settled();
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
    await waitFor(() => {
        assert.isNotNull(document.querySelector(".sel-rest"));
    });
    return id;
}

describe("the empty Fill color box", () => {
    // Insight 5: an empty box with no cue, whose picker closed on its first click.
    it("says what it takes, and its picker stays open over the first pick", async () => {
        const session = await openSample();
        const id = await openLayer(session, "Unpainted", { "node.size": 2 });
        await userEvent.click(await screen.findByRole("button", { name: "Add to node fill" }));
        const box = await waitFor(() => {
            const found = document.querySelector<HTMLInputElement>('[data-line="node.color"] input');
            assert.isNotNull(found);
            return found;
        });
        assert.strictEqual(box?.placeholder, "Pick or type");
        await userEvent.click(await screen.findByRole("button", { name: /^Pick node color/ }));
        const field = await screen.findByTestId("color-picker-saturation");
        const at = field.getBoundingClientRect();
        await userEvent.click(field, { position: { x: at.width * 0.8, y: at.height * 0.3 } });
        await waitFor(() => {
            assert.isString(session.styles.get(id)?.set?.["node.color"], "the pick is written");
        });
        assert.isNotNull(screen.queryByTestId("color-picker-saturation"), "the picker is still open");
    });
});
