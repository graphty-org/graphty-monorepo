import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, CompactColorInput, PopoutManager } from "../../src";
import { LabelsProvider } from "../../src/i18n";

/**
 * Test wrapper that includes all required providers.
 */
function TestWrapper({ children, dir = "ltr" }: { children: ReactNode; dir?: "ltr" | "rtl" }): React.JSX.Element {
    return (
        <DirectionProvider initialDirection={dir} detectDirection={false}>
            <MantineProvider theme={compactTheme}>
                <PopoutManager>{children}</PopoutManager>
            </MantineProvider>
        </DirectionProvider>
    );
}

describe("CompactColorInput", () => {
    it("renders hex input with default color value", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" />
            </TestWrapper>,
        );
        expect(screen.getByRole("textbox", { name: /hex/i })).toHaveValue("FF0000");
    });

    it("renders hex input with explicit color value", () => {
        render(
            <TestWrapper>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
            </TestWrapper>,
        );
        expect(screen.getByRole("textbox", { name: /hex/i })).toHaveValue("00FF00");
    });

    it("renders label when provided", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" label="Fill Color" />
            </TestWrapper>,
        );
        expect(screen.getByText("Fill Color")).toBeInTheDocument();
    });

    it("shows opacity input by default", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" defaultOpacity={75} />
            </TestWrapper>,
        );
        expect(screen.getByRole("textbox", { name: /opacity/i })).toHaveValue("75%");
    });

    it("hides opacity input when showOpacity is false", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" showOpacity={false} />
            </TestWrapper>,
        );
        expect(screen.queryByRole("textbox", { name: /opacity/i })).not.toBeInTheDocument();
    });

    it("has color swatch button", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" />
            </TestWrapper>,
        );
        expect(screen.getByRole("button", { name: /swatch/i })).toBeInTheDocument();
    });

    it("shows reset button when explicit color is set", () => {
        render(
            <TestWrapper>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" label="Test" />
            </TestWrapper>,
        );
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("hides reset button when using default value", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" label="Test" />
            </TestWrapper>,
        );
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("marks hex input as default when using default color", () => {
        render(
            <TestWrapper>
                <CompactColorInput defaultColor="#FF0000" />
            </TestWrapper>,
        );
        expect(screen.getByRole("textbox", { name: /hex/i })).toHaveAttribute("data-is-default", "true");
    });

    it("marks hex input as non-default when explicit color is set", () => {
        render(
            <TestWrapper>
                <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
            </TestWrapper>,
        );
        expect(screen.getByRole("textbox", { name: /hex/i })).toHaveAttribute("data-is-default", "false");
    });

    describe("event model", () => {
        it("calls onColorChange when hex input changes on blur", async () => {
            const user = userEvent.setup();
            const onColorChange = vi.fn();
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" onColorChange={onColorChange} />
                </TestWrapper>,
            );

            const input = screen.getByRole("textbox", { name: /hex/i });
            await user.clear(input);
            await user.type(input, "00FF00");
            await user.tab();

            expect(onColorChange).toHaveBeenCalledTimes(1);
            expect(onColorChange.mock.calls[0][0]).toBe("#00FF00");
        });

        it("hands the blur that committed the colour to onColorChange", async () => {
            const user = userEvent.setup();
            const onColorChange = vi.fn();
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" onColorChange={onColorChange} />
                </TestWrapper>,
            );

            const input = screen.getByRole("textbox", { name: /hex/i });
            await user.clear(input);
            await user.type(input, "00FF00");
            await user.tab();

            const event = onColorChange.mock.calls[0][1];
            expect(event).toBeDefined();
            expect(event.type).toBe("blur");
        });

        it("calls onOpacityChange when opacity input changes on blur", async () => {
            const user = userEvent.setup();
            const onOpacityChange = vi.fn();
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" defaultOpacity={100} onOpacityChange={onOpacityChange} />
                </TestWrapper>,
            );

            const input = screen.getByRole("textbox", { name: /opacity/i });
            await user.clear(input);
            await user.type(input, "50");
            await user.tab();

            expect(onOpacityChange).toHaveBeenCalledTimes(1);
            expect(onOpacityChange.mock.calls[0][0]).toBe(50);
        });

        it("clamps opacity between 0 and 100", async () => {
            const user = userEvent.setup();
            const onOpacityChange = vi.fn();
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" defaultOpacity={50} onOpacityChange={onOpacityChange} />
                </TestWrapper>,
            );

            const input = screen.getByRole("textbox", { name: /opacity/i });
            await user.clear(input);
            await user.type(input, "150");
            await user.tab();

            expect(onOpacityChange).toHaveBeenCalledTimes(1);
            expect(onOpacityChange.mock.calls[0][0]).toBe(100);
        });

        it("calls onColorChange with undefined when reset is clicked", async () => {
            const user = userEvent.setup();
            const onColorChange = vi.fn();
            render(
                <TestWrapper>
                    <CompactColorInput
                        color="#00FF00"
                        defaultColor="#FF0000"
                        label="Test"
                        onColorChange={onColorChange}
                    />
                </TestWrapper>,
            );

            await user.click(screen.getByRole("button", { name: /reset/i }));

            expect(onColorChange).toHaveBeenCalledTimes(1);
            expect(onColorChange.mock.calls[0][0]).toBeUndefined();
            expect(onColorChange.mock.calls[0][1].type).toBe("click");
        });

        // Contract 1.5: focus and blur are forwarded, never swallowed for
        // internal state, even though blur is what commits the value.
        it("forwards focus and blur from both boxes", async () => {
            const user = userEvent.setup();
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" onFocus={onFocus} onBlur={onBlur} />
                </TestWrapper>,
            );

            await user.click(screen.getByRole("textbox", { name: /hex/i }));
            expect(onFocus).toHaveBeenCalledTimes(1);

            await user.click(screen.getByRole("textbox", { name: /opacity/i }));
            expect(onBlur).toHaveBeenCalledTimes(1);
            expect(onFocus).toHaveBeenCalledTimes(2);
        });
    });

    describe("accessibility", () => {
        it("wraps the three controls in a group named by the field's label", () => {
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" label="Fill Color" />
                </TestWrapper>,
            );

            const group = screen.getByRole("group", { name: "Fill Color" });
            expect(group).toBeInTheDocument();
            expect(group).toContainElement(screen.getByRole("textbox", { name: /hex/i }));
            expect(group).toContainElement(screen.getByRole("button", { name: /swatch/i }));
        });

        it("renders no group when there is no label to name it with", () => {
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" />
                </TestWrapper>,
            );
            expect(screen.queryByRole("group")).not.toBeInTheDocument();
        });

        it("marks the swatch as opening a dialog", () => {
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" />
                </TestWrapper>,
            );
            const swatch = screen.getByRole("button", { name: /swatch/i });
            expect(swatch).toHaveAttribute("aria-haspopup", "dialog");
            expect(swatch).toHaveAttribute("aria-expanded", "false");
        });

        it("names the reset button after the field", () => {
            render(
                <TestWrapper>
                    <CompactColorInput color="#00FF00" defaultColor="#FF0000" label="Fill Color" />
                </TestWrapper>,
            );
            expect(screen.getByRole("button", { name: "Reset Fill Color to default" })).toBeInTheDocument();
        });

        it("names the reset button generically when the field has no label", () => {
            render(
                <TestWrapper>
                    <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
                </TestWrapper>,
            );
            expect(screen.getByRole("button", { name: "Reset color to default" })).toBeInTheDocument();
        });

        // WCAG 2.2 (2.5.8) asks for a 24px target; the reset used to be an
        // 18px "xs" ActionIcon.
        it("draws the reset button at the 24px target size", () => {
            render(
                <TestWrapper>
                    <CompactColorInput color="#00FF00" defaultColor="#FF0000" />
                </TestWrapper>,
            );
            const reset = screen.getByRole("button", { name: /reset/i });
            expect(reset.style.getPropertyValue("--ai-size")).toContain("24");
        });
    });

    describe("strings", () => {
        it("takes every accessible name from the labels", () => {
            render(
                <TestWrapper>
                    <LabelsProvider
                        labels={{
                            colorSwatch: "Nuancier",
                            colorHexValue: "Valeur hexadecimale",
                            opacity: "Opacite",
                        }}
                    >
                        <CompactColorInput defaultColor="#FF0000" />
                    </LabelsProvider>
                </TestWrapper>,
            );

            expect(screen.getByRole("button", { name: "Nuancier" })).toBeInTheDocument();
            expect(screen.getByRole("textbox", { name: "Valeur hexadecimale" })).toBeInTheDocument();
            expect(screen.getByRole("textbox", { name: "Opacite" })).toBeInTheDocument();
        });

        it("reads a comma decimal separator in the opacity box when the locale uses one", async () => {
            const user = userEvent.setup();
            const onOpacityChange = vi.fn();
            render(
                <TestWrapper>
                    <LabelsProvider locale="de-DE">
                        <CompactColorInput
                            defaultColor="#FF0000"
                            defaultOpacity={100}
                            onOpacityChange={onOpacityChange}
                        />
                    </LabelsProvider>
                </TestWrapper>,
            );

            const input = screen.getByRole("textbox", { name: /opacity/i });
            await user.clear(input);
            await user.type(input, "12,5");
            await user.tab();

            expect(onOpacityChange).toHaveBeenCalledTimes(1);
            expect(onOpacityChange.mock.calls[0][0]).toBe(12.5);
        });
    });

    describe("direction", () => {
        // The three controls used to name their corners physically, so the
        // rounded ends of the run landed on the wrong sides under a
        // right-to-left direction. They are written as logical corners now.
        it("rounds only the outer ends of the joined run, in logical corners", () => {
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" />
                </TestWrapper>,
            );

            const swatch = screen.getByRole("button", { name: /swatch/i });
            expect(swatch.style.getPropertyValue("border-start-start-radius")).toBe("4px");
            expect(swatch.style.getPropertyValue("border-end-start-radius")).toBe("4px");
            expect(swatch.style.getPropertyValue("border-start-end-radius")).toBe("0");
            expect(swatch.style.getPropertyValue("border-radius")).toBe("");

            const hex = screen.getByRole("textbox", { name: /hex/i });
            expect(hex.style.getPropertyValue("border-start-start-radius")).toBe("0");
            expect(hex.style.getPropertyValue("border-start-end-radius")).toBe("0");

            const opacity = screen.getByRole("textbox", { name: /opacity/i });
            expect(opacity.style.getPropertyValue("border-start-end-radius")).toBe("4px");
            expect(opacity.style.getPropertyValue("border-end-end-radius")).toBe("4px");
            expect(opacity.style.getPropertyValue("border-start-start-radius")).toBe("0");
        });

        it("closes the run at the hex box when there is no opacity box", () => {
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" showOpacity={false} />
                </TestWrapper>,
            );

            const hex = screen.getByRole("textbox", { name: /hex/i });
            expect(hex.style.getPropertyValue("border-start-end-radius")).toBe("4px");
            expect(hex.style.getPropertyValue("border-end-end-radius")).toBe("4px");
        });

        it("aligns the opacity reading to the closing edge rather than to the right", () => {
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" />
                </TestWrapper>,
            );
            const opacity = screen.getByRole("textbox", { name: /opacity/i });
            expect(opacity.style.getPropertyValue("text-align")).toBe("end");
        });

        it("renders under a right-to-left direction provider", () => {
            render(
                <TestWrapper dir="rtl">
                    <CompactColorInput defaultColor="#FF0000" label="Fill Color" />
                </TestWrapper>,
            );
            expect(screen.getByRole("group", { name: "Fill Color" })).toBeInTheDocument();
            expect(screen.getByRole("textbox", { name: /hex/i })).toBeInTheDocument();
        });
    });

    // Every value editor in the library takes `disabled` and means the same
    // thing by it: unusable, skipped by Tab, and announced as unavailable.
    describe("disabled", () => {
        it("refuses every one of its controls together", () => {
            render(
                <TestWrapper>
                    <CompactColorInput defaultColor="#FF0000" color="#00FF00" disabled />
                </TestWrapper>,
            );

            expect(screen.getByTestId("compact-color-input-swatch")).toBeDisabled();
            expect(screen.getByTestId("compact-color-input-hex")).toBeDisabled();
            expect(screen.getByTestId("compact-color-input-opacity")).toBeDisabled();
            expect(screen.getByTestId("compact-color-input-reset")).toBeDisabled();
        });
    });
});
