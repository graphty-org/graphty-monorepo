import { AlphaSlider, ColorSwatch, Group, HueSlider, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { ColorPickerPanel } from "../../../src/components/color/ColorPickerPanel";
import { GradientEditor } from "../../../src/components/GradientEditor";
import { PopoutManager } from "../../../src/components/popout";
import { SWATCH_COLORS_HEXA } from "../../../src/constants/colors";
import { createColorStop } from "../../../src/utils/color-stops";
import { ForceState, StateCell } from "./ForceState";

/**
 * Figma's colour picker body (design/figma-spec.md 7.3), the chit (7.1) and the colour sliders
 * (7.4). ColorPickerPanel is the content of a 240-wide light popover: CompactColorInput opens it
 * from its chit inside a `Popout.Panel`, which adds the header and the close button. Here it is
 * drawn on a popover-coloured card so every part can be compared with Figma's captures.
 */
const meta: Meta<typeof ColorPickerPanel> = {
    title: "Figma/Colour/ColorPickerPanel",
    component: ColorPickerPanel,
    parameters: { layout: "padded" },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Story />
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof ColorPickerPanel>;

/**
 * A 240-wide card with the popover's surface.
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
 * The picker driven from the story's own state.
 * @param props - Component props
 * @param props.initial - the starting colour
 * @param props.withAlpha - offer opacity
 * @param props.defaultFormat - the value row's first format
 * @returns the picker on a card
 */
function Live({
    initial = "#3373E5FF",
    withAlpha = true,
    defaultFormat,
}: {
    initial?: string;
    withAlpha?: boolean;
    defaultFormat?: "hex" | "rgb" | "hsl" | "hsb";
}): React.JSX.Element {
    const [value, setValue] = useState(initial);
    return (
        <Card>
            <ColorPickerPanel
                value={value}
                onChange={setValue}
                withAlpha={withAlpha}
                defaultFormat={defaultFormat}
                swatches={SWATCH_COLORS_HEXA}
            />
        </Card>
    );
}

/**
 * Every state side by side: the solid picker as Figma draws it, a keyboard-focused slider and
 * saturation reticle (forced), no opacity, the RGB format, and the paint-type bar with Gradient
 * selected. Switch the toolbar's theme for dark.
 */
export const States: Story = {
    render: function StatesStory() {
        const [paintType, setPaintType] = useState<"solid" | "gradient">("gradient");
        return (
            <Group align="flex-start" gap={24}>
                <StateCell label="Solid, rest">
                    <Live />
                </StateCell>
                <StateCell label="Hue slider focused">
                    <ForceState state="focus" selector=".cm-color-slider">
                        <Live />
                    </ForceState>
                </StateCell>
                <StateCell label="Reticle focused, joined field focused">
                    <ForceState state="focus" selector=".cm-color-saturation">
                        <ForceState state="focus" selector=".cm-joined-field">
                            <Live />
                        </ForceState>
                    </ForceState>
                </StateCell>
                <StateCell label="Without opacity, RGB">
                    <Live withAlpha={false} defaultFormat="rgb" />
                </StateCell>
                <StateCell label="Paint types, gradient">
                    <Card>
                        <ColorPickerPanel
                            value="#FF4D4DFF"
                            onChange={() => undefined}
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
 * The keyboard: the play function focuses the hue slider and moves it 10 degrees with
 * Shift+ArrowRight, then sends the opacity to 0 with Home.
 */
export const Keyboard: Story = {
    render: () => <Live initial="#FF0000FF" />,
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

/**
 * Mantine's own ColorSwatch, HueSlider and AlphaSlider under the theme: the 16px picker chit
 * (radius 20%, a ring on near-white, a checkerboard half on translucent colours), the 14px
 * in-field chit (`variant="field"`), and the sliders' 172 x 16 tracks with the 16px thumb.
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
