import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme } from "../../../src";
import { ComboInput } from "../../../src/components/inputs/ComboInput";

if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {
        // Nothing scrolls in JSDOM.
    };
}

const SIZES = ["10", "12", "24"].map((value) => ({ value }));

function renderCombo(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("ComboInput", () => {
    it("is a named combobox that says it owns a listbox", () => {
        renderCombo(<ComboInput label="Font size" defaultValue="12" options={SIZES} />);
        const box = screen.getByRole("combobox", { name: "Font size" });
        expect(box).toHaveAttribute("aria-haspopup", "listbox");
        expect(box).toHaveAttribute("aria-expanded", "false");
        expect(box).toHaveValue("12");
    });

    it("commits typed text on Enter, once", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Mode" defaultValue="Hug" options={[{ value: "Hug" }]} onChange={onChange} />);
        const box = screen.getByRole("combobox");
        await userEvent.clear(box);
        await userEvent.type(box, "Fill");
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.keyboard("{Enter}");
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toBe("Fill");
    });

    it("a numeric field evaluates arithmetic and reports a number", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Font size" numeric defaultValue={12} options={SIZES} onChange={onChange} />);
        const box = screen.getByRole("combobox");
        await userEvent.clear(box);
        await userEvent.type(box, "12*2");
        await userEvent.tab();
        expect(onChange).toHaveBeenCalledWith(24, expect.anything());
    });

    it("a numeric field steps with the arrows while the list is closed", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Font size" numeric defaultValue={12} options={SIZES} onChange={onChange} />);
        await userEvent.click(screen.getByRole("combobox"));
        await userEvent.keyboard("{Shift>}{ArrowUp}{/Shift}");
        expect(onChange).toHaveBeenCalledWith(22, expect.anything());
    });

    it("Control+ArrowDown opens the list; Escape closes it", async () => {
        renderCombo(<ComboInput label="Font size" defaultValue="12" options={SIZES} />);
        const box = screen.getByRole("combobox");
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
        expect(box).toHaveAttribute("aria-expanded", "true");
        expect(box).toHaveAttribute("aria-controls");
        await userEvent.keyboard("{Escape}");
        expect(box).toHaveAttribute("aria-expanded", "false");
    });

    it("a number box says aloud, and draws nothing (Figma), when Escape took back the typing", async () => {
        renderCombo(<ComboInput label="Width" numeric defaultValue={3} options={[]} />);
        const box = screen.getByRole("spinbutton");
        await userEvent.click(box);
        await userEvent.keyboard("24{Escape}");
        expect(box).toHaveValue("3");
        expect(box).toHaveFocus();
        expect(screen.getByRole("status")).toHaveTextContent("Edit discarded; this stays 3.");
        expect(screen.getAllByText("Edit discarded; this stays 3.")).toHaveLength(1);
    });

    it("an arrow pressed before the open frame moves from the current value", async () => {
        // Hold back the frame in which the list highlights the current value, as a fast
        // keyboard user (or a test) outruns it.
        const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Font size" defaultValue="12" options={SIZES} onChange={onChange} />);
        await userEvent.click(screen.getByRole("combobox"));
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}{ArrowDown}{Enter}");
        raf.mockRestore();
        expect(onChange).toHaveBeenCalledWith("24", undefined);
    });

    it("picking an option commits it", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Font size" defaultValue="12" options={SIZES} onChange={onChange} />);
        await userEvent.click(screen.getByRole("button", { name: "Open list" }));
        await userEvent.click(screen.getByRole("option", { name: "24", hidden: true }));
        expect(onChange).toHaveBeenCalledWith("24", undefined);
    });

    it("marks the current value checked and draws separators", async () => {
        renderCombo(
            <ComboInput
                label="Width"
                defaultValue="Hug"
                options={[
                    { value: "Fixed" },
                    { value: "Hug" },
                    { separator: true },
                    { value: "Add min", disabled: true },
                ]}
            />,
        );
        await userEvent.click(screen.getByRole("button", { name: "Open list" }));
        expect(screen.getByRole("option", { name: "Hug", hidden: true })).toHaveAttribute("data-checked");
        expect(screen.getByRole("separator", { hidden: true }).tagName).toBe("HR");
    });

    it("shows its mode word and a disabled field refuses the list", () => {
        renderCombo(<ComboInput label="Width" defaultValue="236" suffix="Hug" options={SIZES} disabled />);
        expect(screen.getByText("Hug")).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Open list", hidden: true })).toBeDisabled();
    });

    it("with no choices is a spin button: no list button, and nothing opens a list", async () => {
        renderCombo(<ComboInput label="Size" numeric defaultValue={4} min={1} options={[]} />);
        expect(screen.queryByRole("button", { name: "Open list", hidden: true })).toBeNull();
        expect(screen.queryByRole("combobox")).toBeNull();
        const box = screen.getByRole("spinbutton", { name: "Size" });
        expect(box).toHaveAttribute("aria-valuenow", "4");
        expect(box).toHaveAttribute("aria-valuemin", "1");
        expect(box).not.toHaveAttribute("aria-haspopup");
        expect(box).not.toHaveAttribute("aria-expanded");
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
        expect(screen.queryByRole("listbox", { hidden: true })).toBeNull();
    });

    it("Home and End jump through the open list, and ArrowUp moves back", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Font size" defaultValue="10" options={SIZES} onChange={onChange} />);
        await userEvent.click(screen.getByRole("combobox"));
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}{End}{Enter}");
        expect(onChange).toHaveBeenLastCalledWith("24", undefined);
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}{Home}{Enter}");
        expect(onChange).toHaveBeenLastCalledWith("10", undefined);
        await userEvent.keyboard("{Alt>}{ArrowDown}{/Alt}{End}{ArrowUp}{Enter}");
        expect(onChange).toHaveBeenLastCalledWith("12", undefined);
        expect(onChange).toHaveBeenCalledTimes(3);
    });

    it("picking the value it already holds reports nothing", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Font size" defaultValue="12" options={SIZES} onChange={onChange} />);
        await userEvent.click(screen.getByRole("button", { name: "Open list" }));
        await userEvent.click(screen.getByRole("option", { name: "12", hidden: true }));
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false");
    });

    it("a text field takes back its typing on Escape and commits it on blur", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Mode" defaultValue="Hug" options={[{ value: "Hug" }]} onChange={onChange} />);
        const box = screen.getByRole("combobox");
        await userEvent.clear(box);
        await userEvent.type(box, "Fill");
        await userEvent.keyboard("{Escape}");
        expect(box).toHaveValue("Hug");
        expect(onChange).not.toHaveBeenCalled();
        await userEvent.clear(box);
        await userEvent.type(box, "Fixed");
        await userEvent.tab();
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toBe("Fixed");
    });

    it("a numeric field ignores a choice that is not a number", async () => {
        const onChange = vi.fn();
        renderCombo(
            <ComboInput
                label="Width"
                numeric
                defaultValue={12}
                options={[{ value: "Auto" }, { value: "24" }]}
                onChange={onChange}
            />,
        );
        await userEvent.click(screen.getByRole("button", { name: "Open list" }));
        await userEvent.click(screen.getByRole("option", { name: "Auto", hidden: true }));
        expect(onChange).not.toHaveBeenCalled();
        expect(screen.getByRole("combobox")).toHaveValue("12");
        await userEvent.click(screen.getByRole("button", { name: "Open list" }));
        await userEvent.click(screen.getByRole("option", { name: "24", hidden: true }));
        expect(onChange).toHaveBeenCalledWith(24, undefined);
    });

    it("a mixed field reads Mixed until a value is typed", async () => {
        const onChange = vi.fn();
        renderCombo(
            <ComboInput label="Gap" mixed divided suffix="px" defaultValue="" options={SIZES} onChange={onChange} />,
        );
        const box = screen.getByRole("combobox");
        expect(box).toHaveAttribute("placeholder", "Mixed");
        expect(box).toHaveAttribute("data-is-default", "true");
        await userEvent.type(box, "10{Enter}");
        expect(onChange.mock.calls[0][0]).toBe("10");
        expect(box).not.toHaveAttribute("data-is-default");
    });

    it("an empty number box that drops its typing says it stays at the placeholder", async () => {
        renderCombo(<ComboInput label="Width" numeric placeholder="Auto" defaultValue="" options={[]} />);
        const box = screen.getByLabelText("Width");
        await userEvent.click(box);
        await userEvent.keyboard("24{Escape}");
        expect(screen.getByRole("status")).toHaveTextContent("Edit discarded; this stays Auto.");
    });

    it("a number box steps from what is typed", async () => {
        const onChange = vi.fn();
        renderCombo(<ComboInput label="Size" numeric defaultValue={4} options={[]} onChange={onChange} />);
        await userEvent.click(screen.getByRole("spinbutton"));
        await userEvent.keyboard("30{ArrowUp}");
        expect(onChange).toHaveBeenLastCalledWith(31, expect.anything());
    });

    it("an empty number box steps up from its minimum, and stops at its maximum", async () => {
        const onChange = vi.fn();
        renderCombo(
            <ComboInput label="Size" numeric defaultValue="" min={5} max={6} options={[]} onChange={onChange} />,
        );
        await userEvent.click(screen.getByLabelText("Size"));
        await userEvent.keyboard("{ArrowUp}");
        expect(onChange).toHaveBeenLastCalledWith(6, expect.anything());
        await userEvent.keyboard("{ArrowUp}");
        expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("Enter in a number box inside a form commits, then submits the form", async () => {
        const onSubmit = vi.fn();
        renderCombo(
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmit();
                }}
            >
                <ComboInput label="Size" numeric defaultValue={4} options={[]} />
                <button type="submit">Save</button>
            </form>,
        );
        const box = screen.getByRole("spinbutton");
        await userEvent.click(box);
        await userEvent.keyboard("9{Enter}");
        expect(box).toHaveValue("9");
        await vi.waitFor(() => {
            expect(onSubmit).toHaveBeenCalledTimes(1);
        });
    });
});
