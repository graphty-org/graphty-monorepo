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
import { cdp, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

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
    await waitFor(() => {
        session = document.querySelector("graphty-element")?.session;
        assert.isDefined(session);
    });
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
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
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
        await within(dialog).findByRole("img", {});
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_current-camera.png", TOAST);
        const picture = saved.find(({ name }) => name === "untitled_current-camera.png");
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
        });
        assert.include(preview.textContent, header);
        // CSV holds no styles, as Format says: Export saves at once.
        await userEvent.click(within(again).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_nodes.csv", TOAST);
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
        await waitFor(() => {
            session = document.querySelector("graphty-element")?.session;
            assert.isDefined(session);
        });
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
            await screen.findByText(`Exported ${file}`, TOAST);
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
        await screen.findByText("Exported untitled_nodes.csv", TOAST);
        const table = saved.find(({ name }) => name === "untitled_nodes.csv");
        const rows = (await table?.blob.text())?.trim().split(/\r?\n/) ?? [];
        assert.lengthOf(rows, 4 + 1, "the shown nodes, under one header");

        // Styles: a style file of layers only.
        dialog = await openExport();
        await pick(dialog, "Styles");
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_styles.style.json", TOAST);
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
        await screen.findByText("Exported untitled_recipe.json", TOAST);
        const recipe = (await saved.find(({ name }) => name === "untitled_recipe.json")?.blob.text()) ?? "";
        assert.include(recipe, '"score"');
        for (const node of NODES) {
            assert.notInclude(recipe, `"${node.id}"`, "no node id in the recipe");
        }
    });

    it("closes only the format's settings on Escape, leaving the dialog open", async () => {
        await openScoredGraph();
        const dialog = await openExport();
        await pick(dialog, "Data");
        await userEvent.click(within(dialog).getByRole("combobox", { name: "Format" }));
        await userEvent.click((await screen.findAllByRole("option", { name: /CSV/ }))[0]);
        await userEvent.click(await within(dialog).findByRole("button", { name: /^Format settings/ }));
        await screen.findByRole("dialog", { name: "Format settings" });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Format settings" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Export" }), "the dialog stays open");
    });

    it("offers no edge table without edges, and with no tours records a still view", async () => {
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

        let dialog = await openExport();
        await pick(dialog, "Data");
        const preview = within(dialog).getByLabelText("Preview of the exported data");
        await waitFor(() => {
            assert.notEqual(preview.textContent, "Writing the preview...");
        });
        assert.isNull(within(dialog).queryByText("Table"), "no Nodes / Edges toggle without edges");
        assert.isNull(within(dialog).queryByRole("radio", { name: "Edges" }));

        await userEvent.keyboard("{Escape}");
        dialog = await openExport();
        await pick(dialog, "Video");
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("radio", { name: "Tour" }).disabled);
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("radio", { name: "Still" }).checked);
        assert.isNotNull(within(dialog).getByText("No tours yet"));
        await userEvent.click(within(dialog).getByRole("combobox", { name: "Camera" }));
        // Current camera, then the project's saved cameras: in a new project, the five starting ones.
        assert.deepEqual(
            (await screen.findAllByRole("option")).map((option) => option.textContent),
            ["Current camera", "Top", "Bottom", "Front", "Side", "Isometric"],
        );
        await userEvent.keyboard("{Escape}");
        // Video tours... closes the dialog and opens the Views place on Video tours.
        await userEvent.click(within(dialog).getByRole("button", { name: "Video tours..." }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
        });
        assert.isNotNull(await screen.findByRole("region", { name: "Views place" }));
        await waitFor(() => {
            assert.equal(document.activeElement?.getAttribute("aria-label"), "New tour");
        });
    });

    it("opens Export image... on Image, and exports a PNG from a saved view", async () => {
        const saved = catchDownloads();
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Export image..." }));
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Image" }));
        await userEvent.click(within(dialog).getByRole("combobox", { name: "Camera" }));
        await userEvent.click(await screen.findByRole("option", { name: "Overview" }));
        await within(dialog).findByRole("img", {});
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_overview.png", TOAST);
        const picture = saved.find(({ name }) => name === "untitled_overview.png");
        assert.equal(picture?.blob.type, "image/png");
    });

    it("keeps a removed saved view chosen, says it is not found, and refuses to export it", async () => {
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);

        let dialog = await openExport();
        await userEvent.click(within(dialog).getByRole("combobox", { name: "Camera" }));
        await userEvent.click(await screen.findByRole("option", { name: "Overview" }));
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
        });
        await session.views.remove(["Overview"]);

        dialog = await openExport();
        const view = within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Camera" });
        assert.equal(view.value, "Overview", "the choice is not silently swapped for the current camera");
        assert.isNotNull(within(dialog).getByText("Camera not found"));
        assert.isTrue(within(dialog).getByRole<HTMLButtonElement>("button", { name: "Export" }).disabled);
    });

    it("keeps Transparent when For documentation follows a JPEG preset", async () => {
        await openScoredGraph();
        const dialog = await openExport();
        const transparent = (): HTMLInputElement =>
            within(dialog).getByRole<HTMLInputElement>("radio", { name: "Transparent" });
        const preset = within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Preset" });

        await userEvent.click(preset);
        await userEvent.click(await screen.findByRole("option", { name: "Thumbnail" }));
        await waitFor(() => {
            assert.isTrue(transparent().disabled, "JPEG keeps no transparency");
        });
        await userEvent.click(preset);
        await userEvent.click(await screen.findByRole("option", { name: "For documentation" }));
        await waitFor(() => {
            assert.isFalse(transparent().disabled, "PNG keeps transparency");
        });
        assert.isTrue(transparent().checked);
        assert.equal(preset.value, "For documentation");
    });

    it("opens Export video... on Video, and offers Transparent for PNG and WebP but not JPEG", async () => {
        await openScoredGraph();

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Export video..." }));
        let dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Video" }));
        await userEvent.keyboard("{Escape}");

        dialog = await openExport();
        const transparent = (): HTMLInputElement =>
            within(dialog).getByRole<HTMLInputElement>("radio", { name: "Transparent" });
        for (const [format, refused] of [
            ["WebP", false],
            ["JPEG", true],
            ["PNG", false],
        ] as const) {
            await userEvent.click(within(dialog).getByText(format));
            await waitFor(() => {
                assert.equal(transparent().disabled, refused, format);
            });
        }
    });

    it("records a saved tour for its own length, lists it under Recent, and says when it is gone", async () => {
        const saved = catchDownloads();
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);
        await session.tours.save([{ name: "Walk", tour: { stops: [{ view: "Overview", hold: 1500 }] } }]);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Export video..." }));
        let dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("radio", { name: "Tour" }).checked);
        assert.equal(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Tour" }).value, "Walk");
        assert.equal(within(dialog).getByTestId("video-length").textContent, "0:02", "the tour's own length");
        await within(dialog).findByText(/^\d+ frames$/);
        await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));
        const notice = await screen.findByText(/^Exported untitled_walk\.(webm|mp4)/, {});
        const video = saved.find(({ name }) => notice.textContent?.includes(name) ?? false);
        assert.isDefined(video, "the video was saved");
        assert.match(video?.blob.type ?? "", /^video\//);

        // Recent opens Video again on the tour, with its length.
        dialog = await openExport();
        await userEvent.click(
            within(within(dialog).getByRole("grid", { name: "Recent exports" })).getByText(video?.name ?? ""),
        );
        assert.equal(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Tour" }).value, "Walk");
        assert.equal(within(dialog).getByTestId("video-length").textContent, "0:02");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
        });

        // The tour is deleted: its Recent entry keeps it chosen, in error, and will not record.
        await session.tours.remove(["Walk"]);
        dialog = await openExport();
        await userEvent.click(
            within(within(dialog).getByRole("grid", { name: "Recent exports" })).getByText(video?.name ?? ""),
        );
        assert.equal(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Tour" }).value, "Walk");
        assert.isNotNull(await within(dialog).findByText("Tour not found"));
        assert.isTrue(within(dialog).getByRole<HTMLButtonElement>("button", { name: "Record" }).disabled);
    });

    it("stops a recording on the first Escape and closes on the second", async () => {
        const saved = catchDownloads();
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);
        // A long hold, so the recording is still running when Escape is pressed.
        await session.tours.save([{ name: "Long", tour: { stops: [{ view: "Overview", hold: 600_000 }] } }]);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Export video..." }));
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));
        const bar = await within(dialog).findByRole("progressbar", { name: "Recording" });
        assert.isNotNull(bar.getAttribute("aria-valuenow"));

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(dialog).queryByRole("progressbar", { name: "Recording" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Export" }), "the dialog stays open");
        assert.isNull(within(dialog).queryByRole("alert"), "a cancel is not a failure");
        assert.isFalse(within(dialog).getByRole<HTMLButtonElement>("button", { name: "Record" }).disabled);
        assert.lengthOf(saved, 0, "nothing was saved");

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export" }));
        });
    });

    it("covers the canvas with an opaque layer while it records under reduced motion", async () => {
        const send = cdp() as unknown as { send: (method: string, params?: object) => Promise<unknown> };
        await send.send("Emulation.setEmulatedMedia", {
            features: [{ name: "prefers-reduced-motion", value: "reduce" }],
        });
        try {
            const session = await openScoredGraph();
            const element = document.querySelector("graphty-element");
            await waitFor(() => {
                assert.isTrue(element?.isMotionReduced());
            });
            await session.views.save([{ name: "Overview" }]);
            await session.tours.save([{ name: "Long", tour: { stops: [{ view: "Overview", hold: 600_000 }] } }]);
            await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Export video..." }));
            const dialog = await screen.findByRole("dialog", { name: "Export" });
            const overlay = document.querySelector<HTMLElement>(".mantine-Modal-overlay");
            assert.isNotNull(overlay);
            const alpha = (): number => {
                const parts = getComputedStyle(overlay ?? document.body).backgroundColor.match(/[\d.]+/g) ?? [];
                return parts.length === 4 ? Number(parts[3]) : 1;
            };
            assert.isBelow(alpha(), 1, "the canvas shows through before recording");
            await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));
            await within(dialog).findByRole("progressbar", { name: "Recording" });
            await waitFor(() => {
                assert.equal(alpha(), 1, "an opaque layer covers the moving canvas");
            });
            await userEvent.click(within(dialog).getByRole("button", { name: "Stop" }));
            await waitFor(() => {
                assert.isBelow(alpha(), 1, "uncovered once the recording ends");
            });
        } finally {
            await send.send("Emulation.setEmulatedMedia", { features: [] });
        }
    });

    it("opens Video on a tour from its Export video... in the Views place", async () => {
        await page.viewport(1440, 900);
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);
        await session.tours.save([
            { name: "First", tour: { stops: [{ view: "Overview", hold: 1000 }] } },
            { name: "Second", tour: { stops: [{ view: "Overview", hold: 2000 }] } },
        ]);

        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
        );
        const section = await screen.findByRole("region", { name: "Views place" });
        await userEvent.click(within(section).getByRole("button", { name: "More for Second" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Export video/ }));
        const dialog = await screen.findByRole("dialog", { name: "Export" });
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Video" }));
        assert.equal(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Tour" }).value, "Second");
        assert.equal(within(dialog).getByTestId("video-length").textContent, "0:02");
    });
});
