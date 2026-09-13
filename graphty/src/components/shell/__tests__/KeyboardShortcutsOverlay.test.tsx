import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../test/test-utils";
import { formatChords, SHELL_KEY_BINDINGS } from "../bindings";
import {
    KEYBOARD_SHORTCUTS_CLOSE_TITLE,
    KEYBOARD_SHORTCUTS_TITLE,
    KeyboardShortcutsOverlay,
} from "../KeyboardShortcutsOverlay";

describe("KeyboardShortcutsOverlay", () => {
    describe("its open state", () => {
        it("draws nothing while it is closed", () => {
            render(<KeyboardShortcutsOverlay opened={false} onClose={vi.fn()} />);

            expect(screen.queryByTestId("keyboard-shortcuts")).toBeNull();
        });

        it("names itself when it is open", () => {
            render(<KeyboardShortcutsOverlay opened onClose={vi.fn()} />);

            expect(screen.getByRole("region", { name: KEYBOARD_SHORTCUTS_TITLE })).toBeInTheDocument();
        });
    });

    describe("the table", () => {
        it("reads its rows from the one binding table", () => {
            render(<KeyboardShortcutsOverlay opened onClose={vi.fn()} />);

            const row = SHELL_KEY_BINDINGS.find((binding) => binding.id === "toggleInspector");

            expect(row).toBeDefined();
            expect(screen.getByText(row?.action ?? "")).toBeInTheDocument();
            expect(screen.getByText(formatChords(row?.chords ?? []))).toBeInTheDocument();
        });

        it("collapses the arrow set to one chip instead of eight DOM key names", () => {
            render(<KeyboardShortcutsOverlay opened onClose={vi.fn()} />);

            expect(screen.getByText("Arrows or Shift+Arrows")).toBeInTheDocument();
            expect(screen.queryByText(/ArrowUp/)).toBeNull();
        });

        it("gives every chord cell one line, since the row height is frozen at the data pitch", () => {
            render(<KeyboardShortcutsOverlay opened onClose={vi.fn()} />);

            const cell = screen.getByText("Arrows or Shift+Arrows");

            expect(cell.style.whiteSpace).toBe("nowrap");
            expect(cell.style.overflow).toBe("hidden");
            expect(cell.parentElement?.style.overflow).toBe("hidden");
        });

        it("groups the AI composer's send row under its own heading", () => {
            render(<KeyboardShortcutsOverlay opened onClose={vi.fn()} />);

            expect(screen.getByText("AI")).toBeInTheDocument();
            expect(screen.getByText("Send the message")).toBeInTheDocument();
        });

        it("skips an action that has not shipped, because it carries no chip anywhere", () => {
            render(<KeyboardShortcutsOverlay opened onClose={vi.fn()} />);

            const unshipped = SHELL_KEY_BINDINGS.filter((binding) => !binding.shipped);

            for (const binding of unshipped) {
                expect(screen.queryByText(binding.action)).toBeNull();
            }
        });
    });

    describe("closing", () => {
        it("offers one X, titled for the Escape ladder", () => {
            const onClose = vi.fn();

            render(<KeyboardShortcutsOverlay opened onClose={onClose} />);

            const close = screen.getByRole("button", { name: KEYBOARD_SHORTCUTS_TITLE });

            expect(close).toHaveAttribute("title", KEYBOARD_SHORTCUTS_CLOSE_TITLE);

            fireEvent.click(close);

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});
