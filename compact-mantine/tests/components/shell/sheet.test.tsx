import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ShortcutSheet, type ShortcutSheetTab } from "../../../src";
import { renderShell } from "./render";

const TABS: ShortcutSheetTab[] = [
    { value: "essential", label: "Essential", groups: [{ shortcuts: [{ label: "Actions", keys: ["Ctrl", "K"], highlighted: true }] }] },
    { value: "tools", label: "Tools", groups: [{ title: "Tools", shortcuts: [{ label: "Frame tool", keys: ["F"] }] }] },
    { value: "view", label: "View", groups: [] },
];

describe("ShortcutSheet", () => {
    it("names itself and its tabs, showing the first tab", () => {
        renderShell(<ShortcutSheet tabs={TABS} />);
        expect(screen.getByRole("region", { name: "Keyboard shortcuts" })).toBeInTheDocument();
        expect(screen.getByRole("tablist", { name: "Keyboard shortcuts" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Essential" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tabpanel")).toHaveTextContent("Actions");
    });

    it("lights the key caps of a highlighted entry", () => {
        renderShell(<ShortcutSheet tabs={TABS} />);
        expect(screen.getByText("Ctrl")).toHaveAttribute("data-active");
        expect(screen.getByText("Ctrl")).toHaveClass("cm-kbd");
    });

    it("marks the tabs either side of the open one for the folder-tab edges", () => {
        renderShell(<ShortcutSheet tabs={TABS} defaultValue="tools" />);
        expect(screen.getByRole("tab", { name: "Essential" })).toHaveAttribute("data-left-of-active");
        expect(screen.getByRole("tab", { name: "View" })).toHaveAttribute("data-right-of-active");
    });

    it("does not take focus on open; arrows move and select tabs", async () => {
        const onChange = vi.fn();
        renderShell(<ShortcutSheet tabs={TABS} onChange={onChange} />);
        expect(document.body).toHaveFocus();
        await userEvent.tab();
        expect(screen.getByRole("tab", { name: "Essential" })).toHaveFocus();
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "Tools" })).toHaveFocus();
        expect(onChange).toHaveBeenLastCalledWith("tools");
        expect(screen.getByRole("tabpanel")).toHaveTextContent("Frame tool");
        await userEvent.keyboard("{End}");
        expect(screen.getByRole("tab", { name: "View" })).toHaveAttribute("aria-selected", "true");
        await userEvent.keyboard("{ArrowRight}");
        expect(screen.getByRole("tab", { name: "Essential" })).toHaveAttribute("aria-selected", "true");
    });

    it("closes with the close button and with Escape", async () => {
        const onClose = vi.fn();
        renderShell(<ShortcutSheet tabs={TABS} onClose={onClose} />);
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
        expect(onClose).toHaveBeenCalledTimes(1);
        await userEvent.click(screen.getByRole("tab", { name: "Tools" }));
        await userEvent.keyboard("{Escape}");
        expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("draws the essential tab: caption, numbered columns, descriptions and md caps", () => {
        renderShell(
            <ShortcutSheet
                tabs={[
                    {
                        value: "essential",
                        label: "Essential",
                        variant: "essential",
                        caption: "Essential keyboard shortcuts",
                        groups: [
                            { shortcuts: [{ label: "Pick color", description: "Grab a color", keys: ["I"] }] },
                            { shortcuts: [{ label: "Actions", keys: ["K"] }] },
                        ],
                    },
                ]}
            />,
        );
        const panel = screen.getByRole("tabpanel");
        expect(panel).toHaveAttribute("data-variant", "essential");
        expect(panel.querySelector(".cm-sheet-caption")).toHaveTextContent("Essential keyboard shortcuts");
        expect(Array.from(panel.querySelectorAll(".cm-sheet-step"), (el) => el.textContent)).toEqual(["1", "2"]);
        expect(panel.querySelector(".cm-sheet-row-description")).toHaveTextContent("Grab a color");
        expect(screen.getByText("I").style.getPropertyValue("--kbd-height")).toBe("31px");
    });

    it("keeps the list layout by default: no caption, no steps, sm caps", () => {
        renderShell(<ShortcutSheet tabs={TABS} defaultValue="tools" />);
        const panel = screen.getByRole("tabpanel");
        expect(panel).not.toHaveAttribute("data-variant");
        expect(panel.querySelector(".cm-sheet-caption, .cm-sheet-step")).toBeNull();
        expect(screen.getByText("F").style.getPropertyValue("--kbd-height")).toBe("25px");
    });
});
