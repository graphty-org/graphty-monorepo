import { Autocomplete, Box, DirectionProvider, MultiSelect, NativeSelect, Select, Stack, TagsInput, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { LabelsProvider, StyleSelect } from "../../../src";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A drop-down for one of a fixed set of choices: Mantine's `Select`, which the theme draws as an
 * outlined 24px trigger with a dark list that opens over it, and `StyleSelect`, this package's
 * wrapper that says whether the reader chose the value or inherited the default.
 *
 * ## When to use it
 *
 * | You have | Use |
 * |---|---|
 * | One of a fixed list, in a form or a toolbar | Mantine `Select` -- no import from this package; the theme styles it ([props on mantine.dev](https://mantine.dev/core/select/)) |
 * | One of a fixed list with a default the reader overrides | `StyleSelect` (below): `undefined` means "inherit the default", and a reset button appears once a choice is made |
 * | One of a fixed list in a dense panel row, with a glyph instead of a caption | `PanelField kind="select"` |
 * | A value that may be typed OR picked from presets (a font size, a zoom) | `ComboInput` |
 * | Free text with suggestions | Mantine `Autocomplete` (opens the same dark list below the field) |
 *
 * | | Mantine `Select` | `StyleSelect` |
 * |---|---|---|
 * | What `undefined` means | nothing selected | using the default value |
 * | Reset | `clearable` empties it | a button that reports `undefined` |
 * | Options | `data` | `options` (`{ value, label }[]`) |
 *
 * ## Usage
 *
 * ```tsx
 * import { Select } from "@mantine/core";
 * import { StyleSelect } from "@graphty/compact-mantine";
 *
 * <Select aria-label="Stroke align" data={["Center", "Inside", "Outside"]} value={align} onChange={setAlign} />
 *
 * const [shape, setShape] = useState<string | undefined>(undefined);
 * <StyleSelect label="Shape" value={shape} defaultValue="circle" options={shapes} onChange={setShape} />
 * ```
 *
 * The props table below is `StyleSelect`'s. The Default story draws Mantine's `Select` from the
 * props the two share (`label`, `options` as `data`, `value`, `defaultValue`, `disabled`).
 *
 * ## Keyboard and accessibility
 *
 * - Enter or Space opens the list with the current choice highlighted and sitting exactly over
 *   the trigger; ArrowUp / ArrowDown move, Home / End jump, typing a letter jumps to a match,
 *   Enter commits, Escape closes without change. Focus returns to the trigger.
 * - The trigger follows the APG select-only combobox pattern (`aria-haspopup="listbox"`,
 *   `aria-activedescendant`); options are `role="option"` with `aria-selected`.
 * - `StyleSelect` is named by its visible `label`. Its reset button is named from the
 *   `resetToDefault` label ("Reset Shape to default"), which `LabelsProvider` translates;
 *   `disabledReason` becomes the tooltip and the accessible description.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Trigger | 24px tall, outlined: 1px border, radius 5px, 8px start padding, a 24px caret slot |
 * | Widths | 88 (field), 184 (body), 208 (in a popover) |
 * | List | dark surface in both schemes, radius 13px, padding 8px 0, 24px option rows |
 * | List position | over the trigger, the selected option on it, starting 8px before it |
 * | Reset (StyleSelect) | a 24px ghost icon button in the trailing slot |
 */
const meta: Meta<typeof StyleSelect> = {
    title: "Components/Inputs/Select",
    component: StyleSelect,
    parameters: {
        layout: "padded",
    },
};

export default meta;
type Story = StoryObj<typeof StyleSelect>;

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

/** A fixed width for the StyleSelect stories, the width of a panel's body. */
const PANEL = 280;

/**
 * Mantine's `Select` with the compact theme: the outlined trigger and the dark list. The
 * controls edit the props it shares with `StyleSelect`.
 */
export const Default: Story = {
    args: {
        label: "Node shape",
        defaultValue: "circle",
        options: shapeOptions,
    },
    render: ({ label, value, defaultValue, options, disabled }) => (
        <Box w={PANEL}>
            <Select label={label} data={options} value={value} defaultValue={defaultValue} disabled={disabled} />
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
                { state: "hover (no change)", node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} data-state="hover" /> },
                { state: "keyboard focus", node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} data-state="focus" /> },
                { state: "disabled", node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} disabled /> },
                { state: "invalid", node: <Select aria-label="Align" data={ALIGN} defaultValue="Inside" w={88} error /> },
                { state: "placeholder", node: <Select aria-label="Device" data={["iPhone", "iPad"]} placeholder="No device" w={184} /> },
                { state: "filled variant", node: <Select aria-label="Font style" variant="filled" data={["Regular", "Bold"]} defaultValue="Regular" w={88} /> },
                { state: "NativeSelect", node: <NativeSelect aria-label="Scale" data={["1x", "2x"]} w={88} /> },
            ]}
        />
    ),
};

/**
 * The list open: it opens over its trigger with the selected option exactly on top of it,
 * starting 8px before the trigger and 16px wider than it. The list is dark in both schemes.
 */
export const OpenList: Story = {
    parameters: ownFrame(280),
    render: () => (
        <div style={{ padding: "120px 40px" }}>
            <Select
                aria-label="Stroke align"
                data={ALIGN}
                defaultValue="Inside"
                w={76}
                defaultDropdownOpened
            />
        </div>
    ),
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
        await waitFor(() => {
            const t = trigger.closest(".cm-input-wrapper")?.getBoundingClientRect().top ?? 0;
            return expect(Math.abs(inside.getBoundingClientRect().top - t)).toBeLessThanOrEqual(1);
        });
        await userEvent.keyboard("{ArrowDown}{Enter}");
        await expect(trigger).toHaveValue("Outside");
        await expect(trigger).toHaveFocus();
    },
};

/** `searchable`: the trigger becomes a text box that filters the list as you type. */
export const Searchable: Story = {
    render: () => <Select label="Searchable" placeholder="Search..." data={["Cats", "Dogs", "Hamsters"]} searchable w={200} />,
};

/** `clearable`: a clear button empties the value. Compare StyleSelect's reset, which reports the default. */
export const Clearable: Story = {
    render: () => <Select placeholder="Clearable" aria-label="Pet" data={["Cats", "Dogs"]} clearable defaultValue="Cats" w={200} />,
};

/** Mantine's `NativeSelect`, the browser's own drop-down drawn as a filled field. */
export const Native: Story = {
    render: () => <NativeSelect aria-label="Native" data={["Native", "Select"]} w={200} />,
};

/**
 * `StyleSelect`: the first control shows its default and offers no reset; the second holds a
 * choice of the reader's own, so its reset button is offered. Pressing reset reports `undefined`.
 */
export const ResetToDefault: Story = {
    render: () => (
        <Stack gap="md" w={PANEL}>
            <StyleSelect label="Node shape" defaultValue="circle" options={shapeOptions} />
            <StyleSelect label="Edge arrow" defaultValue="circle" value="triangle" options={shapeOptions} />
        </Stack>
    ),
};

/**
 * `StyleSelect`'s states, light and dark side by side: showing its default (drawn like any
 * value), a choice of the reader's own with its reset, and disabled with its reason.
 */
export const ResetToDefaultStates: Story = {
    parameters: BOTH_SCHEMES,
    render: () => {
        const options = [
            { value: "circle", label: "Circle" },
            { value: "square", label: "Square" },
        ];
        return (
            <StateGrid
                cells={[
                    { state: "default", node: <StyleSelect label="Shape" defaultValue="circle" options={options} /> },
                    {
                        state: "overridden",
                        node: <StyleSelect label="Shape" defaultValue="circle" value="square" options={options} />,
                    },
                    {
                        state: "disabled",
                        node: <StyleSelect label="Shape" defaultValue="circle" options={options} disabled disabledReason="Load data first" />,
                    },
                ]}
            />
        );
    },
};

/**
 * `StyleSelect` driven from the page's own state. `undefined` is the state that means "still the
 * default"; the reset button reports it back, which is how a caller learns that the reader has
 * taken their override away again.
 */
export const Controlled: Story = {
    render: function ControlledStory() {
        const [shape, setShape] = useState<string | undefined>(undefined);

        return (
            <Stack gap="xs" w={PANEL}>
                <StyleSelect label="Node shape" value={shape} defaultValue="circle" options={shapeOptions} onChange={setShape} />
                <Text size="xs" c="dimmed">
                    {`value: ${shape ?? "undefined (using the default)"}`}
                </Text>
            </Stack>
        );
    },
};

/**
 * The reset button's name comes from `LabelsProvider`, so it can be translated without touching
 * the component. The option labels are your own strings and are translated wherever they come
 * from.
 */
export const Translated: Story = {
    render: function TranslatedStory() {
        return (
            <Box w={PANEL}>
                <LabelsProvider locale="fr-FR" labels={{ resetToDefault: (label) => `Retablir ${label}` }}>
                    <StyleSelect
                        label="Forme du noeud"
                        value="triangle"
                        defaultValue="circle"
                        options={[
                            { value: "circle", label: "Cercle" },
                            { value: "square", label: "Carre" },
                            { value: "triangle", label: "Triangle" },
                        ]}
                        onChange={() => undefined}
                    />
                </LabelsProvider>
            </Box>
        );
    },
};

/**
 * Right to left. The reset button follows the control to the other side, because the space
 * between them is written along the inline axis rather than as a left or a right margin.
 */
export const RightToLeft: Story = {
    render: function RightToLeftStory() {
        return (
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <Box dir="rtl" w={PANEL}>
                    <StyleSelect
                        label="Node shape"
                        value="triangle"
                        defaultValue="circle"
                        options={shapeOptions}
                        onChange={() => undefined}
                    />
                </Box>
            </DirectionProvider>
        );
    },
};
