import { Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { SecondaryToolbar, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { icons } from "./fixtures";

/**
 * The contextual bar that appears above the main toolbar while a mode is active, such as vector
 * editing or cropping an image: the mode's own tools, a "More" dropdown and a close button.
 *
 * ## When to use it
 *
 * Reach for `SecondaryToolbar` for the tools of one temporary mode, shown only while that mode
 * is on. Reach for `Toolbar` for the editor's permanent tools, and for a Mantine `Menu` when the
 * mode has only a couple of commands.
 *
 * ## Usage
 *
 * ```tsx
 * import { Menu } from "@mantine/core";
 * import { SecondaryToolbar, UiGlyph } from "@graphty/compact-mantine";
 *
 * <SecondaryToolbar aria-label="Vector editing">
 *     <SecondaryToolbar.Button icon={<MoveIcon />} selected>Move</SecondaryToolbar.Button>
 *     <SecondaryToolbar.Button icon={<LassoIcon />}>Lasso</SecondaryToolbar.Button>
 *     <SecondaryToolbar.Divider />
 *     <Menu position="top-start" offset={8}>
 *         <Menu.Target>
 *             <SecondaryToolbar.Button dropdown>More</SecondaryToolbar.Button>
 *         </Menu.Target>
 *         <Menu.Dropdown>...</Menu.Dropdown>
 *     </Menu>
 *     <SecondaryToolbar.Divider />
 *     <SecondaryToolbar.Button icon={<UiGlyph name="close" />} aria-label="Close" onClick={exitMode} />
 * </SecondaryToolbar>
 * ```
 *
 * `SecondaryToolbar.Button` takes an `icon`, a visible label as children (without one it is an
 * icon button and needs an `aria-label`), `selected` for the current mode, and `dropdown` for a
 * trailing chevron. The caller positions the bar; Figma puts it 8px above the main toolbar.
 * `flush` drops the padding for a crop-style bar whose items sit on its edges.
 *
 * ## Keyboard and accessibility
 *
 * - The bar is one Tab stop (`role="toolbar"`, horizontal, named by the required `aria-label`).
 *   ArrowLeft / ArrowRight and Home / End move between its buttons.
 * - `selected` is announced as `aria-pressed`. A dropdown button inside `Menu.Target` gets
 *   `aria-expanded` from Mantine, which also draws its open state.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Bar | 40 tall, padding 8 (0 with `flush`), gap 8, radius 13, elevation 200 |
 * | Button | 24 tall, 24px glyph, 11/16 label, padding-inline-end 8 |
 * | Dropdown chevron | 16px, 4px end padding |
 * | Divider | 1 x 40, full height |
 */
const meta: Meta<typeof SecondaryToolbar> = {
    title: "Components/App shell/SecondaryToolbar",
    component: SecondaryToolbar,
    subcomponents: { "SecondaryToolbar.Button": SecondaryToolbar.Button },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SecondaryToolbar>;

/** The vector-editing bar: labeled tools, dividers, a "More" dropdown and a close button. */
export const Default: Story = {
    args: { "aria-label": "Vector editing", flush: false },
    render: (args) => (
        <SecondaryToolbar {...args}>
            <SecondaryToolbar.Button icon={icons.move} selected>
                Move
            </SecondaryToolbar.Button>
            <SecondaryToolbar.Button icon={icons.pen}>Lasso</SecondaryToolbar.Button>
            <SecondaryToolbar.Divider />
            <SecondaryToolbar.Button icon={icons.rectangle}>Paint</SecondaryToolbar.Button>
            <SecondaryToolbar.Button icon={icons.frame}>Bend</SecondaryToolbar.Button>
            <SecondaryToolbar.Divider />
            <Menu position="top-start" offset={8}>
                <Menu.Target>
                    <SecondaryToolbar.Button dropdown>More</SecondaryToolbar.Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item>Flatten</Menu.Item>
                    <Menu.Item>Outline stroke</Menu.Item>
                </Menu.Dropdown>
            </Menu>
            <SecondaryToolbar.Divider />
            <SecondaryToolbar.Button icon={<UiGlyph name="close" />} aria-label="Close" />
        </SecondaryToolbar>
    ),
};

/** Every button state: rest, hover, selected, dropdown open and focus. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={16}>
            {(
                [
                    ["rest", {}],
                    ["hover", { "data-state": "hover" }],
                    ["selected", { selected: true }],
                    ["open", { "aria-expanded": true }],
                    ["focus", { "data-state": "focus" }],
                ] as const
            ).map(([name, props]) => (
                <Stack key={name} gap={4}>
                    <Text size="xs">{name}</Text>
                    <SecondaryToolbar aria-label={name}>
                        <SecondaryToolbar.Button icon={icons.pen} {...props}>
                            Lasso
                        </SecondaryToolbar.Button>
                        <SecondaryToolbar.Divider />
                        <SecondaryToolbar.Button dropdown {...props}>
                            More
                        </SecondaryToolbar.Button>
                        <SecondaryToolbar.Divider />
                        <SecondaryToolbar.Button icon={<UiGlyph name="close" />} aria-label="Close" {...props} />
                    </SecondaryToolbar>
                </Stack>
            ))}
        </Stack>
    ),
};

/** `flush`: no padding, for a crop-style bar whose items sit on its edges. */
export const Flush: Story = {
    args: { "aria-label": "Crop image", flush: true },
    render: (args) => (
        <SecondaryToolbar {...args}>
            <SecondaryToolbar.Button icon={icons.frame} selected>
                Crop
            </SecondaryToolbar.Button>
            <SecondaryToolbar.Divider />
            <SecondaryToolbar.Button icon={<UiGlyph name="close" />} aria-label="Close" />
        </SecondaryToolbar>
    ),
};

/** Keyboard: one Tab stop on the selected button; the arrows and Home / End move between buttons. */
export const Keyboard: Story = {
    ...Default,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const move = canvas.getByRole("button", { name: "Move" });
        await expect(move).toHaveAttribute("tabindex", "0");
        await expect(canvas.getByRole("button", { name: "Lasso" })).toHaveAttribute("tabindex", "-1");
        move.focus();
        await userEvent.keyboard("{ArrowRight}");
        await expect(canvas.getByRole("button", { name: "Lasso" })).toHaveFocus();
        await userEvent.keyboard("{End}");
        await expect(canvas.getByRole("button", { name: "Close" })).toHaveFocus();
    },
};
