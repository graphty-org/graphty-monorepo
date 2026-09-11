import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import {
    AdvancedButton,
    holdsSomething,
    TrailingSlot,
} from "../../../src/components/rows/TrailingSlot";
import { PANEL_INK } from "../../../src/constants/panel";
import { LabelsProvider } from "../../../src/i18n";
import { UI_GLYPH_NAMES, UiGlyph } from "../../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderSlot(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render right to left, which is what Mantine's DirectionProvider switches.
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

describe("TrailingSlot", () => {
    it("renders its child", () => {
        renderSlot(
            <TrailingSlot>
                <span data-testid="advanced">advanced</span>
            </TrailingSlot>,
        );

        expect(screen.getByTestId("advanced")).toBeInTheDocument();
    });

    it("still occupies the slot when it is empty", () => {
        renderSlot(<TrailingSlot />);

        const slot = screen.getByTestId("trailing-slot");
        expect(slot).toBeInTheDocument();
        expect(slot).toHaveStyle({ width: "24px", height: "24px" });
    });

    it("writes no physical left or right property, so it flips with the panel", () => {
        renderRtl(<TrailingSlot />);

        const slot = screen.getByTestId("trailing-slot");
        const style = slot.getAttribute("style") ?? "";

        expect(style).not.toContain("left");
        expect(style).not.toContain("right");
        expect(slot).toHaveStyle({ width: "24px", height: "24px" });
    });
});

describe("holdsSomething", () => {
    it("reads undefined, null and false as an empty slot", () => {
        expect(holdsSomething(undefined)).toBe(false);
        expect(holdsSomething(null)).toBe(false);
        expect(holdsSomething(false)).toBe(false);
    });

    it("reads an element or a string as content", () => {
        expect(holdsSomething(<span />)).toBe(true);
        expect(holdsSomething("reset")).toBe(true);
    });

    // Zero is content, because `{count && <X/>}` renders a literal 0 in React
    // rather than nothing. Only the three values above mean "nothing here".
    it("reads zero as content, the way React does", () => {
        expect(holdsSomething(0)).toBe(true);
    });
});

describe("AdvancedButton", () => {
    describe("its accessible name", () => {
        it("names the settings it opens", () => {
            renderSlot(<AdvancedButton label="Image export options" onClick={vi.fn()} />);

            const button = screen.getByRole("button", { name: "Image export options" });
            expect(button).toHaveAttribute("title", "Image export options");
        });

        it("states in its name that something behind it has changed", () => {
            renderSlot(<AdvancedButton label="Image export options" changed onClick={vi.fn()} />);

            const button = screen.getByRole("button", { name: "Image export options has configured values" });
            expect(button).toHaveAttribute("title", "Image export options has configured values");
        });

        it("takes the changed sentence from the labels a consumer supplies", () => {
            render(
                <LabelsProvider
                    locale="fr-FR"
                    labels={{ sectionHasConfiguredValues: (label: string): string => `${label} : valeurs modifiees` }}
                >
                    <MantineProvider theme={compactTheme}>
                        <AdvancedButton label="Export" changed onClick={vi.fn()} />
                    </MantineProvider>
                </LabelsProvider>,
            );

            expect(screen.getByRole("button", { name: "Export : valeurs modifiees" })).toBeInTheDocument();
        });
    });

    describe("its glyph", () => {
        it("draws the gear by default", () => {
            const { container } = renderSlot(<AdvancedButton label="Advanced" onClick={vi.fn()} />);

            expect(container.querySelector('[data-glyph="gear"]')).toBeInTheDocument();
        });

        it("draws a given glyph instead of the gear", () => {
            const { container } = renderSlot(
                <AdvancedButton label="Details" icon={<UiGlyph name="chevronRight" />} onClick={vi.fn()} />,
            );

            expect(container.querySelector('[data-glyph="chevronRight"]')).toBeInTheDocument();
            expect(container.querySelector('[data-glyph="gear"]')).toBeNull();
        });

        it.each(UI_GLYPH_NAMES)("can carry the %s glyph", (name) => {
            const { container } = renderSlot(
                <AdvancedButton label="Advanced" icon={<UiGlyph name={name} />} onClick={vi.fn()} />,
            );

            expect(container.querySelector(`[data-glyph="${name}"]`)).toBeInTheDocument();
        });
    });

    describe("changed -- the only signal that the button hides a non-default", () => {
        it("draws in the secondary ink when everything behind it is default", () => {
            renderSlot(<AdvancedButton label="Image export options" onClick={vi.fn()} />);

            const button = screen.getByTestId("advanced-button");
            expect(button).toHaveAttribute("data-changed", "false");
            expect(button.style.getPropertyValue("--ai-color")).toBe(PANEL_INK.CHROME);
        });

        it("draws in the primary ink when something behind it has changed", () => {
            renderSlot(<AdvancedButton label="Image export options" changed onClick={vi.fn()} />);

            const button = screen.getByTestId("advanced-button");
            expect(button).toHaveAttribute("data-changed", "true");
            expect(button.style.getPropertyValue("--ai-color")).toBe(PANEL_INK.VALUE);
        });

        it("changes ink and name, and nothing else", () => {
            const { container: unchanged } = renderSlot(<AdvancedButton label="Options" onClick={vi.fn()} />);
            const { container: changed } = renderSlot(<AdvancedButton label="Options" changed onClick={vi.fn()} />);

            expect(unchanged.querySelector('[data-glyph="gear"]')).toBeInTheDocument();
            expect(changed.querySelector('[data-glyph="gear"]')).toBeInTheDocument();
        });

        it("is never colour alone: the state is in the accessible name too", () => {
            renderSlot(<AdvancedButton label="Options" changed onClick={vi.fn()} />);

            const button = screen.getByTestId("advanced-button");
            expect(button.getAttribute("aria-label")).toContain("has configured values");
        });
    });

    describe("activation", () => {
        it("hands the click event to the consumer", async () => {
            // Read inside the handler: React clears currentTarget once the
            // event has finished propagating, which is exactly where a
            // consumer reads it from too.
            let seen: { canPreventDefault: boolean; currentTarget: EventTarget | null } | undefined;
            const onClick = vi.fn((event: React.MouseEvent) => {
                seen = {
                    canPreventDefault: typeof event.preventDefault === "function",
                    currentTarget: event.currentTarget,
                };
            });
            const user = userEvent.setup();
            renderSlot(<AdvancedButton label="Advanced" onClick={onClick} />);

            await user.click(screen.getByRole("button", { name: "Advanced" }));

            expect(onClick).toHaveBeenCalledTimes(1);
            expect(seen?.canPreventDefault).toBe(true);
            expect(seen?.currentTarget).toBe(screen.getByRole("button", { name: "Advanced" }));
        });

        it("carries the modifier keys, so a consumer can read a shift-click", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderSlot(<AdvancedButton label="Advanced" onClick={onClick} />);

            await user.keyboard("{Shift>}");
            await user.click(screen.getByRole("button", { name: "Advanced" }));
            await user.keyboard("{/Shift}");

            const event = onClick.mock.calls[0][0] as React.MouseEvent;
            expect(event.shiftKey).toBe(true);
        });

        it("activates on Enter", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderSlot(<AdvancedButton label="Advanced" onClick={onClick} />);

            await user.tab();
            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("activates on Space", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderSlot(<AdvancedButton label="Advanced" onClick={onClick} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("is reachable by Tab", async () => {
            const user = userEvent.setup();
            renderSlot(<AdvancedButton label="Advanced" onClick={vi.fn()} />);

            await user.tab();

            expect(screen.getByRole("button", { name: "Advanced" })).toHaveFocus();
        });

        it("forwards focus and blur rather than swallowing them", async () => {
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderSlot(
                <>
                    <AdvancedButton label="Advanced" onFocus={onFocus} onBlur={onBlur} onClick={vi.fn()} />
                    <button type="button">elsewhere</button>
                </>,
            );

            await user.tab();
            expect(onFocus).toHaveBeenCalledTimes(1);

            await user.tab();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });
    });

    describe("disabled", () => {
        it("refuses activation", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderSlot(<AdvancedButton label="Advanced" disabled onClick={onClick} />);

            await user.click(screen.getByRole("button", { name: "Advanced" }));

            expect(onClick).not.toHaveBeenCalled();
            expect(screen.getByRole("button", { name: "Advanced" })).toBeDisabled();
        });

        it("is skipped by the Tab key", async () => {
            const user = userEvent.setup();
            renderSlot(
                <>
                    <AdvancedButton label="Advanced" disabled onClick={vi.fn()} />
                    <button type="button">elsewhere</button>
                </>,
            );

            await user.tab();

            expect(screen.getByRole("button", { name: "elsewhere" })).toHaveFocus();
        });

        it("leaves the dimming to the theme, so it matches every other disabled control", () => {
            renderSlot(<AdvancedButton label="Advanced" disabled onClick={vi.fn()} />);

            // The ink is set as ActionIcon's own --ai-color variable rather than
            // as an inline color, so the stylesheet rule that dims a disabled
            // control still outranks it.
            const button = screen.getByTestId("advanced-button");
            expect(button.style.color).toBe("");
            expect(button.style.getPropertyValue("--ai-color")).toBe(PANEL_INK.CHROME);
        });
    });

    describe("loading", () => {
        it("marks itself busy and refuses activation", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderSlot(<AdvancedButton label="Advanced" loading onClick={onClick} />);

            const button = screen.getByRole("button", { name: "Advanced" });
            expect(button).toHaveAttribute("aria-busy", "true");
            expect(button).toHaveAttribute("data-loading", "true");
            expect(button).toBeDisabled();

            await user.click(button);
            expect(onClick).not.toHaveBeenCalled();
        });

        it("is not busy when it is not loading", () => {
            renderSlot(<AdvancedButton label="Advanced" onClick={vi.fn()} />);

            expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-busy", "false");
        });
    });

    describe("its box", () => {
        it("is 24px square under the compact theme, which is the WCAG 2.2 minimum target", () => {
            renderSlot(<AdvancedButton label="Advanced" onClick={vi.fn()} />);

            expect(screen.getByTestId("advanced-button").style.getPropertyValue("--ai-size")).toBe("24px");
        });

        it("is 24px square without the compact theme too", () => {
            render(
                <MantineProvider>
                    <AdvancedButton label="Advanced" onClick={vi.fn()} />
                </MantineProvider>,
            );

            // 1.5rem against Mantine's 16px root is 24px: the size is stated on
            // the component, not inherited from this library's theme.
            expect(screen.getByTestId("advanced-button").style.getPropertyValue("--ai-size")).toContain("1.5rem");
        });

        it("writes no physical left or right property", () => {
            renderRtl(<AdvancedButton label="Advanced" onClick={vi.fn()} />);

            const style = screen.getByTestId("advanced-button").getAttribute("style") ?? "";

            expect(style).not.toContain("left:");
            expect(style).not.toContain("right:");
        });
    });

    describe("what it passes through", () => {
        it("forwards its ref to the button element", () => {
            const ref = createRef<HTMLButtonElement>();
            renderSlot(<AdvancedButton ref={ref} label="Advanced" onClick={vi.fn()} />);

            expect(ref.current).toBe(screen.getByRole("button", { name: "Advanced" }));
        });

        it("keeps a consumer's own class, id and style", () => {
            renderSlot(
                <AdvancedButton
                    label="Advanced"
                    id="export-options"
                    className="mine"
                    style={{ opacity: 0.5 }}
                    onClick={vi.fn()}
                />,
            );

            const button = screen.getByTestId("advanced-button");
            expect(button).toHaveAttribute("id", "export-options");
            expect(button.className).toContain("mine");
            expect(button).toHaveStyle({ opacity: "0.5" });
            // The slot's own layout style survives the merge.
            expect(button).toHaveStyle({ flex: "0 0 auto" });
        });

        it("renders a real button, so nothing re-implements Enter and Space", () => {
            renderSlot(<AdvancedButton label="Advanced" onClick={vi.fn()} />);

            const button = screen.getByTestId("advanced-button");
            expect(button.tagName).toBe("BUTTON");
            expect(button).toHaveAttribute("type", "button");
        });
    });
});
