/**
 * The three field states -- not set, set and mixed -- drawn and named the same way by the number,
 * color and select fields, in a real browser: nothing is drawn in a gray italic Figma does not have
 * (a placeholder is Figma's tertiary ink, upright; "Mixed" is the value's ink), a set value is the
 * body ink, "Mixed" is sentence case with an outlined chit rather than a color, and the accessible
 * name says the state. Also: disabled styling follows a disabled fieldset and aria-disabled, and
 * the number field takes a letter and reverts it on commit (Figma), and keeps to its minimum. The number and
 * select fields are PanelField, with a ResetButton beside them in a FieldRow once a value is set.
 */
import { TextInput } from "@mantine/core";
import { screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import {
    ComboInput,
    CompactColorInput,
    FieldRow,
    GradientEditor,
    PanelField,
    Popout,
    PopoutManager,
    ResetButton,
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
            <PanelField kind="number" label="Size" value={size ?? null} placeholder="10" mixed={mixed} />
            <PanelField label="Shape" value={shape ?? null} placeholder="Icosphere" data={SHAPES} mixed={mixed} />
        </PopoutManager>
    );
}

/** The three text boxes: the hex box, the number box and the select's box. */
function boxes(): HTMLInputElement[] {
    return [
        screen.getByTestId("compact-color-input-hex"),
        ...screen.getAllByTestId("panel-field-value"),
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

    it("not set: no field is italic; a placeholder is Figma's tertiary ink", async () => {
        await renderThemed(<Fields />);
        for (const box of boxes()) {
            expect(ink(box)).not.toContain("italic");
        }
        const number = screen.getAllByTestId("panel-field-value")[0] as HTMLInputElement;
        expect(getComputedStyle(number, "::placeholder").color).toBe("rgba(0, 0, 0, 0.3)");
    });

    it("Mixed: the word in the value's ink, upright", async () => {
        await renderThemed(<Fields mixed />);
        for (const box of boxes()) {
            expect(ink(box)).not.toContain("italic");
        }
        const number = screen.getAllByTestId("panel-field-value")[0] as HTMLInputElement;
        expect(getComputedStyle(number, "::placeholder").color).toBe("rgba(0, 0, 0, 0.898)");
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
        const notSet = page.getByRole("button", { name: "Group 1 color, not set, drawn #3388FF" });
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

describe("chip with the color in words", () => {
    it("is named by the caller's words for the color, never its state and hex", async () => {
        await renderThemed(
            <PopoutManager>
                <CompactColorInput
                    aria-label="kind agency"
                    variant="chip"
                    defaultColor="#009E73"
                    showOpacity={false}
                    valueText="teal"
                />
            </PopoutManager>,
        );
        await expect.element(page.getByRole("button", { name: "kind agency color, teal" })).toBeInTheDocument();
    });
});

describe("value marks in lists", () => {
    it("a list marks the chosen value with the list's check, and no dashed ring", async () => {
        await renderThemed(<PanelField label="Shape" value="box" data={SHAPES} onChange={() => undefined} />);
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

    it("while nothing is chosen, no option carries the check: what lies beneath is not a choice", async () => {
        await renderThemed(
            <PanelField label="Shape" value={null} placeholder="Icosphere" data={SHAPES} onChange={() => undefined} />,
        );
        await userEvent.click(page.getByRole("combobox", { name: /Shape/ }));
        const inherited = await page.getByRole("option", { name: "Icosphere" }).findElement();
        expect(getComputedStyle(inherited.querySelector(".cm-menu-row-check")!).opacity).toBe("0");
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
                    <PanelField kind="number" label="Size" value={4} />
                </div>
            </PopoutManager>,
        );
        const disabledInk = getComputedStyle(screen.getByTestId("panel-field-value")).color;
        const locked = screen.getByTestId("locked");
        const [setHex, unsetHex] = screen.getAllByTestId("compact-color-input-hex");
        expect(getComputedStyle(setHex).color).toBe(disabledInk);
        expect(getComputedStyle(unsetHex, "::placeholder").color).toBe(disabledInk);
        expect(getComputedStyle(locked.querySelector(".cm-paint-suffix")!).color).toBe(disabledInk);
        expect(getComputedStyle(screen.getByTestId("compact-color-input-reset")).color).toBe(disabledInk);
    });
});

describe("reset beside a field", () => {
    it("is drawn in the row's trailing slot only once a value is set", async () => {
        await renderThemed(
            <PopoutManager>
                <FieldRow trailing={<ResetButton label="Size" />}>
                    <PanelField kind="number" label="Size" value={4} onChange={() => undefined} />
                </FieldRow>
                <FieldRow>
                    <PanelField label="Shape" value={null} placeholder="Icosphere" data={SHAPES} />
                </FieldRow>
            </PopoutManager>,
        );
        expect(screen.getAllByTestId("reset-button")).toHaveLength(1);
        await expect.element(page.getByRole("button", { name: "Reset Size to default" })).toBeInTheDocument();
    });
});

describe("disabled styling", () => {
    for (const how of ["fieldset", "aria-disabled"] as const) {
        it(`a field ${how === "fieldset" ? "inside a disabled fieldset" : "under aria-disabled"} is drawn disabled`, async () => {
            const fields = (disabled: boolean, id: string): React.JSX.Element => (
                <div data-testid={id}>
                    <CompactColorInput aria-label="Node" color="#D55E00" defaultColor="#3388FF" disabled={disabled} />
                    <PanelField kind="number" label="Size" value={4} disabled={disabled} />
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
                const number = root.querySelector<HTMLElement>("[data-testid=panel-field-value]")!;
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

describe("number field keyboard", () => {
    it("takes letters as typed and reverts them on commit, leaving the value unchanged (Figma)", async () => {
        const onChange = vi.fn();
        await renderThemed(<PanelField kind="number" label="Size" value={5} onChange={onChange} />);
        const box = page.getByRole("spinbutton", { name: "Size" });
        await userEvent.click(box);
        await userEvent.keyboard("{End}abc");
        expect((box.element() as HTMLInputElement).value).toBe("5abc");
        await userEvent.keyboard("{Tab}");
        expect((box.element() as HTMLInputElement).value).toBe("5");
        expect(onChange).not.toHaveBeenCalled();
    });

    it("ArrowDown at the minimum stays at the minimum", async () => {
        const onChange = vi.fn();
        await renderThemed(<PanelField kind="number" label="Size" value={1} min={1} onChange={onChange} />);
        await userEvent.click(page.getByRole("spinbutton", { name: "Size" }));
        await userEvent.keyboard("{ArrowDown}{ArrowDown}");
        expect(onChange).not.toHaveBeenCalled();
        expect((screen.getByTestId("panel-field-value") as HTMLInputElement).value).toBe("1");
    });

    it("ArrowDown from not set never goes below the minimum", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <PanelField kind="number" label="Size" value={null} placeholder="Default" min={1} onChange={onChange} />,
        );
        await userEvent.click(page.getByRole("textbox", { name: /Size/ }));
        await userEvent.keyboard("{ArrowDown}");
        expect(onChange).toHaveBeenLastCalledWith(1, expect.anything());
    });
});

describe("an unset field takes the value it shows", () => {
    it("color: Enter on the shown color, or typing exactly it, chooses it; Tab past it does not", async () => {
        const chosen: (string | undefined)[] = [];
        await renderThemed(
            <PopoutManager>
                <CompactColorInput
                    label="Node"
                    defaultColor="#6366F1"
                    valueText="indigo"
                    showOpacity={false}
                    onChangeEnd={(color) => {
                        chosen.push(color);
                    }}
                />
                <TextInput aria-label="After" />
            </PopoutManager>,
        );
        // Its name says it is not set and what the drawing shows, never the color as if it were set.
        const hex = page.getByRole("textbox", { name: "Node color, not set, drawn #6366F1 indigo", exact: true });
        await userEvent.click(hex);
        await userEvent.tab();
        expect(chosen).toEqual([]);
        await userEvent.click(hex);
        await userEvent.keyboard("{Enter}");
        expect(chosen).toEqual(["#6366F1"]);
    });

    it("color: typing the shown hex and leaving chooses it", async () => {
        const chosen: (string | undefined)[] = [];
        await renderThemed(
            <PopoutManager>
                <CompactColorInput
                    label="Node"
                    defaultColor="#6366F1"
                    showOpacity={false}
                    onChangeEnd={(color) => {
                        chosen.push(color);
                    }}
                />
                <TextInput aria-label="After" />
            </PopoutManager>,
        );
        await userEvent.click(page.getByRole("textbox", { name: /^Node color/ }));
        await userEvent.keyboard("6366f1");
        await userEvent.tab();
        expect(chosen).toEqual(["#6366F1"]);
        await expect.element(page.getByTestId("compact-color-input-hex")).toHaveValue("6366F1");
    });

    it("select: picking the shown value chooses it, and no option is checked before", async () => {
        const onChange = vi.fn();
        await renderThemed(
            <PanelField label="Shape" value={null} placeholder="Icosphere" data={SHAPES} onChange={onChange} />,
        );
        await userEvent.click(page.getByRole("combobox", { name: /^Shape/ }));
        const option = await page.getByRole("option", { name: "Icosphere" }).findElement();
        expect(option.hasAttribute("data-checked")).toBe(false);
        await userEvent.click(option);
        expect(onChange.mock.calls.map((call) => call[0])).toEqual(["icosphere"]);
    });

    it("number: focus handed over by a script selects the value, so typing replaces it", async () => {
        const onChange = vi.fn();
        await renderThemed(<ComboInput label="Width" numeric defaultValue={8} options={[]} onChange={onChange} />);
        const box = await page.getByRole("spinbutton", { name: "Width" }).findElement();
        (box as HTMLInputElement).focus();
        await userEvent.keyboard("24{Enter}");
        expect(onChange.mock.calls.at(-1)?.[0]).toBe(24);
    });
});
