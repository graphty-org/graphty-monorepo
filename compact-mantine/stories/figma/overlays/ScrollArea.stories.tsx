import { Box, ScrollArea, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Figma's overlay scrollbar (design/figma-spec.md 8.7): a 10px transparent track over the edge,
 * a 6px pill (4px shorter than its thumb) in --cm-scrollbar, shown only while the pointer is over
 * the scroller and removed at once; hovering the track adds a 1px edge line.
 */
const meta: Meta = {
    title: "Figma/Overlays/Scrollbar",
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

const rows = Array.from({ length: 40 }, (_, i) => `Layer ${i + 1}`);

function List({ type }: { type: "hover" | "always" }): React.JSX.Element {
    return (
        <ScrollArea h={240} w={240} type={type} style={{ border: "1px solid var(--cm-border)" }}>
            <Stack gap={0}>
                {rows.map((row) => (
                    <Box key={row} px={16} style={{ height: 32, display: "flex", alignItems: "center" }}>
                        <Text size="sm">{row}</Text>
                    </Box>
                ))}
            </Stack>
        </ScrollArea>
    );
}

/** Left: the thumb held visible (type="always"). Right: the default -- hover to see it. */
export const States: Story = {
    render: () => (
        <Box style={{ display: "flex", gap: 24 }}>
            <List type="always" />
            <List type="hover" />
        </Box>
    ),
};
