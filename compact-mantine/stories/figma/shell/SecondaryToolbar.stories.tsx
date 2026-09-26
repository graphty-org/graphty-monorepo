import { Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { SecondaryToolbar, UiGlyph } from "../../../src";
import { icons } from "./fixtures";

const meta: Meta<typeof SecondaryToolbar> = {
    title: "Figma/Shell/SecondaryToolbar",
    component: SecondaryToolbar,
};

export default meta;
type Story = StoryObj<typeof SecondaryToolbar>;

/** The vector-edit bar: labelled tools, dividers, a "More" dropdown and a close button. */
export const Default: Story = {
    render: () => (
        <SecondaryToolbar aria-label="Vector editing">
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

/** Every item state side by side: rest, hover, selected, dropdown open, focus. */
export const States: Story = {
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
