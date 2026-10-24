/**
 * A hidden layer stays hidden when another analysis runs, on the REAL graphty-element: the eye is
 * clicked, Louvain is run from Analyze, and each node's drawn color (what the canvas was last
 * painted, `Node.drawnFill`) is read -- never `styles.explain()`, which left the hidden layer out
 * even while the canvas still painted it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const RED = "#ff0000";

describe("a hidden layer under a later run", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("stays unpainted after Louvain runs: every node's drawn color is not the hidden layer's", async () => {
        render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isDefined(found?.session);
            return found;
        });
        if (element === null) {
            throw new Error("the element never came up");
        }
        const { session } = element;
        const ids = [1, 2, 3, 4, 5, 6];
        await session.data.addNodes(ids.map((id) => ({ id })));
        await session.data.addEdges([
            { source: 1, target: 2 },
            { source: 2, target: 3 },
            { source: 1, target: 3 },
            { source: 4, target: 5 },
            { source: 5, target: 6 },
            { source: 4, target: 6 },
            { source: 3, target: 4 },
        ]);
        // Red, pinned on top, so a run lands beneath it: were it painted again, it would show.
        const red = await session.styles.add({
            name: "Red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.color": RED },
        });
        await session.styles.pinRow(red.row ?? red.id, "top");
        const drawn = (): (string | null | undefined)[] =>
            ids.map((id) => element.getNode(id)?.drawnFill?.slice(0, 7).toLowerCase());
        await waitFor(() => {
            assert.deepEqual(
                drawn(),
                ids.map(() => RED),
            );
        });

        const tree = await screen.findByRole("tree", { name: "Style layers" });
        await userEvent.hover(await within(tree).findByRole("treeitem", { name: /^Red, / }));
        await userEvent.click(within(tree).getByRole("button", { name: "Hide Red" }));
        await waitFor(() => {
            assert.notInclude(drawn(), RED, "the eye stops the layer painting");
        });

        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Louvain");
        await userEvent.click(await screen.findByRole("option", { name: /^Louvain/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
        await waitFor(() => {
            const run = session.runs.list().find((r) => r.algorithm === "louvain");
            assert.equal(run?.status, "succeeded");
            assert.isAbove(session.runs.bindings(run?.id ?? "").length, 0);
        });
        await session.styles.settled();
        assert.notInclude(drawn(), RED, "the run repainted no hidden layer");
        assert.isTrue(session.styles.tree().find((row) => row.name === "Red")?.hidden, "the row still says hidden");
    });
});
