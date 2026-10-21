/**
 * A yes-or-no column on the REAL graphty-element: graphty-element types it `boolean`, and the app
 * writes it one way everywhere -- Yes and No in the node's values, the selection's summary and
 * Find's value rows -- marks it with the yes-or-no icon in Data > Attributes, and a filter step on
 * it offers Yes and No and keeps the nodes that hold Yes.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { assert, beforeAll, describe, it } from "vitest";
import { page } from "vitest/browser";

import { columnVerb } from "../../../test/column-header";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** Five people, three of them trained: a GraphML file whose `trained` column is typed boolean. */
const TRAINED_GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="trained" for="node" attr.name="trained" attr.type="boolean"/>
  <graph id="G" edgedefault="undirected">
    <node id="a"><data key="trained">true</data></node>
    <node id="b"><data key="trained">true</data></node>
    <node id="c"><data key="trained">false</data></node>
    <node id="d"><data key="trained">true</data></node>
    <node id="e"><data key="trained">false</data></node>
    <edge source="a" target="b"/>
    <edge source="b" target="c"/>
    <edge source="c" target="d"/>
    <edge source="d" target="e"/>
  </graph>
</graphml>`;

/**
 * Renders the workspace on a place, waits for the session and loads the file.
 * @param place - the place to open on.
 * @returns the session and the chrome store.
 */
async function openWithGraph(place: "data" | "graph"): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    const store = createWorkspaceStore({ project: { name: "Volunteers", id: 1 }, place });
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
    await session.data.import({ type: "graphml", name: "volunteers.graphml", config: { data: TRAINED_GRAPHML } });
    return { session, store };
}

describe("A yes-or-no column", () => {
    beforeAll(async () => {
        await page.viewport(1366, 768);
    });

    it("is a yes-or-no column, and a filter step on it from the table header keeps the Yes nodes", async () => {
        const { session } = await openWithGraph("data");
        assert.equal(session.data.attributes().find((a) => a.path === "data.trained")?.type, "boolean");

        // Filter to... from the column's header in the table (the Data place lists no attributes).
        await columnVerb("node", "trained", "Filter to...");
        // The step is the yes-or-no condition card: Yes or No, starting at Yes, then whether it has one.
        const is = await screen.findByRole<HTMLInputElement>("combobox", { name: "trained: how to match" });
        assert.equal(is.value, "Yes");
        await userEvent.click(is);
        const listbox = await screen.findByRole("listbox");
        assert.deepEqual(
            within(listbox)
                .getAllByRole("option")
                .map((option) => option.textContent),
            ["Yes", "No", "Has a value", "Has no value"],
        );
        await userEvent.click(within(listbox).getByRole("option", { name: "Yes" }));
        await userEvent.click(screen.getByRole("button", { name: "Add step" }));

        await waitFor(() => {
            assert.equal(session.visibility.steps.length, 1);
        });
        assert.deepEqual(session.visibility.steps[0].rule, {
            kind: "text",
            reads: "data.trained",
            mode: "exact",
            text: "true",
            caseSensitive: true,
        });
        assert.equal(session.visibility.summary.visibleNodes, 3);
        await screen.findByRole("treeitem", { name: /trained is Yes/ });
    });

    it("reads Yes and No in a node's values, the selection's summary and Find's value rows", async () => {
        const { session } = await openWithGraph("graph");
        const inspector = within(screen.getByRole("complementary", { name: "Inspector" }));
        /**
         * Opens the inspector's Values tab, when it draws tabs.
         */
        const values = async (): Promise<void> => {
            const tab = await inspector.findByRole("tab", { name: "Values" });
            if (tab.getAttribute("aria-selected") !== "true") {
                await userEvent.click(tab);
            }
        };

        await session.selection.apply({ nodes: ["c"] });
        await values();
        const row = await inspector.findByText("trained");
        await waitFor(() => {
            assert.include(row.parentElement?.textContent ?? "", "No");
        });
        assert.notInclude(row.parentElement?.textContent ?? "", "false");

        session.selection.clear();
        await session.selection.apply({ nodes: ["a", "b", "d"] });
        await values();
        await inspector.findByText("Yes (3)");

        session.selection.clear();
        await userEvent.type(screen.getByRole("combobox", { name: "Find" }), "true");
        const list = await screen.findByRole("listbox", { name: "Find results" });
        await waitFor(() => {
            const words = within(list)
                .getAllByRole("option")
                .map((option) => option.textContent ?? "");
            assert.isTrue(
                words.some((each) => each.includes("trained is Yes (3)")),
                words.join(" | "),
            );
        });
    });
});
