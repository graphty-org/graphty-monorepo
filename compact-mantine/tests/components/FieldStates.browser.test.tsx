/**
 * The three field states -- not set, set and mixed -- drawn and named the same way by the number,
 * color and select fields, in a real browser: not set and Mixed are gray italic (two cues), a set
 * value is the body ink, "Mixed" is sentence case with an outlined chit rather than a color, and
 * the accessible name says the state. Also: each field's own reset can be turned off, disabled
 * styling follows a disabled fieldset and aria-disabled, and the number field refuses letters
 * and keeps to its minimum.
 */
import { screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { CompactColorInput, PopoutManager, StyleNumberInput, StyleSelect } from "../../src";
import { renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

const SHAPES = [
    { value: "icosphere", label: "Icosphere" },
    { value: "box", label: "Box" },
];

interface State {
    color?: string;
    size?: number;
    shape?: string;
    mixed?: boolean;
}

/**
 * One field of each kind, in one state.
 * @param props - the values (absent: not set) and whether they are mixed
 * @returns the three fields
 */
function Fields({ color, size, shape, mixed = false }: Readonly<State>): React.JSX.Element {
    return (
        <PopoutManager>
            <CompactColorInput
                aria-label="Node"
                color={color}
                defaultColor="#3388FF"
                showOpacity={false}
                mixed={mixed}
            />
            <StyleNumberInput label="Size" value={size} defaultValue={10} mixed={mixed} />
            <StyleSelect
                label="Shape"
                value={shape}
                defaultValue=""
                placeholder="Icosphere"
                options={SHAPES}
                mixed={mixed}
            />
        </PopoutManager>
    );
}

/** The three text boxes: the hex box, the number box and the select's box. */
function boxes(): HTMLInputElement[] {
    return [
        screen.getByTestId("compact-color-input-hex"),
        screen.getByTestId("style-number-input-field"),
        screen.getByTestId("style-select-field"),
    ] as HTMLInputElement[];
}

/**
 * The ink a box draws in: its placeholder's when it is empty, its value's otherwise.
 * @param box - the input
 * @returns the color and the font style
 */
function ink(box: HTMLInputElement): string {
    const style = getComputedStyle(box, box.value === "" ? "::placeholder" : undefined);
    return `${style.color} ${style.fontStyle} ${style.textTransform}`;
}

describe("field states", () => {
    it("not set: every field draws what lies beneath in the same gray italic, and says 'not set'", async () => {
        await renderThemed(<Fields />);
        const inks = boxes().map(ink);
        expect(inks[0]).toContain("italic");
        expect(new Set(inks).size).toBe(1);

        await expect.element(page.getByRole("textbox", { name: "Node color, not set, #3388FF" })).toBeInTheDocument();
        await expect.element(page.getByRole("spinbutton", { name: "Size, not set, 10" })).toBeInTheDocument();
        await expect.element(page.getByRole("combobox", { name: "Shape, not set, Icosphere" })).toBeInTheDocument();
    });

    it("set: every field draws its value in the body ink, not italic, and drops 'not set'", async () => {
        await renderThemed(<Fields color="#D55E00" size={4} shape="box" />);
        const inks = boxes().map(ink);
        expect(inks[0]).not.toContain("italic");
        expect(new Set(inks).size).toBe(1);

        await expect.element(page.getByRole("textbox", { name: "Node color", exact: true })).toBeInTheDocument();
        await expect.element(page.getByRole("spinbutton", { name: "Size", exact: true })).toBeInTheDocument();
        await expect.element(page.getByRole("combobox", { name: "Shape", exact: true })).toBeInTheDocument();
    });

    it("mixed: every field reads 'Mixed' in sentence case, in the not-set ink, with a mixed chit", async () => {
        await renderThemed(<Fields mixed />);
        for (const box of boxes()) {
            expect(box.value).toBe("");
            expect(box.placeholder).toBe("Mixed");
        }
        const inks = boxes().map(ink);
        expect(new Set(inks).size).toBe(1);
        expect(inks[0]).toContain("italic");
        expect(inks[0]).toContain("none");
        expect(screen.getByTestId("compact-color-input-mixed")).toBeInTheDocument();
        expect(screen.getByTestId("compact-color-input-swatch").querySelector(".mantine-ColorSwatch-root")).toBeNull();

        await expect.element(page.getByRole("textbox", { name: "Node color, Mixed" })).toBeInTheDocument();
        await expect.element(page.getByRole("spinbutton", { name: "Size, Mixed" })).toBeInTheDocument();
        await expect.element(page.getByRole("combobox", { name: "Shape, Mixed" })).toBeInTheDocument();
    });

    it("a number field showing words for its default is not read as a number", async () => {
        await renderThemed(<StyleNumberInput label="Size" defaultValue={0} emptyText="Default" />);
        const box = screen.getByTestId("style-number-input-field");
        expect(box.getAttribute("aria-valuetext")).toBe("Default");
        expect(box.hasAttribute("aria-valuenow")).toBe(false);
        await expect.element(page.getByRole("spinbutton", { name: "Size, not set, Default" })).toBeInTheDocument();
    });
});

describe("showReset", () => {
    it("draws no reset on any field when it is off, even with a value set", async () => {
        await renderThemed(
            <PopoutManager>
                <CompactColorInput aria-label="Node" color="#D55E00" defaultColor="#3388FF" showReset={false} />
                <StyleNumberInput label="Size" value={4} defaultValue={10} showReset={false} />
                <StyleSelect label="Shape" value="box" defaultValue="" options={SHAPES} showReset={false} />
            </PopoutManager>,
        );
        expect(screen.queryByTestId("compact-color-input-reset")).toBeNull();
        expect(screen.queryByTestId("style-number-input-reset")).toBeNull();
        expect(screen.queryByTestId("style-select-reset")).toBeNull();
    });
});

describe("disabled styling", () => {
    for (const how of ["fieldset", "aria-disabled"] as const) {
        it(`a field ${how === "fieldset" ? "inside a disabled fieldset" : "under aria-disabled"} is drawn disabled`, async () => {
            const fields = (disabled: boolean, id: string): React.JSX.Element => (
                <div data-testid={id}>
                    <CompactColorInput aria-label="Node" color="#D55E00" defaultColor="#3388FF" disabled={disabled} />
                    <StyleNumberInput label="Size" value={4} defaultValue={10} disabled={disabled} />
                </div>
            );
            await renderThemed(
                <PopoutManager>
                    {fields(true, "reference")}
                    {how === "fieldset" ? (
                        <fieldset disabled>{fields(false, "probe")}</fieldset>
                    ) : (
                        <div role="group" aria-label="Off" aria-disabled="true">
                            {fields(false, "probe")}
                        </div>
                    )}
                    {fields(false, "enabled")}
                </PopoutManager>,
            );
            const look = (id: string): string[] => {
                const root = screen.getByTestId(id);
                const hex = root.querySelector<HTMLElement>("[data-testid=compact-color-input-hex]")!;
                const field = root.querySelector<HTMLElement>("[data-testid=compact-color-input-field]")!;
                const number = root.querySelector<HTMLElement>("[data-testid=style-number-input-field]")!;
                return [
                    getComputedStyle(hex).color,
                    getComputedStyle(field).borderColor,
                    getComputedStyle(number).color,
                ];
            };
            expect(look("probe")).toEqual(look("reference"));
            expect(look("enabled")[2]).not.toBe(look("reference")[2]);
        });
    }
});

describe("StyleNumberInput keyboard", () => {
    it("refuses letters as they are typed and leaves the value unchanged", async () => {
        const onChange = vi.fn();
        await renderThemed(<StyleNumberInput label="Size" value={5} defaultValue={10} onChange={onChange} />);
        const box = page.getByRole("spinbutton", { name: "Size" });
        await userEvent.click(box);
        await userEvent.keyboard("{End}abc");
        expect((box.element() as HTMLInputElement).value).toBe("5");
        await userEvent.keyboard("{Tab}");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("ArrowDown at the minimum stays at the minimum", async () => {
        const onChange = vi.fn();
        await renderThemed(<StyleNumberInput label="Size" value={1} defaultValue={10} min={1} onChange={onChange} />);
        await userEvent.click(page.getByRole("spinbutton", { name: "Size" }));
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        expect(onChange).not.toHaveBeenCalled();
        expect((screen.getByTestId("style-number-input-field") as HTMLInputElement).value).toBe("1");
    });

    it("ArrowDown from not set never goes below the minimum", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <StyleNumberInput label="Size" defaultValue={0} emptyText="Default" min={1} onChange={onChange} />,
        );
        await userEvent.click(page.getByRole("spinbutton", { name: /Size/ }));
        await userEvent.keyboard("{ArrowDown}");
        expect(onChange).toHaveBeenLastCalledWith(1, expect.anything());
    });
});
