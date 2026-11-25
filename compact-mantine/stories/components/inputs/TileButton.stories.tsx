import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { TileButton } from "../../../src/components/inputs/TileButton";

/**
 * A picture tile: a picture with its name under it, lit on hover, ringed on focus and drawn chosen while picked.
 * It is ImagePicker's tile with the picture above the name.
 *
 * ## When to use it
 *
 * A gallery of things the reader picks by their picture: models, shaders, samples. Lay the tiles out in a grid;
 * the grid's keyboard walk is the caller's.
 *
 * ## Usage
 *
 * ```tsx
 * <TileButton name="Sunset" src={sunsetUrl} picked={value === "sunset"} onClick={() => setValue("sunset")} />
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - It is a button named by `name`; Enter or Space presses it.
 * - `picked` sets `aria-pressed`; leave it out for a tile that is never picked.
 * - The picture is decoration; with no `src` it draws `glyph`, or the picture glyph.
 * - A name cut short shows whole in a tooltip.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Tile | 4px padding, 2px gap, radius 5px |
 * | Picture | the tile's width, 4:3, radius 4px |
 */
const meta: Meta<typeof TileButton> = {
    title: "Components/Inputs/TileButton",
    component: TileButton,
    parameters: { layout: "padded" },
    decorators: [
        (Story) => (
            <Box w={240} p={8} bg="var(--cm-bg)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof TileButton>;

/**
 * A 4:3 picture as a data URL.
 * @param fill - its color
 * @returns the data URL
 */
function picture(fill: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="104" height="78"><rect width="104" height="78" fill="${fill}"/><circle cx="52" cy="39" r="20" fill="white"/></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const TILES = [
    { id: "sunset", name: "Sunset", src: picture("#E8743B") },
    { id: "forest", name: "Forest", src: picture("#2E8B57") },
    { id: "ocean", name: "A very long name that does not fit", src: picture("#1F6FB2") },
    { id: "none", name: "No picture yet" },
];

/**
 * A two-column gallery holding its picked tile in state.
 * @returns the gallery
 */
function Gallery(): React.JSX.Element {
    const [picked, setPicked] = useState("sunset");
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            {TILES.map((tile) => (
                <TileButton
                    key={tile.id}
                    name={tile.name}
                    src={tile.src}
                    picked={picked === tile.id}
                    onClick={() => {
                        setPicked(tile.id);
                    }}
                />
            ))}
        </div>
    );
}

/** A gallery: the picked tile drawn chosen, a long name cut short, a tile with no picture yet. */
export const Default: Story = {
    render: () => <Gallery />,
};

/** A click picks a tile: it is drawn chosen and announced pressed, and the one before is not. */
export const Pick: Story = {
    render: () => <Gallery />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "Forest" }));
        await expect(canvas.getByRole("button", { name: "Forest" })).toHaveAttribute("aria-pressed", "true");
        await expect(canvas.getByRole("button", { name: "Sunset" })).toHaveAttribute("aria-pressed", "false");
    },
};

/** A disabled tile is dimmed and takes no pick. */
export const Disabled: Story = {
    render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
            <TileButton name="Sunset" src={picture("#E8743B")} />
            <TileButton name="Unavailable" src={picture("#888888")} aria-disabled />
        </div>
    ),
};
