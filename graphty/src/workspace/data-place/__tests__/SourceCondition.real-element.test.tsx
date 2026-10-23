/**
 * Picking nodes by a condition card from the Data place, on the REAL graphty-element: the Filters
 * "+" opens the step editor, the reader picks an attribute and fills its card with real clicks and
 * keys, and the step the element holds keeps exactly the nodes the card names. With two loads in,
 * the cards offer Data source, a checklist of the loads.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { GRAPH_FILE_GML, PLAIN_JSON } from "../fixtures";
import { addStepCondition } from "./stepCards";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/**
 * Renders the workspace on the Data place and waits for the session, with the small graph file
 * loaded (8 nodes, `group` 1 to 3).
 * @returns the session.
 */
async function openWithGraph(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    let session: GraphSession | undefined;
    await waitFor(
        () => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    return session;
}

/**
 * Opens a new filter step from the Filters "+" and picks an attribute in its editor by typing.
 * @param name - the attribute's name, as the list shows it.
 */
async function newStepOn(name: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
    await addStepCondition(name);
}

/**
 * The ids of the nodes the filter shows.
 * @param session - the element's session.
 * @returns the ids, sorted.
 */
function shownNodes(session: GraphSession): string[] {
    return session.data
        .nodes()
        .filter((node) => session.visibility.isVisible(node.id))
        .map((node) => String(node.id))
        .sort();
}

describe("picking nodes by a condition card from the Data place", () => {
    beforeAll(async () => {
        await page.viewport(1366, 900);
    });

    it("keeps the nodes a number card's range holds", async () => {
        const session = await openWithGraph();
        await newStepOn("group");
        const from = await screen.findByRole("textbox", { name: "group from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "3");
        await userEvent.click(screen.getByRole("button", { name: "Add step" }));

        await waitFor(() => {
            assert.lengthOf(session.visibility.steps, 1);
        });
        assert.deepEqual(session.visibility.steps[0].rule, { kind: "range", attribute: "data.group", min: 3, max: 3 });
        // Marius and Gavroche are the two nodes in group 3.
        assert.deepEqual(shownNodes(session), ["4", "6"]);
    });

    it("offers Data source once two loads are in, and keeps only the ticked load's nodes", async () => {
        const session = await openWithGraph();
        // One load: no Data source card.
        await userEvent.click(screen.getByRole("button", { name: "Add filter step" }));
        await userEvent.click(await screen.findByRole("button", { name: "Add a condition" }));
        await screen.findByRole("option", { name: /^group(,|$)/ });
        assert.isNull(screen.queryByRole("option", { name: "Data source" }));
        await userEvent.keyboard("{Escape}{Escape}");

        await session.data.import(
            { type: "json", name: "people.json", config: { data: PLAIN_JSON } },
            { mode: "merge" },
        );
        await waitFor(() => {
            assert.lengthOf(session.data.sources(), 2);
        });
        const people = session.data.sources()[1];

        await newStepOn("Data source");
        const loads = await screen.findByRole("group", { name: "Data source values" });
        await userEvent.click(within(loads).getByRole("checkbox", { name: /^people\.json, 4 nodes$/ }));
        await userEvent.click(screen.getByRole("button", { name: "Add step" }));

        await waitFor(() => {
            assert.lengthOf(session.visibility.steps, 1);
        });
        assert.deepEqual(session.visibility.steps[0].rule, { kind: "source", sources: [people.key] });
        assert.deepEqual(shownNodes(session), ["a", "b", "c", "d"]);
        // The step's row names the load, not its key.
        await within(screen.getByRole("region", { name: "Data place" })).findByRole("treeitem", {
            name: "from people.json",
        });
    });
});
