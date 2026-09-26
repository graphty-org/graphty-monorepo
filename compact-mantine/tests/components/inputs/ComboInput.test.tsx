import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

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
                options={[{ value: "Fixed" }, { value: "Hug" }, { separator: true }, { value: "Add min", disabled: true }]}
            />,
        );
        await userEvent.click(screen.getByRole("button", { name: "Open list" }));
        expect(screen.getByRole("option", { name: "Hug", hidden: true })).toHaveAttribute("data-checked");
        expect(screen.getByRole("separator", { hidden: true })).toBeInTheDocument();
    });

    it("shows its mode word and a disabled field refuses the list", () => {
        renderCombo(<ComboInput label="Width" defaultValue="236" suffix="Hug" options={SIZES} disabled />);
        expect(screen.getByText("Hug")).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeDisabled();
        expect(screen.getByRole("button", { name: "Open list", hidden: true })).toBeDisabled();
    });
});
