import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { InspectorHeader } from "../InspectorHeader";

const defaultProps = {
    kindLabel: "Graph summary",
    showPin: false,
    onCopyReading: vi.fn(),
    onKeepOpenChange: vi.fn(),
    onToggle: vi.fn(),
};

describe("InspectorHeader", () => {
    describe("the leading cluster", () => {
        it("draws the surface kind", () => {
            render(<InspectorHeader {...defaultProps} />);

            expect(screen.getByTestId("inspector-kind")).toHaveTextContent("Graph summary");
        });

        it("draws the identity with its own title, so it can ellipsize into it", () => {
            render(<InspectorHeader {...defaultProps} kindLabel="Node" identityLabel="Princess_Fluffington" />);

            expect(screen.getByTestId("inspector-identity")).toHaveAttribute("title", "Princess_Fluffington");
        });

        it("draws no identity when there is none", () => {
            render(<InspectorHeader {...defaultProps} />);

            expect(screen.queryByTestId("inspector-identity")).not.toBeInTheDocument();
        });

        it("draws no leading glyph, ever", () => {
            render(<InspectorHeader {...defaultProps} />);

            expect(screen.getByTestId("inspector-header-name").querySelector("svg")).toBeNull();
        });
    });

    describe("the trailing cluster", () => {
        it("carries Copy reading, Keep open and Toggle inspector, in that order, with no pin", () => {
            render(<InspectorHeader {...defaultProps} />);

            const names = Array.from(
                screen.getByTestId("inspector-header-actions").querySelectorAll("button"),
            ).map((button) => button.getAttribute("aria-label"));

            expect(names).toEqual(["Copy reading", "Keep open", "Toggle inspector"]);
        });

        it("carries all four, pin then latch, when a pin is allowed", () => {
            render(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} />);

            const names = Array.from(
                screen.getByTestId("inspector-header-actions").querySelectorAll("button"),
            ).map((button) => button.getAttribute("aria-label"));

            // INSPECTOR-TITLE-1.9 section 4 refused a fourth slot in this row; the
            // product owner asked for the latch on 2026-09-12 and it lands here, with
            // the measured cost to the name band recorded in that document.
            expect(names).toEqual(["Copy reading", "Pin as A", "Keep open", "Toggle inspector"]);
        });

        it("draws the latch with the padlock and the pin with the pushpin, so neither reads as the other", () => {
            render(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} />);

            const latch = screen.getByRole("button", { name: "Keep open" });
            const pin = screen.getByRole("button", { name: "Pin as A" });

            expect(latch.querySelector('[data-glyph="keepOpen"]')).not.toBeNull();
            expect(pin.querySelector('[data-glyph="pin"]')).not.toBeNull();
        });

        it("draws no latch where the region supplies none", () => {
            render(
                <InspectorHeader
                    kindLabel="Graph summary"
                    showPin={false}
                    onCopyReading={vi.fn()}
                    onToggle={vi.fn()}
                />,
            );

            expect(screen.queryByRole("button", { name: "Keep open" })).not.toBeInTheDocument();
        });

        it("names the toggle without its key chip", () => {
            render(<InspectorHeader {...defaultProps} />);

            expect(screen.getByRole("button", { name: "Toggle inspector" })).toBeInTheDocument();
        });

        it("reports the toggle as a pressed toggle rather than renaming it", () => {
            render(<InspectorHeader {...defaultProps} />);

            expect(screen.getByRole("button", { name: "Toggle inspector" })).toHaveAttribute("aria-pressed", "true");
        });

        it("hides every glyph from assistive technology", () => {
            render(<InspectorHeader {...defaultProps} />);

            const glyphs = screen.getByTestId("inspector-header-actions").querySelectorAll("svg");
            expect(glyphs.length).toBeGreaterThan(0);
            glyphs.forEach((glyph) => {
                expect(glyph).toHaveAttribute("aria-hidden");
            });
        });
    });

    describe("activation", () => {
        it("copies the reading", () => {
            const onCopyReading = vi.fn();
            render(<InspectorHeader {...defaultProps} onCopyReading={onCopyReading} />);

            fireEvent.click(screen.getByRole("button", { name: "Copy reading" }));

            expect(onCopyReading).toHaveBeenCalledTimes(1);
        });

        it("takes the pin", () => {
            const onPin = vi.fn();
            render(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={onPin} />);

            fireEvent.click(screen.getByRole("button", { name: "Pin as A" }));

            expect(onPin).toHaveBeenCalledTimes(1);
        });

        it("latches the column open without renaming the control", () => {
            const onKeepOpenChange = vi.fn();
            render(<InspectorHeader {...defaultProps} keptOpen={false} onKeepOpenChange={onKeepOpenChange} />);

            const latch = screen.getByRole("button", { name: "Keep open" });

            expect(latch).toHaveAttribute("aria-pressed", "false");

            fireEvent.click(latch);

            expect(onKeepOpenChange).toHaveBeenCalledWith(true);
        });

        it("releases the latch from the same control", () => {
            const onKeepOpenChange = vi.fn();
            render(<InspectorHeader {...defaultProps} keptOpen onKeepOpenChange={onKeepOpenChange} />);

            expect(screen.getByRole("button", { name: "Keep open" })).toHaveAttribute("aria-pressed", "true");

            fireEvent.click(screen.getByRole("button", { name: "Keep open" }));

            expect(onKeepOpenChange).toHaveBeenCalledWith(false);
        });

        it("collapses the column", () => {
            const onToggle = vi.fn();
            render(<InspectorHeader {...defaultProps} onToggle={onToggle} />);

            fireEvent.click(screen.getByRole("button", { name: "Toggle inspector" }));

            expect(onToggle).toHaveBeenCalledTimes(1);
        });
    });
});
