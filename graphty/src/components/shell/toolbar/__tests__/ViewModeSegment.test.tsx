import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { render, screen } from "../../../../test/test-utils";
import { CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_NARROW } from "../../constants";
import { VIEW_MODE_GROUP_LABEL, ViewModeSegment } from "../ViewModeSegment";

function group(): HTMLElement {
    return screen.getByRole("radiogroup", { name: VIEW_MODE_GROUP_LABEL });
}

describe("ViewModeSegment", () => {
    describe("rendering", () => {
        it("draws 2D then 3D", () => {
            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            expect(screen.getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["2D", "3D"]);
        });

        it("checks the current mode and leaves the other unchecked", () => {
            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            expect(screen.getByRole("radio", { name: "3D" })).toHaveAttribute("aria-checked", "true");
            expect(screen.getByRole("radio", { name: "2D" })).toHaveAttribute("aria-checked", "false");
        });

        it("gives the group one tab stop, on the checked half", () => {
            render(<ViewModeSegment value="2d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            expect(screen.getByRole("radio", { name: "2D" })).toHaveAttribute("tabindex", "0");
            expect(screen.getByRole("radio", { name: "3D" })).toHaveAttribute("tabindex", "-1");
        });
    });

    describe("geometry", () => {
        it("is 60 x 28 on the desktop profile", () => {
            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            const rect = group().getBoundingClientRect();

            expect(Math.round(rect.width)).toBe(CANVAS_TOOLBAR_DESKTOP.segmentedWidth);
            expect(Math.round(rect.height)).toBe(CANVAS_TOOLBAR_DESKTOP.itemSize);
        });

        it("is 68 x 32 below 1280 px", () => {
            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_NARROW} onChange={vi.fn()} />);

            const rect = group().getBoundingClientRect();

            expect(Math.round(rect.width)).toBe(CANVAS_TOOLBAR_NARROW.segmentedWidth);
            expect(Math.round(rect.height)).toBe(CANVAS_TOOLBAR_NARROW.itemSize);
        });

        it("leaves each half one inner padding shorter than the track", () => {
            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            const half = screen.getByRole("radio", { name: "3D" }).getBoundingClientRect();

            expect(Math.round(half.height)).toBe(CANVAS_TOOLBAR_DESKTOP.segmentedHalfWidth);
        });
    });

    describe("choosing", () => {
        it("reports the chosen mode", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();

            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />);

            await user.click(screen.getByRole("radio", { name: "2D" }));

            expect(onChange).toHaveBeenCalledWith("2d");
        });

        it("moves the choice with an arrow key and keeps the press off the canvas", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const onKeyDown = vi.fn();

            render(
                <div onKeyDown={onKeyDown}>
                    <ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />
                </div>,
            );

            screen.getByRole("radio", { name: "3D" }).focus();
            await user.keyboard("{ArrowRight}");

            expect(onChange).toHaveBeenCalledWith("2d");
            expect(onKeyDown).not.toHaveBeenCalled();
        });

        it("moves backwards too", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();

            render(<ViewModeSegment value="2d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />);

            screen.getByRole("radio", { name: "2D" }).focus();
            await user.keyboard("{ArrowLeft}");

            expect(onChange).toHaveBeenCalledWith("3d");
        });

        it("leaves other keys to the shell's one dispatcher", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const onKeyDown = vi.fn();

            render(
                <div onKeyDown={onKeyDown}>
                    <ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />
                </div>,
            );

            screen.getByRole("radio", { name: "3D" }).focus();
            await user.keyboard("5");

            expect(onChange).not.toHaveBeenCalled();
            expect(onKeyDown).toHaveBeenCalled();
        });
    });
});
