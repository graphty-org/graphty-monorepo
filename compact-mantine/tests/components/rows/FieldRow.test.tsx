import { DirectionProvider, MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { FieldRow } from "../../../src/components/rows/FieldRow";
import { PanelField } from "../../../src/components/rows/PanelField";
import { AdvancedButton } from "../../../src/components/rows/TrailingSlot";
import { PanelLabelsProvider } from "../../../src/context/PanelLabelsContext";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * The pair the stories and the mockups both use: the smallest and the largest
 * node size of one graph.
 * @returns Two fields, ready to be a row's children
 */
function pair(): React.JSX.Element[] {
    return [
        <PanelField key="smallest" label="Smallest node size" glyph="sizeSmallest" value="1.0" />,
        <PanelField key="largest" label="Largest node size" glyph="sizeLargest" value="4.0" />,
    ];
}

/** Physical spacing declarations: the ones that mirror wrongly under dir="rtl". */
const PHYSICAL_SPACING = /(^|-)(margin|padding|border|inset)?-?(left|right)\b/;

/**
 * Every element the row itself laid out, so a physical declaration cannot hide
 * on one of them.
 * @returns The row containers, the field slots and the label columns
 */
function physicalCandidates(): HTMLElement[] {
    return [
        ...screen.queryAllByTestId("field-row-labelled"),
        ...screen.queryAllByTestId("field-row"),
        ...screen.queryAllByTestId("field-row-slot"),
        ...screen.queryAllByTestId("field-row-label"),
    ];
}

/**
 * The physical spacing properties one element writes into its inline style.
 * @param element - An element the row laid out
 * @returns The offending property names, which should be none
 */
function physicalSpacing(element: HTMLElement): string[] {
    return (element.getAttribute("style") ?? "")
        .split(";")
        .map((declaration) => declaration.split(":")[0]?.trim() ?? "")
        .filter((property) => property !== "" && PHYSICAL_SPACING.test(property));
}

/**
 * The inline style of every element the row laid out, in document order.
 * @returns One style attribute per element
 */
function styleAttributes(): (string | null)[] {
    return physicalCandidates().map((element) => element.getAttribute("style"));
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
    warn.mockRestore();
});

describe("FieldRow", () => {
    describe("anatomy", () => {
        it("stands on the row pitch", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            expect(screen.getByTestId("field-row")).toHaveStyle({ height: "32px" });
        });

        it("draws the trailing slot even when it holds nothing", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            expect(screen.getByTestId("trailing-slot")).toBeInTheDocument();
            expect(screen.getByTestId("trailing-slot")).toBeEmptyDOMElement();
        });

        it("renders the trailing control it is given", () => {
            renderRow(
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>{pair()}</FieldRow>,
            );

            expect(screen.getByTestId("trailing-slot")).not.toBeEmptyDOMElement();
            expect(screen.getByTestId("advanced-button")).toBeInTheDocument();
        });

        it("renders both fields of a pair", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            expect(screen.getByTitle("Smallest node size")).toBeInTheDocument();
            expect(screen.getByTitle("Largest node size")).toBeInTheDocument();
        });

        it("counts the fields it was given", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            expect(screen.getByTestId("field-row")).toHaveAttribute("data-fields", "2");
        });

        it("looks inside a fragment, so a conditional pair is still a pair", () => {
            renderRow(
                <FieldRow>
                    <>
                        <PanelField label="Edge width" glyph="width" value="1.5" />
                        <PanelField label="Edge opacity" glyph="opacity" value="60" unit="%" />
                    </>
                </FieldRow>,
            );

            expect(screen.getByTestId("field-row")).toHaveAttribute("data-fields", "2");
        });
    });

    describe("the grid identity", () => {
        it("renders a pair at 108 each", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            const slots = screen.getAllByTestId("field-row-slot");
            expect(slots).toHaveLength(2);
            expect(slots[0]).toHaveAttribute("data-width", "108");
            expect(slots[1]).toHaveAttribute("data-width", "108");
        });

        it("keeps the gutter between the two fields of a pair", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            const slots = screen.getAllByTestId("field-row-slot");
            // Nothing before the first field: the row spends the gutter once,
            // between the pair, and writes no spacing where it spends none.
            expect(slots[0]?.style.marginInlineStart).toBe("");
            expect(slots[1]).toHaveStyle({ marginInlineStart: "8px" });
        });

        it("keeps the trail gap on a pair even with an empty trailing slot", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            const slots = screen.getAllByTestId("field-row-slot");
            expect(slots[1]).toHaveStyle({ marginInlineEnd: "8px" });
        });

        it("renders one field at the body span beside a trailing control", () => {
            renderRow(
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Betweenness" bound select />
                </FieldRow>,
            );

            const slot = screen.getByTestId("field-row-slot");
            expect(slot).toHaveAttribute("data-width", "224");
            expect(slot).toHaveStyle({ marginInlineEnd: "8px" });
        });

        it("spans 232 when one field is alone, so the row still reaches the end of the panel", () => {
            renderRow(
                <FieldRow>
                    <PanelField label="Layout" value="Force directed" select />
                </FieldRow>,
            );

            const slot = screen.getByTestId("field-row-slot");
            expect(slot).toHaveAttribute("data-width", "232");
            // The gap is inside the field's own 232 now, so the row writes none.
            expect(slot.style.marginInlineEnd).toBe("");
        });

        it("treats a trailing slot given false as empty", () => {
            const showAdvanced = false;

            renderRow(
                <FieldRow trailing={showAdvanced && <AdvancedButton label="Range and scale" onClick={vi.fn()} />}>
                    <PanelField label="Layout" value="Force directed" select />
                </FieldRow>,
            );

            expect(screen.getByTestId("field-row-slot")).toHaveAttribute("data-width", "232");
        });

        it("treats a trailing slot given null as empty", () => {
            renderRow(
                <FieldRow trailing={null}>
                    <PanelField label="Layout" value="Force directed" select />
                </FieldRow>,
            );

            expect(screen.getByTestId("field-row-slot")).toHaveAttribute("data-width", "232");
        });
    });

    // Under dir="rtl" a flex row reverses itself, so a physical margin keeps its
    // size and loses its place: the gutter escapes the pair and the trail gap
    // lands between the two fields. The row then draws the right widths in the
    // wrong order. The measurement that proves the layout is in
    // FieldRow.browser.test.tsx, where there is a layout engine; these assert
    // that no physical spacing is written in the first place, which is the thing
    // that regresses, and that the row writes one style for both directions
    // rather than branching on the direction it is in.
    describe("writing its spacing in logical properties", () => {
        it("writes no physical spacing anywhere on a pair", () => {
            renderRow(<FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>{pair()}</FieldRow>);

            for (const element of physicalCandidates()) {
                expect(physicalSpacing(element)).toEqual([]);
            }
        });

        it("spends the gutter and the trail gap as logical margins", () => {
            renderRow(<FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>{pair()}</FieldRow>);

            const slots = screen.getAllByTestId("field-row-slot");
            expect(slots[0]?.style.marginInlineStart).toBe("");
            expect(slots[1]).toHaveStyle({ marginInlineStart: "8px", marginInlineEnd: "8px" });
        });

        it("writes no physical spacing anywhere on a labelled row", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            for (const element of physicalCandidates()) {
                expect(physicalSpacing(element)).toEqual([]);
            }
        });

        it("keeps the gutter and the trail gap on a labelled row's slot", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            for (const slot of screen.getAllByTestId("field-row-slot")) {
                expect(slot).toHaveStyle({ marginInlineStart: "8px", marginInlineEnd: "8px" });
            }
        });

        // The row has no branch on direction at all: the same style goes out
        // both times and the browser resolves it two ways. If a direction ever
        // reaches the style object, this is where it shows up.
        it("writes exactly the same style right to left as it does left to right", () => {
            const row = (
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>{pair()}</FieldRow>
            );

            renderRow(<DirectionProvider initialDirection="ltr">{row}</DirectionProvider>);
            const leftToRight = styleAttributes();
            // Guard against comparing nothing to nothing: the row itself and
            // the two field slots.
            expect(leftToRight).toHaveLength(3);
            expect(leftToRight.every((declarations) => declarations !== null && declarations.length > 0)).toBe(true);
            cleanup();

            renderRow(<DirectionProvider initialDirection="rtl">{row}</DirectionProvider>);

            expect(styleAttributes()).toEqual(leftToRight);
        });
    });

    // A conditional first field is the ordinary way a panel row is written --
    // `{isBound && <PanelField .../>}<PanelField .../>` -- and the row keys its
    // slots by the children's own keys so that the condition flipping does not
    // tear down and rebuild the field that stayed. A rebuilt field loses its
    // focus and anything half-typed in it.
    describe("keeping a field alive when its sibling comes and goes", () => {
        it("does not rebuild the surviving field when the first one disappears", () => {
            const mounted = vi.fn();

            function Survivor(): React.JSX.Element {
                React.useEffect(() => {
                    mounted();
                }, []);

                return <div data-testid="survivor">Chonky_Boy</div>;
            }

            function Row({ withFirst }: { withFirst: boolean }): React.JSX.Element {
                return (
                    <FieldRow>
                        {withFirst && <PanelField key="smallest" label="Smallest" glyph="sizeSmallest" value="1.0" />}
                        <Survivor key="survivor" />
                    </FieldRow>
                );
            }

            const { rerender } = renderRow(<Row withFirst />);
            expect(mounted).toHaveBeenCalledTimes(1);

            rerender(
                <MantineProvider theme={compactTheme}>
                    <Row withFirst={false} />
                </MantineProvider>,
            );

            expect(screen.getByTestId("survivor")).toBeInTheDocument();
            expect(mounted).toHaveBeenCalledTimes(1);
        });
    });

    describe("the mistake the props allow", () => {
        it("warns in development when it is given a third field", () => {
            renderRow(
                <FieldRow>
                    <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                    <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
                    <PanelField label="Edge width" glyph="width" value="1.5" />
                </FieldRow>,
            );

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]?.[0])).toContain("FieldRow was given 3 fields");
        });

        it("renders every field it was given, so nothing is silently lost", () => {
            renderRow(
                <FieldRow>
                    <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                    <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
                    <PanelField label="Edge width" glyph="width" value="1.5" />
                </FieldRow>,
            );

            expect(screen.getAllByTestId("panel-field")).toHaveLength(3);
            expect(screen.getByTestId("field-row")).toHaveAttribute("data-fields", "3");
        });

        it("warns when it is given no field at all", () => {
            renderRow(<FieldRow>{null}</FieldRow>);

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]?.[0])).toContain("FieldRow was given 0 fields");
        });

        // The warning is printed in a consumer's own devtools, so it is read by
        // people who have never seen this project's internal vocabulary.
        it("says what to do about it in plain English, with no in-house shorthand", () => {
            renderRow(<FieldRow>{null}</FieldRow>);

            const message = String(warn.mock.calls[0]?.[0]);
            expect(message).not.toMatch(/RT-\d|VOCAB|DECISIONS|COMPACTION|escape hatch|chrome ink/i);
            expect(message).toContain("holds one field, or two side by side");
            expect(message).toContain("Put the extra fields on rows of their own.");
        });

        it("says nothing about one field", () => {
            renderRow(
                <FieldRow>
                    <PanelField label="Layout" value="Force directed" select />
                </FieldRow>,
            );

            expect(warn).not.toHaveBeenCalled();
        });

        it("says nothing about a pair", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            expect(warn).not.toHaveBeenCalled();
        });
    });

    describe("sizing its children", () => {
        it("makes a field fill the slot the row computed", () => {
            renderRow(
                <FieldRow>
                    <PanelField label="Layout" value="Force directed" select />
                </FieldRow>,
            );

            expect(screen.getByTestId("panel-field")).toHaveStyle({ width: "100%" });
        });

        it("overrides a field's own width, because the row owns the widths", () => {
            renderRow(
                <FieldRow>
                    <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" width={224} />
                    <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
                </FieldRow>,
            );

            const fields = screen.getAllByTestId("panel-field");
            expect(fields[0]).toHaveStyle({ width: "100%" });
            expect(screen.getAllByTestId("field-row-slot")[0]).toHaveAttribute("data-width", "108");
        });

        it("passes a child that is not a field through untouched", () => {
            renderRow(
                <FieldRow>
                    <div data-testid="not-a-field">Chonky_Boy</div>
                </FieldRow>,
            );

            expect(screen.getByTestId("not-a-field")).toBeInTheDocument();
            expect(screen.getByTestId("not-a-field")).not.toHaveAttribute("width");
        });
    });

    describe("naming the row for assistive technology", () => {
        it("adds nothing to the accessibility tree when it is not named", () => {
            renderRow(<FieldRow>{pair()}</FieldRow>);

            const row = screen.getByTestId("field-row");
            expect(row).not.toHaveAttribute("role");
            expect(row).not.toHaveAttribute("aria-label");
        });

        it("becomes a named group when it is given a group label", () => {
            renderRow(<FieldRow groupLabel="Node size range">{pair()}</FieldRow>);

            expect(screen.getByRole("group", { name: "Node size range" })).toBe(screen.getByTestId("field-row"));
        });

        it("keeps both fields reachable inside the group", () => {
            renderRow(<FieldRow groupLabel="Node size range">{pair()}</FieldRow>);

            const group = screen.getByRole("group", { name: "Node size range" });
            expect(group).toContainElement(screen.getByTitle("Smallest node size"));
            expect(group).toContainElement(screen.getByTitle("Largest node size"));
        });

        it("takes its name from a heading elsewhere on the page", () => {
            renderRow(
                <>
                    <h2 id="node-size-heading">Node size</h2>
                    <FieldRow aria-labelledby="node-size-heading">{pair()}</FieldRow>
                </>,
            );

            expect(screen.getByRole("group", { name: "Node size" })).toBe(screen.getByTestId("field-row"));
        });

        it("accepts a plain aria-label as the group name too", () => {
            renderRow(<FieldRow aria-label="Node size range">{pair()}</FieldRow>);

            expect(screen.getByRole("group", { name: "Node size range" })).toBeInTheDocument();
        });

        it("lets an explicit role win over the group role", () => {
            renderRow(
                <FieldRow groupLabel="Node size range" role="region">
                    {pair()}
                </FieldRow>,
            );

            expect(screen.getByRole("region", { name: "Node size range" })).toBeInTheDocument();
        });

        it("names the pair of rows the labels preference splits it into", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow groupLabel="Node size range">{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            const group = screen.getByRole("group", { name: "Node size range" });
            expect(group).toBe(screen.getByTestId("field-row-labelled"));
            expect(screen.getAllByTestId("field-row")).toHaveLength(2);
        });
    });

    describe("forwarding what a container has to forward", () => {
        it("forwards a click, with the event a consumer needs to read modifiers off", () => {
            const onClick = vi.fn();
            renderRow(<FieldRow onClick={onClick}>{pair()}</FieldRow>);

            fireEvent.click(screen.getByTestId("field-row"), { shiftKey: true });

            expect(onClick).toHaveBeenCalledTimes(1);
            expect(onClick.mock.calls[0]?.[0]).toMatchObject({ shiftKey: true, type: "click" });
        });

        it("forwards focus and blur rather than swallowing them", async () => {
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <FieldRow onFocus={onFocus} onBlur={onBlur}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" bound select onClick={vi.fn()} />
                </FieldRow>,
            );

            await user.tab();
            await user.tab();

            expect(onFocus).toHaveBeenCalledTimes(1);
            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("forwards a context menu and a double click", () => {
            const onContextMenu = vi.fn();
            const onDoubleClick = vi.fn();
            renderRow(
                <FieldRow onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
                    {pair()}
                </FieldRow>,
            );

            const row = screen.getByTestId("field-row");
            fireEvent.contextMenu(row);
            fireEvent.doubleClick(row);

            expect(onContextMenu).toHaveBeenCalledTimes(1);
            expect(onDoubleClick).toHaveBeenCalledTimes(1);
        });

        it("forwards the class name, the id and any extra style", () => {
            renderRow(
                <FieldRow className="dense" id="node-size" style={{ opacity: 0.5 }}>
                    {pair()}
                </FieldRow>,
            );

            const row = screen.getByTestId("field-row");
            expect(row).toHaveClass("dense");
            expect(row).toHaveAttribute("id", "node-size");
            // The extra style is merged over the row's own, which keeps its
            // height rather than being replaced by it.
            expect(row).toHaveStyle({ opacity: "0.5", height: "32px" });
        });

        it("gives a ref the row's own element", () => {
            const ref = React.createRef<HTMLDivElement>();
            renderRow(<FieldRow ref={ref}>{pair()}</FieldRow>);

            expect(ref.current).toBe(screen.getByTestId("field-row"));
        });

        it("gives a ref the outer element when the labels preference split the row", () => {
            const ref = React.createRef<HTMLDivElement>();
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow ref={ref}>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            expect(ref.current).toBe(screen.getByTestId("field-row-labelled"));
        });
    });

    describe("the show labels preference", () => {
        it("keeps the pair on one row when labels are off", () => {
            renderRow(
                <PanelLabelsProvider>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            expect(screen.getAllByTestId("field-row")).toHaveLength(1);
            expect(screen.queryByTestId("field-row-label")).not.toBeInTheDocument();
        });

        it("splits a pair into two single rows when labels are on", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            const rows = screen.getAllByTestId("field-row");
            expect(rows).toHaveLength(2);
            expect(rows[0]).toHaveAttribute("data-labelled", "true");
            expect(rows[1]).toHaveAttribute("data-labelled", "true");
        });

        it("never splits into a two-line stack: every row is one pitch tall", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            for (const row of screen.getAllByTestId("field-row")) {
                expect(row).toHaveStyle({ height: "32px" });
            }
        });

        it("puts each word in the label column", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            const labels = screen.getAllByTestId("field-row-label");
            expect(labels[0]).toHaveTextContent("Smallest node size");
            expect(labels[1]).toHaveTextContent("Largest node size");
            expect(labels[0]).toHaveStyle({ flex: "0 0 76px" });
        });

        // The column is narrow and a translated word is often longer than an
        // English one, so the word ellipsises. Clipping it is a paint-time
        // effect only: the whole word stays in the DOM and so in the
        // accessibility tree, the title serves a mouse, and the field beside it
        // carries the same word as its own accessible name for a keyboard or a
        // touch screen, neither of which can reach a title.
        it("keeps an ellipsised word readable in full", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            const labels = screen.getAllByTestId("field-row-label");
            expect(labels[0]).toHaveAttribute("title", "Smallest node size");
            expect(screen.getAllByTitle("Smallest node size").length).toBeGreaterThan(1);
        });

        it("clips the word only when it paints, never in the text itself", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>
                        <PanelField label="Kleinste Knotengroesse" glyph="sizeSmallest" value="1.0" />
                        <PanelField label="Groesste Knotengroesse" glyph="sizeLargest" value="4.0" />
                    </FieldRow>
                </PanelLabelsProvider>,
            );

            const [first] = screen.getAllByTestId("field-row-label");
            // Whole in the DOM, and therefore whole to a screen reader, however
            // little of it the 76px column can draw.
            expect(first).toHaveTextContent(/^Kleinste Knotengroesse$/);
            expect(first).toHaveStyle({ textOverflow: "ellipsis", overflow: "hidden" });
        });

        it("prints each word once: the field does not repeat it inside its box", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            expect(screen.queryAllByTestId("panel-field-label")).toHaveLength(0);
        });

        it("lets the field fill what is left of the row", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            const slots = screen.getAllByTestId("field-row-slot");
            expect(slots[0]).toHaveAttribute("data-width", "fill");
            expect(screen.getAllByTestId("panel-field")[0]).toHaveStyle({ width: "100%" });
        });

        it("keeps the row's one trailing control on the first of the two rows", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>{pair()}</FieldRow>
                </PanelLabelsProvider>,
            );

            const slots = screen.getAllByTestId("trailing-slot");
            expect(slots).toHaveLength(2);
            expect(slots[0]).not.toBeEmptyDOMElement();
            expect(slots[1]).toBeEmptyDOMElement();
            expect(screen.getAllByTestId("advanced-button")).toHaveLength(1);
        });

        it("leaves a single field on its one row, where the word joins the glyph", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>
                        <PanelField label="Layout" value="Hierarchical" select />
                    </FieldRow>
                </PanelLabelsProvider>,
            );

            expect(screen.getAllByTestId("field-row")).toHaveLength(1);
            expect(screen.queryByTestId("field-row-label")).not.toBeInTheDocument();
            expect(screen.getByTestId("panel-field-label")).toHaveTextContent("Layout");
        });

        it("leaves the label column empty for a child that carries no word", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>
                        <PanelField label="Layout" value="Radial" select />
                        <div data-testid="not-a-field">Mrs_Henderson</div>
                    </FieldRow>
                </PanelLabelsProvider>,
            );

            const labels = screen.getAllByTestId("field-row-label");
            expect(labels[0]).toHaveTextContent("Layout");
            expect(labels[1]).toBeEmptyDOMElement();
            expect(screen.getByTestId("not-a-field")).toBeInTheDocument();
        });
    });

    describe("keyboard and accessible names", () => {
        it("gives the trailing button an accessible name equal to its title", () => {
            renderRow(
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" bound select />
                </FieldRow>,
            );

            const button = screen.getByRole("button", { name: "Range and scale" });
            expect(button).toHaveAttribute("title", "Range and scale");
        });

        it("opens the trailing button from the keyboard", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={onClick} />}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" bound select />
                </FieldRow>,
            );

            // Two tabs: the field itself is focusable, and it comes first. The
            // test below pins that order.
            await user.tab();
            await user.tab();
            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("reaches an interactive field before the trailing button in the tab order", async () => {
            const onField = vi.fn();
            const onTrailing = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <FieldRow trailing={<AdvancedButton label="Range and scale" onClick={onTrailing} />}>
                    <PanelField label="Size by attribute" glyph="attribute" value="Age" bound select onClick={onField} />
                </FieldRow>,
            );

            await user.tab();
            await user.keyboard("{Enter}");
            await user.tab();
            await user.keyboard(" ");

            expect(onField).toHaveBeenCalledTimes(1);
            expect(onTrailing).toHaveBeenCalledTimes(1);
        });

        it("keeps both fields reachable when the labels preference split the pair", async () => {
            const onSmallest = vi.fn();
            const onLargest = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <PanelLabelsProvider showLabels>
                    <FieldRow>
                        <PanelField label="Smallest" glyph="sizeSmallest" value="1.0" onClick={onSmallest} />
                        <PanelField label="Largest" glyph="sizeLargest" value="4.0" onClick={onLargest} />
                    </FieldRow>
                </PanelLabelsProvider>,
            );

            await user.tab();
            await user.keyboard("{Enter}");
            await user.tab();
            await user.keyboard("{Enter}");

            expect(onSmallest).toHaveBeenCalledTimes(1);
            expect(onLargest).toHaveBeenCalledTimes(1);
        });
    });
});
