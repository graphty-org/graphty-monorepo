/**
 * The style tree and the Style tab together on the REAL graphty-element: selecting a run's layer
 * in the style tree opens its Style tab with the run's own lines (task T9, color or size by a
 * result).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

describe("a run's layer from the style tree", () => {
    // The design's frame. At the runner's default width the inspector has no room.
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("opens its Style tab with the run's lines", async () => {
        const store = createWorkspaceStore({ project: { name: "Ring", id: 1 } });
        render(<Workspace store={store} />);
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.addNodes([1, 2, 3, 4].map((id) => ({ id: String(id) })));
        await session.data.addEdges([
            { source: "1", target: "2" },
            { source: "2", target: "3" },
            { source: "3", target: "4" },
            { source: "4", target: "1" },
        ]);
        const { runId } = await session.runs.start("pagerank");
        await session.styles.settled();
        const run = session.runs.get(runId);
        assert.isDefined(run);
        // The run's layer row carries the layer's name, which the run gave it.
        const layer = session.styles.get(session.runs.bindings(runId)[0]);
        assert.isDefined(layer);
        const label = layer?.name ?? "";

        // The reader's path: the run's layer in the style tree opens its Style in the inspector.
        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.click(
            await within(tree).findByRole("treeitem", {
                name: new RegExp(
                    `^${label.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")}, (node |edge |node and edge )?layer`,
                ),
            }),
        );

        // The run's own Color line, bound to its result, on the Nodes side it paints: the run
        // paints nodes only, so no Nodes / Edges picker is drawn.
        const tab = await screen.findByTestId("style-tab");
        await waitFor(() => {
            assert.isNotNull(within(tab).getByRole("button", { name: /Stop varying node color by data/ }));
        });
        assert.isNull(within(tab).queryByRole("radiogroup", { name: "Paints" }));
    });
});
