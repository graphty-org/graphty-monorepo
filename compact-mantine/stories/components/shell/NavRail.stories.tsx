import { ActionIcon, Group, Indicator, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { NavRail, type NavRailProps, RailButton, UiGlyph } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { icons } from "./fixtures";

/**
 * The vertical navigation rail at the window's start edge: a column of captioned buttons, each
 * opening one panel of the app (files, assets, tools), with extra buttons pinned to its foot.
 *
 * ## When to use it
 *
 * Reach for `NavRail` for the app's top-level destinations, the handful of panels a reader moves
 * between all day. Reach for Mantine `Tabs` to switch views inside one panel, and for Mantine
 * `NavLink` for a longer, text-first navigation list.
 *
 * ## Usage
 *
 * ```tsx
 * import { NavRail, RailButton } from "@graphty/compact-mantine";
 *
 * const [open, setOpen] = useState("file");
 *
 * <NavRail aria-label="Navigation" footer={<ActionIcon aria-label="Updates">...</ActionIcon>}>
 *     <RailButton icon={<FileIcon />} label="File" shortcut="Alt+1"
 *         aria-expanded={open === "file"} onClick={() => setOpen("file")} />
 *     <RailButton icon={<GridIcon />} label="Assets" shortcut="Alt+2"
 *         aria-expanded={open === "assets"} onClick={() => setOpen("assets")} />
 *     <NavRail.Separator />
 *     <RailButton icon={<VariableIcon />} label="Variables" />
 * </NavRail>
 * ```
 *
 * A `RailButton` whose panel is open is marked with `aria-expanded` (or `active`, which draws the
 * same thing). The rail fills its parent's height; give the parent one.
 *
 * ## Keyboard and accessibility
 *
 * - The rail is one Tab stop (`role="toolbar"`, vertical, named "Navigation" by default).
 *   ArrowUp / ArrowDown and Home / End move between its buttons, including the footer's.
 * - Enter or Space opens a destination. Moving focus into the opened panel is the caller's job.
 * - Each button is named by its `label`, which is also its caption. The tooltip (to the end
 *   side, after 500ms, with the shortcut) is not shown on the active button.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Rail | 56 wide plus a 1px end border, padding 8 top and 16 bottom |
 * | RailButton | 56 x 56, a 32 x 32 pill (radius 5, 24px glyph) above a 9/14 caption |
 * | Active | pill `--cm-bg-selected`, brand glyph; the caption does not change |
 * | Separator | 16 x 1, 8px above and 7px below |
 * | Tooltip | end side, 6 x 12 arrow, 500ms delay |
 */
const meta: Meta<typeof NavRail> = {
    title: "Components/App shell/NavRail",
    component: NavRail,
    subcomponents: { RailButton },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NavRail>;

const DESTINATIONS = [
    { value: "file", label: "File", icon: icons.file, shortcut: "Alt+1" },
    { value: "assets", label: "Assets", icon: icons.grid, shortcut: "Alt+2" },
    { value: "tools", label: "Tools", icon: icons.toolbox },
];

/**
 * A working rail: a main-menu button, three destinations, a separator, one more destination and
 * a footer button with a notification dot.
 * @param props - NavRail props passed through from the story's args
 * @returns The rail in a 420px tall frame
 */
function Rail(props: NavRailProps): React.JSX.Element {
    const [open, setOpen] = useState("file");
    return (
        <div style={{ height: 420 }}>
            <NavRail
                {...props}
                footer={
                    // A 32px button with the 9px dot at +18,+6 (ls/rail-default #51 #56). Figma's
                    // offset is uneven, and Indicator's `offset` takes one number, so the two
                    // position variables are set through `vars`.
                    <Indicator vars={() => ({ root: { "--indicator-top": "10.5px", "--indicator-right": "9.5px" } })}>
                        <ActionIcon size="md" aria-label="Review library updates">
                            <UiGlyph name="refresh" size={16} />
                        </ActionIcon>
                    </Indicator>
                }
            >
                <ActionIcon size="md" aria-label="Main menu">
                    <UiGlyph name="more" size={16} />
                </ActionIcon>
                <NavRail.Separator />
                {DESTINATIONS.map((d) => (
                    <RailButton
                        key={d.value}
                        icon={d.icon}
                        label={d.label}
                        shortcut={d.shortcut}
                        aria-expanded={open === d.value}
                        onClick={() => {
                            setOpen(d.value);
                        }}
                    />
                ))}
                <NavRail.Separator />
                <RailButton icon={icons.variable} label="Variables" />
            </NavRail>
        </div>
    );
}

/** The rail with "File" open: click a destination to open it instead. */
export const Default: Story = {
    args: { "aria-label": "Navigation" },
    render: (args) => <Rail {...args} />,
};

/** Every RailButton state: rest, hover, pressed, active, focus, and active with focus. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Group gap={16} align="flex-start">
            {(
                [
                    ["rest", {}],
                    ["hover", { "data-state": "hover" }],
                    ["pressed", { "data-state": "press" }],
                    ["active", { active: true }],
                    ["focus", { "data-state": "focus" }],
                    ["active + focus", { active: true, "data-state": "focus" }],
                ] as const
            ).map(([name, props]) => (
                <Stack key={name} gap={4} align="center">
                    <RailButton icon={icons.grid} label="Assets" {...props} />
                    <Text size="xs">{name}</Text>
                </Stack>
            ))}
        </Group>
    ),
};

/** Keyboard: one Tab stop on the open destination; ArrowDown moves, Enter opens. */
export const Keyboard: Story = {
    ...Default,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const file = canvas.getByRole("button", { name: "File" });
        await expect(file).toHaveAttribute("tabindex", "0");
        file.focus();
        await userEvent.keyboard("{ArrowDown}");
        const assets = canvas.getByRole("button", { name: "Assets" });
        await expect(assets).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await expect(assets).toHaveAttribute("aria-expanded", "true");
        await expect(file).toHaveAttribute("aria-expanded", "false");
    },
};
