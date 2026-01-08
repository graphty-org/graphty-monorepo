import {
    ActionIcon,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    ColorInput,
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
import { ChevronRight, ExternalLink, Layers, MoreVertical, Palette, Settings, Sliders } from "lucide-react";
import { useRef, useState } from "react";

import { CompactColorInput } from "../CompactColorInput";
import { ControlGroup } from "../ControlGroup";
import { EffectToggle } from "../EffectToggle";
import { GradientEditor } from "../GradientEditor";
import { StyleNumberInput } from "../StyleNumberInput";
import { StyleSelect } from "../StyleSelect";
import { LabelSettingsPopout } from "./examples/LabelSettingsPopout";
import { Popout } from "./Popout";
import { PopoutManager } from "./PopoutManager";

/**
 * A floating pop-out panel component that opens from a trigger element.
 *
 * **Purpose:** Provides a non-modal, draggable panel for displaying contextual
 * settings or information without blocking the rest of the UI.
 *
 * **When to use:**
 * - For property panels that need to float over the canvas
 * - For contextual settings that shouldn't block the main interface
 * - When users need to interact with both the panel and the underlying content
 *
 * **Key features:**
 * - Opens to the left of the trigger
 * - Non-modal (doesn't block interaction with background)
 * - Compound component API (Popout.Trigger, Popout.Panel, Popout.Content)
 */
const meta: Meta<typeof Popout> = {
    title: "Components/Popout",
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
 * Basic popout panel with a sidebar layout similar to Graphty.
 * Shows a right-side sidebar with a control section header and popout trigger.
 * The panel snaps to the left edge of the sidebar when opened.
 * Click the popout button to open, drag the header to move, click X to close.
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
                        borderLeft: "1px solid var(--mantine-color-gray-3)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Control group with popout action */}
                    <Popout>
                        <ControlGroup
                            label="Test →"
                            actions={
                                <Popout.Trigger>
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        aria-label="Open settings"
                                        c="dimmed"
                                    >
                                        <ExternalLink size={12} />
                                    </ActionIcon>
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
                            anchorRef={sidebarRef}
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

        // Phase 7: Verify accessibility attributes
        await expect(panel).toHaveAttribute("aria-modal", "false");
        await expect(panel).toHaveAttribute("aria-labelledby");
        await expect(panel).toHaveAttribute("id");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);

        // Verify drag trigger is present in header (Phase 2)
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

        // Reopen and verify position is reset (Phase 2 requirement)
        await userEvent.click(canvas.getByLabelText("Open settings"));
        const reopenedPanel = await canvas.findByRole("dialog");
        await expect(reopenedPanel.style.left).toBe(initialLeft);
        await expect(reopenedPanel.style.top).toBe(initialTop);

        // Close again
        await userEvent.click(canvas.getByLabelText("Close panel"));
    },
};

/**
 * Tabbed popout panel demonstrating the tabs header variant.
 * Each tab has its own content that displays when the tab is active.
 * Tab state resets to the first tab when the panel reopens.
 * Uses compact components from @graphty/compact-mantine.
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
                        borderLeft: "1px solid var(--mantine-color-gray-3)",
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
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        aria-label="Open tabbed settings"
                                        c="dimmed"
                                    >
                                        <ExternalLink size={12} />
                                    </ActionIcon>
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
                            anchorRef={sidebarRef}
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
                                                <EffectToggle label="Show labels" defaultChecked>
                                                    <StyleNumberInput
                                                        label="Font size"
                                                        defaultValue={12}
                                                        min={8}
                                                        max={24}
                                                        step={1}
                                                        suffix="px"
                                                    />
                                                    <Checkbox size="compact" label="Bold text" />
                                                </EffectToggle>
                                            </Popout.Content>
                                        ),
                                    },
                                    {
                                        id: "advanced",
                                        label: "Advanced",
                                        content: (
                                            <Popout.Content>
                                                <Checkbox size="compact" label="Debug mode" />
                                                <NumberInput
                                                    size="compact"
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
                                                <Text size="xs" c="dimmed">
                                                    © 2026 Graphty
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

        // Phase 7: Verify accessibility attributes
        await expect(panel).toHaveAttribute("aria-modal", "false");
        await expect(panel).toHaveAttribute("aria-labelledby");
        await expect(panel).toHaveAttribute("id");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);

        // Should have three tabs
        await expect(canvas.getByRole("tab", { name: "General" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "Advanced" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "About" })).toBeInTheDocument();

        // First tab should be active by default
        const generalTab = canvas.getByRole("tab", { name: "General" });
        await expect(generalTab).toHaveAttribute("aria-selected", "true");

        // Verify tablist has proper ARIA
        await expect(canvas.getByRole("tablist")).toHaveAttribute("aria-label", "Panel tabs");

        // Leave panel open for user to interact with
    },
};

/**
 * Multiple Popouts: Demonstrates z-index and bring-to-front behavior with multiple panels.
 * Shows how clicking on a panel brings it to the front.
 * This story demonstrates Phase 4 functionality (multiple panels, z-index management).
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
                        The clicked panel will move to the top of the z-index stack
                    </Text>
                </Box>

                {/* Right sidebar with multiple popout triggers */}
                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--mantine-color-body)",
                        borderLeft: "1px solid var(--mantine-color-gray-3)",
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
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        aria-label="Open Panel A"
                                        c="dimmed"
                                    >
                                        <Settings size={12} />
                                    </ActionIcon>
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
                            anchorRef={sidebarRef}
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
                                    <Checkbox size="compact" label="Enable feature X" />
                                    <Checkbox size="compact" label="Enable feature Y" mt="xs" />
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
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        aria-label="Open Panel B"
                                        c="dimmed"
                                    >
                                        <Palette size={12} />
                                    </ActionIcon>
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
                            anchorRef={sidebarRef}
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

                    {/* Panel C - Advanced (demonstrates 3+ panels) */}
                    <Popout>
                        <ControlGroup
                            label="Advanced"
                            actions={
                                <Popout.Trigger>
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        aria-label="Open Panel C"
                                        c="dimmed"
                                    >
                                        <Sliders size={12} />
                                    </ActionIcon>
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
                            anchorRef={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                        >
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-c-content">
                                    This is Panel C. A third panel to demonstrate z-index
                                    management with multiple panels.
                                </Text>
                                <Box mt="md">
                                    <NumberInput
                                        size="compact"
                                        label="Cache size"
                                        defaultValue={1024}
                                        min={0}
                                        max={10000}
                                    />
                                </Box>
                            </Popout.Content>
                        </Popout.Panel>
                    </Popout>

                    {/* Panel D - Nested Demo (Phase 6: demonstrates nested popouts) */}
                    <Popout>
                        <ControlGroup
                            label="Nested Demo"
                            actions={
                                <Popout.Trigger>
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        aria-label="Open Nested Demo"
                                        c="dimmed"
                                    >
                                        <Layers size={12} />
                                    </ActionIcon>
                                </Popout.Trigger>
                            }
                        >
                            <Box p="sm">
                                <Text size="xs" c="dimmed">
                                    Panel D - Nested popout demo
                                </Text>
                            </Box>
                        </ControlGroup>
                        <Popout.Panel
                            width={280}
                            header={{ variant: "title", title: "Panel D - Parent" }}
                            anchorRef={sidebarRef}
                            placement="left"
                            alignment="start"
                            gap={-1}
                        >
                            <Popout.Content>
                                <Text size="xs" data-testid="panel-d-content">
                                    This panel demonstrates nested popouts. Click the button
                                    below to open a child popout.
                                </Text>
                                <Box mt="md">
                                    {/* Nested child popout */}
                                    <Popout>
                                        <Popout.Trigger>
                                            <Button
                                                size="compact"
                                                variant="light"
                                                rightSection={<ChevronRight size={14} />}
                                                aria-label="Open Child Panel"
                                            >
                                                Open Child
                                            </Button>
                                        </Popout.Trigger>
                                        <Popout.Panel
                                            width={220}
                                            header={{ variant: "title", title: "Child Panel" }}
                                            placement="left"
                                            gap={0}
                                        >
                                            <Popout.Content>
                                                <Text size="xs" data-testid="child-panel-content">
                                                    This is a nested child popout! Press Escape to
                                                    close only this panel. Closing the parent will
                                                    also close this panel.
                                                </Text>
                                                <Box mt="md">
                                                    <Checkbox size="compact" label="Child option 1" />
                                                    <Checkbox
                                                        size="compact"
                                                        label="Child option 2"
                                                        mt="xs"
                                                    />
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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Initially no panels should be visible
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // --- Test: Exclusive siblings behavior (Phase 6) ---
        // Open Panel A
        await userEvent.click(canvas.getByLabelText("Open Panel A"));
        await expect(await canvas.findByText("Panel A - Settings")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);

        // Open Panel B - should close Panel A (exclusive siblings)
        await userEvent.click(canvas.getByLabelText("Open Panel B"));
        await expect(await canvas.findByText("Panel B - Appearance")).toBeVisible();
        // Only Panel B should be open (Panel A was closed)
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);
        await expect(canvas.queryByTestId("panel-a-content")).not.toBeInTheDocument();
        await expect(canvas.getByTestId("panel-b-content")).toBeInTheDocument();

        // --- Test: Escape key behavior ---
        await userEvent.keyboard("{Escape}");

        // Panel B should be closed
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // --- Test: Click-outside behavior ---
        await userEvent.click(canvas.getByLabelText("Open Panel A"));
        await expect(await canvas.findByText("Panel A - Settings")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);

        // Click outside (on the main content area)
        const mainContentArea = canvas.getByText("Open both panels, then click to bring one to front");
        await userEvent.click(mainContentArea);

        // Panel should be closed
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);

        // --- Test: Nested popout behavior (Phase 6) ---
        // Open the nested demo panel (Panel D)
        await userEvent.click(canvas.getByLabelText("Open Nested Demo"));
        await expect(await canvas.findByText("Panel D - Parent")).toBeVisible();
        await expect(canvas.getByTestId("panel-d-content")).toBeInTheDocument();

        // Open the child popout
        await userEvent.click(canvas.getByLabelText("Open Child Panel"));
        await expect(await canvas.findByText("Child Panel")).toBeVisible();
        await expect(canvas.getByTestId("child-panel-content")).toBeInTheDocument();

        // Both panels should be open (parent and child, not siblings)
        await expect(canvas.getAllByRole("dialog")).toHaveLength(2);

        // The child panel should have a data-parent-id attribute
        const childPanel = canvas.getAllByRole("dialog").find((p) =>
            p.querySelector('[data-testid="child-panel-content"]'),
        );
        await expect(childPanel).toHaveAttribute("data-parent-id");

        // Press Escape - should only close the child
        await userEvent.keyboard("{Escape}");
        await expect(canvas.getAllByRole("dialog")).toHaveLength(1);
        await expect(canvas.getByTestId("panel-d-content")).toBeInTheDocument();
        await expect(canvas.queryByTestId("child-panel-content")).not.toBeInTheDocument();

        // Reopen the child
        await userEvent.click(canvas.getByLabelText("Open Child Panel"));
        await expect(await canvas.findByText("Child Panel")).toBeVisible();
        await expect(canvas.getAllByRole("dialog")).toHaveLength(2);

        // Close the parent via X button - should close both parent and child
        const parentPanel = canvas.getAllByRole("dialog").find((p) =>
            p.querySelector('[data-testid="panel-d-content"]'),
        );
        const closeButton = parentPanel?.querySelector('[aria-label="Close panel"]') as HTMLElement;
        await userEvent.click(closeButton);

        // All panels should be closed
        await expect(canvas.queryAllByRole("dialog")).toHaveLength(0);
    },
};

/**
 * Demo: A comprehensive example showing Popout features.
 *
 * This demonstrates how to use the Popout component in a production scenario.
 * The LabelSettingsPopout component is a complete, reusable settings panel
 * that showcases:
 * - Tabbed interface for organizing settings
 * - Form controls (inputs, checkboxes, sliders, selects)
 * - Nested child popout (in Advanced tab)
 * - Proper accessibility attributes
 * - Integration with anchor element for positioning
 *
 * This story also demonstrates keyboard accessibility:
 * - Tab: Navigate through interactive elements
 * - Escape: Close the panel (child first, then parent)
 * - Focus management: Focus moves to panel on open, returns to trigger on close
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
                    <Text c="dimmed">Demo: Label Settings with Nested Popout</Text>
                </Box>

                {/* Right sidebar */}
                <Box
                    ref={sidebarRef}
                    px="sm"
                    style={{
                        width: 240,
                        backgroundColor: "var(--mantine-color-body)",
                        borderLeft: "1px solid var(--mantine-color-gray-3)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Control group with LabelSettingsPopout */}
                    <ControlGroup
                        label="Label Settings"
                        actions={<LabelSettingsPopout anchorRef={sidebarRef} />}
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
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        // Panel should not be visible initially
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Open the panel
        await userEvent.click(canvas.getByLabelText("Open label settings"));

        // Panel should now be visible
        const panel = await canvas.findByRole("dialog");
        await expect(panel).toBeVisible();

        // Verify accessibility attributes
        // 1. Panel has role=dialog and aria-modal=false (non-modal)
        await expect(panel).toHaveAttribute("role", "dialog");
        await expect(panel).toHaveAttribute("aria-modal", "false");

        // 2. Panel has aria-labelledby pointing to a title element
        await expect(panel).toHaveAttribute("aria-labelledby");

        // 3. Panel has an ID that matches trigger's aria-controls
        await expect(panel).toHaveAttribute("id");

        // 4. Trigger has correct ARIA attributes
        const trigger = canvas.getByLabelText("Open label settings");
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", panel.id);
        await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");

        // Verify tabs are present
        await expect(canvas.getByRole("tab", { name: "General" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "Advanced" })).toBeInTheDocument();
        await expect(canvas.getByRole("tab", { name: "About" })).toBeInTheDocument();

        // Switch to Advanced tab
        await userEvent.click(canvas.getByRole("tab", { name: "Advanced" }));
        await expect(canvas.getByText("Label opacity")).toBeVisible();

        // Switch to About tab
        await userEvent.click(canvas.getByRole("tab", { name: "About" }));
        await expect(canvas.getByText("Part of @graphty/compact-mantine")).toBeVisible();

        // Test keyboard navigation - press Escape to close
        await userEvent.keyboard("{Escape}");
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();

        // Verify trigger attributes updated
        await expect(trigger).toHaveAttribute("aria-expanded", "false");

        // Reopen to verify focus management
        await userEvent.click(trigger);
        const reopenedPanel = await canvas.findByRole("dialog");
        await expect(reopenedPanel).toBeVisible();

        // Close button should have aria-label
        await expect(canvas.getByLabelText("Close panel")).toBeInTheDocument();

        // Close via close button
        await userEvent.click(canvas.getByLabelText("Close panel"));
        await expect(canvas.queryByRole("dialog")).not.toBeInTheDocument();
    },
};

/**
 * Component compatibility test story for Popout panels.
 *
 * This story tests that all Mantine and custom components with floating UI
 * (dropdowns, menus, tooltips, popovers) work correctly inside a Popout:
 * 1. Their dropdowns appear ABOVE the Popout panel (z-index)
 * 2. Clicking on dropdown options does NOT close the Popout (click-outside handling)
 * 3. Components are styled with the compact theme
 *
 * Organized into tabs by component category:
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
                        borderLeft: "1px solid var(--mantine-color-gray-3)",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    <Popout>
                        <ControlGroup
                            label="Component Test"
                            actions={
                                <Popout.Trigger>
                                    <ActionIcon
                                        variant="subtle"
                                        size="xs"
                                        aria-label="Open component compatibility test"
                                        c="dimmed"
                                    >
                                        <ExternalLink size={12} />
                                    </ActionIcon>
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
                            anchorRef={sidebarRef}
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
                                                        size="compact"
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
                                                        size="compact"
                                                        label="Autocomplete"
                                                        data-testid="test-autocomplete"
                                                        data={["React", "Vue", "Angular", "Svelte", "Solid"]}
                                                        placeholder="Type to search"
                                                    />

                                                    {/* MultiSelect */}
                                                    <MultiSelect
                                                        size="compact"
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
                                                        size="compact"
                                                        label="TagsInput"
                                                        data-testid="test-tagsinput"
                                                        value={tagsValue}
                                                        onChange={setTagsValue}
                                                        data={["tag1", "tag2", "tag3"]}
                                                        placeholder="Add tags"
                                                    />

                                                    {/* ColorInput */}
                                                    <ColorInput
                                                        size="compact"
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
                                                                    <MoreVertical size={14} />
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
    // Note: This story is primarily for manual testing and visual inspection.
    // Automated tests are in tests/popout/PopoutRegression.test.tsx
};
