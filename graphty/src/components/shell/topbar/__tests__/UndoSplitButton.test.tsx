import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { pressAndHold, releaseOver } from "../../../../test/real-pointer";
import { render, screen } from "../../../../test/test-utils";
import { LONG_PRESS_MS } from "../topBarGeometry";
import { UndoSplitButton } from "../UndoSplitButton";

const defaultProps = {
    canUndo: true,
    onUndo: vi.fn(),
    onOpenHistory: vi.fn(),
};

describe("UndoSplitButton", () => {
    describe("rendering", () => {
        it("draws two separately clickable halves", () => {
            render(<UndoSplitButton {...defaultProps} onUndo={vi.fn()} onOpenHistory={vi.fn()} />);

            expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
            expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
        });

        it("titles the caret half for what it opens, never for what the main half does", () => {
            render(<UndoSplitButton {...defaultProps} onUndo={vi.fn()} onOpenHistory={vi.fn()} />);

            const caret = screen.getByRole("button", { name: "History" });

            expect(caret).toHaveAttribute("aria-haspopup", "dialog");
            expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
        });

        it("marks the caret as a pop-out opener so its own click can close what it opened", () => {
            render(<UndoSplitButton {...defaultProps} onUndo={vi.fn()} onOpenHistory={vi.fn()} />);

            expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("data-popout-trigger", "true");
        });

        it("draws the caret half expanded while the pop-out is open", () => {
            render(<UndoSplitButton {...defaultProps} onUndo={vi.fn()} onOpenHistory={vi.fn()} historyOpen />);

            expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("aria-expanded", "true");
        });
    });

    describe("the empty store", () => {
        it("states the reason in the undo half's accessible name", () => {
            render(<UndoSplitButton canUndo={false} onUndo={vi.fn()} onOpenHistory={vi.fn()} />);

            const undoHalf = screen.getByRole("button", { name: "Undo. Nothing to undo yet" });

            expect(undoHalf).toHaveAttribute("aria-disabled", "true");
        });

        it("does not undo when the undo half cannot act", async () => {
            const onUndo = vi.fn();

            render(<UndoSplitButton canUndo={false} onUndo={onUndo} onOpenHistory={vi.fn()} />);

            // force: a reader can still press a disabled control, and it must do nothing
            await userEvent.click(screen.getByRole("button", { name: "Undo. Nothing to undo yet" }), { force: true });

            expect(onUndo).not.toHaveBeenCalled();
        });

        it("never disables the caret half", async () => {
            const onOpenHistory = vi.fn();

            render(<UndoSplitButton canUndo={false} onUndo={vi.fn()} onOpenHistory={onOpenHistory} />);

            const caret = screen.getByRole("button", { name: "History" });

            expect(caret).not.toHaveAttribute("aria-disabled");

            await userEvent.click(caret);

            expect(onOpenHistory).toHaveBeenCalledTimes(1);
        });
    });

    describe("History's three routes", () => {
        it("opens History from the caret half", async () => {
            const onOpenHistory = vi.fn();

            render(<UndoSplitButton canUndo onUndo={vi.fn()} onOpenHistory={onOpenHistory} />);

            await userEvent.click(screen.getByRole("button", { name: "History" }));

            expect(onOpenHistory).toHaveBeenCalledTimes(1);
        });

        it("opens History from a right-click on the main half, and does not undo", async () => {
            const onOpenHistory = vi.fn();
            const onUndo = vi.fn();

            render(<UndoSplitButton canUndo onUndo={onUndo} onOpenHistory={onOpenHistory} />);

            await userEvent.click(screen.getByRole("button", { name: "Undo" }), { button: "right" });

            expect(onOpenHistory).toHaveBeenCalledTimes(1);
            expect(onUndo).not.toHaveBeenCalled();
        });

        it("opens History from a long-press and suppresses the click that ends it", async () => {
            const onOpenHistory = vi.fn();
            const onUndo = vi.fn();

            render(<UndoSplitButton canUndo onUndo={onUndo} onOpenHistory={onOpenHistory} />);

            const undoHalf = screen.getByRole("button", { name: "Undo" });

            // A real press, held while the fake clock walks up to the long-press time
            vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
            try {
                await pressAndHold(undoHalf);
                vi.advanceTimersByTime(LONG_PRESS_MS - 1);
                expect(onOpenHistory).not.toHaveBeenCalled();
                vi.advanceTimersByTime(1);
            } finally {
                vi.useRealTimers();
            }

            expect(onOpenHistory).toHaveBeenCalledTimes(1);

            // Letting go ends the press with the browser's own click
            await releaseOver(undoHalf);

            expect(onUndo).not.toHaveBeenCalled();
        });

        it("undoes on a short press", async () => {
            const onOpenHistory = vi.fn();
            const onUndo = vi.fn();

            render(<UndoSplitButton canUndo onUndo={onUndo} onOpenHistory={onOpenHistory} />);

            const undoHalf = screen.getByRole("button", { name: "Undo" });

            await userEvent.click(undoHalf);

            expect(onUndo).toHaveBeenCalledTimes(1);
            expect(onOpenHistory).not.toHaveBeenCalled();
        });
    });
});
