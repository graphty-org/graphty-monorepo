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
        /*
         * SEVEN BOARDS STOOD HERE and are retired with the two controls they tested. The
         * trailing cluster ended in a "Keep open" latch and a collapse chevron until
         * 2026-09-14; both were individual controls over ONE sidebar, and the product
         * owner asked for "one button to hide / show both at the same time and not
         * individual buttons". They pinned the cluster's order, the latch's padlock
         * against the pin's pushpin, its tinted ground, its accent boundary, the resting
         * ink of all four controls, that the toggle was never tinted, and that no latch
         * was drawn where a region supplied none.
         *
         * What they were really measuring is NOT lost. The pressed treatment and its
         * WCAG 1.4.11 boundary belong to `@graphty/compact-mantine`'s shared ActionIcon
         * theme, and the comparison pin below still measures both on this very row.
         */
        it("carries Copy reading alone, and a pin where one is allowed", () => {
            const { rerender } = render(<InspectorHeader {...defaultProps} />);

            const namesOf = () =>
                Array.from(screen.getByTestId("inspector-header-actions").querySelectorAll("button")).map((button) =>
                    button.getAttribute("aria-label"),
                );

            expect(namesOf()).toEqual(["Copy reading"]);

            rerender(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} />);

            expect(namesOf()).toEqual(["Copy reading", "Pin as A"]);
        });

        it("draws neither a latch nor a collapse control, at any width", () => {
            render(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} />);

            expect(screen.queryByRole("button", { name: "Keep open" })).toBeNull();
            expect(screen.queryByRole("button", { name: "Toggle inspector" })).toBeNull();
            expect(screen.queryByTestId("inspector-keep-open")).toBeNull();
            expect(screen.queryByTestId("inspector-toggle")).toBeNull();
        });

        it("rests every control it still draws in the register's own secondary ink", () => {
            /* 2026-09-13, second pass: this row inked its resting controls with Mantine's
               `color="gray"`, which resolved to rgb(222,226,230), while the activity
               panel's header row two hundred pixels to the left inked its own with
               `PANEL_INK.CHROME` at rgb(163,168,177). One control, drawn twice, read as
               two greys. */
            render(<InspectorHeader {...defaultProps} kindLabel="Node" showPin onPin={vi.fn()} />);

            const chrome = resolveColor(PANEL_INK.CHROME);

            for (const name of ["Copy reading", "Pin as A"]) {
                expect(window.getComputedStyle(screen.getByRole("button", { name })).color).toBe(chrome);
            }
        });

        it("draws a held pin distinctly from an empty one, which is the defect it had", () => {
            /* 2026-09-13, second pass: `Pin as A` passed `pressed` and no `active`, so a
               held pin rendered identically to an empty one -- the same defect the product
               owner reported for the latch that used to sit two slots away in this row.
               With the latch gone this is the row's only remaining measurement of the
               shared ActionIcon `light` treatment and its 1px accent boundary. */
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

        /* Three activation boards went with their controls on 2026-09-14: latching the
           column, releasing the latch from the same control, and collapsing the column
           from the chevron. */
    });
});
