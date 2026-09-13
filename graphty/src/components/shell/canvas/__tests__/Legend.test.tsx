import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { LEGEND_MAX_HEIGHT, LEGEND_WIDTH, OVERLAY_INSET } from "../../constants";
import { capLegendCategories, Legend, type LegendChannel, type LegendOtherRow, orderLegendChannels } from "../Legend";

const SPAN = { selector: "span" } as const;

const SIZE: LegendChannel = {
    channel: "size",
    channelLabel: "Size",
    attribute: "Most connected",
    technicalName: "Degree centrality",
    scaleLine: "sqrt scale",
    scaleShort: "sqrt",
    stops: [{ label: "2" }, { label: "median 3" }, { label: "4" }],
};

const OTHER: LegendOtherRow = {
    label: "Other",
    coverage: "3,388 groups, 43% of nodes",
    color: "#6b7480",
};

const COLOR: LegendChannel = {
    channel: "color",
    channelLabel: "Color",
    attribute: "node type",
    scaleLine: "categorical",
    scaleShort: "categorical",
    categories: [
        { id: "1", label: "Group 1", color: "#111111" },
        { id: "2", label: "Group 2", color: "#222222" },
        { id: "3", label: "Group 3", color: "#333333" },
        { id: "4", label: "Group 4", color: "#444444" },
        { id: "5", label: "Group 5", color: "#555555" },
        { id: "6", label: "Group 6", color: "#666666" },
        { id: "7", label: "Group 7", color: "#777777" },
    ],
    other: OTHER,
};

const defaultProps = {
    visible: true,
    raised: false,
    compact: false,
    bottom: OVERLAY_INSET,
    maxHeight: LEGEND_MAX_HEIGHT,
};

describe("Legend", () => {
    describe("rendering", () => {
        it("does not render when nothing is encoded", () => {
            const { container } = render(<Legend {...defaultProps} channels={[]} />);

            expect(container.querySelector("[data-canvas-overlay='legend']")).toBeNull();
        });

        it("does not render when the Views menu has turned it off", () => {
            const { container } = render(<Legend {...defaultProps} visible={false} channels={[SIZE]} />);

            expect(container.querySelector("[data-canvas-overlay='legend']")).toBeNull();
        });

        it("renders one block per encoded channel", () => {
            render(<Legend {...defaultProps} channels={[SIZE]} />);

            expect(screen.getByText(/Size: Most connected/, SPAN)).toBeInTheDocument();
        });

        it("carries no visible Legend caption", () => {
            render(<Legend {...defaultProps} channels={[SIZE]} />);

            expect(screen.queryByText("Legend", SPAN)).toBeNull();
        });

        it("names itself for assistive technology all the same", () => {
            render(<Legend {...defaultProps} channels={[SIZE]} />);

            expect(screen.getByRole("group", { name: "Legend" })).toBeInTheDocument();
        });
    });

    describe("legend hygiene", () => {
        it("prints the scale in words even where it is the default", () => {
            render(<Legend {...defaultProps} channels={[SIZE]} />);

            expect(screen.getByText("sqrt scale", SPAN)).toBeInTheDocument();
        });

        it("prints the domain endpoints with the median", () => {
            render(<Legend {...defaultProps} channels={[SIZE]} />);

            expect(screen.getByText("2", SPAN)).toBeInTheDocument();
            expect(screen.getByText("median 3", SPAN)).toBeInTheDocument();
            expect(screen.getByText("4", SPAN)).toBeInTheDocument();
        });

        it("keeps the technical name on the same line as the plain one", () => {
            render(<Legend {...defaultProps} channels={[SIZE]} />);

            expect(screen.getByText(/Size: Most connected/, SPAN)).toHaveTextContent(
                "Size: Most connected (Degree centrality)",
            );
        });

        it("draws at most five category rows plus Other", () => {
            render(<Legend {...defaultProps} channels={[COLOR]} />);

            expect(screen.getByText("Group 5", SPAN)).toBeInTheDocument();
            expect(screen.queryByText("Group 6", SPAN)).toBeNull();
            expect(screen.queryByText("Group 7", SPAN)).toBeNull();
            expect(screen.getByText(/^Other/, SPAN)).toBeInTheDocument();
        });

        it("carries the coverage footer on the Other row and no count on a category row", () => {
            render(<Legend {...defaultProps} channels={[COLOR]} />);

            expect(screen.getByText(/^Other/, SPAN)).toHaveTextContent("Other (3,388 groups, 43% of nodes)");
            expect(screen.getByText("Group 1", SPAN)).toHaveTextContent("Group 1");
        });

        it("draws no state rows", () => {
            render(<Legend {...defaultProps} channels={[COLOR, SIZE]} />);

            for (const state of ["Selected", "Matches filter", "Filtered out", "Outside window", "Open notes"]) {
                expect(screen.queryByText(state, SPAN)).toBeNull();
            }
        });

        it("draws every departure line", () => {
            render(
                <Legend
                    {...defaultProps}
                    channels={[{ ...SIZE, departures: ["Clamped at 44", "not measured (12 nodes)"] }]}
                />,
            );

            expect(screen.getAllByText("Clamped at 44").length).toBeGreaterThan(0);
            expect(screen.getAllByText("not measured (12 nodes)").length).toBeGreaterThan(0);
        });

        it("opens the groups table from the Other row", () => {
            const onClick = vi.fn();
            render(<Legend {...defaultProps} channels={[{ ...COLOR, other: { ...OTHER, onClick } }]} />);

            fireEvent.click(screen.getByRole("button", { name: /Other/ }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("block order", () => {
        it("orders Color before Size whatever order it is handed", () => {
            expect(orderLegendChannels([SIZE, COLOR]).map((channel) => channel.channel)).toEqual(["color", "size"]);
        });

        it("draws a rule between two blocks and none above the first", () => {
            const { container } = render(<Legend {...defaultProps} channels={[COLOR, SIZE]} />);

            expect(container.querySelectorAll("[data-legend-rule='true']")).toHaveLength(1);
        });
    });

    describe("the compact form", () => {
        it("keeps one header line per channel and drops the swatch rows", () => {
            render(<Legend {...defaultProps} compact channels={[COLOR, SIZE]} />);

            expect(screen.getByText(/Color: node type/, SPAN)).toHaveTextContent("Color: node type, categorical");
            expect(screen.getByText(/Size: Most connected/, SPAN)).toHaveTextContent("Size: Most connected, sqrt");
            expect(screen.queryByText("median 3", SPAN)).toBeNull();
            expect(screen.queryByText("Group 1", SPAN)).toBeNull();
        });

        it("takes no min-height and no cap", () => {
            const { container } = render(<Legend {...defaultProps} compact channels={[SIZE]} />);
            const box = container.querySelector("[data-canvas-overlay='legend']") as HTMLElement;

            expect(box).toHaveAttribute("data-form", "compact");
            expect(box.style.minHeight).toBe("");
            expect(box.style.maxHeight).toBe("");
        });
    });

    describe("geometry", () => {
        it("is 256 wide at the 12 inset on every board", () => {
            const { container } = render(<Legend {...defaultProps} channels={[SIZE]} />);
            const box = container.querySelector("[data-canvas-overlay='legend']") as HTMLElement;

            expect(box.style.width).toBe(`${LEGEND_WIDTH}px`);
            expect(box.style.right).toBe(`${OVERLAY_INSET}px`);
        });

        it("sits on the bottom offset it is handed and says when it has risen", () => {
            const { container } = render(<Legend {...defaultProps} raised bottom={60} channels={[SIZE]} />);
            const box = container.querySelector("[data-canvas-overlay='legend']") as HTMLElement;

            expect(box.style.bottom).toBe("60px");
            expect(box).toHaveAttribute("data-raised", "true");
        });
    });

    describe("capLegendCategories", () => {
        it("keeps the five largest and no more", () => {
            expect(capLegendCategories(COLOR.categories ?? [])).toHaveLength(5);
        });

        it("keeps every category when there are fewer than five", () => {
            expect(capLegendCategories((COLOR.categories ?? []).slice(0, 2))).toHaveLength(2);
        });
    });
});
