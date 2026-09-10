import { DirectionProvider, MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, createColorStop, GradientEditor, PopoutManager } from "../../src";
import { LabelsProvider } from "../../src/i18n";

/**
 * Helper to render GradientEditor with required providers
 */
function renderGradientEditor(children: ReactNode, dir: "ltr" | "rtl" = "ltr") {
    return render(
        <DirectionProvider initialDirection={dir} detectDirection={false}>
            <MantineProvider theme={compactTheme}>
                <PopoutManager>{children}</PopoutManager>
            </MantineProvider>
        </DirectionProvider>,
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
        expect(screen.getAllByRole("textbox", { name: /color hex/i })).toHaveLength(2);
    });

    it("renders remove buttons for each stop", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        expect(screen.getAllByRole("button", { name: /remove/i })).toHaveLength(2);
    });

    it("disables remove buttons when only 2 stops", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        screen.getAllByRole("button", { name: /remove/i }).forEach((button) => {
            expect(button).toBeDisabled();
        });
    });

    it("enables remove buttons when more than 2 stops", () => {
        const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
        renderGradientEditor(<GradientEditor stops={threeStops} onChange={vi.fn()} />);
        screen.getAllByRole("button", { name: /remove/i }).forEach((button) => {
            expect(button).not.toBeDisabled();
        });
    });

    it("calls onChange when add button is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

        await user.click(screen.getByRole("button", { name: /add/i }));
        expect(onChange).toHaveBeenCalled();
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
        renderGradientEditor(
            <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
        );
        expect(screen.getByText("Direction")).toBeInTheDocument();
        expect(screen.getByRole("slider", { name: "Gradient direction" })).toBeInTheDocument();
    });

    it("hides direction slider when showDirection is false", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} showDirection={false} onChange={vi.fn()} />);
        expect(screen.queryByText("Direction")).not.toBeInTheDocument();
        expect(screen.queryByRole("slider", { name: "Gradient direction" })).not.toBeInTheDocument();
    });

    it("calls onChange when remove button is clicked", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
        renderGradientEditor(<GradientEditor stops={threeStops} onChange={onChange} />);

        await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);

        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops).toHaveLength(2);
    });

    it("calls onChange when color input value changes", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

        const colorInputs = screen.getAllByRole("textbox", { name: /color hex/i });
        await user.clear(colorInputs[0]);
        await user.type(colorInputs[0], "00FF00");
        await user.tab();

        expect(onChange).toHaveBeenCalled();
    });

    it("works in uncontrolled mode with defaultStops", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor defaultStops={defaultStops} onChange={onChange} />);

        await user.click(screen.getByRole("button", { name: /add/i }));

        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops).toHaveLength(3);
    });

    it("works in fully uncontrolled mode without onChange", () => {
        renderGradientEditor(<GradientEditor defaultStops={defaultStops} />);

        expect(screen.getByText("Color Stops")).toBeInTheDocument();
        expect(screen.getAllByRole("textbox", { name: /color hex/i })).toHaveLength(2);
    });

    it("uses default stops when neither stops nor defaultStops provided", () => {
        renderGradientEditor(<GradientEditor onChange={vi.fn()} />);

        expect(screen.getByText("Color Stops")).toBeInTheDocument();
        expect(screen.getAllByRole("textbox", { name: /color hex/i }).length).toBeGreaterThanOrEqual(2);
    });

    it("renders direction slider in controlled mode", () => {
        renderGradientEditor(
            <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
        );

        const slider = screen.getByRole("slider", { name: "Gradient direction" });
        expect(slider).toHaveAttribute("aria-valuenow", "90");
        expect(screen.getByText("Direction")).toBeInTheDocument();
    });

    it("uses defaultDirection when direction prop not provided", () => {
        renderGradientEditor(
            <GradientEditor stops={defaultStops} defaultDirection={180} showDirection={true} onChange={vi.fn()} />,
        );

        expect(screen.getByRole("slider", { name: "Gradient direction" })).toHaveAttribute("aria-valuenow", "180");
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

        await user.click(addButton);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("does not remove stop when at minimum (2 stops)", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

        const removeButtons = screen.getAllByRole("button", { name: /remove/i });
        expect(removeButtons[0]).toBeDisabled();

        await user.click(removeButtons[0]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("resets color to default when reset button is clicked", async () => {
        // Regression test: reset was not working because GradientEditor
        // ignored undefined values from CompactColorInput's onColorChange.
        const user = userEvent.setup();
        const onChange = vi.fn();
        const customStops = [createColorStop(0, "#FF0000"), createColorStop(1, "#0000FF")];
        renderGradientEditor(<GradientEditor stops={customStops} onChange={onChange} />);

        const colorInputs = screen.getAllByRole("textbox", { name: /color hex/i });
        await user.clear(colorInputs[0]);
        await user.type(colorInputs[0], "00FF00");
        await user.tab();

        const resetButtons = screen.getAllByRole("button", { name: /reset.*default/i });
        expect(resetButtons.length).toBeGreaterThanOrEqual(1);

        onChange.mockClear();

        await user.click(resetButtons[0]);

        expect(onChange).toHaveBeenCalled();
        const [newStops] = onChange.mock.calls[0];
        expect(newStops[0].color).toBe("#888888");
    });

    describe("onChange callback count", () => {
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

            await user.click(screen.getAllByRole("button", { name: /remove/i })[0]);

            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("calls onChange exactly once when direction slider changes", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    defaultDirection={0}
                    showDirection={true}
                    onChange={onChange}
                />,
            );

            const slider = screen.getByRole("slider", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowRight}");

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

        it("hands the click that added a stop to onChange", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(<GradientEditor stops={defaultStops} onChange={onChange} />);

            await user.click(screen.getByRole("button", { name: /add/i }));

            const event = onChange.mock.calls[0][2];
            expect(event).toBeDefined();
            expect(event.type).toBe("click");
        });
    });

    // Contract 1.3: a drag reports a start and an end as well as its steps, so
    // a consumer can open one undo transaction around the whole gesture
    // instead of getting one entry per step.
    describe("drag boundaries", () => {
        it("reports the start and the end of a keyboard change around its steps", async () => {
            const user = userEvent.setup();
            const order: string[] = [];
            const onChangeStart = vi.fn(() => order.push("start"));
            const onChange = vi.fn(() => order.push("change"));
            const onChangeEnd = vi.fn(() => order.push("end"));

            renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    defaultDirection={10}
                    showDirection={true}
                    onChange={onChange}
                    onChangeStart={onChangeStart}
                    onChangeEnd={onChangeEnd}
                />,
            );

            const slider = screen.getByRole("slider", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowRight}");

            expect(order).toEqual(["start", "change", "end"]);
        });

        it("reports the settled gradient to onChangeEnd", async () => {
            const user = userEvent.setup();
            const onChangeEnd = vi.fn();

            renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    defaultDirection={10}
                    showDirection={true}
                    onChangeEnd={onChangeEnd}
                />,
            );

            const slider = screen.getByRole("slider", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowRight}");

            expect(onChangeEnd).toHaveBeenCalledTimes(1);
            const [settledStops, settledDirection] = onChangeEnd.mock.calls[0];
            expect(settledStops).toHaveLength(2);
            expect(settledDirection).toBe(11);
        });

        // Mantine settles an arrow press immediately -- its own onChangeEnd
        // fires on every keydown, not on the keyup -- so each press is one
        // complete gesture rather than a step within a longer one.
        it("reports each keyboard step as its own complete gesture", async () => {
            const user = userEvent.setup();
            const onChangeStart = vi.fn();
            const onChangeEnd = vi.fn();

            renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    defaultDirection={10}
                    showDirection={true}
                    onChangeStart={onChangeStart}
                    onChangeEnd={onChangeEnd}
                />,
            );

            const slider = screen.getByRole("slider", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowRight>3}{/ArrowRight}");

            expect(onChangeStart).toHaveBeenCalledTimes(3);
            expect(onChangeEnd).toHaveBeenCalledTimes(3);
        });

        it("reports one start for a pointer drag, carrying the press that began it", () => {
            const onChangeStart = vi.fn();

            const { container } = renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    defaultDirection={10}
                    showDirection={false}
                    onChangeStart={onChangeStart}
                />,
            );

            const track = container.querySelectorAll(".mantine-Slider-root")[0];
            fireEvent.pointerDown(track);
            fireEvent.pointerMove(track, { clientX: 20 });

            expect(onChangeStart).toHaveBeenCalledTimes(1);
            expect(onChangeStart.mock.calls[0][0].type).toBe("pointerdown");
        });

        it("reports a stop's settled position to onChangeEnd", async () => {
            const user = userEvent.setup();
            const onChangeEnd = vi.fn();

            renderGradientEditor(
                <GradientEditor defaultStops={defaultStops} showDirection={false} onChangeEnd={onChangeEnd} />,
            );

            const slider = screen.getByRole("slider", { name: "Stop 1 position" });
            slider.focus();
            await user.keyboard("{ArrowRight}");

            expect(onChangeEnd).toHaveBeenCalledTimes(1);
            const [settledStops] = onChangeEnd.mock.calls[0];
            expect(settledStops[0].offset).toBeCloseTo(0.01);
        });
    });

    describe("stop count bounds", () => {
        it("honours a maxStops lower than the default", () => {
            const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
            renderGradientEditor(<GradientEditor stops={threeStops} maxStops={3} onChange={vi.fn()} />);

            expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
        });

        it("honours a minStops higher than the default", () => {
            const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
            renderGradientEditor(<GradientEditor stops={threeStops} minStops={3} onChange={vi.fn()} />);

            screen.getAllByRole("button", { name: /remove/i }).forEach((button) => {
                expect(button).toBeDisabled();
            });
        });

        it("allows more stops than the default when maxStops is raised", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const fiveStops = [
                createColorStop(0, "#FF0000"),
                createColorStop(0.25, "#FF0000"),
                createColorStop(0.5, "#FF0000"),
                createColorStop(0.75, "#FF0000"),
                createColorStop(1, "#0000FF"),
            ];
            renderGradientEditor(<GradientEditor stops={fiveStops} maxStops={6} onChange={onChange} />);

            const addButton = screen.getByRole("button", { name: /add/i });
            expect(addButton).not.toBeDisabled();

            await user.click(addButton);
            expect(onChange.mock.calls[0][0]).toHaveLength(6);
        });
    });

    describe("accessibility and strings", () => {
        // The names used to sit on the wrapping div rather than on the element
        // carrying role="slider", where nothing looked for them.
        it("names each slider on the element that carries the slider role", () => {
            renderGradientEditor(
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
            );

            expect(screen.getByRole("slider", { name: "Stop 1 position" })).toBeInTheDocument();
            expect(screen.getByRole("slider", { name: "Stop 2 position" })).toBeInTheDocument();
            expect(screen.getByRole("slider", { name: "Gradient direction" })).toBeInTheDocument();
        });

        it("groups the stops under their own heading", () => {
            renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);

            const group = screen.getByRole("group", { name: "Color Stops" });
            expect(group).toContainElement(screen.getByRole("slider", { name: "Stop 1 position" }));
        });

        it("groups the direction slider under its own heading", () => {
            renderGradientEditor(
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
            );

            const group = screen.getByRole("group", { name: "Direction" });
            expect(group).toContainElement(screen.getByRole("slider", { name: "Gradient direction" }));
        });

        it("takes every string from the labels", () => {
            renderGradientEditor(
                <LabelsProvider
                    labels={{
                        colorStops: "Etapes",
                        addColorStop: "Ajouter une etape",
                        removeColorStop: (position) => `Supprimer l'etape ${position}`,
                        colorStopPosition: (position) => `Position de l'etape ${position}`,
                        direction: "Sens",
                        gradientDirection: "Sens du degrade",
                    }}
                >
                    <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />
                </LabelsProvider>,
            );

            expect(screen.getByText("Etapes")).toBeInTheDocument();
            expect(screen.getByText("Sens")).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Ajouter une etape" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "Supprimer l'etape 1" })).toBeInTheDocument();
            expect(screen.getByRole("slider", { name: "Position de l'etape 2" })).toBeInTheDocument();
            expect(screen.getByRole("slider", { name: "Sens du degrade" })).toBeInTheDocument();
        });

        it("writes the tick marks through the degree label and the locale's digits", () => {
            renderGradientEditor(
                <LabelsProvider labels={{ degrees: (angle) => `${angle} deg` }}>
                    <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />
                </LabelsProvider>,
            );

            expect(screen.getByText("270 deg")).toBeInTheDocument();
        });

        it("renders under a right-to-left direction provider", () => {
            renderGradientEditor(
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
                "rtl",
            );

            expect(screen.getByRole("slider", { name: "Gradient direction" })).toBeInTheDocument();
            expect(screen.getByRole("group", { name: "Color Stops" })).toBeInTheDocument();
        });
    });
});
