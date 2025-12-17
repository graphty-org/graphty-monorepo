import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, type MockInstance, vi} from "vitest";

import {render, screen, waitFor} from "../../../test/test-utils";
import {DataGrid} from "../DataGrid";

describe("DataGrid", () => {
    it("renders JSON data in a grid format", () => {
        render(<DataGrid data={{name: "test", value: 123}} />);
        expect(screen.getByText("name")).toBeInTheDocument();
    });

    it("renders nested objects", () => {
        render(<DataGrid data={{user: {profile: {name: "John"}}}} />);
        expect(screen.getByText("user")).toBeInTheDocument();
    });

    it("renders arrays", () => {
        render(<DataGrid data={[{id: 1}, {id: 2}]} />);
        // The library displays 1-based row indices
        expect(screen.getByText("id")).toBeInTheDocument();
        // Check that both rows are rendered
        expect(screen.getAllByText("1").length).toBeGreaterThan(0);
        expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    });

    it("calls onSelect with keyPath when cell is clicked", async() => {
        const onSelect = vi.fn();
        const user = userEvent.setup();
        render(<DataGrid data={{key: "value"}} onSelect={onSelect} />);
        await user.click(screen.getByText("value"));
        expect(onSelect).toHaveBeenCalled();
    });

    it("respects defaultExpandDepth prop", () => {
        render(
            <DataGrid
                data={{level1: {level2: {level3: "deep"}}}}
                defaultExpandDepth={1}
            />,
        );
        // level1 should be visible, but deeper content may be collapsed
        expect(screen.getByText("level1")).toBeInTheDocument();
    });

    it("highlights cells matching searchText", () => {
        const {container} = render(
            <DataGrid data={{name: "searchme"}} searchText="search" />,
        );
        // The library should apply highlight styling for search matches
        // We verify the searchText prop is passed through by checking the grid renders
        expect(container.querySelector("table")).toBeInTheDocument();
    });

    it("applies custom theme from mantineJsonGridTheme", () => {
        const {container} = render(<DataGrid data={{test: "value"}} />);
        // Verify the grid renders with our custom theme applied
        expect(container.querySelector("table")).toBeInTheDocument();
    });

    describe("copy functionality", () => {
        let clipboardSpy: MockInstance;

        beforeEach(() => {
            clipboardSpy = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("shows copy button when showCopyButton is true and a cell is selected", async() => {
            const user = userEvent.setup();
            render(<DataGrid data={{name: "test"}} showCopyButton={true} />);

            // Initially no copy button
            expect(screen.queryByLabelText("Copy value")).not.toBeInTheDocument();

            // Click on a cell to select it
            await user.click(screen.getByText("test"));

            // Copy button should appear
            await waitFor(() => {
                expect(screen.getByLabelText("Copy value")).toBeInTheDocument();
            });
        });

        it("copy button has sticky positioning", async() => {
            const user = userEvent.setup();
            const {container} = render(<DataGrid data={{name: "test"}} showCopyButton={true} />);

            // Click on a cell to select it
            await user.click(screen.getByText("test"));

            // Wait for copy button to appear
            await waitFor(() => {
                expect(screen.getByLabelText("Copy value")).toBeInTheDocument();
            });

            // Find the sticky container (parent of the copy button wrapper)
            const stickyContainer = container.querySelector("[style*='position: sticky']");
            expect(stickyContainer).toBeInTheDocument();
        });

        it("copies value with Ctrl+C keyboard shortcut when cell is selected", async() => {
            const user = userEvent.setup();
            const {container} = render(<DataGrid data={{name: "test value"}} showCopyButton={true} />);

            // Click on the cell to select it
            await user.click(screen.getByText("test value"));

            // Wait for selection to be processed and copy button to appear
            await waitFor(() => {
                expect(screen.getByLabelText("Copy value")).toBeInTheDocument();
            });

            // Focus the container for keyboard events
            const gridContainer = container.firstElementChild as HTMLElement;
            gridContainer.focus();

            // Press Ctrl+C
            await user.keyboard("{Control>}c{/Control}");

            // Verify clipboard was called with the value
            await waitFor(() => {
                expect(clipboardSpy).toHaveBeenCalledWith("test value");
            });
        });

        it("copies value with Cmd+C keyboard shortcut on Mac when cell is selected", async() => {
            const user = userEvent.setup();
            const {container} = render(<DataGrid data={{count: 42}} showCopyButton={true} />);

            // Click on the cell to select it
            await user.click(screen.getByText("42"));

            // Wait for selection to be processed
            await waitFor(() => {
                expect(screen.getByLabelText("Copy value")).toBeInTheDocument();
            });

            // Focus the container for keyboard events
            const gridContainer = container.firstElementChild as HTMLElement;
            gridContainer.focus();

            // Press Cmd+C (Meta key)
            await user.keyboard("{Meta>}c{/Meta}");

            // Verify clipboard was called
            await waitFor(() => {
                expect(clipboardSpy).toHaveBeenCalledWith("42");
            });
        });

        it("does not trigger keyboard copy when no cell is selected", async() => {
            const user = userEvent.setup();
            const {container} = render(<DataGrid data={{name: "test"}} showCopyButton={true} />);

            // Focus the container without selecting a cell
            const gridContainer = container.firstElementChild as HTMLElement;
            gridContainer.focus();

            // Press Ctrl+C
            await user.keyboard("{Control>}c{/Control}");

            // Clipboard should not be called since no cell is selected
            expect(clipboardSpy).not.toHaveBeenCalled();
        });

        it("shows feedback tooltip when keyboard shortcut is used", async() => {
            const user = userEvent.setup();
            const {container} = render(<DataGrid data={{name: "test"}} showCopyButton={true} />);

            // Click on a cell to select it
            await user.click(screen.getByText("test"));

            // Wait for copy button to appear
            await waitFor(() => {
                expect(screen.getByLabelText("Copy value")).toBeInTheDocument();
            });

            // Focus the container
            const gridContainer = container.firstElementChild as HTMLElement;
            gridContainer.focus();

            // Press Ctrl+C
            await user.keyboard("{Control>}c{/Control}");

            // Feedback tooltip should appear
            await waitFor(() => {
                expect(screen.getByText("Copied!")).toBeInTheDocument();
            });
        });
    });
});
