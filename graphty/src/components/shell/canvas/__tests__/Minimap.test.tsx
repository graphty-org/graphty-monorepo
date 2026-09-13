import React from "react";
import { describe, expect, it } from "vitest";

import { render, screen } from "../../../../test/test-utils";
import { MINIMAP_HEATMAP_NODE_THRESHOLD, MINIMAP_HEIGHT, MINIMAP_WIDTH, OVERLAY_INSET } from "../../constants";
import { Minimap } from "../Minimap";

const defaultProps = {
    visible: true,
    raised: false,
    bottom: OVERLAY_INSET,
    nodeCount: 20,
};

describe("Minimap", () => {
    describe("rendering", () => {
        it("does not render when it is not shown", () => {
            const { container } = render(<Minimap {...defaultProps} visible={false} />);

            expect(container.querySelector("[data-canvas-overlay='minimap']")).toBeNull();
        });

        it("names itself for assistive technology", () => {
            render(<Minimap {...defaultProps} />);

            expect(screen.getByRole("button", { name: "Minimap" })).toBeInTheDocument();
        });
    });

    describe("geometry", () => {
        it("is 160 by 100 at the 12 inset on the left", () => {
            render(<Minimap {...defaultProps} />);
            const box = screen.getByRole("button", { name: "Minimap" });

            expect(box.style.width).toBe(`${MINIMAP_WIDTH}px`);
            expect(box.style.height).toBe(`${MINIMAP_HEIGHT}px`);
            expect(box.style.left).toBe(`${OVERLAY_INSET}px`);
        });

        it("sits on the bottom offset it is handed and says when it has risen", () => {
            render(<Minimap {...defaultProps} raised bottom={60} />);
            const box = screen.getByRole("button", { name: "Minimap" });

            expect(box.style.bottom).toBe("60px");
            expect(box).toHaveAttribute("data-raised", "true");
        });
    });

    describe("the caption rule", () => {
        it("carries no caption below the heatmap threshold -- the drawing names itself", () => {
            render(<Minimap {...defaultProps} nodeCount={MINIMAP_HEATMAP_NODE_THRESHOLD} />);

            expect(screen.queryByText("Minimap", { selector: "span" })).toBeNull();
        });

        it("keeps its caption in the heatmap form, where the shading is not self-describing", () => {
            render(<Minimap {...defaultProps} nodeCount={MINIMAP_HEATMAP_NODE_THRESHOLD + 1} density={[1, 2, 3]} />);

            expect(screen.getByText("Minimap", { selector: "span" })).toBeInTheDocument();
        });
    });

    describe("the two forms", () => {
        it("draws the scaled points below the threshold", () => {
            const { container } = render(
                <Minimap
                    {...defaultProps}
                    points={[
                        { x: 0.1, y: 0.2 },
                        { x: 0.5, y: 0.5 },
                    ]}
                />,
            );

            expect(screen.getByRole("button", { name: "Minimap" })).toHaveAttribute("data-form", "points");
            expect(container.querySelectorAll("circle")).toHaveLength(2);
        });

        it("draws the density grid above the threshold", () => {
            render(<Minimap {...defaultProps} nodeCount={20000} density={[0, 5, 10]} />);

            expect(screen.getByRole("button", { name: "Minimap" })).toHaveAttribute("data-form", "heatmap");
        });

        it("draws the viewport rectangle when it is handed one", () => {
            const { container } = render(
                <Minimap {...defaultProps} viewport={{ x: 0, y: 0.1, width: 1, height: 0.8 }} />,
            );

            expect(container.querySelectorAll("rect")).toHaveLength(1);
        });
    });
});
