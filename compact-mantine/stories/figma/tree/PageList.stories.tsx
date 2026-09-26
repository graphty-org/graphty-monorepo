import { Group, Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { PageList, PageRow } from "../../../src/components/tree";
import { Panel } from "./fixtures";

/**
 * The page list (design/figma-spec.md 10.2): a one-column grid of 240 x 32 cells around 224 x 24
 * pills. Arrows move focus without switching; Enter, Space or a click switches. The same row with
 * `tone="group"` is the Variables collection list.
 */
const meta: Meta<typeof PageList> = {
    title: "Figma/Tree/PageList",
    component: PageList,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof PageList>;

/** Rest, hover, current, hover on current, keyboard focus, a divider, and the group look. */
export const States: Story = {
    render: () => (
        <Group align="flex-start" gap={24}>
            <Stack gap={16}>
                <Panel label="rest, hover">
                    <div role="grid" aria-label="Rest and hover">
                        <PageRow name="LS second page" tabIndex={-1} />
                        <PageRow name="LS third page" tabIndex={-1} data-state="hover" />
                    </div>
                </Panel>
                <Panel label="current, current + hover">
                    <div role="grid" aria-label="Current">
                        <PageRow name="Page 1" current tabIndex={-1} />
                        <PageRow name="Page 1" current tabIndex={-1} data-state="hover" />
                    </div>
                </Panel>
            </Stack>
            <Stack gap={16}>
                <Panel label="keyboard focus, divider">
                    <div role="grid" aria-label="Focus and divider">
                        <PageRow name="Page 1" current tabIndex={-1} data-state="focus" />
                        <PageRow name="---" divider tabIndex={-1} />
                    </div>
                </Panel>
                <Panel label="group (collections): rest, selected">
                    <div role="grid" aria-label="Groups">
                        <PageRow name="brand" tone="group" tabIndex={-1} />
                        <PageRow name="neutrals" tone="group" selected tabIndex={-1} />
                    </div>
                </Panel>
            </Stack>
        </Group>
    ),
};

/** A working list: arrows move focus, Enter switches, F2 renames. */
export const Playground: Story = {
    render: function Render() {
        const [pages, setPages] = useState([
            { id: "p1", name: "Page 1" },
            { id: "p2", name: "LS second page" },
            { id: "d", name: "---", divider: true },
            { id: "p3", name: "LS third page" },
        ]);
        return (
            <Panel>
                <PageList
                    items={pages}
                    defaultCurrent="p1"
                    onRename={(id, name) => setPages((list) => list.map((p) => (p.id === id ? { ...p, name } : p)))}
                />
            </Panel>
        );
    },
    play: async ({ canvasElement }) => {
        const cells = within(canvasElement).getAllByRole("gridcell");
        cells[0].focus();
        await userEvent.keyboard("{ArrowDown}");
        await expect(cells[1]).toHaveFocus();
        await expect(cells[0]).toHaveAttribute("aria-current", "page");
        await userEvent.keyboard("{Enter}");
        await expect(cells[1]).toHaveAttribute("aria-current", "page");
    },
};
