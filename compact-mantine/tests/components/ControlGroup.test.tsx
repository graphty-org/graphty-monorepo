import { ActionIcon, MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlGroup } from "../../src";
import { PANEL_INK } from "../../src/constants/panel";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderGroup(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("ControlGroup", () => {
    describe("anatomy", () => {
        it("names the group", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            expect(screen.getByTestId("control-group-label")).toHaveTextContent("Appearance");
        });

        it("holds the controls it was given", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            expect(screen.getByTestId("control-group-content")).toHaveTextContent("Content");
        });

        it("draws the 1px rule above the header, in the theme-aware divider ink", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            const divider = screen.getByTestId("control-group-divider");
            expect(divider).toHaveAttribute("role", "separator");
            expect(divider.getAttribute("style")).toContain(PANEL_INK.DIVIDER);
        });

        it("draws the header buttons when it is given some", () => {
            renderGroup(
                <ControlGroup label="Appearance" actions={<ActionIcon aria-label="Reset appearance">+</ActionIcon>}>
                    <div>Content</div>
                </ControlGroup>,
            );

            const actions = screen.getByTestId("control-group-actions");
            expect(within(actions).getByRole("button", { name: "Reset appearance" })).toBeInTheDocument();
        });

        it("draws no header button area when it was given none", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            // The area is not merely empty: an empty flex item would still
            // spend the header's 4px gap on nothing.
            expect(screen.queryByTestId("control-group-actions")).not.toBeInTheDocument();
        });

        it("shortens a long name rather than wrapping it, and keeps the whole string reachable", () => {
            const label = "Betweenness centrality thresholds";
            renderGroup(
                <ControlGroup label={label}>
                    <div>Content</div>
                </ControlGroup>,
            );

            const name = screen.getByTestId("control-group-label");
            expect(name).toHaveStyle({ textOverflow: "ellipsis", whiteSpace: "nowrap" });
            expect(name).toHaveAttribute("title", label);
            // Ellipsising is a drawing, not a truncation: the whole string is
            // still the element's text and still the group's accessible name.
            expect(name).toHaveTextContent(label);
        });
    });

    describe("the bleed", () => {
        it("keeps the rule inside the group by default", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            expect(screen.getByTestId("control-group-divider").getAttribute("style")).not.toContain("margin-inline");
        });

        it("pulls the rule out through the container's padding when asked", () => {
            renderGroup(
                <ControlGroup label="Appearance" bleed>
                    <div>Content</div>
                </ControlGroup>,
            );

            // An inline margin rather than a left and a right one, so a
            // right-to-left panel bleeds to the same two edges.
            const style = screen.getByTestId("control-group-divider").getAttribute("style") ?? "";
            expect(style).toContain("margin-inline");
            expect(style).not.toContain("margin-left");
            expect(style).not.toContain("margin-right");
        });
    });

    describe("logical layout", () => {
        it("pads the header on the inline axis rather than the physical one", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            const style = screen.getByTestId("control-group-header").getAttribute("style") ?? "";
            expect(style).toContain("padding-inline: 8px");
            expect(style).not.toContain("padding-left");
            expect(style).not.toContain("padding-right");
        });
    });

    describe("accessibility", () => {
        it("announces the controls as one group named by the header", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            // The ARIA practices' grouping technique: role="group" named from
            // the text already on the screen, so every control inside is
            // announced as belonging to it.
            expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
        });

        it("takes the group's name from the visible header rather than restating it", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            const group = screen.getByTestId("control-group");
            expect(group).not.toHaveAttribute("aria-label");
            expect(group.getAttribute("aria-labelledby")).toBe(screen.getByTestId("control-group-label").id);
        });

        it("keeps two groups' names apart", () => {
            renderGroup(
                <>
                    <ControlGroup label="Appearance">
                        <div>One</div>
                    </ControlGroup>
                    <ControlGroup label="Layout">
                        <div>Two</div>
                    </ControlGroup>
                </>,
            );

            expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
            expect(screen.getByRole("group", { name: "Layout" })).toBeInTheDocument();
        });

        it("leaves the header buttons outside the group's own name", () => {
            renderGroup(
                <ControlGroup label="Appearance" actions={<ActionIcon aria-label="Reset appearance">+</ActionIcon>}>
                    <div>Content</div>
                </ControlGroup>,
            );

            // The buttons carry names of their own; the group's name describes
            // the controls, not the buttons.
            expect(screen.getByRole("group", { name: "Appearance" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Reset appearance" })).toBeInTheDocument();
        });

        it("takes no focus of its own: nothing here is interactive", () => {
            renderGroup(
                <ControlGroup label="Appearance">
                    <div>Content</div>
                </ControlGroup>,
            );

            // A group that never folds has no header button, which is the whole
            // difference between this component and ControlSection.
            const group = screen.getByTestId("control-group");
            expect(group.querySelector("button")).toBeNull();
            expect(group.querySelector("[tabindex]")).toBeNull();
        });
    });
});
