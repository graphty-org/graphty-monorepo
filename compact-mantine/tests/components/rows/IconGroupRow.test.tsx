import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { IconGroupRow, type IconGroupOption } from "../../../src/components/rows/IconGroupRow";
import { PANEL_GRID, PANEL_INK } from "../../../src/constants/panel";
import { PanelLabelsProvider } from "../../../src/context/PanelLabelsContext";
import { FieldGlyph } from "../../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderGroup(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * A drawing that stands in for a node shape, in the same shape as the register.
 * @param name - A test id for the glyph
 * @returns The glyph node
 */
function glyph(name: string): React.ReactNode {
    return (
        <svg data-testid={`glyph-${name}`} width={PANEL_GRID.GLYPH} height={PANEL_GRID.GLYPH} viewBox="0 0 16 16">
            <rect x="3" y="3" width="10" height="10" rx="1" />
        </svg>
    );
}

/** The three node shapes a cat can be drawn as. */
const SHAPES: IconGroupOption[] = [
    { value: "box", label: "Box", icon: glyph("box") },
    { value: "sphere", label: "Sphere", icon: glyph("sphere") },
    { value: "disc", label: "Disc", icon: glyph("disc") },
];

/** The layouts, whose names the panel cannot afford to hide. */
const LAYOUTS: IconGroupOption[] = [
    { value: "force", label: "Force directed", icon: glyph("force") },
    { value: "hierarchical", label: "Hierarchical", icon: glyph("hierarchical") },
    { value: "radial", label: "Radial", icon: glyph("radial") },
];

/** Six shapes: the ceiling of the range. */
const SIX_SHAPES: IconGroupOption[] = [
    ...SHAPES,
    { value: "diamond", label: "Diamond", icon: glyph("diamond") },
    { value: "ring", label: "Ring", icon: glyph("ring") },
    { value: "cross", label: "Cross", icon: glyph("cross") },
];

/** The three transforms a size is drawn through. */
const SCALES: IconGroupOption[] = [
    { value: "sqrt", label: "Square root", icon: <FieldGlyph name="scaleSqrt" /> },
    { value: "linear", label: "Linear", icon: <FieldGlyph name="scaleLinear" /> },
    { value: "log", label: "Logarithmic", icon: <FieldGlyph name="scaleLog" /> },
];

/**
 * The contents of one segment: the element that holds the drawing, the word and
 * the tooltip, and that the row's test hooks hang off.
 * @param label - The option's word
 * @returns The segment's content element
 */
function segment(label: string): HTMLElement {
    const radio = screen.getByRole("radio", { name: label });
    const content = radio.parentElement?.querySelector("[data-testid=\"icon-group-button\"]");

    if (!(content instanceof HTMLElement)) {
        throw new Error(`no segment content found for ${label}`);
    }

    return content;
}

/**
 * The tile one segment is drawn on: the label a person clicks, which is what
 * carries the segment's height, its corners and its focus ring.
 * @param label - The option's word
 * @returns The segment's tile element
 */
function tile(label: string): HTMLElement {
    const element = segment(label).closest("label");

    if (element === null) {
        throw new Error(`no tile found for ${label}`);
    }

    return element;
}

/**
 * The sliding block that paints the selected segment.
 * @param container - The render container
 * @returns The indicator element, or null when nothing is selected
 */
function indicator(container: HTMLElement): Element | null {
    return container.querySelector(".mantine-SegmentedControl-indicator");
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("IconGroupRow", () => {
    describe("anatomy", () => {
        it("is a radio group, so the browser owns the keyboard", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getByRole("radiogroup")).toBeInTheDocument();
        });

        it("draws one radio per option", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getAllByRole("radio")).toHaveLength(SHAPES.length);
        });

        it("draws every option's icon", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getByTestId("glyph-box")).toBeInTheDocument();
            expect(screen.getByTestId("glyph-sphere")).toBeInTheDocument();
            expect(screen.getByTestId("glyph-disc")).toBeInTheDocument();
        });

        it("draws the glyphs of the closed field register when it is given them", () => {
            const { container } = renderGroup(<IconGroupRow options={SCALES} defaultValue="linear" />);

            expect(container.querySelector("[data-glyph=\"scaleSqrt\"]")).toBeInTheDocument();
            expect(container.querySelector("[data-glyph=\"scaleLinear\"]")).toBeInTheDocument();
            expect(container.querySelector("[data-glyph=\"scaleLog\"]")).toBeInTheDocument();
        });

        it("keeps the trailing slot even when nothing is put in it", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            const slot = screen.getByTestId("trailing-slot");
            expect(slot).toBeInTheDocument();
            expect(slot).toHaveStyle({ width: `${PANEL_GRID.TRAIL}px` });
        });

        it("renders what is put in the trailing slot", () => {
            renderGroup(<IconGroupRow options={SHAPES} trailing={<span data-testid="door">door</span>} />);

            expect(screen.getByTestId("door")).toBeInTheDocument();
        });

        it("sits on the 32px row pitch", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getByTestId("icon-group-row")).toHaveStyle({ height: `${PANEL_GRID.ROW_PITCH}px` });
        });

        it("draws the track at the 24px control height, on the field surface", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            const track = screen.getByTestId("icon-group-track");
            expect(track).toHaveStyle({
                height: `${PANEL_GRID.CONTROL_HEIGHT}px`,
                padding: "1px",
                backgroundColor: PANEL_INK.SURFACE,
            });
        });

        it("draws each segment at 22px inside the track's 1px padding", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            for (const option of SHAPES) {
                expect(tile(option.label)).toHaveStyle({ height: "22px", borderRadius: "3px" });
            }
        });

        it("lets the track's own focus ring out, rather than cropping it", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getByTestId("icon-group-track")).toHaveStyle({ overflow: "visible" });
        });

        it("marks the track when it is drawing a word", () => {
            renderGroup(<IconGroupRow options={LAYOUTS} hybrid />);

            expect(screen.getByTestId("icon-group-track")).toHaveAttribute("data-hybrid", "true");
        });
    });

    describe("the track width", () => {
        it("takes 108 for up to three options", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getByTestId("icon-group-track")).toHaveStyle({ width: `${PANEL_GRID.FIELD}px` });
        });

        it("takes 224 for four to six options", () => {
            renderGroup(<IconGroupRow options={SIX_SHAPES} />);

            expect(screen.getByTestId("icon-group-track")).toHaveStyle({ width: `${PANEL_GRID.BODY}px` });
        });

        it("takes the width it is given instead", () => {
            renderGroup(<IconGroupRow options={SHAPES} width={PANEL_GRID.BODY} />);

            expect(screen.getByTestId("icon-group-track")).toHaveStyle({ width: `${PANEL_GRID.BODY}px` });
        });

        it("fills the row when asked to", () => {
            renderGroup(<IconGroupRow options={SHAPES} width="fill" />);

            const track = screen.getByTestId("icon-group-track");
            expect(track).toHaveStyle({ width: "100%" });
            expect(track.style.flex).toBe("1 1 auto");
        });
    });

    describe("the selected option", () => {
        it("selects the first option when nothing says otherwise", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getByRole("radio", { name: "Box" })).toBeChecked();
        });

        it("selects the default value in uncontrolled mode", () => {
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="disc" />);

            expect(screen.getByRole("radio", { name: "Disc" })).toBeChecked();
            expect(screen.getByRole("radio", { name: "Box" })).not.toBeChecked();
        });

        it("says which option is chosen, rather than only painting it", () => {
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" />);

            const radios = screen.getAllByRole("radio");
            expect(radios.map((radio) => (radio as HTMLInputElement).checked)).toEqual([false, true, false]);
        });

        it("paints the selected segment with the selected ground", () => {
            const { container } = renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" />);

            expect(indicator(container)).toHaveStyle({ backgroundColor: PANEL_INK.SELECTED });
        });

        it("draws the selected option in the ink that reads on that ground", () => {
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" />);

            const active = segment("Sphere");
            expect(active).toHaveAttribute("data-active", "true");
            expect(active.style.color).toBe(PANEL_INK.ON_SELECTED);
        });

        it("leaves the others in the secondary text colour", () => {
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" />);

            const inactive = segment("Disc");
            expect(inactive).toHaveAttribute("data-active", "false");
            expect(inactive.style.color).toBe(PANEL_INK.CHROME);
        });

        it("names each segment for a stylesheet as well as for a reader", () => {
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="disc" />);

            expect(segment("Disc")).toHaveAttribute("data-value", "disc");
            expect(segment("Box")).toHaveAttribute("data-value", "box");
        });

        it("checks nothing when the value matches no option", () => {
            renderGroup(<IconGroupRow options={SHAPES} value="pyramid" />);

            for (const radio of screen.getAllByRole("radio")) {
                expect(radio).not.toBeChecked();
            }
        });
    });

    describe("the accessible name", () => {
        it("names every option by its word, drawn or not", () => {
            renderGroup(<IconGroupRow options={LAYOUTS} />);

            for (const option of LAYOUTS) {
                expect(screen.getByRole("radio", { name: option.label })).toBeInTheDocument();
            }
        });

        it("keeps the word as the tooltip of the segment", () => {
            renderGroup(<IconGroupRow options={SHAPES} />);

            expect(screen.getByTitle("Box")).toBeInTheDocument();
            expect(screen.getByTitle("Sphere")).toBeInTheDocument();
            expect(screen.getByTitle("Disc")).toBeInTheDocument();
        });

        it("announces one word per option, not two, when the word is drawn as well", () => {
            renderGroup(<IconGroupRow options={LAYOUTS} defaultValue="force" hybrid />);

            expect(screen.getByRole("radio", { name: "Force directed" })).toBeChecked();
        });

        it("names the whole group when it is told what the group is for", () => {
            renderGroup(<IconGroupRow options={SHAPES} label="Node shape" />);

            expect(screen.getByRole("radiogroup", { name: "Node shape" })).toBeInTheDocument();
        });

        it("takes the group's name from an element already on the screen", () => {
            renderGroup(
                <>
                    <span id="shape-heading">Node shape</span>
                    <IconGroupRow options={SHAPES} labelledBy="shape-heading" />
                </>,
            );

            expect(screen.getByRole("radiogroup", { name: "Node shape" })).toBeInTheDocument();
        });

        it("lets the element on the screen win over the string", () => {
            renderGroup(
                <>
                    <span id="shape-heading">Node shape</span>
                    <IconGroupRow options={SHAPES} label="Shape" labelledBy="shape-heading" />
                </>,
            );

            expect(screen.getByRole("radiogroup", { name: "Node shape" })).toBeInTheDocument();
        });
    });

    describe("hybrid", () => {
        it("draws no word at all when it is off", () => {
            renderGroup(<IconGroupRow options={LAYOUTS} defaultValue="force" />);

            expect(screen.queryAllByTestId("icon-group-word")).toHaveLength(0);
        });

        it("draws the word on the selected option only", () => {
            renderGroup(<IconGroupRow options={LAYOUTS} defaultValue="force" hybrid />);

            const words = screen.getAllByTestId("icon-group-word");
            expect(words).toHaveLength(1);
            expect(words[0]).toHaveTextContent("Force directed");
        });

        it("still draws the glyph on every option", () => {
            renderGroup(<IconGroupRow options={LAYOUTS} defaultValue="force" hybrid />);

            expect(screen.getAllByTestId("icon-group-icon")).toHaveLength(LAYOUTS.length);
        });

        it("moves the word when the choice moves", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={LAYOUTS} defaultValue="force" hybrid />);

            await user.click(screen.getByRole("radio", { name: "Radial" }));

            const words = screen.getAllByTestId("icon-group-word");
            expect(words).toHaveLength(1);
            expect(words[0]).toHaveTextContent("Radial");
        });

        it("pads a segment that carries a word, and only that one", () => {
            renderGroup(<IconGroupRow options={LAYOUTS} defaultValue="force" hybrid />);

            expect(segment("Force directed")).toHaveStyle({ paddingInline: "6px" });
            expect(segment("Radial").style.paddingInline).toBe("0");
        });
    });

    describe("the show-labels preference", () => {
        it("draws every word when the preference is on", () => {
            renderGroup(
                <PanelLabelsProvider showLabels>
                    <IconGroupRow options={LAYOUTS} defaultValue="force" width={PANEL_GRID.BODY} />
                </PanelLabelsProvider>,
            );

            const words = screen.getAllByTestId("icon-group-word");
            expect(words).toHaveLength(LAYOUTS.length);
            expect(words.map((word) => word.textContent)).toEqual(["Force directed", "Hierarchical", "Radial"]);
        });

        it("keeps the selected option named when the preference and hybrid are both on", () => {
            renderGroup(
                <PanelLabelsProvider showLabels>
                    <IconGroupRow options={LAYOUTS} defaultValue="radial" hybrid width={PANEL_GRID.BODY} />
                </PanelLabelsProvider>,
            );

            expect(screen.getAllByTestId("icon-group-word")).toHaveLength(LAYOUTS.length);
            expect(segment("Radial")).toHaveAttribute("data-active", "true");
        });
    });

    describe("choosing", () => {
        it("moves the selection on a click, uncontrolled", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" />);

            await user.click(screen.getByRole("radio", { name: "Disc" }));

            expect(screen.getByRole("radio", { name: "Disc" })).toBeChecked();
            expect(screen.getByRole("radio", { name: "Box" })).not.toBeChecked();
        });

        it("moves the selection when the drawing itself is clicked", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" />);

            await user.click(segment("Sphere"));

            expect(screen.getByRole("radio", { name: "Sphere" })).toBeChecked();
        });

        it("reports the new value first", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" onChange={onChange} />);

            await user.click(screen.getByRole("radio", { name: "Sphere" }));

            expect(onChange.mock.calls[0]?.[0]).toBe("sphere");
        });

        it("hands over the event that chose it, so a consumer can read the modifier keys", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" onChange={onChange} />);

            await user.click(screen.getByRole("radio", { name: "Sphere" }));

            const event: unknown = onChange.mock.calls[0]?.[1];
            expect(event).toBeInstanceOf(Object);
            expect((event as React.SyntheticEvent).type).toBe("change");
            expect((event as React.SyntheticEvent).target).toBe(screen.getByRole("radio", { name: "Sphere" }));
        });

        it("lets the parent own the value in controlled mode", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={SHAPES} value="box" onChange={onChange} />);

            await user.click(screen.getByRole("radio", { name: "Disc" }));

            expect(onChange.mock.calls[0]?.[0]).toBe("disc");
            // The parent did not re-render with a new value, so nothing moved.
            expect(screen.getByRole("radio", { name: "Box" })).toBeChecked();
        });

        it("follows a controlled value that changes", () => {
            const { rerender } = renderGroup(<IconGroupRow options={SHAPES} value="box" />);

            rerender(
                <MantineProvider theme={compactTheme}>
                    <IconGroupRow options={SHAPES} value="sphere" />
                </MantineProvider>,
            );

            expect(screen.getByRole("radio", { name: "Sphere" })).toBeChecked();
        });
    });

    describe("what cannot be chosen", () => {
        it("refuses one option and says so", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            const options = SHAPES.map((shape) => (shape.value === "disc" ? { ...shape, disabled: true } : shape));
            renderGroup(<IconGroupRow options={options} defaultValue="box" onChange={onChange} />);

            const disc = screen.getByRole("radio", { name: "Disc" });
            expect(disc).toBeDisabled();

            await user.click(disc);

            expect(onChange).not.toHaveBeenCalled();
            expect(screen.getByRole("radio", { name: "Box" })).toBeChecked();
        });

        it("draws a refused option in the disabled ink", () => {
            const options = SHAPES.map((shape) => (shape.value === "disc" ? { ...shape, disabled: true } : shape));
            renderGroup(<IconGroupRow options={options} defaultValue="box" />);

            expect(segment("Disc").style.color).toBe(PANEL_INK.DISABLED);
        });

        it("refuses the whole group", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" disabled onChange={onChange} />);

            for (const radio of screen.getAllByRole("radio")) {
                expect(radio).toBeDisabled();
            }

            await user.click(screen.getByRole("radio", { name: "Disc" }));

            expect(onChange).not.toHaveBeenCalled();
        });

        it("keeps Home and End quiet when there is nothing left to choose", () => {
            const onChange = vi.fn();
            const options = SHAPES.map((shape) => ({ ...shape, disabled: true }));
            renderGroup(<IconGroupRow options={options} defaultValue="sphere" onChange={onChange} />);

            fireEvent.keyDown(screen.getByTestId("icon-group-track"), { key: "Home" });

            expect(onChange).not.toHaveBeenCalled();
        });

        it("keeps Home and End quiet while the group is refused", () => {
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" disabled onChange={onChange} />);

            // Sent straight at the group, because a disabled radio cannot be
            // focused to send it from: the key is what has to be refused.
            fireEvent.keyDown(screen.getByTestId("icon-group-track"), { key: "End" });

            expect(onChange).not.toHaveBeenCalled();
            expect(screen.getByRole("radio", { name: "Sphere" })).toBeChecked();
        });
    });

    describe("the keyboard route", () => {
        it("takes one tab to reach the group, landing on the choice", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" />);

            await user.tab();

            expect(screen.getByRole("radio", { name: "Sphere" })).toHaveFocus();
        });

        it("lands on the first option when nothing is chosen yet", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} value="pyramid" />);

            await user.tab();

            expect(screen.getByRole("radio", { name: "Box" })).toHaveFocus();
        });

        it("moves the selection and the focus together on ArrowRight", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" />);

            await user.tab();
            await user.keyboard("{ArrowRight}");

            const sphere = screen.getByRole("radio", { name: "Sphere" });
            expect(sphere).toBeChecked();
            expect(sphere).toHaveFocus();
        });

        it("wraps past the end", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="disc" />);

            await user.tab();
            await user.keyboard("{ArrowRight}");

            expect(screen.getByRole("radio", { name: "Box" })).toBeChecked();
        });

        it("wraps before the start on ArrowLeft", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" />);

            await user.tab();
            await user.keyboard("{ArrowLeft}");

            expect(screen.getByRole("radio", { name: "Disc" })).toBeChecked();
        });

        it("treats ArrowDown as ArrowRight and ArrowUp as ArrowLeft", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" />);

            await user.tab();
            await user.keyboard("{ArrowDown}");
            expect(screen.getByRole("radio", { name: "Sphere" })).toBeChecked();

            await user.keyboard("{ArrowUp}");
            expect(screen.getByRole("radio", { name: "Box" })).toBeChecked();
        });

        it("jumps to the ends with Home and End", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" />);

            await user.tab();
            await user.keyboard("{End}");
            expect(screen.getByRole("radio", { name: "Disc" })).toBeChecked();
            expect(screen.getByRole("radio", { name: "Disc" })).toHaveFocus();

            await user.keyboard("{Home}");
            expect(screen.getByRole("radio", { name: "Box" })).toBeChecked();
            expect(screen.getByRole("radio", { name: "Box" })).toHaveFocus();
        });

        it("skips an option it cannot choose on Home and End", async () => {
            const user = userEvent.setup();
            const options = SHAPES.map((shape) => (shape.value === "box" ? { ...shape, disabled: true } : shape));
            renderGroup(<IconGroupRow options={options} defaultValue="disc" />);

            await user.tab();
            await user.keyboard("{Home}");

            expect(screen.getByRole("radio", { name: "Sphere" })).toBeChecked();
        });

        it("hands over the key that chose, as well as the value", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="sphere" onChange={onChange} />);

            await user.tab();
            await user.keyboard("{End}");

            expect(onChange.mock.calls[0]?.[0]).toBe("disc");
            expect((onChange.mock.calls[0]?.[1] as React.KeyboardEvent).key).toBe("End");
        });

        it("selects the focused option with Space when nothing is chosen yet", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={SHAPES} value="pyramid" onChange={onChange} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onChange.mock.calls[0]?.[0]).toBe("box");
        });

        it("ignores keys that are not part of the route", async () => {
            const user = userEvent.setup();
            renderGroup(<IconGroupRow options={SHAPES} defaultValue="box" />);

            await user.tab();
            await user.keyboard("{Escape}");

            expect(screen.getByRole("radio", { name: "Box" })).toBeChecked();
        });

        it("reports every arrow move to the parent", async () => {
            const user = userEvent.setup();
            const onChange = vi.fn();
            renderGroup(<IconGroupRow options={LAYOUTS} defaultValue="force" hybrid onChange={onChange} />);

            await user.tab();
            await user.keyboard("{ArrowRight}");

            expect(onChange.mock.calls[0]?.[0]).toBe("hierarchical");
        });
    });

    describe("the rest of the event model", () => {
        it("forwards the focus entering and leaving the group", async () => {
            const user = userEvent.setup();
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            renderGroup(
                <>
                    <IconGroupRow options={SHAPES} defaultValue="box" onFocus={onFocus} onBlur={onBlur} />
                    <button type="button">elsewhere</button>
                </>,
            );

            await user.tab();
            expect(onFocus).toHaveBeenCalledTimes(1);

            await user.tab();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("gives the group's radios one name, and takes the name it is given", () => {
            renderGroup(<IconGroupRow options={SHAPES} name="node-shape" />);

            for (const radio of screen.getAllByRole("radio")) {
                expect(radio).toHaveAttribute("name", "node-shape");
            }
        });

        it("makes up a name when it is given none, so two groups on a page stay apart", () => {
            renderGroup(
                <>
                    <IconGroupRow options={SHAPES} label="Node shape" />
                    <IconGroupRow options={LAYOUTS} label="Layout" />
                </>,
            );

            const shapeName = screen.getByRole("radio", { name: "Box" }).getAttribute("name");
            const layoutName = screen.getByRole("radio", { name: "Radial" }).getAttribute("name");

            expect(shapeName).toBeTruthy();
            expect(shapeName).not.toBe(layoutName);
        });
    });

    describe("the two-to-six threshold", () => {
        it("says nothing about a group of two", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            renderGroup(<IconGroupRow options={SHAPES.slice(0, 2)} />);

            expect(warn).not.toHaveBeenCalled();
        });

        it("says nothing about a group of six", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            renderGroup(<IconGroupRow options={SIX_SHAPES} />);

            expect(warn).not.toHaveBeenCalled();
        });

        it("warns in development about a group of one", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            renderGroup(<IconGroupRow options={SHAPES.slice(0, 1)} />);

            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0]?.[0]).toContain("IconGroupRow");
        });

        it("warns in development about a group of seven", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            const seven = [...SIX_SHAPES, { value: "torus", label: "Torus", icon: glyph("torus") }];
            renderGroup(<IconGroupRow options={seven} />);

            expect(warn).toHaveBeenCalledTimes(1);
        });

        it("keeps its warning free of names only this project knows", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            renderGroup(<IconGroupRow options={SHAPES.slice(0, 1)} />);

            const message = String(warn.mock.calls[0]?.[0]);
            expect(message).not.toMatch(/RT-\d|VOCAB|DECISIONS|COMPACTION/u);
        });

        it("renders an empty group without throwing, and warns", () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            renderGroup(<IconGroupRow options={[]} />);

            // A radio group with no radios is nothing to announce, so the track
            // is left out altogether and the row keeps its trailing slot.
            expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
            expect(screen.getByTestId("icon-group-row")).toBeInTheDocument();
            expect(screen.getByTestId("trailing-slot")).toBeInTheDocument();
            expect(warn).toHaveBeenCalledTimes(1);
        });

        it("does not warn again when nothing about the option count changed", async () => {
            const user = userEvent.setup();
            const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
            renderGroup(<IconGroupRow options={SHAPES.slice(0, 1)} />);

            await user.click(screen.getByRole("radio", { name: "Box" }));

            expect(warn).toHaveBeenCalledTimes(1);
        });
    });
});
