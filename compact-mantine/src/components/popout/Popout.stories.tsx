import {
    ActionIcon,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    ColorInput,
    Group,
    Menu,
    MultiSelect,
    NumberInput,
    Select,
    Stack,
    TagsInput,
    Text,
    Tooltip,
} from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { useRef, useState } from "react";

import {
    CompactColorInput,
    ControlGroup,
    GradientEditor,
    Popout,
    PopoutButton,
    PopoutManager,
    StyleNumberInput,
    StyleSelect,
    ToggleWithContent,
    UiGlyph,
} from "../../index";
import { LabelSettingsPopout } from "./examples/LabelSettingsPopout";

// Everything the stories use is imported from "../../index", the package's
// published entry point, so a story stops compiling if an export is dropped.
// LabelSettingsPopout is the exception: it is an example in this folder rather
// than part of the public surface.

// Demo stories carry no play function. Storybook runs a play function as soon
// as a story loads, so a demo that drove itself opened and closed its own panel
// on every visit, which read as a flicker. The assertions live on the stories
// below tagged INTERACTION_TEST_TAGS instead: those are hidden from the sidebar
// and the docs page, and still carry the inherited "test" tag, so a test runner
// picks them up while nobody watches them play out by hand.
const INTERACTION_TEST_TAGS = ["!dev", "!autodocs"];

/**
 * A floating pop-out panel that opens from a trigger element.
 *
 * **Purpose:** A non-modal, draggable panel for settings that belong to
 * something on screen, shown without covering the thing they belong to.
 *
 * **When to use:**
 * - For property panels that float over a canvas
 * - For settings that should not block the rest of the interface
 * - When people need to work in the panel and the page at the same time
 *
 * **Key features:**
 * - Two anchors: `anchorX` picks the edge the panel lines up with, `anchorY`
 *   how far down it opens, so a panel can be flush with a sidebar and still
 *   open level with the row that opened it
 * - Panels opened from inside a panel step out from it, one level at a time
 * - Non-modal: the page behind stays live
 * - Compound API: `Popout.Trigger`, `Popout.Panel`, `Popout.Content`
 */
const meta: Meta<typeof Popout> = {
    title: "Floating Panels/Popout",
    component: Popout,
    tags: ["autodocs"],
    parameters: {
        layout: "fullscreen",
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
 * A sidebar with one pop-out, the arrangement most panels use.
 *
 * The panel lines its right edge up with the sidebar's left edge, and opens
 * level with the row that opened it. Click the button to open, drag the header
 * to move it, click the close button to dismiss.
 */
export const Basic: Story = {
    render: function BasicRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                {/* Main content area */}
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--mantine-color-gray-1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text c="dimmed">Main Content Area</Text>
                </Box>

                {/* Right sidebar */}
                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--mantine-color-body)",
                        borderInlineStart: "1px solid var(--mantine-color-gray-3)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Control group with popout action */}
                    <Popout>
                        <ControlGroup
                            label="Test"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open settings"
                                    />
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

/**
 * The assertions for the basic pop-out, kept off the demo so that opening the
 * demo does not run them.
 */
export const BasicInteractions: Story = {
    ...Basic,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Panel should not be visible initially
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Verify trigger has correct ARIA attributes before opening
        const trigger = canvas.getByLabelText("Open settings");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

        // Click the trigger to open
        await userEvent.click(trigger);

        // Panel should now be visible
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();
        await expect(canvas.getByText("Settings")).toBeVisible();
        await expect(canvas.getByText("Panel content goes here")).toBeVisible();

        // Accessibility attributes
        await expect(panel).toHaveAttribute("aria-modal", "false");
        await expect(panel).toHaveAttribute("aria-labelledby");
        await expect(panel).toHaveAttribute("id");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);

        // The header is the drag handle
        const dragTrigger = panel.querySelector("[data-drag-trigger]");
        await expect(dragTrigger).toBeInTheDocument();

        // Store initial position
        const initialLeft = panel.style.left;
        const initialTop = panel.style.top;

        // Click the close button
        await userEvent.click(canvas.getByLabelText("Close panel"));

        // Panel should be closed
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Verify trigger aria-expanded updated
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        // Reopen and verify the panel comes back where it started
        await userEvent.click(canvas.getByLabelText("Open settings"));
        const reopenedPanel = await canvas.findByRole("dialog");
        await expect(reopenedPanel.style.left).toBe(initialLeft);
        await expect(reopenedPanel.style.top).toBe(initialTop);

        // Close again
        await userEvent.click(canvas.getByLabelText("Close panel"));
    },
};

/**
 * The two anchors, side by side.
 *
 * Each button opens a panel anchored differently on the horizontal axis, and
 * every one of them opens level with its own row:
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
                        backgroundColor: "var(--mantine-color-body)",
                        borderInlineStart: "1px solid var(--mantine-color-gray-3)",
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
                                        The default inside a Popout.Anchor: the panel meets the
                                        sidebar edge, level with the row that opened it.
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
                                        anchorX=&quot;trigger&quot; ignores the sidebar and opens
                                        beside the button instead.
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
                            <Popout.Panel
                                width={240}
                                header={{ variant: "title", title: "Level one" }}
                                gap={-1}
                            >
                                <Popout.Content>
                                    <Stack gap="xs">
                                        <Text size="xs">
                                            Open the next level: it steps out from this panel, not
                                            from the sidebar.
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
                                            <Popout.Panel
                                                width={220}
                                                header={{ variant: "title", title: "Level two" }}
                                            >
                                                <Popout.Content>
                                                    <Stack gap="xs">
                                                        <Text size="xs">
                                                            And again, one level further out.
                                                        </Text>
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
                                                                header={{
                                                                    variant: "title",
                                                                    title: "Level three",
                                                                }}
                                                            >
                                                                <Popout.Content>
                                                                    <Text size="xs">
                                                                        Each level lines up with the
                                                                        one it opened from.
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
 * The assertions for the two anchors: each panel meets the edge it names, and
 * each opens level with its own trigger.
 */
export const AnchorAxesInteractions: Story = {
    ...AnchorAxes,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const sidebar = canvasElement.querySelector("div[style*='100vh']");
        await expect(sidebar).toBeTruthy();
        const sidebarRect = (sidebar as HTMLElement).getBoundingClientRect();

        // Anchored to the sidebar: the panel's right edge meets the sidebar's
        // left edge, and its top meets its own trigger's top.
        const panelTrigger = canvas.getByLabelText("Open panel-anchored settings");
        await userEvent.click(panelTrigger);
        const anchoredPanel = await canvas.findByRole("dialog");
        const anchoredRect = anchoredPanel.getBoundingClientRect();
        await expect(Math.round(anchoredRect.right)).toBe(Math.round(sidebarRect.left) + 1);
        await expect(Math.round(anchoredRect.top)).toBe(
            Math.round(panelTrigger.getBoundingClientRect().top),
        );

        // Anchored to its own trigger: the panel sits beside the button.
        const triggerAnchored = canvas.getByLabelText("Open trigger-anchored settings");
        await userEvent.click(triggerAnchored);
        const besidePanel = await canvas.findByRole("dialog");
        const besideRect = besidePanel.getBoundingClientRect();
        const buttonRect = triggerAnchored.getBoundingClientRect();
        await expect(Math.round(besideRect.right)).toBe(Math.round(buttonRect.left) - 8);
        await expect(Math.round(besideRect.top)).toBe(Math.round(buttonRect.top));

        // Nested: each level steps out from the panel it opened from.
        await userEvent.click(canvas.getByLabelText("Open nested stack"));
        const levelOne = await canvas.findByRole("dialog");
        const levelOneRect = levelOne.getBoundingClientRect();

        await userEvent.click(canvas.getByLabelText("Open level two"));
        const levelTwo = canvas.getAllByRole("dialog").find((panel) => panel !== levelOne);
        await expect(levelTwo).toBeTruthy();
        const levelTwoRect = (levelTwo as HTMLElement).getBoundingClientRect();
        await expect(Math.round(levelTwoRect.right)).toBe(Math.round(levelOneRect.left) - 4);
    },
};

/**
 * A tabbed pop-out panel.
 *
 * Each tab has its own content. Reopening the panel starts from the first tab
 * again.
 */
export const Tabbed: Story = {
    render: function TabbedRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                {/* Main content area */}
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--mantine-color-gray-1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text c="dimmed">Main Content Area</Text>
                </Box>

                {/* Right sidebar */}
                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--mantine-color-body)",
                        borderInlineStart: "1px solid var(--mantine-color-gray-3)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Control group with popout action */}
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
                                    Click the popout button to see tabbed settings
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
                                                <NumberInput
                                                    label="Max labels"
                                                    defaultValue={100}
                                                    min={0}
                                                    max={1000}
                                                    mt="xs"
                                                />
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

/**
 * The assertions for the tabbed pop-out.
 */
export const TabbedInteractions: Story = {
    ...Tabbed,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Panel should not be visible initially
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Verify trigger has correct ARIA attributes before opening
        const trigger = canvas.getByLabelText("Open tabbed settings");
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

        // Open the panel
        await userEvent.click(trigger);

        // Panel should now be visible
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();

        // Accessibility attributes
        await expect(panel).toHaveAttribute("aria-modal", "false");
        await expect(panel).toHaveAttribute("aria-labelledby");
        await expect(panel).toHaveAttribute("id");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);

        // Should have three options in the tab strip
        await expect(canvas.getByRole("radio", { name: "General" })).toBeInTheDocument();
        await expect(canvas.getByRole("radio", { name: "Advanced" })).toBeInTheDocument();
        await expect(canvas.getByRole("radio", { name: "About" })).toBeInTheDocument();

        // First option should be selected by default
        const generalOption = canvas.getByRole("radio", { name: "General" });
        await expect(generalOption).toBeChecked();

        // Switching tabs and reopening returns to the first tab
        await userEvent.click(canvas.getByRole("radio", { name: "About" }));
        await expect(canvas.getByRole("radio", { name: "About" })).toBeChecked();
        await userEvent.click(canvas.getByLabelText("Close panel"));
        await userEvent.click(trigger);
        await expect(await canvas.findByRole("radio", { name: "General" })).toBeChecked();

        await userEvent.click(canvas.getByLabelText("Close panel"));
    },
};

/**
 * Several pop-outs on one sidebar.
 *
 * Opening one closes the others at the same level, and clicking a panel raises
 * it above the rest. The last row opens a panel that itself contains a pop-out,
 * which is not a sibling and so stays open beside its parent.
 */
export const MultiplePopouts: Story = {
    render: function MultiplePopoutsRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                {/* Main content area */}
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--mantine-color-gray-1)",
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

                {/* Right sidebar with multiple popout triggers */}
                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--mantine-color-body)",
                        borderInlineStart: "1px solid var(--mantine-color-gray-3)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                    }}
                >
                    {/* Panel A - Settings */}
                    <Popout>
                        <ControlGroup
                            label="Settings"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="gear" size={12} />}
                                        aria-label="Open Panel A"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel A trigger
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={280}
                            header={{ variant: "title", title: "Panel A - Settings" }}
                            anchorX={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                        >
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-a-content">
                                    This is Panel A. Click on Panel B to bring it to front, then
                                    click on this panel to bring it back to front.
                                </Text>
                                <Box mt="md">
                                    <Checkbox label="Enable feature X" />
                                    <Checkbox label="Enable feature Y" mt="xs" />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>

                    {/* Panel B - Appearance */}
                    <Popout>
                        <ControlGroup
                            label="Appearance"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="eye" size={12} />}
                                        aria-label="Open Panel B"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel B trigger
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={280}
                            header={{ variant: "title", title: "Panel B - Appearance" }}
                            anchorX={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                        >
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-b-content">
                                    This is Panel B. Opened after Panel A, so it should appear on
                                    top initially.
                                </Text>
                                <Box mt="md">
                                    <StyleNumberInput
                                        label="Font size"
                                        defaultValue={14}
                                        min={10}
                                        max={24}
                                        step={1}
                                        suffix="px"
                                    />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>

                    {/* Panel C - Advanced */}
                    <Popout>
                        <ControlGroup
                            label="Advanced"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="refresh" size={12} />}
                                        aria-label="Open Panel C"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel C trigger
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={280}
                            header={{ variant: "title", title: "Panel C - Advanced" }}
                            anchorX={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                        >
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-c-content">
                                    This is Panel C. A third panel, to show the stacking order with
                                    several panels.
                                </Text>
                                <Box mt="md">
                                    <NumberInput
                                        label="Cache size"
                                        defaultValue={1024}
                                        min={0}
                                        max={10000}
                                    />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>

                    {/* Panel D - a panel that itself contains a pop-out */}
                    <Popout>
                        <ControlGroup
                            label="Nested Demo"
                            actions={
                                <Popout.Trigger>
                                    <PopoutButton
                                        icon={<UiGlyph name="copy" size={12} />}
                                        aria-label="Open Nested Demo"
                                    />
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel D - nested pop-out demo
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={280}
                            header={{ variant: "title", title: "Panel D - Parent" }}
                            anchorX={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                        >
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-d-content">
                                    This panel contains a pop-out of its own. Open it with the
                                    button below.
                                </Text>
                                <Box mt="md">
                                    {/* Nested child popout */}
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
                                        <Popout.Panel
                                            width={220}
                                            header={{ variant: "title", title: "Child Panel" }}
                                            placement="left"
                                        >
                                            <Popout.Content>
                                                <Text size="xs" data-testid="child-panel-content">
                                                    A pop-out opened from inside a panel. Escape
                                                    closes this one first; closing the panel it came
                                                    from closes it too.
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

/**
 * The assertions for several pop-outs at once: exclusive siblings, dismissal,
 * and nesting.
 */
export const MultiplePopoutsInteractions: Story = {
    ...MultiplePopouts,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Initially no panels should be visible
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // --- Exclusive siblings ---
        await userEvent.click(canvas.getByLabelText("Open Panel A"));
        await expect(await canvas.findByText("Panel A - Settings")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);

        // Open Panel B - should close Panel A
        await userEvent.click(canvas.getByLabelText("Open Panel B"));
        await expect(await canvas.findByText("Panel B - Appearance")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);
        await expect(canvas.queryByTestId("panel-a-content")).not.toBeInTheDocument();
        await expect(canvas.getByTestId("panel-b-content")).toBeInTheDocument();

        // --- Escape ---
        await userEvent.keyboard("{Escape}");
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // --- Click outside ---
        await userEvent.click(canvas.getByLabelText("Open Panel A"));
        await expect(await canvas.findByText("Panel A - Settings")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);

        const mainContentArea = canvas.getByText("Open both panels, then click to bring one to front");
        await userEvent.click(mainContentArea);
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // --- Nesting ---
        await userEvent.click(canvas.getByLabelText("Open Nested Demo"));
        await expect(await canvas.findByText("Panel D - Parent")).toBeVisible();
        await expect(canvas.getByTestId("panel-d-content")).toBeInTheDocument();

        await userEvent.click(canvas.getByLabelText("Open Child Panel"));
        await expect(await canvas.findByText("Child Panel")).toBeVisible();
        await expect(canvas.getByTestId("child-panel-content")).toBeInTheDocument();

        // Both panels should be open (parent and child, not siblings)
        await expect(canvas.getAllByRole("dialog")).toHaveLength(2);

        // The child panel records which panel it opened from
        const childPanel = canvas.getAllByRole("dialog").find((p) =>
            p.querySelector('[data-testid="child-panel-content"]'),
        );
        await expect(childPanel).toHaveAttribute("data-parent-id");

        // Escape closes only the child
        await userEvent.keyboard("{Escape}");
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);
        await expect(canvas.getByTestId("panel-d-content")).toBeInTheDocument();
        await expect(canvas.queryByTestId("child-panel-content")).not.toBeInTheDocument();

        // Reopen the child
        await userEvent.click(canvas.getByLabelText("Open Child Panel"));
        await expect(await canvas.findByText("Child Panel")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(2);

        // Closing the parent closes the child with it
        const parentPanel = canvas.getAllByRole("dialog").find((p) =>
            p.querySelector('[data-testid="panel-d-content"]'),
        );
        const closeButton = parentPanel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
        await userEvent.click(closeButton);

        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);
    },
};

/**
 * A pop-out driven from the page's own state.
 *
 * Pass `opened` and `onOpenChange` to decide when the panel is open -- to
 * restore it on load, to open it from a menu somewhere else, or to close every
 * panel at once.
 */
export const Controlled: Story = {
    render: function ControlledRender() {
        const [opened, setOpened] = useState(false);

        return (
            <Box p="md">
                <Stack gap="sm" w={240}>
                    <Group gap="xs">
                        <Button size="compact-sm" onClick={() => {
                            setOpened(true);
                        }}>
                            Open from here
                        </Button>
                        <Button size="compact-sm" variant="default" onClick={() => {
                            setOpened(false);
                        }}>
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
                                <PopoutButton
                                    icon={<UiGlyph name="gear" size={12} />}
                                    aria-label="Toggle controlled panel"
                                />
                            </Popout.Trigger>
                        </Group>
                        <Popout.Panel
                            width={220}
                            header={{ variant: "title", title: "Controlled" }}
                            placement="right"
                            gap={8}
                        >
                            <Popout.Content>
                                <Text size="xs">
                                    Every open and close is reported to onOpenChange, including
                                    Escape and clicks outside.
                                </Text>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </Stack>
            </Box>
        );
    },
};

/**
 * The assertions for the controlled pop-out.
 */
export const ControlledInteractions: Story = {
    ...Controlled,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByText("The panel is closed.")).toBeInTheDocument();

        // Opened from outside the pop-out
        await userEvent.click(canvas.getByRole("button", { name: "Open from here" }));
        await expect(await canvas.findByRole("dialog")).toBeVisible();
        await expect(canvas.getByText("The panel is open.")).toBeInTheDocument();

        // Closed from outside the pop-out
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
 * A worked example: a complete settings panel with tabs, form controls and a
 * pop-out of its own in the General tab.
 *
 * Keyboard: Tab moves through the controls, Escape closes the innermost panel,
 * and focus returns to the trigger when a panel closes.
 */
export const Demo: Story = {
    render: function DemoRender() {
        const sidebarRef = useRef<HTMLDivElement>(null);

        return (
            <Box style={{ display: "flex", width: "100%", height: "100vh" }}>
                {/* Main content area */}
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--mantine-color-gray-1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Text c="dimmed">Demo: Label Settings with a nested pop-out</Text>
                </Box>

                {/* Right sidebar */}
                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--mantine-color-body)",
                        borderInlineStart: "1px solid var(--mantine-color-gray-3)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <ControlGroup
                        label="Label Settings"
                        actions={<LabelSettingsPopout anchorX={sidebarRef} />}
                    >
                        <Box p="sm">
                            <Text size="xs" c="dimmed">
                                Click the popout button to configure label settings
                            </Text>
                        </Box>
                    </ControlGroup>
                </Box>
            </Box>
        );
    },
};

/**
 * The assertions for the worked example.
 */
export const DemoInteractions: Story = {
    ...Demo,
    tags: INTERACTION_TEST_TAGS,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Panel should not be visible initially
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Open the panel
        await userEvent.click(canvas.getByLabelText("Open label settings"));

        // Panel should now be visible
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();

        // 1. Panel has role=dialog and aria-modal=false (non-modal)
        await expect(panel).toHaveAttribute("role", "dialog");
        await expect(panel).toHaveAttribute("aria-modal", "false");

        // 2. Panel has aria-labelledby pointing to a title element
        await expect(panel).toHaveAttribute("aria-labelledby");

        // 3. Panel has an ID that matches the trigger's aria-controls
        await expect(panel).toHaveAttribute("id");

        // 4. Trigger has correct ARIA attributes
        const trigger = canvas.getByLabelText("Open label settings");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

        // The tab strip is present
        await expect(canvas.getByRole("radio", { name: "General" })).toBeInTheDocument();
        await expect(canvas.getByRole("radio", { name: "Advanced" })).toBeInTheDocument();
        await expect(canvas.getByRole("radio", { name: "About" })).toBeInTheDocument();

        // Switch to Advanced tab
        await userEvent.click(canvas.getByRole("radio", { name: "Advanced" }));
        await expect(canvas.getByText("Label opacity")).toBeVisible();

        // Switch to About tab
        await userEvent.click(canvas.getByRole("radio", { name: "About" }));
        await expect(canvas.getByText("Part of @graphty/compact-mantine")).toBeVisible();

        // Escape closes the panel
        await userEvent.keyboard("{Escape}");
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Verify trigger attributes updated
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        // Reopen to verify focus management
        await userEvent.click(trigger);
        const reopenedPanel = await canvas.findByRole("dialog");
        await expect(reopenedPanel).toBeVisible();

        // Close button should have an accessible name
        await expect(canvas.getByLabelText("Close panel")).toBeInTheDocument();

        // Close via close button
        await userEvent.click(canvas.getByLabelText("Close panel"));
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    },
};

/**
 * Compatibility check for components with floating parts of their own.
 *
 * Every dropdown, menu and tooltip in here has to appear above the pop-out and
 * has to be usable without dismissing it. Organised into tabs by category:
 * - Form Inputs: Select, Autocomplete, MultiSelect, TagsInput, ColorInput
 * - Overlays: Menu, Tooltip
 * - Custom: CompactColorInput, StyleSelect, GradientEditor
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
                {/* Main content area */}
                <Box
                    style={{
                        flex: 1,
                        backgroundColor: "var(--mantine-color-gray-1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: 8,
                    }}
                >
                    <Text c="dimmed">Component Compatibility Test</Text>
                    <Text size="xs" c="dimmed">
                        Test that dropdowns appear above the Popout and clicking options doesn&apos;t
                        close it
                    </Text>
                </Box>

                {/* Right sidebar */}
                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--mantine-color-body)",
                        borderInlineStart: "1px solid var(--mantine-color-gray-3)",
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
                                                    <Text size="xs" c="dimmed">
                                                        Test Select, Autocomplete, MultiSelect, TagsInput, and
                                                        ColorInput dropdowns.
                                                    </Text>

                                                    {/* Select */}
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

                                                    {/* Autocomplete */}
                                                    <Autocomplete
                                                        label="Autocomplete"
                                                        data-testid="test-autocomplete"
                                                        data={["React", "Vue", "Angular", "Svelte", "Solid"]}
                                                        placeholder="Type to search"
                                                    />

                                                    {/* MultiSelect */}
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

                                                    {/* TagsInput */}
                                                    <TagsInput
                                                        label="TagsInput"
                                                        data-testid="test-tagsinput"
                                                        value={tagsValue}
                                                        onChange={setTagsValue}
                                                        data={["tag1", "tag2", "tag3"]}
                                                        placeholder="Add tags"
                                                    />

                                                    {/* ColorInput */}
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
                                                    <Text size="xs" c="dimmed">
                                                        Test Menu and Tooltip overlay components.
                                                    </Text>

                                                    {/* Menu */}
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
                                                                <Menu.Item data-testid="menu-item-1">
                                                                    Menu Item 1
                                                                </Menu.Item>
                                                                <Menu.Item data-testid="menu-item-2">
                                                                    Menu Item 2
                                                                </Menu.Item>
                                                                <Menu.Item data-testid="menu-item-3">
                                                                    Menu Item 3
                                                                </Menu.Item>
                                                            </Menu.Dropdown>
                                                        </Menu>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Click the button to open the menu. Selecting an item
                                                            should not close the popout.
                                                        </Text>
                                                    </Box>

                                                    {/* Tooltip */}
                                                    <Box>
                                                        <Text size="xs" fw={500} mb={4}>
                                                            Tooltip
                                                        </Text>
                                                        <Tooltip label="This is a tooltip that appears above the popout">
                                                            <Button
                                                                size="compact-sm"
                                                                variant="light"
                                                                data-testid="test-tooltip-trigger"
                                                            >
                                                                Hover for tooltip
                                                            </Button>
                                                        </Tooltip>
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            Hover over the button to see the tooltip appear above
                                                            the popout panel.
                                                        </Text>
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
                                                    <Text size="xs" c="dimmed">
                                                        Test custom compact-mantine components with floating UI.
                                                    </Text>

                                                    {/* CompactColorInput - uses custom Popover */}
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
                                                        Click the color swatch to open the color picker popover.
                                                    </Text>

                                                    {/* StyleSelect - wrapper around Select */}
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
                                                    <Text size="xs" c="dimmed">
                                                        StyleSelect wraps Mantine Select with reset functionality.
                                                    </Text>

                                                    {/* GradientEditor - ColorInput + Slider */}
                                                    <Box>
                                                        <Text size="xs" fw={500} mb={4}>
                                                            GradientEditor
                                                        </Text>
                                                        <GradientEditor showDirection={false} />
                                                        <Text size="xs" c="dimmed" mt={4}>
                                                            GradientEditor uses ColorInput for color stops.
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
    // Kept for visual inspection. The automated checks for floating components
    // inside a pop-out are in tests/popout/PopoutRegression.test.tsx.
};
