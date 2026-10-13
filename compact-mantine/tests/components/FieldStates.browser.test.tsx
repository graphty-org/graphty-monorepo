/**
 * The three field states -- not set, set and mixed -- drawn and named the same way by the number,
 * color and select fields, in a real browser: not set and Mixed are gray italic (two cues), a set
 * value is the body ink, "Mixed" is sentence case with an outlined chit rather than a color, and
 * the accessible name says the state. Also: each field's own reset can be turned off, disabled
 * styling follows a disabled fieldset and aria-disabled, and the number field refuses letters
 * and keeps to its minimum.
 */
import { TextInput } from "@mantine/core";
import { screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import {
    ComboInput,
    CompactColorInput,
    GradientEditor,
    Popout,
    PopoutManager,
    StyleNumberInput,
    StyleSelect,
} from "../../src";
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

        await expect
            .element(page.getByRole("textbox", { name: "Node color, set here", exact: true }))
            .toBeInTheDocument();
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
        // No swatch: Mixed has no one color in force, so the field draws the word alone.
        const field = screen.getByTestId("compact-color-input-field");
        expect(field.querySelector(".mantine-ColorSwatch-root")).toBeNull();
        expect(screen.queryByTestId("compact-color-input-swatch")).toBeNull();

        await expect.element(page.getByRole("textbox", { name: "Node color, Mixed" })).toBeInTheDocument();
        // An empty number field is a text box, not a spinbutton read as 0.
        await expect.element(page.getByRole("textbox", { name: "Size, Mixed" })).toBeInTheDocument();
        await expect.element(page.getByRole("combobox", { name: "Shape, Mixed" })).toBeInTheDocument();
    });

    it("a number field showing words for its default is not read as a number", async () => {
        await renderThemed(<StyleNumberInput label="Size" defaultValue={0} emptyText="Default" />);
        const box = screen.getByTestId("style-number-input-field");
        expect(box.hasAttribute("aria-valuetext")).toBe(false);
        expect(box.hasAttribute("aria-valuenow")).toBe(false);
        await expect.element(page.getByRole("textbox", { name: "Size, not set, Default" })).toBeInTheDocument();
    });

    it("an empty number field reports no value to the accessibility tree", async () => {
        await renderThemed(<StyleNumberInput label="Line height" defaultValue={0} emptyText="Default" />);
        const nodes = await commands.axNodes("Line height, not set, Default");
        expect(nodes).toHaveLength(1);
        expect(nodes[0].value ?? "").toBe("");
        expect(nodes[0].role).not.toBe("spinbutton");
    });

    it("the not-set look is the same on number, combo, select, color and text fields", async () => {
        await renderThemed(
            <PopoutManager>
                <StyleNumberInput label="Size" defaultValue={10} />
                <ComboInput label="Width" numeric options={[]} value="" placeholder="8" />
                <StyleSelect label="Shape" defaultValue="" placeholder="Icosphere" options={SHAPES} />
                <CompactColorInput aria-label="Node" defaultColor="#3388FF" showOpacity={false} />
                <TextInput label="Text" placeholder="Valjean" data-is-default="true" />
            </PopoutManager>,
        );
        const fields = [
            screen.getByTestId("style-number-input-field"),
            screen.getByRole("combobox", { name: "Width" }),
            screen.getByTestId("style-select-field"),
            screen.getByTestId("compact-color-input-hex"),
            screen.getByRole("textbox", { name: "Text" }),
        ] as HTMLInputElement[];
        const inks = fields.map(ink);
        expect(inks[0]).toContain("italic");
        expect(new Set(inks)).toEqual(new Set([inks[0]]));
    });

    it("number and color fields share the select's surface: no gray fill, set or not", async () => {
        await renderThemed(
            <PopoutManager>
                <StyleNumberInput label="Size" defaultValue={10} />
                <StyleNumberInput label="Width" value={3} defaultValue={10} />
                <StyleSelect label="Shape" defaultValue="" placeholder="Icosphere" options={SHAPES} />
                <CompactColorInput aria-label="Node" defaultColor="#3388FF" />
                <CompactColorInput aria-label="Edge" color="#D55E00" defaultColor="#3388FF" />
                <ComboInput label="Speed" numeric options={[]} value="" placeholder="1" variant="outlined" />
            </PopoutManager>,
        );
        const surface = (box: HTMLElement): string => {
            const style = getComputedStyle(box);
            return `${style.backgroundColor} ${style.borderTopColor} ${style.borderTopWidth}`;
        };
        const wrapper = (input: HTMLElement): HTMLElement => input.closest<HTMLElement>(".cm-input-wrapper")!;
        const reference = surface(wrapper(screen.getByTestId("style-select-field")));
        const others = [
            ...screen.getAllByTestId("style-number-input-field").map(wrapper),
            ...screen.getAllByTestId("compact-color-input-field"),
            wrapper(screen.getByRole("combobox", { name: "Speed" })),
        ];
        for (const box of others) {
            expect(surface(box)).toBe(reference);
        }
    });
});

describe("chip-only color", () => {
    it("is a swatch at least 24 x 24 whose name says its state and color, and opens the picker", async () => {
        await renderThemed(
            <PopoutManager>
                <CompactColorInput aria-label="Group 1" variant="chip" defaultColor="#3388FF" showOpacity={false} />
                <CompactColorInput
                    aria-label="Group 2"
                    variant="chip"
                    color="#D55E00"
                    defaultColor="#3388FF"
                    showOpacity={false}
                />
                <CompactColorInput aria-label="Group 3" variant="chip" defaultColor="#3388FF" mixed />
            </PopoutManager>,
        );
        const notSet = page.getByRole("button", { name: "Group 1 color, not set, #3388FF" });
        await expect.element(notSet).toBeInTheDocument();
        await expect
            .element(page.getByRole("button", { name: "Group 2 color, set here, #D55E00" }))
            .toBeInTheDocument();
        const mixed = screen.getByRole("button", { name: "Group 3 color, Mixed" });
        expect(mixed.querySelector(".mantine-ColorSwatch-root")).toBeNull();
        for (const chip of screen.getAllByTestId("compact-color-input-chip")) {
            const box = chip.getBoundingClientRect();
            expect(box.width).toBeGreaterThanOrEqual(24);
            expect(box.height).toBeGreaterThanOrEqual(24);
        }
        expect(screen.queryByTestId("compact-color-input-hex")).toBeNull();

        await userEvent.click(notSet);
        await expect.element(page.getByRole("dialog")).toBeInTheDocument();
        expect(notSet.element().getAttribute("aria-expanded")).toBe("true");
    });
});

describe("color label", () => {
    it("is the same size as every other field's label", async () => {
        await renderThemed(
            <PopoutManager>
                <CompactColorInput label="Text color" defaultColor="#3388FF" />
                <StyleNumberInput label="Padding" defaultValue={4} />
            </PopoutManager>,
        );
        const color = getComputedStyle(screen.getByTestId("compact-color-input-label"));
        const number = getComputedStyle(screen.getByText("Padding"));
        expect(color.fontSize).toBe(number.fontSize);
        expect(color.fontWeight).toBe(number.fontWeight);
        expect(color.color).toBe(number.color);
    });
});

describe("value marks in lists", () => {
    it("a grid marks the chosen value with the list's check, and no dashed ring", async () => {
        await renderThemed(
            <StyleSelect
                label="Shape"
                value="box"
                defaultValue="icosphere"
                options={SHAPES}
                layout="grid"
                columns={2}
            />,
        );
        await userEvent.click(page.getByRole("combobox", { name: "Shape" }));
        const chosen = await page.getByRole("option", { name: "Box" }).findElement();
        const other = await page.getByRole("option", { name: "Icosphere" }).findElement();
        const check = (option: Element): string =>
            getComputedStyle(option.querySelector(".cm-menu-row-check")!).opacity;
        expect(check(chosen)).toBe("1");
        expect(check(other)).toBe("0");
        expect(getComputedStyle(chosen, "::before").outlineStyle).toBe("none");
        expect(getComputedStyle(chosen, "::before").boxShadow).toBe("none");
    });

    it("while nothing is chosen, the value beneath carries the same check, not a dashed ring", async () => {
        await renderThemed(
            <StyleSelect
                label="Shape"
                defaultValue=""
                placeholder="Icosphere"
                options={SHAPES}
                layout="grid"
                columns={2}
            />,
        );
        await userEvent.click(page.getByRole("combobox", { name: /Shape/ }));
        const inherited = await page.getByRole("option", { name: "Icosphere" }).findElement();
        expect(getComputedStyle(inherited.querySelector(".cm-menu-row-check")!).opacity).toBe("1");
        expect(getComputedStyle(inherited, "::before").outlineStyle).toBe("none");
        expect(inherited.getAttribute("aria-selected")).not.toBe("true");
    });
});

describe("Escape in the gradient editor inside a pop-out", () => {
    const STOPS = [
        { id: "a", offset: 0, color: "#FFFFFF" },
        { id: "b", offset: 1, color: "#000000" },
    ];

    /** A gradient editor in a pop-out, as Label settings hosts it. */
    async function openEditor(): Promise<void> {
        await renderThemed(
            <PopoutManager>
                <Popout>
                    <Popout.Trigger>
                        <button type="button">Gradient</button>
                    </Popout.Trigger>
                    <Popout.Panel width={240} header={{ variant: "title", title: "Gradient" }}>
                        <GradientEditor stops={STOPS} />
                    </Popout.Panel>
                </Popout>
            </PopoutManager>,
        );
        await userEvent.click(page.getByRole("button", { name: "Gradient" }));
        await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    }

    it("with nothing typed, closes the pop-out and gives focus back to its trigger", async () => {
        await openEditor();
        const [hex] = screen.getAllByTestId("gradient-editor-stop-hex");
        await userEvent.click(hex);
        await userEvent.keyboard("{Escape}");
        await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: "Gradient" }));
    });

    it("with an edit in progress, takes the edit back and stays in the field", async () => {
        await openEditor();
        const [hex] = screen.getAllByTestId("gradient-editor-stop-hex") as HTMLInputElement[];
        await userEvent.click(hex);
        await userEvent.keyboard("123");
        await userEvent.keyboard("{Escape}");
        expect(hex.value).toBe("FFFFFF");
        expect(document.activeElement).toBe(hex);
        await expect.element(page.getByRole("dialog")).toBeInTheDocument();
    });
});

describe("a locked panel (aria-disabled around the fields)", () => {
    it("dims the color field's text, its opacity handle and its reset like the other fields", async () => {
        await renderThemed(
            <PopoutManager>
                <div aria-disabled="true" data-testid="locked">
                    <CompactColorInput label="Color" color="#D55E00" opacity={80} defaultColor="#3388FF" />
                    <CompactColorInput aria-label="Edge" defaultColor="#3388FF" showOpacity={false} />
                    <StyleNumberInput label="Size" value={4} defaultValue={10} />
                </div>
            </PopoutManager>,
        );
        const disabledInk = getComputedStyle(screen.getByTestId("style-number-input-field")).color;
        const locked = screen.getByTestId("locked");
        const [setHex, unsetHex] = screen.getAllByTestId("compact-color-input-hex");
        expect(getComputedStyle(setHex).color).toBe(disabledInk);
        expect(getComputedStyle(unsetHex, "::placeholder").color).toBe(disabledInk);
        expect(getComputedStyle(locked.querySelector(".cm-paint-suffix")!).color).toBe(disabledInk);
        expect(getComputedStyle(screen.getByTestId("compact-color-input-reset")).color).toBe(disabledInk);
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
        await userEvent.click(page.getByRole("textbox", { name: /Size/ }));
        await userEvent.keyboard("{ArrowDown}");
        expect(onChange).toHaveBeenLastCalledWith(1, expect.anything());
    });
});
