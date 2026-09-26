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

    it("shows the direction field when showDirection is true", () => {
        renderGradientEditor(
            <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
        );
        expect(screen.getByText("Direction")).toBeInTheDocument();
        expect(screen.getByRole("spinbutton", { name: "Gradient direction" })).toBeInTheDocument();
    });

    it("hides the direction field when showDirection is false", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} showDirection={false} onChange={vi.fn()} />);
        expect(screen.queryByText("Direction")).not.toBeInTheDocument();
        expect(screen.queryByRole("spinbutton", { name: "Gradient direction" })).not.toBeInTheDocument();
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

    it("renders the direction field in controlled mode", () => {
        renderGradientEditor(
            <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
        );

        const slider = screen.getByRole("spinbutton", { name: "Gradient direction" });
        expect(slider).toHaveAttribute("aria-valuenow", "90");
        expect(screen.getByText("Direction")).toBeInTheDocument();
    });

    it("uses defaultDirection when direction prop not provided", () => {
        renderGradientEditor(
            <GradientEditor stops={defaultStops} defaultDirection={180} showDirection={true} onChange={vi.fn()} />,
        );

        expect(screen.getByRole("spinbutton", { name: "Gradient direction" })).toHaveAttribute("aria-valuenow", "180");
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

    // Figma's stop rows have no reset (7.5): a stop always has a color of its own.
    it("offers no per-stop reset", () => {
        renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);
        expect(screen.queryByRole("button", { name: /reset/i })).not.toBeInTheDocument();
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

        it("calls onChange exactly once when the direction steps", async () => {
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

            const slider = screen.getByRole("spinbutton", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowUp}");

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

            const slider = screen.getByRole("spinbutton", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowUp}");

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

            const slider = screen.getByRole("spinbutton", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowUp}");

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

            const slider = screen.getByRole("spinbutton", { name: "Gradient direction" });
            slider.focus();
            await user.keyboard("{ArrowUp>3}{/ArrowUp}");

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

            const handle = container.querySelectorAll<HTMLElement>("[data-testid='gradient-editor-handle']")[0];
            fireEvent.pointerDown(handle);
            fireEvent.pointerMove(handle, { clientX: 20 });

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

    // Figma's gradient gestures (design/figma-spec.md 7.5).
    describe("handles, bar and direction buttons", () => {
        it("removes the focused stop with Delete, down to minStops", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
            renderGradientEditor(<GradientEditor defaultStops={threeStops} onChange={onChange} />);

            screen.getByRole("slider", { name: "Stop 3 position" }).focus();
            await user.keyboard("{Delete}");
            expect(onChange.mock.calls[0][0]).toHaveLength(2);

            screen.getByRole("slider", { name: "Stop 1 position" }).focus();
            await user.keyboard("{Backspace}");
            expect(onChange).toHaveBeenCalledTimes(1);
        });

        it("moves a handle 10% with Shift and to the ends with Home and End", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} onChange={onChange} />);

            const first = screen.getByRole("slider", { name: "Stop 1 position" });
            first.focus();
            await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
            expect(onChange.mock.calls.at(-1)?.[0][0].offset).toBeCloseTo(0.1);
            await user.keyboard("{End}");
            expect(onChange.mock.calls.at(-1)?.[0][0].offset).toBe(1);
            await user.keyboard("{Home}");
            expect(onChange.mock.calls.at(-1)?.[0][0].offset).toBe(0);
        });

        it("marks the stop whose handle has focus as selected, handle and row alike", () => {
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} />);

            const second = screen.getByRole("slider", { name: "Stop 2 position" });
            fireEvent.focus(second);

            expect(second).toHaveAttribute("data-selected");
            expect(screen.getAllByTestId("gradient-editor-stop")[1]).toHaveAttribute("data-selected");
            expect(screen.getAllByTestId("gradient-editor-stop")[0]).not.toHaveAttribute("data-selected");
        });

        it("adds a stop where the bar is clicked, its color mixed from its neighbors", () => {
            const onChange = vi.fn();
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} onChange={onChange} />);

            const bar = screen.getByTestId("gradient-editor-bar");
            bar.getBoundingClientRect = () => ({ left: 0, width: 200, top: 0, height: 32 }) as DOMRect;
            fireEvent.click(bar, { clientX: 50 });

            const [nextStops] = onChange.mock.calls[0];
            expect(nextStops).toHaveLength(3);
            expect(nextStops[1].offset).toBe(0.25);
            expect(nextStops[1].color).toBe("#BF0040");
        });

        it("commits a typed stop position as one complete gesture", async () => {
            const user = userEvent.setup();
            const order: string[] = [];
            renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    onChangeStart={() => order.push("start")}
                    onChange={() => order.push("change")}
                    onChangeEnd={() => order.push("end")}
                />,
            );

            const position = screen.getAllByRole("textbox", { name: "Stop 2 position" })[0];
            await user.clear(position);
            await user.type(position, "40{Enter}");

            expect(order).toEqual(["start", "change", "end"]);
            expect(screen.getByRole("slider", { name: "Stop 2 position" })).toHaveAttribute("aria-valuenow", "40");
        });

        it("flips the stops and rotates the angle a quarter turn", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(
                <GradientEditor defaultStops={defaultStops} defaultDirection={300} onChange={onChange} />,
            );

            await user.click(screen.getByRole("button", { name: "Flip gradient" }));
            const [flipped] = onChange.mock.calls[0];
            expect(flipped.map((stop: { color: string; offset: number }) => [stop.color, stop.offset])).toEqual([
                ["#0000FF", 0],
                ["#FF0000", 1],
            ]);

            await user.click(screen.getByRole("button", { name: "Rotate gradient 90 degrees" }));
            expect(onChange.mock.calls[1][1]).toBe(30);
        });
    });

    // One picker, under the bar, edits the selected stop; the stop rows open no pop-out.
    describe("the selected stop's color picker", () => {
        it("draws one picker, with no paint-type bar and no opacity, showing the first stop", () => {
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} />);

            expect(screen.getAllByTestId("color-picker-panel")).toHaveLength(1);
            expect(screen.queryByText("Solid")).not.toBeInTheDocument();
            expect(screen.queryByRole("slider", { name: "Opacity" })).not.toBeInTheDocument();
            expect(screen.getByRole("textbox", { name: "Color value" })).toHaveValue("FF0000");
        });

        it("a row's chit selects its stop, pressed, and the picker follows it", async () => {
            const user = userEvent.setup();
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} />);

            const chits = screen.getAllByRole("button", { name: "Color swatch" });
            expect(chits[0]).toHaveAttribute("aria-pressed", "true");
            expect(chits[1]).toHaveAttribute("aria-pressed", "false");

            await user.click(chits[1]);

            expect(chits[1]).toHaveAttribute("aria-pressed", "true");
            expect(chits[0]).toHaveAttribute("aria-pressed", "false");
            expect(chits[1]).not.toHaveAttribute("aria-expanded");
            expect(screen.getAllByTestId("color-picker-panel")).toHaveLength(1);
            expect(screen.getByRole("textbox", { name: "Color value" })).toHaveValue("0000FF");
        });

        it("a color typed into the picker writes the selected stop as one complete gesture", async () => {
            const user = userEvent.setup();
            const order: string[] = [];
            const onChange = vi.fn(() => order.push("change"));
            const onChangeEnd = vi.fn(() => order.push("end"));
            renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    onChangeStart={() => order.push("start")}
                    onChange={onChange}
                    onChangeEnd={onChangeEnd}
                />,
            );

            await user.click(screen.getAllByRole("button", { name: "Color swatch" })[1]);
            const value = screen.getByRole("textbox", { name: "Color value" });
            await user.clear(value);
            await user.type(value, "00FF00{Enter}");

            expect(order).toEqual(["start", "change", "end"]);
            const [settled] = onChangeEnd.mock.calls[0] as unknown as [{ color: string }[]];
            expect(settled.map((stop) => stop.color)).toEqual(["#FF0000", "#00FF00"]);
        });

        it("each arrow step in the picker's field is one start, change and end", async () => {
            const user = userEvent.setup();
            const onChangeStart = vi.fn();
            const onChange = vi.fn();
            const onChangeEnd = vi.fn();
            renderGradientEditor(
                <GradientEditor
                    defaultStops={[createColorStop(0, "#808080"), createColorStop(1, "#0000FF")]}
                    onChangeStart={onChangeStart}
                    onChange={onChange}
                    onChangeEnd={onChangeEnd}
                />,
            );

            screen.getByRole("slider", { name: "Saturation and brightness" }).focus();
            await user.keyboard("{ArrowRight}{ArrowRight}");

            expect(onChangeStart).toHaveBeenCalledTimes(2);
            expect(onChange).toHaveBeenCalledTimes(2);
            expect(onChangeEnd).toHaveBeenCalledTimes(2);
            expect(onChangeEnd.mock.calls[1][0][0].color).not.toBe("#808080");
        });

        it("the hex field commits on Enter as one complete gesture", async () => {
            const user = userEvent.setup();
            const order: string[] = [];
            const onChange = vi.fn(() => order.push("change"));
            renderGradientEditor(
                <GradientEditor
                    defaultStops={defaultStops}
                    onChangeStart={() => order.push("start")}
                    onChange={onChange}
                    onChangeEnd={() => order.push("end")}
                />,
            );

            const hex = screen.getAllByRole("textbox", { name: /color hex/i })[1];
            await user.clear(hex);
            await user.type(hex, "0f0{Enter}");

            expect(order).toEqual(["start", "change", "end"]);
            expect(onChange.mock.calls[0][0][1].color).toBe("#00FF00");
            expect(hex).toHaveValue("00FF00");
        });

        it("the hex field commits on blur and ignores text that is not a color", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} onChange={onChange} />);

            const hex = screen.getAllByRole("textbox", { name: /color hex/i })[0];
            await user.clear(hex);
            await user.type(hex, "nope");
            await user.tab();
            expect(onChange).not.toHaveBeenCalled();
            expect(hex).toHaveValue("FF0000");

            await user.clear(hex);
            await user.type(hex, "123456");
            await user.tab();
            expect(onChange.mock.calls[0][0][0].color).toBe("#123456");
        });

        it("Escape in the hex field reverts it and commits nothing", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} onChange={onChange} />);

            const hex = screen.getAllByRole("textbox", { name: /color hex/i })[0];
            await user.clear(hex);
            await user.type(hex, "00FF00{Escape}");

            expect(hex).toHaveValue("FF0000");
            expect(onChange).not.toHaveBeenCalled();
        });

        it("focus entering a row selects its stop for the picker", () => {
            renderGradientEditor(<GradientEditor defaultStops={defaultStops} />);

            fireEvent.focus(screen.getAllByRole("textbox", { name: /color hex/i })[1]);

            expect(screen.getAllByTestId("gradient-editor-stop")[1]).toHaveAttribute("data-selected");
            expect(screen.getByRole("textbox", { name: "Color value" })).toHaveValue("0000FF");
        });
    });

    describe("stop count bounds", () => {
        it("honors a maxStops lower than the default", () => {
            const threeStops = [...defaultStops, createColorStop(0.5, "#00FF00")];
            renderGradientEditor(<GradientEditor stops={threeStops} maxStops={3} onChange={vi.fn()} />);

            expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
        });

        it("honors a minStops higher than the default", () => {
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
        it("names each stop handle and the direction field on the element carrying the role", () => {
            renderGradientEditor(
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
            );

            expect(screen.getByRole("slider", { name: "Stop 1 position" })).toBeInTheDocument();
            expect(screen.getByRole("slider", { name: "Stop 2 position" })).toBeInTheDocument();
            expect(screen.getByRole("spinbutton", { name: "Gradient direction" })).toBeInTheDocument();
        });

        it("groups the stops under their own heading", () => {
            renderGradientEditor(<GradientEditor stops={defaultStops} onChange={vi.fn()} />);

            const group = screen.getByRole("group", { name: "Color Stops" });
            expect(group).toContainElement(screen.getByRole("slider", { name: "Stop 1 position" }));
        });

        it("groups the direction field under its own heading", () => {
            renderGradientEditor(
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
            );

            const group = screen.getByRole("group", { name: "Direction" });
            expect(group).toContainElement(screen.getByRole("spinbutton", { name: "Gradient direction" }));
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
            expect(screen.getByRole("spinbutton", { name: "Sens du degrade" })).toBeInTheDocument();
        });

        it("writes the angle through the degree label", () => {
            renderGradientEditor(
                <LabelsProvider labels={{ degrees: (angle) => `${angle} deg` }}>
                    <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />
                </LabelsProvider>,
            );

            expect(screen.getByRole("spinbutton", { name: "Gradient direction" })).toHaveValue("90 deg");
        });

        it("renders under a right-to-left direction provider", () => {
            renderGradientEditor(
                <GradientEditor stops={defaultStops} direction={90} showDirection={true} onChange={vi.fn()} />,
                "rtl",
            );

            expect(screen.getByRole("spinbutton", { name: "Gradient direction" })).toBeInTheDocument();
            expect(screen.getByRole("group", { name: "Color Stops" })).toBeInTheDocument();
        });
    });
});
