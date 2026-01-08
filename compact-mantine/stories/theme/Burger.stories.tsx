import { Burger, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

const meta: Meta<typeof Burger> = {
    title: "Theme/Burger",
    component: Burger,
    args: {
        size: "compact",
    },
};

export default meta;
type Story = StoryObj<typeof Burger>;

export const Default: Story = {
    args: {
        opened: false,
        "aria-label": "Toggle navigation",
    },
};

export const Sizes: Story = {
    render: function BurgerRender() {
        const [opened, setOpened] = useState(false);
        return (
            <Stack gap="xs">
                <Group>
                    <Text size="compact" style={{ width: 80 }}>
                        compact:
                    </Text>
                    <Burger
                        size="compact"
                        opened={opened}
                        onClick={() => {
                            setOpened((o) => !o);
                        }}
                        aria-label="Toggle navigation"
                    />
                </Group>
                <Group>
                    <Text size="compact" style={{ width: 80 }}>
                        xs:
                    </Text>
                    <Burger
                        size="xs"
                        opened={opened}
                        onClick={() => {
                            setOpened((o) => !o);
                        }}
                        aria-label="Toggle navigation"
                    />
                </Group>
                <Group>
                    <Text size="compact" style={{ width: 80 }}>
                        sm:
                    </Text>
                    <Burger
                        size="sm"
                        opened={opened}
                        onClick={() => {
                            setOpened((o) => !o);
                        }}
                        aria-label="Toggle navigation"
                    />
                </Group>
            </Stack>
        );
    },
};
