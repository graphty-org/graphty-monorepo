import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { makeLayer } from "../../../../test/layerFixture";
import { fireEvent, mouseDrag, render, screen, within } from "../../../../test/test-utils";
import { readLayerRowFacts } from "../layerRowFacts";
import { BASE_LAYER_DELETE_REASON, BASE_LAYER_HIDE_REASON, type LayerItem, StyleLayerList } from "../StyleLayerList";

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
 * Drag one row with the mouse onto the top or bottom tenth of another.
 * @param from - the name of the row to drag.
 * @param to - the name of the row to drop on.
 * @param edge - drop above or below the target row's middle.
 */
function drag(from: string, to: string, edge: "above" | "below"): void {
    const box = row(to).getBoundingClientRect();
    mouseDrag(row(from), box.left + box.width / 2, box.top + box.height * (edge === "above" ? 0.1 : 0.9));
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
            {
                moved: "down by one",
                from: "Third",
                to: "Second",
                edge: "below",
                expected: ["First", "Third", "Second"],
            },
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

            expect(screen.getAllByRole("treeitem").every((item) => item.getAttribute("aria-level") === "1")).toBe(true);
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
    describe("row controls", () => {
        const BASE = makeLayer("base", "Node defaults", {
            locked: true,
            source: { by: "element", reason: "default" },
            set: { "node.color": "#56b4e9" },
        });
        const HIDDEN: LayerItem = { ...createLayer("4", "Hidden"), enabled: false };
        const WITH_BASE = [BASE, ...STACK, HIDDEN];
        const FACTS = new Map([
            ["base", { matched: 20, color: "#56b4e9" }],
            ["3", { matched: 2, color: "#e69f00" }],
        ]);

        const inRow = (name: string, label: string): HTMLElement =>
            within(row(name)).getByRole("button", { name: label });

        it("draws the row on the shared tree row: 32 tall, with an 11px paint chip and the count", () => {
            render(<StyleLayerList {...defaultProps} layers={WITH_BASE} facts={FACTS} />);

            expect(row("Third").getBoundingClientRect().height).toBe(32);
            const chip = within(row("Third")).getByTestId("layer-paint-chip");
            expect(chip.getBoundingClientRect().width).toBe(11);
            expect(chip.querySelector(".mantine-ColorSwatch-colorOverlay")).toHaveStyle({
                backgroundColor: "rgb(230, 159, 0)",
            });
            expect(within(row("Third")).getByTestId("tree-count")).toHaveTextContent("2");
            expect(within(row("Node defaults")).getByTestId("tree-count")).toHaveTextContent("20");
        });

        it("hides a shown layer and shows a hidden one", async () => {
            const onLayerEnabledChange = vi.fn();
            render(<StyleLayerList {...defaultProps} layers={WITH_BASE} onLayerEnabledChange={onLayerEnabledChange} />);

            expect(inRow("Third", "Hide layer")).toHaveAttribute("aria-pressed", "false");
            expect(inRow("Hidden", "Hide layer")).toHaveAttribute("aria-pressed", "true");
            expect(row("Hidden")).toHaveAttribute("data-dimmed");

            await userEvent.click(inRow("Third", "Hide layer"));
            await userEvent.click(inRow("Hidden", "Hide layer"));

            expect(onLayerEnabledChange.mock.calls).toEqual([
                ["3", false],
                ["4", true],
            ]);
        });

        it("deletes a layer without selecting it", async () => {
            const onLayerDelete = vi.fn();
            const onLayerSelect = vi.fn();
            render(
                <StyleLayerList
                    {...defaultProps}
                    layers={WITH_BASE}
                    onLayerDelete={onLayerDelete}
                    onLayerSelect={onLayerSelect}
                />,
            );

            await userEvent.click(inRow("Second", "Delete layer"));

            expect(onLayerDelete).toHaveBeenCalledWith("2");
            expect(onLayerSelect).not.toHaveBeenCalled();
        });

        it("disables the base layer's delete and hide, with the reason as the title", async () => {
            const onLayerDelete = vi.fn();
            const onLayerEnabledChange = vi.fn();
            render(
                <StyleLayerList
                    {...defaultProps}
                    layers={WITH_BASE}
                    onLayerDelete={onLayerDelete}
                    onLayerEnabledChange={onLayerEnabledChange}
                />,
            );

            const remove = inRow("Node defaults", "Delete layer");
            expect(remove).toHaveAttribute("aria-disabled", "true");
            expect(remove).toHaveAttribute("title", BASE_LAYER_DELETE_REASON);
            expect(inRow("Node defaults", "Hide layer")).toBeDisabled();
            expect(inRow("Node defaults", "Hide layer")).toHaveAttribute("title", BASE_LAYER_HIDE_REASON);

            await userEvent.click(remove);

            expect(onLayerDelete).not.toHaveBeenCalled();
            expect(onLayerEnabledChange).not.toHaveBeenCalled();
        });

        it("draws the base layer at the bottom and reports only the reader's layers on a reorder", () => {
            const onLayersChange = vi.fn();
            render(<StyleLayerList {...defaultProps} layers={WITH_BASE} onLayersChange={onLayersChange} />);

            expect(screen.getAllByRole("treeitem").at(-1)).toHaveAccessibleName("Node defaults");

            drag("Node defaults", "Third", "above");
            expect(onLayersChange).not.toHaveBeenCalled();

            drag("Third", "First", "below");
            expect(names(onLayersChange.mock.calls[0][0] as LayerItem[])).toEqual([
                "Third",
                "First",
                "Second",
                "Hidden",
            ]);
        });
    });

    describe("readLayerRowFacts", () => {
        it("takes the count from counts() and the colour from the layer's own legend block", () => {
            const layers = [
                makeLayer("a", "Fixed"),
                makeLayer("b", "Encoded", { target: "edge" }),
                makeLayer("c", "Hidden"),
                makeLayer("gone", "Gone"),
            ];
            const block = (channel: string, colors: string[]) => ({
                channel,
                kind: "sequential",
                swatches: colors.map((color, value) => ({ label: color, value, color })),
                facts: [],
                departures: [],
            });
            const styles = {
                counts: (id: string) => ({
                    matched: id.length,
                    painted: {},
                    noValue: 0,
                    outsideScale: 0,
                    revision: "1",
                }),
                legendOf: (id: string) => {
                    if (id === "gone") {
                        throw new Error("E_UNKNOWN_LAYER");
                    }

                    return {
                        a: [block("node.size", ["#999999"]), block("node.color", ["#111111"])],
                        b: [block("edge.color", ["#000000", "#ffffff"])],
                        c: [],
                    }[id];
                },
            } as unknown as Parameters<typeof readLayerRowFacts>[0];

            const facts = readLayerRowFacts(styles, layers);

            expect(facts.get("a")).toEqual({ matched: 1, color: "#111111" });
            expect(facts.get("b")).toEqual({ matched: 1, color: "#ffffff" });
            expect(facts.get("c")).toEqual({ matched: 1, color: undefined });
            expect(facts.has("gone")).toBe(false);
        });
    });
});
