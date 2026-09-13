import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { ShellProvider } from "../../ShellContext";
import type { ShellStateAxis } from "../../types";
import { DataPanel } from "../DataPanel";

function renderPanel(stateAxis: ShellStateAxis, onLoad = vi.fn()) {
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

            expect(screen.getByRole("button", { name: "Collapse Open file" })).toHaveAttribute(
                "aria-expanded",
                "true",
            );
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
                    <DataPanel
                        stateAxis="loaded"
                        onLoad={vi.fn()}
                        onDataTableOpenChange={onDataTableOpenChange}
                    />
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

    describe("loading data", () => {
        it("opens the re-homed Load data dialog from Open file", async () => {
            renderPanel("empty");

            fireEvent.click(screen.getByRole("button", { name: "Open file" }));

            expect(await screen.findByRole("dialog")).toBeInTheDocument();
        });

        it("loads a dropped file through the one request shape", () => {
            const onLoad = vi.fn();

            renderPanel("empty", onLoad);

            const zone = screen.getByTestId("data-drop-zone");
            const file = new File(["{}"], "graph.json", { type: "application/json" });

            // Chromium empties the file list of any DataTransfer that did not come
            // from a real user drag, so the drop is dispatched with the file list the
            // handler reads attached to the event itself.
            const drop = new Event("drop", { bubbles: true, cancelable: true });

            Object.defineProperty(drop, "dataTransfer", { value: { files: [file] } });
            fireEvent(zone, drop);

            expect(onLoad).toHaveBeenCalledWith(
                expect.objectContaining({ inputMethod: "file", format: "auto", replaceExisting: true }),
            );
        });
    });
});
