import { Box, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { CompactColorInput, FieldRow, PanelLabelsProvider, PopoutManager } from "../../../src";
// From its source file until the package entry exports it.
import { type ColorPalette, PaletteBrowser } from "../../../src/components/color/PaletteBrowser";

/**
 * An optional Palettes tab on the color picker: a list of named color sets beside the picker,
 * and choosing one loads its colors into the swatches under the picker.
 *
 * ## When to use it
 *
 * | You need | Reach for |
 * |---|---|
 * | A color field whose swatches the reader can swap for a known palette | **CompactColorInput** with `palettes` |
 * | The palette list on a surface of your own | **PaletteBrowser** |
 *
 * Without `palettes` CompactColorInput is unchanged: one title, no tabs.
 *
 * ## Usage
 *
 * ```tsx
 * <CompactColorInput label="Fill" color={fill} defaultColor="#5B8FF9" onColorChange={setFill}
 *     palettes={[{ id: "okabe", name: "Okabe Ito", colors: OKABE }]} />
 * ```
 *
 * Pass `onSwatchesChange` and give the colors back as `swatches` to keep the loaded set; without
 * it the field keeps them itself while it is mounted.
 *
 * ## Keyboard and accessibility
 *
 * - The pop-out's header is a tab strip (Custom, Palettes): the arrows move between the tabs.
 * - The palettes are one group with one Tab stop: ArrowUp / ArrowDown, Home / End move; Enter or
 *   Space picks. Each row is a toggle button named "Okabe Ito, 8 colors"; the one in force is
 *   pressed. The strip is decoration.
 * - From eight palettes a search box comes first; it matches the start of a word in the name.
 */
const meta: Meta<typeof CompactColorInput> = {
    title: "Components/Color/ColorPalettes",
    component: CompactColorInput,
    parameters: { layout: "padded" },
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

const THREE: ColorPalette[] = [
    {
        id: "okabe",
        name: "Okabe Ito",
        colors: ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#000000"],
    },
    { id: "warm", name: "Warm", colors: ["#7F0000", "#B30000", "#D7301F", "#EF6548", "#FC8D59", "#FDBB84"] },
    { id: "glass", name: "Glass", colors: ["#3373E580", "#E5737380", "#73E57380", "#FFFFFF80"] },
];

const TWELVE: ColorPalette[] = [
    ...THREE,
    { id: "blues", name: "Blues", colors: ["#DEEBF7", "#9ECAE1", "#4292C6", "#08519C"] },
    { id: "greens", name: "Greens", colors: ["#E5F5E0", "#A1D99B", "#41AB5D", "#006D2C"] },
    { id: "grays", name: "Grays", colors: ["#F0F0F0", "#BDBDBD", "#737373", "#252525"] },
    { id: "purples", name: "Purples", colors: ["#EFEDF5", "#BCBDDC", "#807DBA", "#54278F"] },
    { id: "earth", name: "Earth tones", colors: ["#8C510A", "#BF812D", "#DFC27D", "#80CDC1", "#35978F"] },
    { id: "pastel", name: "Pastel", colors: ["#FBB4AE", "#B3CDE3", "#CCEBC5", "#DECBE4", "#FED9A6"] },
    { id: "bold", name: "Bold primaries", colors: ["#E41A1C", "#377EB8", "#4DAF4A", "#984EA3"] },
    { id: "night", name: "Night sky", colors: ["#03045E", "#023E8A", "#0077B6", "#00B4D8"] },
    {
        id: "long",
        name: "A palette with a name too long for its row",
        colors: ["#1B9E77", "#D95F02", "#7570B3", "#E7298A", "#66A61E", "#E6AB02", "#A6761D", "#666666"],
    },
];

/** Three palettes: open the chit, then the Palettes tab. */
export const Default: Story = {
    render: function DefaultStory() {
        const [color, setColor] = useState<string | undefined>("#3373E5");
        return (
            <CompactColorInput
                label="Fill"
                color={color}
                defaultColor="#5B8FF9"
                onColorChange={setColor}
                palettes={THREE}
            />
        );
    },
};

/** Twelve palettes, so the search box is shown. */
export const ManyPalettes: Story = {
    render: function ManyStory() {
        return <CompactColorInput label="Fill" defaultColor="#5B8FF9" palettes={TWELVE} />;
    },
};

/** The caller keeps the swatches: `onSwatchesChange` stores them and passes them back. */
export const StoredByCaller: Story = {
    render: function StoredStory() {
        const [swatches, setSwatches] = useState<readonly string[]>(THREE[1].colors);
        return (
            <Stack gap={8}>
                <CompactColorInput
                    label="Fill"
                    defaultColor="#5B8FF9"
                    palettes={THREE}
                    swatches={swatches}
                    onSwatchesChange={setSwatches}
                />
                <Text size="xs" data-testid="stored-swatches">
                    {swatches.join(" ")}
                </Text>
            </Stack>
        );
    },
};

/** The palette list on its own, as a caller would place it on a surface of its own. */
export const BrowserAlone: Story = {
    render: function AloneStory() {
        const [picked, setPicked] = useState<string | null>("okabe");
        return (
            <PaletteBrowser
                palettes={TWELVE}
                value={picked}
                onPick={(palette) => {
                    setPicked(palette.id);
                }}
            />
        );
    },
};

/** In a FieldRow with labels on: the caption is drawn above the field. */
export const InFieldRow: Story = {
    render: function RowStory() {
        return (
            <PanelLabelsProvider showLabels>
                <FieldRow>
                    <CompactColorInput label="Fill" hideLabel width="100%" defaultColor="#5B8FF9" palettes={THREE} />
                </FieldRow>
            </PanelLabelsProvider>
        );
    },
};
