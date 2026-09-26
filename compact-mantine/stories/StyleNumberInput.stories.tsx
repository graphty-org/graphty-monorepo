import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
    LabelsProvider,
    StyleNumberInput,
} from "../src";
import { StateGrid } from "./figma/inputs/StateGrid";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A number box that says whether the reader typed its value or inherited it.
 *
 * **The idea that makes it different.** `undefined` means "nothing has been
 * entered here", not "empty". While nothing has been entered the box shows the
 * default and offers no reset; as soon as the reader commits a
 * number of their own a reset button appears.
 * Pressing that reset reports `undefined` again. A panel of these reads at a
 * glance as a list of what has been customised and what has not.
 *
 * **Committing.** The number is committed on Enter, Tab or blur, not on
 * every keystroke, so a half-typed "1" on the way to "12" never reaches your
 * state and the caret is never taken away mid-word. What is typed may be
 * arithmetic (`40*2`). On commit the number is pulled into `min`..`max` and the
 * box is redrawn showing what was actually kept. The arrow keys step it at
 * once (Shift: ten steps); Escape abandons what was typed.
 *
 * **Reading what was typed.** The number is read in the reader's own locale, so
 * `3,14` is 3.14 wherever the comma is the decimal separator, and a locale's
 * own digits are numbers rather than nonsense. The locale comes from
 * `LabelsProvider`, then from the document's `lang`, then from the browser.
 *
 * **Reach for it when** a value has a sensible default that the reader is
 * overriding rather than filling in. For an ordinary numeric field in a form,
 * Mantine's own `NumberInput` is the simpler choice.
 *
 * | | Mantine `NumberInput` | `StyleNumberInput` |
 * |---|---|---|
 * | What `undefined` means | empty | using the default value |
 * | Steppers | hidden by the theme | none (Figma draws none); the arrow keys step |
 * | Reset | none | a button that reports `undefined` |
 * | When a change is reported | every keystroke | on Enter, Tab or blur, and each arrow step |
 */
const meta: Meta<typeof StyleNumberInput> = {
    title: "Editing a Value/StyleNumberInput",
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
 * With bounds, a step and the steppers left in. Anything typed outside the
 * bounds is pulled into them when the box loses focus.
 */
export const WithMinMaxAndStep: Story = {
    args: {
        label: "Nap Angle",
        defaultValue: 0,
        min: 0,
        max: 360,
        step: 15,
        suffix: " deg",
        hideControls: false,
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

/**
 * Every state side by side (design/figma-spec.md 6.1): the default (drawn like any value), a value of the
 * reader's own with its reset in the trailing slot, hover and focus, disabled. Switch light /
 * dark and the contrast mode in the toolbar.
 */
export const States: Story = {
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
};
