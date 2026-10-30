/**
 * Exporting a styled graph on the REAL graphty-element: a format that cannot hold the styles
 * stops at a warning before any file is written and saves only after "Save anyway"; a format
 * that keeps them saves at once, and its file opens again with the same layers. Every file is
 * caught where the page hands it to the browser (the object URL and the anchor's click).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { createGraphSession, type GraphSession, type LayerSpec } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

const NODES = Array.from({ length: 8 }, (_unused, i) => ({ id: `n${String(i)}`, group: i % 3 === 0 ? "x" : "y" }));
const EDGES = NODES.slice(1).map((node, i) => ({ source: NODES[i].id, target: node.id }));

/** The reader's layers: one fixed color, one color by group. */
const STACK: readonly LayerSpec[] = [
    { name: "orange", target: "node", selector: { match: "everything" }, set: { "node.color": "#ff8800" } },
    {
        name: "by group",
        target: "node",
        kind: "encoding",
        selector: { match: "everything" },
        encode: { "node.color": { by: "data.group", scale: "passthrough", map: { x: "#ff0000" }, unmapped: "skip" } },
    },
];

/** The files the page handed the browser, by name. */
interface Saved {
    readonly name: string;
    readonly blob: Blob;
}

/**
 * Catches every download: the blob behind each object URL, named by the anchor clicked with it.
 * @returns the files saved so far.
 */
function catchDownloads(): Saved[] {
    const saved: Saved[] = [];
    const blobs = new Map<string, Blob>();
    const create = URL.createObjectURL.bind(URL);
    vi.spyOn(URL, "createObjectURL").mockImplementation((object: Blob | MediaSource) => {
        const url = create(object);
        if (object instanceof Blob) {
            blobs.set(url, object);
        }
        return url;
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
        const blob = blobs.get(this.href);
        if (this.download !== "" && blob !== undefined) {
            saved.push({ name: this.download, blob });
        }
    });
    return saved;
}

/**
 * The reader's layers as specs, by name, with what a load adds to a selector set aside.
 * @param session - a session.
 * @returns each of STACK's layers as the session holds it.
 */
function layers(session: GraphSession): unknown[] {
    const names = new Set(STACK.map((spec) => spec.name));
    return session.styles
        .list()
        .filter((layer) => names.has(layer.name))
        .map((layer) => ({
            name: layer.name,
            target: layer.target,
            kind: layer.kind,
            set: layer.set ?? {},
            encode: layer.encode ?? {},
        }));
}

/**
 * Opens the Export dialog on Data.
 * @returns the dialog.
 */
async function openData(): Promise<HTMLElement> {
    await userEvent.keyboard("{Control>}e{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Export" });
    await userEvent.click(within(dialog).getByText("Data"));
    await waitFor(() => {
        assert.notInclude(
            within(dialog).getByLabelText("Preview of the exported data").textContent,
            "Writing the preview",
        );
    });
    return dialog;
}

/**
 * Chooses the CSV node table, as the reader picks it from Format and Table.
 * @param dialog - the Export dialog, on Data.
 */
async function chooseCsvNodes(dialog: HTMLElement): Promise<void> {
    await userEvent.click(within(dialog).getByLabelText("Format", { selector: "input" }));
    await userEvent.click(await screen.findByRole("option", { name: "CSV" }));
    await userEvent.click(within(dialog).getByLabelText("Table", { selector: "input" }));
    await userEvent.click(await screen.findByRole("option", { name: "Nodes" }));
    await waitFor(() => {
        assert.notInclude(within(dialog).getByLabelText("Preview of the exported data").textContent, "Writing");
    });
}

/** A notice's toast; the status line speaks the same words (state/store.ts). */
const TOAST = { selector: ".cm-toast-message" };

afterEach(() => {
    vi.restoreAllMocks();
});

describe("Export warns before the graph's styles are lost", () => {
    it("stops a CSV export at the warning, and saves GraphML with its layers at once", async () => {
        const saved = catchDownloads();
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        const element = document.querySelector("graphty-element");
        if (session === undefined || element === null) {
            throw new Error("the element never came up");
        }
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);
        for (const spec of STACK) {
            await session.styles.add(spec);
        }
        const exports = vi.spyOn(element, "exportGraph");

        // CSV cannot hold the colors: Export stops at the warning and nothing is written.
        const dialog = await openData();
        await chooseCsvNodes(dialog);
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        const warning = await within(dialog).findByRole("alertdialog", {});
        assert.match(warning.textContent, /Node fill color not written/);
        assert.match(warning.textContent, /Reopened: no styles/);
        assert.lengthOf(saved, 0, "no file before the reader chooses");

        await userEvent.click(within(warning).getByRole("button", { name: "Save anyway" }));
        await screen.findByText("Exported untitled_nodes.csv", TOAST);
        assert.deepEqual(
            saved.map(({ name }) => name),
            ["untitled_nodes.csv"],
        );

        // GraphML keeps the layers: the menu says so, and Export saves without a warning.
        const again = await openData();
        await userEvent.click(within(again).getByLabelText("Format"));
        await userEvent.click(await screen.findByRole("option", { name: /^GraphML.*\(keeps style layers\)$/ }));
        await waitFor(() => {
            assert.include(within(again).getByLabelText("Preview of the exported data").textContent, "<graphml");
        });
        await userEvent.click(within(again).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_graph.graphml", TOAST);
        assert.isNull(screen.queryByRole("alertdialog"));
        const file = saved.find(({ name }) => name === "untitled_graph.graphml");
        assert.isDefined(file, "the GraphML file was saved");

        const back = createGraphSession();
        await back.data.import(
            { type: "graphml", config: { data: (await file?.blob.text()) ?? "" } },
            { styles: "file" },
        );
        assert.deepEqual(layers(back), layers(session));
        assert.lengthOf(layers(back), STACK.length);
        back.dispose();

        // Every export the dialog made, previews and saves, asked for the styles, but the project
        // file's (Data opens on Graphty JSON), which holds them already and takes no options.
        const written = exports.mock.calls.filter(([format]) => format !== "graphty");
        assert.isAbove(written.length, 3);
        for (const [, options] of written) {
            assert.strictEqual(options?.styles, true);
        }
    });

    it("warns that GEXF loses a label color, says the layers come back, and saves anyway", async () => {
        const saved = catchDownloads();
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);
        await session.styles.add(STACK[0]);
        await session.styles.add({
            name: "green labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelColor": "#00ff00" },
        });

        const dialog = await openData();
        await userEvent.click(within(dialog).getByLabelText("Format"));
        await userEvent.click(await screen.findByRole("option", { name: /^GEXF/ }));
        await waitFor(() => {
            assert.include(within(dialog).getByLabelText("Preview of the exported data").textContent, "<gexf");
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        const warning = await within(dialog).findByRole("alertdialog", {});
        assert.match(warning.textContent, /Node label color not written/);
        assert.match(warning.textContent, /Reopened: layers as layers/);
        assert.lengthOf(saved, 0, "no file before the reader chooses");

        await userEvent.click(within(warning).getByRole("button", { name: "Save anyway" }));
        await screen.findByText("Exported untitled_graph.gexf", TOAST);
        assert.deepEqual(
            saved.map(({ name }) => name),
            ["untitled_graph.gexf"],
        );
    });

    it("saves CSV and GEXF of a graph with no layers of its own at once, with no warning", async () => {
        const saved = catchDownloads();
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
        let session: GraphSession | undefined;
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
        if (session === undefined) {
            throw new Error("the element never came up");
        }
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);

        const dialog = await openData();
        await chooseCsvNodes(dialog);
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_nodes.csv", TOAST);
        assert.isNull(screen.queryByRole("alertdialog"));

        const again = await openData();
        await userEvent.click(within(again).getByLabelText("Format"));
        await userEvent.click(await screen.findByRole("option", { name: /^GEXF/ }));
        await waitFor(() => {
            assert.include(within(again).getByLabelText("Preview of the exported data").textContent, "<gexf");
        });
        await userEvent.click(within(again).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_graph.gexf", TOAST);
        assert.isNull(screen.queryByRole("alertdialog"));
        assert.deepEqual(
            saved.map(({ name }) => name),
            ["untitled_nodes.csv", "untitled_graph.gexf"],
        );
    });
});
