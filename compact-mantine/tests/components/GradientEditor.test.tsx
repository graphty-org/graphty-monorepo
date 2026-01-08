import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, createColorStop, GradientEditor } from "../../src";

describe("GradientEditor", () => {
    const defaultStops = [createColorStop(0, "#FF0000"), createColorStop(1, "#0000FF")];

    it("renders color stops header", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={vi.fn()} />
            </MantineProvider>,
        );
        expect(screen.getByText("Color Stops")).toBeInTheDocument();
    });

    it("renders add button", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={vi.fn()} />
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    });

    it("renders color inputs for each stop", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={vi.fn()} />
            </MantineProvider>,
        );
        // Should have 2 color inputs (one for each stop)
        const colorInputs = screen.getAllByRole("textbox", { name: /color stop/i });
        expect(colorInputs).toHaveLength(2);
    });

    it("renders remove buttons for each stop", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        expect(removeButtons).toHaveLength(2);
    });

    it("disables remove buttons when only 2 stops", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        removeButtons.forEach((button) => {
            expect(button).toBeDisabled();
        });
    });

    it("enables remove buttons when more than 2 stops", () => {
        const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={threeStops} onChange={vi.fn()} />
            </MantineProvider>,
        );
        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        removeButtons.forEach((button) => {
            expect(button).not.toBeDisabled();
        });
    });

    it("calls onChange when add button is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={onChange} />
            </MantineProvider>,
        );

        await user.click(screen.getByRole("button", { name: /add/i }));
        expect(onChange).toHaveBeenCalled();
        // Should add a new stop
        const [newStops] = onChange.mock.calls[0];
        expect(newStops).toHaveLength(3);
    });

    it("disables add button when 5 stops", () => {
        const fiveStops = [
            createColorStop(0, "#FF0000"),
            createColorStop(0.25, "#FF0000"),
            createColorStop(0.5, "#FF0000"),
            createColorStop(0.75, "#FF0000"),
            createColorStop(1, "#0000FF"),
        ];
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={fiveStops} onChange={vi.fn()} />
            </MantineProvider>,
        );
        expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
    });

    it("shows direction slider when showDirection is true", () => {
        const { container } = render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />
            </MantineProvider>,
        );
        expect(screen.getByText("Direction")).toBeInTheDocument();
        // Mantine slider has aria-label on a div wrapper, not on a slider role element
        expect(container.querySelector("[aria-label='Gradient direction']")).toBeInTheDocument();
    });

    it("hides direction slider when showDirection is false", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} showDirection={false} onChange={vi.fn()} />
            </MantineProvider>,
        );
        expect(screen.queryByText("Direction")).not.toBeInTheDocument();
    });

    it("calls onChange when remove button is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={threeStops} onChange={onChange} />
            </MantineProvider>,
        );

        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        await user.click(removeButtons[0]);

        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops).toHaveLength(2);
    });

    it("calls onChange when color input value changes", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={onChange} />
            </MantineProvider>,
        );

        const colorInputs = screen.getAllByRole("textbox", { name: /color stop/i });
        // Type additional characters to trigger onChange (Mantine ColorInput behavior)
        await user.type(colorInputs[0], "0");

        expect(onChange).toHaveBeenCalled();
        // Verify that onChange was called with updated stops
        const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
        const [newStops] = lastCall;
        // The color should have been modified (original #FF0000 + "0" = #FF00000)
        expect(newStops[0].color).not.toBe(defaultStops[0].color);
    });

    it("works in uncontrolled mode with defaultStops", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor defaultStops={defaultStops} onChange={onChange} />
            </MantineProvider>,
        );

        // Add a stop - should work even in uncontrolled mode
        await user.click(screen.getByRole("button", { name: /add/i }));

        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops).toHaveLength(3);
    });

    it("works in fully uncontrolled mode without onChange", () => {
        // Should not throw when onChange is not provided
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor defaultStops={defaultStops} />
            </MantineProvider>,
        );

        expect(screen.getByText("Color Stops")).toBeInTheDocument();
        expect(screen.getAllByRole("textbox", { name: /color stop/i })).toHaveLength(2);
    });

    it("uses default stops when neither stops nor defaultStops provided", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor onChange={vi.fn()} />
            </MantineProvider>,
        );

        // Should render with default gradient stops (createDefaultGradientStops())
        expect(screen.getByText("Color Stops")).toBeInTheDocument();
        const colorInputs = screen.getAllByRole("textbox", { name: /color stop/i });
        expect(colorInputs.length).toBeGreaterThanOrEqual(2);
    });

    it("renders direction slider in controlled mode", () => {
        const onChange = vi.fn();
        const { container } = render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={onChange} />
            </MantineProvider>,
        );

        // Find the direction slider by aria-label
        const directionSlider = container.querySelector("[aria-label='Gradient direction']");
        expect(directionSlider).toBeInTheDocument();

        // Verify the direction text is shown
        expect(screen.getByText("Direction")).toBeInTheDocument();
    });

    it("uses defaultDirection when direction prop not provided", () => {
        const onChange = vi.fn();
        const { container } = render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} defaultDirection={180} showDirection={true} onChange={onChange} />
            </MantineProvider>,
        );

        // Find the direction slider by aria-label
        const directionSlider = container.querySelector("[aria-label='Gradient direction']");
        expect(directionSlider).toBeInTheDocument();
    });

    it("does not add stop when already at maximum (5 stops)", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const fiveStops = [
            createColorStop(0, "#FF0000"),
            createColorStop(0.25, "#FF0000"),
            createColorStop(0.5, "#FF0000"),
            createColorStop(0.75, "#FF0000"),
            createColorStop(1, "#0000FF"),
        ];
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={fiveStops} onChange={onChange} />
            </MantineProvider>,
        );

        const addButton = screen.getByRole("button", { name: /add/i });
        expect(addButton).toBeDisabled();

        // Clicking disabled button should not call onChange
        await user.click(addButton);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("does not remove stop when at minimum (2 stops)", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <MantineProvider theme={compactTheme}>
                <GradientEditor stops={defaultStops} onChange={onChange} />
            </MantineProvider>,
        );

        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        expect(removeButtons[0]).toBeDisabled();

        // Clicking disabled button should not call onChange
        await user.click(removeButtons[0]);
        expect(onChange).not.toHaveBeenCalled();
    });
});
