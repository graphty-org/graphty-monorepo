import { Box, Button, Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { ContextMenu } from "../../../src/components/overlays/ContextMenu";
import { MenuCheckItem } from "../../../src/components/overlays/MenuCheckItem";
import { UiGlyph } from "../../../src/icons";

/**
 * Figma's dark menu (design/figma-spec.md 8.1) and context menu (8.2): #1e1e1e in both themes,
 * radius 13, 24px rows with an inset #0c8ce9 highlight, a 16px check column, secondary shortcuts,
 * 24px submenu chevrons and full-width dividers. Switch the toolbar's Theme to see that the menu
 * stays dark and only its shadow follows the page.
 */
const meta: Meta = {
    title: "Figma/Overlays/Menu",
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj;

/** A 24 x 24 icon for a leading slot (the glyph drawn 12px inside it). */
function Icon24({ name }: { name: "search" | "settings" | "eye" }): React.JSX.Element {
    return (
        <span style={{ display: "inline-flex", width: 24, height: 24, alignItems: "center", justifyContent: "center" }}>
            <UiGlyph name={name} size={12} />
        </span>
    );
}

/**
 * One open menu, drawn in place (no portal) so several sit side by side.
 * @param props - the menu's rows and a caption
 * @param props.caption - what the column shows
 * @param props.children - the rows
 * @returns an always-open menu
 */
function OpenMenu({ caption, children }: { caption: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <Stack gap={4} style={{ width: 240, height: 420 }}>
            <Text size="sm" c="dimmed">
                {caption}
            </Text>
            <Menu opened withinPortal={false} trapFocus={false} closeOnClickOutside={false}>
                <Menu.Target>
                    <Button variant="default">Menu</Button>
                </Menu.Target>
                <Menu.Dropdown>{children}</Menu.Dropdown>
            </Menu>
        </Stack>
    );
}

/**
 * Every row state side by side: rest, hover / keyboard highlight (`data-hovered`, the state
 * Mantine sets), disabled, checked and unchecked check rows, a group label, dividers, a danger
 * row at rest and highlighted, and a submenu parent.
 */
export const States: Story = {
    render: () => (
        <Group align="flex-start" gap={24} wrap="nowrap">
            <OpenMenu caption="Rows, hover, disabled, shortcut, chevron">
                <Menu.Item>Back to files</Menu.Item>
                <Menu.Divider />
                <Menu.Item leftSection={<Icon24 name="search" />} rightSection="Ctrl+K">
                    Actions...
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item rightSection="Ctrl+Z" data-hovered>
                    Undo
                </Menu.Item>
                <Menu.Item rightSection="Ctrl+Y" disabled>
                    Redo
                </Menu.Item>
                <Menu.Sub>
                    <Menu.Sub.Target>
                        <Menu.Sub.Item>Copy as</Menu.Sub.Item>
                    </Menu.Sub.Target>
                    <Menu.Sub.Dropdown>
                        <Menu.Item>Copy as text</Menu.Item>
                        <Menu.Item>Copy as CSS</Menu.Item>
                    </Menu.Sub.Dropdown>
                </Menu.Sub>
                <Menu.Item rightSection="Ctrl+Shift+V">Paste over selection</Menu.Item>
            </OpenMenu>
            <OpenMenu caption="Label, check column, danger">
                <Menu.Label>View</Menu.Label>
                <MenuCheckItem checked rightSection="Shift+R">
                    Rulers
                </MenuCheckItem>
                <MenuCheckItem checked={false} rightSection="Ctrl+'">
                    Pixel grid
                </MenuCheckItem>
                <MenuCheckItem checked data-hovered>
                    Outlines
                </MenuCheckItem>
                <Menu.Divider />
                <Menu.Item color="red">Delete page</Menu.Item>
                <Menu.Item color="red" data-hovered>
                    Delete selection
                </Menu.Item>
            </OpenMenu>
            <OpenMenu caption="Icons and a hovered icon row">
                <Menu.Item leftSection={<Icon24 name="settings" />}>Preferences</Menu.Item>
                <Menu.Item leftSection={<Icon24 name="eye" />} data-hovered rightSection="Ctrl+.">
                    Show UI
                </Menu.Item>
            </OpenMenu>
        </Group>
    ),
};

/**
 * The live menu: opens 4px below its trigger in one frame, arrow keys move the highlight,
 * ArrowRight opens a submenu at once, Escape closes the stack and returns focus to the trigger.
 */
export const Interactive: Story = {
    render: () => (
        <Box style={{ height: 420 }}>
            <Menu>
                <Menu.Target>
                    <Button variant="default">Main menu</Button>
                </Menu.Target>
                <Menu.Dropdown>
                    <Menu.Item rightSection="Ctrl+K">Actions...</Menu.Item>
                    <Menu.Divider />
                    <Menu.Sub>
                        <Menu.Sub.Target>
                            <Menu.Sub.Item>File</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                            <Menu.Item rightSection="Ctrl+Alt+N">New design file</Menu.Item>
                            <Menu.Item>Import...</Menu.Item>
                        </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Sub>
                        <Menu.Sub.Target>
                            <Menu.Sub.Item>Edit</Menu.Sub.Item>
                        </Menu.Sub.Target>
                        <Menu.Sub.Dropdown>
                            <Menu.Item rightSection="Ctrl+Z">Undo</Menu.Item>
                            <Menu.Item rightSection="Ctrl+Y" disabled>
                                Redo
                            </Menu.Item>
                        </Menu.Sub.Dropdown>
                    </Menu.Sub>
                    <Menu.Item>Libraries</Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Box>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole("button", { name: "Main menu" });
        await userEvent.click(trigger);
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => expect(body.getByRole("menu")).toBeVisible());
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => expect(body.getByRole("menuitem", { name: /^Actions/ })).toHaveFocus());
        await userEvent.keyboard("{ArrowDown}{ArrowRight}");
        // Rows with a shortcut carry it in their accessible name ("New design fileCtrl+Alt+N").
        await waitFor(() => expect(body.getByRole("menuitem", { name: /^New design file/ })).toHaveFocus());
    },
};

/**
 * A menu too long for the window: clamped 6px inside it, with Figma's 24px chevron rows at each
 * end it can still scroll towards. Hover a chevron row to scroll. Type a letter to jump to the
 * next row starting with it.
 */
export const LongMenu: Story = {
    render: () => (
        <Box style={{ height: 200 }}>
            <Menu defaultOpened>
                <Menu.Target>
                    <Button variant="default">Object</Button>
                </Menu.Target>
                <Menu.Dropdown>
                    {Array.from({ length: 60 }, (_, i) => (
                        <Menu.Item key={i} rightSection={i % 5 === 0 ? `Ctrl+${String(i)}` : undefined}>
                            {["Flip", "Rotate", "Bring", "Send", "Show"][i % 5]} row {i}
                        </Menu.Item>
                    ))}
                </Menu.Dropdown>
            </Menu>
        </Box>
    ),
    play: async ({ canvasElement }) => {
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => expect(body.getByRole("menu")).toHaveAttribute("data-cm-scroll-down"));
    },
};

/**
 * The context menu: right-click the area (or focus it and press Shift+F10) and the menu opens at
 * the pointer, 3px right and 5px up, with the first enabled row highlighted.
 */
export const Context: Story = {
    render: function ContextStory() {
        const [last, setLast] = useState("none");
        return (
            <ContextMenu
                target={
                    <Box
                        tabIndex={0}
                        aria-label="Canvas"
                        data-testid="context-area"
                        style={{
                            width: 480,
                            height: 320,
                            border: "1px dashed var(--cm-border)",
                            borderRadius: 5,
                            display: "grid",
                            placeItems: "center",
                            color: "var(--cm-text-secondary)",
                        }}
                    >
                        Right-click, or focus and press Shift+F10. Last: {last}
                    </Box>
                }
            >
                <Menu.Item rightSection="Ctrl+C" onClick={() => setLast("Copy")}>
                    Copy
                </Menu.Item>
                <Menu.Item rightSection="Ctrl+V" onClick={() => setLast("Paste here")}>
                    Paste here
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item disabled>Select layer</Menu.Item>
                <Menu.Item color="red" rightSection="Delete" onClick={() => setLast("Delete")}>
                    Delete
                </Menu.Item>
            </ContextMenu>
        );
    },
    play: async ({ canvasElement }) => {
        const area = within(canvasElement).getByTestId("context-area");
        area.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => expect(body.getByRole("menuitem", { name: /Copy/ })).toHaveFocus());
    },
};
