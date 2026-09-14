import { PANEL_INK } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { InspectorHeader } from "../InspectorHeader";

/**
 * Resolves a `PANEL_INK` token to the `rgb(...)` this browser paints for it.
 *
 * The tokens are CSS variables behind `light-dark()`, so the only honest way to read one
 * is to let the browser resolve it. These boards run in real Chromium, so they can. The
 * activity panel's own header boards carry the same probe, which is what makes the two
 * rows comparable: `PanelHeader.test.tsx`.
 * @param token - the token to resolve.
 * @returns the resolved colour, as the computed-style string.
 */
function resolveColor(token: string): string {
    const probe = document.createElement("div");

    probe.style.color = token;
    document.body.append(probe);

    const resolved = window.getComputedStyle(probe).color;

    probe.remove();

    return resolved;
}

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

        it("draws the latched state with a ground of its own, so the state is not aria-pressed alone", () => {
            /* 2026-09-13: the latched and unlatched renderings were byte for byte
               identical -- `pressed` reached `aria-pressed` and nothing else -- so a
               sighted reader had no way to tell a locked column from an unlocked one.
               Latched now takes the shell's own pressed treatment: a tinted ground and an
               accent glyph, the same as the top bar's active control. */
            const { rerender } = render(<InspectorHeader {...defaultProps} keptOpen={false} />);

            const unlatched = screen.getByRole("button", { name: "Keep open" });
            const unlatchedGround = window.getComputedStyle(unlatched).backgroundColor;

            expect(unlatched).toHaveAttribute("data-variant", "subtle");
            expect(unlatchedGround).toBe("rgba(0, 0, 0, 0)");

            rerender(<InspectorHeader {...defaultProps} keptOpen />);

            const latched = screen.getByRole("button", { name: "Keep open" });

            expect(latched).toHaveAttribute("data-variant", "light");
            expect(window.getComputedStyle(latched).backgroundColor).not.toBe(unlatchedGround);
            expect(latched).toHaveAccessibleName("Keep open");
            expect(latched.querySelector('[data-glyph="keepOpen"]')).not.toBeNull();
        });

        it("rests every control in the register's own secondary ink, the one the panel's header uses", () => {
            /* 2026-09-13, second pass: this row inked its resting controls with Mantine's
               `color="gray"`, which resolved to rgb(222,226,230), while the activity
               panel's header row two hundred pixels to the left inked its own with
               `PANEL_INK.CHROME` at rgb(163,168,177). One control, drawn twice, read as
               two greys. */
            render(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} keptOpen={false} />);

            const chrome = resolveColor(PANEL_INK.CHROME);

            for (const name of ["Copy reading", "Pin as A", "Keep open", "Toggle inspector"]) {
                expect(window.getComputedStyle(screen.getByRole("button", { name })).color).toBe(chrome);
            }
        });

        it("draws the same accent boundary on a latched control as the panel's latch does", () => {
            /* The 1px accent border, not the tint, is what meets WCAG 1.4.11's 3:1 for a
               state boundary; the ratio itself is measured once, on the panel's board,
               against the ground both rows sit on. Neither row draws the border: it comes
               from `@graphty/compact-mantine`'s ActionIcon theme, which is why the two
               rows cannot drift apart (2026-09-13, third pass -- until then this row
               spread a helper exported from the panel's header). */
            const { rerender } = render(<InspectorHeader {...defaultProps} keptOpen={false} />);

            expect(window.getComputedStyle(screen.getByTestId("inspector-keep-open")).borderTopColor).toBe(
                "rgba(0, 0, 0, 0)",
            );

            rerender(<InspectorHeader {...defaultProps} keptOpen />);

            const latched = window.getComputedStyle(screen.getByTestId("inspector-keep-open"));

            expect(latched.borderTopWidth).toBe("1px");
            expect(latched.borderTopStyle).toBe("solid");
            expect(latched.borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
            // The border is drawn in the variant's OWN ink, so it and the accent glyph
            // inside it read as one treatment rather than as two accents.
            expect(latched.borderTopColor).toBe(latched.color);
        });

        it("draws a held pin exactly as it draws a latch, which is the defect it had", () => {
            /* 2026-09-13, second pass: `Pin as A` passed `pressed` and no `active`, so a
               held pin rendered identically to an empty one -- the same defect the product
               owner reported for the latch, two slots away in this row. */
            const { rerender } = render(
                <InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} pinned={false} />,
            );

            const empty = screen.getByTestId("inspector-pin");
            const emptyGround = window.getComputedStyle(empty).backgroundColor;

            expect(empty).toHaveAttribute("data-variant", "subtle");
            expect(empty).toHaveAttribute("aria-pressed", "false");
            expect(window.getComputedStyle(empty).borderTopColor).toBe("rgba(0, 0, 0, 0)");

            rerender(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} pinned />);

            const held = screen.getByTestId("inspector-pin");

            expect(held).toHaveAttribute("data-variant", "light");
            expect(held).toHaveAttribute("aria-pressed", "true");
            expect(window.getComputedStyle(held).backgroundColor).not.toBe(emptyGround);
            expect(window.getComputedStyle(held).borderTopColor).not.toBe("rgba(0, 0, 0, 0)");
            expect(held).toHaveAccessibleName("Pin as A");
            expect(held.querySelector('[data-glyph="pin"]')).not.toBeNull();
        });

        it("tints only the latch, never the toggle, which is pressed in every state", () => {
            // The toggle passes `pressed` hardcoded true -- the column is open whenever
            // this header is drawn -- so the tint is keyed off its own `active` prop and
            // not off `pressed`, or that chevron would be lit for ever.
            render(<InspectorHeader {...defaultProps} keptOpen />);

            const toggle = screen.getByRole("button", { name: "Toggle inspector" });

            expect(toggle).toHaveAttribute("aria-pressed", "true");
            expect(toggle).toHaveAttribute("data-variant", "subtle");
            expect(window.getComputedStyle(toggle).backgroundColor).toBe("rgba(0, 0, 0, 0)");
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
