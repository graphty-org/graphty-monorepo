import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { SearchInput } from "../../../src/components/inputs/SearchInput";

function renderSearch(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

describe("SearchInput", () => {
    it("is a named search box with the default placeholder", () => {
        renderSearch(<SearchInput />);
        const box = screen.getByRole("searchbox", { name: "Search" });
        expect(box).toHaveAttribute("placeholder", "Search");
    });

    it("draws the magnifier in a leading slot, hidden from assistive technology", () => {
        const { container } = renderSearch(<SearchInput />);
        expect(container.querySelector(".cm-search-icon")).toHaveAttribute("aria-hidden", "true");
    });

    it("reports every keystroke, value first", async () => {
        const onChange = vi.fn();
        renderSearch(<SearchInput onChange={onChange} />);
        await userEvent.type(screen.getByRole("searchbox"), "ab");
        expect(onChange).toHaveBeenNthCalledWith(2, "ab", expect.anything());
    });

    it("shows a clear button only when there is text, and clearing refocuses the field", async () => {
        const onChange = vi.fn();
        renderSearch(<SearchInput defaultValue="" onChange={onChange} />);
        expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
        await userEvent.type(screen.getByRole("searchbox"), "x");
        await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
        expect(screen.getByRole("searchbox")).toHaveValue("");
        expect(screen.getByRole("searchbox")).toHaveFocus();
        expect(onChange).toHaveBeenLastCalledWith("", expect.anything());
    });

    it("Escape clears text without bubbling; with nothing to clear it bubbles", async () => {
        const outer = vi.fn();
        const listen = (event: KeyboardEvent): void => {
            outer(event.key);
        };
        document.addEventListener("keydown", listen);
        try {
            renderSearch(<SearchInput defaultValue="abc" />);
            const box = screen.getByRole("searchbox");
            await userEvent.click(box);
            await userEvent.keyboard("{Escape}");
            expect(box).toHaveValue("");
            expect(outer).not.toHaveBeenCalledWith("Escape");
            await userEvent.keyboard("{Escape}");
            expect(outer).toHaveBeenCalledWith("Escape");
        } finally {
            document.removeEventListener("keydown", listen);
        }
    });

    it("takes a caller's names for the clear button and the placeholder", async () => {
        renderSearch(<SearchInput defaultValue="a" clearLabel="Empty" placeholder="Find layers" />);
        expect(screen.getByRole("button", { name: "Empty" })).toBeInTheDocument();
        expect(screen.getByRole("searchbox")).toHaveAttribute("placeholder", "Find layers");
    });

    it("does not autofocus unless asked", () => {
        renderSearch(<SearchInput />);
        expect(screen.getByRole("searchbox")).not.toHaveFocus();
    });

    it("joins a trailing control", () => {
        const { container } = renderSearch(<SearchInput rightSection={<button type="button">Filter</button>} />);
        expect(container.querySelector(".cm-search-joined-end")).toHaveTextContent("Filter");
    });

    it("draws no clear button while disabled", () => {
        renderSearch(<SearchInput defaultValue="a" disabled />);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
});
