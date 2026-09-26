import { Group } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { UiGlyph } from "../../../src";
import { ResultRow } from "../../../src/components/tree";
import { Panel } from "./fixtures";

/**
 * A find result (design/figma-spec.md 10.4): 240 x 52 with a path line, 34 without. The current
 * result is blue, hover is grey, component results are purple, and the matched text is 600.
 */
const meta: Meta<typeof ResultRow> = {
    title: "Figma/Tree/ResultRow",
    component: ResultRow,
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ResultRow>;

const rect = <UiGlyph name="rectangle" size={10} />;

/** Current, rest, hover, a match, a component, and a one-line result. */
export const States: Story = {
    render: () => (
        <Group align="flex-start">
            <Panel label="current, rest, hover, component, one line">
                <div role="listbox" aria-label="Results">
                    <ResultRow id="r1" name="Deepest rect" match="rect" path="left-sidebar" icon={rect} current />
                    <ResultRow id="r2" name="Rectangle" match="rect" path="left-sidebar" icon={rect} />
                    <ResultRow id="r3" name="bt-rect" match="rect" path="bottom-toolbar" icon={rect} data-state="hover" />
                    <ResultRow
                        id="r4"
                        name="Rectangle 3"
                        match="rect"
                        path="buttons-and-controls"
                        tone="component"
                        icon={<UiGlyph name="component" size={16} />}
                    />
                    <ResultRow id="r5" name="Only a name" icon={rect} />
                </div>
            </Panel>
        </Group>
    ),
};
