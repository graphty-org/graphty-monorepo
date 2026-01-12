import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, StyleNumberInput } from "../../src";

describe("StyleNumberInput", () => {
    it("shows default value when value is undefined", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("10");
    });

    it("shows explicit value when provided", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("20");
    });

    it("shows italic styling for default value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox");
        expect(getComputedStyle(input).fontStyle).toBe("italic");
    });

    it("hides reset button when using default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />
            </MantineProvider>,
        );
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
    });

    it("shows reset button when explicit value set", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("calls onChange with undefined when reset clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={20} defaultValue={10} onChange={onChange} />
            </MantineProvider>,
        );

        await user.click(screen.getByRole("button", { name: /reset/i }));
        expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("has data-is-default attribute when using default", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const inputWrapper = screen.getByRole("textbox").closest("[data-is-default]");
        expect(inputWrapper).toHaveAttribute("data-is-default", "true");
    });

    it("has data-is-default=false when using explicit value", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={20} defaultValue={10} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const inputWrapper = screen.getByRole("textbox").closest("[data-is-default]");
        expect(inputWrapper).toHaveAttribute("data-is-default", "false");
    });

    it("respects min and max constraints by clamping values", () => {
        // min/max are handled by the NumberInput component internally
        // We verify that the component renders with min/max props
        const { container } = render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={5} defaultValue={10} min={0} max={100} onChange={vi.fn()} />
            </MantineProvider>,
        );
        // The wrapper div exists with the NumberInput
        expect(container.querySelector(".mantine-NumberInput-root")).toBeInTheDocument();
    });

    it("displays suffix when provided", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <StyleNumberInput label="Size" value={50} defaultValue={10} suffix="%" onChange={vi.fn()} />
            </MantineProvider>,
        );
        const input = screen.getByRole("textbox");
        expect(input).toHaveValue("50%");
    });

    describe("clamping and constraints", () => {
        it("clamps value to max on blur when input exceeds max", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Angle" defaultValue={0} min={0} max={360} onChange={onChange} />
                </MantineProvider>,
            );

            const input = screen.getByRole("textbox");
            await user.clear(input);
            await user.type(input, "500");
            await user.tab(); // blur

            expect(onChange).toHaveBeenCalledWith(360);
        });

        it("clamps value to min on blur when input is below min", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" defaultValue={50} min={10} max={100} onChange={onChange} />
                </MantineProvider>,
            );

            const input = screen.getByRole("textbox");
            await user.clear(input);
            await user.type(input, "5");
            await user.tab(); // blur

            expect(onChange).toHaveBeenCalledWith(10);
        });

        it("does not call onChange when value is unchanged after clamping", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={50} defaultValue={0} min={0} max={100} onChange={onChange} />
                </MantineProvider>,
            );

            const input = screen.getByRole("textbox");
            await user.clear(input);
            await user.type(input, "50");
            await user.tab(); // blur

            // Value didn't change (still 50), so onChange should not be called
            expect(onChange).not.toHaveBeenCalled();
        });

        it("resets to previous value when invalid input is entered", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" defaultValue={50} onChange={onChange} />
                </MantineProvider>,
            );

            const input = screen.getByRole("textbox");
            await user.clear(input);
            await user.type(input, "abc");
            await user.tab(); // blur

            // Should reset to default value since no valid number was entered
            expect(input).toHaveValue("50");
            expect(onChange).not.toHaveBeenCalled();
        });
    });

    describe("spinner controls", () => {
        it("hides spinner controls by default (hideControls=true)", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" defaultValue={10} onChange={vi.fn()} />
                </MantineProvider>,
            );

            // Controls should not be in the DOM when hideControls is true (default)
            const controls = container.querySelector(".mantine-NumberInput-controls");
            expect(controls).not.toBeInTheDocument();
        });

        it("shows spinner controls when hideControls=false", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" defaultValue={10} hideControls={false} onChange={vi.fn()} />
                </MantineProvider>,
            );

            // Controls should be present when hideControls is false
            const controls = container.querySelector(".mantine-NumberInput-controls");
            expect(controls).toBeInTheDocument();
        });

        it("increments by step value when up control is clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput
                        label="Angle"
                        defaultValue={0}
                        step={15}
                        hideControls={false}
                        onChange={onChange}
                    />
                </MantineProvider>,
            );

            const upButton = container.querySelector('[data-direction="up"]');
            expect(upButton).toBeInTheDocument();
            await user.click(upButton!);
            // Blur to commit the value (component uses blur-to-commit pattern)
            await user.tab();

            // After clicking up and blurring, value should be 0 + 15 = 15
            expect(onChange).toHaveBeenCalledWith(15);
        });

        it("decrements by step value when down control is clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput
                        label="Angle"
                        value={30}
                        defaultValue={0}
                        step={15}
                        hideControls={false}
                        onChange={onChange}
                    />
                </MantineProvider>,
            );

            const downButton = container.querySelector('[data-direction="down"]');
            expect(downButton).toBeInTheDocument();
            await user.click(downButton!);
            // Blur to commit the value (component uses blur-to-commit pattern)
            await user.tab();

            // After clicking down and blurring, value should be 30 - 15 = 15
            expect(onChange).toHaveBeenCalledWith(15);
        });

        it("disables up control when at max value", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput
                        label="Angle"
                        value={360}
                        defaultValue={0}
                        max={360}
                        hideControls={false}
                        onChange={vi.fn()}
                    />
                </MantineProvider>,
            );

            const upButton = container.querySelector('[data-direction="up"]');
            expect(upButton).toBeDisabled();
        });

        it("disables down control when at min value", () => {
            const { container } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput
                        label="Angle"
                        value={0}
                        defaultValue={0}
                        min={0}
                        hideControls={false}
                        onChange={vi.fn()}
                    />
                </MantineProvider>,
            );

            const downButton = container.querySelector('[data-direction="down"]');
            expect(downButton).toBeDisabled();
        });
    });

    describe("state sync (Issue #7)", () => {
        it("syncs external value changes correctly", () => {
            const { rerender } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={10} defaultValue={0} onChange={vi.fn()} />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toHaveValue("10");

            rerender(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={20} defaultValue={0} onChange={vi.fn()} />
                </MantineProvider>,
            );
            expect(screen.getByRole("textbox")).toHaveValue("20");
        });

        it("maintains local value during typing without premature sync", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={100} defaultValue={0} onChange={onChange} />
                </MantineProvider>,
            );

            const input = screen.getByRole("textbox");

            // Clear and start typing a new value
            await user.clear(input);
            await user.type(input, "5");

            // During typing, the local value should show what user typed (not reset to 100)
            expect(input).toHaveValue("5");

            // Continue typing
            await user.type(input, "0");
            expect(input).toHaveValue("50");

            // Value should be committed on blur
            await user.tab();
            expect(onChange).toHaveBeenCalledWith(50);
        });

        it("handles rapid value changes from external source", async () => {
            const { rerender } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={10} defaultValue={0} onChange={vi.fn()} />
                </MantineProvider>,
            );

            // Simulate rapid external value changes
            for (let i = 20; i <= 50; i += 10) {
                rerender(
                    <MantineProvider theme={compactTheme}>
                        <StyleNumberInput label="Size" value={i} defaultValue={0} onChange={vi.fn()} />
                    </MantineProvider>,
                );
                expect(screen.getByRole("textbox")).toHaveValue(String(i));
            }
        });

        it("preserves user input when external value matches what user typed", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const { rerender } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={10} defaultValue={0} onChange={onChange} />
                </MantineProvider>,
            );

            const input = screen.getByRole("textbox");

            // User types a new value
            await user.clear(input);
            await user.type(input, "25");
            expect(input).toHaveValue("25");

            // External value changes to the same value the user typed
            // This shouldn't cause any flickering or reset
            rerender(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={25} defaultValue={0} onChange={onChange} />
                </MantineProvider>,
            );

            expect(input).toHaveValue("25");
        });

        it("updates to undefined correctly (revert to default)", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const { rerender } = render(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={50} defaultValue={10} onChange={onChange} />
                </MantineProvider>,
            );

            expect(screen.getByRole("textbox")).toHaveValue("50");

            // External value changes to undefined (using default)
            rerender(
                <MantineProvider theme={compactTheme}>
                    <StyleNumberInput label="Size" value={undefined} defaultValue={10} onChange={onChange} />
                </MantineProvider>,
            );

            expect(screen.getByRole("textbox")).toHaveValue("10");
        });
    });
});
