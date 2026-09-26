import { ActionIcon, Group, Indicator, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useState } from "react";

import { NavRail, RailButton, UiGlyph } from "../../../src";
import { icons } from "./fixtures";

const meta: Meta<typeof NavRail> = {
    title: "Figma/Shell/NavRail",
    component: NavRail,
};

export default meta;
type Story = StoryObj<typeof NavRail>;

const DESTINATIONS = [
    { value: "file", label: "File", icon: icons.file, shortcut: "Alt+1" },
    { value: "assets", label: "Assets", icon: icons.grid, shortcut: "Alt+2" },
    { value: "tools", label: "Tools", icon: icons.toolbox },
];

function Rail(): React.JSX.Element {
    const [open, setOpen] = useState("file");
    return (
        <div style={{ height: 420 }}>
            <NavRail
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

/** The rail: one Tab stop, ArrowUp / ArrowDown between buttons, Enter opens. */
export const Default: Story = {
    render: () => <Rail />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.tab();
        await userEvent.keyboard("{ArrowDown}");
        await expect(canvas.getByRole("button", { name: "Assets" })).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        await expect(canvas.getByRole("button", { name: "Assets" })).toHaveAttribute("aria-expanded", "true");
    },
};

/** Every RailButton state side by side. */
export const States: Story = {
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
