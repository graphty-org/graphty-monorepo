import { Box, Button, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import React, { useState } from "react";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.
import { AdvancedButton, LabelsProvider, PANEL_GRID, PANEL_INK, RampRow } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { StoryState, StoryStates } from "../../helpers/story-panel";

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
 * A 32px row that draws a mapping from a value to a size or a colour: the two ends of the
 * range, the picture between them, and the transform's curve.
 *
 * ## When to use it
 *
 * One RampRow says what "Age 45 to 68 maps to sizes 1.0 to 2.0, square root scale" says, in one
 * row and no sentence. Put it directly under the control that binds the value, so the ramp reads
 * as the picture of what that control just said.
 *
 * | You need | Reach for |
 * |---|---|
 * | The picture of a continuous mapping to size (`variant="size"`) or colour (`variant="color"`) | **RampRow** |
 * | To edit the colours of that mapping | [GradientEditor](?path=/docs/components-colour-gradienteditor--docs) |
 * | A series of values, not two ends | HistogramRow or SparklineRow (Data display) |
 *
 * It is a picture, not a control. The curve at the end can open a chooser (`onScaleClick`), and
 * anything more belongs behind an `AdvancedButton` in the `trailing` slot. Never add a caption
 * above it or a reading below it: those are the lines the row exists to save.
 *
 * ## Usage
 *
 * ```tsx
 * import { RampRow } from "@graphty/compact-mantine";
 *
 * <RampRow label="Node size by age" min="45" max="68" scale="sqrt" />
 * <RampRow
 *     label="Node color by betweenness"
 *     min="0.00"
 *     max="0.42"
 *     variant="color"
 *     gradient="linear-gradient(to right, #fde725, #21918c, #440154)"
 *     scale="linear"
 * />
 * ```
 *
 * Format the two values for the reader's locale before passing them in (`useNumberFormatter`
 * does that). Write a `gradient` as though text ran left to right: in a right-to-left layout the
 * values swap ends and the whole drawing is mirrored to follow them.
 *
 * ## Keyboard and accessibility
 *
 * - The row is one `img` whose name is composed from `label`, the two values and the
 *   transform's word: "Node size by age 45 68 Square root scale". Supply `label` on every ramp;
 *   without it a screen reader hears two bare numbers.
 * - With `onScaleClick` the curve is a real 24 x 24 button: Tab reaches it, Enter or Space
 *   activates it, and the handler gets the event.
 * - `busy` makes the drawing a polite live region, so a range filled in by a background run is
 *   announced once when it settles. Pass it for the whole life of the row.
 * - The transform's words come from `LabelsProvider`.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Row | 32 tall on the 240 panel grid, 16 / 8 inline padding |
 * | Values | 11/16, weight 450, secondary text ink |
 * | Drawing | 12 tall; the size wedge in the secondary icon ink |
 * | Curve or trailing slot | 24 x 24 |
 */
const meta: Meta<typeof RampRow> = {
    title: "Components/Colour/RampRow",
    component: RampRow,
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
        // Every story sits in a 240px panel on the panel ground; States lays out
        // several panels side by side, so it brings its own.
        (Story, context): React.JSX.Element =>
            context.name === "States" ? (
                <Story />
            ) : (
                <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" style={{ paddingInline: "16px 8px" }}>
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
 * Every form, light and dark side by side: the size wedge, the colour bar with the default and
 * with a caller's gradient, a trailing control in place of the curve, and a range still being
 * computed.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StoryStates>
            <StoryState name="Size" padded>
                <RampRow label="Node size by age" min="45" max="68" scale="sqrt" />
            </StoryState>
            <StoryState name="Colour, default gradient" padded>
                <RampRow label="Node color by degree" min="0" max="12" variant="color" scale="sqrt" />
            </StoryState>
            <StoryState name="Colour, caller's gradient" padded>
                <RampRow
                    label="Node color by betweenness"
                    min="0.00"
                    max="0.42"
                    variant="color"
                    gradient={BETWEENNESS_GRADIENT}
                    scale="linear"
                />
            </StoryState>
            <StoryState name="With a trailing control" padded>
                <RampRow label="Node size by age" min="45" max="68" trailing={<AdvancedButton label="Scale" />} />
            </StoryState>
            <StoryState name="Still computing (busy)" padded>
                <RampRow label="Node color by betweenness" min="--" max="--" variant="color" busy />
            </StoryState>
        </StoryStates>
    ),
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
