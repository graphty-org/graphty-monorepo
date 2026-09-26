import { Box, Button, Group, Menu, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { ContextMenu as ContextMenuComponent, MenuCheckItem, UiGlyph } from "../../../src";
import { expectStatesApply } from "../../helpers/assert-states";
import { BOTH_SCHEMES, OPEN_OVERLAY } from "../../helpers/schemes";

// ContextMenu is imported under another name so the story that shows it can be called
// `ContextMenu`, which is what a reader types into the sidebar search.

// Demo stories carry no play function, so opening one in the sidebar or on the docs page does
// not pop a menu over the page. The assertions live on the `*Interactions` twins, hidden from the
// sidebar and the docs page and still run by the test runner and Chromatic.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

/**
 * The dark menu: Mantine's `Menu`, themed, plus `ContextMenu` (a menu opened at the pointer by a
 * right-click) and `MenuCheckItem` (a row with a check column).
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `ContextMenu` | Commands for the thing under the pointer, opened by a right-click (or Shift+F10 from the keyboard) where the reader already is |
 * | Mantine `Menu` | Commands opened from a visible button: a main menu, an overflow button, a toolbar dropdown. The theme gives it the same look |
 * | `MenuCheckItem` | A row that turns something on and off (rulers, a grid) or picks one of a set (`radio`), inside either menu |
 * | `SplitButton` | A button with a default action and a menu of alternatives |
 * | `Select` | Choosing a value for a field; a menu runs commands |
 *
 * ## Usage
 *
 * ```tsx
 * import { Menu } from "@mantine/core";
 * import { ContextMenu, MenuCheckItem } from "@graphty/compact-mantine";
 *
 * <ContextMenu target={<div className="canvas" tabIndex={0} />}>
 *     <Menu.Item rightSection="Ctrl+C">Copy</Menu.Item>
 *     <MenuCheckItem checked={rulers} onClick={toggleRulers}>Rulers</MenuCheckItem>
 *     <Menu.Divider />
 *     <Menu.Item color="red">Delete</Menu.Item>
 * </ContextMenu>
 * ```
 *
 * `ContextMenu` takes every Mantine `Menu` prop except the ones that place and open it. Its rows
 * are ordinary Mantine menu rows: `Menu.Item`, `Menu.Label`, `Menu.Divider`, `Menu.Sub`.
 *
 * ## Keyboard and accessibility
 *
 * - ContextMenu opens on right-click and, from the keyboard, on Shift+F10 or the ContextMenu key
 *   at the focused element. The first enabled row is focused, so Enter acts on it at once.
 * - Arrow Up and Down move the highlight (looping), Home and End jump, ArrowRight opens a
 *   submenu at once, typing a letter jumps to the next row starting with it, and Escape closes
 *   the whole stack and returns focus to where it was. Tab is ignored inside a menu.
 * - Rows are `menuitem`s; a MenuCheckItem is a `menuitemcheckbox` (or `menuitemradio`) with
 *   `aria-checked`. A row with a shortcut carries it in its accessible name.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Surface | `#1e1e1e` in both schemes, radius 13px, elevation 400, padding 8px 0, min width 152px |
 * | Row | 24px tall; highlight an inner pill inset 8px each side, radius 5px, `#0c8ce9` |
 * | Text | 11/16 weight 450; starts 16px from the edge (32px with a check column) |
 * | Check column | 16 x 16; icon slot 24 x 24 |
 * | Divider | 1px with 8px above and below |
 * | Placement | 4px below its trigger, start-aligned; submenus 4px beside, no delay. ContextMenu: 3px right of and 5px above the pointer |
 */
const meta: Meta<typeof ContextMenuComponent> = {
    title: "Components/Overlays/Menu",
    component: ContextMenuComponent,
    subcomponents: { MenuCheckItem },
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ContextMenuComponent>;

/**
 * The dashed area the context menu story right-clicks. It passes on the `onContextMenu` and
 * `onKeyDown` handlers ContextMenu adds to its target: a target that drops them never opens.
 * @param props - the last command chosen, and the handlers ContextMenu adds
 * @param props.last - the last command chosen
 * @returns the area
 */
function ContextArea({
    last,
    ...handlers
}: {
    last: string;
    onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
    onKeyDown?: React.KeyboardEventHandler<HTMLDivElement>;
}): React.JSX.Element {
    return (
        <Box
            {...handlers}
            tabIndex={0}
            aria-label="Canvas"
            data-testid="context-area"
            style={{
                width: 480,
                maxWidth: "100%",
                height: 240,
                border: "1px dashed var(--cm-border)",
                borderRadius: 5,
                display: "grid",
                placeItems: "center",
                color: "var(--cm-text-secondary)",
            }}
        >
            Right-click, or focus and press Shift+F10. Last: {last}
        </Box>
    );
}

/**
 * The context menu: right-click the area (or focus it and press Shift+F10) and the menu opens at
 * the pointer, 3px right and 5px up, with the first enabled row highlighted.
 */
export const ContextMenu: Story = {
    args: {
        loop: true,
    },
    render: function ContextMenuRender(args) {
        const [last, setLast] = useState("none");
        return (
            <ContextMenuComponent {...args} target={<ContextArea last={last} />}>
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
            </ContextMenuComponent>
        );
    },
};

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
        <Stack gap={4} style={{ width: 220, height: 330 }}>
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
 * Every row state, light and dark side by side (the menu stays dark in both; only its shadow
 * follows the page): rest, hover or keyboard highlight (`data-hovered`, the state Mantine sets),
 * disabled, a shortcut, a submenu parent, a group label, checked and unchecked check rows, a
 * danger row at rest and highlighted, and icon rows.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group align="flex-start" gap={16} wrap="nowrap">
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
    // A text button keeps its rest look while its menu is open, as in Figma.
    play: ({ canvasElement }) => expectStatesApply(canvasElement, { unchanged: ['.cm-button[aria-expanded="true"]'] }),
};

/** The assertions for the context menu: Shift+F10 opens it with the first row focused. */
export const ContextMenuInteractions: Story = {
    ...ContextMenu,
    parameters: OPEN_OVERLAY,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const area = within(canvasElement).getByTestId("context-area");
        area.focus();
        await userEvent.keyboard("{Shift>}{F10}{/Shift}");
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => expect(body.getByRole("menuitem", { name: /Copy/ })).toHaveFocus());
    },
};

/**
 * Mantine's `Menu` opened from a button, the nearest alternative to a context menu: it opens 4px
 * below its trigger in one frame, arrow keys move the highlight, ArrowRight opens a submenu at
 * once, and Escape closes the stack and returns focus to the trigger.
 */
export const FromAButton: Story = {
    render: () => (
        <Box style={{ height: 240 }}>
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
};

/** The assertions for the button menu: arrows move the highlight, ArrowRight opens a submenu. */
export const FromAButtonInteractions: Story = {
    ...FromAButton,
    tags: INTERACTION_TEST_TAGS,
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
 * A menu too long for the window: clamped 6px inside it, with 24px chevron rows at each end it
 * can still scroll towards. Open it, then hover a chevron row to scroll, or type a letter to jump
 * to the next row starting with it.
 */
export const LongMenu: Story = {
    render: () => (
        <Box style={{ height: 200 }}>
            <Menu>
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
};

/** The assertions for the long menu: opened, it shows the chevron row it can scroll towards. */
export const LongMenuInteractions: Story = {
    ...LongMenu,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        await userEvent.click(within(canvasElement).getByRole("button", { name: "Object" }));
        const body = within(canvasElement.ownerDocument.body);
        await waitFor(() => expect(body.getByRole("menu")).toHaveAttribute("data-cm-scroll-down"));
    },
};
