import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
    LabelsProvider,
    StyleSelect,
} from "../src";
import { StateGrid } from "./figma/inputs/StateGrid";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A dropdown that says whether the reader chose its value or inherited it.
 *
 * **The idea that makes it different.** `undefined` means "nothing has been
 * chosen here", not "empty". While nothing has been chosen the control shows
 * the default and offers no reset; as soon as the reader picks
 * something a reset button appears. Pressing that
 * reset reports `undefined` again. A panel of these reads at a glance as a list
 * of what has been customised and what has not.
 *
 * **Reach for it when** a setting has a sensible default that the reader is
 * overriding rather than filling in. For an ordinary dropdown in a form,
 * Mantine's own `Select` is the simpler choice.
 *
 * **Accessibility.** The control's name comes from its visible label rather
 * than from an `aria-label` repeating it, so what a screen reader announces is
 * what is on the screen. The reset button's name says what it resets.
 *
 * | | Mantine `Select` | `StyleSelect` |
 * |---|---|---|
 * | What `undefined` means | nothing selected | using the default value |
 * | Reset | `clearable` empties it | a button that reports `undefined` |
 */
const meta: Meta<typeof StyleSelect> = {
    title: "Editing a Value/StyleSelect",
    component: StyleSelect,
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
type Story = StoryObj<typeof StyleSelect>;

const moodOptions = [
    { value: "sleepy", label: "Sleepy" },
    { value: "hungry", label: "Hungry" },
    { value: "chaotic", label: "Chaotic" },
    { value: "judging", label: "Silently Judging" },
];

/**
 * Nothing has been chosen, so the default is showing and there is no reset
 * button. Pick something else and the reset appears.
 */
export const Default: Story = {
    args: {
        label: "Current Mood",
        defaultValue: "sleepy",
        options: moodOptions,
    },
};

/**
 * Something has been chosen, so the reset button is offered.
 */
export const Overridden: Story = {
    args: {
        label: "Current Mood",
        value: "chaotic",
        defaultValue: "sleepy",
        options: moodOptions,
    },
};

/**
 * Driven from the page's own state. `undefined` is the state that means "still
 * the default"; the reset button reports it back, which is how a caller learns
 * that the reader has taken their override away again.
 */
export const Controlled: Story = {
    render: function ControlledStory() {
        const [mood, setMood] = useState<string | undefined>(undefined);

        return (
            <Stack gap="xs">
                <StyleSelect
                    label="Current Mood"
                    value={mood}
                    defaultValue="sleepy"
                    options={moodOptions}
                    onChange={setMood}
                />
                <Text size="xs" c="dimmed">
                    {`value: ${mood ?? "undefined (using the default)"}`}
                </Text>
            </Stack>
        );
    },
};

/**
 * The reset button's name comes from `LabelsProvider`, so it can be translated
 * without touching the component. The option labels are your own strings and
 * are translated wherever they come from.
 */
export const Translated: Story = {
    render: function TranslatedStory() {
        return (
            <LabelsProvider locale="fr-FR" labels={{ resetToDefault: (label) => `Retablir ${label}` }}>
                <StyleSelect
                    label="Humeur"
                    value="chaotic"
                    defaultValue="sleepy"
                    options={[
                        { value: "sleepy", label: "Endormi" },
                        { value: "hungry", label: "Affame" },
                        { value: "chaotic", label: "Chaotique" },
                    ]}
                    onChange={() => undefined}
                />
            </LabelsProvider>
        );
    },
};

/**
 * Laid out right to left. The reset button follows the control to the other
 * side, because the space between them is written along the inline axis rather
 * than as a left or a right margin.
 */
export const RightToLeft: Story = {
    render: function RightToLeftStory() {
        return (
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <div dir="rtl">
                    <StyleSelect
                        label="Current Mood"
                        value="chaotic"
                        defaultValue="sleepy"
                        options={moodOptions}
                        onChange={() => undefined}
                    />
                </div>
            </DirectionProvider>
        );
    },
};

/**
 * Every state side by side (design/figma-spec.md 6.4): the outlined trigger showing its default
 * (drawn like any value: Figma has no default state), a choice of the reader's own with its reset, and disabled. The list opens over the
 * trigger. Switch light / dark and the contrast mode in the toolbar.
 */
export const States: Story = {
    args: { label: "Shape", defaultValue: "circle", options: [] },
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
