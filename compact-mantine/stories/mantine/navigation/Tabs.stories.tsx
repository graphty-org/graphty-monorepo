import { Tabs, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";

import { BOTH_SCHEMES } from "../../helpers/schemes";
import { focusMarked, StateGrid } from "../../helpers/selection-states";

/**
 * Mantine's `Tabs`, themed as Figma's pill tabs, which become the default look
 * (`variant="pills"`). `variant="default"` keeps Mantine's underline tabs. Every prop is Mantine's:
 * see [Tabs on mantine.dev](https://mantine.dev/core/tabs/).
 *
 * For two to six options that set a value rather than switch a view, use `SegmentedControl`.
 *
 * ## Usage
 *
 * ```tsx
 * import { Tabs } from "@mantine/core";
 *
 * <Tabs defaultValue="design">
 *     <Tabs.List>
 *         <Tabs.Tab value="design">Design</Tabs.Tab>
 *         <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
 *     </Tabs.List>
 *     <Tabs.Panel value="design">...</Tabs.Panel>
 * </Tabs>
 * ```
 *
 * ## Keyboard and accessibility
 *
 * - A `tablist` with one Tab stop. The arrow keys move focus and select together (automatic
 *   activation) and wrap at the ends.
 * - The pointer selects on pointer-down, as Figma does.
 * - Each tab is as wide as its bold label, so selecting never shifts the row.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Tab | 24px tall, padding 0 8px, radius 5px, 11/16; tabs 4px apart |
 * | Selected | `--cm-bg-secondary`, `--cm-text`, weight 550 |
 * | Unselected | `--cm-text-secondary`, hover `--cm-bg-hover` |
 * | Row tabs (vertical) | full width, 24px tall (184px in a left nav) |
 */
const meta: Meta<typeof Tabs> = {
    title: "Themed Mantine/Navigation/Tabs",
    component: Tabs,
    tags: ["autodocs"],
    args: {
        defaultValue: "general",
    },
    argTypes: { children: { control: false } },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

/** Three pill tabs with their panels; click a tab, or focus one and use the arrow keys. */
export const Default: Story = {
    args: {
        children: (
            <>
                <Tabs.List>
                    <Tabs.Tab value="general">General</Tabs.Tab>
                    <Tabs.Tab value="messages">Messages</Tabs.Tab>
                    <Tabs.Tab value="profile">Profile</Tabs.Tab>
                </Tabs.List>
                <Tabs.Panel value="general" pt="xs">
                    <Text size="sm">General settings content</Text>
                </Tabs.Panel>
                <Tabs.Panel value="messages" pt="xs">
                    <Text size="sm">Messages content</Text>
                </Tabs.Panel>
                <Tabs.Panel value="profile" pt="xs">
                    <Text size="sm">Profile content</Text>
                </Tabs.Panel>
            </>
        ),
    },
};

/**
 * The pill tabs at rest, with hover on an unselected tab (forced with `data-cm-state`), keyboard
 * focus and a disabled tab; the vertical row tabs; and the underline variant. Light and dark side
 * by side. Keyboard focus is on the marked tab list.
 */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <StateGrid
            columns={220}
            cells={[
                [
                    "pills (default)",
                    <Tabs defaultValue="design">
                        <Tabs.List>
                            <Tabs.Tab value="design">Design</Tabs.Tab>
                            <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "hover on an unselected tab",
                    <Tabs defaultValue="design">
                        <Tabs.List>
                            <Tabs.Tab value="design">Design</Tabs.Tab>
                            <Tabs.Tab value="prototype" data-cm-state="hover">
                                Prototype
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "focus",
                    <div data-story-focus>
                        <Tabs defaultValue="design">
                            <Tabs.List>
                                <Tabs.Tab value="design">Design</Tabs.Tab>
                                <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                            </Tabs.List>
                        </Tabs>
                    </div>,
                ],
                [
                    "disabled tab",
                    <Tabs defaultValue="custom">
                        <Tabs.List>
                            <Tabs.Tab value="custom">Custom</Tabs.Tab>
                            <Tabs.Tab value="libraries" disabled>
                                Libraries
                            </Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "row tabs (vertical)",
                    <Tabs defaultValue="all" orientation="vertical" w={184}>
                        <Tabs.List w={184}>
                            <Tabs.Tab value="all">All libraries</Tabs.Tab>
                            <Tabs.Tab value="team">Team</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
                [
                    "underline (variant=default)",
                    <Tabs defaultValue="design" variant="default">
                        <Tabs.List>
                            <Tabs.Tab value="design">Design</Tabs.Tab>
                            <Tabs.Tab value="prototype">Prototype</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>,
                ],
            ]}
        />
    ),
    play: focusMarked,
};
