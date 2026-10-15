import { describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen } from "../../../../test/test-utils";
import { CANVAS_TOOLBAR_DESKTOP, CANVAS_TOOLBAR_NARROW } from "../../constants";
import { VIEW_MODE_GROUP_LABEL, ViewModeSegment } from "../ViewModeSegment";

function group(): HTMLElement {
    return screen.getByRole("radiogroup", { name: VIEW_MODE_GROUP_LABEL });
}

/** The drawn half of a radio: its label, since the native input itself is hidden. */
function half(name: string): HTMLElement {
    const label = screen.getByRole<HTMLInputElement>("radio", { name }).labels?.[0];

    if (label === undefined) {
        throw new Error(`no label for ${name}`);
    }

    return label;
}

describe("ViewModeSegment", () => {
    describe("rendering", () => {
        it("draws 2D then 3D", () => {
            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            expect(
                screen.getAllByRole<HTMLInputElement>("radio").map((radio) => radio.labels?.[0]?.textContent),
            ).toEqual(["2D", "3D"]);
        });

        it("checks the current mode and leaves the other unchecked", () => {
            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            expect(screen.getByRole("radio", { name: "3D" })).toBeChecked();
            expect(screen.getByRole("radio", { name: "2D" })).not.toBeChecked();
        });

        it("names the checked 3D half VR while the element presents VR", () => {
            render(<ViewModeSegment value="vr" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />);

            expect(
                screen.getAllByRole<HTMLInputElement>("radio").map((radio) => radio.labels?.[0]?.textContent),
            ).toEqual(["2D", "VR"]);
            expect(screen.getByRole("radio", { name: "VR" })).toBeChecked();
        });

        it("gives the group one tab stop, on the checked half, with a visible focus ring", async () => {
            render(
                <>
                    <ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={vi.fn()} />
                    <button type="button">after</button>
                </>,
            );

            await userEvent.tab();

            expect(screen.getByRole("radio", { name: "3D" })).toHaveFocus();
            expect(getComputedStyle(half("3D")).outlineStyle).toBe("solid");

            await userEvent.tab();

            expect(screen.getByRole("button", { name: "after" })).toHaveFocus();
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

            expect(Math.round(half("3D").getBoundingClientRect().height)).toBe(
                CANVAS_TOOLBAR_DESKTOP.segmentedHalfWidth,
            );
        });
    });

    describe("choosing", () => {
        it("reports the chosen mode", async () => {
            const onChange = vi.fn();

            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />);

            await userEvent.click(half("2D"));

            expect(onChange).toHaveBeenCalledWith("2d");
        });

        it("moves the choice with an arrow key", async () => {
            const onChange = vi.fn();

            render(<ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />);

            await userEvent.tab();
            await userEvent.keyboard("{ArrowRight}");

            expect(onChange).toHaveBeenCalledWith("2d");
            expect(screen.getByRole("radio", { name: "2D" })).toHaveFocus();
        });

        it("moves backwards too", async () => {
            const onChange = vi.fn();

            render(<ViewModeSegment value="2d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />);

            await userEvent.tab();
            await userEvent.keyboard("{ArrowLeft}");

            expect(onChange).toHaveBeenCalledWith("3d");
        });

        it("leaves other keys to the shell's one dispatcher", async () => {
            const onChange = vi.fn();
            const onKeyDown = vi.fn();

            render(
                <div onKeyDown={onKeyDown}>
                    <ViewModeSegment value="3d" profile={CANVAS_TOOLBAR_DESKTOP} onChange={onChange} />
                </div>,
            );

            await userEvent.tab();
            await userEvent.keyboard("5");

            expect(onChange).not.toHaveBeenCalled();
            expect(onKeyDown).toHaveBeenCalled();
        });
    });
});
