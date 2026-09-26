import { Group, Kbd, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { ShortcutSheet } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { sheetTabs } from "./fixtures";

/**
 * The keyboard shortcuts sheet: a dark panel docked along the foot of the window, with a tab
 * per topic and columns of shortcuts drawn as key caps.
 *
 * ## When to use it
 *
 * Reach for `ShortcutSheet` to show every shortcut of the app at once, opened from the help
 * menu or a key. Reach for `TooltipShortcut` (on the Tooltip page) to show one control's
 * shortcut, and for Mantine's `Kbd` to write a key in running text (`variant="inline"`).
 *
 * ## Usage
 *
 * ```tsx
 * import { ShortcutSheet, type ShortcutSheetTab } from "@graphty/compact-mantine";
 *
 * const tabs: ShortcutSheetTab[] = [
 *     {
 *         value: "tools",
 *         label: "Tools",
 *         groups: [{ shortcuts: [{ label: "Frame tool", keys: ["F"] }, { label: "Pencil", keys: ["Shift", "P"] }] }],
 *     },
 * ];
 *
 * {open && <ShortcutSheet tabs={tabs} onClose={() => setOpen(false)} />}
 * ```
 *
 * A tab holds `groups` (columns), each a list of `{ label, keys, icon?, description?,
 * highlighted? }`. `variant: "essential"` draws the numbered, larger first tab with a `caption`
 * and a description under each label. The open tab is `value` / `onChange` (controlled) or
 * `defaultValue`. Without `onClose` there is no close button. The caller positions the sheet.
 *
 * ## Keyboard and accessibility
 *
 * - Opening the sheet does not move focus into it.
 * - The tabs are a `role="tablist"`; ArrowLeft / ArrowRight and Home / End move between them and
 *   open them at once (automatic activation), swapped in right-to-left text.
 * - Escape, from a tab or the close button, calls `onClose`.
 * - The sheet is a `section` named "Keyboard shortcuts" by default; the body is the
 *   `role="tabpanel"` of the open tab.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Sheet | full width, #1e1e1e in both schemes (`color-scheme: dark`) |
 * | Tab strip | 38 tall, tabs padding 0 16, 12/38 text |
 * | Close button | 38 x 39, a 12px cross |
 * | Key cap | 31 tall, radius 2, 3px apart; lit caps #80caff |
 * | Inline key (`Kbd variant="inline"`) | 11/16, 1px border, radius 2, padding 0 4 |
 */
const meta: Meta<typeof ShortcutSheet> = {
    title: "Components/App shell/ShortcutSheet",
    component: ShortcutSheet,
    tags: ["autodocs"],
    argTypes: { tabs: { control: false } },
};

export default meta;
type Story = StoryObj<typeof ShortcutSheet>;

/** The sheet open on its "Tools" tab. */
export const Default: Story = {
    args: { tabs: sheetTabs, defaultValue: "tools", onClose: fn() },
};

/** The key caps: the list cap (sm), the essential cap (md), lit, and the inline prose cap. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
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

/** The "essential" tab: a caption, numbered columns, a description under each label, larger caps. */
export const Essential: Story = {
    args: { tabs: sheetTabs, onClose: fn() },
};

/** Keyboard: the arrows move between tabs and open them; Escape closes the sheet. */
export const Keyboard: Story = {
    args: { tabs: sheetTabs, defaultValue: "tools", onClose: fn() },
    play: async ({ canvasElement, args }) => {
        const canvas = within(canvasElement);
        canvas.getByRole("tab", { name: "Tools" }).focus();
        await userEvent.keyboard("{ArrowRight}");
        const view = canvas.getByRole("tab", { name: "View" });
        await expect(view).toHaveAttribute("aria-selected", "true");
        await expect(view).toHaveFocus();
        await userEvent.keyboard("{Escape}");
        await expect(args.onClose).toHaveBeenCalled();
    },
};
