import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen, waitFor, within } from "../../../../test/test-utils";
import { ShellProvider } from "../../ShellContext";
import type { ShellStateAxis } from "../../types";
import { DataPanel } from "../DataPanel";

/**
 * A load that is accepted, in the shape the panel's prop now demands.
 *
 * `onLoad` returns a promise because the dialog awaits it (spec 1107-1108: errors stop
 * the import, and the dialog keeps the reader's input for a second try). A stand-in that
 * returned nothing would be a stand-in for a contract this panel no longer has.
 * @returns a mock that resolves.
 */
function acceptingLoad() {
    return vi.fn(async () => {
        await Promise.resolve();
    });
}

/**
 * One file, as a drop hands it over.
 *
 * Chromium empties the file list of any DataTransfer that did not come from a real user
 * drag, so the list the handler reads is attached to the event itself.
 * @param zone - the drop target.
 * @param file - the file dropped on it.
 */
function dropFile(zone: HTMLElement, file: File): void {
    const drop = new Event("drop", { bubbles: true, cancelable: true });

    Object.defineProperty(drop, "dataTransfer", { value: { files: [file] } });
    fireEvent(zone, drop);
}

function renderPanel(stateAxis: ShellStateAxis, onLoad = acceptingLoad()) {
    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <DataPanel stateAxis={stateAxis} onLoad={onLoad} />
        </ShellProvider>,
    );
}

describe("DataPanel", () => {
    describe("the Empty state", () => {
        it("opens the Open file section by name", () => {
            renderPanel("empty");

            expect(screen.getByRole("button", { name: "Collapse Open file" })).toHaveAttribute("aria-expanded", "true");
        });

        it("keeps the three open verbs in words", () => {
            renderPanel("empty");

            expect(screen.getByRole("button", { name: "Open file" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Open from URL" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Paste data" })).toBeInTheDocument();
        });

        it("draws the drop zone as the row itself", () => {
            renderPanel("empty");

            expect(screen.getByTestId("data-drop-zone")).toHaveAttribute("title", "Drop a file here");
        });

        it("draws the paste verb at its full name, which is the name this state first shows it under", () => {
            renderPanel("empty");

            // 6.8's never list keeps "Paste data" in words, and Welcome.dc.html:222
            // draws the full name; only the Loaded panel shortens it to "Paste"
            // (DataPanelLoaded.dc.html:264).
            expect(screen.getByRole("button", { name: "Paste data" })).toHaveTextContent("Paste data");
        });

        it("tags the unshipped recipe row", () => {
            renderPanel("empty");

            expect(screen.getByText("Run a recipe...")).toBeInTheDocument();
            expect(screen.getAllByTestId("coming-tag").length).toBeGreaterThan(0);
        });

        it("draws Sample datasets and Recent files in the frozen order", () => {
            renderPanel("empty");

            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual(["Open file", "Sample datasets", "Recent files"]);
        });

        it("draws neither Loaded data nor the Data table row", () => {
            renderPanel("empty");

            expect(screen.queryByText("Loaded data")).not.toBeInTheDocument();
            expect(screen.queryByText("Data table")).not.toBeInTheDocument();
        });
    });

    describe("the Loaded state", () => {
        it("shortens the paste verb to Paste once data is loaded, keeping its full name in its tooltip", () => {
            renderPanel("loaded");

            const paste = screen.getByRole("button", { name: "Paste data" });

            expect(paste).toHaveTextContent("Paste");
            expect(paste).not.toHaveTextContent("Paste data");
            expect(paste).toHaveAttribute("title", "Paste data");
        });

        it("relabels the first section Add data", () => {
            renderPanel("loaded");

            expect(screen.getByRole("button", { name: "Collapse Add data" })).toBeInTheDocument();
        });

        it("keeps the frozen section order once data is loaded", () => {
            renderPanel("loaded");

            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual(["Add data", "Sample datasets", "Recent files", "Loaded data", "Data table"]);
        });

        it("adds the unshipped table join with both names in its title", () => {
            renderPanel("loaded");

            expect(screen.getByTestId("data-table-join")).toHaveAttribute(
                "title",
                "Add attributes from a table... (Table join). Coming",
            );
        });

        it("carries the 6.3 pair for the data table on the section itself", () => {
            renderPanel("loaded");

            expect(screen.getByTestId("data-table-section")).toHaveAttribute(
                "title",
                "Data table (Node and edge table)",
            );
        });

        it("opens the drawer from the Show data table switch, which is the one path to it", () => {
            const onDataTableOpenChange = vi.fn();

            render(
                <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                    <DataPanel stateAxis="loaded" onLoad={vi.fn()} onDataTableOpenChange={onDataTableOpenChange} />
                </ShellProvider>,
            );

            const switchControl = screen.getByTestId("data-table-switch");

            // Spec 03 section 2.1 item 6 names this switch as the path to the Data
            // table drawer, and the drawer has shipped in this build -- Shift+T is a
            // shipped binding and the palette carries a row for it -- so the switch
            // acts and carries no `Coming`.
            expect(switchControl).not.toBeDisabled();
            expect(screen.getByTestId("data-table-switch-reason").getAttribute("title")).not.toContain("Coming");

            fireEvent.click(switchControl);

            expect(onDataTableOpenChange).toHaveBeenCalledWith(true);
        });

        it("offers the Import options gear on Loaded data", () => {
            renderPanel("loaded");

            expect(screen.getByRole("button", { name: "Import options" })).toBeInTheDocument();
        });
    });

    describe("Sample datasets", () => {
        it("draws the size string and the tags in the row's one value slot", () => {
            render(
                <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                    <DataPanel
                        stateAxis="empty"
                        onLoad={vi.fn()}
                        samples={[
                            {
                                id: "cat-social-network",
                                name: "Cat social network",
                                sizeString: "20 nodes, 29 edges",
                                tags: ["Weighted"],
                                source: "graphty samples",
                                onOpen: vi.fn(),
                            },
                        ]}
                    />
                </ShellProvider>,
            );

            /* Spec 5648: "The same size string ("20 nodes, 29 edges") appears in the
               panel and the canvas", and spec 622 asks this row for its tags as well, so
               the one trailing slot carries both with the size first. */
            expect(screen.getByText("20 nodes, 29 edges. Weighted")).toBeInTheDocument();
        });

        it("draws the size string alone when the sample carries no tags", () => {
            render(
                <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
                    <DataPanel
                        stateAxis="empty"
                        onLoad={vi.fn()}
                        samples={[
                            {
                                id: "karate",
                                name: "Karate Club",
                                sizeString: "34 nodes, 78 edges",
                                tags: [],
                                source: "Zachary 1977",
                                onOpen: vi.fn(),
                            },
                        ]}
                    />
                </ShellProvider>,
            );

            // No empty tag clause trailing the counts: a row draws the facts it has.
            expect(screen.getByText("34 nodes, 78 edges")).toBeInTheDocument();
        });
    });

    describe("loading data", () => {
        it("opens the re-homed Load data dialog from Open file", async () => {
            renderPanel("empty");

            fireEvent.click(screen.getByRole("button", { name: "Open file" }));

            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });

        it("loads a dropped file through the one request shape", () => {
            const onLoad = acceptingLoad();

            renderPanel("empty", onLoad);
            dropFile(screen.getByTestId("data-drop-zone"), new File(["{}"], "graph.json", { type: "application/json" }));

            expect(onLoad).toHaveBeenCalledWith(
                expect.objectContaining({ inputMethod: "file", format: "auto", replaceExisting: true }),
            );
        });

        /* A drop on a loaded graph REPLACES it, after the reader confirms. The element keeps
           the current graph until the dropped file has parsed, so a bad file costs nothing;
           the confirmation is for a good file the reader dropped by mistake. */
        it("asks before replacing a loaded dataset with a dropped file, then replaces it", async () => {
            const onLoad = acceptingLoad();

            renderPanel("loaded", onLoad);
            dropFile(screen.getByTestId("data-drop-zone"), new File(["{}"], "more.json", { type: "application/json" }));

            const dialog = await screen.findByRole("dialog");
            expect(within(dialog).getByText(/more\.json/)).toBeInTheDocument();
            expect(onLoad).not.toHaveBeenCalled();

            fireEvent.click(within(dialog).getByRole("button", { name: "Replace" }));

            expect(onLoad).toHaveBeenCalledWith(
                expect.objectContaining({ inputMethod: "file", format: "auto", replaceExisting: true }),
            );
        });

        it("leaves the loaded dataset alone when the reader cancels the replace", async () => {
            const onLoad = acceptingLoad();

            renderPanel("loaded", onLoad);
            dropFile(screen.getByTestId("data-drop-zone"), new File(["{}"], "more.json", { type: "application/json" }));

            fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancel" }));

            await waitFor(() => {
                expect(screen.queryByRole("dialog")).toBeNull();
            });
            expect(onLoad).not.toHaveBeenCalled();
        });

        /* Design 5.8: an unshipped route is drawn as unshipped rather than left for a
           reader to discover by using it. Spec 872-882 gives a second file the choice
           between Replace current graph and Add to current graph; this build has the first
           and not the second, so the second is on screen with its Coming tag. */
        it("draws the unbuilt merge as a Coming row once a dataset is loaded", () => {
            renderPanel("loaded");

            const row = screen.getByTestId("data-add-to-graph");

            expect(within(row).getByText("Add to current graph")).toBeInTheDocument();
            expect(within(row).getByText("Coming")).toBeInTheDocument();
        });

        it("draws no merge row while nothing is loaded", () => {
            renderPanel("empty");

            expect(screen.queryByTestId("data-add-to-graph")).toBeNull();
        });

        it("hands the dialog the load itself, so a refusal reaches the reader's inputs", async () => {
            const onLoad = vi.fn(async () => {
                await Promise.resolve();

                throw new Error("Failed to fetch URL: 404 Not Found");
            });

            renderPanel("empty", onLoad);

            fireEvent.click(screen.getByRole("button", { name: "Open file" }));
            fireEvent.click(await screen.findByText("URL"));
            fireEvent.change(screen.getByLabelText("Data URL"), {
                target: { value: "https://example.com/missing.json" },
            });
            fireEvent.click(screen.getByRole("button", { name: /^Load / }));

            /* The panel passes `onLoad` straight through rather than wrapping it, so the
               rejection reaches the dialog: it stays open with the URL still in it. A
               wrapper that dropped the promise would close the dialog here, and
               `resetState` would take the URL with it. */
            expect(await screen.findByText("Failed to fetch URL: 404 Not Found")).toBeInTheDocument();
            expect(screen.getByRole("dialog")).toBeInTheDocument();
            expect(screen.getByLabelText("Data URL")).toHaveValue("https://example.com/missing.json");
        });

        it("consumes the drop route's refusal rather than leaving it unhandled", async () => {
            const unhandled = vi.fn();
            const onLoad = vi.fn(async () => {
                await Promise.resolve();

                throw new Error("Failed to read the file");
            });

            window.addEventListener("unhandledrejection", unhandled);

            try {
                renderPanel("empty", onLoad);
                dropFile(screen.getByTestId("data-drop-zone"), new File(["{}"], "graph.json"));

                await waitFor(() => {
                    expect(onLoad).toHaveBeenCalledTimes(1);
                });

                await new Promise((resolve) => {
                    window.setTimeout(resolve, 0);
                });

                /* The drop route has no dialog to hold open and the shell reports the
                   failure on its own surfaces, so the panel consumes the rejection here.
                   Leaving it to the runtime would put an unhandled rejection in the
                   console of every reader who dropped a file that did not parse. */
                expect(unhandled).not.toHaveBeenCalled();
            } finally {
                window.removeEventListener("unhandledrejection", unhandled);
            }
        });
    });
});
