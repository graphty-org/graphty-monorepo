/**
 * The data table never takes an editor's selection, on the REAL graphty-element: while a filter
 * card's workspace is open the table is not drawn and takes no input (the workspace's matches strip
 * is the one table under the preview), and after Done the table lists what the canvas draws -- the
 * shown edges, with no Group column and no Matches only -- never the card's matches over the
 * whole graph. Driven by real clicks and keys.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { GRAPH_FILE_GML } from "../../data-place/fixtures";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The outline-and-pane selection editor: the `selection-workspace` experiment stays off here.
withFeatures([]);

describe("the data table beside a selection editor", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("is hidden and inert while the workspace is open, and lists the shown records after Done", async () => {
        const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 }, place: "data" });
        render(<Workspace store={store} registrations={REGISTRATIONS} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        const live = session;
        await live.data.import({ type: "gml", name: "les-miserables.gml", config: { data: GRAPH_FILE_GML } });
        // A first filter hides Marius (the only name without an "e"), and with him the edge 3-4.
        await live.visibility.addCondition({
            effect: "keep",
            rule: { kind: "text", reads: "data.label", mode: "substring", text: "e" },
        });

        // The edge column `value`'s Filter to... opens a new card in the selection workspace.
        await columnVerb("edge", "value", "Filter to...");
        const from = await screen.findByRole("textbox", { name: "value from, number" });
        await userEvent.clear(from);
        await userEvent.type(from, "9{Enter}");
        await waitFor(() => {
            assert.lengthOf(live.visibility.conditions, 2);
        });

        // While the workspace is open the table keeps its place but is not drawn and takes no input.
        const ws = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found, "the workspace is open");
            return found;
        });
        const dock = document.querySelector<HTMLElement>(".ws-dock");
        assert.isNotNull(dock);
        assert.isTrue(dock?.inert, "the table takes no input or focus");
        assert.equal(dock === null ? "" : getComputedStyle(dock).visibility, "hidden");
        assert.isNull(screen.queryByRole("region", { name: "Table" }));

        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"));
        });

        // The card's matches over the whole graph are 4 edges; the canvas draws 3 of them.
        const shown = live.visibility.summary.visibleEdges;
        assert.equal(shown, 3);
        const table = await screen.findByRole("region", { name: "Table" });
        assert.isFalse(table.inert);
        await waitFor(() => {
            const grid = within(table).getByRole("grid", { name: "Edges" });
            assert.lengthOf(within(grid).getAllByRole("row").slice(1), shown);
        });
        assert.isNull(within(table).queryByRole("columnheader", { name: /^Group/ }));
        assert.isNull(within(table).queryByText("Matches only"));
    });
});
