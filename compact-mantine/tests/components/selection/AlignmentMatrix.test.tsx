import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
    ALIGNMENT_MATRIX_VALUES,
    AlignmentMatrix,
    type AlignmentMatrixProps,
} from "../../../src/components/selection/AlignmentMatrix";
import { compactTheme } from "../../../src/theme";

function renderMatrix(props: AlignmentMatrixProps = {}): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme}>
            <AlignmentMatrix {...props} />
        </MantineProvider>,
    );
}

function checkedValue(): string | undefined {
    return screen
        .getAllByRole("radio")
        .find((radio) => (radio as HTMLInputElement).checked)
        ?.getAttribute("value") ?? undefined;
}

describe("AlignmentMatrix", () => {
    it("is one named radio group of nine cells, in reading order, each named as Figma names it", () => {
        renderMatrix();

        const group = screen.getByRole("radiogroup", { name: "Alignment" });
        const radios = screen.getAllByRole("radio");
        expect(group).toContainElement(radios[0]);
        expect(radios.map((r) => r.getAttribute("value"))).toEqual([...ALIGNMENT_MATRIX_VALUES]);
        expect(screen.getByRole("radio", { name: "Align top left" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Align center" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Align bottom right" })).toBeInTheDocument();
        expect(new Set(radios.map((r) => r.getAttribute("name"))).size).toBe(1);
    });

    it("starts at top left, or at the default", () => {
        renderMatrix();
        expect(checkedValue()).toBe("top-left");
    });

    it("draws the chosen cell's bars, and a dot in every other cell", () => {
        const { container } = renderMatrix({ defaultValue: "middle-right" });

        const checked = container.querySelectorAll("[data-checked]");
        expect(checked).toHaveLength(1);
        expect(checked[0]).toHaveAttribute("data-value", "middle-right");
        expect(checked[0].querySelectorAll(".cm-align-bar")).toHaveLength(3);
        expect(container.querySelectorAll(".cm-align-dot")).toHaveLength(9);
    });

    it("lines the bars up with the cell: the column for vertical children, the row for horizontal", () => {
        const vertical = renderMatrix({ defaultValue: "top-right", direction: "vertical" });
        const cellV = vertical.container.querySelector<HTMLElement>("[data-checked]");
        expect(cellV?.style.getPropertyValue("--cm-align-cross")).toBe("flex-end");
        expect(vertical.container.querySelector(".cm-align")).toHaveAttribute("data-direction", "vertical");
        vertical.unmount();

        const horizontal = renderMatrix({ defaultValue: "top-right", direction: "horizontal" });
        const cellH = horizontal.container.querySelector<HTMLElement>("[data-checked]");
        expect(cellH?.style.getPropertyValue("--cm-align-cross")).toBe("flex-start");
    });

    it("reports a click with the value and the event", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderMatrix({ onChange });

        await user.click(screen.getByRole("radio", { name: "Align bottom center" }));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange.mock.calls[0][0]).toBe("bottom-center");
        expect(onChange.mock.calls[0][1]).toBeDefined();
        expect(checkedValue()).toBe("bottom-center");
    });

    it("moves in two dimensions with the arrows, and stops at the edges", () => {
        const onChange = vi.fn();
        renderMatrix({ onChange });
        const start = screen.getByRole("radio", { name: "Align top left" });

        fireEvent.keyDown(start, { key: "ArrowUp" });
        fireEvent.keyDown(start, { key: "ArrowLeft" });
        expect(onChange).not.toHaveBeenCalled();

        fireEvent.keyDown(start, { key: "ArrowDown" });
        expect(checkedValue()).toBe("middle-left");
        fireEvent.keyDown(document.activeElement as Element, { key: "ArrowRight" });
        expect(checkedValue()).toBe("middle-center");
        expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Align center" }));
        fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
        fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
        expect(checkedValue()).toBe("bottom-center");
        expect(onChange.mock.calls.map((call) => call[0])).toEqual(["middle-left", "middle-center", "bottom-center"]);
    });

    it("follows a controlled value and does not move on its own", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const { rerender } = renderMatrix({ value: "middle-center", onChange });

        await user.click(screen.getByRole("radio", { name: "Align top right" }));
        expect(onChange).toHaveBeenCalledWith("top-right", expect.anything());
        expect(checkedValue()).toBe("middle-center");

        rerender(
            <MantineProvider theme={compactTheme}>
                <AlignmentMatrix value="top-right" onChange={onChange} />
            </MantineProvider>,
        );
        expect(checkedValue()).toBe("top-right");
    });

    it("can be disabled whole", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        renderMatrix({ disabled: true, onChange });

        for (const radio of screen.getAllByRole("radio")) {
            expect(radio).toBeDisabled();
        }
        fireEvent.keyDown(screen.getAllByRole("radio")[0], { key: "ArrowRight" });
        await user.click(screen.getAllByRole("radio")[4]);
        expect(onChange).not.toHaveBeenCalled();
    });

    it("takes its own words", () => {
        renderMatrix({ label: "Ausrichtung", cellLabels: { "middle-center": "Mitte" } });

        expect(screen.getByRole("radiogroup", { name: "Ausrichtung" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Mitte" })).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: "Align top left" })).toBeInTheDocument();
    });

    it("writes no raw colour: the look is the stylesheet's", () => {
        const { container } = renderMatrix();
        for (const el of container.querySelectorAll<HTMLElement>("[style]")) {
            expect(el.getAttribute("style")).not.toMatch(/#[0-9a-f]{3,8}|rgb/iu);
        }
    });
});
