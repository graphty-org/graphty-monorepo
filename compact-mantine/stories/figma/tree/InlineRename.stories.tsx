import { Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";

import { InlineRename } from "../../../src/components/tree";
import { Panel } from "./fixtures";

/**
 * A name edited in place (design/figma-spec.md 10.3): 24 tall, the panel ground, a 1px focus-blue
 * border, radius 5, the whole name selected. Enter commits and Escape cancels, handing focus back
 * to where it came from; leaving the field commits.
 */
const meta: Meta<typeof InlineRename> = {
    title: "Figma/Tree/InlineRename",
    component: InlineRename,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof InlineRename>;

/** The layer width (176) and the page width (224). */
export const States: Story = {
    render: function Render() {
        const [name, setName] = useState("Boolean union");
        return (
            <Stack gap={16}>
                <Panel label="layer (176 wide)">
                    <div style={{ padding: "4px 0 4px 56px", height: 32, boxSizing: "border-box" }}>
                        <InlineRename value={name} onCommit={setName} label="Layer name" width={176} />
                    </div>
                </Panel>
                <Panel label="page (224 wide)">
                    <div style={{ padding: "4px 8px", height: 32, boxSizing: "border-box" }}>
                        <InlineRename value="Page 1" onCommit={() => undefined} label="Page name" />
                    </div>
                </Panel>
                <Text size="xs">Committed: {name}</Text>
            </Stack>
        );
    },
    play: async ({ canvasElement }) => {
        const field = within(canvasElement).getByRole("textbox", { name: "Layer name" });
        field.focus();
        await userEvent.keyboard("{Control>}a{/Control}Union{Enter}");
        await expect(within(canvasElement).getByText("Committed: Union")).toBeVisible();
    },
};
