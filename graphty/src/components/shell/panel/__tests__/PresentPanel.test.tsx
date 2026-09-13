import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { ShellProvider } from "../../ShellContext";
import { PresentPanel, type PresentPanelProps } from "../PresentPanel";

const UNSHIPPED_ROWS = [
    "Report sections",
    "Generate report",
    "Export evidence bundle",
    "Export recipe (JSON)",
    "Export selection...",
];

function renderPanel(props: Partial<PresentPanelProps> = {}) {
    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <PresentPanel {...props} />
        </ShellProvider>,
    );
}

describe("PresentPanel", () => {
    describe("the frozen section order", () => {
        it("draws Export image, Export data and the report rows in that order", () => {
            renderPanel();

            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual(["Export image", "Export data", "Reports"]);
        });

        it("opens the image export, which is what the panel exists to do", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Collapse Export image" })).toHaveAttribute(
                "aria-expanded",
                "true",
            );
        });
    });

    describe("Export image", () => {
        it("keeps its two verbs in words", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Copy to clipboard" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Export image" })).toBeInTheDocument();
        });

        it("draws the estimate beside the control it belongs to", () => {
            renderPanel({ imageEstimate: "1664 x 1672, about 420 KB" });

            expect(screen.getByText("1664 x 1672, about 420 KB")).toBeInTheDocument();
        });

        it("draws no estimate line when there is no estimate", () => {
            renderPanel();

            expect(screen.queryByText(/about/)).not.toBeInTheDocument();
        });

        it("offers the image options gear", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Image options" })).toBeInTheDocument();
        });

        it("reports the export", () => {
            const onExportImage = vi.fn();

            renderPanel({ onExportImage });

            fireEvent.click(screen.getByRole("button", { name: "Export image" }));

            expect(onExportImage).toHaveBeenCalledTimes(1);
        });
    });

    describe("Export data", () => {
        it("keeps Copy node ids beside it", async () => {
            renderPanel();

            fireEvent.click(screen.getByRole("button", { name: "Expand Export data" }));

            expect(await screen.findByRole("button", { name: "Copy node ids" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Export data" })).toBeInTheDocument();
        });

        it("keeps the Include notes checkbox resident", async () => {
            renderPanel();

            fireEvent.click(screen.getByRole("button", { name: "Expand Export data" }));

            expect(await screen.findByRole("checkbox", { name: "Include notes" })).toBeInTheDocument();
        });

        it("offers the data options gear", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Data options" })).toBeInTheDocument();
        });
    });

    describe("the unshipped rows", () => {
        it("draws all five, in order, under one group", () => {
            renderPanel();

            fireEvent.click(screen.getByRole("button", { name: "Expand Reports" }));

            UNSHIPPED_ROWS.forEach((row) => {
                expect(screen.getByText(row)).toBeInTheDocument();
            });
        });

        it("tags the group once rather than every row", () => {
            renderPanel();

            fireEvent.click(screen.getByRole("button", { name: "Expand Reports" }));

            // One tag on Export data, one on Reports, and none on the five rows.
            expect(screen.getAllByTestId("coming-tag")).toHaveLength(2);
        });

        it("states why the dimmed rows cannot act", () => {
            renderPanel();

            expect(screen.getAllByText("Dimmed rows are not built yet.").length).toBeGreaterThan(0);
        });
    });
});
