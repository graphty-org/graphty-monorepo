import { TextInput } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { expectStatesApply } from "../../helpers/assert-states";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * Mantine's `TextInput`, themed as Figma's filled field: 24px tall on the secondary ground, no
 * border at rest, an outline on hover and a brand ring on focus. `variant="outlined"` is the
 * bordered field of Figma's popovers. Every prop is Mantine's: see
 * [TextInput on mantine.dev](https://mantine.dev/core/text-input/).
 *
 * For a search box (magnifier, clear button, Escape clears) use `SearchInput`; for a number in a
 * panel row use `PanelField kind="number"` (both in Components/Inputs).
 *
 * ## Usage
 *
 * ```tsx
 * import { TextInput } from "@mantine/core";
 *
 * <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} w={184} />
 * ```
 *
 * A native text box. Its name comes from `label`, or from `aria-label` when the field has no
 * visible label. Focus (mouse or keyboard) draws the ring; `error` draws the danger outline.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px, radius 5px |
 * | Text | 11/16, weight 450, inset 8px |
 * | Label | 9/14 caption, weight 500, 4px above the field |
 * | Hover / focus | 1px `--cm-border` / `--cm-border-selected` outline, inset |
 * | Widths | 88px (one field) or 184px (the panel body) |
 */
const meta: Meta<typeof TextInput> = {
    title: "Themed Mantine/Inputs/TextInput",
    component: TextInput,
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TextInput>;

/** A labeled field in the panel body width; use Controls to try `variant`, `disabled` and `error`. */
export const Default: Story = {
    args: {
        label: "Name",
        placeholder: "Frame 1",
        w: 184,
    },
};

/**
 * Every state side by side: rest, hover and focus (forced with `data-state`), disabled, invalid,
 * the outlined variant, a label and a placeholder. Light and dark side by side.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} /> },
                { state: "hover", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} data-state="hover" /> },
                { state: "focus", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} data-state="focus" /> },
                { state: "disabled", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} disabled /> },
                { state: "invalid", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} error /> },
                { state: "outlined", node: <TextInput aria-label="TextInput" defaultValue="Frame 1" w={88} variant="outlined" /> },
                { state: "with label", node: <TextInput label="Label" defaultValue="Frame 1" w={88} /> },
                { state: "placeholder", node: <TextInput aria-label="Name" placeholder="Name" w={88} /> },
                { state: "error message", node: <TextInput aria-label="Name" defaultValue="" error="Required" w={88} /> },
            ]}
        />
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};
