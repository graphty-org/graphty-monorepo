import { Menu } from "@mantine/core";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { HelpButton, NavRail, RailButton } from "../../../src";
import { renderShell } from "./render";

function Rail(): React.JSX.Element {
    const [open, setOpen] = useState("file");
    return (
        <NavRail footer={<button type="button">Updates</button>}>
            {["file", "assets", "tools"].map((v) => (
                <RailButton
                    key={v}
                    icon={<span />}
                    label={v}
                    aria-expanded={open === v}
                    onClick={() => {
                        setOpen(v);
                    }}
                />
            ))}
            <NavRail.Separator />
        </NavRail>
    );
}

describe("NavRail", () => {
    it("is a vertical toolbar named Navigation by default", () => {
        renderShell(<Rail />);
        expect(screen.getByRole("toolbar", { name: "Navigation" })).toHaveAttribute("aria-orientation", "vertical");
        expect(screen.getByRole("separator")).toHaveClass("cm-nav-rail-separator");
    });

    it("starts on the open destination and moves with ArrowUp / ArrowDown, into the footer", async () => {
        renderShell(<Rail />);
        await userEvent.tab();
        expect(screen.getByRole("button", { name: "file" })).toHaveFocus();
        await userEvent.keyboard("{ArrowDown}");
        expect(screen.getByRole("button", { name: "assets" })).toHaveFocus();
        await userEvent.keyboard("{Enter}");
        expect(screen.getByRole("button", { name: "assets" })).toHaveAttribute("aria-expanded", "true");
        await userEvent.keyboard("{End}");
        expect(screen.getByRole("button", { name: "Updates" })).toHaveFocus();
    });
});

describe("RailButton", () => {
    it("draws the caption and marks itself active from active or aria-expanded", () => {
        renderShell(
            <>
                <RailButton icon={<span />} label="Assets" active />
                <RailButton icon={<span />} label="Tools" aria-expanded />
                <RailButton icon={<span />} label="Files" />
            </>,
        );
        expect(screen.getByText("Assets")).toHaveClass("cm-rail-label");
        expect(screen.getByRole("button", { name: "Assets" })).toHaveAttribute("data-active");
        expect(screen.getByRole("button", { name: "Tools" })).toHaveAttribute("data-active");
        expect(screen.getByRole("button", { name: "Files" })).not.toHaveAttribute("data-active");
    });
});

describe("HelpButton", () => {
    it("is named Help by default", () => {
        renderShell(<HelpButton />);
        expect(screen.getByRole("button", { name: "Help" })).toHaveClass("cm-help-button");
    });

    it("draws Figma's bare question mark in a 30 x 32 box, not the circled register glyph", () => {
        renderShell(<HelpButton />);
        const svg = screen.getByRole("button", { name: "Help" }).querySelector("svg");
        expect(svg).toHaveAttribute("width", "30");
        expect(svg).toHaveAttribute("height", "32");
        expect(svg).not.toHaveAttribute("data-glyph");
    });

    it("opens the caller's dark menu", async () => {
        const onClick = vi.fn();
        renderShell(
            <HelpButton label="Help and resources">
                <Menu.Item onClick={onClick}>Keyboard shortcuts</Menu.Item>
            </HelpButton>,
        );
        await userEvent.click(screen.getByRole("button", { name: "Help and resources" }));
        // Queried with hidden: jsdom's zero viewport clamps the themed menu to display:none.
        const item = await screen.findByRole("menuitem", { hidden: true, name: "Keyboard shortcuts" });
        expect(screen.getByRole("menu", { hidden: true })).toHaveClass("cm-menu-surface");
        await userEvent.click(item);
        expect(onClick).toHaveBeenCalled();
    });
});
