import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.
import {
    FieldGlyph,
    PANEL_GRID,
    RampEditor,
    type RampEditorBin,
    type RampEditorHandle,
    type RampEditorPalette,
} from "../../../src";

/**
 * An editor for a mapping from a number to a look, drawn on the number's own axis: the values'
 * histogram with each bar painted what its values get, handles under the bars for the ramp's two
 * ends (and a diverging ramp's midpoint), clamp brackets over the bars with each shaded tail
 * counted, a stepped ramp's cut lines, a scale select, a palette select with Reverse, a chit for
 * elements with no value, and typed fields for exact numbers.
 *
 * ## When to use it
 *
 * | You need | Reach for |
 * |---|---|
 * | To edit how a number maps to a color or a size, seeing the data | **RampEditor** |
 * | A picture of a mapping, not an editor | [RampRow](?path=/docs/components-color-ramprow--docs) |
 * | Several colors at positions along a line, with no data under them | [GradientEditor](?path=/docs/components-color-gradienteditor--docs) |
 *
 * It computes nothing about the mapping. Pass it the bins, what each paints, the counts and the
 * step bounds of the thing that will paint (graphty-element's `styles.preview` gives all of them),
 * and it reports what the reader picks. A dragged or arrowed handle lands on an edge between two
 * bins; Home and End reach the data's ends; `describe` gives each handle's value in your words.
 *
 * ## Usage
 *
 * ```tsx
 * <RampEditor
 *     label="Node color by degree"
 *     bins={bins}
 *     domain={domain}
 *     onDomainChange={setDomain}
 *     describe={(handle, value) => `${handle === "domainLow" ? "Lowest" : "Highest"} color at degree ${value}`}
 * />
 * ```
 */
const meta: Meta<typeof RampEditor> = {
    title: "Components/Color/RampEditor",
    component: RampEditor,
    parameters: { layout: "padded" },
    decorators: [
        (Story): React.JSX.Element => (
            <Box w={PANEL_GRID.WIDTH} bg="var(--cm-bg)" style={{ paddingInline: "16px 8px" }}>
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof RampEditor>;

/** A degree distribution: many low-degree nodes, a long tail of hubs. */
const COUNTS = [42, 31, 22, 15, 11, 8, 5, 4, 2, 2, 1, 1];

const VIRIDIS = ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"];
const MAGMA = ["#000004", "#51127c", "#b73779", "#fc8961", "#fcfdbf"];
const DIVERGING = ["#2166ac", "#92c5de", "#f7f7f7", "#f4a582", "#b2182b"];

const PALETTES: RampEditorPalette[] = [
    { value: "viridis", label: "Viridis (colorblind safe)", stops: VIRIDIS },
    { value: "magma", label: "Magma (colorblind safe)", stops: MAGMA },
    { value: "redBlue", label: "Red to blue", stops: DIVERGING },
];

/**
 * A color along a palette, for the story's stand-in paints (a real caller takes them from the
 * thing that paints).
 * @param stops - the palette
 * @param at - 0 to 1
 * @returns a color
 */
function along(stops: string[], at: number): string {
    return stops[Math.min(stops.length - 1, Math.round(at * (stops.length - 1)))];
}

/**
 * The degree bins, painted from a palette between a domain's ends.
 * @param stops - the palette
 * @param domain - the ramp's ends
 * @returns the bins
 */
function degreeBins(stops: string[], domain: [number, number]): RampEditorBin[] {
    return COUNTS.map((count, i) => {
        const middle = i + 0.5;
        const at = Math.min(1, Math.max(0, (middle - domain[0]) / (domain[1] - domain[0])));
        return {
            from: i,
            to: i + 1,
            count,
            paint: along(stops, at),
            label: `Degree ${String(i)}: ${String(count)} nodes`,
        };
    });
}

const SCALES = [
    { value: "linear", label: "Linear", glyph: <FieldGlyph name="scaleLinear" /> },
    { value: "log", label: "Log", glyph: <FieldGlyph name="scaleLog" /> },
    { value: "sqrt", label: "Square root", glyph: <FieldGlyph name="scaleSqrt" /> },
];

const WORDS: Record<RampEditorHandle, string> = {
    domainLow: "Lowest color at degree",
    domainHigh: "Highest color at degree",
    midpoint: "Middle color at degree",
    clampLow: "Clamp below degree",
    clampHigh: "Clamp above degree",
};

/**
 * The editor with its state held as a caller holds it.
 * @param props - Component props
 * @param props.diverging - start on the diverging palette with a midpoint
 * @returns the story
 */
function Live({ diverging = false }: { diverging?: boolean }): React.JSX.Element {
    const [domain, setDomain] = useState<[number, number]>([1, 9]);
    const [clamp, setClamp] = useState<[number, number]>([1, 10]);
    const [midpoint, setMidpoint] = useState(4);
    const [scale, setScale] = useState<string | undefined>(undefined);
    const [palette, setPalette] = useState<string | undefined>(diverging ? "redBlue" : undefined);
    const [reverse, setReverse] = useState(false);
    const [paintNoValue, setPaintNoValue] = useState(false);
    const stops = PALETTES.find((option) => option.value === (palette ?? "viridis"))?.stops ?? VIRIDIS;
    const shown = reverse ? [...stops].reverse() : stops;
    const below = COUNTS.slice(0, clamp[0]).reduce((sum, count) => sum + count, 0);
    const above = COUNTS.slice(clamp[1]).reduce((sum, count) => sum + count, 0);

    return (
        <RampEditor
            label="Node color by degree"
            bins={degreeBins(shown, domain)}
            domain={domain}
            onDomainChange={setDomain}
            midpoint={diverging ? midpoint : undefined}
            onMidpointChange={setMidpoint}
            clamp={{ low: clamp[0], high: clamp[1], below, above }}
            onClampChange={setClamp}
            steps={scale === undefined || scale === "linear" ? [] : [3, 6]}
            describe={(handle, value) => `${WORDS[handle]} ${String(value)}`}
            scale={scale}
            defaultScale="linear"
            scales={SCALES}
            onScaleChange={setScale}
            palette={palette}
            defaultPalette="viridis"
            palettes={PALETTES}
            onPaletteChange={setPalette}
            reverse={reverse}
            onReverseChange={setReverse}
            noValue={{ count: 3, paint: paintNoValue ? "#9e9e9e" : null }}
            onNoValueChange={setPaintNoValue}
        />
    );
}

/** A sequential ramp over a degree histogram, clamped, with 3 nodes that have no degree. */
export const Default: Story = {
    render: () => <Live />,
};

/** A diverging palette adds a midpoint handle and its typed field. */
export const Diverging: Story = {
    render: () => <Live diverging />,
};

/**
 * The ramp's lower end moved one bin with the arrow key: the handle, the typed field and the bars'
 * paint all follow.
 */
export const KeyboardStep: Story = {
    render: () => <Live />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const handle = canvas.getByRole("slider", { name: "Ramp start" });
        await userEvent.click(handle);
        await userEvent.keyboard("{ArrowRight}");
        await expect(handle).toHaveAttribute("aria-valuetext", "Lowest color at degree 2");
        await expect(canvas.getByRole("textbox", { name: "Starts at" })).toHaveValue("2");
    },
};
