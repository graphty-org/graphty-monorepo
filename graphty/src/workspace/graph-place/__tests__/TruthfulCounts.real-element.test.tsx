/**
 * A layer row counts only what it paints, on the REAL graphty-element with real clicks: a row on
 * nodes and edges that styles only nodes is named for its nodes, its Values tab lists no matched
 * edges, and "Select what it paints" selects its nodes alone, with focus on the inspector's title;
 * a row that matches nothing says so and keeps the selection. A grouping run's rows keep their
 * swatch and count once their conditions change, and the folder's Color line shows only the
 * colors the drawing shows.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/**
 * The workspace with the element up.
 * @returns the session.
 */
async function openWorkspace(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * The style tree.
 * @returns the tree element.
 */
function tree(): HTMLElement {
    return screen.getByRole("tree", { name: "Style layers" });
}

describe("counts that say only what a layer paints", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("names, lists and selects only the half that styles something", async () => {
        const session = await openWorkspace();
        await session.data.addNodes([1, 2, 3, 4].map((id) => ({ id, name: `N${String(id)}` })));
        await session.data.addEdges([
            { source: 1, target: 2 },
            { source: 2, target: 3 },
            { source: 3, target: 4 },
        ]);
        const painted = await session.styles.addRow({
            name: "Painted",
            target: "both",
            selector: { match: "everything" },
            set: { "node.color": "#ff0000" },
        });
        assert.isDefined(painted.edge, "the row is on edges too, with nothing set there");
        await session.styles.addRow({
            name: "Nobody",
            target: "node",
            selector: { match: "rule", where: { kind: "categories", attribute: "data.name", values: ["nobody"] } },
            set: { "node.color": "#00ff00" },
        });
        await session.styles.settled();

        // The row's name counts its nodes and never the edges it does not style.
        const row = await within(tree()).findByRole("treeitem", { name: /^Painted, / });
        assert.equal(row.getAttribute("aria-label"), "Painted, node layer, 4 nodes");

        // Its Values tab lists the nodes it matches, not the edges.
        await userEvent.click(row);
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        await screen.findByText("Matched nodes");
        assert.isNull(screen.queryByText("Matched edges"));

        // Select what it paints: its four nodes, no edge, and focus on the inspector's title.
        await userEvent.click(screen.getByRole("button", { name: "Select what it paints" }));
        await waitFor(() => {
            assert.lengthOf(session.selection.nodes, 4);
            assert.lengthOf(session.selection.edges, 0);
            assert.equal(document.activeElement?.id, INSPECTOR_TITLE_ID);
        });

        // A row that matches nothing selects nothing, says so, and keeps the selection.
        await userEvent.click(within(tree()).getByRole("treeitem", { name: /^Nobody, / }));
        await userEvent.click(await screen.findByRole("button", { name: "Select what it paints" }));
        await screen.findAllByText("Nobody paints nothing, so nothing was selected");
        assert.lengthOf(session.selection.nodes, 4);
    });

    it("keeps a group row's swatch and count when its condition goes, and the Color line shows what is drawn", async () => {
        const session = await openWorkspace();
        await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
        await session.styles.settled();
        const toolbar = screen.getByRole("toolbar", { name: "Canvas tools" });
        await userEvent.click(within(toolbar).getByRole("button", { name: "Analyze" }));
        await userEvent.type(await screen.findByRole("combobox", { name: "Filter analyses" }), "Louvain");
        await userEvent.click(await screen.findByRole("option", { name: /^Louvain/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^Run\b/ }));
        await waitFor(() => {
            assert.equal(session.runs.list().find((r) => r.algorithm === "louvain")?.status, "succeeded");
        });
        await session.styles.settled();

        // Every group's condition removed: each layer matches every node, and the top one wins.
        const groups = session.styles.tree().find((r) => r.name === "Louvain")?.children ?? [];
        assert.isAbove(groups.length, 1);
        for (const group of groups) {
            const id = session.styles.parts(group.id)?.node ?? group.id;
            await session.styles.update(id, { selector: { match: "everything" } });
        }
        await session.styles.settled();
        const all = session.data.nodes().length;
        const top = groups.at(-1)?.name ?? "";

        const folder = await within(tree()).findByRole("treeitem", { name: /^Louvain, folder, / });
        await userEvent.click(folder);
        await userEvent.keyboard("{ArrowRight}");
        await waitFor(() => {
            const topRow = within(tree()).getByRole("treeitem", { name: new RegExp(`^${top}, `) });
            assert.isNotNull(topRow.querySelector("[data-row-swatch]"), "the top group keeps its swatch");
            assert.equal(topRow.querySelector(".ws-row-count")?.textContent, String(all));
            for (const group of groups.slice(0, -1)) {
                const under = within(tree()).getByRole("treeitem", { name: new RegExp(`^${group.name}, `) });
                assert.isNotNull(under.querySelector("[data-row-swatch]"), `${group.name} keeps its swatch`);
            }
        });

        // The folder's Color line shows the one color the drawing shows.
        await userEvent.click(folder);
        await waitFor(() => {
            const chits = [...document.querySelectorAll("[data-varied-line] .ws-varied-chit")].map((chit) =>
                chit.getAttribute("data-name"),
            );
            assert.deepEqual(chits, [top]);
        });
    });
});
