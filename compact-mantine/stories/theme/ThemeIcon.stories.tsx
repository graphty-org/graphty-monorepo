import { Group, ThemeIcon } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { Home } from "lucide-react";

const meta: Meta<typeof ThemeIcon> = {
    title: "Compact Theme/Mantine Components/ThemeIcon",
    component: ThemeIcon,
};

export default meta;
type Story = StoryObj<typeof ThemeIcon>;

export const Default: Story = {
    args: {
        children: <Home size={14} />,
        color: "blue",
    },
};

/** 24 box, radius 5: filled (brand) and light (selected ground, brand glyph). */
export const States: Story = {
    render: () => (
        <Group gap={8}>
            <ThemeIcon>
                <Home size={16} strokeWidth={1} />
            </ThemeIcon>
            <ThemeIcon variant="light">
                <Home size={16} strokeWidth={1} />
            </ThemeIcon>
        </Group>
    ),
};
