import { Box, Button, Group, HoverCard, NumberInput, Popover, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";

import { InfoCircle } from "../../../src/components/InfoCircle";
import { Popout, PopoutButton, PopoutManager } from "../../../src/components/popout";
import { UiGlyph } from "../../../src/icons";

/**
 * Figma's light popover (design/figma-spec.md 8.4): the Popout family, Mantine Popover and
 * HoverCard, and InfoCircle's bubble. 240 wide, --cm-bg, radius 13, elevation 400, no border; a
 * 40px header (title 11/16 550, or pill tabs) with a 1px divider and a 24px close button 8px
 * from the top and end; the body 16px in from the divider. One root popover is open at a time.
 */
const meta: Meta = {
    title: "Figma/Overlays/Light popover",
    parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj;

/** Two panel rows: a label column and a 24px field, as Figma's stroke settings. */
function Rows(): React.JSX.Element {
    return (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="sm" c="var(--cm-text-secondary)" w={72}>
                    Width
                </Text>
                <NumberInput aria-label="Width" defaultValue={1} w={120} />
            </Group>
            <Group gap={8} wrap="nowrap">
                <Text size="sm" c="var(--cm-text-secondary)" w={72}>
                    Offset
                </Text>
                <NumberInput aria-label="Offset" defaultValue={0} w={120} />
            </Group>
        </Stack>
    );
}

/**
 * A column holding one open popover below its trigger. Each column has its own manager, which is
 * the only way two root popovers can be seen at once (inside one manager opening one closes the
 * other).
 * @param props - the caption and the popover
 * @param props.caption - what the column shows
 * @param props.children - the popover
 * @returns the column
 */
function Column({ caption, children }: { caption: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <Stack gap={8} style={{ width: 256, height: 360 }}>
            <Text size="sm" c="dimmed">
                {caption}
            </Text>
            <PopoutManager>{children}</PopoutManager>
        </Stack>
    );
}

/** Every state side by side: title header, tabs header, nested child docked flush, InfoCircle. */
export const States: Story = {
    render: () => (
        <Group align="flex-start" gap={24} p={24} wrap="nowrap">
            <Column caption="Title header, trigger open">
                <Popout defaultOpened>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="settings" size={12} />} aria-label="Stroke settings" />
                    </Popout.Trigger>
                    <Popout.Panel
                        width={240}
                        placement="bottom"
                        anchorX="trigger"
                        manageFocus={false}
                        header={{ variant: "title", title: "Stroke settings" }}
                    >
                        <Popout.Content>
                            <Rows />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Column>
            <Column caption="Pill tabs in the title slot">
                <Popout defaultOpened>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="settings" size={12} />} aria-label="Type settings" />
                    </Popout.Trigger>
                    <Popout.Panel
                        width={240}
                        placement="bottom"
                        anchorX="trigger"
                        manageFocus={false}
                        header={{
                            variant: "tabs",
                            tabs: [
                                { id: "basics", label: "Basics", content: <Box p={16}>Basics</Box> },
                                { id: "details", label: "Details", content: <Box p={16}>Details</Box> },
                                { id: "variable", label: "Variable", content: <Box p={16}>Variable</Box> },
                            ],
                        }}
                    />
                </Popout>
            </Column>
            <Column caption="Mantine Popover and HoverCard">
                <Stack gap={72} align="flex-start">
                    <Popover opened withinPortal={false} position="bottom-start">
                        <Popover.Target>
                            <Button variant="default">Popover</Button>
                        </Popover.Target>
                        <Popover.Dropdown>
                            <Text size="sm">Popover content</Text>
                        </Popover.Dropdown>
                    </Popover>
                    <HoverCard initiallyOpened withinPortal={false} position="bottom-start">
                        <HoverCard.Target>
                            <Button variant="default">HoverCard</Button>
                        </HoverCard.Target>
                        <HoverCard.Dropdown>
                            <Text size="sm">HoverCard content</Text>
                        </HoverCard.Dropdown>
                    </HoverCard>
                </Stack>
            </Column>
            <Column caption="InfoCircle (open)">
                <Group gap={4}>
                    <Text size="sm">Resolution</Text>
                    <InfoCircle label="Resolution" defaultOpened>
                        Higher resolution finds more, smaller communities.
                    </InfoCircle>
                </Group>
            </Column>
        </Group>
    ),
};

/**
 * One at a time, and a child docked flush: open the fill settings, then the stroke settings --
 * the first closes. Inside the stroke settings, "Create style" opens a child popout flush to its
 * start edge, which stays.
 */
export const OneAtATime: Story = {
    render: () => (
        <PopoutManager>
            <Popout.Anchor>
            <Box
                style={{
                    position: "absolute",
                    insetInlineEnd: 0,
                    top: 0,
                    bottom: 0,
                    width: 240,
                    borderInlineStart: "1px solid var(--cm-border)",
                    padding: 16,
                }}
            >
                    <Stack gap={8}>
                        {(["Fill", "Stroke"] as const).map((name) => (
                            <Group key={name} justify="space-between">
                                <Text size="sm">{name}</Text>
                                <Popout>
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<UiGlyph name="settings" size={12} />}
                                            aria-label={`${name} settings`}
                                        />
                                    </Popout.Trigger>
                                    <Popout.Panel width={240} header={{ variant: "title", title: `${name} settings` }}>
                                        <Popout.Content>
                                            <Rows />
                                            <Popout>
                                                <Popout.Trigger>
                                                    <Button variant="default" mt={8}>
                                                        Create style
                                                    </Button>
                                                </Popout.Trigger>
                                                <Popout.Panel
                                                    width={240}
                                                    header={{ variant: "title", title: "Create style" }}
                                                >
                                                    <Popout.Content>
                                                        <Text size="sm">A child docks flush to its parent.</Text>
                                                    </Popout.Content>
                                                </Popout.Panel>
                                            </Popout>
                                        </Popout.Content>
                                    </Popout.Panel>
                                </Popout>
                            </Group>
                        ))}
                    </Stack>
            </Box>
            </Popout.Anchor>
        </PopoutManager>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole("button", { name: "Fill settings" }));
        await waitFor(() => expect(body.getByRole("dialog", { name: "Fill settings" })).toBeVisible());
        await userEvent.click(canvas.getByRole("button", { name: "Stroke settings" }));
        await waitFor(() => expect(body.queryByRole("dialog", { name: "Fill settings" })).toBeNull());
        await userEvent.click(body.getByRole("button", { name: "Create style" }));
        await waitFor(() => expect(body.getAllByRole("dialog")).toHaveLength(2));
    },
};
