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
import { INSPECTOR_TITLE_ID } from "../../frame/focus";
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
/** What Higher means says before the reader chooses. */
const UNSET_HINT =
    "Choose what a higher weight means. Until you do, a path counts every edge as one step, and PageRank and communities read a higher weight as closer.";
/** Twelve people, two of them with names longer than the grid's default column. */
const STAFF = [
    "id,name,team",
    ...Array.from(
        { length: 12 },
        (_, i) => `p${String(i + 1)},${i === 3 ? "Dmitri Volkov-Lindqvist" : `Person ${String(i + 1)}`},Programs`,
    ),
].join("\n");
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

/**
 * The relative luminance of a computed `rgb()` / `rgba()` color (WCAG 2.x).
 * @param color - the computed color.
 * @returns its channels (0-255) and alpha.
 */
function channels(color: string): [number, number, number, number] {
    const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return [r, g, b, a];
}

/**
 * The relative luminance of three 0-255 channels.
 * @param rgb - the channels.
 * @returns the luminance.
 */
function luminance(rgb: number[]): number {
    const [r = 0, g = 0, b = 0] = rgb.map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * The contrast of an element's text against the first opaque background behind it.
 * @param element - the text's element.
 * @returns the ratio, such as 4.5.
 */
function contrastOnPage(element: HTMLElement): number {
    let surface: HTMLElement | null = element;
    let back = channels("rgb(255, 255, 255)");
    while (surface !== null) {
        const found = channels(getComputedStyle(surface).backgroundColor);
        if (found[3] === 1) {
            back = found;
            break;
        }
        surface = surface.parentElement;
    }
    const [r, g, b, a] = channels(getComputedStyle(element).color);
    const text = [r * a + back[0] * (1 - a), g * a + back[1] * (1 - a), b * a + back[2] * (1 - a)];
    const [hi, lo] = [luminance(text), luminance(back)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

/**
 * Asserts that elements come in this document order.
 * @param elements - the elements, in the expected order.
 */
function assertInOrder(...elements: HTMLElement[]): void {
    for (let i = 1; i < elements.length; i++) {
        assert.isTrue(
            Boolean(elements[i - 1].compareDocumentPosition(elements[i]) & Node.DOCUMENT_POSITION_FOLLOWING),
            `"${elements[i - 1].textContent}" comes before "${elements[i].textContent}"`,
        );
    }
}

describe("the Data page on the real element", () => {
    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "T4: loads a node CSV and an edge CSV as one network with the match report",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));

            const strip = await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            // Leave out is the default: the edge to z is dropped.
            assert.equal(strip.textContent, "people and ties: 3 nodes, 2 edges");
            const report = screen.getByRole("region", { name: "Match report" });
            assert.include(report.textContent, "1 edge row names a node missing from the node rows.");

            await userEvent.click(within(report).getByRole("button", { name: "Show the 1 unmatched row" }));
            const sentence = await screen.findByText("1 unmatched row: z has no node row");
            assert.equal(getComputedStyle(sentence).fontSize, "11px", "the unmatched sentence at the body size");
            const grid = screen.getByRole("grid", { name: "Rows of ties.csv" });
            // The target end names no node, so its cell is marked; the source end, c, is not.
            const marked = [...grid.querySelectorAll(".dp-missing-end")].map((cell) => cell.textContent);
            assert.deepEqual(marked, ["z (no node row)"]);
            assert.isNotNull(within(grid).getByText("c"));

            await userEvent.click(within(report).getByText("Add"));
            await waitFor(() => {
                assert.equal(screen.getByTestId("model-strip").textContent, "people and ties: 4 nodes, 3 edges");
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "a table with a row the load leaves out wears a warning with the count, and only the way back shows",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));
            await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            const tables = screen.getByRole("region", { name: "Tables" });
            const report = screen.getByRole("region", { name: "Match report" });

            // The edge table is not "Ready": one of its rows will be left out, and the row says so.
            assert.lengthOf(within(tables).getAllByLabelText("Ready"), 1, "only the node table is green");
            assert.isNotNull(within(tables).getByRole("img", { name: "1 row left out" }));
            assert.isNotNull(within(tables).getByText("3 rows, 1 left out"));
            // No stray space before the semicolon, and the counts are the sentence's own size.
            assert.include(report.textContent, "3 edge rows read; the load makes");
            const sentence = report.querySelector("p");
            const link = within(report).getByRole("button", { name: "3 edge rows" });
            assert.equal(getComputedStyle(link).fontSize, getComputedStyle(sentence!).fontSize);

            // While the unmatched row shows, only Show all rows is offered.
            await userEvent.click(within(report).getByRole("button", { name: "Show the 1 unmatched row" }));
            await screen.findByText("1 unmatched row: z has no node row");
            assert.isNull(within(report).queryByRole("button", { name: /Show the 1 unmatched row/ }));
            await userEvent.click(screen.getByRole("button", { name: "Show all rows" }));
            await within(report).findByRole("button", { name: "Show the 1 unmatched row" });

            // Added, nothing is left out: the check is green again.
            await userEvent.click(within(report).getByText("Add"));
            await waitFor(() => {
                assert.lengthOf(within(tables).getAllByLabelText("Ready"), 2);
            });
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Add and Leave out read at the body size and each says what it does on hover",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));
            await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            const report = screen.getByRole("region", { name: "Match report" });

            for (const [option, hint] of [
                ["Add", "Make a node for each missing name"],
                ["Leave out", "Skip the rows whose end names no node"],
            ]) {
                const words = within(report).getByText(option);
                assert.equal(getComputedStyle(words).fontSize, "11px", `${option} at the body size`);
                await userEvent.hover(words);
                // The theme opens a tooltip after a one-second rest.
                const tip = await screen.findByText(hint, {}, { timeout: TIMEOUT_MS });
                assert.isNotNull(tip.closest('[role="tooltip"]'));
                await userEvent.unhover(words);
                await waitFor(() => {
                    assert.isNull(screen.queryByText(hint));
                });
            }
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "the match report's verb agrees with several unmatched edge rows",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES_SEVERAL_UNMATCHED], "ties.csv"));

            await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            const report = screen.getByRole("region", { name: "Match report" });
            assert.include(report.textContent, "3 edge rows name 2 nodes missing from the node rows.");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "names the columns when no column links the edges, and loads once the reader sets From, To and Weight",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File([TRIPS], "trips.csv"));

            const alert = await screen.findByRole("alert", {}, { timeout: TIMEOUT_MS });
            assert.include(alert.textContent, "The file has: from_station, to_station, trips.");
            assert.equal(loadButton().getAttribute("aria-disabled"), "true");

            await pick("Role of from_station", "From");
            await pick("Role of to_station", "To");
            await waitFor(() => {
                assert.equal(screen.getByTestId("model-strip").textContent, "trips: 3 nodes, 3 edges");
            });
            assert.isNull(screen.queryByRole("alert"));
            assert.isNull(loadButton().getAttribute("aria-disabled"));
            assert.notEqual(document.activeElement, loadButton(), "an edit back to ready leaves focus where it is");
            const none = screen.getByText("Weight: none (each edge counts 1)");
            assert.equal(getComputedStyle(none).fontSize, "11px", "the weight sentence at the body size");

            // The weight line sits below the roles, so choosing Weight moves no role box.
            const roles = screen.getByRole("group", { name: "Column roles" });
            const before = roles.getBoundingClientRect().top;
            await pick("Role of trips", "Weight");
            const line = await screen.findByText("Weight: trips");
            assert.equal(roles.getBoundingClientRect().top, before, "the roles stay where they were");
            assert.isAtLeast(line.getBoundingClientRect().top, roles.getBoundingClientRect().bottom);
            assert.isAtLeast(
                screen.getByText("Higher means").getBoundingClientRect().top,
                roles.getBoundingClientRect().bottom,
            );
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "reads the file again when File settings change",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File(["source;target\na;b\nb;c\n"], "ties.csv"));
            await waitFor(
                () => {
                    assert.equal(screen.getByTestId("model-strip").textContent, "ties: 3 nodes, 2 edges");
                },
                { timeout: TIMEOUT_MS },
            );

            await userEvent.click(screen.getByRole("button", { name: /^File settings/ }));
            await pick("Separator", "Tab");
            // Read again with tabs, the file is one column.
            await screen.findByRole("combobox", { name: "Role of source;target" }, { timeout: TIMEOUT_MS });
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Edit source... reopens the one source on its own roles, and its Load replaces the source rather than adding a copy",
        async () => {
            await page.viewport(1366, 768);
            const { store, session } = await openFromEmptyApp();
            await chooseFiles(new File([TIES], "ties.csv"));
            const report = await screen.findByRole("region", { name: "Match report" }, { timeout: TIMEOUT_MS });
            // An edge list has no node rows, and the sentence does not count them.
            assert.include(report.textContent, "3 edge rows read; the load makes");
            assert.notInclude(report.textContent, "node row");
            await pick("Role of weight", "Attribute");
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.statistics().edgeCount, 3);

            act(() => {
                store.set({ place: "data" });
            });
            const sources = await screen.findByRole("tree", { name: "Sources" });
            within(sources).getByRole("treeitem", { name: "ties.csv" }).focus();
            await userEvent.keyboard("{Shift>}{F10}{/Shift}");
            await userEvent.click(await screen.findByRole("menuitem", { name: "Edit source..." }));
            await screen.findByRole("heading", { name: "Replace: ties.csv" });
            await waitFor(
                () => {
                    assert.equal(
                        screen.getByRole<HTMLInputElement>("combobox", { name: "Role of weight" }).value,
                        "Attribute",
                        "the role the reader chose comes back",
                    );
                },
                { timeout: TIMEOUT_MS },
            );
            // A replace says so on its button, as its title does.
            await userEvent.click(screen.getByRole("button", { name: "Replace" }));
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );
            assert.equal(session.data.statistics().edgeCount, 3, "the source is replaced, not loaded twice");
            assert.lengthOf(session.data.sources(), 1);
        },
        TIMEOUT_MS * 3,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Sources says a load left a row out; the source's inspector counts it and lists the row",
        async () => {
            await page.viewport(1366, 768);
            const { store } = await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "passes.csv"));
            await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            // Every sentence the status line is given from Load on.
            const said: string[] = [];
            const stop = store.subscribe(() => {
                const { announcement } = store.get();
                if (announcement !== "" && announcement !== said.at(-1)) {
                    said.push(announcement);
                }
            });
            // Leave out is the default: the row naming z is left out.
            await userEvent.click(loadButton());
            await waitFor(
                () => {
                    assert.equal(store.get().page, "panels");
                },
                { timeout: TIMEOUT_MS },
            );
            stop();
            // The line is said once, under the header's name, with the row the load left out; its
            // region is in the page already, outside what the Data page hid, so it is spoken.
            const words = "people and passes: 3 nodes, 2 edges, 1 row left out";
            assert.deepEqual(said, [words]);
            const region = screen.getAllByRole("status").find((status) => status.textContent === words);
            assert.isDefined(region);
            assert.isNull(region?.closest("[hidden]"));

            act(() => {
                store.set({ place: "data" });
            });
            const sources = await screen.findByRole("tree", { name: "Sources" });
            const row = within(sources).getByRole("treeitem", { name: "people.csv and passes.csv" });
            assert.include(row.textContent, "3 nodes, 2 edges");
            // The counts are a second line, never sharing (and cutting) the name's line.
            assert.isNotNull(row.querySelector(".cm-tree-description"));
            assert.isNull(row.querySelector("[data-testid='tree-count']"));
            // Its own row under the source, so a narrow panel cannot cut it off.
            assert.isNotNull(within(sources).getByRole("treeitem", { name: "1 row left out" }));
            assert.equal(store.get().project?.name, "people and passes", "named after both files");

            await userEvent.click(within(row).getAllByText("people.csv and passes.csv")[0]);
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            await within(inspector).findByText("1 edge row was left out: it names a node missing from the node rows.");
            // The row itself, kept by the element with the load: no file to reopen.
            await within(inspector).findByText("Line 4: z has no node row; source c, target z, weight 1");
            // Two headed sections: what it added first, then what it left out.
            assertInOrder(
                within(inspector).getByText("Added"),
                within(inspector).getByText("Left out"),
                within(inspector).getByText("1 edge row was left out: it names a node missing from the node rows."),
            );

            // The left-out child names its load, not "Source", and shows what the load added above
            // the rows it left out; a table child its own count and its table in the dock.
            await userEvent.click(within(sources).getByText("1 row left out"));
            await waitFor(() => {
                assert.equal(document.getElementById(INSPECTOR_TITLE_ID)?.textContent, "1 row left out");
            });
            await within(inspector).findByText("Left out of people.csv and passes.csv");
            assert.isNull(within(inspector).queryByText("Source"));
            await within(inspector).findByText("Added");
            assert.isNotNull(within(inspector).getByText("Nodes"));
            assert.isNotNull(within(inspector).getByText("Edges"));
            await within(inspector).findByText("Line 4: z has no node row; source c, target z, weight 1");
            // It leads with what it names: "Left out" over the sentence and the row, "Added" below.
            assertInOrder(
                within(inspector).getByText("Left out"),
                within(inspector).getByText("1 edge row was left out: it names a node missing from the node rows."),
                within(inspector).getByText("Line 4: z has no node row; source c, target z, weight 1"),
                within(inspector).getByText("Added"),
                within(inspector).getByText("Nodes"),
            );
            await userEvent.click(within(sources).getByText("passes.csv"));
            await waitFor(() => {
                assert.equal(document.getElementById(INSPECTOR_TITLE_ID)?.textContent, "passes.csv");
            });
            assert.isNull(within(inspector).queryByText("Nodes"));
            assert.isNotNull(within(inspector).getByText("Edges"));
            assert.deepInclude(store.get(), { dockOpen: true, dockTab: "edges" });

            // The Graph place shows no source: switching to it closes the source's inspector.
            await userEvent.click(screen.getByRole("button", { name: "Graph" }));
            assert.isNull(store.get().inspected);
            assert.notEqual(document.getElementById(INSPECTOR_TITLE_ID)?.textContent, "passes.csv");
        },
        TIMEOUT_MS * 3,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
            await screen.findByText("1 unmatched row: z has no node row");
            const grid = screen.getByRole("grid", { name: "Rows of ties.csv" });
            assert.deepEqual(
                [...grid.querySelectorAll(".dp-missing-end")].map((cell) => cell.textContent),
                ["z (no node row)"],
            );
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
                // The graph and the file each under their own name, never the total under the file's.
                assert.equal(
                    screen.getByTestId("model-strip").textContent,
                    "Ring: 2 nodes, 0 edges; people and ties adds 2 nodes, 3 edges",
                );
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
            assert.equal(store.get().announcement, "Ring: 4 nodes, 3 edges");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "Esc keeps a chosen file on the page: Cancel is the way out",
        async () => {
            const { store } = await openFromEmptyApp();
            await chooseFiles(new File(["from,to,km\na,b,3\nb,c,6\n"], "trails.csv"));
            await screen.findByRole("region", { name: "Match report" }, { timeout: TIMEOUT_MS });
            await userEvent.click(screen.getByRole("heading", { name: "Open as a new graph" }));
            await userEvent.keyboard("{Escape}");
            assert.equal(store.get().page, "data-page");
            assert.isNotNull(store.get().project, "the new graph is not dropped");
            assert.isNotNull(screen.getByRole("heading", { name: "Open as a new graph" }));
            await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
            assert.isNull(store.get().project);
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "says what a CSV's weight means under Higher means, and the graph inspector reads it back",
        async () => {
            const { session } = await openFromEmptyApp();
            await chooseFiles(new File(["from,to,emails\np01,p02,14\np02,p03,9\n"], "messages.csv"));
            await screen.findByText("Weight: none (each edge counts 1)", {}, { timeout: TIMEOUT_MS });
            await pick("Role of emails", "Weight");

            const higher = await screen.findByRole("radiogroup", { name: "Higher means" }, { timeout: TIMEOUT_MS });
            // Unset until the reader chooses, and drawn so: "Not set" is the checked choice.
            const checked = (): string[] =>
                within(higher)
                    .getAllByRole<HTMLInputElement>("radio")
                    .filter((radio) => radio.checked)
                    .map((radio) => radio.labels?.[0]?.textContent ?? "");
            assert.deepEqual(checked(), ["Not set"]);
            await userEvent.click(within(higher).getByText("Closer"));
            await screen.findByText("A higher weight means a closer tie, such as more emails between two people.");
            assert.deepEqual(checked(), ["Closer"]);
            // And back: Not set leaves the weight with no meaning again.
            await userEvent.click(within(higher).getByText("Not set"));
            assert.deepEqual(checked(), ["Not set"]);
            await userEvent.click(within(higher).getByText("Closer"));

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

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "draws the unset weight's hint at the fields' 11px and at 4.5:1 contrast (WCAG 1.4.3)",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File(["from,to,emails\np01,p02,14\np02,p03,9\n"], "messages.csv"));
            await screen.findByText("Weight: none (each edge counts 1)", {}, { timeout: TIMEOUT_MS });
            await pick("Role of emails", "Weight");
            const hint = await screen.findByText(UNSET_HINT, {}, { timeout: TIMEOUT_MS });
            const ratio = contrastOnPage(hint);
            assert.isAtLeast(ratio, 4.5, `the hint measures ${ratio.toFixed(2)}:1`);
            // Mantine sizes a bare wrapper's description as its size minus 2px: 7px at xs.
            assert.equal(getComputedStyle(hint).fontSize, "11px");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "words the summary line, and its direction follows the Direction choice",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));
            const strip = await screen.findByTestId("model-strip", {}, { timeout: TIMEOUT_MS });
            assert.equal(strip.textContent, "people and ties: 3 nodes, 2 edges");
            await pick("Direction", "Undirected");
            await waitFor(() => {
                assert.equal(strip.textContent, "people and ties: 3 nodes, 2 edges; each edge goes both ways");
            });
            await pick("Direction", "Directed");
            await waitFor(() => {
                assert.equal(strip.textContent, "people and ties: 3 nodes, 2 edges; each edge goes one way");
            });
            assert.notInclude(document.body.textContent, "->", "no code notation on the page");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "shows the table the reader just added, not the first one",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File([PEOPLE], "people.csv"));
            await screen.findByRole("grid", { name: "Rows of people.csv" }, { timeout: TIMEOUT_MS });
            await userEvent.click(screen.getByRole("button", { name: "Add a table" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "File..." }));
            await chooseFiles(new File([TIES], "ties.csv"));
            await screen.findByRole("grid", { name: "Rows of ties.csv" }, { timeout: TIMEOUT_MS });
            assert.include(screen.getByRole("button", { current: true }).textContent, "Edges: ties.csv");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "draws every sample row and each name whole when the page has room",
        async () => {
            await page.viewport(1440, 900);
            await openFromEmptyApp();
            await chooseFiles(new File([STAFF], "staff.csv"));
            const grid = await screen.findByRole("grid", { name: "Rows of staff.csv" }, { timeout: TIMEOUT_MS });
            await screen.findByText("The first 12 rows of 12");
            await waitFor(() => {
                // The header and all 12 rows, with no scroll inside the table.
                assert.lengthOf(within(grid).getAllByRole("row"), 13);
            });
            const box = screen.getByTestId("data-table-viewport");
            assert.isAtMost(box.scrollHeight, box.clientHeight, "no scroll inside the table");
            const name = within(grid).getByText("Dmitri Volkov-Lindqvist");
            assert.isAtMost(name.scrollWidth, name.clientWidth, "the longest name is not cut");
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
    it(
        "names each role box after its column, says what a weight's meaning is in a sentence, and shows it in the summary",
        async () => {
            await openFromEmptyApp();
            await chooseFiles(new File(["from,to,km\na,b,3\nb,c,6\n"], "trails.csv"));
            await screen.findByText("Weight: none (each edge counts 1)", {}, { timeout: TIMEOUT_MS });
            // The column's name above its role box opens that box's list.
            await userEvent.click(screen.getByText("km", { selector: "label" }));
            await screen.findByRole("option", { name: "Weight" });
            await userEvent.keyboard("{Escape}");
            await pick("Role of km", "Weight");
            await screen.findByText(UNSET_HINT, {}, { timeout: TIMEOUT_MS });
            const higher = screen.getByRole("radiogroup", { name: "Higher means" });
            await userEvent.click(within(higher).getByText("Farther"));
            await screen.findByText(
                "A higher weight means farther apart, such as a longer distance or travel time; a path takes the smallest total.",
            );
            assert.isNotNull(screen.getByText("Weight: km (farther)"));

            // The reset beside a chosen role says what it does on hover.
            await userEvent.hover(screen.getByRole("button", { name: "Reset km to default" }));
            assert.equal(
                (await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent,
                "Reset km to default",
            );
        },
        TIMEOUT_MS * 2,
    );

    // eslint-disable-next-line local/no-test-timing -- per-test timeout, to go once the slow step is found, tracked in #1636
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
