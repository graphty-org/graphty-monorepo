import { SegmentedControl } from "@mantine/core";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SecondaryToolbar, Toolbar, ToolButton, ToolGroup, type ToolItem } from "../../../src";
import { renderShell } from "./render";

const SHAPES: ToolItem[] = [
    { value: "rectangle", label: "Rectangle", icon: <span>R</span>, shortcut: "R" },
    { value: "ellipse", label: "Ellipse", icon: <span>O</span>, shortcut: "O" },
];
const MOVE: ToolItem[] = [{ value: "move", label: "Move", icon: <span>V</span>, shortcut: "V" }];

function Editor({ onToolChange }: { onToolChange?: (v: string) => void }): React.JSX.Element {
    const [tool, setTool] = useState("move");
    return (
        <Toolbar aria-label="Editor">
            <ToolGroup
                label="Move tools"
                tools={MOVE}
                activeTool={tool}
                onToolChange={(v) => {
                    setTool(v);
                    onToolChange?.(v);
                }}
            />
            <ToolGroup
                label="Shape tools"
                tools={SHAPES}
                activeTool={tool}
                onToolChange={(v) => {
                    setTool(v);
                    onToolChange?.(v);
                }}
            />
            <Toolbar.Divider />
            <SegmentedControl
                aria-label="Mode"
                data={[
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                ]}
            />
        </Toolbar>
    );
}

describe("Toolbar", () => {
    it("is a named horizontal toolbar with a default name", () => {
        renderShell(<Toolbar />);
        const bar = screen.getByRole("toolbar", { name: "Tools" });
        expect(bar).toHaveAttribute("aria-orientation", "horizontal");
        expect(bar).toHaveClass("cm-toolbar");
    });

    it("marks itself floating", () => {
        renderShell(<Toolbar floating aria-label="Editor" />);
        expect(screen.getByRole("toolbar")).toHaveAttribute("data-floating");
    });

    it("is one Tab stop that lands on the selected tool", async () => {
        renderShell(<Editor />);
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Move" })).toHaveFocus();
        await userEvent.tab();
        expect(within(screen.getByRole("toolbar")).queryByRole("button", { name: "Rectangle" })).not.toHaveFocus();
    });

    it("moves with the arrows, Home and End, wrapping", async () => {
        renderShell(<Editor />);
        await userEvent.tab();
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("button", { name: "Move tools" })).toHaveFocus();
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("button", { name: "Rectangle" })).toHaveFocus();
        await userEvent.keyboard("{End}");
        expect(document.activeElement).toHaveAttribute("type", "radio");
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("button", { name: "Move" })).toHaveFocus();
        await userEvent.keyboard("{ArrowLeft}");
        expect(document.activeElement).toHaveAttribute("type", "radio");
        await userEvent.keyboard("{Home}");
        expect(screen.getByRole("button", { name: "Move" })).toHaveFocus();
    });
});

describe("ToolButton", () => {
    it("names itself and reports selection with aria-pressed", () => {
        renderShell(<ToolButton label="Frame" icon={<span />} selected />);
        expect(screen.getByRole("button", { name: "Frame" })).toHaveAttribute("aria-pressed", "true");
    });

    it("leaves aria-pressed off an action button", () => {
        renderShell(<ToolButton label="Actions" icon={<span />} />);
        expect(screen.getByRole("button", { name: "Actions" })).not.toHaveAttribute("aria-pressed");
    });
});

// The overlays theme clamps the menu's height to the viewport, which jsdom reports as zero, so
// the open dropdown is display:none here and its rows are queried with `hidden: true`. The
// browser suite (tests/figma/shell.browser.test.tsx) opens the flyout for real.
const HIDDEN = { hidden: true } as const;

describe("ToolGroup", () => {
    it("shows the selected face as pressed", () => {
        renderShell(<ToolGroup label="Shape tools" tools={SHAPES} activeTool="rectangle" />);
        expect(screen.getByRole("group", { name: "Rectangle" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Rectangle" })).toHaveAttribute("aria-pressed", "true");
    });

    it("picks a tool from the flyout, makes it the face and closes", async () => {
        const onToolChange = vi.fn();
        renderShell(<Editor onToolChange={onToolChange} />);
        await userEvent.click(screen.getByRole("button", { name: "Shape tools" }));
        const rows = await screen.findAllByRole("menuitemradio", HIDDEN);
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveAttribute("aria-checked", "true");
        await userEvent.click(screen.getByRole("menuitemradio", { ...HIDDEN, name: /Ellipse/ }));
        expect(onToolChange).toHaveBeenLastCalledWith("ellipse");
        expect(screen.getByRole("button", { name: "Ellipse" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.queryByRole("menuitemradio", HIDDEN)).not.toBeInTheDocument();
    });

    it("keeps the last picked face when another group's tool is chosen", async () => {
        renderShell(<Editor />);
        await userEvent.click(screen.getByRole("button", { name: "Shape tools" }));
        await userEvent.click(await screen.findByRole("menuitemradio", { ...HIDDEN, name: /Ellipse/ }));
        await userEvent.click(screen.getByRole("button", { name: "Move" }));
        expect(screen.getByRole("button", { name: "Ellipse" })).toHaveAttribute("aria-pressed", "false");
    });

    it("selects the face tool when the face is clicked", async () => {
        const onToolChange = vi.fn();
        renderShell(<ToolGroup label="Shape tools" tools={SHAPES} onToolChange={onToolChange} defaultFace="ellipse" />);
        await userEvent.click(screen.getByRole("button", { name: "Ellipse" }));
        expect(onToolChange).toHaveBeenCalledWith("ellipse");
    });
});

describe("SecondaryToolbar", () => {
    it("is a roving toolbar of pressed-state buttons with separators", async () => {
        renderShell(
            <SecondaryToolbar aria-label="Vector editing" flush>
                <SecondaryToolbar.Button icon={<span />} selected>
                    Move
                </SecondaryToolbar.Button>
                <SecondaryToolbar.Divider />
                <SecondaryToolbar.Button>Lasso</SecondaryToolbar.Button>
            </SecondaryToolbar>,
        );
        const bar = screen.getByRole("toolbar", { name: "Vector editing" });
        expect(bar).toHaveAttribute("data-flush");
        expect(screen.getByRole("separator")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Move" })).toHaveAttribute("aria-pressed", "true");
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "Move" })).toHaveFocus();
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("button", { name: "Lasso" })).toHaveFocus();
    });

    it("draws a trailing chevron on a dropdown button", () => {
        renderShell(
            <SecondaryToolbar aria-label="Vector editing">
                <SecondaryToolbar.Button dropdown>More</SecondaryToolbar.Button>
                <SecondaryToolbar.Button>Lasso</SecondaryToolbar.Button>
            </SecondaryToolbar>,
        );
        const more = screen.getByRole("button", { name: "More" });
        expect(more).toHaveAttribute("data-dropdown");
        expect(more.querySelector(".cm-secondary-item-chevron [data-glyph='chevronDown']")).not.toBeNull();
        expect(screen.getByRole("button", { name: "Lasso" }).querySelector(".cm-secondary-item-chevron")).toBeNull();
    });
});
