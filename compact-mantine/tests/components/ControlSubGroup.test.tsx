import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, ControlSubGroup } from "../../src";
import { LabelsProvider } from "../../src/i18n";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderSubGroup(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside the compact theme with the text direction reversed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRtl(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </DirectionProvider>,
    );
}

describe("ControlSubGroup", () => {
    describe("anatomy", () => {
        it("names the sub-group", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-label")).toHaveTextContent("Text effects");
        });

        it("holds the controls it was given", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects" defaultOpened>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-content")).toHaveTextContent("Outline");
        });

        it("indents its content from the leading edge, not the left one", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects" defaultOpened>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            // The Mantine content element carries the indent; a physical
            // padding-left here would put the indent on the wrong side of a
            // right-to-left panel.
            const content = screen.getByTestId("control-sub-group-content").parentElement;
            expect(content?.getAttribute("style")).toContain("padding-inline-start: 8px");
            expect(content?.getAttribute("style")).not.toContain("padding-left");
        });

        it("gives the header a 24px pointer target", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            // WCAG 2.2 target size (2.5.8). The label is 10px type, so the
            // header is stretched to the library's 24px toggle pitch.
            expect(screen.getByTestId("control-sub-group-control")).toHaveStyle({ minHeight: "24px" });
        });

        it("draws the label shortened rather than wrapped, with the whole string reachable", () => {
            const label = "Text effects, outlines and drop shadows";
            renderSubGroup(
                <ControlSubGroup label={label}>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            const name = screen.getByTestId("control-sub-group-label");
            expect(name).toHaveStyle({ textOverflow: "ellipsis", whiteSpace: "nowrap" });
            expect(name).toHaveAttribute("title", label);
            // Ellipsising is a drawing, not a truncation: the whole string is
            // still the element's text.
            expect(name).toHaveTextContent(label);
        });
    });

    describe("the Mantine rebase", () => {
        it("draws the header as one button, with no button nested inside it", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            const control = screen.getByTestId("control-sub-group-control");
            expect(control.tagName).toBe("BUTTON");
            // The defect the rebase removes: the previous revision drew the
            // chevron as an ActionIcon, which is a real button, inside a
            // role="button" header. A button inside a button is invalid HTML.
            expect(control.querySelector("button")).toBeNull();
        });

        it("draws the chevron as inert artwork rather than a control", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            const chevron = screen.getByTestId("control-sub-group-control").querySelector("svg");
            expect(chevron).toHaveAttribute("aria-hidden", "true");
            expect(chevron).toHaveAttribute("focusable", "false");
        });

        it("points the chevron along the text direction when closed and down when open", async () => {
            const user = userEvent.setup();
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            const glyph = (): Element | null =>
                screen.getByTestId("control-sub-group-control").querySelector("[data-glyph]");

            expect(glyph()).toHaveAttribute("data-glyph", "chevronRight");
            await user.click(screen.getByTestId("control-sub-group-control"));
            await waitFor(() => {
                expect(glyph()).toHaveAttribute("data-glyph", "chevronDown");
            });
        });

        it("mirrors the closed chevron when text runs right to left", () => {
            renderRtl(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-control").querySelector("[data-glyph]")).toHaveAttribute(
                "data-glyph",
                "chevronLeft",
            );
        });
    });

    describe("the disclosure", () => {
        it("starts closed", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-control")).toHaveAttribute("aria-expanded", "false");
            expect(screen.getByText("Outline")).not.toBeVisible();
        });

        it("keeps its content in the document while it is closed", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div data-testid="child">Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("child")).toBeInTheDocument();
            expect(screen.getByTestId("child")).not.toBeVisible();
        });

        it("starts open when told to", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects" defaultOpened>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-control")).toHaveAttribute("aria-expanded", "true");
            expect(screen.getByText("Outline")).toBeVisible();
        });

        it("still honours the superseded defaultOpen spelling", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects" defaultOpen>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-control")).toHaveAttribute("aria-expanded", "true");
        });

        it("lets defaultOpened win over the superseded defaultOpen", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects" defaultOpen defaultOpened={false}>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-control")).toHaveAttribute("aria-expanded", "false");
        });

        it("opens and closes when the header is clicked", async () => {
            const user = userEvent.setup();
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            const control = screen.getByTestId("control-sub-group-control");
            await user.click(control);
            await waitFor(() => {
                expect(screen.getByText("Outline")).toBeVisible();
            });

            await user.click(control);
            await waitFor(() => {
                expect(screen.getByText("Outline")).not.toBeVisible();
            });
        });

        it("reports the new state first and the event that caused it second", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            renderSubGroup(
                <ControlSubGroup label="Text effects" onOpenChange={onOpenChange}>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            await user.click(screen.getByTestId("control-sub-group-control"));

            expect(onOpenChange).toHaveBeenCalledTimes(1);
            const [opened, event] = onOpenChange.mock.calls[0];
            expect(opened).toBe(true);
            // The event is what a consumer needs to read a modifier key or call
            // preventDefault; Mantine's own Accordion reports the value alone.
            expect(event).toBeDefined();
            expect(event.type).toBe("click");
        });

        it("does not open on its own when it is driven from outside", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            renderSubGroup(
                <ControlSubGroup label="Text effects" opened={false} onOpenChange={onOpenChange}>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            await user.click(screen.getByTestId("control-sub-group-control"));

            expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
            expect(screen.getByTestId("control-sub-group-control")).toHaveAttribute("aria-expanded", "false");
        });

        it("follows a change made from outside", () => {
            const { rerender } = renderSubGroup(
                <ControlSubGroup label="Text effects" opened={false}>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-control")).toHaveAttribute("aria-expanded", "false");

            rerender(
                <MantineProvider theme={compactTheme}>
                    <ControlSubGroup label="Text effects" opened>
                        <div>Outline</div>
                    </ControlSubGroup>
                </MantineProvider>,
            );

            expect(screen.getByTestId("control-sub-group-control")).toHaveAttribute("aria-expanded", "true");
        });
    });

    describe("accessibility", () => {
        it("follows the accordion pattern: an expanded button pointing at a named region", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects" defaultOpened>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            const control = screen.getByTestId("control-sub-group-control");
            const panel = screen.getByTestId("control-sub-group-panel");

            expect(control).toHaveAttribute("aria-expanded", "true");
            expect(control).toHaveAttribute("aria-controls", panel.id);
            expect(panel).toHaveAttribute("role", "region");
            expect(panel).toHaveAttribute("aria-labelledby", control.id);
        });

        it("names the header with the verb in front of the sub-group's own name", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByRole("button", { name: "Expand Text effects" })).toBeInTheDocument();
        });

        it("turns the verb around when the sub-group is open", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects" defaultOpened>
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            expect(screen.getByRole("button", { name: "Collapse Text effects" })).toBeInTheDocument();
        });

        it("is reachable by Tab", async () => {
            const user = userEvent.setup();
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div>Outline</div>
                </ControlSubGroup>,
            );

            await user.tab();
            expect(document.activeElement).toBe(screen.getByTestId("control-sub-group-control"));
        });

        it("opens on Enter", async () => {
            const user = userEvent.setup();
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div data-testid="child">Outline</div>
                </ControlSubGroup>,
            );

            screen.getByTestId("control-sub-group-control").focus();
            await user.keyboard("{Enter}");

            await waitFor(() => {
                expect(screen.getByTestId("child")).toBeVisible();
            });
        });

        it("opens on Space", async () => {
            const user = userEvent.setup();
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <div data-testid="child">Outline</div>
                </ControlSubGroup>,
            );

            screen.getByTestId("control-sub-group-control").focus();
            await user.keyboard(" ");

            await waitFor(() => {
                expect(screen.getByTestId("child")).toBeVisible();
            });
        });

        it("keeps a closed sub-group's controls out of the tab order", () => {
            renderSubGroup(
                <ControlSubGroup label="Text effects">
                    <button type="button">Outline</button>
                </ControlSubGroup>,
            );

            expect(screen.getByTestId("control-sub-group-panel")).toHaveAttribute("aria-hidden", "true");
        });
    });

    describe("internationalization", () => {
        it("takes the header's accessible name from the label set", () => {
            render(
                <LabelsProvider
                    labels={{
                        expandSection: (label: string) => `Ouvrir ${label}`,
                        collapseSection: (label: string) => `Fermer ${label}`,
                    }}
                >
                    <MantineProvider theme={compactTheme}>
                        <ControlSubGroup label="Effets">
                            <div>Contour</div>
                        </ControlSubGroup>
                    </MantineProvider>
                </LabelsProvider>,
            );

            expect(screen.getByRole("button", { name: "Ouvrir Effets" })).toBeInTheDocument();
        });
    });
});
