import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { CompactColorInput, LabelsProvider, PopoutManager } from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.
import { ForceState, StateCell } from "./figma/color/ForceState";

/**
 * Figma's paint field: one 24px field holding a colour chit, the hex value and the opacity.
 *
 * **What it is for.** One field that answers "what colour, and how solid". Pressing the 14px
 * chit opens the colour picker in a pop-out docked to the panel's start side; the hex box takes
 * a typed `RRGGBB` (or `RGB`), committed on blur or Enter and reverted on Escape; the opacity box
 * holds the number and a "%" that scrubs: drag it sideways, half a percent per pixel. ArrowUp and
 * ArrowDown step the opacity by 1 (Shift for 10).
 *
 * **The idea that makes it different.** `undefined` means "the reader has chosen nothing here",
 * not "empty". While nothing has been chosen the control shows the default in italics and
 * offers no reset; as soon as something is set, the text turns upright and a reset button
 * appears in the trailing slot. Pressing that reset reports `undefined` again.
 *
 * **Size.** 184 wide by default (the panel's body column); pass `width={156}` beside a row's
 * own eye and minus buttons, as Figma's Fill row does.
 *
 * **What it needs.** A `PopoutManager` somewhere above it, which owns the floating layer the
 * picker opens into.
 *
 * **Accessibility.** The three controls sit in a group named by the field's own label. The chit
 * is a real button carrying `aria-haspopup="dialog"` and `aria-expanded`.
 *
 * **Translation.** Every name it speaks comes from `LabelsProvider`; typed opacity is read in the
 * reader's own locale, so a comma decimal separator works.
 */
const meta: Meta<typeof CompactColorInput> = {
    title: "Editing a Value/CompactColorInput",
    component: CompactColorInput,
    tags: ["autodocs"],
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

/**
 * Nothing has been chosen, so the colour and the opacity are drawn in italics
 * and there is no reset button.
 */
export const Default: Story = {
    args: {
        defaultColor: "#5B8FF9",
        defaultOpacity: 100,
    },
};

/**
 * With a label above it. The label also names the group the three controls sit
 * in, so a screen reader reads it once on entry.
 */
export const WithLabel: Story = {
    args: {
        label: "Fur Color",
        defaultColor: "#5B8FF9",
        defaultOpacity: 100,
    },
};

/**
 * Without the opacity box, for a colour that is always solid. The hex box then runs to the end
 * of the field.
 */
export const WithoutOpacity: Story = {
    args: {
        label: "Nose Boop",
        defaultColor: "#61D095",
        showOpacity: false,
    },
};

/**
 * Driven from the page's own state. `undefined` is the state that means "still
 * the default"; the reset button reports it back, which is how a caller learns
 * that the reader has taken their override away again.
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
 * Every name the control speaks comes from `LabelsProvider`, and the locale it
 * is given decides how numbers are read and written. Here it is French: type
 * `12,5` into the opacity box and it is understood as twelve and a half.
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

/**
 * Laid out right to left: the chit sits at the field's start, which is now its right edge.
 */
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

/**
 * Every state of Figma's paint field side by side (design/figma-spec.md 7.2): rest, the default
 * in italics, hover and focus (forced, since a story cannot hold the pointer), a translucent
 * colour with the checkerboard half, a near-white colour with its ring, disabled, and without
 * opacity. Switch the toolbar's theme for dark and its contrast for the WCAG AA edge.
 */
export const States: Story = {
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

/**
 * The picker, opened from the chit: the play function presses it, then nudges the opacity with
 * the keyboard.
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
        const opacity = canvas.getByRole("textbox", { name: /opacity/i });
        await userEvent.click(opacity);
        await userEvent.keyboard("{ArrowDown}");
        await expect(opacity).toHaveValue("99");
    },
};
