import {
    ActionIcon,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    ColorInput,
    Group,
    HoverCard,
    Menu,
    MultiSelect,
    NumberInput,
    Popover,
    Select,
    Stack,
    TagsInput,
    Text,
    Tooltip,
} from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useEffect, useRef, useState } from "react";

import {
    CompactColorInput,
    ControlGroup,
    GradientEditor,
    InfoCircle,
    Popout,
    POPOUT_NESTED_GAP,
    PopoutButton,
    PopoutManager,
    PopoutRegion,
    StyleNumberInput,
    StyleSelect,
    ToggleWithContent,
    UiGlyph,
    usePopoutManager,
    usePopoutRegion,
} from "../../../src";
import { LabelSettingsPopout } from "../../../src/components/popout/examples/LabelSettingsPopout";
import { PopoutAnchor } from "../../../src/components/popout/PopoutAnchor";
import { PopoutPanel } from "../../../src/components/popout/PopoutPanel";
import { PopoutTrigger } from "../../../src/components/popout/PopoutTrigger";
import { BOTH_SCHEMES } from "../../helpers/schemes";

// Components come from "../../../src", the package's published entry point, so a story stops
// compiling if an export is dropped. The parts reached as `Popout.Panel`, `Popout.Trigger` and
// `Popout.Anchor` are imported from their own modules only to name them in `subcomponents`, which
// gives each its own props table. LabelSettingsPopout is a worked example, not an export.

// Demo stories carry no play function: Storybook runs one as soon as a story loads, so a demo
// that drove itself opened and closed its own panel on every visit. The assertions live on the
// `*Interactions` twins, tagged INTERACTION_TEST_TAGS: hidden from the sidebar and the docs page,
// still run by the test runner and Chromatic.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

// On the docs page every story renders in its own iframe (docs.story.inline false). Inline, a
// story sits inside Storybook's zoom wrapper, which carries a CSS transform, and a transformed
// ancestor moves the panels' position: fixed box, so open panels drew away from their triggers.

/**
 * A floating, draggable, non-modal panel that opens beside the control that asked for it: the
 * place for the settings a 240px panel column has no room for.
 *
 * ## When to use it
 *
 * | Reach for | When |
 * |---|---|
 * | `Popout` | Settings that belong to something on screen and should float beside it, while the page stays live. Panels can be dragged, can nest (a panel opened from a panel steps out from it), and share one set of dismissal rules |
 * | Mantine `Popover` | A one-off bubble that is not dragged and never opens another from inside it. It is drawn with the same light shell (see `LightPopoverSurfaces`), but it has its own dismissal rules, so avoid mixing the two on one screen |
 * | `InfoCircle` | An explanation of one name, opened by hover, focus or tap |
 * | Mantine `Modal` | A task that must be finished or cancelled before the page can be used again |
 *
 * ## Usage
 *
 * Put one `PopoutManager` near the root of the app, above anything that opens a pop-out.
 *
 * ```tsx
 * import { Popout, PopoutButton, PopoutManager, UiGlyph } from "@graphty/compact-mantine";
 *
 * <PopoutManager>
 *     <Popout>
 *         <Popout.Trigger>
 *             <PopoutButton icon={<UiGlyph name="gear" />} aria-label="Stroke settings" />
 *         </Popout.Trigger>
 *         <Popout.Panel width={240} header={{ variant: "title", title: "Stroke settings" }}>
 *             <Popout.Content>...</Popout.Content>
 *         </Popout.Panel>
 *     </Popout>
 * </PopoutManager>
 * ```
 *
 * The parts: `Popout.Trigger` wraps the one button that opens the panel; `Popout.Panel` is the
 * panel (a width, a title or tab header, its content); `Popout.Content` pads what goes inside;
 * `Popout.Anchor` wraps a sidebar so every panel inside it meets the sidebar's edge. Pass
 * `opened` and `onOpenChange` to drive a pop-out from your own state.
 *
 * Two more pieces sit beside `PopoutManager` (see `RegionsAndCloseAll`):
 *
 * - `usePopoutManager()` returns `closeAll()` and `hasOpenPopouts()`. A click outside already
 *   closes every pop-out; call `closeAll` when something else replaces the page -- a keyboard
 *   shortcut, a command palette row, a full-page settings sheet.
 * - `PopoutRegion id="..."` names a part of the shell (a panel, an inspector), and
 *   `usePopoutRegion()` reads that name from anywhere inside it, including inside a pop-out opened
 *   there. It does not limit which pop-outs open together: one root pop-out is open at a time
 *   everywhere.
 *
 * ## Keyboard and accessibility
 *
 * - The panel is a `dialog` with `aria-modal="false"`, named by its title (or by `label` when it
 *   has no header). The trigger carries `aria-haspopup="dialog"`, `aria-expanded` and
 *   `aria-controls`.
 * - Opening moves focus into the panel (to the element marked `data-autofocus` when there is
 *   one); closing returns it to the trigger. Turn this off with `manageFocus={false}` for a panel
 *   that opens on hover.
 * - Escape closes the innermost open panel. A click outside closes every panel. Opening a panel
 *   closes its siblings, and closing a panel closes everything opened from it.
 * - A tabbed header is a `tablist`; the tab that was chosen resets to the first on reopen.
 * - `Popout.Trigger` adds no keyboard handling of its own: give it a real button.
 *
 * ## Measurements
 *
 * | Part | Value |
 * |---|---|
 * | Width | 240px default (216 style pickers, 304 create dialogs, 280 edit variable); content wider than `width` widens the panel |
 * | Surface | `--cm-bg`, radius 13px, elevation 400, no border |
 * | Header | 40px tall (48 with a select), 1px divider; the whole header is the drag handle |
 * | Title | 11/16 weight 550, text 16px from the edge |
 * | Close | 24 x 24 ghost icon button, 8px from the top and the end |
 * | Body | 16px from the divider to the first control and from the last to the bottom; rows 32px |
 * | Placement | Start side of its anchor, flush (`POPOUT_GAP` 0), top level with the row that opened it; a child docks flush to its parent (`POPOUT_NESTED_GAP` 0) |
 */
const meta: Meta<typeof Popout> = {
    title: "Components/Overlays/Popout",
    component: Popout,
    subcomponents: {
        "Popout.Panel": PopoutPanel,
        "Popout.Trigger": PopoutTrigger,
        "Popout.Anchor": PopoutAnchor,
        PopoutManager,
        PopoutRegion,
    },
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
type Story = StoryObj<typeof Popout>;

/**
 * A sidebar with one pop-out, the arrangement most panels use: the panel's end edge meets the
 * sidebar's start edge, level with the row that opened it. Drag the header to move it.
 */
export const Default: Story = {
    args: {
        defaultOpened: false,
    },
    render: function DefaultRender(args) {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--cm-bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text c="dimmed">Main Content Area</Text>
                </Box>

                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--cm-bg)",
                        borderInlineStart: "1px solid var(--cm-border)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Popout {...args}>
                        <ControlGroup
                            label="Test"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton icon={<UiGlyph name="gear" size={12} />} aria-label="Open settings" />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Sidebar controls would go here
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={280}
                            header={{ variant: "title", title: "Settings" }}
                            anchorX={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                        >
                            <Popout.Content>
                                <Text size="xs">Panel content goes here</Text>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </Box>
            </Box>
        );
    },
};

/** Two panel rows: a label column and a 24px field, as Figma's stroke settings. */
function Rows(): React.JSX.Element {
    return (
        <Stack gap={8}>
            <Group gap={8} wrap="nowrap">
                <Text size="sm" c="var(--cm-text-secondary)" w={72}>
                    Width
                </Text>
                <NumberInput aria-label="Width" defaultValue={1} w={120} />
            </Group>
            <Group gap={8} wrap="nowrap">
                <Text size="sm" c="var(--cm-text-secondary)" w={72}>
                    Offset
                </Text>
                <NumberInput aria-label="Offset" defaultValue={0} w={120} />
            </Group>
        </Stack>
    );
}

/**
 * A column holding one open overlay below its trigger. Each column has its own manager, which is
 * the only way two root pop-outs can be seen at once (inside one manager, opening one closes the
 * other).
 * @param props - the caption and the overlay
 * @param props.caption - what the column shows
 * @param props.children - the overlay
 * @returns the column
 */
function Column({ caption, children }: { caption: string; children: React.ReactNode }): React.JSX.Element {
    return (
        <Stack gap={8} style={{ width: 256, height: 240 }}>
            <Text size="sm" c="dimmed">
                {caption}
            </Text>
            <PopoutManager>{children}</PopoutManager>
        </Stack>
    );
}

/**
 * Every state, light and dark side by side: the closed trigger, an open panel with a title header
 * (its trigger in the open look), and an open panel with pill tabs in the title slot.
 */
export const States: Story = {
    parameters: { ...BOTH_SCHEMES, layout: "padded", docs: { story: { height: "720px" } } },
    render: () => (
        <Group align="flex-start" gap={24} wrap="nowrap">
            <Column caption="Closed">
                <Popout>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="settings" size={12} />} aria-label="Fill settings" />
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "Fill settings" }}>
                        <Popout.Content>
                            <Rows />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Column>
            <Column caption="Title header, trigger open">
                <Popout defaultOpened>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="settings" size={12} />} aria-label="Stroke settings" />
                    </Popout.Trigger>
                    <Popout.Panel
                        width={240}
                        placement="bottom"
                        anchorX="trigger"
                        manageFocus={false}
                        header={{ variant: "title", title: "Stroke settings" }}
                    >
                        <Popout.Content>
                            <Rows />
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Column>
            <Column caption="Pill tabs in the title slot">
                <Popout defaultOpened>
                    <Popout.Trigger>
                        <PopoutButton icon={<UiGlyph name="settings" size={12} />} aria-label="Type settings" />
                    </Popout.Trigger>
                    <Popout.Panel
                        width={240}
                        placement="bottom"
                        anchorX="trigger"
                        manageFocus={false}
                        header={{
                            variant: "tabs",
                            tabs: [
                                { id: "basics", label: "Basics", content: <Box p={16}>Basics</Box> },
                                { id: "details", label: "Details", content: <Box p={16}>Details</Box> },
                                { id: "variable", label: "Variable", content: <Box p={16}>Variable</Box> },
                            ],
                        }}
                    />
                </Popout>
            </Column>
        </Group>
    ),
};

/**
 * The light popover shell is shared: Mantine's own `Popover` and `HoverCard` dropdowns and the
 * `InfoCircle` bubble are drawn like a pop-out panel (radius 13, elevation 400, no border), in
 * light and dark. Held open and rendered in place.
 */
export const LightPopoverSurfaces: Story = {
    parameters: { ...BOTH_SCHEMES, layout: "padded", docs: { story: { height: "720px" } } },
    render: () => (
        <Group align="flex-start" gap={24} wrap="nowrap">
            <Column caption="Mantine Popover and HoverCard">
                <Stack gap={64} align="flex-start">
                    <Popover opened withinPortal={false} position="bottom-start">
                        <Popover.Target>
                            <Button variant="default">Popover</Button>
                        </Popover.Target>
                        <Popover.Dropdown>
                            <Text size="sm">Popover content</Text>
                        </Popover.Dropdown>
                    </Popover>
                    <HoverCard initiallyOpened withinPortal={false} position="bottom-start">
                        <HoverCard.Target>
                            <Button variant="default">HoverCard</Button>
                        </HoverCard.Target>
                        <HoverCard.Dropdown>
                            <Text size="sm">HoverCard content</Text>
                        </HoverCard.Dropdown>
                    </HoverCard>
                </Stack>
            </Column>
            <Column caption="InfoCircle (open)">
                <Group gap={4}>
                    <Text size="sm">Resolution</Text>
                    <InfoCircle label="Resolution" defaultOpened>
                        Higher resolution finds more, smaller communities.
                    </InfoCircle>
                </Group>
            </Column>
        </Group>
    ),
};

/** The assertions for the default pop-out: ARIA wiring, the drag handle, close and reopen. */
export const DefaultInteractions: Story = {
    ...Default,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        const trigger = canvas.getByLabelText("Open settings");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

        await userEvent.click(trigger);

        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();
        await expect(canvas.getByText("Settings")).toBeVisible();
        await expect(canvas.getByText("Panel content goes here")).toBeVisible();

        await expect(panel).toHaveAttribute("aria-modal", "false");
        await expect(panel).toHaveAttribute("aria-labelledby");
        await expect(panel).toHaveAttribute("id");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);

        // The header is the drag handle
        const dragTrigger = panel.querySelector("[data-drag-trigger]");
        await expect(dragTrigger).toBeInTheDocument();

        const initialLeft = panel.style.left;
        const initialTop = panel.style.top;

        await userEvent.click(canvas.getByLabelText("Close panel"));
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        // Reopen: the panel comes back where it started
        await userEvent.click(canvas.getByLabelText("Open settings"));
        const reopenedPanel = await canvas.findByRole("dialog");
        await expect(reopenedPanel.style.left).toBe(initialLeft);
        await expect(reopenedPanel.style.top).toBe(initialTop);

        await userEvent.click(canvas.getByLabelText("Close panel"));
    },
};

/**
 * The two anchors, side by side. Each row opens a panel anchored differently on the horizontal
 * axis, and every one opens level with its own row:
 * - **panel**: flush with the sidebar's edge, whichever row opened it
 * - **trigger**: beside the button itself
 * - **parent**: a panel opened from inside a panel steps out from that panel
 */
export const AnchorAxes: Story = {
    render: function AnchorAxesRender() {
        return (
            <Popout.Anchor>
                <Box
                    style={{
                        marginInlineStart: "auto",
                        width: 240,
                        height: "100vh",
                        padding: 8,
                        backgroundColor: "var(--cm-bg)",
                        borderInlineStart: "1px solid var(--cm-border)",
                    }}
                >
                    <Stack gap="xs">
                        <Text size="xs" c="dimmed">
                            Each row opens a panel level with itself.
                        </Text>

                        <Popout>
                            <Group justify="space-between">
                                <Text size="xs">Flush with the sidebar</Text>
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open panel-anchored settings"
                                    />
                                </Popout.Trigger>
                            </Group>
                            <Popout.Panel
                                width={240}
                                header={{ variant: "title", title: "Anchored to the sidebar" }}
                                anchorX="panel"
                                gap={-1}
                            >
                                <Popout.Content>
                                    <Text size="xs">
                                        The default inside a Popout.Anchor: the panel meets the sidebar edge,
                                        level with the row that opened it.
                                    </Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>

                        <Popout>
                            <Group justify="space-between">
                                <Text size="xs">Beside the button</Text>
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="pin" size={12} />}
                                        aria-label="Open trigger-anchored settings"
                                    />
                                </Popout.Trigger>
                            </Group>
                            <Popout.Panel
                                width={240}
                                header={{ variant: "title", title: "Anchored to the button" }}
                                anchorX="trigger"
                                gap={8}
                            >
                                <Popout.Content>
                                    <Text size="xs">
                                        anchorX=&quot;trigger&quot; ignores the sidebar and opens beside the
                                        button instead.
                                    </Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>

                        <Popout>
                            <Group justify="space-between">
                                <Text size="xs">Nested stack</Text>
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="copy" size={12} />}
                                        aria-label="Open nested stack"
                                    />
                                </Popout.Trigger>
                            </Group>
                            <Popout.Panel width={240} header={{ variant: "title", title: "Level one" }} gap={-1}>
                                <Popout.Content>
                                    <Stack gap="xs">
                                        <Text size="xs">
                                            Open the next level: it steps out from this panel, not from the
                                            sidebar.
                                        </Text>
                                        <Popout>
                                            <Popout.Trigger>
                                                <Button
                                                    size="compact-sm"
                                                    variant="light"
                                                    rightSection={<UiGlyph name="chevronRight" size={14} />}
                                                    aria-label="Open level two"
                                                >
                                                    Level two
                                                </Button>
                                            </Popout.Trigger>
                                            <Popout.Panel width={220} header={{ variant: "title", title: "Level two" }}>
                                                <Popout.Content>
                                                    <Stack gap="xs">
                                                        <Text size="xs">And again, one level further out.</Text>
                                                        <Popout>
                                                            <Popout.Trigger>
                                                                <Button
                                                                    size="compact-sm"
                                                                    variant="light"
                                                                    rightSection={
                                                                        <UiGlyph name="chevronRight" size={14} />
                                                                    }
                                                                    aria-label="Open level three"
                                                                >
                                                                    Level three
                                                                </Button>
                                                            </Popout.Trigger>
                                                            <Popout.Panel
                                                                width={200}
                                                                header={{ variant: "title", title: "Level three" }}
                                                            >
                                                                <Popout.Content>
                                                                    <Text size="xs">
                                                                        Each level lines up with the one it
                                                                        opened from.
                                                                    </Text>
                                                                </Popout.Content>
                                                            </Popout.Panel>
                                                        </Popout>
                                                    </Stack>
                                                </Popout.Content>
                                            </Popout.Panel>
                                        </Popout>
                                    </Stack>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Stack>
                </Box>
            </Popout.Anchor>
        );
    },
};

/**
 * The assertions for the two anchors: each panel meets the edge it names, and each opens level
 * with its own trigger.
 */
export const AnchorAxesInteractions: Story = {
    ...AnchorAxes,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const sidebar = canvasElement.querySelector("div[style*='100vh']");
        await expect(sidebar).toBeTruthy();
        const sidebarRect = (sidebar as HTMLElement).getBoundingClientRect();

        // Anchored to the sidebar: the panel's right edge meets the sidebar's left edge, and its
        // top meets its own trigger's top.
        const panelTrigger = canvas.getByLabelText("Open panel-anchored settings");
        await userEvent.click(panelTrigger);
        const anchoredPanel = await canvas.findByRole("dialog");
        const anchoredRect = anchoredPanel.getBoundingClientRect();
        await expect(Math.round(anchoredRect.right)).toBe(Math.round(sidebarRect.left) + 1);
        await expect(Math.round(anchoredRect.top)).toBe(Math.round(panelTrigger.getBoundingClientRect().top));

        // Anchored to its own trigger: the panel sits beside the button.
        const triggerAnchored = canvas.getByLabelText("Open trigger-anchored settings");
        await userEvent.click(triggerAnchored);
        const besidePanel = await canvas.findByRole("dialog");
        const besideRect = besidePanel.getBoundingClientRect();
        const buttonRect = triggerAnchored.getBoundingClientRect();
        await expect(Math.round(besideRect.right)).toBe(Math.round(buttonRect.left) - 8);
        await expect(Math.round(besideRect.top)).toBe(Math.round(buttonRect.top));

        // Nested: each level docks flush to the start of the panel it opened from
        // (POPOUT_NESTED_GAP, design/figma-spec.md 8.4).
        await userEvent.click(canvas.getByLabelText("Open nested stack"));
        const levelOne = await canvas.findByRole("dialog");
        const levelOneRect = levelOne.getBoundingClientRect();

        await userEvent.click(canvas.getByLabelText("Open level two"));
        const levelTwo = canvas.getAllByRole("dialog").find((panel) => panel !== levelOne);
        await expect(levelTwo).toBeTruthy();
        const levelTwoRect = (levelTwo as HTMLElement).getBoundingClientRect();
        await expect(Math.round(levelTwoRect.right)).toBe(Math.round(levelOneRect.left) - POPOUT_NESTED_GAP);
    },
};

/** A bordered 240px box standing in for a sidebar. */
const SIDEBAR_BOX = {
    backgroundColor: "var(--cm-bg)",
    border: "1px solid var(--cm-border)",
    borderRadius: 8,
} as const;

/**
 * `Popout.Anchor` on a sidebar: every panel opened inside it meets the sidebar's edge, and each
 * still opens level with its own row. No per-panel wiring.
 */
export const AnchorToPanel: Story = {
    parameters: { layout: "centered" },
    render: function AnchorToPanelRender() {
        return (
            <Popout.Anchor>
                <Box w={260} p="sm" style={SIDEBAR_BOX}>
                    <Stack gap="xs">
                        <Text size="sm" fw={500} mb="xs">
                            Settings Panel
                        </Text>

                        <Popout>
                            <ControlGroup
                                label="Display"
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<UiGlyph name="gear" size={12} />}
                                            aria-label="Open display settings"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    Configure display options
                                </Text>
                            </ControlGroup>
                            <Popout.Panel width={220} header={{ variant: "title", title: "Display Settings" }} placement="left">
                                <Popout.Content>
                                    <Text size="sm">The panel meets the sidebar edge.</Text>
                                    <Text size="xs" c="dimmed">
                                        It opens level with the row it came from.
                                    </Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>

                        <Popout>
                            <ControlGroup
                                label="Advanced"
                                actions={
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<UiGlyph name="chevronRight" size={12} />}
                                            aria-label="Open advanced settings"
                                        />
                                    </Popout.Trigger>
                                }
                            >
                                <Text size="xs" c="dimmed" p="sm">
                                    Advanced configuration
                                </Text>
                            </ControlGroup>
                            <Popout.Panel width={220} header={{ variant: "title", title: "Advanced" }} placement="left">
                                <Popout.Content>
                                    <Text size="sm">All pop-outs in this sidebar align to the same anchor.</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Stack>
                </Box>
            </Popout.Anchor>
        );
    },
};

/**
 * `Popout.Anchor` on a single control: the panel lines up with the edge of the anchored element
 * (here a toolbar group) rather than with the button inside it.
 */
export const AnchorToButton: Story = {
    parameters: { layout: "centered" },
    render: function AnchorToButtonRender() {
        return (
            <Stack gap="xs" align="center">
                <Text size="xs" c="dimmed">
                    The panel opens below the group, aligned with its end edge
                </Text>
                <Popout.Anchor>
                    <Group gap={4} p={4} style={SIDEBAR_BOX}>
                        <Button variant="default">Align</Button>
                        <Popout>
                            <Popout.Trigger>
                                <Button variant="default" rightSection={<UiGlyph name="chevronDown" size={12} />}>
                                    More options
                                </Button>
                            </Popout.Trigger>
                            <Popout.Panel
                                width={200}
                                header={{ variant: "title", title: "Options" }}
                                placement="bottom"
                                alignment="end"
                                gap={4}
                            >
                                <Popout.Content>
                                    <Text size="sm">The panel extends from the group&apos;s edge.</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Group>
                </Popout.Anchor>
            </Stack>
        );
    },
};

/**
 * With and without `Popout.Anchor`. Without it, the panel opens beside its trigger, offset by
 * `gap`. With it, the panel opens against the container's edge.
 */
export const WithAndWithoutAnchor: Story = {
    parameters: { layout: "centered" },
    render: function WithAndWithoutAnchorRender() {
        return (
            <Group gap={160} align="flex-start" wrap="nowrap">
                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        Without Anchor
                    </Text>
                    <Box w={200} p="sm" style={SIDEBAR_BOX}>
                        <Popout>
                            <Group justify="space-between">
                                <Text size="xs">Settings</Text>
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open without anchor"
                                    />
                                </Popout.Trigger>
                            </Group>
                            <Popout.Panel width={140} header={{ variant: "title", title: "Settings" }} placement="left" gap={8}>
                                <Popout.Content>
                                    <Text size="sm">Beside the button</Text>
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </Box>
                </Box>

                <Box>
                    <Text size="sm" fw={500} mb="xs">
                        With Anchor
                    </Text>
                    <Popout.Anchor>
                        <Box w={200} p="sm" style={SIDEBAR_BOX}>
                            <Popout>
                                <Group justify="space-between">
                                    <Text size="xs">Settings</Text>
                                    <Popout.Trigger>
                                        <PopoutButton
                                            icon={<UiGlyph name="gear" size={12} />}
                                            aria-label="Open with anchor"
                                        />
                                    </Popout.Trigger>
                                </Group>
                                <Popout.Panel width={140} header={{ variant: "title", title: "Settings" }} placement="left">
                                    <Popout.Content>
                                        <Text size="sm">Flush with the container</Text>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Box>
                    </Popout.Anchor>
                </Box>
            </Group>
        );
    },
};

/** A panel whose header is a strip of tabs. Reopening the panel starts from the first tab. */
export const Tabbed: Story = {
    render: function TabbedRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--cm-bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text c="dimmed">Main Content Area</Text>
                </Box>

                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--cm-bg)",
                        borderInlineStart: "1px solid var(--cm-border)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Popout>
                        <ControlGroup
                            label="Label Settings"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open tabbed settings"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Click the pop-out button to see tabbed settings
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={300}
                            anchorX={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                            header={{
                                variant: "tabs",
                                tabs: [
                                    {
                                        id: "general",
                                        label: "General",
                                        content: (
                                            <Popout.Content>
                                                <ToggleWithContent label="Show labels" defaultChecked>
                                                    <StyleNumberInput
                                                        label="Font size"
                                                        defaultValue={12}
                                                        min={8}
                                                        max={24}
                                                        step={1}
                                                        suffix="px"
                                                    />
                                                    <Checkbox label="Bold text" />
                                                </ToggleWithContent>
                                            </Popout.Content>
                                        ),
                                    },
                                    {
                                        id: "advanced",
                                        label: "Advanced",
                                        content: (
                                            <Popout.Content>
                                                <Checkbox label="Debug mode" />
                                                <NumberInput label="Max labels" defaultValue={100} min={0} max={1000} mt="xs" />
                                                <Text size="xs" c="dimmed" mt="xs">
                                                    Warning: These settings are for advanced users.
                                                </Text>
                                            </Popout.Content>
                                        ),
                                    },
                                    {
                                        id: "about",
                                        label: "About",
                                        content: (
                                            <Popout.Content>
                                                <Text size="xs" fw={500}>
                                                    Label Settings
                                                </Text>
                                                <Text size="xs" c="dimmed">
                                                    Version 1.0.0
                                                </Text>
                                            </Popout.Content>
                                        ),
                                    },
                                ],
                            }}
                        />
                    </Popout>
                </Box>
            </Box>
        );
    },
};

/** The assertions for the tabbed pop-out. */
export const TabbedInteractions: Story = {
    ...Tabbed,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        const trigger = canvas.getByLabelText("Open tabbed settings");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

        await userEvent.click(trigger);

        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();

        await expect(panel).toHaveAttribute("aria-modal", "false");
        await expect(panel).toHaveAttribute("aria-labelledby");
        await expect(panel).toHaveAttribute("id");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);

        // Three tabs in the header strip (a tablist, design/figma-spec.md 5.1)
        await expect(canvas.getByRole("tab", { name: "General" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "Advanced" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "About" })).toBeInTheDocument();

        const generalOption = canvas.getByRole("tab", { name: "General" });
        await expect(generalOption).toHaveAttribute("aria-selected", "true");

        // Switching tabs and reopening returns to the first tab
        await userEvent.click(canvas.getByRole("tab", { name: "About" }));
        await expect(canvas.getByRole("tab", { name: "About" })).toHaveAttribute("aria-selected", "true");
        await userEvent.click(canvas.getByLabelText("Close panel"));
        await userEvent.click(trigger);
        await expect(await canvas.findByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");

        await userEvent.click(canvas.getByLabelText("Close panel"));
    },
};

/**
 * One root pop-out at a time, as in Figma: open the fill settings, then the stroke settings, and
 * the first closes. Inside the stroke settings, "Create style" opens a child docked flush to its
 * start edge, which is allowed to stay open beside its parent.
 */
export const OneAtATime: Story = {
    render: () => (
        <Popout.Anchor>
            <Box
                style={{
                    position: "absolute",
                    insetInlineEnd: 0,
                    top: 0,
                    bottom: 0,
                    width: 240,
                    borderInlineStart: "1px solid var(--cm-border)",
                    padding: 16,
                }}
            >
                <Stack gap={8}>
                    {(["Fill", "Stroke"] as const).map((name) => (
                        <Group key={name} justify="space-between">
                            <Text size="sm">{name}</Text>
                            <Popout>
                                <Popout.Trigger>
                                    <PopoutButton icon={<UiGlyph name="settings" size={12} />} aria-label={`${name} settings`} />
                                </Popout.Trigger>
                                <Popout.Panel width={240} header={{ variant: "title", title: `${name} settings` }}>
                                    <Popout.Content>
                                        <Rows />
                                        <Popout>
                                            <Popout.Trigger>
                                                <Button variant="default" mt={8}>
                                                    Create style
                                                </Button>
                                            </Popout.Trigger>
                                            <Popout.Panel width={240} header={{ variant: "title", title: "Create style" }}>
                                                <Popout.Content>
                                                    <Text size="sm">A child docks flush to its parent.</Text>
                                                </Popout.Content>
                                            </Popout.Panel>
                                        </Popout>
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Group>
                    ))}
                </Stack>
            </Box>
        </Popout.Anchor>
    ),
};

/** The assertions for one-at-a-time: a second root closes the first; a child may stay. */
export const OneAtATimeInteractions: Story = {
    ...OneAtATime,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole("button", { name: "Fill settings" }));
        await waitFor(() => expect(body.getByRole("dialog", { name: "Fill settings" })).toBeVisible());
        await userEvent.click(canvas.getByRole("button", { name: "Stroke settings" }));
        await waitFor(() => expect(body.queryByRole("dialog", { name: "Fill settings" })).toBeNull());
        await userEvent.click(body.getByRole("button", { name: "Create style" }));
        await waitFor(() => expect(body.getAllByRole("dialog")).toHaveLength(2));
    },
};

/**
 * Says which region the pop-out was opened from.
 * @returns the sentence
 */
function RegionName(): React.JSX.Element {
    const region = usePopoutRegion();
    return <Text size="sm">{`Opened from the "${region ?? "none"}" region.`}</Text>;
}

/**
 * Closes every pop-out on Control+Period, a route a click-outside does not cover.
 * @returns nothing visible
 */
function CloseAllShortcut(): null {
    const { closeAll, hasOpenPopouts } = usePopoutManager();
    useEffect(() => {
        const onKey = (event: KeyboardEvent): void => {
            if (event.ctrlKey && event.key === "." && hasOpenPopouts()) {
                closeAll();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
        };
    }, [closeAll, hasOpenPopouts]);
    return null;
}

/**
 * Two regions, "panel" and "inspector", each with a pop-out that reads its region through
 * `usePopoutRegion`. Control+Period closes whatever is open through `usePopoutManager().closeAll`.
 */
export const RegionsAndCloseAll: Story = {
    render: () => (
        <Box p={16}>
            <CloseAllShortcut />
            <Group gap={32} align="flex-start">
                {(["panel", "inspector"] as const).map((region) => (
                    <PopoutRegion key={region} id={region}>
                        <Group gap={8}>
                            <Text size="sm">{region}</Text>
                            <Popout>
                                <Popout.Trigger>
                                    <PopoutButton icon={<UiGlyph name="settings" size={12} />} aria-label={`${region} settings`} />
                                </Popout.Trigger>
                                <Popout.Panel width={240} header={{ variant: "title", title: `${region} settings` }}>
                                    <Popout.Content>
                                        <RegionName />
                                    </Popout.Content>
                                </Popout.Panel>
                            </Popout>
                        </Group>
                    </PopoutRegion>
                ))}
            </Group>
            <Text size="xs" c="dimmed" mt={16}>
                Open a pop-out, then press Control+Period to close it from the keyboard.
            </Text>
        </Box>
    ),
};

/** The assertions for regions and closeAll: the panel names its region; the shortcut closes it. */
export const RegionsAndCloseAllInteractions: Story = {
    ...RegionsAndCloseAll,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole("button", { name: "inspector settings" }));
        const dialog = await body.findByRole("dialog", { name: "inspector settings" });
        await expect(within(dialog).getByText('Opened from the "inspector" region.')).toBeVisible();
        await userEvent.keyboard("{Control>}.{/Control}");
        await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    },
};

/**
 * Several pop-outs on one sidebar. Opening one closes the others at the same level, and clicking
 * a panel raises it above the rest. The last row opens a panel that holds a pop-out of its own,
 * which is not a sibling and so stays open beside its parent.
 */
export const MultiplePopouts: Story = {
    render: function MultiplePopoutsRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        const panelProps = {
            width: 280,
            anchorX: sidebarRef,
            placement: "left",
            alignment: "start",
            gap: -1,
        } as const;

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--cm-bg-secondary)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 16,
                    }}
                >
                    <Text c="dimmed">Open both panels, then click to bring one to front</Text>
                    <Text size="xs" c="dimmed">
                        The clicked panel will move to the top of the stack
                    </Text>
                </Box>

                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--cm-bg)",
                        borderInlineStart: "1px solid var(--cm-border)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                    }}
                >
                    <Popout>
                        <ControlGroup
                            label="Settings"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton icon={<UiGlyph name="gear" size={12} />} aria-label="Open Panel A" />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel A trigger
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel {...panelProps} header={{ variant: "title", title: "Panel A - Settings" }}>
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-a-content">
                                    This is Panel A. Opening Panel B closes it.
                                </Text>
                                <Box mt="md">
                                    <Checkbox label="Enable feature X" />
                                    <Checkbox label="Enable feature Y" mt="xs" />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>

                    <Popout>
                        <ControlGroup
                            label="Appearance"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton icon={<UiGlyph name="eye" size={12} />} aria-label="Open Panel B" />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel B trigger
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel {...panelProps} header={{ variant: "title", title: "Panel B - Appearance" }}>
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-b-content">
                                    This is Panel B.
                                </Text>
                                <Box mt="md">
                                    <StyleNumberInput label="Font size" defaultValue={14} min={10} max={24} step={1} suffix="px" />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>

                    <Popout>
                        <ControlGroup
                            label="Advanced"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton icon={<UiGlyph name="refresh" size={12} />} aria-label="Open Panel C" />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel C trigger
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel {...panelProps} header={{ variant: "title", title: "Panel C - Advanced" }}>
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-c-content">
                                    This is Panel C.
                                </Text>
                                <Box mt="md">
                                    <NumberInput label="Cache size" defaultValue={1024} min={0} max={10000} />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>

                    <Popout>
                        <ControlGroup
                            label="Nested Demo"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton icon={<UiGlyph name="copy" size={12} />} aria-label="Open Nested Demo" />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel D - nested pop-out demo
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel {...panelProps} header={{ variant: "title", title: "Panel D - Parent" }}>
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-d-content">
                                    This panel contains a pop-out of its own. Open it with the button below.
                                </Text>
                                <Box mt="md">
                                    <Popout>
                                        <Popout.Trigger>
                                            <Button
                                                size="compact-sm"
                                                variant="light"
                                                rightSection={<UiGlyph name="chevronRight" size={14} />}
                                                aria-label="Open Child Panel"
                                            >
                                                Open Child
                                            </Button>
                                        </Popout.Trigger>
                                        <Popout.Panel width={220} header={{ variant: "title", title: "Child Panel" }} placement="left">
                                            <Popout.Content>
                                                <Text size="xs" data-testid="child-panel-content">
                                                    A pop-out opened from inside a panel. Escape closes this one
                                                    first; closing the panel it came from closes it too.
                                                </Text>
                                                <Box mt="md">
                                                    <Checkbox label="Child option 1" />
                                                    <Checkbox label="Child option 2" mt="xs" />
                                                </Box>
                                            </Popout.Content>
                                        </Popout.Panel>
                                    </Popout>
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </Box>
            </Box>
        );
    },
};

/** The assertions for several pop-outs at once: exclusive siblings, dismissal, and nesting. */
export const MultiplePopoutsInteractions: Story = {
    ...MultiplePopouts,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // Exclusive siblings
        await userEvent.click(canvas.getByLabelText("Open Panel A"));
        await expect(await canvas.findByText("Panel A - Settings")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);

        await userEvent.click(canvas.getByLabelText("Open Panel B"));
        await expect(await canvas.findByText("Panel B - Appearance")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);
        await expect(canvas.queryByTestId("panel-a-content")).not.toBeInTheDocument();
        await expect(canvas.getByTestId("panel-b-content")).toBeInTheDocument();

        // Escape
        await userEvent.keyboard("{Escape}");
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // Click outside
        await userEvent.click(canvas.getByLabelText("Open Panel A"));
        await expect(await canvas.findByText("Panel A - Settings")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);

        const mainContentArea = canvas.getByText("Open both panels, then click to bring one to front");
        await userEvent.click(mainContentArea);
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // Nesting
        await userEvent.click(canvas.getByLabelText("Open Nested Demo"));
        await expect(await canvas.findByText("Panel D - Parent")).toBeVisible();
        await expect(canvas.getByTestId("panel-d-content")).toBeInTheDocument();

        await userEvent.click(canvas.getByLabelText("Open Child Panel"));
        await expect(await canvas.findByText("Child Panel")).toBeVisible();
        await expect(canvas.getByTestId("child-panel-content")).toBeInTheDocument();

        // Parent and child are both open: they are not siblings
        await expect(canvas.getAllByRole("dialog")).toHaveLength(2);

        const childPanel = canvas
            .getAllByRole("dialog")
            .find((p) => p.querySelector('[data-testid="child-panel-content"]'));
        await expect(childPanel).toHaveAttribute("data-parent-id");

        // Escape closes only the child
        await userEvent.keyboard("{Escape}");
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);
        await expect(canvas.getByTestId("panel-d-content")).toBeInTheDocument();
        await expect(canvas.queryByTestId("child-panel-content")).not.toBeInTheDocument();

        await userEvent.click(canvas.getByLabelText("Open Child Panel"));
        await expect(await canvas.findByText("Child Panel")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(2);

        // Closing the parent closes the child with it
        const parentPanel = canvas
            .getAllByRole("dialog")
            .find((p) => p.querySelector('[data-testid="panel-d-content"]'));
        const closeButton = parentPanel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
        await userEvent.click(closeButton);

        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);
    },
};

/**
 * A pop-out driven from the page's own state. Pass `opened` and `onOpenChange` to decide when the
 * panel is open -- to restore it on load, to open it from a menu elsewhere, or to close every
 * panel at once.
 */
export const Controlled: Story = {
    parameters: { layout: "padded" },
    render: function ControlledRender() {
        const [opened, setOpened] = useState(false);

        return (
            <Stack gap="sm" w={240}>
                <Group gap="xs">
                    <Button
                        size="compact-sm"
                        onClick={() => {
                            setOpened(true);
                        }}
                    >
                        Open from here
                    </Button>
                    <Button
                        size="compact-sm"
                        variant="default"
                        onClick={() => {
                            setOpened(false);
                        }}
                    >
                        Close from here
                    </Button>
                </Group>
                <Text size="xs" c="dimmed">
                    The panel is {opened ? "open" : "closed"}.
                </Text>
                <Popout opened={opened} onOpenChange={setOpened}>
                    <Group justify="space-between">
                        <Text size="xs">Controlled pop-out</Text>
                        <Popout.Trigger>
                            <PopoutButton icon={<UiGlyph name="gear" size={12} />} aria-label="Toggle controlled panel" />
                        </Popout.Trigger>
                    </Group>
                    <Popout.Panel width={220} header={{ variant: "title", title: "Controlled" }} placement="right" gap={8}>
                        <Popout.Content>
                            <Text size="xs">
                                Every open and close is reported to onOpenChange, including Escape and clicks
                                outside.
                            </Text>
                        </Popout.Content>
                    </Popout.Panel>
                </Popout>
            </Stack>
        );
    },
};

/** The assertions for the controlled pop-out. */
export const ControlledInteractions: Story = {
    ...Controlled,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText("The panel is closed.")).toBeInTheDocument();

        await userEvent.click(canvas.getByRole("button", { name: "Open from here" }));
        await expect(await canvas.findByRole("dialog")).toBeVisible();
        await expect(canvas.getByText("The panel is open.")).toBeInTheDocument();

        await userEvent.click(canvas.getByRole("button", { name: "Close from here" }));
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // The trigger reports through the same handler
        await userEvent.click(canvas.getByLabelText("Toggle controlled panel"));
        await expect(await canvas.findByRole("dialog")).toBeVisible();
        await expect(canvas.getByText("The panel is open.")).toBeInTheDocument();

        // Escape reports too
        await userEvent.keyboard("{Escape}");
        await expect(canvas.getByText("The panel is closed.")).toBeInTheDocument();
    },
};

/**
 * A worked example: a complete label settings panel with tabs, form controls and a pop-out of its
 * own in the General tab. Tab moves through the controls, Escape closes the innermost panel, and
 * focus returns to the trigger when a panel closes.
 */
export const WorkedExample: Story = {
    render: function WorkedExampleRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--cm-bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text c="dimmed">Label Settings with a nested pop-out</Text>
                </Box>

                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--cm-bg)",
                        borderInlineStart: "1px solid var(--cm-border)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <ControlGroup label="Label Settings" actions={<LabelSettingsPopout anchorX={sidebarRef} />}>
                        <Box p="sm">
                            <Text size="xs" c="dimmed">
                                Click the pop-out button to configure label settings
                            </Text>
                        </Box>
                    </ControlGroup>
                </Box>
            </Box>
        );
    },
};

/** The assertions for the worked example. */
export const WorkedExampleInteractions: Story = {
    ...WorkedExample,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        await userEvent.click(canvas.getByLabelText("Open label settings"));

        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();

        await expect(panel).toHaveAttribute("role", "dialog");
        await expect(panel).toHaveAttribute("aria-modal", "false");
        await expect(panel).toHaveAttribute("aria-labelledby");
        await expect(panel).toHaveAttribute("id");

        const trigger = canvas.getByLabelText("Open label settings");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

        await expect(canvas.getByRole("tab", { name: "General" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "Advanced" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "About" })).toBeInTheDocument();

        await userEvent.click(canvas.getByRole("tab", { name: "Advanced" }));
        await expect(canvas.getByText("Label opacity")).toBeVisible();

        await userEvent.click(canvas.getByRole("tab", { name: "About" }));
        await expect(canvas.getByText("Part of @graphty/compact-mantine")).toBeVisible();

        // Escape closes the panel
        await userEvent.keyboard("{Escape}");
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        await userEvent.click(trigger);
        const reopenedPanel = await canvas.findByRole("dialog");
        await expect(reopenedPanel).toBeVisible();

        await expect(canvas.getByLabelText("Close panel")).toBeInTheDocument();

        await userEvent.click(canvas.getByLabelText("Close panel"));
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    },
};

/**
 * Components with floating parts of their own, inside a pop-out. Every dropdown, menu and tooltip
 * here appears above the panel and can be used without dismissing it:
 * - Form Inputs: Select, Autocomplete, MultiSelect, TagsInput, ColorInput
 * - Overlays: Menu, Tooltip
 * - Custom: CompactColorInput, StyleSelect, GradientEditor
 *
 * Kept for inspection by hand; the automated checks are in tests/popout/PopoutRegression.test.tsx.
 */
export const ComponentCompatibility: Story = {
    render: function ComponentCompatibilityRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);
        const [selectValue, setSelectValue] = useState<string | null>("react");
        const [multiSelectValue, setMultiSelectValue] = useState<string[]>(["react"]);
        const [tagsValue, setTagsValue] = useState<string[]>(["tag1"]);
        const [colorValue, setColorValue] = useState("#339af0");
        const [compactColor, setCompactColor] = useState<string | undefined>(undefined);
        const [compactOpacity, setCompactOpacity] = useState<number | undefined>(undefined);
        const [styleSelectValue, setStyleSelectValue] = useState<string | undefined>(undefined);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--cm-bg-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: 8,
                    }}
                >
                    <Text c="dimmed">Component Compatibility Test</Text>
                    <Text size="xs" c="dimmed">
                        Dropdowns appear above the pop-out, and choosing an option does not close it
                    </Text>
                </Box>

                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--cm-bg)",
                        borderInlineStart: "1px solid var(--cm-border)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Popout>
                        <ControlGroup
                            label="Component Test"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open component compatibility test"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Click to test component compatibility
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={320}
                            anchorX={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                            header={{
                                variant: "tabs",
                                tabs: [
                                    {
                                        id: "form-inputs",
                                        label: "Form Inputs",
                                        content: (
                                            <Popout.Content>
                                                <Stack gap="sm">
                                                    <Select
                                                        label="Select"
                                                        data-testid="test-select"
                                                        value={selectValue}
                                                        onChange={setSelectValue}
                                                        data={[
                                                            { value: "react", label: "React" },
                                                            { value: "vue", label: "Vue" },
                                                            { value: "angular", label: "Angular" },
                                                            { value: "svelte", label: "Svelte" },
                                                        ]}
                                                    />
                                                    <Autocomplete
                                                        label="Autocomplete"
                                                        data-testid="test-autocomplete"
                                                        data={["React", "Vue", "Angular", "Svelte", "Solid"]}
                                                        placeholder="Type to search"
                                                    />
                                                    <MultiSelect
                                                        label="MultiSelect"
                                                        data-testid="test-multiselect"
                                                        value={multiSelectValue}
                                                        onChange={setMultiSelectValue}
                                                        data={[
                                                            { value: "react", label: "React" },
                                                            { value: "vue", label: "Vue" },
                                                            { value: "angular", label: "Angular" },
                                                        ]}
                                                    />
                                                    <TagsInput
                                                        label="TagsInput"
                                                        data-testid="test-tagsinput"
                                                        value={tagsValue}
                                                        onChange={setTagsValue}
                                                        data={["tag1", "tag2", "tag3"]}
                                                        placeholder="Add tags"
                                                    />
                                                    <ColorInput
                                                        label="ColorInput"
                                                        data-testid="test-colorinput"
                                                        value={colorValue}
                                                        onChange={setColorValue}
                                                    />
                                                </Stack>
                                            </Popout.Content>
                                        ),
                                    },
                                    {
                                        id: "overlays",
                                        label: "Overlays",
                                        content: (
                                            <Popout.Content>
                                                <Stack gap="md">
                                                    <Box>
                                                        <Text size="xs" fw={500} mb={4}>
                                                            Menu
                                                        </Text>
                                                        <Menu>
                                                            <Menu.Target>
                                                                <ActionIcon
                                                                    variant="light"
                                                                    aria-label="Open menu"
                                                                    data-testid="test-menu-trigger"
                                                                >
                                                                    <UiGlyph name="chevronDown" size={14} />
                                                                </ActionIcon>
                                                            </Menu.Target>
                                                            <Menu.Dropdown>
                                                                <Menu.Item data-testid="menu-item-1">Menu Item 1</Menu.Item>
                                                                <Menu.Item data-testid="menu-item-2">Menu Item 2</Menu.Item>
                                                                <Menu.Item data-testid="menu-item-3">Menu Item 3</Menu.Item>
                                                            </Menu.Dropdown>
                                                        </Menu>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Choosing an item does not close the pop-out.
                                                        </Text>
                                                    </Box>
                                                    <Box>
                                                        <Text size="xs" fw={500} mb={4}>
                                                            Tooltip
                                                        </Text>
                                                        <Tooltip label="This tooltip appears above the pop-out">
                                                            <Button
                                                                size="compact-sm"
                                                                variant="light"
                                                                data-testid="test-tooltip-trigger"
                                                            >
                                                                Hover for tooltip
                                                            </Button>
                                                        </Tooltip>
                                                    </Box>
                                                </Stack>
                                            </Popout.Content>
                                        ),
                                    },
                                    {
                                        id: "custom",
                                        label: "Custom",
                                        content: (
                                            <Popout.Content>
                                                <Stack gap="sm">
                                                    <CompactColorInput
                                                        label="CompactColorInput"
                                                        color={compactColor}
                                                        defaultColor="#ff6b6b"
                                                        opacity={compactOpacity}
                                                        defaultOpacity={100}
                                                        onColorChange={setCompactColor}
                                                        onOpacityChange={setCompactOpacity}
                                                    />
                                                    <Text size="xs" c="dimmed">
                                                        The swatch opens a picker in a child pop-out.
                                                    </Text>
                                                    <StyleSelect
                                                        label="StyleSelect"
                                                        value={styleSelectValue}
                                                        defaultValue="option1"
                                                        options={[
                                                            { value: "option1", label: "Option 1" },
                                                            { value: "option2", label: "Option 2" },
                                                            { value: "option3", label: "Option 3" },
                                                        ]}
                                                        onChange={setStyleSelectValue}
                                                    />
                                                    <Box>
                                                        <Text size="xs" fw={500} mb={4}>
                                                            GradientEditor
                                                        </Text>
                                                        <GradientEditor showDirection={false} />
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            GradientEditor edits the selected stop in its own inline
                                                            colour picker; no second pop-out opens.
                                                        </Text>
                                                    </Box>
                                                </Stack>
                                            </Popout.Content>
                                        ),
                                    },
                                ],
                            }}
                        />
                    </Popout>
                </Box>
            </Box>
        );
    },
};
