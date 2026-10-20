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

    it("is a named group, not a second dialog, when placed inside a pop-out", () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} role="group" aria-label="Size by attribute" />);
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(screen.getByRole("group", { name: "Size by attribute" })).toBeInTheDocument();
    });

    it("draws a component-toned name, and takes its own accessible name", () => {
        renderShell(
            <QuickActions
                actions={[{ value: "layer", label: "<Layer>", "aria-label": "Layer", tone: "component" }]}
                onRun={vi.fn()}
            />,
        );
        const option = screen.getByRole("option", { name: "Layer" });
        expect(option.querySelector(".cm-qa-row-label")).toHaveAttribute("data-tone", "component");
        expect(option.querySelector(".cm-qa-row-label")).toHaveTextContent("<Layer>");
    });

    it("highlights the first row on open, exposed through aria-activedescendant", () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} />);
        const first = screen.getByRole("option", { name: "Ink Wireframe" });
        expect(first).toHaveAttribute("data-highlighted");
        expect(screen.getByRole("combobox")).toHaveAttribute("aria-activedescendant", first.id);
    });

    it("moves the highlight with the arrows, reaching disabled rows, and runs with Enter", async () => {
        const onRun = vi.fn();
        renderShell(<QuickActions actions={ACTIONS} onRun={onRun} />);
        // A disabled row is reached, so its reason is read; Enter there runs nothing.
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        expect(screen.getByRole("option", { name: "Boost resolution" })).toHaveAttribute("data-highlighted");
        await userEvent.keyboard("{Enter}");
        expect(onRun).not.toHaveBeenCalled();
        await userEvent.keyboard("{ArrowDown}");
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

    it("speaks No results from a live region that was there before the search emptied the list", async () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} />);
        const status = screen.getByRole("status");
        expect(status).toHaveAttribute("aria-live", "polite");
        expect(status).toBeEmptyDOMElement();
        await userEvent.type(screen.getByRole("combobox"), "zzz");
        expect(screen.getByRole("status")).toBe(status);
        expect(status).toHaveTextContent("No results");
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

        it("puts why a row cannot run in its name, after its label", async () => {
            renderShell(<QuickActions actions={FIELDS} onRun={vi.fn()} />);
            const option = screen.getByRole("option", { name: "community, Holds groups, not amounts" });
            expect(option).not.toHaveAttribute("aria-describedby");
            // A search keeps the reason, where it would lose a section heading.
            await userEvent.keyboard("comm");
            screen.getByRole("option", { name: "community, Holds groups, not amounts" });
        });

        it("reads selected only on the value in force, never on the row the arrows are on", async () => {
            renderShell(<QuickActions actions={FIELDS} onRun={vi.fn()} highlight="chapters" />);
            const input = screen.getByRole("combobox");
            const chapters = screen.getByRole("option", { name: "shared_chapters_with_valjean" });
            expect(chapters).toHaveAttribute("aria-selected", "true");
            await userEvent.keyboard("{ArrowUp}");
            expect(input.getAttribute("aria-activedescendant")).not.toBe(chapters.id);
            expect(screen.getByRole("option", { name: "degree" })).toHaveAttribute("aria-selected", "false");
            expect(chapters).toHaveAttribute("aria-selected", "true");
        });

        it("keeps the search field and focus on a short list; the arrows, Enter and Escape work there", async () => {
            const onRun = vi.fn();
            const onClose = vi.fn();
            renderShell(<QuickActions actions={FIELDS} onRun={onRun} onClose={onClose} />);
            const input = screen.getByRole("combobox");
            expect(input).toHaveFocus();
            const list = screen.getByRole("listbox");
            expect(list).not.toHaveAttribute("tabindex");
            expect(list).not.toHaveAttribute("aria-activedescendant");
            expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "degree" }).id);
            // The disabled field stays listed, and the arrows reach it, so its reason is read.
            const community = screen.getByRole("option", { name: /^community/ });
            expect(community).toHaveAttribute("aria-disabled", "true");
            await userEvent.keyboard("{ArrowDown}");
            expect(input).toHaveAttribute("aria-activedescendant", community.id);
            await userEvent.keyboard("{Enter}");
            expect(onRun).not.toHaveBeenCalled();
            await userEvent.keyboard("{ArrowDown}");
            expect(input).toHaveFocus();
            expect(screen.getByRole("option", { name: /shared_chapters/ })).toHaveAttribute("data-highlighted");
            await userEvent.keyboard("{Enter}");
            expect(onRun).toHaveBeenCalledWith("chapters");
            await userEvent.keyboard("{Escape}");
            expect(onClose).toHaveBeenCalled();
        });

        it("cuts a name in the middle when asked, with the full name as the tooltip", () => {
            renderShell(<QuickActions actions={FIELDS} onRun={vi.fn()} truncate="middle" />);
            const option = screen.getByRole("option", { name: "shared_chapters_with_valjean" });
            expect(option).toHaveAttribute("title", "shared_chapters_with_valjean");
            expect(option.querySelector(".cm-qa-row-tail")).toHaveTextContent("_valjean");
        });
    });
});
