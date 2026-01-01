import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { render, screen, waitFor } from "../../../test/test-utils";
import { DataAccordion } from "../DataAccordion";

describe("DataAccordion", () => {
    const mockData = { id: "1", label: "Test", metadata: { x: 10 } };

    it("renders Data section header", () => {
        render(<DataAccordion data={mockData} />);
        expect(screen.getByText("Data")).toBeInTheDocument();
    });

    it("shows data when expanded", () => {
        render(<DataAccordion data={mockData} />);
        expect(screen.getByText("Test")).toBeInTheDocument();
    });

    it("collapses when header clicked", async () => {
        const user = userEvent.setup();
        render(<DataAccordion data={mockData} />);

        // Data should be visible initially
        expect(screen.getByText("Test")).toBeVisible();

        // Click the header to collapse
        await user.click(screen.getByText("Data"));

        // Data should no longer be visible (Mantine Collapse hides content with CSS)
        await waitFor(() => {
            expect(screen.queryByText("Test")).not.toBeVisible();
        });
    });

    it("shows placeholder when data is null", () => {
        render(<DataAccordion data={null} />);
        expect(screen.getByText(/no element selected/i)).toBeInTheDocument();
    });

    it("has copy all button", () => {
        render(<DataAccordion data={mockData} />);
        expect(screen.getByLabelText(/copy all/i)).toBeInTheDocument();
    });

    it("supports custom title", () => {
        render(<DataAccordion data={mockData} title="Node Properties" />);
        expect(screen.getByText("Node Properties")).toBeInTheDocument();
    });

    describe("copy all functionality", () => {
        let clipboardSpy: MockInstance;

        beforeEach(() => {
            clipboardSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("copies entire JSON when copy all button clicked", async () => {
            const user = userEvent.setup();
            render(<DataAccordion data={mockData} />);

            await user.click(screen.getByLabelText(/copy all/i));

            await waitFor(() => {
                expect(clipboardSpy).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
            });
        });

        it("shows copied feedback after copying", async () => {
            const user = userEvent.setup();
            render(<DataAccordion data={mockData} />);

            await user.click(screen.getByLabelText(/copy all/i));

            await waitFor(() => {
                expect(screen.getByText("Copied!")).toBeInTheDocument();
            });
        });
    });

    it("expands when clicked while collapsed", async () => {
        const user = userEvent.setup();
        render(<DataAccordion data={mockData} />);

        // Collapse
        await user.click(screen.getByText("Data"));
        await waitFor(() => {
            expect(screen.queryByText("Test")).not.toBeVisible();
        });

        // Expand again
        await user.click(screen.getByText("Data"));
        await waitFor(() => {
            expect(screen.getByText("Test")).toBeVisible();
        });
    });

    it("displays nested data properly", () => {
        render(<DataAccordion data={mockData} />);
        // The DataGrid should display the nested metadata
        expect(screen.getByText("metadata")).toBeInTheDocument();
    });
});
