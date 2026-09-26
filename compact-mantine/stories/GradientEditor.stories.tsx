import { Box, Code, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { type ColorStop, createColorStop, GradientEditor, LabelsProvider, PopoutManager } from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.
import { ForceState, StateCell } from "./figma/color/ForceState";

/**
 * Figma's gradient editor: stop handles over a gradient bar, a "Stops" list, and a direction row.
 *
 * **What it is for.** Editing a multi-stop linear gradient. Each stop is a 24px square handle
 * over the 32px bar (the selected one in the accent colour) and a 32px row below: its position,
 * its colour (the paint field, opening the picker) and a remove button. "+" adds a stop halfway
 * between the last one and the end; a click on the bar adds one right there, its colour mixed
 * from its neighbours. The direction row holds the angle, flip and rotate.
 *
 * **Keyboard.** A focused handle moves 1% per arrow (Shift for 10%), Home / End send it to an
 * end, Delete or Backspace removes it. The position and angle fields step with ArrowUp /
 * ArrowDown and commit typed values on Enter or blur.
 *
 * **The list is bounded at both ends** by `minStops` and `maxStops`; at either bound the button
 * that would cross it is disabled.
 *
 * **Dragging reports three things.** `onChangeStart` once when a drag begins, `onChange` on every
 * step, and `onChangeEnd` once when it settles, so an undo transaction can wrap the whole drag.
 *
 * **Stops carry an id.** Build them with `createColorStop`.
 *
 * **What it needs.** A `PopoutManager` above it, for the stop colours' pickers. It fills its
 * container; at 240 wide (a panel or a popover) it lands on Figma's pixels.
 *
 * **Translation.** Every string except the flip and rotate names (English props via `labels`)
 * comes from `LabelsProvider`, and numbers are written in the reader's own locale.
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
                <Box w={240} bg="var(--cm-bg)">
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
 * Two stops and the direction row: the smallest gradient there is.
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
 * Without the direction row, for a gradient whose angle is decided somewhere else.
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
                    mx={16}
                    style={{
                        borderRadius: 5,
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
 * The log below records what a consumer's history would see. Drag a stop
 * handle and the whole drag is bracketed by a single start and a single end,
 * however many steps it passes through, so an undo transaction opened on the
 * first and committed on the last collapses the drag into one entry.
 */
export const CoalescedIntoOneUndoEntry: Story = {
    render: function CoalescedStory() {
        const [log, setLog] = useState<string[]>([]);
        const record = (line: string): void => {
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
 * Every string comes from `LabelsProvider`, including the degree suffix on the angle, and
 * numbers are written in the locale it is given.
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
 * Laid out right to left. The rows mirror; the bar keeps Figma's left-to-right ramp, because it
 * draws the gradient's own 0% to 100%, not the reading order.
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

/**
 * Every state side by side (design/figma-spec.md 7.5): the Figma layout with the first stop
 * selected, a focused handle (forced), a selected middle stop, and the bounds (add disabled at
 * the maximum, remove disabled at the minimum). Switch the toolbar's theme for dark.
 */
export const States: Story = {
    render: function StatesStory() {
        return (
            <Stack gap={16}>
                <StateCell label="Rest (first stop selected), direction row">
                    <GradientEditor
                        defaultStops={[createColorStop(0, "#FF4D4D"), createColorStop(1, "#4D4DFF")]}
                        defaultDirection={90}
                    />
                </StateCell>
                <StateCell label="Focused handle">
                    <ForceState state="focus" selector=".cm-gradient-handle">
                        <GradientEditor
                            defaultStops={[createColorStop(0, "#FF4D4D"), createColorStop(1, "#4D4DFF")]}
                            showDirection={false}
                        />
                    </ForceState>
                </StateCell>
                <StateCell label="Five stops: add disabled">
                    <GradientEditor defaultStops={fiveStops} showDirection={false} />
                </StateCell>
            </Stack>
        );
    },
};

/**
 * The keyboard on a handle: the play function focuses the first handle, moves it 10% with
 * Shift+ArrowRight, and checks the position field followed.
 */
export const HandleKeyboard: Story = {
    args: {
        defaultStops: twoStops,
        showDirection: false,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const handle = canvas.getByRole("slider", { name: "Stop 1 position" });
        handle.focus();
        await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
        await expect(handle).toHaveAttribute("aria-valuenow", "10");
        await expect(canvas.getAllByRole("textbox", { name: "Stop 1 position" })[0]).toHaveValue("10%");
    },
};
