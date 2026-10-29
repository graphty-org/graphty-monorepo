/**
 * Tier 1 task T13, "Save a picture and the numbers", on the REAL graphty-element: in a new
 * project, load a graph, run Degree, then Export > Image saves a picture and Export >
 * Data saves the node table whose result headers are the run's result paths. Every file is
 * caught where the page hands it to the browser (the object URL and the anchor's click).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { storyWaitOptions } from "../../../stories/wait";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and capturing, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

/** The notice's toast; the workspace's status line speaks the same words. */
const TOAST = { selector: ".cm-toast-message" };

const NODES = Array.from({ length: 6 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = [
    ...NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id })),
    { source: "n0", target: "n3" },
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

afterEach(() => {
    vi.restoreAllMocks();
});

/**
 * Mounts a new project, loads the six nodes (each with a score) and runs Degree.
 * @returns the element's session.
 */
async function openScoredGraph(): Promise<GraphSession> {
    render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
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
    await session.data.addNodes(NODES.map((node, i) => ({ ...node, score: i })));
    await session.data.addEdges(EDGES);
    await session.runs.start("degree");
    return session;
}

/**
 * Mod+E, and checks every output is listed.
 * @returns the dialog.
 */
async function openExport(): Promise<HTMLElement> {
    await userEvent.keyboard("{Control>}e{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Export" });
    const outputs = within(dialog).getByRole("grid", { name: "What to export" });
    for (const name of ["Image", "Video", "Data", "Styles", "Recipe", "Project"]) {
        assert.isNotNull(within(outputs).getByText(name), `${name} is listed`);
    }
    return dialog;
}

/**
 * Picks an output from the dialog's list.
 * @param dialog - the dialog.
 * @param name - the output.
 */
async function pick(dialog: HTMLElement, name: string): Promise<void> {
    await userEvent.click(within(within(dialog).getByRole("grid", { name: "What to export" })).getByText(name));
}

describe("Export: save a picture and the numbers (task T13)", () => {
    it("saves the drawing as a PNG and the node table with the run's result columns", async () => {
        const saved = catchDownloads();
        // A new, empty project; the graph goes in through the element's session.
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
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
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);
        await session.runs.start("degree");
        const [root] = session.results.roots;
        assert.isDefined(root, "Degree published a result");

        // Export... (Mod+E) opens the dialog on Image; Export saves the picture.
        await userEvent.keyboard("{Control>}e{/Control}");
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        await within(dialog).findByRole("img", {}, { timeout: TIMEOUT_MS });
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_current-view.png", TOAST, { timeout: TIMEOUT_MS });
        const picture = saved.find(({ name }) => name === "untitled_current-view.png");
        assert.isDefined(picture, "the picture was saved");
        assert.equal(picture?.blob.type, "image/png");
        assert.isAbove(picture?.blob.size ?? 0, 0);

        // Data: the node table, one row per node, every result headed by its result path.
        await userEvent.keyboard("{Control>}e{/Control}");
        const again = await screen.findByRole("dialog", { name: "Export" });
        await userEvent.click(within(again).getByText("Data"));
        const header = session.results.path(root.runId, "value");
        // The preview and the saved file both wait on exportGraph, which first waits for the
        // element's whole operation queue to drain: wait on what they show, with no deadline of
        // their own, so the test's timeout is the only backstop (#3021).
        const preview = within(again).getByLabelText("Preview of the exported data");
        await waitFor(() => {
            assert.notEqual(preview.textContent, "Writing the preview...");
        }, storyWaitOptions(1000));
        assert.include(preview.textContent, header);
        await userEvent.click(within(again).getByRole("button", { name: "Export" }));
        // Degree's colors are style layers a CSV file cannot hold: the dialog asks first.
        const warning = await within(again).findByRole("alertdialog");
        await userEvent.click(within(warning).getByRole("button", { name: "Save anyway" }));
        await screen.findByText("Exported untitled_nodes.csv", TOAST, storyWaitOptions(1000));
        const table = saved.find(({ name }) => name === "untitled_nodes.csv");
        assert.isDefined(table, "the table was saved");
        const lines = (await table?.blob.text())?.trim().split(/\r?\n/) ?? [];
        assert.include(lines[0], header, "the result column is headed by its result path");
        assert.lengthOf(lines, NODES.length + 1, "one row per node, under one header");
    });

    it("saves a graph with text ids as GML, and a Cytoscape session as its zip file", async () => {
        const saved = catchDownloads();
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
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
        await session.data.addNodes(NODES);
        await session.data.addEdges(EDGES);

        for (const [label, file, sniff] of [
            ["GML", "untitled_graph.gml", /^\s*(Creator|graph)/],
            ["Cytoscape Session", "untitled_graph.cys", /^PK/],
        ] as const) {
            await userEvent.keyboard("{Control>}e{/Control}");
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            await userEvent.click(
                within(within(dialog).getByRole("grid", { name: "What to export" })).getByText("Data"),
            );
            await userEvent.click(within(dialog).getByRole("combobox", { name: "Format" }));
            await userEvent.click(await screen.findByRole("option", { name: label }));
            await waitFor(() => {
                assert.notInclude(
                    within(dialog).getByLabelText("Preview of the exported data").textContent,
                    "Writing the preview",
                );
            });
            assert.isNull(within(dialog).queryByRole("alert"), "the file can be written");
            await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
            await screen.findByText(`Exported ${file}`, TOAST, { timeout: TIMEOUT_MS });
            // The graph has no layers of its own, so nothing about its styles is lost: no warning.
            assert.isNull(screen.queryByRole("alertdialog"));
            const blob = saved.find(({ name }) => name === file)?.blob;
            assert.isDefined(blob, `${file} was saved`);
            const head = new TextDecoder("latin1").decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 16));
            assert.match(head, sniff);
        }
    });

    it("writes what is shown, the layers alone and a recipe without node ids (flow 10)", async () => {
        const saved = catchDownloads();
        const session = await openScoredGraph();
        // A filter that keeps 4 of the 6 nodes (scores 2 to 5).
        await session.visibility.set({ kind: "threshold", path: "data.score", above: 1.5 });

        // Data, Shown 4 of 6: four node rows under one header.
        let dialog = await openExport();
        await pick(dialog, "Data");
        await userEvent.click(within(dialog).getByRole("combobox", { name: "Scope" }));
        await userEvent.click(await screen.findByRole("option", { name: "Shown 4 of 6" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        const warning = await within(dialog).findByRole("alertdialog", {}, storyWaitOptions(1000));
        await userEvent.click(within(warning).getByRole("button", { name: "Save anyway" }));
        await screen.findByText("Exported untitled_nodes.csv", TOAST, storyWaitOptions(1000));
        const table = saved.find(({ name }) => name === "untitled_nodes.csv");
        const rows = (await table?.blob.text())?.trim().split(/\r?\n/) ?? [];
        assert.lengthOf(rows, 4 + 1, "the shown nodes, under one header");

        // Styles: a style file of layers only.
        dialog = await openExport();
        await pick(dialog, "Styles");
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_styles.style.json", TOAST, { timeout: TIMEOUT_MS });
        const styles = JSON.parse(
            (await saved.find(({ name }) => name === "untitled_styles.style.json")?.blob.text()) ?? "{}",
        ) as Record<string, unknown>;
        assert.equal(styles.kind, "graphty-style");
        assert.isArray(styles.layers);
        assert.notProperty(styles, "nodes");
        assert.notProperty(styles, "data");

        // Recipe: names the score column, never a node id.
        dialog = await openExport();
        await pick(dialog, "Recipe");
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_recipe.json", TOAST, { timeout: TIMEOUT_MS });
        const recipe = (await saved.find(({ name }) => name === "untitled_recipe.json")?.blob.text()) ?? "";
        assert.include(recipe, '"score"');
        for (const node of NODES) {
            assert.notInclude(recipe, `"${node.id}"`, "no node id in the recipe");
        }
    });

    it("offers no edge table without edges, and names a tour's views by their plain names", async () => {
        render(<Workspace initialState={{ project: { name: "Untitled", id: 1 } }} />);
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
        await session.data.addNodes(NODES);

        let dialog = await openExport();
        await pick(dialog, "Data");
        const preview = within(dialog).getByLabelText("Preview of the exported data");
        await waitFor(() => {
            assert.notEqual(preview.textContent, "Writing the preview...");
        }, storyWaitOptions(1000));
        assert.isNull(within(dialog).queryByText("Table"), "no Nodes / Edges toggle without edges");
        assert.isNull(within(dialog).queryByRole("radio", { name: "Edges" }));

        await userEvent.keyboard("{Escape}");
        dialog = await openExport();
        await pick(dialog, "Video");
        const views = within(dialog).getByRole("textbox", { name: "Views" }).closest(".mantine-MultiSelect-root");
        assert.isNotNull(views);
        assert.include(views?.textContent, "From the front");
        assert.notInclude(views?.textContent, "frontView", "no camera id is shown");
    });

    it("records a short tour of views, and lists it under Recent (flow 10)", async () => {
        const saved = catchDownloads();
        await openScoredGraph();

        // Video: a short tour through three camera views.
        let dialog = await openExport();
        await pick(dialog, "Video");
        await userEvent.click(within(dialog).getByText("3 s"));
        await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));
        const notice = await screen.findByText(/^Exported untitled_tour\.(webm|mp4)/, {}, { timeout: TIMEOUT_MS });
        const video = saved.find(({ name }) => notice.textContent?.includes(name) ?? false);
        assert.isDefined(video, "the video was saved");
        assert.match(video?.blob.type ?? "", /^video\//);

        // Recent lists what was exported in this visit.
        dialog = await openExport();
        assert.isNotNull(
            within(within(dialog).getByRole("grid", { name: "Recent exports" })).getByText(video?.name ?? ""),
        );
    });
});
