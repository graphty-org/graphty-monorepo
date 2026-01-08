import { Anchor, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Anchor> = {
    title: "Theme/Anchor",
    component: Anchor,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Anchor>;

export const Default: Story = {
    args: {
        children: "Documentation",
        href: "#",
    },
};

export const Sizes: Story = {
    render: () => (
        <Stack gap="xs">
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    compact:
                </Text>
                <Anchor size="compact" href="#">
                    Documentation
                </Anchor>
                <Anchor size="compact" href="#">
                    API Reference
                </Anchor>
                <Anchor size="compact" href="#">
                    Examples
                </Anchor>
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    xs:
                </Text>
                <Anchor size="xs" href="#">
                    Documentation
                </Anchor>
                <Anchor size="xs" href="#">
                    API Reference
                </Anchor>
                <Anchor size="xs" href="#">
                    Examples
                </Anchor>
            </Group>
            <Group>
                <Text size="compact" style={{ width: 80 }}>
                    sm:
                </Text>
                <Anchor size="sm" href="#">
                    Documentation
                </Anchor>
                <Anchor size="sm" href="#">
                    API Reference
                </Anchor>
                <Anchor size="sm" href="#">
                    Examples
                </Anchor>
            </Group>
        </Stack>
    ),
};
