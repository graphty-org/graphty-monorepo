import { SegmentedControl, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, waitFor, within } from "@storybook/test";
import { useState } from "react";

import { Toolbar, ToolButton, ToolGroup } from "../../../src";
import { frameTools, icons, moveTools, shapeTools, textTools } from "./fixtures";

const meta: Meta<typeof Toolbar> = {
    title: "Figma/Shell/Toolbar",
    component: Toolbar,
};

export default meta;
type Story = StoryObj<typeof Toolbar>;

function EditorToolbar(): React.JSX.Element {
    const [tool, setTool] = useState("move");
    const [mode, setMode] = useState("design");
    return (
        <Toolbar aria-label="Editor">
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
 * The bar sits at the foot of a 320px frame, as it does on Figma's canvas, so its tooltips and
 * flyouts open above it.
 * @param props - Component props
 * @param props.children - The toolbar
 * @returns The frame
 */
function CanvasFoot({ children }: { children: React.ReactNode }): React.JSX.Element {
    return <div style={{ minHeight: 320, display: "flex", alignItems: "flex-end" }}>{children}</div>;
}

/** The whole floating toolbar: pick a tool, open a flyout, Tab in and use the arrows. */
export const Default: Story = {
    render: () => (
        <CanvasFoot>
            <EditorToolbar />
        </CanvasFoot>
    ),
};

/** Every state of the tool button and the chevron, side by side. */
export const States: Story = {
    render: () => (
        <Stack gap={16}>
            {(["rest", "hover", "press", "focus"] as const).map((state) => (
                <Stack key={state} gap={4}>
                    <Text size="xs">{state}</Text>
                    <Toolbar aria-label={`Tool button ${state}`}>
                        <ToolButton label="Rectangle" icon={icons.rectangle} data-state={state} />
                        <ToolButton label="Move" icon={icons.move} selected data-state={state} />
                        <ToolGroup label="Region tools" tools={frameTools} chevronProps={{ "data-state": state }} />
                    </Toolbar>
                </Stack>
            ))}
            <Stack gap={4}>
                <Text size="xs">open (flyout up)</Text>
                <Toolbar aria-label="Open chevron">
                    <ToolGroup label="Region tools" tools={frameTools} chevronProps={{ "data-state": "open" }} />
                </Toolbar>
            </Stack>
        </Stack>
    ),
};

/** The flyout left open: a dark menu 4px above the chevron, start-aligned (bt/flyout-ShapeTools-chevron). */
export const FlyoutOpen: Story = {
    render: () => (
        <CanvasFoot>
            <EditorToolbar />
        </CanvasFoot>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "Shape tools" }));
        await expect(await within(document.body).findByRole("menu", { name: "Shape tools" })).toBeVisible();
    },
};

/** The flyout: the chevron opens a dark menu above; picking a row makes it the face. */
export const Flyout: Story = {
    render: () => (
        <CanvasFoot>
            <EditorToolbar />
        </CanvasFoot>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getByRole("button", { name: "Shape tools" }));
        const body = within(document.body);
        const ellipse = await body.findByRole("menuitemradio", { name: /Ellipse/ });
        await userEvent.click(ellipse);
        const face = canvas.getByRole("button", { name: "Ellipse" });
        await expect(face).toHaveAttribute("aria-pressed", "true");
        // The picked tool is now the toolbar's Tab stop (spec 11.1).
        await waitFor(() => expect(face).toHaveFocus());
        await expect(face).toHaveAttribute("tabindex", "0");
    },
};

/** Keyboard: one Tab stop on the selected tool, arrows move between tools, chevrons and modes. */
export const Keyboard: Story = {
    render: () => (
        <CanvasFoot>
            <EditorToolbar />
        </CanvasFoot>
    ),
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await userEvent.tab();
        await expect(canvas.getByRole("button", { name: "Move" })).toHaveFocus();
        await userEvent.keyboard("{ArrowRight}");
        await expect(canvas.getByRole("button", { name: "Move tools" })).toHaveFocus();
    },
};
