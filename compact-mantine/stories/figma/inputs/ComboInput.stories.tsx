import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { ComboInput } from "../../../src/components/inputs";
import { StateGrid } from "./StateGrid";

/**
 * The combo field (design/figma-spec.md 6.3): a value you can type, with a chevron that opens the
 * dark list OVER the field, the current value exactly on top of it. Font size, auto-layout width
 * ("Hug"), gap and export scale in Figma.
 */
const meta: Meta<typeof ComboInput> = {
    title: "Figma/Inputs/ComboInput",
    component: ComboInput,
};

export default meta;
type Story = StoryObj<typeof ComboInput>;

const SIZES = [10, 11, 12, 13, 14, 15, 16, 20, 24, 32, 36, 40, 48, 64, 96, 128].map((n) => ({ value: String(n) }));

const WIDTHS = [
    { value: "Fixed", label: "Fixed width (236)" },
    { value: "Hug", label: "Hug contents" },
    { separator: true as const },
    { value: "min", label: "Add min width...", disabled: true },
    { value: "max", label: "Add max width...", disabled: true },
];

/**
 * A controlled font-size field.
 * @param props - whether to draw the divided chevron
 * @param props.divided - the 25px chevron with its divider
 * @returns the field
 */
function FontSize(props: { divided?: boolean }): React.JSX.Element {
    const [size, setSize] = useState<string | number>(24);
    return <ComboInput label="Font size" numeric value={size} onChange={setSize} options={SIZES} divided={props.divided} />;
}

export const Default: Story = {
    render: () => (
        <div style={{ padding: "240px 40px" }}>
            <FontSize divided />
        </div>
    ),
};

/** Every state side by side; switch light / dark and the contrast mode in the toolbar. */
export const States: Story = {
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <ComboInput label="Font size" numeric defaultValue={24} options={SIZES} /> },
                { state: "divided", node: <ComboInput label="Font size" numeric defaultValue={24} options={SIZES} divided /> },
                {
                    state: "suffix (Hug)",
                    node: <ComboInput label="Width" defaultValue="236" suffix="Hug" options={WIDTHS} />,
                },
                { state: "disabled", node: <ComboInput label="Font size" defaultValue="24" options={SIZES} disabled /> },
                { state: "placeholder", node: <ComboInput label="Gap" placeholder="Auto" options={SIZES} /> },
            ]}
        />
    ),
};

/** The chevron opens the list with 24 exactly over the field; picking 32 commits it. */
export const OpenOverTheField: Story = {
    render: () => (
        <div style={{ padding: "240px 40px" }}>
            <FontSize divided />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const box = canvas.getByRole("combobox", { name: "Font size" });
        await userEvent.click(canvas.getByRole("button", { name: "Open list" }));
        const body = within(canvasElement.ownerDocument.body);
        const checked = await body.findByRole("option", { name: "24" });
        await waitFor(() => {
            const { top } = checked.getBoundingClientRect();
            const field = box.closest(".cm-input-wrapper")?.getBoundingClientRect().top ?? 0;
            return expect(Math.abs(top - field)).toBeLessThanOrEqual(1);
        });
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await expect(box).toHaveValue("32");
    },
};

/** Separators and disabled rows, and the keyboard: Control+ArrowDown opens, Escape closes. */
export const Keyboard: Story = {
    render: () => (
        <div style={{ padding: "160px 40px" }}>
            <ComboInput label="Width" defaultValue="Hug" suffix="Hug" options={WIDTHS} width={184} />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const box = canvas.getByRole("combobox", { name: "Width" });
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}{ArrowDown}{/Control}");
        await expect(box).toHaveAttribute("aria-expanded", "true");
        await userEvent.keyboard("{Escape}");
        await expect(box).toHaveAttribute("aria-expanded", "false");
        await expect(box).toHaveFocus();
    },
};
