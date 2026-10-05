/**
 * Tier 1 task T13, "Save a picture and the numbers", on the REAL graphty-element: in a new
 * project, load a graph, run Degree, then Export > Image saves a picture and Export >
 * Data saves the node table whose result headers are the run's result paths. Every file is
 * caught where the page hands it to the browser (the object URL and the anchor's click).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import { afterEach, assert, describe, it, vi } from "vitest";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up and capturing, not a pass/fail timing. */
const TIMEOUT_MS = 60_000;

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

describe("Export: save a picture and the numbers (task T13)", () => {
    it(
        "saves the drawing as a PNG and the node table with the run's result columns",
        async () => {
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
            await screen.findByText("Exported untitled_current-view.png", {}, { timeout: TIMEOUT_MS });
            const picture = saved.find(({ name }) => name === "untitled_current-view.png");
            assert.isDefined(picture, "the picture was saved");
            assert.equal(picture?.blob.type, "image/png");
            assert.isAbove(picture?.blob.size ?? 0, 0);

            // Data: the node table, one row per node, every result headed by its result path.
            await userEvent.keyboard("{Control>}e{/Control}");
            const again = await screen.findByRole("dialog", { name: "Export" });
            await userEvent.click(within(again).getByText("Data"));
            assert.isNotNull(within(again).getByText(/^One row per node, with every computed value/));
            const header = session.results.path(root.runId, "value");
            await waitFor(() => {
                assert.include(within(again).getByLabelText("Preview of the exported data").textContent, header);
            });
            await userEvent.click(within(again).getByRole("button", { name: "Export" }));
            await screen.findByText("Exported untitled_nodes.csv");
            const table = saved.find(({ name }) => name === "untitled_nodes.csv");
            assert.isDefined(table, "the table was saved");
            const lines = (await table?.blob.text())?.trim().split(/\r?\n/) ?? [];
            assert.include(lines[0], header, "the result column is headed by its result path");
            assert.lengthOf(lines, NODES.length + 1, "one row per node, under one header");
        },
        TIMEOUT_MS * 2,
    );
});
