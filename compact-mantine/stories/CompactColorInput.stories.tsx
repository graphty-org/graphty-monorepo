import { Box, DirectionProvider, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import {
    CompactColorInput,
    LabelsProvider,
    PopoutManager,
} from "../src";
// Imported from "../src", the package's published entry point, so the stories
// exercise exactly what a consumer gets from `@graphty/compact-mantine` rather
// than reaching past it into the source tree.

/**
 * A colour swatch, a hex box and an optional opacity box, joined into one 24px
 * control for a dense property panel.
 *
 * **What it is for.** One field that answers "what colour, and how solid".
 * Pressing the swatch opens a picker in a pop-out; the hex box takes a typed
 * `RRGGBB`; the opacity box takes a percentage. The three describe one thing,
 * so they are drawn as a single run with only its outer ends rounded.
 *
 * **The idea that makes it different.** `undefined` means "the reader has
 * chosen nothing here", not "empty". While nothing has been chosen the control
 * shows the default in italics and offers no reset; as soon as something is
 * set, the text turns upright and a reset button appears. Pressing that reset
 * reports `undefined` again. A panel of these reads at a glance as a list of
 * what has been customised and what has not.
 *
 * **Reach for it when** a colour has a sensible default that the reader is
 * overriding rather than filling in. For an ordinary colour field in a form,
 * Mantine's own `ColorInput` is the simpler choice.
 *
 * **What it needs.** A `PopoutManager` somewhere above it, which owns the
 * floating layer the picker opens into.
 *
 * **Accessibility.** The three controls sit in a group named by the field's own
 * label, so a screen reader announces the field once on entry and each control
 * then says only which part of the colour it holds. The swatch is a real
 * button carrying `aria-haspopup="dialog"` and `aria-expanded`.
 *
 * **Translation.** Every name it speaks -- the swatch, the hex box, the opacity
 * box, the picker's title and the reset -- comes from `LabelsProvider` and can
 * be replaced. Numbers typed into the opacity box are read in the reader's own
 * locale, so a comma decimal separator works.
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
                <Box w={280} p="md" bg="var(--mantine-color-body)">
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
 * Without the opacity box, for a colour that is always solid. The run then
 * closes at the hex box, which takes the rounded end.
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
 * Laid out right to left. The joined run is drawn in the other order, and
 * because its corners are written as logical ones the rounded ends stay on the
 * outside rather than landing in the middle.
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
