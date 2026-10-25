/**
 * A selection of several edges, in the inspector: each edge listed by its two ends' names and,
 * when a rule selected them, the value the rule tested. Against a real graphty-element session
 * with no view.
 */
import { createGraphSession, type GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { act, render, screen, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { Inspector } from "../Inspector";

let session: GraphSession | null = null;

afterEach(() => {
    session?.dispose();
    session = null;
});

/**
 * Three stops joined by timed edges, the inspector rendered on them.
 * @returns the session.
 */
async function renderStops(): Promise<GraphSession> {
    const made = createGraphSession();
    session = made;
    // An undirected graph whose nodes are named by their label, as an import that names them sets.
    await made.config.set({ data: { directed: false, knownFields: { nodeLabelPath: "label" } } });
    await made.data.addNodes([
        { id: "s1", label: "Station" },
        { id: "s2", label: "Stadium" },
        { id: "s3", label: "Park" },
    ]);
    await made.data.addEdges([
        { source: "s1", target: "s2", minutes: 7 },
        { source: "s2", target: "s3", minutes: 9 },
        { source: "s1", target: "s3", minutes: 2 },
    ]);
    const store = createWorkspaceStore({ project: { name: "Stops", id: 1 } });
    render(
        <WorkspaceContext.Provider value={makeWorkspaceValue(store, createRegistry(REGISTRATIONS), made, null)}>
            <Inspector />
        </WorkspaceContext.Provider>,
    );
    return made;
}

describe("a selection of several edges", () => {
    it("lists each edge by its ends' names, with the value the rule tested", async () => {
        const on = await renderStops();
        await act(async () => {
            await on.selection.apply({ text: "=minutes > `5`" });
        });

        const section = await screen.findByRole("group", { name: "Selected edges" });
        assert.include(section.textContent, "minutes");
        assert.isNotNull(within(section).getByText("Station -- Stadium"));
        assert.isNotNull(within(section).getByText("Stadium -- Park"));
        assert.isNull(within(section).queryByText("Station -- Park"));
        // Each row carries the minutes the rule tested.
        assert.include(within(section).getByText("Station -- Stadium").parentElement?.textContent, "7");
        assert.include(within(section).getByText("Stadium -- Park").parentElement?.textContent, "9");
    });

    it("lists the ends' names alone when no rule selected them", async () => {
        const on = await renderStops();
        await act(async () => {
            await on.selection.apply({ edges: on.data.edges().map((edge) => edge.id) });
        });

        const section = await screen.findByRole("group", { name: "Selected edges" });
        assert.isNotNull(within(section).getByText("Station -- Park"));
        assert.notInclude(section.textContent, "minutes");
    });
});
