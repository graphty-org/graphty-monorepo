import { Box } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { TileButton } from "../../../src/components/inputs/TileButton";

/**
 * A picture tile: a picture with its name, lit on hover, its picture ringed on keyboard focus and drawn chosen while
 * picked. At `md` and `lg` it follows Figma's asset tiles: a square picture with the name under it, two to a row 16px
 * apart in a 240px pop-over.
 *
 * ## What it is for
 *
 * Picking one item from a gallery of pictured choices, where the picture is how the reader tells the items apart:
 * the model gallery and the shader gallery (opened from the Shape drop-down in the Style panel), and the image
 * picker's library of pictures. Lay the tiles out in a grid (a list at `sm`); the keyboard walk between tiles is
 * the caller's.
 *
 * ## When not to use it
 *
 * - Not for a mode or kind switch. A choice between a few modes or kinds (basic shape, model or shader) is one
 *   drop-down that lists every choice, or a segmented control; never a row of tiles or buttons. The Style panel
 *   had a "Kind" button row under Shape and it was removed: the Shape drop-down is the one path to models and
 *   shaders.
 * - Never to open a menu or a pop-over. A tile picks its item and nothing else; no button group opens a menu.
 * - Not for an action (Add, Load, Delete): that is a button.
 * - Not for choices with no picture: that is a drop-down or a list.
 *
 * ## Sizes
 *
 * | Size | Drawn as | Where |
 * |---|---|---|
 * | `sm` | one 24px row: a 16px thumbnail, then the name | a long list in a narrow pop-out: ImagePicker's library |
 * | `md` (default) | a 96px square picture, the name 4px under it | two to a row, 16px apart, in a 240px pop-over: the model and shader galleries |
 * | `lg` | a 144px square picture, the name 4px under it | a gallery with room for detail: a dialog or a wide panel |
 *
 * At `md` and `lg` a tile is never wider than its grid cell; give the grid columns of that width
 * and a 16px gap (`grid-template-columns: repeat(2, 96px); gap: 16px`, which fills a 240px pop-over's 208px content).
 *
 * ## Usage
 *
 * ```tsx
 * <TileButton name="Sunset" src={sunsetUrl} picked={value === "sunset"} onClick={() => setValue("sunset")} />
 * <TileButton size="sm" name="Sunset" src={sunsetUrl} />
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
 * | Part | sm | md | lg |
 * |---|---|---|---|
 * | Tile | 24px tall, full width, 4px inline padding, 4px gap | 96px wide, no padding | 144px wide, no padding |
 * | Picture | 16 by 16px | 96 by 96px, radius 5px | 144 by 144px, radius 5px |
 * | Name | beside the picture | 4px under the picture, 11/16 | 4px under the picture, 11/16 |
 * | Hover, picked | the row's ground | the tile's ground and a 4px ring of it around the tile | as md |
 * | Keyboard focus | 1px ring inside the row | 2px ring inside the picture | as md |
 */
const meta: Meta<typeof TileButton> = {
    title: "Components/Inputs/TileButton",
    component: TileButton,
    parameters: { layout: "padded" },
    decorators: [
        (Story, context) => (
            <Box w={(context.parameters.boxWidth as number | undefined) ?? 240} px={16} py={12} bg="var(--cm-bg)">
                <Story />
            </Box>
        ),
    ],
};

export default meta;
type Story = StoryObj<typeof TileButton>;

/**
 * A square picture as a data URL.
 * @param fill - its color
 * @returns the data URL
 */
function picture(fill: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="${fill}"/><circle cx="48" cy="48" r="24" fill="white"/></svg>`;
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 96px)", gap: 16 }}>
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

/** Small: rows of a list, a 16px thumbnail beside the name, as in ImagePicker's library. */
export const Small: Story = {
    render: () => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TILES.map((tile, i) => (
                <TileButton key={tile.id} size="sm" name={tile.name} src={tile.src} picked={i === 0} />
            ))}
        </div>
    ),
};

/** Medium, the default: two to a row 16px apart in a 240px pop-over, as in the model and shader galleries. */
export const Medium: Story = {
    render: () => <Gallery />,
};

/** Large: a 144px square picture, for a gallery in a dialog or a wide panel. */
export const Large: Story = {
    parameters: { boxWidth: 360 },
    render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, 144px)", gap: 16 }}>
            {TILES.map((tile, i) => (
                <TileButton key={tile.id} size="lg" name={tile.name} src={tile.src} picked={i === 0} />
            ))}
        </div>
    ),
};

/** A disabled tile is dimmed and takes no pick. */
export const Disabled: Story = {
    render: () => (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 96px)", gap: 16 }}>
            <TileButton name="Sunset" src={picture("#E8743B")} />
            <TileButton name="Unavailable" src={picture("#888888")} aria-disabled />
        </div>
    ),
};
