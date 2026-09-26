import { AlphaSlider, ColorSwatch, Group, HueSlider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { useEffect, useState } from "react";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.
import {
    ColorPickerPanel,
    type ColorPickerPanelProps,
    createColorStop,
    GradientEditor,
    SWATCH_COLORS_HEXA,
} from "../../../src";
import { ForceState, StateCell } from "../../helpers/force-state";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * The color picker body on its own: a saturation and brightness field, hue and opacity
 * sliders, the eyedropper, a format select with a joined value field, and a swatch set.
 *
 * ## When to use it
 *
 * | You need | Reach for |
 * |---|---|
 * | A color setting in a panel row | [CompactColorInput](?path=/docs/components-color-compactcolorinput--docs), which opens this picker from its chit |
 * | The picker on a surface of your own: your own pop-over, a toolbar, an inline editor | **ColorPickerPanel** |
 * | Solid or gradient paint in one picker | ColorPickerPanel with a [GradientEditor](?path=/docs/components-color-gradienteditor--docs) in its `gradient` slot |
 *
 * It draws no header and no close button. Put it inside a `Popout.Panel` (as CompactColorInput
 * does) for the header, Escape and one-pop-over-at-a-time, or on any 240-wide surface.
 *
 * With a `gradient` prop it adds a paint-type bar (Solid / Gradient) and shows that content
 * while Gradient is on. GradientEditor uses a ColorPickerPanel of its own, without that bar, for
 * the selected stop, so the nested case draws one paint-type bar.
 *
 * ## Usage
 *
 * ```tsx
 * import { ColorPickerPanel, Popout, SWATCH_COLORS_HEXA } from "@graphty/compact-mantine";
 *
 * <Popout.Panel width={240} header={{ variant: "title", title: "Fill" }}>
 *     <ColorPickerPanel
 *         value={fill}
 *         onChange={setFill}
 *         onChangeEnd={commitUndo}
 *         swatches={SWATCH_COLORS_HEXA}
 *     />
 * </Popout.Panel>
 * ```
 *
 * `onChange` fires live while dragging and once per typed commit, arrow key or swatch;
 * `onChangeEnd` fires once when a drag settles, so one drag can be one undo entry.
 *
 * ## Keyboard and accessibility
 *
 * - The saturation field is a `slider` ("Saturation and brightness"): arrows move the reticle 1%,
 *   Shift 10%.
 * - Hue and opacity are Mantine sliders: arrows step 1, Shift 10, Home / End go to the ends.
 * - The value box commits on Enter or blur and reverts on Escape; the format select offers Hex,
 *   RGB, HSL and HSB.
 * - Each swatch is a button named by its color string; the set is a group named "Swatches".
 * - The eyedropper appears only where the browser has the EyeDropper API (Chromium).
 * - Every name can be replaced through the `labels` prop.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Surface | 240 wide, 16px body padding |
 * | Paint-type bar | 41 tall, 24 x 24 segments 4 apart |
 * | Saturation field | 208 x 208, radius 5 |
 * | Hue and opacity sliders | 172 x 16 track, 16px thumb |
 * | Value row | 55 x 24 format select, 89 x 24 value, 54 x 24 opacity |
 * | Swatches | 16 x 16, radius 20%, on a 24px pitch |
 */
const meta: Meta<typeof ColorPickerPanel> = {
    title: "Components/Color/ColorPickerPanel",
    component: ColorPickerPanel,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ColorPickerPanel>;

/**
 * A 240-wide card with the pop-over's surface.
 * @param props - Component props
 * @param props.children - the picker
 * @returns the card
 */
function Card({ children }: { children: React.ReactNode }): React.JSX.Element {
    return (
        <div className="cm-popover-surface" style={{ width: 240, paddingBottom: 0 }}>
            {children}
        </div>
    );
}

/**
 * The picker driven from its own state, starting at `value` and following it when it changes.
 * @param props - ColorPickerPanel props; `value` is the starting color
 * @returns the picker on a card
 */
function Live({ value: initial, onChange, ...props }: ColorPickerPanelProps): React.JSX.Element {
    const [value, setValue] = useState(initial);
    useEffect(() => {
        setValue(initial);
    }, [initial]);
    return (
        <Card>
            <ColorPickerPanel
                {...props}
                value={value}
                onChange={(next) => {
                    setValue(next);
                    onChange(next);
                }}
            />
        </Card>
    );
}

/** The solid picker with the package's swatch set; the Controls table edits it. */
export const Default: Story = {
    args: {
        value: "#3373E5FF",
        onChange: fn(),
        onChangeEnd: fn(),
        withAlpha: true,
        defaultFormat: "hex",
        swatches: SWATCH_COLORS_HEXA,
    },
    render: (args) => <Live {...args} />,
};

/**
 * Every state, light and dark side by side: the solid picker at rest, a keyboard-focused
 * slider, a focused reticle and value field (forced), no opacity in RGB, and the paint-type bar
 * with Gradient selected.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: function StatesStory() {
        const [paintType, setPaintType] = useState<"solid" | "gradient">("gradient");
        const noop = (): void => undefined;
        return (
            <Group align="flex-start" gap={24}>
                <StateCell label="Solid, rest">
                    <Live value="#3373E5FF" onChange={noop} swatches={SWATCH_COLORS_HEXA} />
                </StateCell>
                <StateCell label="Hue slider focused">
                    <ForceState state="focus" selector=".cm-color-slider">
                        <Live value="#3373E5FF" onChange={noop} swatches={SWATCH_COLORS_HEXA} />
                    </ForceState>
                </StateCell>
                <StateCell label="Reticle focused, value field focused">
                    <ForceState state="focus" selector=".cm-color-saturation">
                        <ForceState state="focus" selector=".cm-joined-field">
                            <Live value="#3373E5FF" onChange={noop} swatches={SWATCH_COLORS_HEXA} />
                        </ForceState>
                    </ForceState>
                </StateCell>
                <StateCell label="Without opacity, RGB">
                    <Live
                        value="#3373E5FF"
                        onChange={noop}
                        swatches={SWATCH_COLORS_HEXA}
                        withAlpha={false}
                        defaultFormat="rgb"
                    />
                </StateCell>
                <StateCell label="Paint types, gradient">
                    <Card>
                        <ColorPickerPanel
                            value="#FF4D4DFF"
                            onChange={noop}
                            paintType={paintType}
                            onPaintTypeChange={setPaintType}
                            gradient={
                                <GradientEditor
                                    defaultStops={[createColorStop(0, "#FF4D4D"), createColorStop(1, "#4D4DFF")]}
                                />
                            }
                        />
                    </Card>
                </StateCell>
            </Group>
        );
    },
};

/**
 * Solid and gradient paint in one picker: the paint-type bar switches between the solid
 * controls and the GradientEditor passed as `gradient`.
 */
export const SolidOrGradient: Story = {
    render: function SolidOrGradientStory() {
        const [paintType, setPaintType] = useState<"solid" | "gradient">("solid");
        const [value, setValue] = useState("#3373E5FF");
        return (
            <Card>
                <ColorPickerPanel
                    value={value}
                    onChange={setValue}
                    swatches={SWATCH_COLORS_HEXA}
                    paintType={paintType}
                    onPaintTypeChange={setPaintType}
                    gradient={
                        <GradientEditor defaultStops={[createColorStop(0, "#6366F1"), createColorStop(1, "#06B6D4")]} />
                    }
                />
            </Card>
        );
    },
};

/**
 * Mantine's own ColorSwatch, HueSlider and AlphaSlider under the theme: the 16px picker chit
 * (a ring on near-white, a checkerboard half on translucent colors), the 14px in-field chit
 * (`variant="field"`), and the sliders' 172 x 16 tracks with the 16px thumb.
 */
export const MantineParts: Story = {
    render: function PartsStory() {
        const [hue, setHue] = useState(220);
        const [alpha, setAlpha] = useState(0.6);
        return (
            <Stack gap={16} className="cm-popover-surface" style={{ width: 240, padding: 16 }}>
                <Group gap={8}>
                    <ColorSwatch color="#3373E5" />
                    <ColorSwatch color="#FFFFFF" mod={{ light: true }} />
                    <ColorSwatch color="#3373E580" />
                    <ColorSwatch color="#3373E5" variant="field" />
                    <ColorSwatch color="#3373E580" variant="field" />
                </Group>
                <div style={{ width: 180 }}>
                    <HueSlider value={hue} onChange={setHue} aria-label="Hue" />
                </div>
                <div style={{ width: 180 }}>
                    <AlphaSlider
                        value={alpha}
                        onChange={setAlpha}
                        color="#3373E5"
                        thumbColor="#3373E5"
                        aria-label="Opacity"
                    />
                </div>
            </Stack>
        );
    },
};

/**
 * The keyboard: Shift+ArrowRight moves the hue slider 10 degrees, and Home sends the opacity to 0.
 */
export const Keyboard: Story = {
    render: () => <Live value="#FF0000FF" onChange={() => undefined} swatches={SWATCH_COLORS_HEXA} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const hue = canvas.getByRole("slider", { name: "Hue" });
        hue.focus();
        await userEvent.keyboard("{Shift>}{ArrowRight}{/Shift}");
        await expect(hue).toHaveAttribute("aria-valuenow", "10");
        canvas.getByRole("slider", { name: "Opacity" }).focus();
        await userEvent.keyboard("{Home}");
        await expect(canvas.getByRole("textbox", { name: "Opacity" })).toHaveValue("0");
    },
};
