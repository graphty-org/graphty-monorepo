import { DirectionProvider, MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { PanelField } from "../../../src/components/rows/PanelField";
import { PanelLabelsProvider } from "../../../src/context/PanelLabelsContext";
import { LabelsProvider } from "../../../src/i18n";
import { FIELD_GLYPH_NAMES, FIELD_LETTERS } from "../../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderField(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render with the text direction reversed, the way a right-to-left app consumes
 * the package.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRtl(ui: React.ReactElement): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection="rtl" detectDirection={false}>
            <MantineProvider theme={compactTheme}>{ui}</MantineProvider>
        </DirectionProvider>,
    );
}

/**
 * The field's own input element.
 * @returns The input the field renders
 */
function fieldInput(): HTMLInputElement {
    return screen.getByTestId("panel-field").querySelector("input") as HTMLInputElement;
}

/**
 * Press the pointer on an element.
 *
 * A plain `MouseEvent` named for a pointer event is used deliberately: JSDOM has
 * no `PointerEvent` constructor, and a bare `Event` would carry no coordinates.
 * @param element - The element to press
 * @param clientX - Where along the screen's x axis the press lands
 */
function pointerDown(element: Element, clientX: number): void {
    fireEvent(element, new MouseEvent("pointerdown", { bubbles: true, cancelable: true, clientX }));
}

/**
 * Move the pressed pointer.
 * @param element - The element holding the gesture
 * @param clientX - Where along the screen's x axis the pointer now is
 */
function pointerMove(element: Element, clientX: number): void {
    fireEvent(element, new MouseEvent("pointermove", { bubbles: true, cancelable: true, clientX }));
}

/**
 * Release the pointer.
 * @param element - The element holding the gesture
 */
function pointerUp(element: Element): void {
    fireEvent(element, new MouseEvent("pointerup", { bubbles: true, cancelable: true }));
}

// Mantine's dropdown scrolls the active option into view on a timer, which JSDOM
// has no implementation for.
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView(): void {
        // Intentionally empty: nothing scrolls in JSDOM.
    };
}

const originalMatchMedia = window.matchMedia;

/**
 * Make every media query report the given match, so the coarse-pointer branch
 * can be exercised in jsdom.
 * @param matches - What matchMedia should report for every query
 */
function setMatchMedia(matches: boolean): void {
    window.matchMedia = ((query: string): MediaQueryList =>
        ({
            matches,
            media: query,
            onchange: null,
            addListener: () => undefined,
            removeListener: () => undefined,
            addEventListener: () => undefined,
            removeEventListener: () => undefined,
            dispatchEvent: () => true,
        }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

afterEach(() => {
    window.matchMedia = originalMatchMedia;
});

describe("PanelField", () => {
    describe("anatomy", () => {
        it("renders a real form control rather than a div", () => {
            renderField(<PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />);

            expect(fieldInput().tagName).toBe("INPUT");
        });

        it("carries a title equal to the label", () => {
            renderField(<PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />);

            expect(screen.getByTitle("Smallest node size")).toBeInTheDocument();
        });

        it("lets the caller override the title", () => {
            renderField(<PanelField label="Smallest node size" value="1.0" title="Smallest of the two sizes" />);

            expect(screen.getByTitle("Smallest of the two sizes")).toBeInTheDocument();
        });

        it("holds the value in the input", () => {
            renderField(<PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />);

            expect(fieldInput()).toHaveValue("1.0");
        });

        it("renders the glyph slot even when there is no glyph", () => {
            renderField(<PanelField label="Depth" value="2" />);

            expect(screen.getByTestId("panel-field-slot")).toBeInTheDocument();
        });

        it("draws a glyph from the closed register", () => {
            const { container } = renderField(<PanelField label="Edge width" glyph="width" value="1.5" />);

            expect(container.querySelector('[data-glyph="width"]')).toBeInTheDocument();
        });

        it("draws a capital letter instead of an SVG", () => {
            renderField(<PanelField label="Depth" glyph="D" value="2" />);

            const letter = screen.getByTestId("panel-field-slot");
            expect(letter).toHaveTextContent("D");
            expect(letter.querySelector("svg")).toBeNull();
        });

        it("draws an arbitrary node such as a colour swatch", () => {
            renderField(<PanelField label="Node colour" glyph={<span data-testid="swatch" />} value="4A7EE8" />);

            expect(screen.getByTestId("swatch")).toBeInTheDocument();
        });

        it.each(FIELD_GLYPH_NAMES)("draws %s hollow and bound", (name) => {
            const hollow = renderField(<PanelField label={name} glyph={name} value="1" />);
            expect(hollow.container.querySelector(`[data-glyph="${name}"]`)).toHaveAttribute("data-filled", "false");

            const bound = renderField(<PanelField label={name} glyph={name} value="1" bound />);
            expect(bound.container.querySelector(`[data-glyph="${name}"]`)).toHaveAttribute("data-filled", "true");
        });

        it.each(FIELD_LETTERS)("draws the capital %s", (letter) => {
            renderField(<PanelField label="Letter" glyph={letter} value="1" />);

            expect(screen.getByTestId("panel-field-slot")).toHaveTextContent(letter);
        });

        it("renders the unit as a suffix in the same box", () => {
            renderField(<PanelField label="Opacity" glyph="opacity" value="100" unit="%" />);

            expect(screen.getByTestId("panel-field-unit")).toHaveTextContent("%");
        });

        it("omits the unit when there is none", () => {
            renderField(<PanelField label="Opacity" glyph="opacity" value="100" />);

            expect(screen.queryByTestId("panel-field-unit")).not.toBeInTheDocument();
        });

        it("keeps the value at the panel's 24px inset by sizing the glyph slot", () => {
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />);

            // Mantine turns leftSectionWidth into both the section's width and
            // the input's padding-inline-start, so this one variable is the
            // whole promise. 1.5rem is 24px at Mantine's own scale.
            const wrapper = screen.getByTestId("panel-field").querySelector("[data-with-left-section]");
            expect(wrapper?.getAttribute("style")).toContain("--input-left-section-width: calc(1.5rem");
        });
    });

    describe("accessibility", () => {
        it("names itself from a real label element", () => {
            const { container } = renderField(<PanelField label="Smallest node size" value="1.0" />);

            const label = container.querySelector("label");
            expect(label).toHaveTextContent("Smallest node size");
            expect(label).toHaveAttribute("for", fieldInput().id);
        });

        it("announces the value as well as the label", () => {
            renderField(<PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />);

            // The defect this component shipped with: role="button" plus
            // aria-label made the label the whole announcement and the value
            // unreachable. An input carries both.
            const input = screen.getByRole("textbox", { name: "Smallest node size" });
            expect(input).toHaveValue("1.0");
        });

        it("draws no focus suppression of its own", () => {
            renderField(<PanelField label="Layout" value="Force directed" />);

            // The theme restores a focus ring on every control; a local
            // `outline: none` here would take it away again.
            expect(fieldInput().style.outline).toBe("");
            expect(screen.getByTestId("panel-field").style.outline).toBe("");
        });

        it("announces a disagreement rather than only drawing it", () => {
            renderField(<PanelField label="Opacity" value="100" mixed />);

            expect(fieldInput()).toHaveAccessibleDescription("Mixed");
        });

        it("announces a value bound to a data attribute", () => {
            renderField(<PanelField label="Size by attribute" glyph="attribute" value="Age" bound />);

            expect(fieldInput()).toHaveAccessibleDescription("Bound to a data attribute");
        });

        it("lets the caller reword what a bound value announces", () => {
            renderField(
                <PanelField label="Size" glyph="attribute" value="Age" bound boundDescription="Follows an attribute" />,
            );

            expect(fieldInput()).toHaveAccessibleDescription("Follows an attribute");
        });

        it("announces a value that has not taken effect yet", () => {
            renderField(<PanelField label="Largest" glyph="sizeLargest" value="4.0" pending />);

            expect(fieldInput()).toHaveAccessibleDescription("Set but not yet applied");
        });

        it("says nothing extra when the field is in none of those states", () => {
            renderField(<PanelField label="Largest" glyph="sizeLargest" value="4.0" />);

            expect(fieldInput()).not.toHaveAccessibleDescription();
        });

        it("hides the glyph from assistive technology", () => {
            const { container } = renderField(<PanelField label="Edge width" glyph="width" value="1.5" />);

            expect(container.querySelector('[data-glyph="width"]')).toHaveAttribute("aria-hidden", "true");
        });
    });

    describe("width", () => {
        it("defaults to one of a pair", () => {
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />);

            expect(screen.getByTestId("panel-field")).toHaveStyle({ width: "108px" });
        });

        it("takes the body span when asked", () => {
            renderField(<PanelField label="Layout" value="Force directed" width={224} />);

            expect(screen.getByTestId("panel-field")).toHaveStyle({ width: "224px" });
        });

        it("fills the row when asked", () => {
            renderField(<PanelField label="Layout" value="Force directed" width="fill" />);

            expect(screen.getByTestId("panel-field")).toHaveStyle({ width: "100%" });
        });

        it("lets the caller add to the outer style", () => {
            renderField(<PanelField label="Layout" value="Force directed" style={{ opacity: 0.5 }} />);

            expect(screen.getByTestId("panel-field")).toHaveStyle({ opacity: "0.5" });
        });
    });

    describe("states", () => {
        it("draws the bound form of the glyph", () => {
            const { container } = renderField(
                <PanelField label="Size by attribute" glyph="attribute" value="Age" bound />,
            );

            expect(container.querySelector('[data-glyph="attribute"]')).toHaveAttribute("data-filled", "true");
            expect(screen.getByTestId("panel-field")).toHaveAttribute("data-bound", "true");
        });

        it("draws the hollow form when it is a fixed literal", () => {
            const { container } = renderField(<PanelField label="Size by attribute" glyph="attribute" value="Age" />);

            expect(container.querySelector('[data-glyph="attribute"]')).toHaveAttribute("data-filled", "false");
        });

        it("reads Mixed in place of a value when the selection disagrees", () => {
            renderField(<PanelField label="Opacity" glyph="opacity" value="100" mixed />);

            expect(fieldInput()).toHaveAttribute("placeholder", "Mixed");
            expect(fieldInput()).toHaveValue("");
            expect(screen.getByTestId("panel-field")).toHaveAttribute("data-mixed", "true");
        });

        it("takes the word for a disagreement from the label provider", () => {
            renderField(
                <LabelsProvider labels={{ mixed: "Verschieden" }}>
                    <PanelField label="Opacity" glyph="opacity" value="100" mixed />
                </LabelsProvider>,
            );

            expect(fieldInput()).toHaveAttribute("placeholder", "Verschieden");
            expect(fieldInput()).toHaveAccessibleDescription("Verschieden");
        });

        it("keeps a mixed field editable", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Opacity" glyph="opacity" value="100" mixed onChange={onChange} />);

            await user.type(fieldInput(), "5");

            expect(onChange).toHaveBeenCalledWith("5", expect.anything());
        });

        it("moves the value into the placeholder for the older boolean spelling", () => {
            renderField(<PanelField label="Label attribute" value="Choose" placeholder />);

            expect(fieldInput()).toHaveAttribute("placeholder", "Choose");
            expect(fieldInput()).toHaveValue("");
        });

        it("shows placeholder text when it is given as a string", () => {
            renderField(<PanelField label="Label attribute" placeholder="Choose an attribute" />);

            expect(fieldInput()).toHaveAttribute("placeholder", "Choose an attribute");
        });

        it("draws a chevron inside the box for the drop-down form", () => {
            renderField(<PanelField label="Layout" value="Force directed" kind="select" />);

            expect(screen.getByTestId("panel-field-chevron")).toBeInTheDocument();
            expect(screen.getByTestId("panel-field")).toHaveAttribute("data-select", "true");
        });

        it("still draws a chevron for the superseded select prop", () => {
            renderField(<PanelField label="Layout" value="Force directed" select />);

            expect(screen.getByTestId("panel-field-chevron")).toBeInTheDocument();
            expect(screen.getByTestId("panel-field")).toHaveAttribute("data-kind", "select");
        });

        it("draws no chevron by default", () => {
            renderField(<PanelField label="Layout" value="Force directed" />);

            expect(screen.queryByTestId("panel-field-chevron")).not.toBeInTheDocument();
        });

        it("marks a pending value in the slot corner", () => {
            renderField(<PanelField label="Largest" glyph="sizeLargest" value="4.0" pending />);

            expect(screen.getByTestId("panel-field-pending")).toBeInTheDocument();
            expect(screen.getByTestId("panel-field")).toHaveAttribute("data-pending", "true");
        });

        it("draws no pending mark by default", () => {
            renderField(<PanelField label="Largest" glyph="sizeLargest" value="4.0" />);

            expect(screen.queryByTestId("panel-field-pending")).not.toBeInTheDocument();
        });
    });

    describe("value changes", () => {
        it("is read-only when it is given a value and nowhere to send an edit", () => {
            renderField(<PanelField label="Layout" value="Force directed" />);

            expect(fieldInput()).toHaveAttribute("readonly");
        });

        it("is editable as soon as it is given a change handler", () => {
            renderField(<PanelField label="Layout" value="Force directed" onChange={vi.fn()} />);

            expect(fieldInput()).not.toHaveAttribute("readonly");
        });

        it("is editable when it keeps its own value", () => {
            renderField(<PanelField label="Layout" defaultValue="Force directed" />);

            expect(fieldInput()).not.toHaveAttribute("readonly");
        });

        it("obeys an explicit read-only", () => {
            renderField(<PanelField label="Layout" defaultValue="Force directed" readOnly />);

            expect(fieldInput()).toHaveAttribute("readonly");
        });

        it("reports what was typed, value first and the event second", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Node name" defaultValue="" onChange={onChange} />);

            await user.type(fieldInput(), "ab");

            expect(onChange).toHaveBeenNthCalledWith(1, "a", expect.anything());
            expect(onChange).toHaveBeenNthCalledWith(2, "ab", expect.anything());
        });

        it("keeps its own value when it is uncontrolled", async () => {
            const user = userEvent.setup();
            renderField(<PanelField label="Node name" defaultValue="" />);

            await user.type(fieldInput(), "Age");

            expect(fieldInput()).toHaveValue("Age");
        });

        it("steps a number field from the keyboard", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Depth" glyph="D" kind="number" defaultValue={2} onChange={onChange} />);

            await user.click(fieldInput());
            await user.keyboard("{ArrowUp}");

            expect(onChange).toHaveBeenCalledWith(3, undefined);
        });

        it("draws a number field as a number box", () => {
            renderField(<PanelField label="Depth" kind="number" value={2} />);

            expect(screen.getByTestId("panel-field")).toHaveAttribute("data-kind", "number");
            expect(fieldInput()).toHaveValue("2");
        });

        it("offers a drop-down when it is given choices", () => {
            renderField(
                <PanelField label="Layout" kind="select" data={["Force directed", "Radial"]} value="Radial" />,
            );

            const input = fieldInput();
            expect(input).toHaveAttribute("aria-haspopup", "listbox");
            expect(input).toHaveValue("Radial");
        });

        it("reports the choice that was made", async () => {
            const onChange = vi.fn();
            const user = userEvent.setup();
            renderField(
                <PanelField
                    label="Layout"
                    kind="select"
                    data={["Force directed", "Radial"]}
                    value="Radial"
                    onChange={onChange}
                />,
            );

            await user.click(fieldInput());
            // `hidden: true` because the dropdown floats: JSDOM gives it no
            // layout, so the positioning library marks it display:none and it
            // drops out of the accessibility tree. It has real option roles.
            await user.click(screen.getByRole("option", { name: "Force directed", hidden: true }));

            expect(onChange).toHaveBeenCalledWith("Force directed", undefined);
        });
    });

    describe("activation", () => {
        it("hands the event to the click handler", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" onClick={onClick} />);

            await user.click(fieldInput());

            expect(onClick).toHaveBeenCalledTimes(1);
            expect(onClick.mock.calls[0][0]).toHaveProperty("preventDefault");
        });

        it("activates on Enter", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" onClick={onClick} />);

            await user.tab();
            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("activates on Space when the field cannot be typed into", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" onClick={onClick} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("lets Space be a space in a field that can be typed into", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Node name" defaultValue="a" onClick={onClick} />);

            // Clicking to place the caret is itself an activation; what is being
            // asserted is that the space afterwards is not.
            await user.click(fieldInput());
            onClick.mockClear();
            await user.keyboard(" ");

            expect(onClick).not.toHaveBeenCalled();
            expect(fieldInput()).toHaveValue("a ");
        });

        it("ignores other keys", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" onClick={onClick} />);

            await user.tab();
            await user.keyboard("{Escape}");

            expect(onClick).not.toHaveBeenCalled();
        });

        it("forwards the caller's own key handler", async () => {
            const onKeyDown = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" onKeyDown={onKeyDown} />);

            await user.tab();
            await user.keyboard("{Enter}");

            expect(onKeyDown).toHaveBeenCalledTimes(1);
        });

        it("forwards focus and blur rather than swallowing them", async () => {
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" onFocus={onFocus} onBlur={onBlur} />);

            await user.tab();
            await user.tab();

            expect(onFocus).toHaveBeenCalledTimes(1);
            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("does nothing when disabled", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" onClick={onClick} disabled />);

            await user.click(fieldInput());

            expect(onClick).not.toHaveBeenCalled();
            expect(fieldInput()).toBeDisabled();
            expect(screen.getByTestId("panel-field")).toHaveAttribute("data-disabled", "true");
        });

        it("is skipped by the Tab key when disabled", async () => {
            const user = userEvent.setup();
            renderField(<PanelField label="Layout" value="Force directed" disabled />);

            await user.tab();

            expect(fieldInput()).not.toHaveFocus();
        });
    });

    describe("scrubbing", () => {
        it("marks the slot as the drag handle", () => {
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={vi.fn()} />);

            expect(screen.getByTestId("panel-field-slot")).toHaveAttribute("data-scrub", "true");
        });

        it("is a handle for any one of the three handlers", () => {
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrubEnd={vi.fn()} />);

            expect(screen.getByTestId("panel-field-slot")).toHaveAttribute("data-scrub", "true");
        });

        it("is not a handle without one", () => {
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />);

            expect(screen.getByTestId("panel-field-slot")).not.toHaveAttribute("data-scrub");
        });

        it("sends a positive delta as the pointer moves along the text direction", () => {
            const onScrub = vi.fn();
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            pointerMove(slot, 112);

            expect(onScrub).toHaveBeenCalledWith(12, expect.anything());
        });

        it("sends a negative delta as the pointer moves against it", () => {
            const onScrub = vi.fn();
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            pointerMove(slot, 92);

            expect(onScrub).toHaveBeenCalledWith(-8, expect.anything());
        });

        it("follows the text direction rather than the screen when text runs right to left", () => {
            const onScrub = vi.fn();
            renderRtl(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            pointerMove(slot, 112);

            expect(onScrub).toHaveBeenCalledWith(-12, expect.anything());
        });

        it("opens and closes the gesture exactly once around a drag", () => {
            const onScrubStart = vi.fn();
            const onScrub = vi.fn();
            const onScrubEnd = vi.fn();
            renderField(
                <PanelField
                    label="Smallest"
                    glyph="sizeSmallest"
                    value="1.0"
                    onScrubStart={onScrubStart}
                    onScrub={onScrub}
                    onScrubEnd={onScrubEnd}
                />,
            );

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            pointerMove(slot, 110);
            pointerMove(slot, 120);
            pointerUp(slot);

            expect(onScrubStart).toHaveBeenCalledTimes(1);
            expect(onScrub).toHaveBeenCalledTimes(2);
            expect(onScrubEnd).toHaveBeenCalledTimes(1);
        });

        it("does not open a gesture for a press that never moves", () => {
            const onScrubStart = vi.fn();
            const onScrubEnd = vi.fn();
            renderField(
                <PanelField
                    label="Smallest"
                    glyph="sizeSmallest"
                    value="1.0"
                    onScrubStart={onScrubStart}
                    onScrubEnd={onScrubEnd}
                />,
            );

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            pointerUp(slot);

            expect(onScrubStart).not.toHaveBeenCalled();
            expect(onScrubEnd).not.toHaveBeenCalled();
        });

        it("stops reporting once the pointer is released", () => {
            const onScrub = vi.fn();
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            pointerUp(slot);
            pointerMove(slot, 140);

            expect(onScrub).not.toHaveBeenCalled();
        });

        it("does not report a move of zero", () => {
            const onScrub = vi.fn();
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            pointerMove(slot, 100);

            expect(onScrub).not.toHaveBeenCalled();
        });

        it("releases the drag when the field unmounts mid-scrub", () => {
            const onScrub = vi.fn();
            const { unmount } = renderField(
                <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />,
            );

            const slot = screen.getByTestId("panel-field-slot");
            pointerDown(slot, 100);
            unmount();
            pointerMove(slot, 140);

            expect(onScrub).not.toHaveBeenCalled();
        });

        it("does not scrub on a coarse pointer", () => {
            setMatchMedia(true);
            const onScrub = vi.fn();
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} />);

            const slot = screen.getByTestId("panel-field-slot");
            expect(slot).not.toHaveAttribute("data-scrub");

            pointerDown(slot, 100);
            pointerMove(slot, 140);

            expect(onScrub).not.toHaveBeenCalled();
        });

        it("does not scrub when disabled", () => {
            const onScrub = vi.fn();
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onScrub={onScrub} disabled />);

            expect(screen.getByTestId("panel-field-slot")).not.toHaveAttribute("data-scrub");
        });
    });

    describe("the showLabels preference", () => {
        it("hides the label word by default", () => {
            renderField(<PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />);

            expect(screen.queryByTestId("panel-field-label")).not.toBeInTheDocument();
        });

        it("draws the label word after the glyph when the preference is on", () => {
            renderField(
                <PanelLabelsProvider showLabels>
                    <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                </PanelLabelsProvider>,
            );

            expect(screen.getByTestId("panel-field-label")).toHaveTextContent("Smallest");
        });

        it("announces the drawn word once rather than twice", () => {
            renderField(
                <PanelLabelsProvider showLabels>
                    <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                </PanelLabelsProvider>,
            );

            expect(screen.getByTestId("panel-field-label")).toHaveAttribute("aria-hidden", "true");
            expect(fieldInput()).toHaveAccessibleName("Smallest");
        });

        it("stays off when the provider says off", () => {
            renderField(
                <PanelLabelsProvider>
                    <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" />
                </PanelLabelsProvider>,
            );

            expect(screen.queryByTestId("panel-field-label")).not.toBeInTheDocument();
        });
    });
});
