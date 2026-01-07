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
});
