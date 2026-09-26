import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { LabelsProvider, StyleNumberInput } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { StateGrid } from "../../helpers/input-states";
import { BOTH_SCHEMES } from "../../helpers/schemes";
// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.

/**
 * A number box that says whether the reader typed its value or inherited it: while
 * the value is `undefined` it shows the default and offers no reset; once the reader commits a
 * number of their own, a reset button appears that reports `undefined` again.
 *
 * ## When to use it
 *
 * Reach for `StyleNumberInput` when a number has a sensible default that the reader overrides
 * rather than fills in, and the panel should read at a glance as a list of what has been
 * customized. Reach for `PanelField kind="number"` for a number in a dense panel row (a glyph
 * instead of a caption, scrubbing from the glyph, no reset). Reach for Mantine's `NumberInput`
 * for an ordinary number in a form.
 *
 * | | Mantine `NumberInput` | `PanelField kind="number"` | `StyleNumberInput` |
 * |---|---|---|---|
 * | Caption | `label` above | a glyph inside the box | `label` above |
 * | What `undefined` means | empty | empty | using the default |
 * | Reset | none | none | a button that reports `undefined` |
 * | When a change is reported | every keystroke | on commit and each arrow step | on commit and each arrow step |
 * | Scrub by dragging | no | yes, from the glyph | no |
 *
 * ## Usage
 *
 * ```tsx
 * import { StyleNumberInput } from "@graphty/compact-mantine";
 *
 * const [size, setSize] = useState<number | undefined>(undefined);
 * <StyleNumberInput label="Size" value={size} defaultValue={10} min={1} max={100} onChange={setSize} />
 * ```
 *
 * The number is committed on Enter, Tab or blur, never on each keystroke, so a half-typed "1" on
 * the way to "12" never reaches your state. On commit it is pulled into `min`..`max`. What is
 * typed is read in the reader's locale (`3,14` is 3.14 in German); the locale comes from
 * `LabelsProvider`, then the document's `lang`, then the browser.
 *
 * ## Keyboard and accessibility
 *
 * - ArrowUp / ArrowDown step at once (Shift: ten steps); Enter commits and keeps focus; Tab
 *   commits and moves on; Escape abandons what was typed. Arithmetic such as `40*2` commits 80.
 * - The visible `label` is the accessible name. The reset button is named from the
 *   `resetToDefault` label ("Reset Size to default"), which `LabelsProvider` translates.
 * - `disabledReason` becomes the tooltip and the field's description, so a screen reader hears
 *   why the field is off.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | 24px tall, filled, radius 5px, no steppers |
 * | Reset | a 24px ghost icon button in the trailing slot, 8px after the field |
 * | Text | 11/16, weight 450 |
 */
const meta: Meta<typeof StyleNumberInput> = {
    title: "Components/Inputs/StyleNumberInput",
    component: StyleNumberInput,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <Box w={280} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof StyleNumberInput>;

/**
 * Nothing has been entered, so the default is showing and there is no reset
 * button. Type a number and the reset appears.
 */
export const Default: Story = {
    args: {
        label: "Cuteness",
        defaultValue: 10,
    },
};

/**
 * Every state, light and dark side by side: the default (drawn like any
 * value), a value of the reader's own with its reset in the trailing slot, a suffix, and
 * disabled with its reason.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    args: { label: "Size", defaultValue: 10 },
    render: () => (
        <StateGrid
            cells={[
                { state: "default", node: <StyleNumberInput label="Size" defaultValue={10} /> },
                { state: "overridden", node: <StyleNumberInput label="Size" defaultValue={10} value={24} /> },
                { state: "suffix", node: <StyleNumberInput label="Opacity" defaultValue={100} suffix="%" /> },
                {
                    state: "disabled",
                    node: <StyleNumberInput label="Size" defaultValue={10} value={24} disabled disabledReason="Load data first" />,
                },
            ]}
        />
    ),
    play: ({ canvasElement }) => expectStatesApply(canvasElement),
};

/**
 * With bounds and a step: the arrow keys move 15 at a time, and anything typed outside 0..360 is
 * pulled into range when it is committed.
 */
export const WithMinMaxAndStep: Story = {
    args: {
        label: "Nap Angle",
        defaultValue: 0,
        min: 0,
        max: 360,
        step: 15,
        suffix: " deg",
    },
};

/**
 * With a unit written after the number.
 */
export const WithSuffix: Story = {
    args: {
        label: "Snack Budget",
        defaultValue: 100,
        suffix: " treats",
    },
};

/**
 * With a fraction. `decimalScale` decides how many digits are kept.
 */
export const WithDecimalScale: Story = {
    args: {
        label: "Chaos Factor",
        defaultValue: 3.14,
        min: 0.1,
        max: 10,
        step: 0.1,
        decimalScale: 2,
    },
};

/**
 * Driven from the page's own state. `undefined` is the state that means "still
 * the default"; the reset button reports it back, which is how a caller learns
 * that the reader has taken their override away again.
 */
export const Controlled: Story = {
    render: function ControlledStory() {
        const [size, setSize] = useState<number | undefined>(undefined);

        return (
            <Stack gap="xs">
                <StyleNumberInput label="Size" value={size} defaultValue={10} min={1} max={100} onChange={setSize} />
                <Text size="xs" c="dimmed">
                    {`value: ${size === undefined ? "undefined (using the default)" : size}`}
                </Text>
            </Stack>
        );
    },
};

/**
 * The keyboard route: type arithmetic and press Enter to commit it, ArrowUp to step, then press
 * the reset button to go back to the default.
 */
export const Keyboard: Story = {
    render: function KeyboardStory() {
        const [size, setSize] = useState<number | undefined>(undefined);

        return (
            <Stack gap="xs">
                <StyleNumberInput label="Size" value={size} defaultValue={10} min={1} max={100} onChange={setSize} />
                <Text size="xs" c="dimmed" data-testid="value">
                    {size === undefined ? "undefined" : String(size)}
                </Text>
            </Stack>
        );
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const box = canvas.getByLabelText("Size");
        await userEvent.click(box);
        await userEvent.keyboard("{Control>}a{/Control}4*5{Enter}");
        await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("20"));
        await expect(box).toHaveFocus();
        await userEvent.keyboard("{ArrowUp}");
        await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("21"));
        await userEvent.click(canvas.getByRole("button", { name: "Reset Size to default" }));
        await waitFor(() => expect(canvas.getByTestId("value")).toHaveTextContent("undefined"));
    },
};

/**
 * In a locale that writes fractions with a comma. Type `3,5` and it is
 * understood as three and a half; `parseFloat` would have read it as 3.
 */
export const GermanLocale: Story = {
    render: function GermanStory() {
        const [size, setSize] = useState<number | undefined>(undefined);

        return (
            <LabelsProvider locale="de-DE" labels={{ resetToDefault: (label) => `${label} zurucksetzen` }}>
                <Stack gap="xs">
                    <StyleNumberInput
                        label="Grosse"
                        value={size}
                        defaultValue={1.5}
                        decimalScale={2}
                        onChange={setSize}
                    />
                    <Text size="xs" c="dimmed">
                        {`value: ${size === undefined ? "undefined (using the default)" : size}`}
                    </Text>
                </Stack>
            </LabelsProvider>
        );
    },
};

/**
 * Laid out right to left. The reset button follows the box to the other side,
 * because the space between them is written along the inline axis rather than
 * as a left or a right margin.
 */
export const RightToLeft: Story = {
    render: function RightToLeftStory() {
        return (
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <div dir="rtl">
                    <StyleNumberInput label="Size" value={24} defaultValue={10} onChange={() => undefined} />
                </div>
            </DirectionProvider>
        );
    },
};
