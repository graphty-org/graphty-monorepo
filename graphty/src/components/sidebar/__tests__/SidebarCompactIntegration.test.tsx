import { PANEL_GRID, PopoutManager } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it } from "vitest";

import { render, screen, within } from "../../../test/test-utils";
import type { LayerItem } from "../../layout/LeftSidebar";
import { ShellProvider } from "../../shell/ShellContext";
import { StyleLayerPropertiesPanel } from "../panels/StyleLayerPropertiesPanel";

/**
 * Integration regression tests for the style inspector's geometry.
 *
 * WHAT THIS FILE USED TO TEST, AND WHY IT DOES NOT ANY MORE. It asserted that the
 * sidebar's own `NodeShapeControl`, `NodeColorControl` and `GradientEditor` -- three local
 * components built out of raw Mantine `NativeSelect`, `NumberInput`, `ColorInput` and
 * `Slider` -- rendered at the compact theme's 24px height and 11px type. All three are
 * gone. The style inspector is built out of `@graphty/compact-mantine` now, which owns
 * that geometry and tests it in its own package, and design 6.17 check 1 forbids a
 * call-site substitute for a library control, so there is nothing left here to keep in
 * step with the theme by hand.
 *
 * WHAT IT TESTS INSTEAD is the thing the product owner actually reported and no test
 * caught: "there is no left margin on the style inspector tab". That is a property of the
 * whole rendered surface rather than of any one control, which is exactly what an
 * integration board is for. The local `ControlSection` fork drew no horizontal padding at
 * all, and the node half was not inside a section of any kind, so every node control sat
 * hard against the left edge of a panel whose Source section -- drawn one component higher
 * with the library's own `ControlSection` -- was inset 16px.
 */

const layer: LayerItem = {
    id: "integration-layer",
    name: "Integration Layer",
    styleLayer: {
        node: { selector: "", style: { texture: { color: "#E11D48" } } },
        edge: { selector: "", style: { line: { type: "solid", width: 8, color: "#A9A9A9" } } },
    },
};

/**
 * Renders the panel with the two contexts it needs.
 * @returns the render result.
 */
function renderPanel(): ReturnType<typeof render> {
    return render(
        <ShellProvider persist={false} initialShellWidth={1440}>
            <PopoutManager>
                <StyleLayerPropertiesPanel layer={layer} />
            </PopoutManager>
        </ShellProvider>,
    );
}

describe("the style inspector's left margin", () => {
    it("insets every section header by the panel grid's PAD_LEFT", () => {
        renderPanel();

        for (const header of screen.getAllByTestId("control-section-header")) {
            expect(window.getComputedStyle(header).paddingInlineStart).toBe(`${String(PANEL_GRID.PAD_LEFT)}px`);
        }
    });

    it("insets every section body by the same amount", () => {
        renderPanel();

        for (const body of screen.getAllByTestId("control-section-content")) {
            expect(window.getComputedStyle(body).paddingInlineStart).toBe(`${String(PANEL_GRID.PAD_LEFT)}px`);
        }
    });

    it("puts every control inside a section, so nothing can sit outside the inset", () => {
        /* The half of the defect an import swap would not have fixed: the node channels
           used to live in a bare Box that was in no section at all. */
        renderPanel();

        const sections = screen.getAllByTestId("control-section");

        for (const control of screen.getAllByTestId("control-group")) {
            expect(sections.some((section) => section.contains(control))).toBe(true);
        }
    });
});

describe("the style inspector is drawn with library controls only", () => {
    it("draws its channel rows with compact-mantine groups and fields", () => {
        renderPanel();

        expect(screen.getAllByTestId("control-group").length).toBeGreaterThan(0);
        expect(within(screen.getByRole("group", { name: "Shape" })).getByTestId("style-select")).toBeInTheDocument();
        expect(screen.getAllByTestId("compact-color-input").length).toBeGreaterThan(0);
    });

    it("draws no raw Mantine NativeSelect, ColorInput or Slider anywhere on the surface", () => {
        /* The three primitives the deleted forks were built from. A raw one reappearing
           here is the signature of a call-site substitute for a library control. */
        renderPanel();

        expect(document.querySelector(".mantine-NativeSelect-input")).toBeNull();
        expect(document.querySelector(".mantine-ColorInput-input")).toBeNull();
        expect(document.querySelector(".mantine-Slider-root")).toBeNull();
    });
});
