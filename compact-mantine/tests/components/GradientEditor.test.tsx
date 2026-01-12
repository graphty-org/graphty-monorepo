import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, createColorStop, GradientEditor, PopoutManager } from "../../src";

/**
 * Helper to render GradientEditor with required providers
 */
function renderGradientEditor(children: ReactNode) {
    return render(
        <MantineProvider theme={compactTheme}>
            <PopoutManager>{children}</PopoutManager>
        </MantineProvider>,
    );
}

describe("GradientEditor", () => {
    const defaultStops = [createColorStop(0, "#FF0000"), createColorStop(1, "#0000FF")];

    it("renders color stops header", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        expect(screen.getByText("Color Stops")).toBeInTheDocument();
    });

    it("renders add button", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    });

    it("renders color inputs for each stop", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        // Should have 2 color hex inputs (one for each stop)
        const colorInputs = screen.getAllByRole("textbox", { name: /color hex/i });
        expect(colorInputs).toHaveLength(2);
    });

    it("renders remove buttons for each stop", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        expect(removeButtons).toHaveLength(2);
    });

    it("disables remove buttons when only 2 stops", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        removeButtons.forEach((button) => {
            expect(button).toBeDisabled();
        });
    });

    it("enables remove buttons when more than 2 stops", () => {
        const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
        renderGradientEditor(<GradientEditor stops={threeStops} onChange={vi.fn()} />);
        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        removeButtons.forEach((button) => {
            expect(button).not.toBeDisabled();
        });
    });

    it("calls onChange when add button is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

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
        renderGradientEditor(<GradientEditor stops={fiveStops} onChange={vi.fn()} />);
        expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
    });

    it("shows direction slider when showDirection is true", () => {
        const { container } = renderGradientEditor(
            <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
        );
        expect(screen.getByText("Direction")).toBeInTheDocument();
        // Mantine slider has aria-label on a div wrapper, not on a slider role element
        expect(container.querySelector("[aria-label='Gradient direction']")).toBeInTheDocument();
    });

    it("hides direction slider when showDirection is false", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} showDirection={false} onChange={vi.fn()} />);
        expect(screen.queryByText("Direction")).not.toBeInTheDocument();
    });

    it("calls onChange when remove button is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
        renderGradientEditor(<GradientEditor stops={threeStops} onChange={onChange} />);

        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        await user.click(removeButtons[0]);

        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops).toHaveLength(2);
    });

    it("calls onChange when color input value changes", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

        const colorInputs = screen.getAllByRole("textbox", { name: /color hex/i });
        // Clear and type new value to trigger onChange
        await user.clear(colorInputs[0]);
        await user.type(colorInputs[0], "00FF00");
        await user.tab(); // Blur to trigger commit

        expect(onChange).toHaveBeenCalled();
    });

    it("works in uncontrolled mode with defaultStops", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor defaultStops={defaultStops} onChange={onChange} />);

        // Add a stop - should work even in uncontrolled mode
        await user.click(screen.getByRole("button", { name: /add/i }));

        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops).toHaveLength(3);
    });

    it("works in fully uncontrolled mode without onChange", () => {
        // Should not throw when onChange is not provided
        renderGradientEditor(<GradientEditor defaultStops={defaultStops} />);

        expect(screen.getByText("Color Stops")).toBeInTheDocument();
        expect(screen.getAllByRole("textbox", { name: /color hex/i })).toHaveLength(2);
    });

    it("uses default stops when neither stops nor defaultStops provided", () => {
        renderGradientEditor(<GradientEditor onChange={vi.fn()} />);

        // Should render with default gradient stops (createDefaultGradientStops())
        expect(screen.getByText("Color Stops")).toBeInTheDocument();
        const colorInputs = screen.getAllByRole("textbox", { name: /color hex/i });
        expect(colorInputs.length).toBeGreaterThanOrEqual(2);
    });

    it("renders direction slider in controlled mode", () => {
        const onChange = vi.fn();
        const { container } = renderGradientEditor(
            <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={onChange} />,
        );

        // Find the direction slider by aria-label
        const directionSlider = container.querySelector("[aria-label='Gradient direction']");
        expect(directionSlider).toBeInTheDocument();

        // Verify the direction text is shown
        expect(screen.getByText("Direction")).toBeInTheDocument();
    });

    it("uses defaultDirection when direction prop not provided", () => {
        const onChange = vi.fn();
        const { container } = renderGradientEditor(
            <GradientEditor stops={defaultStops} defaultDirection={180} showDirection={true} onChange={onChange} />,
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
        renderGradientEditor(<GradientEditor stops={fiveStops} onChange={onChange} />);

        const addButton = screen.getByRole("button", { name: /add/i });
        expect(addButton).toBeDisabled();

        // Clicking disabled button should not call onChange
        await user.click(addButton);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("does not remove stop when at minimum (2 stops)", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        expect(removeButtons[0]).toBeDisabled();

        // Clicking disabled button should not call onChange
        await user.click(removeButtons[0]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("resets color to default when reset button is clicked", async () => {
        // Regression test: reset button was not working because GradientEditor
        // ignored undefined values from CompactColorInput's onColorChange callback
        const user = userEvent.setup();
        const onChange = vi.fn();
        const customStops = [createColorStop(0, "#FF0000"), createColorStop(1, "#0000FF")];
        renderGradientEditor(<GradientEditor stops={customStops} onChange={onChange} />);

        // Change the first color's hex input to trigger the reset button to appear
        const colorInputs = screen.getAllByRole("textbox", { name: /color hex/i });
        await user.clear(colorInputs[0]);
        await user.type(colorInputs[0], "00FF00");
        await user.tab(); // Blur to commit

        // Reset buttons should now be visible (one for each color stop)
        const resetButtons = screen.getAllByRole("button", { name: /reset.*default/i });
        expect(resetButtons.length).toBeGreaterThanOrEqual(1);

        // Clear mock calls from the color change
        onChange.mockClear();

        // Click first reset button
        await user.click(resetButtons[0]);

        // onChange should have been called with the default color (#888888)
        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops[0].color).toBe("#888888");
    });

    describe("onChange callback count (Issue #3)", () => {
        it("calls onChange exactly once when add button is clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

            await user.click(screen.getByRole("button", { name: /add/i }));

            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("calls onChange exactly once when remove button is clicked", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
            renderGradientEditor(<GradientEditor stops={threeStops} onChange={onChange} />);

            const removeButtons = screen.getAllByRole("button", { name: /remove/i });
            await user.click(removeButtons[0]);

            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("calls onChange exactly once when direction slider changes", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            // Use uncontrolled mode (defaultDirection) so the slider can change internally
            // Start at 0 and use keyboard to change value
            const { container } = renderGradientEditor(
                <GradientEditor defaultStops={defaultStops} defaultDirection={0} showDirection={true} onChange={onChange} />,
            );

            // Find the direction slider thumb and focus it
            const sliderThumb = container.querySelector("[aria-label='Gradient direction'] [role='slider']") as HTMLElement;
            expect(sliderThumb).toBeInTheDocument();

            // Use keyboard to change the value (more reliable than clicking)
            sliderThumb.focus();
            await user.keyboard("{ArrowRight}");

            // onChange should be called exactly once (not twice due to double-call bug)
            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("onChange receives both stops and direction as arguments", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={onChange} />,
            );

            await user.click(screen.getByRole("button", { name: /add/i }));

            expect(onChange).toHaveBeenCalledTimes(1);
            const [newStops, newDirection] = onChange.mock.calls[0];
            expect(newStops).toHaveLength(3);
            expect(newDirection).toBe(90);
        });
    });
});
