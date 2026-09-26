import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

// Imported from "../../../src", the package's published entry point, so the stories exercise
// exactly what a consumer gets from `@graphty/compact-mantine`.
import { CompactColorInput, LabelsProvider, PopoutManager } from "../../../src";
import { ForceState, StateCell } from "../../helpers/force-state";
import { BOTH_SCHEMES } from "../../helpers/schemes";

/**
 * A colour and its opacity in one 24px panel field: a colour chit that opens a picker, the hex
 * value, and the opacity.
 *
 * ## When to use it
 *
 * | You need | Reach for |
 * |---|---|
 * | A colour setting in a panel row, with its picker a click away | **CompactColorInput** |
 * | The picker itself on a surface of your own (a toolbar pop-over, an inline editor) | [ColorPickerPanel](?path=/docs/components-colour-colorpickerpanel--docs) |
 * | Several colours at positions along a line | [GradientEditor](?path=/docs/components-colour-gradienteditor--docs) |
 *
 * CompactColorInput is ColorPickerPanel inside a pop-out, plus the field that opens it. Its one
 * idea beyond the field: `undefined` means "the reader has chosen nothing here". While nothing is
 * chosen the default is drawn in italics and there is no reset; once something is set the text
 * turns upright and a reset button appears in the trailing slot. The reset reports `undefined`.
 *
 * It needs a `PopoutManager` somewhere above it, which owns the floating layer the picker opens
 * into. Without one it throws on first render.
 *
 * ## Usage
 *
 * ```tsx
 * import { CompactColorInput, PopoutManager } from "@graphty/compact-mantine";
 *
 * const [color, setColor] = useState<string | undefined>();
 * const [opacity, setOpacity] = useState<number | undefined>();
 *
 * <PopoutManager>
 *     <CompactColorInput
 *         label="Fill"
 *         color={color}
 *         defaultColor="#5B8FF9"
 *         opacity={opacity}
 *         defaultOpacity={100}
 *         onColorChange={setColor}
 *         onOpacityChange={setOpacity}
 *     />
 * </PopoutManager>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - The chit is a real button (`aria-haspopup="dialog"`, `aria-expanded`). Enter or Space opens
 *   the picker in a pop-out docked to the panel's start side; Escape closes it and focus returns
 *   to the chit.
 * - The hex box takes `RRGGBB` or `RGB`, committed on Enter or blur; anything else reverts, and
 *   Escape reverts.
 * - The opacity box steps 1 with ArrowUp / ArrowDown (Shift for 10). Dragging the "%" sideways
 *   scrubs it, half a percent per pixel.
 * - The three controls sit in a group named by `label`, so a screen reader reads the label once
 *   on entry. Every other name ("Color swatch", "Color hex value", "Opacity", the reset) comes
 *   from `LabelsProvider`; typed opacity is read in the reader's locale.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | 184 x 24 (the panel's body column); `width={156}` beside a row's own buttons |
 * | Radius | 5px |
 * | Chit | 14 x 14 at x+5, radius 2 |
 * | Hex box | 77 x 24 from x+24, 11px upper case |
 * | Opacity box | 54 x 24 after a 1px seam, "%" is a 14 x 24 scrub handle |
 */
const meta: Meta<typeof CompactColorInput> = {
    title: "Components/Colour/CompactColorInput",
    component: CompactColorInput,
    parameters: {
        layout: "padded",
    },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Box w={240} py={16} pl={16} pr={8} bg="var(--cm-bg)">
                    <Story />
                </Box>
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof CompactColorInput>;

/** Nothing has been chosen, so the colour and the opacity are drawn in italics and there is no reset. */
export const Default: Story = {
    args: {
        defaultColor: "#5B8FF9",
        defaultOpacity: 100,
    },
};

/**
 * Every state, light and dark side by side: rest, the default in italics, hover, focus and
 * picker open (forced, since a story cannot hold the pointer), a translucent colour with the
 * checkerboard half, a near-white colour with its ring, disabled, and without opacity.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: function StatesStory() {
        return (
            <Stack gap={12}>
                <StateCell label="Rest">
                    <CompactColorInput color="#3373E5" opacity={100} defaultColor="#000000" width={156} />
                </StateCell>
                <StateCell label="Default (nothing chosen)">
                    <CompactColorInput defaultColor="#3373E5" width={156} />
                </StateCell>
                <StateCell label="Hover">
                    <ForceState state="hover" selector=".cm-paint-field">
                        <CompactColorInput color="#3373E5" opacity={100} defaultColor="#000000" width={156} />
                    </ForceState>
                </StateCell>
                <StateCell label="Focus">
                    <ForceState state="focus" selector=".cm-paint-field">
                        <CompactColorInput color="#3373E5" opacity={100} defaultColor="#000000" width={156} />
                    </ForceState>
                </StateCell>
                <StateCell label="Picker open">
                    <ForceState state="open" selector=".cm-paint-field">
                        <CompactColorInput color="#3373E5" opacity={100} defaultColor="#000000" width={156} />
                    </ForceState>
                </StateCell>
                <StateCell label="Translucent (50%)">
                    <CompactColorInput color="#3373E5" opacity={50} defaultColor="#000000" width={156} />
                </StateCell>
                <StateCell label="Near-white">
                    <CompactColorInput color="#FFFFFF" opacity={100} defaultColor="#000000" width={156} />
                </StateCell>
                <StateCell label="Disabled">
                    <CompactColorInput
                        color="#3373E5"
                        opacity={100}
                        defaultColor="#000000"
                        width={156}
                        disabled
                        disabledReason="Load data first"
                    />
                </StateCell>
                <StateCell label="Without opacity, 184 wide">
                    <CompactColorInput color="#3373E5" defaultColor="#000000" showOpacity={false} />
                </StateCell>
            </Stack>
        );
    },
};

/** With a label above it; the label also names the group the three controls sit in. */
export const WithLabel: Story = {
    args: {
        label: "Fur Color",
        defaultColor: "#5B8FF9",
        defaultOpacity: 100,
    },
};

/** Without the opacity box, for a colour that is always solid: the hex box runs to the end of the field. */
export const WithoutOpacity: Story = {
    args: {
        label: "Nose Boop",
        defaultColor: "#61D095",
        showOpacity: false,
    },
};

/**
 * Driven from the page's own state. `undefined` means "still the default"; the reset button
 * reports it back, which is how a caller learns the reader has taken their override away.
 */
export const Controlled: Story = {
    render: function ControlledStory() {
        const [color, setColor] = useState<string | undefined>(undefined);
        const [opacity, setOpacity] = useState<number | undefined>(undefined);

        return (
            <Stack gap="xs">
                <CompactColorInput
                    label="Fur Color"
                    color={color}
                    defaultColor="#5B8FF9"
                    opacity={opacity}
                    defaultOpacity={100}
                    onColorChange={setColor}
                    onOpacityChange={setOpacity}
                />
                <Text size="xs" c="dimmed">
                    {`color: ${color ?? "undefined (using the default)"}`}
                </Text>
                <Text size="xs" c="dimmed">
                    {`opacity: ${opacity === undefined ? "undefined (using the default)" : opacity}`}
                </Text>
            </Stack>
        );
    },
};

/**
 * The picker, opened from the chit, with its opacity nudged down one from the keyboard.
 */
export const PickerOpen: Story = {
    args: {
        label: "Fill",
        defaultColor: "#3373E5",
        defaultOpacity: 100,
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: /swatch/i }));
        // The row and the picker both have an Opacity box: this story drives the picker's.
        const opacity = within(await canvas.findByRole("dialog")).getByRole("textbox", { name: /opacity/i });
        await userEvent.click(opacity);
        await userEvent.keyboard("{ArrowDown}");
        await expect(opacity).toHaveValue("99");
    },
};

/**
 * Every name comes from `LabelsProvider`, and its locale decides how numbers are read: here it is
 * French, so `12,5` typed into the opacity box is twelve and a half.
 */
export const Translated: Story = {
    render: function TranslatedStory() {
        return (
            <LabelsProvider
                locale="fr-FR"
                labels={{
                    colorSwatch: "Nuancier",
                    colorHexValue: "Valeur hexadecimale",
                    opacity: "Opacite",
                    colorPanelTitle: "Couleur",
                    colorGenericName: "couleur",
                    resetToDefault: (label) => `Retablir ${label}`,
                }}
            >
                <CompactColorInput label="Couleur de fond" defaultColor="#5B8FF9" defaultOpacity={100} />
            </LabelsProvider>
        );
    },
};

/** Laid out right to left: the chit sits at the field's start, which is now its right edge. */
export const RightToLeft: Story = {
    render: function RightToLeftStory() {
        return (
            <DirectionProvider initialDirection="rtl" detectDirection={false}>
                <div dir="rtl">
                    <CompactColorInput label="Fill Color" defaultColor="#5B8FF9" defaultOpacity={100} />
                </div>
            </DirectionProvider>
        );
    },
};
