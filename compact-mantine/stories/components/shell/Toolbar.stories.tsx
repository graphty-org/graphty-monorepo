import { SegmentedControl, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { Toolbar, type ToolbarProps, ToolButton, ToolGroup } from "../../../src";
import { BOTH_SCHEMES } from "../../helpers/schemes";
import { frameTools, icons, moveTools, shapeTools, textTools } from "./fixtures";

/**
 * The floating editor toolbar: one bar of tools at the foot of a canvas, with tool groups that
 * open a flyout of related tools and a mode switch at the end.
 *
 * ## When to use it
 *
 * Reach for `Toolbar` when a canvas needs a set of mutually exclusive tools (move, draw a shape,
 * add text) that the reader switches between constantly. Its parts:
 *
 * | Part | What it is for |
 * |---|---|
 * | `ToolButton` | One tool (`selected` makes it the current tool) or, with `selected` left undefined, one action |
 * | `ToolGroup` | A tool plus a chevron that opens a flyout of related tools; the face shows the last one picked |
 * | `Toolbar.Divider` | A full-height rule between groups |
 * | `SegmentedControl variant="toolbar"` | The mode switch at the end (Mantine's, themed) |
 *
 * Reach for `SecondaryToolbar` for the smaller bar of a mode that is active (vector editing, an
 * image crop), and for a Mantine `Group` of `ActionIcon`s for a few actions in a panel header,
 * where a single Tab stop and a current tool mean nothing.
 *
 * ## Usage
 *
 * ```tsx
 * import { SegmentedControl } from "@mantine/core";
 * import { Toolbar, ToolButton, ToolGroup } from "@graphty/compact-mantine";
 *
 * const [tool, setTool] = useState("move");
 *
 * <Toolbar aria-label="Editor" floating>
 *     <ToolGroup label="Move tools" tools={moveTools} activeTool={tool} onToolChange={setTool} />
 *     <ToolGroup label="Shape tools" tools={shapeTools} activeTool={tool} onToolChange={setTool} />
 *     <ToolButton label="Actions" icon={<GridIcon />} shortcut="Ctrl+K" onClick={openActions} />
 *     <Toolbar.Divider />
 *     <SegmentedControl variant="toolbar" aria-label="Mode" data={modes} value={mode} onChange={setMode} />
 * </Toolbar>
 * ```
 *
 * A tool is `{ value, label, icon, shortcut? }`. `floating` pins the bar to the bottom centre of
 * the window, 12px up; leave it off to place the bar yourself.
 *
 * ## Keyboard and accessibility
 *
 * - The bar is one Tab stop (`role="toolbar"`, horizontal). Focus lands on the selected tool,
 *   or on the item that last had focus.
 * - ArrowLeft / ArrowRight move between tools, chevrons and the mode radios; Home / End jump to
 *   the ends. In right-to-left text the arrows swap. Arrows focus a mode radio without changing it.
 * - Enter or Space on a tool picks it (`aria-pressed`). On a chevron it opens the flyout, a
 *   `role="menu"` of `menuitemradio` rows with `aria-checked` on the current face. Picking a row
 *   makes it the face and moves focus there; Escape returns focus to the chevron.
 * - Each tool is named by its `label`; the tooltip repeats it with the shortcut ("Frame  F").
 *   Each group is a `role="group"` named after its face. The bar's own name defaults to the
 *   "Tools" label.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Bar | 48 tall, padding 8, gap 8, radius 13, elevation 200, no border |
 * | ToolButton | 32 x 32, padding 4, radius 5, 24px icon box |
 * | Chevron | 16 x 32, 1px after its tool (a group is 49 x 32) |
 * | Divider | 1 x 48, full height |
 * | Flyout | the dark menu, 4px above the chevron, start-aligned |
 * | `floating` | fixed, bottom 12, centred |
 */
const meta: Meta<typeof Toolbar> = {
    title: "Components/App shell/Toolbar",
    component: Toolbar,
    subcomponents: { ToolButton, ToolGroup },
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

/**
 * A working editor toolbar: four tool groups, an action, a divider and the mode switch.
 * @param props - Toolbar props passed through from the story's args
 * @returns The toolbar
 */
function EditorToolbar(props: ToolbarProps): React.JSX.Element {
    const [tool, setTool] = useState("move");
    const [mode, setMode] = useState("design");
    return (
        <Toolbar aria-label="Editor" {...props}>
            <ToolGroup label="Move tools" tools={moveTools} activeTool={tool} onToolChange={setTool} />
            <ToolGroup label="Region tools" tools={frameTools} activeTool={tool} onToolChange={setTool} />
            <ToolGroup label="Shape tools" tools={shapeTools} activeTool={tool} onToolChange={setTool} />
            <ToolGroup label="Type tools" tools={textTools} activeTool={tool} onToolChange={setTool} />
            <ToolButton label="Actions" icon={icons.grid} shortcut="Ctrl+K" />
            <Toolbar.Divider />
            <SegmentedControl
                variant="toolbar"
                aria-label="Toolbelt mode"
                value={mode}
                onChange={setMode}
                data={[
                    { value: "draw", label: icons.pen },
                    { value: "design", label: icons.frame },
                    { value: "dev", label: icons.text },
                ]}
            />
        </Toolbar>
    );
}

/**
 * The bar sits at the foot of a 320px frame, as it does on a canvas, so its tooltips and
 * flyouts open above it.
 * @param props - Component props
 * @param props.children - The toolbar
 * @returns The frame
 */
function CanvasFoot({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <div style={{ minHeight: 320, display: "flex", alignItems: "flex-end" }}>{children}</div>;
}

/**
 * The flyout a chevron opens. Mantine points the chevron's `aria-controls` at it, so a story
 * finds its own flyout even when a docs page holds several toolbars.
 * @param chevron - The group's chevron button
 * @returns The flyout menu
 */
async function flyoutOf(chevron: HTMLElement): Promise<HTMLElement> {
    const id = chevron.getAttribute("aria-controls") ?? "";
    await waitFor(() => expect(document.getElementById(id)).toBeVisible());
    return document.getElementById(id) as HTMLElement;
}

/** The whole floating toolbar: pick a tool, open a flyout, use the arrows between tools. */
export const Default: Story = {
    args: { "aria-label": "Editor", floating: false },
    render: (args) => (
        <CanvasFoot>
            <EditorToolbar {...args} />
        </CanvasFoot>
    ),
};

/** Every state of the tool button and the chevron: rest, hover, pressed, focus and open. */
export const States: Story = {
    parameters: BOTH_SCHEMES,
    render: () => (
        <Stack gap={16}>
            {(["rest", "hover", "press", "focus"] as const).map((state) => (
                <Stack key={state} gap={4}>
                    <Text size="xs">{state}: a tool, the selected tool, a group</Text>
                    <Toolbar aria-label={`Tool button ${state}`}>
                        <ToolButton label="Rectangle" icon={icons.rectangle} data-state={state} />
                        <ToolButton label="Move" icon={icons.move} selected data-state={state} />
                        <ToolGroup label="Region tools" tools={frameTools} chevronProps={{ "data-state": state }} />
                    </Toolbar>
                </Stack>
            ))}
            <Stack gap={4}>
                <Text size="xs">open: the chevron while its flyout is up</Text>
                <Toolbar aria-label="Open chevron">
                    <ToolGroup label="Region tools" tools={frameTools} chevronProps={{ "data-state": "open" }} />
                </Toolbar>
            </Stack>
        </Stack>
    ),
};

/** A flyout left open: the dark menu 4px above the chevron, start-aligned, a check on the face. */
export const FlyoutOpen: Story = {
    args: { "aria-label": "Editor" },
    render: (args) => (
        <CanvasFoot>
            <EditorToolbar {...args} />
        </CanvasFoot>
    ),
    play: async ({ canvasElement }) => {
        const chevron = within(canvasElement).getByRole("button", { name: "Shape tools" });
        await userEvent.click(chevron);
        const menu = await flyoutOf(chevron);
        await expect(menu).toHaveAttribute("role", "menu");
        await expect(within(menu).getByRole("menuitemradio", { name: /Rectangle/ })).toHaveAttribute("aria-checked", "true");
    },
};

/** Picking a flyout row selects that tool, makes it the group's face and moves focus to it. */
export const PickFromFlyout: Story = {
    args: { "aria-label": "Editor" },
    render: (args) => (
        <CanvasFoot>
            <EditorToolbar {...args} />
        </CanvasFoot>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const chevron = canvas.getByRole("button", { name: "Shape tools" });
        await userEvent.click(chevron);
        const menu = await flyoutOf(chevron);
        await userEvent.click(within(menu).getByRole("menuitemradio", { name: /Ellipse/ }));
        const face = canvas.getByRole("button", { name: "Ellipse" });
        await expect(face).toHaveAttribute("aria-pressed", "true");
        // The picked tool is now the toolbar's Tab stop (spec 11.1).
        await waitFor(() => expect(face).toHaveFocus());
        await expect(face).toHaveAttribute("tabindex", "0");
    },
};

/** Keyboard: one Tab stop on the selected tool; the arrows, Home and End move between items. */
export const Keyboard: Story = {
    args: { "aria-label": "Editor" },
    render: (args) => (
        <CanvasFoot>
            <EditorToolbar {...args} />
        </CanvasFoot>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const move = canvas.getByRole("button", { name: "Move" });
        // Only the selected tool is in the Tab order.
        await expect(move).toHaveAttribute("tabindex", "0");
        await expect(canvas.getByRole("button", { name: "Frame" })).toHaveAttribute("tabindex", "-1");
        move.focus();
        await userEvent.keyboard("{ArrowRight}");
        await expect(canvas.getByRole("button", { name: "Move tools" })).toHaveFocus();
        await userEvent.keyboard("{End}");
        const radios = canvas.getAllByRole("radio");
        await expect(radios[radios.length - 1]).toHaveFocus();
        await userEvent.keyboard("{Home}");
        await expect(move).toHaveFocus();
    },
};
