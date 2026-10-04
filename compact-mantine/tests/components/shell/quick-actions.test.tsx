import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type QuickAction, QuickActions } from "../../../src";
import { renderShell } from "./render";

const ACTIONS: QuickAction[] = [
    { value: "wire", label: "Ink Wireframe", section: "Recents" },
    { value: "image", label: "Make an image", section: "Image editing" },
    { value: "boost", label: "Boost resolution", section: "Image editing", disabled: true },
    { value: "frame", label: "Frame", section: "Design tools", shortcut: "F", keywords: ["board"] },
];

describe("QuickActions", () => {
    it("is a named dialog with a combobox that has focus and a listbox", () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} />);
        expect(screen.getByRole("dialog", { name: "Quick actions" })).toBeInTheDocument();
        const input = screen.getByRole("combobox", { name: "Search actions" });
        expect(input).toHaveFocus();
        expect(screen.getByRole("listbox")).toBeInTheDocument();
        expect(screen.getByRole("group", { name: "Image editing" })).toBeInTheDocument();
    });

    it("highlights the first row on open, exposed through aria-activedescendant", () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} />);
        const first = screen.getByRole("option", { name: "Ink Wireframe" });
        expect(first).toHaveAttribute("data-highlighted");
        expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", first.id);
    });

    it("moves the highlight with the arrows, skipping disabled rows, and runs with Enter", async () => {
        const onRun = vi.fn();
        renderShell(<QuickActions actions={ACTIONS} onRun={onRun} />);
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        expect(screen.getByRole("option", { name: /Frame/ })).toHaveAttribute("data-highlighted");
        await userEvent.keyboard("{ArrowDown}");
        expect(screen.getByRole("option", { name: "Ink Wireframe" })).toHaveAttribute("data-highlighted");
        await userEvent.keyboard("{ArrowUp}{Enter}");
        expect(onRun).toHaveBeenCalledWith("frame");
    });

    it("filters as you type, on the name or a keyword, and highlights the first match", async () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} />);
        await userEvent.type(screen.getByRole("combobox"), "board");
        expect(screen.getAllByRole("option")).toHaveLength(1);
        expect(screen.getByRole("option", { name: /Frame/ })).toHaveAttribute("data-highlighted");
        await userEvent.clear(screen.getByRole("combobox"));
        await userEvent.type(screen.getByRole("combobox"), "zzz");
        expect(screen.getByText("No results")).toBeInTheDocument();
    });

    it("runs a clicked row, not a disabled one, and closes with Escape", async () => {
        const onRun = vi.fn();
        const onClose = vi.fn();
        renderShell(<QuickActions actions={ACTIONS} onRun={onRun} onClose={onClose} />);
        await userEvent.click(screen.getByRole("option", { name: "Boost resolution" }));
        expect(onRun).not.toHaveBeenCalled();
        await userEvent.click(screen.getByRole("option", { name: "Make an image" }));
        expect(onRun).toHaveBeenCalledWith("image");
        await userEvent.keyboard("{Escape}");
        expect(onClose).toHaveBeenCalled();
    });

    it("takes a custom filter and a controlled query", () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} query="x" filter={(a) => a.value === "frame"} />);
        expect(screen.getAllByRole("option")).toHaveLength(1);
        expect(screen.getByRole("combobox")).toHaveValue("x");
    });

    it("lists a search's results flat, without section headings", async () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} />);
        expect(screen.getByText("Recents")).toBeInTheDocument();
        // "fr" matches a row under Recents and one under Design tools
        await userEvent.keyboard("fr");
        expect(screen.queryByText("Recents")).not.toBeInTheDocument();
        expect(screen.queryByText("Design tools")).not.toBeInTheDocument();
        expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Ink Wireframe", "FrameF"]);
    });

    it("shows the trailing search action until there is text, then its own clear button", async () => {
        renderShell(
            <QuickActions
                actions={ACTIONS}
                onRun={vi.fn()}
                searchAction={<button type="button">Visual search</button>}
            />,
        );
        expect(screen.getByRole("button", { name: "Visual search" })).toBeInTheDocument();
        await userEvent.keyboard("fr");
        expect(screen.queryByRole("button", { name: "Visual search" })).not.toBeInTheDocument();
        await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
        expect(screen.getByRole("combobox")).toHaveValue("");
        expect(screen.getByRole("button", { name: "Visual search" })).toBeInTheDocument();
    });

    describe("the field list options", () => {
        const FIELDS: QuickAction[] = [
            { value: "degree", label: "degree" },
            {
                value: "community",
                label: "community",
                disabled: true,
                description: "Holds groups, not amounts",
            },
            { value: "chapters", label: "shared_chapters_with_valjean" },
        ];

        it("draws a second line as the option's description, keeping the name its label alone", async () => {
            renderShell(<QuickActions actions={FIELDS} onRun={vi.fn()} />);
            const option = screen.getByRole("option", { name: "community" });
            expect(option).toHaveAccessibleDescription("Holds groups, not amounts");
            // A search keeps the reason, where it would lose a section heading.
            await userEvent.keyboard("comm");
            expect(screen.getByRole("option", { name: "community" })).toHaveAccessibleDescription(
                "Holds groups, not amounts",
            );
        });

        it("hides the search field at or below the threshold and puts focus on the list", async () => {
            const onRun = vi.fn();
            const onClose = vi.fn();
            renderShell(<QuickActions actions={FIELDS} onRun={onRun} onClose={onClose} searchThreshold={15} />);
            expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
            const list = screen.getByRole("listbox");
            expect(list).toHaveFocus();
            expect(list).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "degree" }).id);
            await userEvent.keyboard("{ArrowDown}");
            expect(screen.getByRole("option", { name: /shared_chapters/ })).toHaveAttribute("data-highlighted");
            await userEvent.keyboard("{Enter}");
            expect(onRun).toHaveBeenCalledWith("chapters");
            await userEvent.keyboard("{Escape}");
            expect(onClose).toHaveBeenCalled();
        });

        it("shows the search field past the threshold", () => {
            renderShell(<QuickActions actions={FIELDS} onRun={vi.fn()} searchThreshold={2} />);
            expect(screen.getByRole("combobox")).toHaveFocus();
        });

        it("opens on the first item, and a letter moves to the search field", async () => {
            const onRun = vi.fn();
            renderShell(<QuickActions actions={FIELDS} onRun={onRun} initialFocus="first" />);
            expect(screen.getByRole("listbox")).toHaveFocus();
            await userEvent.keyboard("s");
            expect(screen.getByRole("combobox")).toHaveFocus();
            expect(screen.getByRole("combobox")).toHaveValue("s");
            expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual([
                "shared_chapters_with_valjean",
            ]);
            await userEvent.keyboard("{Enter}");
            expect(onRun).toHaveBeenCalledTimes(1);
            expect(onRun).toHaveBeenCalledWith("chapters");
        });

        it("leaves Space on the list alone: focus and the search stay put", async () => {
            const onRun = vi.fn();
            renderShell(<QuickActions actions={FIELDS} onRun={onRun} initialFocus="first" />);
            await userEvent.keyboard(" ");
            expect(screen.getByRole("listbox")).toHaveFocus();
            expect(screen.getByRole("combobox")).toHaveValue("");
            expect(onRun).not.toHaveBeenCalled();
        });

        it("cuts a name in the middle when asked, with the full name as the tooltip", () => {
            renderShell(<QuickActions actions={FIELDS} onRun={vi.fn()} truncate="middle" />);
            const option = screen.getByRole("option", { name: "shared_chapters_with_valjean" });
            expect(option).toHaveAttribute("title", "shared_chapters_with_valjean");
            expect(option.querySelector(".cm-qa-row-tail")).toHaveTextContent("_valjean");
        });
    });
});
