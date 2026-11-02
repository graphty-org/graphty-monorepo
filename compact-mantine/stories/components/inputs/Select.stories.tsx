import { Autocomplete, Box, MultiSelect, NativeSelect, Select, Stack, TagsInput, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { FieldRow, PANEL_GRID, PanelField, ResetButton } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { untilPasses } from "../../helpers/settled";
// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A drop-down for one of a fixed set of choices: Mantine's `Select`, which the theme draws as an
 * outlined 24px trigger with a dark list that opens over it.
 *
 * ## When to use it
 *
 * | You have | Use |
 * |---|---|
 * | One of a fixed list, in a form or a toolbar | Mantine `Select` -- no import from this package; the theme styles it ([props on mantine.dev](https://mantine.dev/core/select/)) |
 * | One of a fixed list in a dense panel row, with a glyph instead of a caption | `PanelField kind="select"` in a `FieldRow` |
 * | One of a fixed list with a default the reader overrides | `PanelField kind="select"` showing the default, and a `ResetButton` in the row's trailing slot once a choice is made (below) |
 * | A value that may be typed OR picked from presets (a font size, a zoom) | `ComboInput` |
 * | Free text with suggestions | Mantine `Autocomplete` (opens the same dark list below the field) |
 *
 * ## Usage
 *
 * ```tsx
 * import { Select } from "@mantine/core";
 * import { FieldRow, PanelField, ResetButton } from "@graphty/compact-mantine";
 *
 * <Select aria-label="Stroke align" data={["Center", "Inside", "Outside"]} value={align} onChange={setAlign} />
 *
 * const [shape, setShape] = useState<string | undefined>(undefined);
 * <FieldRow trailing={shape !== undefined && <ResetButton label="Shape" onClick={() => { setShape(undefined); }} />}>
 *     <PanelField label="Shape" kind="select" data={shapes} value={shape ?? "circle"} onChange={(next) => { setShape(String(next)); }} />
 * </FieldRow>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - Enter or Space opens the list with the current choice highlighted and sitting exactly over
 *   the trigger; ArrowUp / ArrowDown move, Home / End jump, typing a letter jumps to a match,
 *   Enter commits, Escape closes without change. Focus returns to the trigger.
 * - The trigger follows the APG select-only combobox pattern (`aria-haspopup="listbox"`,
 *   `aria-activedescendant`); options are `role="option"` with `aria-selected`.
 * - A `ResetButton` is named from the `resetToDefault` label ("Reset Shape to default"), which
 *   `LabelsProvider` translates.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Trigger | 24px tall, outlined: 1px border, radius 5px, 8px start padding, a 24px caret slot |
 * | Widths | 88 (field), 184 (body), 208 (in a popover) |
 * | List | dark surface in both schemes, radius 13px, padding 8px 0, 24px option rows |
 * | List position | over the trigger, the selected option on it, starting 8px before it |
 * | Reset | a 24px ghost icon button in the row's trailing slot |
 */
const meta: Meta<typeof Select> = {
    title: "Components/Inputs/Select",
    component: Select,
    parameters: {
        layout: "padded",
    },
};

export default meta;
type Story = StoryObj<typeof Select>;

const ALIGN = ["Center", "Inside", "Outside"];

const shapeOptions = [
    { value: "circle", label: "Circle" },
    { value: "square", label: "Square" },
    { value: "triangle", label: "Triangle" },
    { value: "diamond", label: "Diamond" },
];

/**
 * An open list portals into the document body, outside an inline docs block, so on the docs page
 * each open-list story renders in its own frame of this height.
 * @param height - the frame's height in pixels
 * @returns the story parameters
 */
function ownFrame(height: number): { docs: { story: { inline: false; height: string } } } {
    return { docs: { story: { inline: false, height: `${String(height)}px` } } };
}

/** A fixed width for the stories, the width of a panel's body. */
const PANEL = 280;

/** Mantine's `Select` with the compact theme: the outlined trigger and the dark list. */
export const Default: Story = {
    args: {
        label: "Node shape",
        defaultValue: "circle",
        data: shapeOptions,
    },
    render: (args) => (
        <Box w={PANEL}>
            <Select {...args} />
        </Box>
    ),
};

/**
 * The trigger's states, light and dark side by side: it does not change on hover and rings on
 * keyboard focus only (forced here with `data-state`). Invalid, the filled variant and
 * `NativeSelect` for comparison.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            cells={[
                { state: "rest", node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} /> },
                {
                    state: "hover (no change)",
                    node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} data-state="hover" />,
                },
                {
                    state: "keyboard focus",
                    node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} data-state="focus" />,
                },
                {
                    state: "disabled",
                    node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} disabled />,
                },
                {
                    state: "invalid",
                    node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} error />,
                },
                {
                    state: "placeholder",
                    node: <Select aria-label="Device" data={["iPhone", "iPad"]} placeholder="No device" w={184} />,
                },
                {
                    state: "filled variant",
                    node: (
                        <Select
                            aria-label="Font style"
                            variant="filled"
                            data={["Regular", "Bold"]}
                            defaultValue="Regular"
                            w={88}
                        />
                    ),
                },
                { state: "NativeSelect", node: <NativeSelect aria-label="Scale" data={["1x", "2x"]} w={88} /> },
            ]}
        />
    ),
    // Figma's select trigger draws no hover (the cell says "no change").
    play: ({ canvasElement }) => expectStatesApply(canvasElement, { unchanged: ['input[data-state="hover"]'] }),
};

/**
 * The list open: it opens over its trigger with the selected option exactly on top of it,
 * starting 8px before the trigger and 16px wider than it. The list is dark in both schemes.
 */
export const OpenList: Story = {
    parameters: ownFrame(280),
    render: () => (
        <div style={{ padding: "120px 40px" }}>
            <Select aria-label="Stroke align" data={ALIGN} defaultValue="Inside" w={76} defaultDropdownOpened />
        </div>
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/**
 * The other themed Mantine inputs that use the same dark list, which opens below the field
 * because there is no single selected row to align: Autocomplete and MultiSelect (shown open),
 * and TagsInput.
 */
export const BelowTheField: Story = {
    parameters: ownFrame(240),
    render: () => (
        <div style={{ paddingBottom: 120 }}>
            <StateGrid
                cells={[
                    {
                        state: "Autocomplete",
                        node: (
                            <Autocomplete
                                aria-label="Layer"
                                data={["Frame 1", "Frame 2"]}
                                w={160}
                                defaultDropdownOpened
                            />
                        ),
                    },
                    {
                        state: "MultiSelect",
                        node: (
                            <MultiSelect
                                aria-label="Tags"
                                data={["Alpha", "Beta", "Gamma"]}
                                defaultValue={["Alpha", "Beta"]}
                                w={184}
                                defaultDropdownOpened
                            />
                        ),
                    },
                    { state: "TagsInput", node: <TagsInput aria-label="Keywords" defaultValue={["draft"]} w={184} /> },
                ]}
            />
        </div>
    ),
};

/** Groups, a disabled option and a long list clamped to the viewport, each shown open. */
export const GroupsAndLongLists: Story = {
    parameters: ownFrame(560),
    render: () => (
        <div style={{ display: "flex", gap: 120, padding: "80px 40px" }}>
            <Select
                aria-label="Shape"
                w={120}
                defaultDropdownOpened
                defaultValue="Rectangle"
                data={[
                    { group: "Shapes", items: ["Rectangle", { value: "Ellipse", label: "Ellipse", disabled: true }] },
                    { group: "Text", items: ["Heading", "Body"] },
                ]}
            />
            <Select
                aria-label="Font size"
                w={88}
                defaultDropdownOpened
                defaultValue="96"
                data={[10, 11, 12, 13, 14, 15, 16, 20, 24, 32, 36, 40, 48, 64, 96, 128].map(String)}
            />
            <Select
                aria-label="Long list"
                w={120}
                defaultDropdownOpened
                placeholder="60 options"
                data={Array.from({ length: 60 }, (_, i) => `Option ${String(i + 1)}`)}
            />
        </div>
    ),
};

/**
 * Keyboard: Enter opens on the selected option, which sits exactly over the trigger; ArrowDown
 * moves, Enter commits and focus stays on the trigger.
 */
export const Keyboard: Story = {
    render: () => (
        <div style={{ padding: "120px 40px" }}>
            <Select aria-label="Stroke align" data={ALIGN} defaultValue="Inside" w={76} />
        </div>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole("combobox", { name: "Stroke align" });
        await userEvent.tab();
        await expect(trigger).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        const body = within(canvasElement.ownerDocument.body);
        const inside = await body.findByRole("option", { name: "Inside" });
        // floating-ui places the list on a later frame: wait on the placement, not a deadline (#2719).
        const offset = (): number =>
            Math.abs(
                inside.getBoundingClientRect().top -
                    (trigger.closest(".cm-input-wrapper")?.getBoundingClientRect().top ?? 0),
            );
        await untilPasses(() => offset() <= 1);
        await expect(offset()).toBeLessThanOrEqual(1);
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await expect(trigger).toHaveValue("Outside");
        await expect(trigger).toHaveFocus();
    },
};

/** `searchable`: the trigger becomes a text box that filters the list as you type. */
export const Searchable: Story = {
    render: () => (
        <Select label="Searchable" placeholder="Search..." data={["Cats", "Dogs", "Hamsters"]} searchable w={200} />
    ),
};

/** `clearable`: a clear button empties the value. Compare the reset below, which goes back to the default. */
export const Clearable: Story = {
    render: () => (
        <Select
            placeholder="Clearable"
            aria-label="Pet"
            data={["Cats", "Dogs"]}
            clearable
            defaultValue="Cats"
            w={200}
        />
    ),
};

/** Mantine's `NativeSelect`, the browser's own drop-down drawn as a filled field. */
export const Native: Story = {
    render: () => <NativeSelect aria-label="Native" data={["Native", "Select"]} w={200} />,
};

/**
 * A choice with a default the reader overrides. While nothing is chosen the field shows the
 * default and the row's trailing slot is empty; once the reader picks something a `ResetButton`
 * appears there, and pressing it goes back to the default.
 */
export const ResetToDefault: Story = {
    render: function ResetToDefaultStory() {
        const [shape, setShape] = useState<string | undefined>(undefined);

        return (
            <Stack gap="xs" w={PANEL_GRID.WIDTH}>
                <FieldRow
                    trailing={
                        shape !== undefined && (
                            <ResetButton
                                label="Node shape"
                                onClick={() => {
                                    setShape(undefined);
                                }}
                            />
                        )
                    }
                >
                    <PanelField
                        label="Node shape"
                        kind="select"
                        data={shapeOptions}
                        value={shape ?? "circle"}
                        onChange={(next) => {
                            setShape(String(next));
                        }}
                    />
                </FieldRow>
                <Text size="xs" c="dimmed">
                    {`value: ${shape ?? "undefined (using the default)"}`}
                </Text>
            </Stack>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(canvas.queryByRole("button", { name: "Reset Node shape to default" })).toBeNull();
        await userEvent.click(canvas.getByRole("combobox", { name: "Node shape" }));
        await userEvent.click(await within(document.body).findByRole("option", { name: "Square" }));
        const reset = await canvas.findByRole("button", { name: "Reset Node shape to default" });
        await userEvent.click(reset);
        await expect(canvas.queryByRole("button", { name: "Reset Node shape to default" })).toBeNull();
        await expect(canvas.getByText("value: undefined (using the default)")).toBeInTheDocument();
    },
};
