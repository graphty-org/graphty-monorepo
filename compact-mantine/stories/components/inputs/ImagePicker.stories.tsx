import { Box, Button } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { FieldRow, PanelLabelsProvider, PopoutManager } from "../../../src";
import { ImagePicker, type ImagePickerItem, type ImagePickerProps } from "../../../src/components/inputs/ImagePicker";

/**
 * A field that picks an image: the picked image's thumbnail and name, opening a pop-out with the
 * images offered as tiles, "None", and a loader for a file, a drop or an address.
 *
 * ## When to use it
 *
 * Wherever a reader picks a picture (a node's image, a background). compact-mantine keeps no
 * images: the caller adds what `onFiles` and `onUrl` report, passes them back in `images` and
 * owns every `src`. It needs a `PopoutManager` above it.
 *
 * ## Usage
 *
 * ```tsx
 * const [images, setImages] = useState<ImagePickerItem[]>([]);
 * const [picked, setPicked] = useState<string | null>(null);
 * <ImagePicker label="Picture" value={picked} images={images} onChange={setPicked}
 *     onFiles={(files) => {
 *         const added = files.map((f) => ({ id: f.name, name: f.name, src: URL.createObjectURL(f) }));
 *         setImages((all) => [...added, ...all]);
 *         setPicked(added[0].id);
 *     }} />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - The field opens the pop-out on a click, Enter or Space; its name is "<label>, <picked name>".
 * - The tiles ("None" included) are one group named "In this project" and one Tab stop; the
 *   arrows, Home and End walk them; Enter or Space picks, closes the pop-out and returns focus to
 *   the field. Escape closes it.
 * - Files and addresses do not close it: the caller decides what was added.
 * - Thumbnails are decoration; the tile's name is its accessible name.
 * - The label is drawn above the field by `FieldRow` with labels on, never beside it.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Field | a 24px select field filling its slot, 16px thumbnail in the glyph slot |
 * | Pop-out | 240 wide |
 * | Tile | 24px tall, 16px thumbnail, 4px gap, radius 5px |
 */
const meta: Meta<typeof ImagePicker> = {
    title: "Components/Inputs/ImagePicker",
    component: ImagePicker,
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
type Story = StoryObj<typeof ImagePicker>;

/**
 * A small square picture as a data URL.
 * @param fill - its color
 * @returns the data URL
 */
function square(fill: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="${fill}"/><circle cx="8" cy="8" r="4" fill="white"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const IMAGES: ImagePickerItem[] = [
    { id: "sunset", name: "sunset.png", src: square("#E8743B") },
    { id: "forest", name: "forest.jpg", src: square("#2E8B57") },
    { id: "ocean", name: "a very long picture name that does not fit.png", src: square("#1F6FB2") },
    { id: "logo", name: "logo.svg" },
];

/**
 * The picker with its own state, adding chosen or dropped files.
 * @param props - the picker's props, `value` and `images` taking the starting state
 * @returns the picker
 */
function Stateful(props: Partial<ImagePickerProps>): React.JSX.Element {
    const [images, setImages] = useState<readonly ImagePickerItem[]>(props.images ?? []);
    const [picked, setPicked] = useState<string | null>(props.value ?? null);
    return (
        <ImagePicker
            label="Picture"
            onFiles={(files) => {
                const added = files.map((f) => ({ id: f.name, name: f.name }));
                setImages((all) => [...added, ...all]);
                setPicked(added[0].id);
            }}
            onUrl={setPicked}
            {...props}
            images={images}
            value={picked}
            onChange={setPicked}
        />
    );
}

/** No images yet: "None" and the loader. */
export const Empty: Story = { render: () => <Stateful /> };

/** Four images, one picked. */
export const WithImages: Story = { render: () => <Stateful images={IMAGES} value="forest" /> };

/** A load is running: the bar shows and the loader is off. */
export const Busy: Story = { render: () => <Stateful images={IMAGES} busy /> };

/** The last load failed. */
export const WithError: Story = {
    render: () => <Stateful images={IMAGES} error="Not a picture: this file is a 3D model" />,
};

/** Caller content under the loader. */
export const WithFooter: Story = {
    render: () => (
        <Stateful
            images={IMAGES}
            footer={
                <Button size="compact-xs" variant="default">
                    Use as model
                </Button>
            }
        />
    ),
};

/** The value is an address the caller keeps, named by `valueName`. */
export const AddressValue: Story = {
    render: () => <Stateful images={IMAGES} value="https://example.com/pictures/cat.png" valueName="cat.png" />,
};

/** In a FieldRow with labels on: the caption is drawn above the field. */
export const InFieldRow: Story = {
    render: () => (
        <PanelLabelsProvider showLabels>
            <FieldRow>
                <Stateful label="Node picture" images={IMAGES} value="sunset" />
            </FieldRow>
        </PanelLabelsProvider>
    ),
};

/** Off, with its reason. */
export const Disabled: Story = {
    render: () => <Stateful images={IMAGES} value="sunset" disabled disabledReason="Choose a shape first" />,
};
