import { Box, Button, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { MenuGroupItem, Popout, PopoutManager } from "../../../src";

// The demo carries no play function (it would drive itself on every visit); the assertions live on
// the hidden `*Interactions` twin, still run by the test runner and the visual capture.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

/** A label's independent groups of settings, each with its own pop-over. */
const GROUPS = ["Position", "Wrap", "Badge"] as const;

/**
 * A thing with independent groups of settings (a label's Position, Wrap and Badge): its pop-out's
 * header "..." opens a menu of the groups, marking each one that is set, and picking one opens
 * that group's pop-over beside the pop-out, on the side with room, one group at a time.
 *
 * - `more` on `Popout.Panel` draws the "..." with its tooltip; `set` gives it the brand ink while
 *   a group is set and the menu is closed.
 * - `MenuGroupItem` is a menu row whose `set` draws a 5 x 5 brand dot at its end (read as
 *   "Wrap, set").
 * - `placement="beside"` opens a pop-out beside the pop-out it came from without covering it.
 */
const meta: Meta = {
    title: "Components/Overlays/Popout group menu",
    parameters: {
        layout: "fullscreen",
        docs: { story: { inline: false, height: "520px" } },
    },
    decorators: [
        (Story) => (
            <PopoutManager>
                <Story />
            </PopoutManager>
        ),
    ],
};

export default meta;
type Story = StoryObj;

/**
 * The Label pop-out and its group pop-overs.
 * @returns The story
 */
function GroupMenuDemo(): React.JSX.Element {
    const [group, setGroup] = useState<string | null>(null);
    const set = new Set<string>(["Wrap"]);
    return (
        <Box style={{ position: "absolute", top: 40, left: 360 }}>
            <Popout>
                <Popout.Trigger>
                    <Button variant="default">Label</Button>
                </Popout.Trigger>
                <Popout.Panel
                    width={240}
                    placement="bottom"
                    header={{ variant: "title", title: "Label" }}
                    more={{
                        label: "More label settings",
                        set: set.size > 0,
                        children: GROUPS.map((name) => (
                            <MenuGroupItem
                                key={name}
                                set={set.has(name)}
                                onClick={() => {
                                    setGroup(name);
                                }}
                            >
                                {name}
                            </MenuGroupItem>
                        )),
                    }}
                >
                    <Popout.Content>
                        <Text size="sm">The label's main settings.</Text>
                    </Popout.Content>
                    {GROUPS.map((name) => (
                        <Popout
                            key={name}
                            opened={group === name}
                            onOpenChange={(opened) => {
                                if (!opened) {
                                    setGroup((current) => (current === name ? null : current));
                                }
                            }}
                        >
                            <Popout.Panel
                                width={240}
                                placement="beside"
                                gap={8}
                                header={{ variant: "title", title: name }}
                            >
                                <Popout.Content>
                                    <Text size="sm">{`The label's ${name.toLowerCase()} settings.`}</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    ))}
                </Popout.Panel>
            </Popout>
        </Box>
    );
}

/** Open Label, then its "..." to see the groups; Wrap is marked set. */
export const GroupMenu: Story = {
    render: () => <GroupMenuDemo />,
};

/** Opens the menu, picks Wrap, then Badge: one group pop-over at a time, beside the Label pop-out. */
export const GroupMenuInteractions: Story = {
    ...GroupMenu,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const page = within(canvasElement.ownerDocument.body);
        await userEvent.click(page.getByRole("button", { name: "Label" }));
        const label = await page.findByRole("dialog", { name: "Label" });
        await userEvent.click(within(label).getByRole("button", { name: "More label settings" }));
        await userEvent.click(await page.findByRole("menuitem", { name: "Wrap, set" }));
        await page.findByRole("dialog", { name: "Wrap" });
        await userEvent.click(within(label).getByRole("button", { name: "More label settings" }));
        await userEvent.click(await page.findByRole("menuitem", { name: "Badge" }));
        const badge = await page.findByRole("dialog", { name: "Badge" });
        await waitFor(() => {
            expect(page.queryByRole("dialog", { name: "Wrap" })).toBeNull();
            expect(badge.hasAttribute("data-cm-repositioning")).toBe(false);
        });
        const a = label.getBoundingClientRect();
        const b = badge.getBoundingClientRect();
        expect(b.right).toBeLessThanOrEqual(a.left);
    },
};
