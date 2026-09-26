import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeLayer } from "../../../../test/layerFixture";
import { fireEvent, render, screen } from "../../../../test/test-utils";
import { type LayerItem, StyleLayerList } from "../StyleLayerList";

const createLayer = (id: string, name: string): LayerItem => makeLayer(id, name);

/** Bottom first, as graphty-element stores them; the list draws them top first. */
const STACK = [createLayer("1", "First"), createLayer("2", "Second"), createLayer("3", "Third")];

const defaultProps = {
    layers: STACK,
    selectedLayerId: null,
    onLayersChange: vi.fn(),
    onLayerSelect: vi.fn(),
};

const row = (name: string): HTMLElement => screen.getByRole("treeitem", { name });

const names = (layers: LayerItem[]): string[] => layers.map((layer) => layer.name);

/**
 * Drag one row onto the top or bottom quarter of another with the HTML5 drag events the
 * Tree listens for.
 * @param from - the name of the row to drag.
 * @param to - the name of the row to drop on.
 * @param edge - drop above or below the target row's middle.
 */
function drag(from: string, to: string, edge: "above" | "below"): void {
    const dataTransfer = new DataTransfer();
    const box = row(to).getBoundingClientRect();
    const clientY = box.top + box.height * (edge === "above" ? 0.1 : 0.9);
    fireEvent.dragStart(row(from), { dataTransfer });
    fireEvent.dragOver(row(to), { dataTransfer, clientY });
    fireEvent.drop(row(to), { dataTransfer, clientY });
}

describe("StyleLayerList", () => {
    it("is a tree named for what it lists", () => {
        render(<StyleLayerList {...defaultProps} />);

        expect(screen.getByRole("tree", { name: "Style layers" })).toBeInTheDocument();
    });

    it("draws the layers in reverse order, the highest precedence first", () => {
        render(<StyleLayerList {...defaultProps} />);

        expect(screen.getAllByRole("treeitem").map((item) => item.getAttribute("aria-label"))).toEqual([
            "Third",
            "Second",
            "First",
        ]);
    });

    it("marks the selected layer", () => {
        render(<StyleLayerList {...defaultProps} selectedLayerId="2" />);

        expect(row("Second")).toHaveAttribute("aria-selected", "true");
        expect(row("First")).toHaveAttribute("aria-selected", "false");
    });

    it("selects a layer on click", async () => {
        const onLayerSelect = vi.fn();
        render(<StyleLayerList {...defaultProps} onLayerSelect={onLayerSelect} />);

        await userEvent.click(row("Second"));

        expect(onLayerSelect).toHaveBeenCalledWith("2");
    });

    describe("rename", () => {
        it("opens on double-click holding the current name", () => {
            render(<StyleLayerList {...defaultProps} />);

            fireEvent.doubleClick(row("Second"));

            expect(screen.getByRole("textbox", { name: "Layer name" })).toHaveValue("Second");
        });

        it("opens on F2 and commits the trimmed name on Enter", async () => {
            const onLayersChange = vi.fn();
            render(<StyleLayerList {...defaultProps} onLayersChange={onLayersChange} />);

            await userEvent.click(row("Second"));
            await userEvent.keyboard("{F2}");
            const input = screen.getByRole("textbox", { name: "Layer name" });
            await userEvent.clear(input);
            await userEvent.type(input, "  Renamed  {Enter}");

            expect(onLayersChange).toHaveBeenCalledTimes(1);
            expect(names(onLayersChange.mock.calls[0][0] as LayerItem[])).toEqual(["First", "Renamed", "Third"]);
        });

        it("commits on blur", async () => {
            const onLayersChange = vi.fn();
            render(<StyleLayerList {...defaultProps} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(row("First"));
            const input = screen.getByRole("textbox", { name: "Layer name" });
            await userEvent.clear(input);
            await userEvent.type(input, "Bottom");
            fireEvent.blur(input);

            expect(names(onLayersChange.mock.calls[0][0] as LayerItem[])).toEqual(["Bottom", "Second", "Third"]);
        });

        it("cancels on Escape", async () => {
            const onLayersChange = vi.fn();
            render(<StyleLayerList {...defaultProps} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(row("Second"));
            const input = screen.getByRole("textbox", { name: "Layer name" });
            await userEvent.clear(input);
            await userEvent.type(input, "Changed{Escape}");

            expect(onLayersChange).not.toHaveBeenCalled();
            expect(row("Second")).toBeInTheDocument();
        });

        it.each([
            ["empty", "{Enter}"],
            ["whitespace", "   {Enter}"],
        ])("refuses an %s name", async (_kind, keys) => {
            const onLayersChange = vi.fn();
            render(<StyleLayerList {...defaultProps} onLayersChange={onLayersChange} />);

            fireEvent.doubleClick(row("Second"));
            const input = screen.getByRole("textbox", { name: "Layer name" });
            await userEvent.clear(input);
            await userEvent.type(input, keys);

            expect(onLayersChange).not.toHaveBeenCalled();
        });
    });

    describe("reorder", () => {
        // Drawn top first: Third, Second, First. The callback gets the stack bottom first.
        it.each([
            { moved: "up by one", from: "First", to: "Second", edge: "above", expected: ["Second", "First", "Third"] },
            { moved: "up by two", from: "First", to: "Third", edge: "above", expected: ["Second", "Third", "First"] },
            { moved: "down by one", from: "Third", to: "Second", edge: "below", expected: ["First", "Third", "Second"] },
            { moved: "down by two", from: "Third", to: "First", edge: "below", expected: ["Third", "First", "Second"] },
        ] as const)("moves the dragged layer $moved", ({ from, to, edge, expected }) => {
            const onLayersChange = vi.fn();
            render(<StyleLayerList {...defaultProps} onLayersChange={onLayersChange} />);

            drag(from, to, edge);

            expect(onLayersChange).toHaveBeenCalledTimes(1);
            expect(names(onLayersChange.mock.calls[0][0] as LayerItem[])).toEqual(expected);
        });

        it("never nests a layer inside another", () => {
            render(<StyleLayerList {...defaultProps} />);

            expect(screen.getAllByRole("treeitem").every((item) => item.getAttribute("aria-level") === "1")).toBe(
                true,
            );
            expect(screen.getAllByRole("treeitem").some((item) => item.hasAttribute("aria-expanded"))).toBe(false);
        });

        it.each([
            { key: "{Alt>}{ArrowUp}{/Alt}", layer: "Second", expected: ["First", "Third", "Second"] },
            { key: "{Alt>}{ArrowDown}{/Alt}", layer: "Second", expected: ["Second", "First", "Third"] },
        ])("moves the focused layer one place with $key", async ({ key, layer, expected }) => {
            const onLayersChange = vi.fn();
            render(<StyleLayerList {...defaultProps} onLayersChange={onLayersChange} />);

            await userEvent.click(row(layer));
            await userEvent.keyboard(key);

            expect(onLayersChange).toHaveBeenCalledTimes(1);
            expect(names(onLayersChange.mock.calls[0][0] as LayerItem[])).toEqual(expected);
        });
    });
});
