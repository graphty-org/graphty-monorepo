import { Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { FieldRow, PanelLabelsProvider } from "../../../src";
import { AnglePicker } from "../../../src/components/inputs/AnglePicker";

/**
 * An angle: a small dial with a hand from its center to its rim, and a number field beside it.
 *
 * ## When to use it
 *
 * Reach for `AnglePicker` whenever the reader picks an angle -- a rotation, a gradient's
 * direction, a label's tilt. Its label goes above it, as `FieldRow` prints it with labels on;
 * never to its left.
 *
 * ## Usage
 *
 * ```tsx
 * import { AnglePicker } from "@graphty/compact-mantine";
 *
 * const [angle, setAngle] = useState(0);
 * <AnglePicker label="Rotation" value={angle} onChange={setAngle} />
 * ```
 *
 * `onChange(degrees, event?)` fires live (every pointer move, key and committed typing);
 * `onChangeEnd` once per finished edit (the release of a drag, each key, each typed commit).
 * Values are whole degrees, 0 to 359; a typed 400 becomes 40. By default 0 points up and the angle
 * grows clockwise (as CSS gradients count); `zeroAt="right" direction="counterclockwise"` counts
 * as mathematics does.
 *
 * ## Pointer
 *
 * Press anywhere in the dial and drag: the hand follows, even outside the dial. Hold Shift to snap
 * to `snap` degrees (15). Escape during a drag puts back the angle it started from.
 *
 * ## Keyboard and accessibility
 *
 * - The dial is a slider (one Tab stop) named by `label`: ArrowUp and ArrowRight add a degree,
 *   ArrowDown and ArrowLeft take one away, Shift or PageUp/PageDown step by `snap`, Home is 0.
 *   Steps wrap. Its spoken value is "45 degrees" (`labels.valueText`).
 * - The number field is the second Tab stop, named "<label>, degrees" (`labels.field`), and takes
 *   typing, arithmetic, arrow steps and scrubbing like every number field.
 * - An angle has no reading direction: under `dir="rtl"` the dial is not mirrored.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px |
 * | Dial | 24 x 24, 1px border, the field's fill |
 * | Hand | 1px, center to rim; the accent while focused or dragged |
 * | Gap to the field | 8px |
 */
const meta: Meta<typeof AnglePicker> = {
    title: "Components/Inputs/AnglePicker",
    component: AnglePicker,
    decorators: [
        (Story) => (
            <div style={{ width: 240, padding: 16 }}>
                <Story />
            </div>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof AnglePicker>;

/** A picker that keeps its own angle. */
export const Default: Story = {
    args: { label: "Rotation", defaultValue: 45 },
};

/**
 * Two pickers in a pair, with labels on: the caption sits above each.
 * @returns the row
 */
function Pair(): React.JSX.Element {
    const [rotation, setRotation] = useState(30);
    const [labelRotation, setLabelRotation] = useState(0);
    return (
        <PanelLabelsProvider showLabels>
            <FieldRow>
                <AnglePicker label="Rotation" value={rotation} onChange={setRotation} />
                <AnglePicker label="Label rotation" value={labelRotation} onChange={setLabelRotation} />
            </FieldRow>
        </PanelLabelsProvider>
    );
}

/** In a FieldRow with labels on. */
export const InFieldRow: Story = {
    render: () => <Pair />,
};

/** Off, with the reason. */
export const Disabled: Story = {
    args: { label: "Rotation", defaultValue: 90, disabled: true, disabledReason: "Load data first" },
};

/** Zero at the right, counting counterclockwise, as mathematics does. */
export const MathAngles: Story = {
    args: { label: "Angle", defaultValue: 90, zeroAt: "right", direction: "counterclockwise" },
};

/**
 * A picker whose angle the caller keeps, with what each handler last received.
 * @returns the picker and its readout
 */
function ControlledPicker(): React.JSX.Element {
    const [angle, setAngle] = useState(120);
    const [ended, setEnded] = useState<number | null>(null);
    return (
        <Stack gap={8}>
            <AnglePicker label="Rotation" value={angle} onChange={setAngle} onChangeEnd={setEnded} />
            <Text size="xs">onChange: {angle}</Text>
            <Text size="xs">onChangeEnd: {ended ?? "none yet"}</Text>
        </Stack>
    );
}

/** Controlled, with the values onChange and onChangeEnd report. */
export const Controlled: Story = {
    render: () => <ControlledPicker />,
};
