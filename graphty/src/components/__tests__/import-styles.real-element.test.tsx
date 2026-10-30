/**
 * The reader's "import styles from files" preference on the REAL graphty-element: the Data page's
 * checkbox, Settings and the start screen's drop (the path Open takes) each load
 * a styled GEXF with or without the file's own style layers, as the preference says. Every color
 * and layer asserted is read through the element's public API.
 */
// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { fileStyleOf, type GraphSession } from "@graphty/graphty-element/session";
import { act } from "react";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../test/test-utils";
import { openDataPage } from "../../workspace/data-page/request";
import { IMPORT_FILE_STYLES } from "../../workspace/settings/preferences";
import { createWorkspaceStore } from "../../workspace/state/store";
import { Workspace } from "../../workspace/Workspace";

/**
 * Twelve nodes in two groups, each group with its own viz color: red for x, blue for y. The first
 * node is an image, which graphty draws as Gephi's disc and notes, so the load has a difference to
 * tell the reader about; every other viz value here is drawn as the file says.
 */
const GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<graph defaultedgetype="undirected"><attributes class="node"><attribute id="0" title="group" type="string"/></attributes>
<nodes>
${Array.from({ length: 12 }, (_unused, i) => {
    const x = i % 3 !== 0;
    return `<node id="n${String(i)}"><attvalues><attvalue for="0" value="${x ? "x" : "y"}"/></attvalues><viz:color r="${x ? "255" : "0"}" g="0" b="${x ? "0" : "255"}"/>${i === 0 ? '<viz:shape value="image" uri="n0.png"/>' : ""}</node>`;
}).join("\n")}
</nodes><edges><edge source="n0" target="n1"/></edges></graph></gexf>`;

const CSV = "source,target\na,b\nb,c\n";

/** The Data page's checkbox. */
const CHECKBOX = "Import styles from the file";

/**
 * A fresh styled GEXF file.
 * @returns the file.
 */
function styledGexf(): File {
    return new File([GEXF], "groups.gexf", { type: "application/xml" });
}

/**
 * The layers a file's styles made.
 * @param session - the element's session.
 * @returns their ids.
 */
function fileLayers(session: GraphSession): string[] {
    return session.styles
        .list()
        .filter((layer) => fileStyleOf(layer) !== null)
        .map((layer) => layer.id);
}

/**
 * What a node is drawn with, as the element explains it.
 * @param session - the element's session.
 * @param id - the node.
 * @returns its color as `#rrggbb`, or undefined when no layer sets one.
 */
function colorOf(session: GraphSession, id: string): string | undefined {
    const value = (session.styles.explain({ node: id }).merged as Record<string, unknown>)["node.color"] as
        { hex?: string } | string | undefined;
    const hex = typeof value === "string" ? value : value?.hex;
    return hex?.slice(0, 7).toLowerCase();
}

/**
 * Waits for the page's element and its session.
 * @returns the session.
 */
async function elementSession(): Promise<GraphSession> {
    let session: GraphSession | undefined;
    await waitFor(() => {
        // The start screen draws a graph of its own; the project's element is the other one.
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

/**
 * Waits until the element has finished the import of the styled GEXF's twelve nodes and every
 * style write it queued has painted. Every case waits on this, with the preference on or off, so
 * an off case cannot pass by looking before the file's layers would have arrived. (The history is
 * no witness here: the workspace starts a newly opened graph with an empty undo list.)
 * @param session - the element's session.
 */
async function loadedTwelve(session: GraphSession): Promise<void> {
    await waitFor(() => {
        assert.equal(session.data.lastImport()?.counts.nodes, 12);
    });
    await session.styles.settled();
}

/**
 * From the empty app, opens the Data page as New from data... does and hands it a file.
 * @param file - the file the reader picks.
 * @returns the element's session.
 */
async function dataPageWith(file: File): Promise<GraphSession> {
    const store = createWorkspaceStore();
    render(<Workspace store={store} />);
    act(() => {
        openDataPage(store, { intent: "new" });
    });
    await screen.findByRole("heading", { name: "Open as a new graph" });
    const session = await elementSession();
    dropOn(screen.getByRole("region", { name: "Data page" }), file);
    await screen.findByTestId("model-strip", {});
    return session;
}

/**
 * Drops a file as the browser does, on a target. A synthetic DragEvent, the one exception to real
 * input here: a page cannot start a drag of a file from the operating system, and Playwright's
 * drag-and-drop moves page elements, never files.
 * @param target - where it is dropped.
 * @param file - the file.
 */
function dropOn(target: EventTarget, file: File): void {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    for (const type of ["dragover", "drop"]) {
        target.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

beforeEach(() => {
    localStorage.removeItem(IMPORT_FILE_STYLES.key);
});

afterEach(() => {
    localStorage.removeItem(IMPORT_FILE_STYLES.key);
});

describe("import styles from files, on the real element", () => {
    it("the Data page loads a styled GEXF's layers with the box checked, and shows them in the layer list", async () => {
        const session = await dataPageWith(styledGexf());
        const box = await screen.findByRole("checkbox", { name: CHECKBOX });
        assert.isTrue((box as HTMLInputElement).checked, "on by default");

        await userEvent.click(screen.getByRole("button", { name: "Load" }));
        await loadedTwelve(session);
        await waitFor(() => {
            assert.isNotEmpty(fileLayers(session));
        });
        assert.equal(colorOf(session, "n1"), "#ff0000");
        assert.equal(colorOf(session, "n0"), "#0000ff");
        // The paint tree words each of the file's layers from its facts.
        assert.isNotEmpty(await screen.findAllByText(/from the file/i, {}));
        // Gephi's disc is drawn as the flat ellipse of the same name, so the load names no shape drawn as a nearest one.
        assert.isNull(screen.queryByText(/drawn as the nearest one graphty has \(node shape\)/));
    });

    it("the Data page loads none of the file's layers with the box unchecked, and keeps that choice", async () => {
        const session = await dataPageWith(styledGexf());
        await userEvent.click(await screen.findByRole("checkbox", { name: CHECKBOX }));
        assert.equal(localStorage.getItem(IMPORT_FILE_STYLES.key), "off");

        await userEvent.click(screen.getByRole("button", { name: "Load" }));
        await loadedTwelve(session);
        assert.deepEqual(fileLayers(session), []);
        assert.notEqual(colorOf(session, "n1"), "#ff0000");
    });

    it("offers no checkbox for a CSV file", async () => {
        await dataPageWith(new File([CSV], "ties.csv", { type: "text/csv" }));
        assert.isNull(screen.queryByRole("checkbox", { name: CHECKBOX }));
    });

    it("keeps the Settings choice across a reload", async () => {
        const first = render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(screen.getByRole("button", { name: /settings/i }));
        const on = await screen.findByRole("switch", { name: /^Import styles from files/ });
        assert.isTrue((on as HTMLInputElement).checked);
        await userEvent.click(on);
        first.unmount();

        render(<Workspace store={createWorkspaceStore()} />);
        await userEvent.click(screen.getByRole("button", { name: /settings/i }));
        const off = await screen.findByRole("switch", { name: /^Import styles from files/ });
        assert.isFalse((off as HTMLInputElement).checked);
    });

    for (const preference of ["on", "off"] as const) {
        it(`a file dropped on the start screen (the Open path) honors the preference ${preference}`, async () => {
            localStorage.setItem(IMPORT_FILE_STYLES.key, preference);
            render(<Workspace store={createWorkspaceStore()} />);
            dropOn(globalThis, styledGexf());
            // A data file dropped on the start screen is drawn at once, with the preference's choice.
            const session = await elementSession();
            await loadedTwelve(session);
            if (preference === "on") {
                await waitFor(() => {
                    assert.equal(colorOf(session, "n1"), "#ff0000");
                });
                assert.isNotEmpty(fileLayers(session));
                await screen.findByText(/The file's styles are drawn, with these differences/, {});
            } else {
                assert.deepEqual(fileLayers(session), []);
                assert.isNull(screen.queryByText(/The file's styles are drawn/));
            }
        });
    }
});
