import { Box, Code, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
    createColorStop,
    GradientEditor,
    LabelsProvider,
    PopoutManager,
    type ColorStop,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * An editor for a multi-stop linear gradient.
 *
 * **What it is for.** Each stop is one row: a colour control, a slider for
 * where the stop sits along the gradient, and a button that removes it. A
 * button above the list adds a stop halfway between the last one and the end,
 * and an optional slider below sets the angle the gradient runs at.
 *
 * **The list is bounded at both ends.** It will not go below `minStops`,
 * because a gradient of one colour is a flat fill rather than a gradient, and
 * it will not go above `maxStops`, because the position sliders get too short
 * to aim at. At either bound the button that would cross it is disabled rather
 * than silently doing nothing. Both bounds are props, so a caller with more
 * room can raise them.
 *
 * **Dragging reports three things.** `onChangeStart` once when a change
 * begins, `onChange` on every step, and `onChangeEnd` once when it settles.
 * Opening an undo transaction on the first and closing it on the last turns a
 * whole drag into one entry in your history instead of one per pixel moved.
 *
 * **Stops carry an id.** That is what keeps the right control attached to the
 * right stop as stops are added, removed and reordered. Build them with
 * `createColorStop` rather than writing the object by hand.
 *
 * **What it needs.** A `PopoutManager` somewhere above it, because each stop's
 * colour control opens its picker into the floating layer that manager owns.
 *
 * **Accessibility.** The stops sit in a group named by the heading above them,
 * and every slider's name is set on the element that actually carries
 * `role="slider"`, so a screen reader can find "Stop 2 position" rather than an
 * unnamed control. Mantine's slider handles its own arrow keys, including
 * running them the other way when the interface does.
 *
 * **Translation.** Every string it draws or speaks comes from
 * `LabelsProvider`, including the degree and percent suffixes, and numbers are
 * written in the reader's own locale.
 */
const meta: Meta<typeof GradientEditor> = {
    title: "Editing a Value/GradientEditor",
    component: GradientEditor,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Box w={320} p="md" bg="var(--mantine-color-body)">
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof GradientEditor>;

const twoStops: ColorStop[] = [createColorStop(0, "#6366F1"), createColorStop(1, "#06B6D4")];

const fiveStops: ColorStop[] = [
    createColorStop(0, "#FF6B6B"),
    createColorStop(0.25, "#F7B731"),
    createColorStop(0.5, "#61D095"),
    createColorStop(0.75, "#5B8FF9"),
    createColorStop(1, "#9B59B6"),
];

/**
 * Two stops and a direction slider: the smallest gradient there is.
 */
export const Default: Story = {
    args: {
        defaultStops: twoStops,
        defaultDirection: 90,
        showDirection: true,
    },
};

/**
 * At the default upper bound of five stops, so the add button is disabled.
 */
export const AtMaximumStops: Story = {
    args: {
        defaultStops: fiveStops,
        defaultDirection: 180,
        showDirection: true,
    },
};

/**
 * Without the direction slider, for a gradient whose angle is decided
 * somewhere else.
 */
export const WithoutDirection: Story = {
    args: {
        defaultStops: twoStops,
        showDirection: false,
    },
};

/**
 * Bounds of the caller's own choosing. This one accepts up to eight stops and
 * refuses to go below three.
 */
export const CustomBounds: Story = {
    args: {
        defaultStops: [createColorStop(0, "#FF6B6B"), createColorStop(0.5, "#F7B731"), createColorStop(1, "#5B8FF9")],
        minStops: 3,
        maxStops: 8,
        showDirection: false,
    },
};

/**
 * Driven from the page's own state. Both halves of the gradient arrive on
 * every change, so the handler never has to work out which one moved.
 */
export const Controlled: Story = {
    render: function ControlledStory() {
        const [stops, setStops] = useState<ColorStop[]>(twoStops);
        const [angle, setAngle] = useState(90);

        return (
            <Stack gap="xs">
                <GradientEditor
                    stops={stops}
                    direction={angle}
                    onChange={(nextStops, nextAngle) => {
                        setStops(nextStops);
                        setAngle(nextAngle);
                    }}
                />
                <Box
                    h={32}
                    style={{
                        borderRadius: 4,
                        background: `linear-gradient(${angle}deg, ${stops
                            .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
                            .join(", ")})`,
                    }}
                />
            </Stack>
        );
    },
};

/**
 * One drag, one undo entry.
 *
 * The log below records what a consumer's history would see. Drag either
 * slider and the whole drag is bracketed by a single start and a single end,
 * however many steps it passes through, so an undo transaction opened on the
 * first and committed on the last collapses the drag into one entry.
 */
export const CoalescedIntoOneUndoEntry: Story = {
    render: function CoalescedStory() {
        const [log, setLog] = useState<string[]>([]);
        const record = (line: string) => {
            setLog((entries) => [...entries.slice(-6), line]);
        };

        return (
            <Stack gap="xs">
                <GradientEditor
                    defaultStops={twoStops}
                    defaultDirection={90}
                    onChangeStart={() => {
                        record("begin transaction");
                    }}
                    onChange={(_stops, angle) => {
                        record(`step: ${angle}`);
                    }}
                    onChangeEnd={(_stops, angle) => {
                        record(`commit transaction at ${angle}`);
                    }}
                />
                <Text size="xs" c="dimmed">
                    History
                </Text>
                <Stack gap={2}>
                    {log.map((line, index) => (
                        <Code key={`${line}-${String(index)}`} block fz={10}>
                            {line}
                        </Code>
                    ))}
                </Stack>
            </Stack>
        );
    },
};

/**
 * Every string comes from `LabelsProvider`, including the degree suffix on the
 * direction slider's tick marks, and numbers are written in the locale it is
 * given.
 */
export const Translated: Story = {
    render: function TranslatedStory() {
        return (
            <LabelsProvider
                locale="fr-FR"
                labels={{
                    colorStops: "Etapes de couleur",
                    addColorStop: "Ajouter une etape",
                    removeColorStop: (position) => `Supprimer l'etape ${position}`,
                    colorStopPosition: (position) => `Position de l'etape ${position}`,
                    direction: "Sens",
                    gradientDirection: "Sens du degrade",
                    colorSwatch: "Nuancier",
                    colorHexValue: "Valeur hexadecimale",
                    resetToDefault: (label) => `Retablir ${label}`,
                    degrees: (value) => `${value} deg`,
                }}
            >
                <GradientEditor defaultStops={twoStops} defaultDirection={90} />
            </LabelsProvider>
        );
    },
};

/**
 * Laid out right to left. Mantine's slider reads the direction provider
 * itself, so the arrow keys run the way the text does and the track fills from
 * the reader's own starting edge.
 */
export const RightToLeft: Story = {
    render: function RightToLeftStory() {
        return (
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <div dir="rtl">
                    <GradientEditor defaultStops={twoStops} defaultDirection={90} />
                </div>
            </DirectionProvider>
        );
    },
};
