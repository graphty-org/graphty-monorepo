/**
 * The Data place keeps graphty-element's error codes: a filter change the element refuses is
 * worded from its code, and an attribute that is gone reads as gone only when the element says it
 * is unknown. On the REAL element, by real clicks.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type GraphSession, GraphtyError } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeAll, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { labelRefusalFor } from "../attributeActions";
import { GRAPH_FILE_GML } from "../fixtures";

withFeatures([]);

/**
 * The workspace on the Data place with the small graph file loaded.
 * @returns the session.
 */
async function openWithGraph(): Promise<GraphSession> {
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
    return session;
}

describe("the Data place keeps graphty-element's error codes", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("a filter change the element refuses says the element's reason", async () => {
        const session = await openWithGraph();
        await columnVerb("edge", "value", "Filter to...");
        const from = await screen.findByRole("textbox", { name: "value from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "9{Enter}");
        await waitFor(() => {
            assert.lengthOf(session.visibility.conditions, 1);
        });
        vi.spyOn(session.visibility, "removeCondition").mockRejectedValue(
            new GraphtyError({ code: "E_HELD_BY_TRANSACTION", message: "English", source: "history" }),
        );
        const list = within(screen.getByRole("region", { name: "Data place" })).getByRole("list", { name: "Filters" });
        await userEvent.click(within(list).getByRole("treeitem", { name: /^value / }));
        const workspace = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(await within(workspace).findByRole("button", { name: /^More for / }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));

        await screen.findByText("The filter could not be changed: another change is still being made; try again.");
        assert.lengthOf(session.visibility.conditions, 1);
    });

    it("an attribute the element does not know reads as gone; any other refusal is not hidden", async () => {
        const session = await openWithGraph();
        assert.strictEqual(
            labelRefusalFor(session, { kind: "node", name: "not-in-the-data" }),
            "No longer in the data",
        );

        vi.spyOn(session.styles, "proposeEncoding").mockImplementation(() => {
            throw new GraphtyError({ code: "E_INTERNAL", message: "English", source: "style" });
        });
        assert.throws(() => labelRefusalFor(session, { kind: "node", name: "label" }), GraphtyError);
    });
});
