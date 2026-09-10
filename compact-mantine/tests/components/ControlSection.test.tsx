import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../src";
import { ControlSection } from "../../src/components/ControlSection";
import { AdvancedButton } from "../../src/components/rows/TrailingSlot";
import { PANEL_INK } from "../../src/constants/panel";
import { LabelsProvider } from "../../src/i18n";
import { UiGlyph } from "../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderSection(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside a right-to-left direction context.
 *
 * `detectDirection` is off so the provider does not read a direction off the
 * document and does not write one back to it, which would leak into every other
 * test in the file.
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

const EXPLANATION = "How often a cat sits on the shortest path between two others.";

afterEach(() => {
    vi.restoreAllMocks();
});

describe("ControlSection", () => {
    describe("anatomy", () => {
        it("names the section", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-name")).toHaveTextContent("Size");
        });

        it("draws the 1px rule above the header, in the theme-aware divider ink", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            const divider = screen.getByTestId("control-section-divider");
            expect(divider).toHaveAttribute("role", "separator");
            expect(divider.getAttribute("style")).toContain(PANEL_INK.DIVIDER);
            expect(divider.getAttribute("style")).toContain("0.0625rem");
        });

        it("draws the header at the frozen 32px", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-header")).toHaveStyle({ height: "32px" });
        });

        it("holds the chevron in a 16px slot", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-chevron-slot")).toHaveStyle({
                width: "16px",
                height: "16px",
            });
        });

        it("pads 8px below the last content row", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-content")).toHaveStyle({ paddingBottom: "8px" });
        });

        it("draws the name in the primary text colour when the section holds something", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-name").style.color).toContain("--mantine-color-text");
        });

        it("draws the name in the secondary text colour when the section is empty", () => {
            renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            expect(screen.getByTestId("control-section-name").style.color).toBe(PANEL_INK.CHROME);
        });
    });

    // Contract 2.3: the 16px leading / 8px trailing asymmetry has to be written
    // logically or a right-to-left panel inverts its own grid. jsdom does no
    // layout, so what is assertable here is that the component writes the
    // logical property and never the physical one -- the flip itself is the
    // browser's, and the Storybook RightToLeft story is where it is seen.
    describe("the panel padding, written logically", () => {
        it("pads the header 16px at the leading edge and 8px at the trailing edge", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            const header = screen.getByTestId("control-section-header");
            expect(header.style.getPropertyValue("padding-inline-start")).toBe("16px");
            expect(header.style.getPropertyValue("padding-inline-end")).toBe("8px");
        });

        it("pads the content rows onto the same grid", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            const content = screen.getByTestId("control-section-content");
            expect(content.style.getPropertyValue("padding-inline-start")).toBe("16px");
            expect(content.style.getPropertyValue("padding-inline-end")).toBe("8px");
        });

        it("writes no physical left or right padding anywhere in the header or the content", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            for (const testId of ["control-section-header", "control-section-content"]) {
                const style = screen.getByTestId(testId).getAttribute("style") ?? "";
                expect(style).not.toContain("padding-left");
                expect(style).not.toContain("padding-right");
            }
        });

        it("aligns the name to the edge the reader starts from", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-toggle").style.getPropertyValue("text-align")).toBe("start");
        });
    });

    describe("right to left", () => {
        it("points a collapsed section's chevron the way the text runs", () => {
            const { container } = renderRtl(
                <ControlSection label="Size" defaultOpened={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(container.querySelector('[data-glyph="chevronLeft"]')).toBeInTheDocument();
            expect(container.querySelector('[data-glyph="chevronRight"]')).toBeNull();
        });

        it("still points an open section's chevron down", () => {
            const { container } = renderRtl(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(container.querySelector('[data-glyph="chevronDown"]')).toBeInTheDocument();
        });

        it("points the chevron to the right when nobody has set a direction", () => {
            const { container } = renderSection(
                <ControlSection label="Size" defaultOpened={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(container.querySelector('[data-glyph="chevronRight"]')).toBeInTheDocument();
            expect(container.querySelector('[data-glyph="chevronLeft"]')).toBeNull();
        });
    });

    describe("a section always expands", () => {
        it("draws the chevron when there is something to expand", () => {
            const { container } = renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(container.querySelector('[data-glyph="chevronDown"]')).toBeInTheDocument();
        });

        it("turns the chevron to its sideways form when the section is closed", () => {
            const { container } = renderSection(
                <ControlSection label="Size" defaultOpened={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(container.querySelector('[data-glyph="chevronRight"]')).toBeInTheDocument();
            expect(container.querySelector('[data-glyph="chevronDown"]')).toBeNull();
        });

        it("draws no chevron glyph at all on an empty section, and leaves the slot blank", () => {
            const { container } = renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            expect(container.querySelector('[data-glyph="chevronDown"]')).toBeNull();
            expect(container.querySelector('[data-glyph="chevronRight"]')).toBeNull();
            expect(screen.getByTestId("control-section-chevron-slot")).toBeEmptyDOMElement();
        });

        it("offers no expand target on an empty section", () => {
            renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            expect(screen.queryByTestId("control-section-toggle")).not.toBeInTheDocument();
        });

        it("warns in development when it is given neither children nor empty", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            renderSection(<ControlSection label="Edge properties" />);

            expect(warn).toHaveBeenCalledTimes(1);
            const message = String(warn.mock.calls[0][0]);
            expect(message).toContain('ControlSection "Edge properties"');
            expect(message).toContain("empty");
        });

        it("writes that warning for someone who has never seen this project", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            renderSection(<ControlSection label="Edge properties" />);

            // Contract 7.2: three of the package's console.warn strings leaked
            // in-house codenames into a consumer's own devtools. This one must
            // say what to do instead, in words that stand alone.
            const message = String(warn.mock.calls[0][0]);
            expect(message).not.toMatch(/RT-\d|VOCAB|DECISIONS|COMPACTION|the door|the floor|Phase \d/i);
            expect(message).toMatch(/pass the rows/i);
        });

        it("warns when its children collapse to nothing", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const showAdvanced = false;

            renderSection(<ControlSection label="Size">{showAdvanced && <div>Advanced</div>}</ControlSection>);

            expect(warn).toHaveBeenCalledWith(expect.stringContaining("Size"));
        });

        it("does not warn when it holds rows", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(warn).not.toHaveBeenCalled();
        });

        it("does not warn when it is marked empty", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

            renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            expect(warn).not.toHaveBeenCalled();
        });

        it("keeps its rows on the panel beside an advanced settings button rather than behind it", () => {
            renderSection(
                <ControlSection label="Layout" actions={<AdvancedButton label="Advanced" onClick={vi.fn()} />}>
                    <div>Link distance</div>
                </ControlSection>,
            );

            expect(screen.getByText("Link distance")).toBeVisible();
            expect(screen.getByRole("button", { name: "Advanced" })).toBeInTheDocument();
        });
    });

    describe("the uncontrolled open state", () => {
        it("starts open, because defaultOpened defaults to true", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByText("Smallest node size")).toBeVisible();
        });

        it("starts closed when defaultOpened is false", () => {
            renderSection(
                <ControlSection label="Size" defaultOpened={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByText("Smallest node size")).not.toBeVisible();
        });

        it("closes on a click of the header", async () => {
            const user = userEvent.setup();
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.click(screen.getByText("Size"));

            await waitFor(() => {
                expect(screen.getByText("Smallest node size")).not.toBeVisible();
            });
        });
    });

    describe("the controlled open state", () => {
        it("shows the rows when opened is true", () => {
            renderSection(
                <ControlSection label="Size" opened onOpenChange={vi.fn()}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByText("Smallest node size")).toBeVisible();
        });

        it("hides the rows when opened is false, whatever defaultOpened says", () => {
            renderSection(
                <ControlSection label="Size" opened={false} defaultOpened onOpenChange={vi.fn()}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByText("Smallest node size")).not.toBeVisible();
        });

        it("asks the owner to open rather than opening itself", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            renderSection(
                <ControlSection label="Size" opened={false} onOpenChange={onOpenChange}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.click(screen.getByText("Size"));

            expect(onOpenChange).toHaveBeenCalledWith(true, expect.anything());
            expect(screen.getByText("Smallest node size")).not.toBeVisible();
        });
    });

    // Contract 1.4: a disclosure reports opened/defaultOpened/onOpenChange, and
    // the change carries the event so a consumer can read modifier keys or call
    // preventDefault.
    describe("the disclosure event model", () => {
        it("reports the new state first and the event second", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            renderSection(
                <ControlSection label="Size" onOpenChange={onOpenChange}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.click(screen.getByText("Size"));

            expect(onOpenChange).toHaveBeenCalledTimes(1);
            const [opened, event] = onOpenChange.mock.calls[0];
            expect(opened).toBe(false);
            expect(event).toMatchObject({ type: "click" });
        });

        it("hands over an event a consumer can read modifier keys from", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            renderSection(
                <ControlSection label="Size" onOpenChange={onOpenChange}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.keyboard("{Shift>}");
            await user.click(screen.getByText("Size"));
            await user.keyboard("{/Shift}");

            expect(onOpenChange.mock.calls[0][1]).toMatchObject({ shiftKey: true });
        });

        it("still calls the superseded onOpenedChange, with the state alone", async () => {
            const user = userEvent.setup();
            const onOpenedChange = vi.fn();
            renderSection(
                <ControlSection label="Size" onOpenedChange={onOpenedChange}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.click(screen.getByText("Size"));

            expect(onOpenedChange).toHaveBeenCalledWith(false);
        });

        it("calls both handlers when a consumer has migrated only halfway", async () => {
            const user = userEvent.setup();
            const onOpenChange = vi.fn();
            const onOpenedChange = vi.fn();
            renderSection(
                <ControlSection label="Size" onOpenChange={onOpenChange} onOpenedChange={onOpenedChange}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.click(screen.getByText("Size"));

            expect(onOpenChange).toHaveBeenCalledTimes(1);
            expect(onOpenedChange).toHaveBeenCalledTimes(1);
        });

        it("still honours the superseded defaultOpen", () => {
            renderSection(
                <ControlSection label="Size" defaultOpen={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByText("Smallest node size")).not.toBeVisible();
        });

        it("lets defaultOpened win when both spellings are passed", () => {
            renderSection(
                <ControlSection label="Size" defaultOpened defaultOpen={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByText("Smallest node size")).toBeVisible();
        });

        it("hands the activating event to onAdd", async () => {
            const user = userEvent.setup();
            const onAdd = vi.fn();
            renderSection(<ControlSection label="Edge properties" empty onAdd={onAdd} />);

            await user.click(screen.getByTestId("control-section-add"));

            expect(onAdd).toHaveBeenCalledTimes(1);
            expect(onAdd.mock.calls[0][0]).toMatchObject({ type: "click" });
        });
    });

    describe("the keyboard route", () => {
        it("reaches the header with Tab", async () => {
            const user = userEvent.setup();
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.tab();

            expect(screen.getByTestId("control-section-toggle")).toHaveFocus();
        });

        it("toggles on Enter", async () => {
            const user = userEvent.setup();
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.tab();
            await user.keyboard("{Enter}");

            await waitFor(() => {
                expect(screen.getByText("Smallest node size")).not.toBeVisible();
            });
        });

        it("toggles on Space", async () => {
            const user = userEvent.setup();
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            await user.tab();
            await user.keyboard(" ");

            await waitFor(() => {
                expect(screen.getByText("Smallest node size")).not.toBeVisible();
            });
        });

        it("adds from the keyboard on an empty section", async () => {
            const user = userEvent.setup();
            const onAdd = vi.fn();
            renderSection(<ControlSection label="Edge properties" empty onAdd={onAdd} />);

            await user.tab();
            await user.keyboard("{Enter}");

            expect(onAdd).toHaveBeenCalledTimes(1);
        });
    });

    // Accessibility: the APG "Disclosure (Show/Hide)" pattern.
    describe("accessible names and states", () => {
        it("names the group from the section's own visible name", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByRole("group", { name: "Size" })).toBe(screen.getByTestId("control-section"));
        });

        it("names the expand target for its current state", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByRole("button", { name: "Collapse Size" })).toBeInTheDocument();
        });

        it("names the expand target when the section is closed", () => {
            renderSection(
                <ControlSection label="Size" defaultOpened={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByRole("button", { name: "Expand Size" })).toBeInTheDocument();
        });

        it("keeps the section's visible name inside the button's accessible name", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            // WCAG 2.5.3 (Label in Name): a voice-control user says "Size",
            // so the visible word has to survive inside the accessible name.
            expect(screen.getByTestId("control-section-toggle").getAttribute("aria-label")).toContain("Size");
        });

        it("reports aria-expanded", () => {
            const { rerender } = renderSection(
                <ControlSection label="Size" opened onOpenChange={vi.fn()}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-toggle")).toHaveAttribute("aria-expanded", "true");

            rerender(
                <MantineProvider theme={compactTheme}>
                    <ControlSection label="Size" opened={false} onOpenChange={vi.fn()}>
                        <div>Smallest node size</div>
                    </ControlSection>
                </MantineProvider>,
            );

            expect(screen.getByTestId("control-section-toggle")).toHaveAttribute("aria-expanded", "false");
        });

        it("points the header at the content it expands", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            const controls = screen.getByTestId("control-section-toggle").getAttribute("aria-controls");
            expect(controls).not.toBeNull();
            expect(document.getElementById(controls ?? "")).toBeInTheDocument();
        });

        it("names the + of an empty section", () => {
            renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            const add = screen.getByRole("button", { name: "Add Edge properties" });
            expect(add).toHaveAttribute("title", "Add Edge properties");
        });
    });

    // Contract 2.1: every string the section speaks comes from useLabels(), so
    // a consumer can translate or reword all of them and none is stuck in
    // English.
    describe("translation", () => {
        it("takes its expand and collapse verbs from the labels", () => {
            render(
                <LabelsProvider
                    labels={{
                        collapseSection: (label: string): string => `Masquer ${label}`,
                        expandSection: (label: string): string => `Afficher ${label}`,
                    }}
                >
                    <MantineProvider theme={compactTheme}>
                        <ControlSection label="Taille">
                            <div>Taille minimale</div>
                        </ControlSection>
                    </MantineProvider>
                </LabelsProvider>,
            );

            expect(screen.getByRole("button", { name: "Masquer Taille" })).toBeInTheDocument();
        });

        it("takes the + button's name from the labels", () => {
            render(
                <LabelsProvider labels={{ addToSection: (label: string): string => `Ajouter ${label}` }}>
                    <MantineProvider theme={compactTheme}>
                        <ControlSection label="Aretes" empty onAdd={vi.fn()} />
                    </MantineProvider>
                </LabelsProvider>,
            );

            expect(screen.getByRole("button", { name: "Ajouter Aretes" })).toBeInTheDocument();
        });

        it("takes the configured-values dot's name from the labels", () => {
            render(
                <LabelsProvider
                    labels={{
                        sectionHasConfiguredValues: (label: string): string => `${label} a des valeurs definies`,
                    }}
                >
                    <MantineProvider theme={compactTheme}>
                        <ControlSection label="Taille" hasConfiguredValues>
                            <div>Taille minimale</div>
                        </ControlSection>
                    </MantineProvider>
                </LabelsProvider>,
            );

            expect(screen.getByLabelText("Taille a des valeurs definies")).toBeInTheDocument();
        });

        it("takes the explanation button's name from the labels", () => {
            render(
                <LabelsProvider labels={{ about: (label: string): string => `A propos de ${label}` }}>
                    <MantineProvider theme={compactTheme}>
                        <ControlSection label="Taille" info={EXPLANATION}>
                            <div>Taille minimale</div>
                        </ControlSection>
                    </MantineProvider>
                </LabelsProvider>,
            );

            expect(screen.getByRole("button", { name: "A propos de Taille" })).toBeInTheDocument();
        });

        it("speaks English when nobody supplies labels", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByRole("button", { name: "Collapse Size" })).toBeInTheDocument();
        });
    });

    describe("empty", () => {
        it("carries one + in the trailing slot", () => {
            const { container } = renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            expect(screen.getByTestId("trailing-slot")).toBeInTheDocument();
            expect(container.querySelector('[data-glyph="plus"]')).toBeInTheDocument();
        });

        it("commits on click", async () => {
            const user = userEvent.setup();
            const onAdd = vi.fn();
            renderSection(<ControlSection label="Edge properties" empty onAdd={onAdd} />);

            await user.click(screen.getByTestId("control-section-add"));

            expect(onAdd).toHaveBeenCalledTimes(1);
        });

        it("does not render children", () => {
            renderSection(
                <ControlSection label="Edge properties" empty onAdd={vi.fn()}>
                    <div>Smallest edge width</div>
                </ControlSection>,
            );

            expect(screen.queryByText("Smallest edge width")).not.toBeInTheDocument();
            expect(screen.queryByTestId("control-section-content")).not.toBeInTheDocument();
        });

        it("writes no empty-state sentence", () => {
            renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            expect(screen.queryByText(/not set/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/none/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/default/i)).not.toBeInTheDocument();
        });

        // WCAG 1.4.1 (Use of Colour): the dimmed name cannot be the only thing
        // that says a section is not set up.
        it("says it in shape as well as in colour", () => {
            const { container } = renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            expect(screen.getByTestId("control-section-chevron-slot")).toBeEmptyDOMElement();
            expect(container.querySelector('[data-glyph="plus"]')).toBeInTheDocument();
        });

        it("says it in words to a screen reader, through the button that fills it", () => {
            renderSection(<ControlSection label="Edge properties" empty onAdd={vi.fn()} />);

            const group = screen.getByRole("group", { name: "Edge properties" });
            expect(group).toHaveAttribute("data-empty", "true");
            expect(screen.getByRole("button", { name: "Add Edge properties" })).toBeInTheDocument();
        });

        it("marks a section that holds something as not empty", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section")).not.toHaveAttribute("data-empty");
        });

        it("draws no + when there is nothing to add", () => {
            const { container } = renderSection(<ControlSection label="Edge properties" empty />);

            expect(container.querySelector('[data-glyph="plus"]')).toBeNull();
            expect(screen.queryByTestId("control-section-add")).not.toBeInTheDocument();
        });

        it("keeps the + to the empty section", () => {
            renderSection(
                <ControlSection label="Size" onAdd={vi.fn()}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.queryByTestId("control-section-add")).not.toBeInTheDocument();
        });
    });

    describe("hasConfiguredValues", () => {
        it("draws its dot", () => {
            renderSection(
                <ControlSection label="Size" hasConfiguredValues>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByLabelText("Size has configured values")).toBeInTheDocument();
        });

        it("announces the dot as an image with a name of its own", () => {
            renderSection(
                <ControlSection label="Size" hasConfiguredValues>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByRole("img", { name: "Size has configured values" })).toBe(
                screen.getByTestId("control-section-dot"),
            );
        });

        it("draws no dot when the section carries no explicit value", () => {
            renderSection(
                <ControlSection label="Size" hasConfiguredValues={false}>
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.queryByLabelText("Size has configured values")).not.toBeInTheDocument();
        });
    });

    describe("info", () => {
        it("puts the explanation behind a named circle rather than on the panel", () => {
            renderSection(
                <ControlSection label="Betweenness" info={EXPLANATION}>
                    <div>Nodes to rank</div>
                </ControlSection>,
            );

            expect(screen.getByRole("button", { name: "About Betweenness" })).toBeInTheDocument();
            // The only copy on the page before the bubble opens is the one
            // aria-describedby points at, and nothing draws that.
            expect(screen.getAllByText(EXPLANATION)).toHaveLength(1);
            expect(screen.getByText(EXPLANATION)).not.toBeVisible();
        });

        // Contract 7.4: the published documentation claimed info was the
        // section's accessible description while nothing set aria-describedby.
        // It does now, and this is the test that keeps the claim true.
        it("is the section's accessible description", () => {
            renderSection(
                <ControlSection label="Betweenness" info={EXPLANATION}>
                    <div>Nodes to rank</div>
                </ControlSection>,
            );

            const group = screen.getByRole("group", { name: "Betweenness" });
            const describedBy = group.getAttribute("aria-describedby");
            expect(describedBy).not.toBeNull();
            expect(document.getElementById(describedBy ?? "")).toHaveTextContent(EXPLANATION);
        });

        it("describes the section with nothing when there is nothing to explain", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section")).not.toHaveAttribute("aria-describedby");
            expect(screen.queryByTestId("control-section-description")).not.toBeInTheDocument();
        });

        it("opens the explanation on click", async () => {
            const user = userEvent.setup();
            renderSection(
                <ControlSection label="Betweenness" info={EXPLANATION}>
                    <div>Nodes to rank</div>
                </ControlSection>,
            );

            await user.click(screen.getByRole("button", { name: "About Betweenness" }));

            await waitFor(() => {
                expect(screen.getAllByText(EXPLANATION)).toHaveLength(2);
            });

            const description = screen.getByTestId("control-section-description");
            const drawn = screen.getAllByText(EXPLANATION).filter((node) => node !== description);
            expect(drawn).toHaveLength(1);
            expect(drawn[0]).toBeVisible();
        });

        it("draws no circle when there is nothing to explain", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.queryByTestId("info-circle")).not.toBeInTheDocument();
        });
    });

    describe("actions", () => {
        it("renders the section's own buttons in the header", () => {
            renderSection(
                <ControlSection
                    label="Layout"
                    actions={
                        <AdvancedButton label="Recompute layout" icon={<UiGlyph name="refresh" />} onClick={vi.fn()} />
                    }
                >
                    <div>Link distance</div>
                </ControlSection>,
            );

            const actions = screen.getByTestId("control-section-actions");
            expect(actions).toContainElement(screen.getByRole("button", { name: "Recompute layout" }));
        });

        it("packs several actions on a 4px gap", () => {
            renderSection(
                <ControlSection
                    label="Layout"
                    actions={
                        <>
                            <AdvancedButton
                                label="Recompute layout"
                                icon={<UiGlyph name="refresh" />}
                                onClick={vi.fn()}
                            />
                            <AdvancedButton label="Advanced layout parameters" onClick={vi.fn()} />
                        </>
                    }
                >
                    <div>Link distance</div>
                </ControlSection>,
            );

            expect(screen.getByTestId("control-section-actions")).toHaveStyle({ gap: "4px" });
            expect(screen.getByRole("button", { name: "Advanced layout parameters" })).toBeInTheDocument();
        });

        it("runs the action without touching the open state", async () => {
            const user = userEvent.setup();
            const onRecompute = vi.fn();
            const onOpenChange = vi.fn();
            renderSection(
                <ControlSection
                    label="Layout"
                    onOpenChange={onOpenChange}
                    actions={
                        <AdvancedButton
                            label="Recompute layout"
                            icon={<UiGlyph name="refresh" />}
                            onClick={onRecompute}
                        />
                    }
                >
                    <div>Link distance</div>
                </ControlSection>,
            );

            await user.click(screen.getByRole("button", { name: "Recompute layout" }));

            expect(onRecompute).toHaveBeenCalledTimes(1);
            expect(onOpenChange).not.toHaveBeenCalled();
            expect(screen.getByText("Link distance")).toBeVisible();
        });

        it("draws no action cluster when the section has no buttons of its own", () => {
            renderSection(
                <ControlSection label="Size">
                    <div>Smallest node size</div>
                </ControlSection>,
            );

            expect(screen.queryByTestId("control-section-actions")).not.toBeInTheDocument();
        });
    });
});
