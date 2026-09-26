import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { ComboInput } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * A value you can type or pick from a list of presets: a filled 24px field with a chevron that
 * opens a dark list over the field, the current value sitting exactly on top of it. Figma uses it
 * for font size, auto-layout width and height ("Hug"), gap and export scale.
 *
 * ## When to use it
 *
 * | You have | Use |
 * |---|---|
 * | A value that is typed OR picked from presets (a font size, a zoom, "Hug") | `ComboInput` |
 * | One of a fixed list, nothing typed | Mantine `Select` ([Select page](?path=/docs/components-inputs-select--docs)) |
 * | Free text with suggestions that narrow as you type | Mantine `Autocomplete` |
 * | A number with no presets | `PanelField kind="number"` |
 *
 * ## Usage
 *
 * ```tsx
 * import { ComboInput } from "@graphty/compact-mantine";
 *
 * const [size, setSize] = useState<string | number>(24);
 * <ComboInput
 *     label="Font size"
 *     numeric
 *     value={size}
 *     onChange={setSize}
 *     options={[10, 12, 16, 24, 32].map((n) => ({ value: String(n) }))}
 * />
 * ```
 *
 * `options` mixes choices (`{ value, label?, disabled? }`) and separators (`{ separator: true }`).
 * `onChange(value, event?)` fires once per commit: a pick, Enter, Tab or blur after typing, an
 * arrow step or the end of a scrub. A `numeric` field reports a number and evaluates arithmetic
 * (`12*2`); a text field reports a string. `suffix` draws a mode word ("Hug") before the chevron,
 * `divided` draws the chevron behind a 1px divider, and `glyph` adds a leading slot that scrubs a
 * numeric value.
 *
 * ## Keyboard and accessibility
 *
 * - Typing edits the value; Enter, Tab or blur commits it, Escape drops the draft.
 * - Control+ArrowDown (or Alt+ArrowDown) opens the list with the current value highlighted;
 *   ArrowUp / ArrowDown move, Home / End jump, Enter picks, Escape closes without a change and
 *   leaves focus in the field. With the list closed, ArrowUp / ArrowDown step a numeric value
 *   (Shift: ten steps).
 * - The field is an APG editable combobox (`aria-haspopup="listbox"`, `aria-expanded`,
 *   `aria-activedescendant`), named by `label`. The chevron is named by `openLabel`
 *   ("Open list") and never takes focus from the field.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | 24px tall, filled, radius 5px, 88px wide by default (`width`) |
 * | Chevron slot | 24px; 25px with `divided` (a 1px divider in the panel color) |
 * | List | dark in both schemes, 24px rows, opens over the field with the current value on it |
 */
const meta: Meta<typeof ComboInput> = {
    title: "Components/Inputs/ComboInput",
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
 * An open list renders outside an inline docs block, so on the docs page the open-list story
 * renders in its own frame of this height.
 * @param height - the frame's height in pixels
 * @returns the story parameters
 */
function ownFrame(height: number): { docs: { story: { inline: false; height: string } } } {
    return { docs: { story: { inline: false, height: `${String(height)}px` } } };
}

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

/** A font-size field; the controls edit its props. */
export const Default: Story = {
    args: { label: "Font size", numeric: true, defaultValue: 24, options: SIZES, divided: true },
    argTypes: { options: { control: false } },
};

/**
 * Every state, light and dark side by side: rest, the divided chevron, a mode word, disabled
 * and a placeholder.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <ComboInput label="Font size" numeric defaultValue={24} options={SIZES} /> },
                { state: "divided", node: <ComboInput label="Font size" numeric defaultValue={24} options={SIZES} divided /> },
                { state: "suffix (Hug)", node: <ComboInput label="Width" defaultValue="236" suffix="Hug" options={WIDTHS} /> },
                { state: "disabled", node: <ComboInput label="Font size" defaultValue="24" options={SIZES} disabled /> },
                { state: "placeholder", node: <ComboInput label="Gap" placeholder="Auto" options={SIZES} /> },
            ]}
        />
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/** The chevron opens the list with 24 exactly over the field; ArrowDown and Enter pick 32. */
export const OpenOverTheField: Story = {
    parameters: ownFrame(560),
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
        // Reopen, so the story rests on the open list with the new value's row over the field.
        await userEvent.click(canvas.getByRole("button", { name: "Open list" }));
        const now = await body.findByRole("option", { name: "32" });
        await waitFor(() => {
            const field = box.closest(".cm-input-wrapper")?.getBoundingClientRect().top ?? 0;
            return expect(Math.abs(now.getBoundingClientRect().top - field)).toBeLessThanOrEqual(1);
        });
    },
};

/** Separators and disabled rows, and the keyboard: Control+ArrowDown opens, Escape closes. */
export const Keyboard: Story = {
    parameters: ownFrame(360),
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
