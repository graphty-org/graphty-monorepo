import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, StyleNumberInput } from "../../src";
import { LabelsProvider } from "../../src/i18n";

function renderInput(children: ReactNode, dir: "ltr" | "rtl" = "ltr") {
    return render(
        <DirectionProvider initialDirection={dir} detectDirection={false}>
            <MantineProvider theme={compactTheme}>{children}</MantineProvider>
        </DirectionProvider>,
    );
}

describe("StyleNumberInput", () => {
    it("shows default value when value is undefined", () => {
        renderInput(<StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />);
        expect(screen.getByRole("spinbutton")).toHaveValue("10");
    });

    it("shows explicit value when provided", () => {
        renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />);
        expect(screen.getByRole("spinbutton")).toHaveValue("20");
    });

    it("draws a default value like any other value (Figma has no default state)", () => {
        renderInput(<StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />);
        expect(getComputedStyle(screen.getByRole("spinbutton")).fontStyle).not.toBe("italic");
        expect(screen.getByRole("spinbutton").getAttribute("style") ?? "").not.toMatch(/italic|color/);
    });

    it("hides reset button when using default", () => {
        renderInput(<StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />);
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("shows reset button when explicit value set", () => {
        renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />);
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("calls onChange with undefined when reset clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={onChange} />);

        await user.click(screen.getByRole("button", { name: /reset/i }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toBeUndefined();
    });

    it("has data-is-default attribute when using default", () => {
        renderInput(<StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />);
        const inputWrapper = screen.getByRole("spinbutton").closest("[data-is-default]");
        expect(inputWrapper).toHaveAttribute("data-is-default", "true");
    });

    it("has data-is-default=false when using explicit value", () => {
        renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />);
        const inputWrapper = screen.getByRole("spinbutton").closest("[data-is-default]");
        expect(inputWrapper).toHaveAttribute("data-is-default", "false");
    });

    it("respects min and max constraints by clamping values", () => {
        const { container } = renderInput(
            <StyleNumberInput label="Size" value={5} defaultValue={10} min={0} max={100} onChange={vi.fn()} />,
        );
        expect(container.querySelector(".mantine-TextInput-root")).toBeInTheDocument();
        expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuemin", "0");
        expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuemax", "100");
    });

    it("displays suffix when provided", () => {
        renderInput(<StyleNumberInput label="Size" value={50} defaultValue={10} suffix="%" onChange={vi.fn()} />);
        expect(screen.getByRole("spinbutton")).toHaveValue("50%");
    });

    describe("accessible name", () => {
        // The control used to carry both a visible <label> and an aria-label
        // repeating it, which replaces name-from-content rather than adding to
        // it. The visible label is now the only source of the name.
        it("takes its name from the visible label rather than an aria-label", () => {
            renderInput(<StyleNumberInput label="Size" defaultValue={10} onChange={vi.fn()} />);
            const input = screen.getByRole("spinbutton", { name: "Size" });
            expect(input).not.toHaveAttribute("aria-label");
        });

        it("names the reset button from the labels", () => {
            renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />);
            expect(screen.getByRole("button", { name: "Reset Size to default" })).toBeInTheDocument();
        });

        it("takes the reset button's name from a LabelsProvider override", () => {
            renderInput(
                <LabelsProvider labels={{ resetToDefault: (label) => `${label} zurucksetzen` }}>
                    <StyleNumberInput label="Grosse" value={20} defaultValue={10} onChange={vi.fn()} />
                </LabelsProvider>,
            );
            expect(screen.getByRole("button", { name: "Grosse zurucksetzen" })).toBeInTheDocument();
        });
    });

    describe("clamping and constraints", () => {
        it("clamps value to max on blur when input exceeds max", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Angle" defaultValue={0} min={0} max={360} onChange={onChange} />);

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "500");
            await user.tab();

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0][0]).toBe(360);
        });

        it("clamps value to min on blur when input is below min", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Size" defaultValue={50} min={10} max={100} onChange={onChange} />);

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "5");
            await user.tab();

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0][0]).toBe(10);
        });

        it("redraws the box at the value that was kept", async () => {
            const user = userEvent.setup();
            renderInput(<StyleNumberInput label="Angle" defaultValue={0} min={0} max={360} onChange={vi.fn()} />);

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "500");
            await user.tab();

            expect(input).toHaveValue("360");
        });

        it("does not call onChange when value is unchanged after clamping", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(
                <StyleNumberInput label="Size" value={50} defaultValue={0} min={0} max={100} onChange={onChange} />,
            );

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "50");
            await user.tab();

            expect(onChange).not.toHaveBeenCalled();
        });

        it("resets to previous value when invalid input is entered", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Size" defaultValue={50} onChange={onChange} />);

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "abc");
            await user.tab();

            expect(input).toHaveValue("50");
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    describe("locale-aware reading of what was typed", () => {
        // parseFloat understands only a period and only ASCII digits, so it
        // read the German 3,5 as 3. The number is now read with the active
        // locale's own conventions.
        it("reads a comma decimal separator when the locale uses one", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(
                <LabelsProvider locale="de-DE">
                    <StyleNumberInput label="Grosse" defaultValue={0} decimalScale={2} onChange={onChange} />
                </LabelsProvider>,
            );

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "3,5");
            await user.tab();

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0][0]).toBe(3.5);
        });

        it("still reads a period decimal separator in English", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(
                <LabelsProvider locale="en-US">
                    <StyleNumberInput label="Size" defaultValue={0} decimalScale={2} onChange={onChange} />
                </LabelsProvider>,
            );

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "3.5");
            await user.tab();

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0][0]).toBe(3.5);
        });
    });

    describe("event model", () => {
        it("hands the blur that committed the number to onChange", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Size" defaultValue={0} onChange={onChange} />);

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "12");
            await user.tab();

            const event = onChange.mock.calls[0][1];
            expect(event).toBeDefined();
            expect(event.type).toBe("blur");
        });

        it("hands the reset click's event to onChange", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={onChange} />);

            await user.click(screen.getByRole("button", { name: /reset/i }));

            const event = onChange.mock.calls[0][1];
            expect(event).toBeDefined();
            expect(event.type).toBe("click");
        });

        // Contract 1.5: focus and blur are forwarded, never swallowed for
        // internal state, even though blur is what commits the number.
        it("forwards focus and blur", async () => {
            const user = userEvent.setup();
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            renderInput(
                <StyleNumberInput label="Size" defaultValue={10} onFocus={onFocus} onBlur={onBlur} />,
            );

            const input = screen.getByRole("spinbutton");
            await user.click(input);
            expect(onFocus).toHaveBeenCalledTimes(1);

            await user.tab();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("forwards blur even when nothing was committed", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const onBlur = vi.fn();
            renderInput(
                <StyleNumberInput label="Size" defaultValue={10} onChange={onChange} onBlur={onBlur} />,
            );

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "abc");
            await user.tab();

            expect(onChange).not.toHaveBeenCalled();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });
    });

    // Figma's number fields draw no steppers (design/figma-spec.md 6.1); the
    // arrow keys step instead, Shift ten at a time, and each step commits.
    describe("stepping", () => {
        it("draws no spinner controls", () => {
            const { container } = renderInput(<StyleNumberInput label="Size" defaultValue={10} onChange={vi.fn()} />);
            expect(container.querySelector(".mantine-NumberInput-controls")).not.toBeInTheDocument();
        });

        it("draws no spinner controls even when hideControls=false", () => {
            const { container } = renderInput(
                <StyleNumberInput label="Size" defaultValue={10} hideControls={false} onChange={vi.fn()} />,
            );
            expect(container.querySelector(".mantine-NumberInput-controls")).not.toBeInTheDocument();
            expect(container.querySelector('[data-direction="up"]')).not.toBeInTheDocument();
        });

        it("increments by step value on ArrowUp", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Angle" defaultValue={0} step={15} onChange={onChange} />);

            await user.click(screen.getByRole("spinbutton"));
            await user.keyboard("{ArrowUp}");

            expect(onChange).toHaveBeenCalledTimes(1);
            expect(onChange.mock.calls[0][0]).toBe(15);
        });

        it("decrements by step value on ArrowDown", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Angle" value={30} defaultValue={0} step={15} onChange={onChange} />);

            await user.click(screen.getByRole("spinbutton"));
            await user.keyboard("{ArrowDown}");

            expect(onChange.mock.calls[0][0]).toBe(15);
        });

        it("steps ten at a time with Shift", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Angle" value={30} defaultValue={0} step={1} onChange={onChange} />);

            await user.click(screen.getByRole("spinbutton"));
            await user.keyboard("{Shift>}{ArrowUp}{/Shift}");

            expect(onChange.mock.calls[0][0]).toBe(40);
        });

        it("does not step past max", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Angle" value={360} defaultValue={0} max={360} onChange={onChange} />);

            await user.click(screen.getByRole("spinbutton"));
            await user.keyboard("{ArrowUp}");

            expect(onChange).not.toHaveBeenCalled();
            expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuemax", "360");
        });

        it("does not step below min", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Angle" value={0} defaultValue={0} min={0} onChange={onChange} />);

            await user.click(screen.getByRole("spinbutton"));
            await user.keyboard("{ArrowDown}");

            expect(onChange).not.toHaveBeenCalled();
            expect(screen.getByRole("spinbutton")).toHaveAttribute("aria-valuemin", "0");
        });
    });

    describe("arithmetic and Figma's commit keys", () => {
        it("evaluates an expression on commit", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Size" defaultValue={0} onChange={onChange} />);

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "40*2");
            await user.keyboard("{Enter}");

            expect(onChange.mock.calls[0][0]).toBe(80);
            expect(input).toHaveFocus();
        });

        it("reverts on Escape without committing", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Size" value={10} defaultValue={0} onChange={onChange} />);

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "99");
            await user.keyboard("{Escape}");

            expect(onChange).not.toHaveBeenCalled();
            expect(input).toHaveValue("10");
            expect(input).not.toHaveFocus();
        });

        it("announces the number it holds", () => {
            renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />);
            expect(screen.getByRole("spinbutton", { name: "Size" })).toHaveAttribute("aria-valuenow", "20");
        });
    });

    describe("state sync", () => {
        it("syncs external value changes correctly", () => {
            const { rerender } = renderInput(
                <StyleNumberInput label="Size" value={10} defaultValue={0} onChange={vi.fn()} />,
            );
            expect(screen.getByRole("spinbutton")).toHaveValue("10");

            rerender(
                <DirectionProvider initialDirection="ltr" detectDirection={false}>
                    <MantineProvider theme={compactTheme}>
                        <StyleNumberInput label="Size" value={20} defaultValue={0} onChange={vi.fn()} />
                    </MantineProvider>
                </DirectionProvider>,
            );
            expect(screen.getByRole("spinbutton")).toHaveValue("20");
        });

        it("maintains local value during typing without premature sync", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderInput(<StyleNumberInput label="Size" value={100} defaultValue={0} onChange={onChange} />);

            const input = screen.getByRole("spinbutton");

            await user.clear(input);
            await user.type(input, "5");
            expect(input).toHaveValue("5");

            await user.type(input, "0");
            expect(input).toHaveValue("50");

            await user.tab();
            expect(onChange.mock.calls[0][0]).toBe(50);
        });

        it("handles rapid value changes from external source", () => {
            const { rerender } = renderInput(
                <StyleNumberInput label="Size" value={10} defaultValue={0} onChange={vi.fn()} />,
            );

            for (let next = 20; next <= 50; next += 10) {
                rerender(
                    <DirectionProvider initialDirection="ltr" detectDirection={false}>
                        <MantineProvider theme={compactTheme}>
                            <StyleNumberInput label="Size" value={next} defaultValue={0} onChange={vi.fn()} />
                        </MantineProvider>
                    </DirectionProvider>,
                );
                expect(screen.getByRole("spinbutton")).toHaveValue(String(next));
            }
        });

        it("preserves user input when external value matches what user typed", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const { rerender } = renderInput(
                <StyleNumberInput label="Size" value={10} defaultValue={0} onChange={onChange} />,
            );

            const input = screen.getByRole("spinbutton");
            await user.clear(input);
            await user.type(input, "25");
            expect(input).toHaveValue("25");

            rerender(
                <DirectionProvider initialDirection="ltr" detectDirection={false}>
                    <MantineProvider theme={compactTheme}>
                        <StyleNumberInput label="Size" value={25} defaultValue={0} onChange={onChange} />
                    </MantineProvider>
                </DirectionProvider>,
            );

            expect(input).toHaveValue("25");
        });

        it("updates to undefined correctly (revert to default)", () => {
            const { rerender } = renderInput(
                <StyleNumberInput label="Size" value={50} defaultValue={10} onChange={vi.fn()} />,
            );
            expect(screen.getByRole("spinbutton")).toHaveValue("50");

            rerender(
                <DirectionProvider initialDirection="ltr" detectDirection={false}>
                    <MantineProvider theme={compactTheme}>
                        <StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />
                    </MantineProvider>
                </DirectionProvider>,
            );
            expect(screen.getByRole("spinbutton")).toHaveValue("10");
        });
    });

    describe("target size and direction", () => {
        // WCAG 2.2 (2.5.8) asks for a 24px target; the reset used to be an
        // 18px "xs" ActionIcon.
        it("draws the reset button at the 24px target size", () => {
            renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />);
            const reset = screen.getByRole("button", { name: /reset/i });
            expect(reset.style.getPropertyValue("--ai-size")).toContain("24");
        });

        // The reset is the field's height, so bottom alignment puts the two
        // level; no margin in either axis (the old 2px lift is gone).
        it("sets no physical or logical offset on the reset button", () => {
            renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />);
            const reset = screen.getByRole("button", { name: /reset/i });
            expect(reset.style.getPropertyValue("margin-block-end")).toBe("");
            expect(reset.style.getPropertyValue("margin-bottom")).toBe("");
        });

        it("renders under a right-to-left direction provider", () => {
            renderInput(<StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />, "rtl");
            expect(screen.getByRole("spinbutton", { name: "Size" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
        });
    });

    describe("disabled", () => {
        it("refuses the number box and its reset together", () => {
            render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Width" defaultValue={1} value={4} disabled />
                </MantineProvider>,
            );

            expect(screen.getByRole("spinbutton", { name: "Width" })).toBeDisabled();
            expect(screen.getByTestId("style-number-input-reset")).toBeDisabled();
        });
    });
});
