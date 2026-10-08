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
import { page } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
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
/** Three edges name `y` or `z`, neither of which the node file holds. */
const TIES_SEVERAL_UNMATCHED = "source,target,weight\na,b,2\nc,z,1\nz,a,4\nb,y,3\n";
/** Trips between stations, under linking columns the element does not recognize. */
const TRIPS = "from_station,to_station,trips\nx,y,10\ny,z,3\nz,x,7\n";

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
 * Waits for the element's session on the page.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
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
    return session;
}

/**
 * Picks an option from a select, by its label and the option's words.
 * @param label - the select's label.
 * @param option - the option's words.
 */
async function pick(label: string, option: string): Promise<void> {
    await userEvent.click(screen.getByRole("combobox", { name: label }));
    await userEvent.click(await screen.findByRole("option", { name: option }));
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
            const tables = screen.getByRole("region", { name: "Tables" });
            assert.lengthOf(
                within(tables).getAllByLabelText("Ready"),
                3,
                "the file and its node and edge tables are ready",
            );
            assert.isNotNull(within(tables).getByText("les-miserables.gml"), "a graph file is one row named after it");
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
            assert.include(report.textContent, "1 edge row names 1 node no node row holds.");

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
        "the match report's verb agrees with several unmatched edge rows",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES_SEVERAL_UNMATCHED], "ties.csv"));

            await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            const report = screen.getByRole("region", { name: "Match report" });
            assert.include(report.textContent, "3 edge rows name 2 nodes no node row holds.");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "T5: refuses an empty file with one problem block, and the app stays usable",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File([""], "empty.csv"));

            const alert = await screen.findByRole("alert", {}, { timeout: TIMEOUT_MS });
            assert.include(alert.textContent, "empty.csv holds no nodes or edges.");
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
        "T5: refuses a file that does not parse, naming the format it was read as",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File(["graph ["], "ring.gml"));

            const alert = await screen.findByRole("alert", {}, { timeout: TIMEOUT_MS });
            assert.include(alert.textContent, "ring.gml could not be read as GML.");
            assert.equal(loadButton().getAttribute("aria-disabled"), "true");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "names the columns when no column links the edges, and loads once the reader sets From, To and Weight",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File([TRIPS], "trips.csv"));

            const alert = await screen.findByRole("alert", {}, { timeout: TIMEOUT_MS });
            assert.include(alert.textContent, "The file has: from_station, to_station, trips.");
            assert.equal(loadButton().getAttribute("aria-disabled"), "true");

            await pick("from_station", "From -> node");
            await pick("to_station", "To -> node");
            await waitFor(() => {
                assert.equal(screen.getByTestId("model-strip").textContent, "node (3) --trips (3)--> node");
            });
            assert.isNull(screen.queryByRole("alert"));
            assert.isNull(loadButton().getAttribute("aria-disabled"));
            assert.notEqual(document.activeElement, loadButton(), "an edit back to ready leaves focus where it is");
            assert.isNotNull(screen.getByText("Weight: none (each edge counts 1)"));

            await pick("trips", "Weight");
            await screen.findByText("Weight: trips");
            await pick("Direction", "Directed");
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(session.data.lastImport()?.counts.edges, 3);
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.lastImport()?.weights.attribute, "trips");
            assert.isTrue(session.config.data.directed);
        },
        TIMEOUT_MS * 2,
    );

    it(
        "reads the file again when File settings change",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File(["source;target\na;b\nb;c\n"], "ties.csv"));
            await waitFor(
                () => {
                    assert.equal(screen.getByTestId("model-strip").textContent, "node (3) --ties (2)--> node");
                },
                { timeout: TIMEOUT_MS },
            );

            await userEvent.click(screen.getByRole("button", { name: /^File settings/ }));
            await pick("Separator", "Tab");
            // Read again with tabs, the file is one column.
            await screen.findByRole("combobox", { name: "source;target" }, { timeout: TIMEOUT_MS });
        },
        TIMEOUT_MS * 2,
    );

    it(
        "lists each load in Sources, and Edit source... reopens a load on its own tables and roles",
        async () => {
            await page.viewport(1366, 768);
            const { store } = await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));
            await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            await pick("name", "Attribute");
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );

            act(() => {
                openDataPage(store, { intent: "add" });
            });
            await chooseFiles(new File(["source,target\nc,d\n"], "more.csv"));
            const report = await screen.findByRole("region", { name: "Match report" }, { timeout: TIMEOUT_MS });
            await userEvent.click(await within(report).findByText("Add", {}, { timeout: TIMEOUT_MS }));
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );

            act(() => {
                store.set({ place: "data" });
            });
            const sources = await screen.findByRole("tree", { name: "Sources" });
            const first = within(sources).getByRole("treeitem", { name: "people.csv and ties.csv" });
            assert.isNotNull(
                within(sources).getByRole("treeitem", { name: "more.csv" }),
                "the second load has its row",
            );
            assert.isNotNull(within(sources).getByRole("treeitem", { name: "ties.csv" }), "a load lists its tables");

            first.focus();
            await userEvent.keyboard("{Shift>}{F10}{/Shift}");
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit source..." }));
            await screen.findByRole("heading", { name: "Add to people" });
            const tables = await screen.findByRole("region", { name: "Tables" }, { timeout: TIMEOUT_MS });
            assert.isNotNull(await within(tables).findByText("Nodes: people.csv", {}, { timeout: TIMEOUT_MS }));
            assert.isNotNull(within(tables).getByText("Edges: ties.csv"));
            await waitFor(
                () => {
                    assert.equal(
                        screen.getByRole<HTMLInputElement>("combobox", { name: "name" }).value,
                        "Attribute",
                        "the role the reader chose comes back",
                    );
                },
                { timeout: TIMEOUT_MS },
            );
        },
        TIMEOUT_MS * 3,
    );

    it(
        "Sources says a load left a row out; the source's inspector counts it and shows it on the Data page",
        async () => {
            await page.viewport(1366, 768);
            const { store } = await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "passes.csv"));
            await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            // Leave out is the default: the row naming z is left out.
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );

            act(() => {
                store.set({ place: "data" });
            });
            const sources = await screen.findByRole("tree", { name: "Sources" });
            const row = within(sources).getByRole("treeitem", { name: "people.csv and passes.csv" });
            assert.include(row.textContent, "3 nodes, 2 edges, 1 row left out");

            await userEvent.click(within(row).getAllByText("people.csv and passes.csv")[0]);
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            await within(inspector).findByText("1 edge row was left out: it names 1 node no node row holds.");

            await userEvent.click(within(inspector).getByText("Show the left-out row"));
            await screen.findByRole("heading", { name: "Add to people" });
            await screen.findByText("1 unmatched row", {}, { timeout: TIMEOUT_MS });
            const grid = screen.getByRole("grid", { name: "Rows of passes.csv" });
            assert.isNotNull(within(grid).getByText("z"));
        },
        TIMEOUT_MS * 3,
    );

    it(
        "Sources says nothing was left out when a load kept every row",
        async () => {
            const { store } = await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "passes.csv"));
            const report = await screen.findByRole("region", { name: "Match report" }, { timeout: TIMEOUT_MS });
            await userEvent.click(await within(report).findByText("Add", {}, { timeout: TIMEOUT_MS }));
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );

            act(() => {
                store.set({ place: "data" });
            });
            const sources = await screen.findByRole("tree", { name: "Sources" });
            const row = within(sources).getByRole("treeitem", { name: "people.csv and passes.csv" });
            assert.notInclude(row.textContent, "left out");
            await userEvent.click(within(row).getAllByText("people.csv and passes.csv")[0]);
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            await within(inspector).findByText("Added");
            assert.notInclude(inspector.textContent, "left out");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "an edge table added to a graph lists the unmatched rows its report counts",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Ring", id: 7 } });
            render(<Workspace store={store} />);
            const session = await elementSession();
            await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
            act(() => {
                openDataPage(store, { intent: "add" });
            });
            await screen.findByRole("heading", { name: "Add to Ring" });
            await chooseFiles(new File([TIES], "ties.csv"));

            const report = await screen.findByRole("region", { name: "Match report" }, { timeout: TIMEOUT_MS });
            await userEvent.click(
                await within(report).findByRole(
                    "button",
                    { name: "Show the 1 unmatched row" },
                    { timeout: TIMEOUT_MS },
                ),
            );
            await screen.findByText("1 unmatched row");
            const grid = screen.getByRole("grid", { name: "Rows of ties.csv" });
            assert.isNotNull(within(grid).getByText("z"));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "Add data... adds to the open project without renaming it",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Ring", id: 7 } });
            render(<Workspace store={store} />);
            const session = await elementSession();
            await session.data.addNodes([{ id: "a" }, { id: "b" }]);
            act(() => {
                void createRegistry(REGISTRATIONS).built("data.add")?.run({ workspace: store, session, element: null });
            });
            await screen.findByRole("heading", { name: "Add to Ring" });

            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));
            // z is in no node row and not in the graph: Add makes it.
            const report = await screen.findByRole("region", { name: "Match report" }, { timeout: TIMEOUT_MS });
            await userEvent.click(await within(report).findByText("Add", {}, { timeout: TIMEOUT_MS }));
            await waitFor(() => {
                assert.equal(screen.getByTestId("model-strip").textContent, "node (4) --ties (3)--> node");
            });
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.statistics().nodeCount, 4, "a, b and c kept or added, and z added");
            assert.equal(store.get().project?.name, "Ring");
        },
        TIMEOUT_MS * 2,
    );

    it(
        "reads a new-graph door inside a project as Add to the project",
        async () => {
            const store = createWorkspaceStore({ project: { name: "Ring", id: 7 } });
            render(<Workspace store={store} />);
            act(() => {
                openDataPage(store, { intent: "new" });
            });
            await screen.findByRole("heading", { name: "Add to Ring" });
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
            assert.equal(store.get().project?.name, "Ring", "Cancel keeps the reader's project");
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

    it(
        "says what a CSV's weight means under Higher means, and the graph inspector reads it back",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File(["from,to,emails\np01,p02,14\np02,p03,9\n"], "messages.csv"));
            await screen.findByText("Weight: none (each edge counts 1)", {}, { timeout: TIMEOUT_MS });
            await pick("emails", "Weight");

            const higher = await screen.findByRole("radiogroup", { name: "Higher means" }, { timeout: TIMEOUT_MS });
            // Unset until the reader chooses: nothing checked, and the gloss for an unset weight.
            assert.lengthOf(
                within(higher)
                    .getAllByRole("radio")
                    .filter((radio) => (radio as HTMLInputElement).checked),
                0,
            );
            await userEvent.click(within(higher).getByText("Closer"));
            await screen.findByText("larger = closer");

            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.deepEqual(session.data.loadedWeight(), { attribute: "emails", meaning: "strength" });
                },
                { timeout: TIMEOUT_MS },
            );
            await screen.findByText("Loaded weight", {}, { timeout: TIMEOUT_MS });
            assert.isNotNull(screen.getByText("emails (closer)"));
        },
        TIMEOUT_MS * 2,
    );

    it(
        "says an edge table with no weight counts each edge 1",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File(["source,target\na,b\nb,c\n"], "plain.csv"));
            await screen.findByText("Weight: none (each edge counts 1)", {}, { timeout: TIMEOUT_MS });
            assert.isNull(screen.queryByRole("radiogroup", { name: "Higher means" }));
        },
        TIMEOUT_MS * 2,
    );
});
