import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { keyChipFor } from "../../bindings";
import { ShellProvider } from "../../ShellContext";
import { ExplorePanel, type ExplorePanelProps } from "../ExplorePanel";

/** The nine sections and rows the first-load panel rests at, in frozen order. */
const FROZEN_SECTION_ORDER = [
    "Filter builder",
    "Filters",
    "Sets",
    "Views",
    "Find a pattern",
    "Neighborhood expansion",
    "Notes",
];

function renderPanel(props: Partial<ExplorePanelProps> = {}) {
    return render(
        <ShellProvider initialShellWidth={1440} measureViewport={false} persist={false}>
            <ExplorePanel visibleScopeLabel="20 nodes" {...props} />
        </ShellProvider>,
    );
}

describe("ExplorePanel", () => {
    describe("the first-load resting state", () => {
        it("draws the eight sections in the frozen order, less the one the data cannot support", () => {
            renderPanel();

            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual(FROZEN_SECTION_ORDER);
        });

        it("rests at ten rows: one search, two actions and seven sections", () => {
            renderPanel();

            const sections = screen.getAllByTestId("control-section-name").length;
            const searchRows = screen.getAllByTestId("explore-search").length;
            const actionRows = screen.getAllByTestId("action-row").length;

            expect(sections + searchRows + actionRows).toBe(10);
        });

        it("draws no filter chip strip while no filter is active", () => {
            renderPanel();

            expect(screen.queryByTestId("explore-filter-chips")).not.toBeInTheDocument();
        });

        it("does not draw Step through time without a Time role", () => {
            renderPanel();

            expect(screen.queryByText("Step through time")).not.toBeInTheDocument();
        });

        it("draws Step through time once the data carries a Time role", () => {
            renderPanel({ hasTimeRole: true });

            const names = screen.getAllByTestId("control-section-name").map((node) => node.textContent);
            expect(names).toEqual([
                "Filter builder",
                "Filters",
                "Sets",
                "Views",
                "Find a pattern",
                "Neighborhood expansion",
                "Step through time",
                "Notes",
            ]);
        });
    });

    describe("the search row", () => {
        it("carries the scope pair in the box's own title", () => {
            renderPanel();

            expect(screen.getByTestId("explore-search")).toHaveAttribute(
                "title",
                "Search nodes and edges (/). Scope: All nodes; the other scope is Visible nodes.",
            );
        });

        it("names the query field for a screen reader", () => {
            renderPanel();

            expect(screen.getByRole("textbox", { name: "Search nodes and edges" })).toBeInTheDocument();
        });

        it("draws the scope inside the box", () => {
            renderPanel();

            expect(screen.getByTestId("explore-search-scope")).toHaveTextContent("All");
        });

        it("reports a query change", () => {
            const onQueryChange = vi.fn();

            renderPanel({ onQueryChange });

            fireEvent.change(screen.getByRole("textbox", { name: "Search nodes and edges" }), {
                target: { value: "acct" },
            });

            expect(onQueryChange).toHaveBeenCalledWith("acct");
        });
    });

    describe("the two action rows", () => {
        it("states the scope Select all visible will act on", () => {
            renderPanel();

            expect(screen.getByTestId("explore-select-all-scope")).toHaveTextContent("20 nodes");
        });

        it("reports the selection", () => {
            const onSelectAllVisible = vi.fn();

            renderPanel({ onSelectAllVisible });

            const chip = keyChipFor("selectAllVisible");
            const name = chip === null ? "Select all visible" : `Select all visible (${chip})`;

            fireEvent.click(screen.getByRole("button", { name }));

            expect(onSelectAllVisible).toHaveBeenCalledTimes(1);
        });

        it("collects the Select menu's unbuilt rows under one statement", async () => {
            renderPanel();

            fireEvent.click(screen.getByTestId("explore-select-menu"));

            expect(await screen.findByText("Dimmed rows are not built yet.")).toBeInTheDocument();

            const rows = await screen.findAllByRole("menuitem");
            expect(rows).toHaveLength(9);
            expect(
                rows.every((row) => row.hasAttribute("data-disabled") || row.getAttribute("aria-disabled") === "true"),
            ).toBe(true);
        });
    });

    describe("the three libraries", () => {
        it("disables the Filters plus with its reason until a rule exists", () => {
            renderPanel();

            // `aria-disabled` keeps the reason readable, where the `disabled` attribute
            // would stop the tooltip opening at all (floor item 4).
            expect(screen.getByRole("button", { name: "Save as filter... Build a filter first" })).toHaveAttribute(
                "aria-disabled",
                "true",
            );
        });

        it("enables the Filters plus once a rule exists", () => {
            renderPanel({ hasFilterRule: true });

            expect(screen.getByRole("button", { name: "Save as filter..." })).toBeEnabled();
        });

        it("disables the Sets plus with its reason until something is selected", () => {
            renderPanel();

            expect(
                screen.getByRole("button", { name: "Save selection as set... Select something first" }),
            ).toHaveAttribute("aria-disabled", "true");
        });

        it("always lets a view be saved", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Save as view..." })).toBeEnabled();
        });

        it("carries each library's destination sentence", () => {
            renderPanel();

            expect(
                screen.getByText("Saved filters: saved in this browser on this computer. Export a file to move it."),
            ).toBeInTheDocument();
            expect(
                screen.getByText("Selection sets: saved in this browser on this computer. Export a file to move it."),
            ).toBeInTheDocument();
            expect(
                screen.getByText("View bookmarks: saved in this browser on this computer. Export a file to move it."),
            ).toBeInTheDocument();
        });
    });

    describe("the two unbuilt rows", () => {
        it("tags Find a pattern on screen and keeps both names in its title", () => {
            renderPanel();

            expect(screen.getByTestId("explore-find-a-pattern")).toHaveAttribute(
                "title",
                "Find a pattern (subgraph search). Coming",
            );
            expect(screen.getAllByTestId("coming-tag")).toHaveLength(1);
        });

        it("keeps the Neighborhood expansion reason in its title, where the pill will not fit", () => {
            renderPanel();

            expect(screen.getByTestId("explore-neighborhood-expansion")).toHaveAttribute(
                "title",
                "Neighborhood expansion. Coming",
            );
        });
    });

    describe("Notes", () => {
        it("disables the note plus with its reason until something is selected", () => {
            renderPanel();

            expect(screen.getByRole("button", { name: "Note. Select something first" })).toHaveAttribute(
                "aria-disabled",
                "true",
            );
        });

        it("enables it once something is selected", () => {
            renderPanel({ hasSelection: true });

            expect(screen.getByRole("button", { name: "Note" })).toBeEnabled();
        });
    });

    describe("the filter chips", () => {
        it("draws a chip per active filter", () => {
            renderPanel({
                filterChips: [{ id: "one", label: "type is cat", onRemove: vi.fn() }],
            });

            expect(screen.getByText("type is cat")).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
        });

        it("offers Clear all from two chips", () => {
            renderPanel({
                filterChips: [
                    { id: "one", label: "type is cat", onRemove: vi.fn() },
                    { id: "two", label: "degree > 3", onRemove: vi.fn() },
                ],
            });

            expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
        });
    });
});
