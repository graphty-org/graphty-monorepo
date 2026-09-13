import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../test/test-utils";
import { COMMAND_PALETTE_EMPTY, CommandPalette, type CommandPaletteItem } from "../CommandPalette";

const items: CommandPaletteItem[] = [
    { id: "goto-data", group: "Go to", label: "Data", onSelect: vi.fn() },
    { id: "view-toolbar", group: "View", label: "Show canvas toolbar", onSelect: vi.fn() },
    { id: "view-fit", group: "View", label: "Zoom to fit", chipFor: "zoomToFit", onSelect: vi.fn() },
];

/**
 * Renders the palette open, with the three rows above unless told otherwise.
 * @param overrides - the props to change.
 * @returns the close handler, so a board can assert the one commit point.
 */
function renderPalette(overrides: Partial<React.ComponentProps<typeof CommandPalette>> = {}) {
    const onClose = vi.fn();

    render(<CommandPalette opened onClose={onClose} items={items} {...overrides} />);

    return { onClose };
}

describe("CommandPalette", () => {
    describe("the rows", () => {
        it("draws every command in words, with its group", async () => {
            renderPalette();

            const rows = await screen.findAllByRole("option");

            expect(rows.map((row) => row.textContent)).toEqual([
                "Go toData",
                "ViewShow canvas toolbar",
                "ViewZoom to fit0",
            ]);
        });

        it("prints a row's key chip from the one binding table", async () => {
            renderPalette();

            expect(await screen.findByRole("option", { name: /Zoom to fit/ })).toHaveTextContent("0");
        });
    });

    describe("the query", () => {
        it("matches every word against the group and the label", async () => {
            renderPalette();

            fireEvent.change(await screen.findByLabelText("Search commands, nodes and edges"), {
                target: { value: "show tool" },
            });

            expect(screen.getAllByRole("option")).toHaveLength(1);
            expect(screen.getByRole("option", { name: /Show canvas toolbar/ })).toBeInTheDocument();
        });

        it("says so when nothing matches", async () => {
            renderPalette();

            fireEvent.change(await screen.findByLabelText("Search commands, nodes and edges"), {
                target: { value: "nothing here" },
            });

            expect(screen.getByText(COMMAND_PALETTE_EMPTY)).toBeInTheDocument();
        });
    });

    describe("taking a row", () => {
        it("closes first, then runs the command: one commit point", async () => {
            const onSelect = vi.fn();
            const { onClose } = renderPalette({
                items: [{ id: "one", group: "View", label: "Zoom to fit", onSelect }],
            });

            fireEvent.click(await screen.findByRole("option", { name: /Zoom to fit/ }));

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(onSelect).toHaveBeenCalledTimes(1);
        });
    });
});
