/**
 * Tier 1 tasks T3, T4 and T5 on the REAL graphty-element, each from the empty app: the Data page
 * opens a graph file, joins a node table and an edge table with the match report, and refuses a
 * file it cannot read while the app stays usable. Every count asserted is one the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { assert, describe, it } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { openDataPage } from "../request";

/** A hang guard for the element coming up and loading, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

const GML = `graph [
  directed 0
  node [ id 0 label "Myriel" ]
  node [ id 1 label "Napoleon" ]
  node [ id 2 label "Valjean" ]
  edge [ source 1 target 0 value 1 ]
  edge [ source 2 target 0 value 5 ]
]`;
const PEOPLE = "id,name,team\na,Ann,red\nb,Bo,blue\nc,Cy,red\n";
/** One edge names `z`, which the node file does not hold. */
const TIES = "source,target,weight\na,b,2\nb,c,5\nc,z,1\n";

/**
 * From the empty app, opens the Data page as New from data... does, and waits for the element.
 * @returns the store and the element's session.
 */
async function openFromEmptyApp(): Promise<{ store: WorkspaceStore; session: GraphSession }> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    act(() => {
        openDataPage(store, { intent: "new" });
    });
    await screen.findByRole("heading", { name: "Open as a new graph" });
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
    return { store, session };
}

/**
 * Hands files to the page as the file picker does.
 * @param files - the files.
 */
async function chooseFiles(...files: File[]): Promise<void> {
    await userEvent.upload(screen.getByTestId("data-page-file-input"), files);
}

/**
 * The Load button.
 * @returns the button.
 */
function loadButton(): HTMLElement {
    return screen.getByRole("button", { name: "Load" });
}

describe("the Data page on the real element", () => {
    it(
        "T3: opens a graph file with every check green and focus on Load, and Enter loads it",
        async () => {
            const { store, session } = await openFromEmptyApp();
            await chooseFiles(new File([GML], "les-miserables.gml"));

            const strip = await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            assert.equal(strip.textContent, "les-miserables: 3 nodes, 2 edges");
            const tables = screen.getByRole("navigation", { name: "Tables" });
            assert.lengthOf(within(tables).getAllByLabelText("Ready"), 2, "the node and edge tables are ready");
            assert.isNotNull(screen.getAllByText("Set by the file")[0]);
            await waitFor(() => {
                assert.equal(document.activeElement, loadButton());
            });
            assert.isNull(loadButton().getAttribute("aria-disabled"));

            await userEvent.keyboard("{Enter}");
            await waitFor(
                () => {
                    assert.equal(session.data.lastImport()?.counts.nodes, 3);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.lastImport()?.counts.edges, 2);
            assert.equal(store.get().page, "panels");
            assert.equal(store.get().place, "graph");
            assert.equal(store.get().project?.name, "les-miserables");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T4: loads a node CSV and an edge CSV as one network with the match report",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));

            const strip = await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            // Leave out is the default: the edge to z is dropped.
            assert.equal(strip.textContent, "node (3) --ties (2)--> node");
            const report = screen.getByRole("region", { name: "Match report" });
            assert.include(report.textContent, "1 edge row name 1 node no node row holds.");

            await userEvent.click(within(report).getByRole("button", { name: "Show the 1 unmatched row" }));
            await screen.findByText("1 unmatched row");
            const grid = screen.getByRole("grid", { name: "Rows of ties.csv" });
            assert.isNotNull(within(grid).getByText("z"));

            await userEvent.click(within(report).getByText("Add"));
            await waitFor(() => {
                assert.equal(screen.getByTestId("model-strip").textContent, "node (4) --ties (3)--> node");
            });

            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(session.data.lastImport()?.counts.edges, 3);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.lastImport()?.counts.nodes, 4);
            assert.deepEqual(session.data.lastImport()?.unmatched, { rows: 1, values: 1 });
            assert.equal(session.data.node("a")?.name, "Ann");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T5: refuses a file it cannot read with one problem block, and the app stays usable",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File(["<graphml"], "broken.graphml"));

            const alert = await screen.findByRole("alert", {}, { timeout: TIMEOUT_MS });
            assert.include(alert.textContent, "broken.graphml holds no nodes or edges.");
            assert.equal(loadButton().getAttribute("aria-disabled"), "true");
            await userEvent.click(loadButton());
            assert.isNull(session.data.lastImport(), "a disabled Load loads nothing");
            assert.isNotNull(within(alert).getByRole("button", { name: "Choose another file..." }));

            await chooseFiles(new File([GML], "les-miserables.gml"));
            await screen.findByText("les-miserables: 3 nodes, 2 edges", {}, { timeout: TIMEOUT_MS });
            assert.isNull(screen.queryByRole("alert"));
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(session.data.lastImport()?.counts.nodes, 3);
                },
                { timeout: TIMEOUT_MS },
            );
        },
        TIMEOUT_MS * 2,
    );

    it(
        "Cancel and Esc return to where the reader came from",
        async () => {
            const { store } = await openFromEmptyApp();
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
            assert.isNull(store.get().project, "a new graph's Cancel returns to the start screen");

            act(() => {
                store.set({ project: { name: "Ring", id: 7 }, page: "panels" });
                openDataPage(store, { intent: "add" });
            });
            const heading = await screen.findByRole("heading", { name: "Add to Ring" });
            await userEvent.click(heading);
            await userEvent.keyboard("{Escape}");
            assert.equal(store.get().page, "panels");
            assert.equal(store.get().project?.name, "Ring");
        },
        TIMEOUT_MS * 2,
    );
});
