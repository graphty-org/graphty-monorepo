import { Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import { InlineRename } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { Panel } from "./fixtures";

/**
 * A name edited in place: the outlined field that replaces a layer, page or collection name
 * while it is renamed.
 *
 * ## When to use it
 *
 * `Tree` and `PageList` already open an InlineRename on F2 or a double-click when you pass
 * `onRename`, so most readers never place one by hand. Reach for it directly when a row of your
 * own (a card title, a tab) needs the same rename-in-place behavior. Reach for `PanelField` or
 * Mantine `TextInput` when the name is a field that is always editable, not a label that turns
 * into a field for a moment.
 *
 * ## Usage
 *
 * ```tsx
 * import { InlineRename } from "@graphty/compact-mantine";
 *
 * {renaming ? (
 *     <InlineRename
 *         value={name}
 *         label="Layer name"
 *         onCommit={(next) => { setName(next); setRenaming(false); }}
 *         onCancel={() => setRenaming(false)}
 *     />
 * ) : (
 *     <span onDoubleClick={() => setRenaming(true)}>{name}</span>
 * )}
 * ```
 *
 * Mount it only while renaming: it takes focus and selects the whole name when it mounts.
 *
 * ## Keyboard and accessibility
 *
 * - Opens focused with the whole name selected.
 * - Enter commits and Escape cancels; both hand focus back to whatever held it before the field
 *   opened, the row it came from. Leaving any other way (a click elsewhere, Tab) commits and
 *   lets focus go where it was sent.
 * - A text field named by `label` (default "Name").
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Height | 24px |
 * | Width | 176px in a layer row, 224px in a page row; fills its slot by default |
 * | Border | 1px focus blue, radius 5 |
 * | Text | 11px on a 16px line, weight 450, 7px start padding |
 */
const meta: Meta<typeof InlineRename> = {
    title: "Components/Lists and trees/InlineRename",
    component: InlineRename,
    tags: ["autodocs"],
    parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof InlineRename>;

/**
 * The field at a layer row's width. Type a new name and press Enter: `onCommit` reports it. Escape cancels.
 */
export const Default: Story = {
    args: {
        value: "Boolean union",
        label: "Layer name",
        width: 176,
        onCommit: fn(),
        onCancel: fn(),
    },
    render: (args) => (
        <Panel>
            <div style={{ padding: "4px 0 4px 56px", height: 32, boxSizing: "border-box" }}>
                <InlineRename {...args} />
            </div>
        </Panel>
    ),
    play: async ({ canvasElement, args }) => {
        const field = within(canvasElement).getByRole("textbox", { name: "Layer name" });
        field.focus();
        await userEvent.keyboard("{Control>}a{/Control}Union{Enter}");
        await expect(args.onCommit).toHaveBeenCalledWith("Union");
    },
};

/** The layer width (176) and the page width (224), light and dark side by side. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={16}>
            <Panel label="layer (176 wide)">
                <div style={{ padding: "4px 0 4px 56px", height: 32, boxSizing: "border-box" }}>
                    <InlineRename value="Boolean union" onCommit={() => undefined} label="Layer name" width={176} />
                </div>
            </Panel>
            <Panel label="page (224 wide)">
                <div style={{ padding: "4px 8px", height: 32, boxSizing: "border-box" }}>
                    <InlineRename value="Page 1" onCommit={() => undefined} label="Page name" />
                </div>
            </Panel>
        </Stack>
    ),
};

/** Escape abandons the edit: `onCancel` is called and `onCommit` is not. */
export const EscapeCancels: Story = {
    args: {
        value: "Boolean union",
        label: "Layer name",
        width: 176,
        onCommit: fn(),
        onCancel: fn(),
    },
    render: Default.render,
    play: async ({ canvasElement, args }) => {
        const field = within(canvasElement).getByRole("textbox", { name: "Layer name" });
        field.focus();
        await userEvent.keyboard("Something else{Escape}");
        await expect(args.onCancel).toHaveBeenCalled();
        await expect(args.onCommit).not.toHaveBeenCalled();
    },
};
