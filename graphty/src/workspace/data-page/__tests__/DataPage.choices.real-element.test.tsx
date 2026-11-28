/**
 * The Data page's less traveled paths on the REAL graphty-element: files handed to the page
 * while it is open, a replace that carries the replaced load's weight meaning, a source with no
 * name, choices taken back (Leave out, Auto separator, Import styles), unmatched ends read from
 * number ids and a table with no rows. Every count asserted is one the element reports.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { act } from "react";
import { assert, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { openDataPage } from "../request";

// Styles from files on, so the page offers Import styles; source steps off, so an addition loads
// from the page rather than being staged.
withFeatures(["file-styles"]);

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answers the next file picker with this file (graphty/vitest.config.ts). */
        chooseNextFile: (name: string, mimeType: string, text: string) => Promise<void>;
    }
}

const PEOPLE = "id,name,team\na,Ann,red\nb,Bo,blue\nc,Cy,red\n";
const TIES = "source,target,weight\na,b,2\nb,c,5\nc,z,1\n";
/** Three edges name `y` or `z`, neither of which the node file holds. */
const TIES_SEVERAL_UNMATCHED = "source,target,weight\na,b,2\nc,z,1\nz,a,4\nb,y,3\n";
const TRAILS = "from,to,km\na,b,3\nb,c,6\n";
const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><nodes>
<node id="a"><viz:color r="255" g="0" b="0"/></node><node id="b"><viz:color r="0" g="0" b="255"/></node>
</nodes><edges><edge source="a" target="b"/></edges></graph></gexf>`;

/**
 * Draws the workspace and waits for the element's session.
 * @param store - the workspace store.
 * @returns the session.
 */
async function drawWorkspace(store: WorkspaceStore): Promise<GraphSession> {
    render(<Workspace store={store} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * From the empty app, opens the Data page as New from data... does.
 * @returns the store.
 */
async function openFromEmptyApp(): Promise<WorkspaceStore> {
    const store = createWorkspaceStore();
    await drawWorkspace(store);
    act(() => {
        openDataPage(store, { intent: "new" });
    });
    await screen.findByRole("heading", { name: "Open as a new graph" });
    return store;
}

/**
 * Picks an option from a select, by its label and the option's words.
 * @param label - the select's label.
 * @param option - the option's words.
 */
async function pick(label: string, option: string): Promise<void> {
    await userEvent.click(page.getByRole("combobox", { name: label, exact: true }));
    await userEvent.click(page.getByRole("option", { name: option, exact: true }));
}

/**
 * Drops files on the Data page as the browser does. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param files - the files.
 */
async function dropFiles(...files: File[]): Promise<void> {
    const region = await screen.findByRole("region", { name: "Data page" });
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragenter", "dragover", "drop"]) {
        region.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

describe("the Data page's other paths on the real element", () => {
    it("takes files handed to it while open as a drop, ignores a door with none, and starts over on a replace", async () => {
        const store = createWorkspaceStore({ project: { name: "team", id: 1 }, place: "graph" });
        const session = await drawWorkspace(store);
        await act(async () => {
            await session.data.import({ config: { file: new File([TRAILS], "trails.csv") } });
        });
        act(() => {
            openDataPage(store, { intent: "add", files: [new File([PEOPLE], "people.csv")] });
        });
        await screen.findByRole("grid", { name: "Rows of people.csv" });

        // A file opened while the page is open joins the table on it.
        act(() => {
            openDataPage(store, { intent: "add", files: [new File([TIES], "ties.csv")] });
        });
        await screen.findByRole("grid", { name: "Rows of ties.csv" });
        // A door that hands over nothing leaves both tables where they are.
        act(() => {
            openDataPage(store, { intent: "add" });
        });
        const tables = screen.getByRole("region", { name: "Tables" });
        assert.isNotNull(within(tables).getByText("Nodes: people.csv"));
        assert.isNotNull(within(tables).getByText("Edges: ties.csv"));

        // A replace asked for while the page is open opens it again on that request.
        const [trails] = session.data.sources();
        act(() => {
            openDataPage(store, {
                intent: "replace",
                replaces: trails.key,
                files: [new File(["from,to,km\na,b,3\nb,c,6\nc,d,2\n"], "trails-2.csv")],
            });
        });
        await screen.findByRole("heading", { name: "Replace: trails-2.csv" });
        await waitFor(() => {
            assert.equal(screen.getByTestId("replace-report").textContent, "Was 3 nodes, 2 edges; now 4, 3");
        });
    });

    it("Replace with file... carries the replaced load's weight meaning onto the new file's weight", async () => {
        await page.viewport(1366, 768);
        const store = createWorkspaceStore({ project: { name: "team", id: 1 }, place: "data" });
        const session = await drawWorkspace(store);
        await act(async () => {
            await session.data.import(
                { config: { file: new File([TRAILS], "trails.csv") } },
                { mapping: { weight: "km", weightMeaning: "distance" } },
            );
        });
        assert.deepEqual(session.data.loadedWeight(), { attribute: "km", meaning: "distance" });

        const row = await screen.findByRole("listitem", { name: "trails.csv" });
        await userEvent.click(page.elementLocator(row).getByRole("button").nth(0));
        await userEvent.click(page.getByRole("button", { name: "Source actions", exact: true }));
        await commands.chooseNextFile("hikes.csv", "text/csv", "from,to,km\na,b,4\nb,c,1\n");
        await userEvent.click(page.getByRole("menuitem", { name: "Replace with file...", exact: true }));
        await screen.findByRole("heading", { name: "Replace: hikes.csv" });

        const higher = await screen.findByRole("radiogroup", { name: "Higher means" });
        await waitFor(() => {
            const checked = within(higher)
                .getAllByRole<HTMLInputElement>("radio")
                .filter((radio) => radio.checked)
                .map((radio) => radio.labels?.[0]?.textContent);
            assert.deepEqual(checked, ["Farther"]);
        });
        assert.isNotNull(screen.getByText("Weight: km (farther)", { exact: false }));
    });

    it("offers to replace a source with no name as the data", async () => {
        const store = createWorkspaceStore({ project: { name: "friends", id: 1 }, place: "graph" });
        const session = await drawWorkspace(store);
        await act(async () => {
            await session.data.import({ type: "csv", config: { data: "source,target\nAva,Ben\nBen,Cal\n" } });
        });
        assert.isUndefined(session.data.sources()[0]?.name, "a load of text names no file");
        act(() => {
            openDataPage(store, { intent: "add", files: [new File(["source,target\nAva,Ben\n"], "again.csv")] });
        });
        await screen.findByTestId("repeats", {});
        assert.isNotNull(screen.getByRole("button", { name: "Replace the data" }));
    });

    it("Leave out takes back Add, and Separator's Auto takes back a chosen separator", async () => {
        await openFromEmptyApp();
        await dropFiles(new File([PEOPLE], "people.csv"), new File([TIES], "ties.csv"));
        const strip = await screen.findByTestId("model-strip", {});
        const report = screen.getByRole("region", { name: "Match report" });
        await userEvent.click(page.elementLocator(report).getByText("Add", { exact: true }));
        await waitFor(() => {
            assert.equal(strip.textContent, "people and ties: 4 nodes, 3 edges");
        });
        await userEvent.click(page.elementLocator(report).getByText("Leave out", { exact: true }));
        await waitFor(() => {
            assert.equal(screen.getByTestId("model-strip").textContent, "people and ties: 3 nodes, 2 edges");
        });

        await userEvent.click(page.getByRole("button", { name: "Cancel", exact: true }));
        await openFromEmptyApp();
        await dropFiles(new File(["source,target\na,b\nb,c\n"], "ties.csv"));
        await waitFor(() => {
            assert.equal(screen.getByTestId("model-strip").textContent, "ties: 3 nodes, 2 edges");
        });
        await userEvent.click(page.getByRole("button", { name: /^File settings/ }));
        await pick("Separator", "Tab");
        await screen.findByRole("combobox", { name: "Role of source,target" });
        // Reading again took File settings off the page: it opens again on the separator chosen.
        await userEvent.click(page.getByRole("button", { name: "File settings: CSV, tab", exact: true }));
        await pick("Separator", "Auto");
        await screen.findByRole("combobox", { name: "Role of source" });
        assert.isNotNull(screen.getByRole("button", { name: "File settings: CSV" }));
    });

    it("marks only the end that names no node, for number ids and for each row on its own", async () => {
        await openFromEmptyApp();
        await dropFiles(new File(["id\n1\n2\n"], "ids.csv"), new File(["source,target\n1,2\n2,9\n"], "links.csv"));
        const report = await screen.findByRole("region", { name: "Match report" });
        await userEvent.click(
            page.elementLocator(report).getByRole("button", { name: "Show the 1 unmatched row", exact: true }),
        );
        await screen.findByText("1 unmatched row: 9 has no node row");

        await userEvent.click(page.getByRole("button", { name: "Cancel", exact: true }));
        await openFromEmptyApp();
        await dropFiles(new File([PEOPLE], "people.csv"), new File([TIES_SEVERAL_UNMATCHED], "ties.csv"));
        const again = await screen.findByRole("region", { name: "Match report" });
        await userEvent.click(
            page.elementLocator(again).getByRole("button", { name: "Show the 3 unmatched rows", exact: true }),
        );
        const grid = await screen.findByRole("grid", { name: "Rows of ties.csv" });
        await waitFor(() => {
            assert.deepEqual([...grid.querySelectorAll(".dp-missing-end")].map((cell) => cell.textContent).sort(), [
                "y (no node row)",
                "z (no node row)",
                "z (no node row)",
            ]);
        });
        // z,a: the source is marked, its target a is plain.
        assert.isNotNull(within(grid).getByText("a"));
    });

    it("shows a table with no rows without a sample grid", async () => {
        await openFromEmptyApp();
        await dropFiles(new File(["source,target\n"], "none.csv"));
        await screen.findByRole("combobox", { name: "Role of source" });
        assert.isNull(screen.queryByRole("grid", { name: "Rows of none.csv" }));
    });

    it("Import styles from the file can be switched off and back on", async () => {
        await openFromEmptyApp();
        await dropFiles(new File([GEXF], "two.gexf", { type: "application/xml" }));
        const box = await screen.findByRole<HTMLInputElement>("checkbox", { name: "Import styles from the file" });
        const before = box.checked;
        await userEvent.click(page.getByRole("checkbox", { name: "Import styles from the file", exact: true }));
        await waitFor(() => {
            assert.equal(box.checked, !before);
        });
        await userEvent.click(page.getByRole("checkbox", { name: "Import styles from the file", exact: true }));
        await waitFor(() => {
            assert.equal(box.checked, before);
        });
    });

    it("a replace opened with no choices carries the replaced load's weight meaning onto the new file's weight", async () => {
        const store = createWorkspaceStore({ project: { name: "team", id: 1 }, place: "graph" });
        const session = await drawWorkspace(store);
        await act(async () => {
            await session.data.import(
                { config: { file: new File([TIES], "ties.csv") } },
                { mapping: { weight: "weight", weightMeaning: "distance" } },
            );
        });
        const [ties] = session.data.sources();
        act(() => {
            openDataPage(store, {
                intent: "replace",
                replaces: ties.key,
                files: [new File(["source,target,weight\na,b,4\nb,c,1\n"], "ties-2.csv")],
            });
        });
        await screen.findByRole("heading", { name: "Replace: ties-2.csv" });
        const higher = await screen.findByRole("radiogroup", { name: "Higher means" });
        await waitFor(() => {
            const checked = within(higher)
                .getAllByRole<HTMLInputElement>("radio")
                .filter((radio) => radio.checked)
                .map((radio) => radio.labels?.[0]?.textContent);
            assert.deepEqual(checked, ["Farther"]);
        });
    });

    it("Enter on an Error limit left as it was reads nothing again, and File settings stays open", async () => {
        await openFromEmptyApp();
        await dropFiles(new File([PEOPLE], "people.csv"));
        await screen.findByTestId("model-strip", {});
        await userEvent.click(page.getByRole("button", { name: /^File settings/ }));
        const limit = await screen.findByRole<HTMLInputElement>("textbox", { name: "Error limit" });
        await userEvent.click(page.getByRole("textbox", { name: "Error limit", exact: true }));
        await userEvent.keyboard("{Enter}");
        // A read again takes File settings off the page; with nothing changed it stays, on the box.
        assert.strictEqual(document.activeElement, limit);
        assert.isTrue(limit.isConnected);
        assert.isNotNull(screen.getByTestId("model-strip"));
    });

    it("a load the element refuses after its count keeps the page, with the refusal and Load's reason", async () => {
        await openFromEmptyApp();
        const element = document.querySelector("graphty-element");
        if (element === null) {
            throw new Error("the element never came up");
        }
        // A consumer's ceiling, honored on the batched render path: room for the file when it is
        // counted, lowered before Load is pressed.
        element.renderPath = "batched";
        element.limits = { renderCeiling: 10 };
        await dropFiles(new File([PEOPLE], "people.csv"));
        const load = await screen.findByRole("button", { name: "Load" });
        await waitFor(() => {
            assert.isNull(load.getAttribute("aria-disabled"));
        });
        element.limits = { renderCeiling: 2 };
        await userEvent.click(page.getByRole("button", { name: "Load", exact: true }));
        await screen.findByText("The load was refused; see the problem above");
        assert.include(screen.getByRole("alert").textContent, "This load would make 3 nodes; graphty draws at most 2.");
        assert.strictEqual(load.getAttribute("aria-disabled"), "true");
        assert.strictEqual(element.session.data.statistics().nodeCount, 0, "nothing was loaded");
        assert.isNotNull(screen.getByRole("heading", { name: "Open as a new graph" }), "the page stays");
    });
});
