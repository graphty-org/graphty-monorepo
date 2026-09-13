import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { collapseFilterChips, type FilterStatusChip, FilterStatusStrip } from "../FilterStatusStrip";

const chip = (id: string, label: string): FilterStatusChip => ({ id, label });

describe("FilterStatusStrip", () => {
    describe("rendering", () => {
        it("does not render when nothing is active", () => {
            const { container } = render(<FilterStatusStrip chips={[]} />);

            expect(container.querySelector("[data-canvas-overlay='filter-status']")).toBeNull();
        });

        it("draws the active chips and nothing else", () => {
            render(<FilterStatusStrip chips={[chip("a", "indoorOutdoor = outdoor"), chip("b", "value >= 5")]} />);

            expect(screen.getByText("indoorOutdoor = outdoor")).toBeInTheDocument();
            expect(screen.getByText("value >= 5")).toBeInTheDocument();
        });

        it("carries no counts -- shown of loaded of total is the status bar's", () => {
            render(<FilterStatusStrip chips={[chip("a", "indoorOutdoor = outdoor")]} />);

            expect(screen.queryByText(/of 20 nodes/)).toBeNull();
        });
    });

    describe("the collapse rule", () => {
        it("keeps two chips as two chips", () => {
            expect(collapseFilterChips([chip("a", "one"), chip("b", "two")])).toHaveLength(2);
        });

        it("collapses three into one chip carrying the count", () => {
            const collapsed = collapseFilterChips([chip("a", "one"), chip("b", "two"), chip("c", "three")]);

            expect(collapsed).toHaveLength(1);
            expect(collapsed[0].label).toBe("3 filters");
        });

        it("opens Explore from the collapsed chip", () => {
            const onOpenExplore = vi.fn();
            render(
                <FilterStatusStrip
                    chips={[chip("a", "one"), chip("b", "two"), chip("c", "three")]}
                    onOpenExplore={onOpenExplore}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: "3 filters" }));

            expect(onOpenExplore).toHaveBeenCalledTimes(1);
        });
    });

    describe("the render-ceiling note", () => {
        it("names the criterion of the cut and the override with its own cost", () => {
            const onAction = vi.fn();
            render(
                <FilterStatusStrip
                    chips={[]}
                    note={{
                        label: "Edge cap: highest weight first.",
                        actionLabel: "Show all 1.1M (about 1.4 GB, 8 fps)",
                        onAction,
                    }}
                />,
            );

            expect(screen.getByText("Edge cap: highest weight first.")).toBeInTheDocument();

            fireEvent.click(screen.getByRole("button", { name: "Show all 1.1M (about 1.4 GB, 8 fps)" }));

            expect(onAction).toHaveBeenCalledTimes(1);
        });
    });
});
