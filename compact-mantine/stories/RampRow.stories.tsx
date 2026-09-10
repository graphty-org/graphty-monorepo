import { Box, Button, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import React, { useState } from "react";

import {
    AdvancedButton,
    LabelsProvider,
    PANEL_GRID,
    PANEL_INK,
    RampRow,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * The gradient the picture is painted with, spelled the way a caller would pass
 * it: theme variables, never a hardcoded hex, so it reads in both colour
 * schemes.
 */
const BETWEENNESS_GRADIENT =
    "linear-gradient(to right, var(--mantine-color-default), var(--mantine-primary-color-filled), var(--mantine-color-green-6))";

/**
 * The three transforms, in the order the chooser offers them.
 */
const SCALE_ORDER = ["sqrt", "linear", "log"] as const;

/**
 * A range drawn at the height of one row, with no sentence anywhere.
 *
 * **Purpose:** one `RampRow` says what "Age 45 to 68 maps to sizes 1.0 to 2.0,
 * square root scale" says, in a single 32px row. The two values are the ends of
 * the range, the drawing between them is the mapping, and the small curve at
 * the end of the row is the transform.
 *
 * **When to use:**
 * - Whenever a continuous value drives the size or the colour of something
 * - Directly under the control that binds that value, so the ramp reads as the
 *   picture of what the control just said
 * - Never with a caption above it or a reading below it: those are the lines
 *   the row exists to save
 *
 * **When not to use:**
 * - Not for a series of values. A ramp has exactly two ends; a series is a
 *   chart
 * - Not as a control. The row is a picture of a mapping, not a way to edit it;
 *   the curve at the end can open a chooser, and anything more belongs behind
 *   an advanced settings button
 *
 * **Two forms share one layout:**
 * - `size` -- a wedge that grows from the low value to the high one. Its two
 *   ends are the smallest and the largest size the mapping produces
 * - `color` -- a bar painted with your own gradient, so the ramp on the panel
 *   is the ramp on the picture it describes
 *
 * **Accessibility:** the whole row is one image with one name, composed from
 * the phrase you give as `label`, the two values and the transform's word --
 * "Node size by age 45 68 Square root scale". The shape itself is hidden from
 * assistive technology, because a name is what a picture has instead of
 * contents. Supply `label` on every ramp: without it a screen reader gets two
 * bare numbers. The curve becomes a real button, reachable by Tab and activated
 * by Enter or Space, as soon as you give it `onScaleClick`.
 *
 * **Values that arrive later:** pass `busy` while a background run is filling
 * the row in and the drawing becomes a polite live region, so the finished
 * range is announced once rather than being missed.
 *
 * **Internationalization:** the transform's word comes from `LabelsProvider`
 * and is translatable. Format the two values for the reader's locale before
 * passing them in -- this library's `useNumberFormatter` hook does that. Where
 * text runs right to left the two values swap ends and the drawing is mirrored
 * to follow them, including a gradient you wrote yourself, so the picture never
 * contradicts its own labels.
 */
const meta: Meta<typeof RampRow> = {
    title: "Editing a Value/RampRow",
    component: RampRow,
    tags: ["autodocs"],
    parameters: {
        layout: "padded",
    },
    argTypes: {
        variant: {
            control: "inline-radio",
            options: ["size", "color"],
        },
        scale: {
            control: "inline-radio",
            options: SCALE_ORDER,
        },
    },
    decorators: [
        (Story) => (
            <Box w={PANEL_GRID.WIDTH} p="md" bg="var(--mantine-color-body)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof RampRow>;

/**
 * The size form. Age runs 45 to 68 across the twenty cats, and the wedge is the
 * smallest and the largest node size the mapping draws. The curve at the end
 * says the mapping is a square root.
 *
 * A screen reader announces the whole row as "Node size by age 45 68 Square
 * root scale".
 */
export const Default: Story = {
    args: {
        label: "Node size by age",
        min: "45",
        max: "68",
        scale: "sqrt",
    },
};

/**
 * The colour form: betweenness from 0.00 (Chonky_Boy, who knows only his own
 * sofa) to 0.42 (Mr_Whiskers, who connects both halves of the network). The bar
 * carries the same gradient the picture is painted with, so the panel and the
 * picture agree.
 */
export const ColorRamp: Story = {
    args: {
        label: "Node color by betweenness",
        min: "0.00",
        max: "0.42",
        variant: "color",
        gradient: BETWEENNESS_GRADIENT,
        scale: "linear",
    },
};

/**
 * The logarithmic curve, on a count that spans two orders of magnitude: bridges
 * run 1 to 47 once Mrs_Henderson's shared-fence connections are counted.
 */
export const LogScale: Story = {
    args: {
        label: "Node size by bridges",
        min: "1",
        max: "47",
        scale: "log",
    },
};

/**
 * The colour form with no gradient of its own falls back to a ramp from the
 * panel's field surface to its accent colour, so it is still a picture of a
 * range and still reads in both colour schemes.
 */
export const DefaultGradient: Story = {
    args: {
        label: "Node color by degree",
        min: "0",
        max: "12",
        variant: "color",
        scale: "sqrt",
    },
};

/**
 * A ramp that names no transform leaves the slot at the end empty. The slot
 * keeps its 24px either way, which is what makes this row end level with the
 * rows above and below it.
 */
export const WithoutScale: Story = {
    args: {
        label: "Edge width by weight",
        min: "2",
        max: "9",
    },
};

/**
 * The slot at the end given something else to hold: a button that opens the
 * range and the transform together. It replaces the curve rather than joining
 * it -- and the transform stays in the row's accessible name, because the
 * mapping is still in force.
 *
 * The button is marked `changed`, so it draws in the primary text colour and
 * says so in its name as well.
 */
export const WithAdvancedSettings: Story = {
    args: {
        label: "Node size by age",
        min: "45",
        max: "68",
        scale: "sqrt",
        trailing: <AdvancedButton label="Range and scale" changed onClick={fn()} />,
    },
};

/**
 * Giving the curve `onScaleClick` turns it into a real button: Tab reaches it,
 * Enter and Space activate it, and the handler is given the event, so you can
 * read modifier keys or call `preventDefault`.
 *
 * Here it cycles the three transforms, so the glyph and the accessible name can
 * be watched changing together.
 */
export const ChoosingTheScale: Story = {
    render: (): React.JSX.Element => <CyclingScale />,
};

/**
 * A ramp whose transform cycles through the three the library draws.
 * @returns A ramp row whose curve changes the transform when it is activated
 */
function CyclingScale(): React.JSX.Element {
    const [index, setIndex] = useState(0);

    return (
        <RampRow
            label="Node size by age"
            min="45"
            max="68"
            scale={SCALE_ORDER[index]}
            onScaleClick={(event) => {
                // The event is handed over rather than swallowed: a consumer can
                // read modifier keys, or position a menu on event.currentTarget.
                event.preventDefault();
                setIndex((current) => (current + 1) % SCALE_ORDER.length);
            }}
        />
    );
}

/**
 * While a background run works out the range, `busy` marks the drawing busy and
 * makes it a polite live region, so the finished range is announced once it
 * settles. Pass it for the whole life of the row rather than only while the run
 * is in flight: a live region has to exist before the change it announces.
 *
 * Press the row to watch a run finish.
 */
export const StillComputing: Story = {
    render: (): React.JSX.Element => <ComputedRange />,
};

/**
 * A ramp whose range is filled in by a background run.
 * @returns A ramp row that starts busy and settles when the run finishes
 */
function ComputedRange(): React.JSX.Element {
    const [range, setRange] = useState<{ low: string; high: string } | undefined>(undefined);

    return (
        <Stack gap="xs">
            <RampRow
                label="Node color by betweenness"
                min={range?.low ?? "--"}
                max={range?.high ?? "--"}
                variant="color"
                gradient={BETWEENNESS_GRADIENT}
                scale="linear"
                busy={range === undefined}
            />
            <Button
                size="compact-xs"
                variant="default"
                onClick={() => {
                    setRange(range === undefined ? { low: "0.00", high: "0.42" } : undefined);
                }}
            >
                {range === undefined ? "Finish the run" : "Run again"}
            </Button>
        </Stack>
    );
}

/**
 * The same two ramps with the text running right to left.
 *
 * The two values swap ends, and the drawing turns round to follow them: the
 * wedge still grows towards the high value and the gradient still runs from the
 * low value to the high one. A `clip-path` polygon and a caller's own gradient
 * string cannot be written in logical terms, so the drawing is mirrored as a
 * whole -- which is why a gradient is always written as though text ran left to
 * right.
 *
 * The values themselves are never mirrored, only the picture between them.
 *
 * The copy is left in English on purpose: it makes the mirroring easy to see
 * without knowing the script.
 */
export const RightToLeft: Story = {
    render: (): React.JSX.Element => (
        <Stack gap="lg">
            <Stack gap={0}>
                <Text size="xs" c={PANEL_INK.CHROME}>
                    Left to right
                </Text>
                <RampRow label="Node size by age" min="45" max="68" scale="sqrt" onScaleClick={fn()} />
                <RampRow
                    label="Node color by betweenness"
                    min="0.00"
                    max="0.42"
                    variant="color"
                    gradient={BETWEENNESS_GRADIENT}
                    scale="linear"
                    onScaleClick={fn()}
                />
            </Stack>

            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <Box dir="rtl">
                    <Stack gap={0}>
                        <Text size="xs" c={PANEL_INK.CHROME}>
                            Right to left
                        </Text>
                        <RampRow label="Node size by age" min="45" max="68" scale="sqrt" onScaleClick={fn()} />
                        <RampRow
                            label="Node color by betweenness"
                            min="0.00"
                            max="0.42"
                            variant="color"
                            gradient={BETWEENNESS_GRADIENT}
                            scale="linear"
                            onScaleClick={fn()}
                        />
                    </Stack>
                </Box>
            </DirectionProvider>
        </Stack>
    ),
};

/**
 * The transform's word translated. It is never drawn on the row -- it is the
 * curve's tooltip, the button's accessible name, and the last part of the whole
 * row's accessible name -- so translating it changes what a screen reader says
 * and what a pointer reveals, and changes nothing that is drawn.
 *
 * Hover the curve, or read the row with a screen reader, to hear the difference.
 */
export const Translated: Story = {
    render: (): React.JSX.Element => (
        <LabelsProvider
            locale="fr-FR"
            labels={{
                scaleSqrt: "Echelle racine carree",
                scaleLinear: "Echelle lineaire",
                scaleLog: "Echelle logarithmique",
            }}
        >
            <Stack gap={0}>
                <RampRow label="Taille des noeuds par age" min="45" max="68" scale="sqrt" onScaleClick={fn()} />
                <RampRow label="Largeur des liens par poids" min="2" max="9" scale="linear" onScaleClick={fn()} />
                <RampRow label="Taille des noeuds par ponts" min="1" max="47" scale="log" onScaleClick={fn()} />
            </Stack>
        </LabelsProvider>
    ),
};

/**
 * Three ramps on the 32px row pitch: how size, colour and width are each mapped
 * from the cat network's own values, in three rows and no sentences.
 */
export const InAPanel: Story = {
    render: (): React.JSX.Element => (
        <Stack gap={0}>
            <RampRow label="Node size by age" min="45" max="68" scale="sqrt" onScaleClick={fn()} />
            <RampRow
                label="Node color by betweenness"
                min="0.00"
                max="0.42"
                variant="color"
                gradient={BETWEENNESS_GRADIENT}
                scale="linear"
                onScaleClick={fn()}
            />
            <RampRow label="Edge width by bridges" min="1" max="47" scale="log" onScaleClick={fn()} />
        </Stack>
    ),
};
