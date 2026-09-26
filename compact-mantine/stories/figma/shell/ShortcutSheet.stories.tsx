import { Group, Kbd, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";

import { ShortcutSheet } from "../../../src";
import { sheetTabs } from "./fixtures";

const meta: Meta<typeof ShortcutSheet> = {
    title: "Figma/Shell/ShortcutSheet",
    component: ShortcutSheet,
};

export default meta;
type Story = StoryObj<typeof ShortcutSheet>;

/** The sheet on its "Tools" tab: arrows move between tabs and open them. */
export const Default: Story = {
    render: () => <ShortcutSheet tabs={sheetTabs} defaultValue="tools" onClose={() => undefined} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const tools = canvas.getByRole("tab", { name: "Tools" });
        tools.focus();
        await userEvent.keyboard("{ArrowRight}");
        await expect(canvas.getByRole("tab", { name: "View" })).toHaveAttribute("aria-selected", "true");
    },
};

/** The key caps: the list cap (sm), the essential cap (md), lit, and the inline prose cap. */
export const States: Story = {
    render: () => (
        <Stack gap={12}>
            <Group gap={3}>
                <Kbd>Shift</Kbd>
                <Kbd>P</Kbd>
                <Text size="xs">sm (list)</Text>
            </Group>
            <Group gap={3}>
                <Kbd size="md">Ctrl</Kbd>
                <Kbd size="md">\</Kbd>
                <Text size="xs">md (essential)</Text>
            </Group>
            <Group gap={3}>
                <Kbd size="md" mod={{ active: true }}>
                    Ctrl
                </Kbd>
                <Kbd size="md" mod={{ active: true }}>
                    K
                </Kbd>
                <Text size="xs">highlighted</Text>
            </Group>
            <Text size="sm">
                Press <Kbd variant="inline">Ctrl</Kbd> <Kbd variant="inline">K</Kbd> to search.
            </Text>
        </Stack>
    ),
};

/** Figma's first tab: the caption, numbered columns, a description under each label and 14px caps. */
export const Essential: Story = {
    render: () => <ShortcutSheet tabs={sheetTabs} onClose={() => undefined} />,
};
