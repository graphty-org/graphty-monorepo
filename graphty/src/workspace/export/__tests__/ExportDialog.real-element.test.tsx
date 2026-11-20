/**
 * Tier 1 task T13, "Save a picture and the numbers", on the REAL graphty-element: in a new
 * project, load a graph, run Degree, then Export > Data saves the node table whose result headers are the run's result paths. Every file is
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

/** The outputs Export... lists, in the list's order. */
const OUTPUTS = ["Data", "Report", "Styles", "Recipe", "Project"];

/**
 * Mod+E, and checks every output is listed.
 * @param names - the outputs the list should hold.
 * @returns the dialog.
 */
async function openExport(names: readonly string[] = OUTPUTS): Promise<HTMLElement> {
    await userEvent.keyboard("{Control>}e{/Control}");
    const dialog = await screen.findByRole("dialog", { name: "Export" });
    const outputs = within(dialog).getByRole("grid", { name: "What to export" });
    for (const name of names) {
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
    it("saves the node table with the run's result columns", async () => {
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

        // Data: the node table, one row per node, every result headed by its result path.
        await userEvent.keyboard("{Control>}e{/Control}");
        const again = await screen.findByRole("dialog", { name: "Export" });
        await pick(again, "Data");
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

    it("writes a report of the chosen sections with the reader's words, and the data issues as JSON and CSV", async () => {
        const saved = catchDownloads();
        const session = await openScoredGraph();
        // Two more nodes: a padded name, fixed below (a data change), and two spellings of one team, left open.
        await session.data.addNodes([
            { id: "n6", name: " Ann ", team: "Acme" },
            { id: "n7", name: "Ben", team: "ACME" },
            { id: "n8", name: "Cy", team: "Acme" },
        ]);
        const padded = session.data.issues().find((issue) => issue.code === "padded-space");
        assert.isDefined(padded, "the padded name is an issue");
        if (padded !== undefined) {
            await session.data.fix(padded, "trim");
        }
        session.notes.add({ text: "n0 starts the ring", targets: [{ node: "n0" }] });

        const dialog = await openExport();
        await pick(dialog, "Report");
        const sections = await within(dialog).findByRole("group", { name: "Sections" });
        assert.isNotNull(within(sections).getByRole("checkbox", { name: "Notes (1)" }));
        assert.isNotNull(within(sections).getByRole("checkbox", { name: "Methods (1)" }));
        assert.isNotNull(within(sections).getByRole("checkbox", { name: "Data changes (1)" }));
        // Data tables left out; a title, a row cap of 2, and the reader's own summary and findings.
        await userEvent.click(within(sections).getByRole("checkbox", { name: /^Data tables/ }));
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Title" }), "Ring study");
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Summary" }), "A ring of six.");
        await userEvent.type(within(dialog).getByRole("textbox", { name: "Findings" }), "Every node has degree two.");
        await userEvent.click(within(dialog).getByRole("button", { name: "Generate report" }));
        await screen.findByText("Exported untitled_report.md", TOAST);
        const report = (await saved.find(({ name }) => name === "untitled_report.md")?.blob.text()) ?? "";
        assert.include(report, "# Ring study");
        assert.include(report, "## Summary\n\nA ring of six.");
        assert.include(report, "## Findings\n\nEvery node has degree two.");
        assert.include(report, "n0 starts the ring");
        assert.include(report, "## Validation report");
        assert.include(report, "## Data changes");
        assert.include(report, "trimmed");
        assert.include(report, "## Methods");
        assert.include(report, "- Algorithm: degree");
        assert.notInclude(report, "## Data tables", "a section left out is not in the report");

        // The choices stay while the workspace is mounted; tables back on, capped at 2 rows.
        const again = await openExport();
        await pick(again, "Report");
        assert.equal(
            (await within(again).findByRole<HTMLInputElement>("textbox", { name: "Title" })).value,
            "Ring study",
        );
        await userEvent.click(within(again).getByRole("checkbox", { name: /^Data tables/ }));
        const cap = within(again).getByRole("textbox", { name: "Row cap" });
        await userEvent.tripleClick(cap);
        await userEvent.keyboard("2");
        assert.equal((cap as HTMLInputElement).value, "2");
        await userEvent.click(within(again).getByRole("button", { name: "Generate report" }));
        await waitFor(() => {
            assert.lengthOf(
                saved.filter(({ name }) => name === "untitled_report.md"),
                2,
            );
        });
        const capped = (await saved.filter(({ name }) => name === "untitled_report.md")[1].blob.text()) ?? "";
        assert.include(capped, "### Nodes (first 2 of 9)");

        // The validation report and the data changes on their own.
        for (const [item, file] of [
            ["Validation report (JSON)", "untitled_validation.json"],
            ["Data changes (CSV)", "untitled_data-changes.csv"],
        ] as const) {
            const export_ = await openExport();
            await pick(export_, "Report");
            await userEvent.click(await within(export_).findByRole("button", { name: "Save issues" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: item }));
            await screen.findByText(`Exported ${file}`, TOAST);
        }
        const validation = JSON.parse(
            (await saved.find(({ name }) => name === "untitled_validation.json")?.blob.text()) ?? "[]",
        ) as { code: string }[];
        assert.include(
            validation.map((issue) => issue.code),
            "case-variant",
        );
        const changes = ((await saved.find(({ name }) => name === "untitled_data-changes.csv")?.blob.text()) ?? "")
            .trim()
            .split("\n");
        assert.match(changes[0], /^id,code,label,/);
        assert.lengthOf(changes, 2, "one fixed issue under the header");
        assert.include(changes[1], "padded-space");
    });
});

describe("Export from a camera or a tour", () => {
    /**
     * Opens the Export dialog from a camera's or a tour's row menu in the Views place, and checks it
     * is that output alone, with no list of outputs.
     * @param name - the camera or the tour.
     * @param item - the row menu item.
     * @param title - the dialog's title.
     * @returns the dialog.
     */
    async function exportFrom(name: string, item: RegExp, title: string): Promise<HTMLElement> {
        if (screen.queryByRole("region", { name: "Views place" }) === null) {
            await userEvent.click(
                within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
            );
        }
        const place = await screen.findByRole("region", { name: "Views place" });
        await userEvent.click(within(place).getByRole("button", { name: `More for ${name}` }));
        await userEvent.click(await screen.findByRole("menuitem", { name: item }));
        const dialog = await screen.findByRole("dialog", { name: title });
        assert.isNull(within(dialog).queryByRole("grid", { name: "What to export" }), "no list of outputs");
        return dialog;
    }

    it("opens Mod+E on the nodes' Data, with no Image or Video, and offers no edge table without edges", async () => {
        await page.viewport(1440, 900);
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

        const dialog = await openExport(["Data", "Report", "Styles", "Recipe", "Project"]);
        const outputs = within(dialog).getByRole("grid", { name: "What to export" });
        assert.isNull(within(outputs).queryByText("Image"));
        assert.isNull(within(outputs).queryByText("Video"));
        assert.isNotNull(within(dialog).getByRole("heading", { name: "Data" }));
        const preview = within(dialog).getByLabelText("Preview of the exported data");
        await waitFor(() => {
            assert.notEqual(preview.textContent, "Writing the preview...");
        });
        assert.isNull(within(dialog).queryByText("Table"), "no Nodes / Edges toggle without edges");
        assert.isNull(within(dialog).queryByRole("radio", { name: "Edges" }));
    });

    it("opens a camera's Export image... on that camera alone, and exports a PNG", async () => {
        await page.viewport(1440, 900);
        const saved = catchDownloads();
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);

        const dialog = await exportFrom("Overview", /^Export image/, "Export image");
        assert.equal(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Camera" }).value, "Overview");
        await within(dialog).findByRole("img", {});
        await userEvent.click(within(dialog).getByRole("button", { name: "Export" }));
        await screen.findByText("Exported untitled_overview.png", TOAST);
        const picture = saved.find(({ name }) => name === "untitled_overview.png");
        assert.equal(picture?.blob.type, "image/png");
    });

    it("keeps Transparent when For documentation follows a JPEG preset", async () => {
        await page.viewport(1440, 900);
        await openScoredGraph();
        const dialog = await exportFrom("Top", /^Export image/, "Export image");
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

    it("offers Transparent for PNG and WebP but not JPEG", async () => {
        await page.viewport(1440, 900);
        await openScoredGraph();
        const dialog = await exportFrom("Top", /^Export image/, "Export image");
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

    it("opens a tour's Export video... on that tour alone", async () => {
        await page.viewport(1440, 900);
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);
        await session.tours.save([
            { name: "First", tour: { stops: [{ view: "Overview", hold: 1000 }] } },
            { name: "Second", tour: { stops: [{ view: "Overview", hold: 2000 }] } },
        ]);

        const dialog = await exportFrom("Second", /^Export video/, "Export video");
        assert.isTrue(within(dialog).getByRole<HTMLInputElement>("radio", { name: "Tour" }).checked);
        assert.equal(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Tour" }).value, "Second");
        assert.equal(within(dialog).getByTestId("video-length").textContent, "0:02");
    });

    it("records a short tour, and the generic Export lists it under no Recent", async () => {
        await page.viewport(1440, 900);
        const saved = catchDownloads();
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);
        await session.tours.save([{ name: "Walk", tour: { stops: [{ view: "Overview", hold: 400 }] } }]);

        const dialog = await exportFrom("Walk", /^Export video/, "Export video");
        await within(dialog).findByText(/^\d+ frames$/);
        await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));
        const notice = await screen.findByText(/^Exported untitled_walk\.(webm|mp4)/, {});
        const video = saved.find(({ name }) => notice.textContent?.includes(name) ?? false);
        assert.isDefined(video, "the video was saved");
        assert.match(video?.blob.type ?? "", /^video\//);

        // The generic Export lists data files under Recent, never a video.
        const generic = await openExport(["Data", "Report", "Styles", "Recipe", "Project"]);
        assert.isNull(within(generic).queryByRole("grid", { name: "Recent exports" }));
    });

    it("stops a recording on the first Escape and closes on the second", async () => {
        await page.viewport(1440, 900);
        const saved = catchDownloads();
        const session = await openScoredGraph();
        await session.views.save([{ name: "Overview" }]);
        // A long hold, so the recording is still running when Escape is pressed.
        await session.tours.save([{ name: "Long", tour: { stops: [{ view: "Overview", hold: 600_000 }] } }]);

        const dialog = await exportFrom("Long", /^Export video/, "Export video");
        await userEvent.click(within(dialog).getByRole("button", { name: "Record" }));
        const bar = await within(dialog).findByRole("progressbar", { name: "Recording" });
        assert.isNotNull(bar.getAttribute("aria-valuenow"));

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(within(dialog).queryByRole("progressbar", { name: "Recording" }));
        });
        assert.isNotNull(screen.queryByRole("dialog", { name: "Export video" }), "the dialog stays open");
        assert.isNull(within(dialog).queryByRole("alert"), "a cancel is not a failure");
        assert.isFalse(within(dialog).getByRole<HTMLButtonElement>("button", { name: "Record" }).disabled);
        assert.lengthOf(saved, 0, "nothing was saved");

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Export video" }));
        });
    });

    it("covers the canvas with an opaque layer while it records under reduced motion", async () => {
        await page.viewport(1440, 900);
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
            const dialog = await exportFrom("Long", /^Export video/, "Export video");
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
});
