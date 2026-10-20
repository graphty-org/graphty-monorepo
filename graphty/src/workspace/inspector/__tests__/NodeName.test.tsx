/**
 * A node is called by its label everywhere the app names it: the helper, the inspector's title
 * and an edge's Summary ends. Against a real graphty-element session with no view.
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { act, render, screen } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { Inspector } from "../Inspector";
import { nodeName } from "../words";

let session: GraphSession | null = null;

afterEach(() => {
    session?.dispose();
    session = null;
});

/**
 * Two teams with numeric ids, one labeled and one not, joined by one edge.
 * @param labeled - whether the graph names its nodes by the label column.
 * @returns the session.
 */
async function teams(labeled: boolean): Promise<GraphSession> {
    const made = createGraphSession();
    session = made;
    await made.config.set({ data: { directed: false, knownFields: { nodeLabelPath: labeled ? "label" : null } } });
    await made.data.addNodes([
        { id: 74, label: "Nebraska" },
        { id: 40, label: "Colorado" },
    ]);
    await made.data.addEdges([{ source: 74, target: 40 }]);
    return made;
}

/**
 * The inspector rendered on a session.
 * @param on - the session.
 */
function renderInspector(on: GraphSession): void {
    const store = createWorkspaceStore({ project: { name: "Teams", id: 1 } });
    render(
        <WorkspaceContext.Provider value={makeWorkspaceValue(store, createRegistry(REGISTRATIONS), on, null)}>
            <Inspector />
        </WorkspaceContext.Provider>,
    );
}

describe("a node's name", () => {
    it("is its label where the graph has one, else its id", async () => {
        assert.equal(nodeName(await teams(true), 74), "Nebraska");
        session?.dispose();
        assert.equal(nodeName(await teams(false), 74), "74");
    });

    it("titles the node inspector", async () => {
        const on = await teams(true);
        renderInspector(on);
        await act(async () => {
            await on.selection.apply({ nodes: [74] });
        });
        assert.isNotNull(await screen.findByRole("heading", { name: /Nebraska/ }));
        assert.isNull(screen.queryByRole("heading", { name: /^74/ }));
    });

    it("names both ends in the edge inspector's Summary", async () => {
        const on = await teams(true);
        renderInspector(on);
        await act(async () => {
            await on.selection.apply({ edges: [on.data.edges()[0].id] });
        });
        const summary = await screen.findByRole("group", { name: "Summary" });
        assert.include(summary.textContent, "Nebraska");
        assert.include(summary.textContent, "Colorado");
        assert.notInclude(summary.textContent, "74");
    });
});
