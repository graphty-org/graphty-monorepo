import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { CompoundRow } from "../../../src/components/rows/CompoundRow";
import { DoorButton } from "../../../src/components/rows/TrailingSlot";
import { PANEL_INK } from "../../../src/constants/panel";
import { PanelLabelsProvider } from "../../../src/context/PanelLabelsContext";
import { UiGlyph } from "../../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * A stand-in for the 14px colour swatch the canonical row puts in its leading
 * slot.
 * @returns The swatch node
 */
function swatch(): React.JSX.Element {
    return <span data-testid="swatch" />;
}

/**
 * The two segments of the canonical row: a colour and its opacity.
 * @returns The segments
 */
function colourAndOpacity(): React.ComponentProps<typeof CompoundRow>["segments"] {
    return [
        { value: "4A7EE8", grow: true },
        { value: "100", unit: "%" },
    ];
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
    warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
    warn.mockRestore();
});

describe("CompoundRow", () => {
    describe("anatomy", () => {
        it("carries the label as the box's title", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { glyph: swatch(), value: "4A7EE8", mono: true, grow: true },
                        { value: "100", unit: "%" },
                    ]}
                />,
            );

            expect(screen.getByTitle("Node colour and opacity")).toBeInTheDocument();
        });

        it("names the whole box, because the segments are one thing", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(screen.getByRole("group", { name: "Node colour and opacity" })).toBeInTheDocument();
        });

        it("renders every segment's value", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const values = screen.getAllByTestId("compound-segment-value");
            expect(values).toHaveLength(2);
            expect(values[0]).toHaveTextContent("4A7EE8");
            expect(values[1]).toHaveTextContent("100");
        });

        it("renders a unit as a dimmed suffix inside the same segment", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const unit = screen.getByTestId("compound-segment-unit");
            expect(unit).toHaveTextContent("%");
            expect(unit.style.color).toBe(PANEL_INK.CHROME);
        });

        it("renders no unit when the segment has none", () => {
            renderRow(
                <CompoundRow
                    label="Graph size, nodes and edges"
                    segments={[
                        { glyph: "N", value: "20", grow: true },
                        { glyph: "E", value: "34" },
                    ]}
                />,
            );

            expect(screen.queryByTestId("compound-segment-unit")).toBeNull();
        });

        it("puts one hairline between two segments", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(screen.getAllByTestId("compound-row-hairline")).toHaveLength(1);
        });

        it("puts two hairlines between three segments", () => {
            renderRow(
                <CompoundRow
                    label="Node colour, red green and blue"
                    segments={[{ value: "74", grow: true }, { value: "126" }, { value: "232" }]}
                />,
            );

            expect(screen.getAllByTestId("compound-row-hairline")).toHaveLength(2);
            expect(screen.getAllByTestId("compound-segment")).toHaveLength(3);
        });

        it("draws the divider as a 1px hairline of panel background, not a gutter", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const hairline = screen.getByTestId("compound-row-hairline");
            expect(hairline).toHaveStyle({ width: "1px", height: "24px" });
            expect(hairline.getAttribute("style")).toContain("var(--mantine-color-body)");
            // A gutter would separate them into two controls and undo the point.
            expect(screen.getByTestId("compound-row-box").style.gap).toBe("");
        });

        it("keeps the segments on one surface, at the control height", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const box = screen.getByTestId("compound-row-box");
            expect(box).toHaveStyle({ height: "24px" });
            expect(box.style.background).toBe(PANEL_INK.SURFACE);
            expect(box.getAttribute("style")).toContain("overflow: hidden");
        });

        it("stands on the 32px row pitch", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(screen.getByTestId("compound-row")).toHaveStyle({ height: "32px" });
        });
    });

    describe("width", () => {
        it("spans the body at 224 by default", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(screen.getByTestId("compound-row-box")).toHaveStyle({ width: "224px" });
        });

        it("narrows to 108 as one of a pair", () => {
            renderRow(
                <CompoundRow
                    label="Label colour and opacity"
                    segments={[
                        { value: "D5D7DA", grow: true },
                        { value: "70", unit: "%" },
                    ]}
                    width={108}
                />,
            );

            expect(screen.getByTestId("compound-row-box")).toHaveStyle({ width: "108px" });
        });
    });

    describe("the glyph slot", () => {
        it("draws a glyph from the closed register", () => {
            const { container } = renderRow(
                <CompoundRow
                    label="Node opacity and falloff"
                    segments={[
                        { glyph: "opacity", value: "100", unit: "%", grow: true },
                        { value: "0.5" },
                    ]}
                />,
            );

            expect(container.querySelector('[data-glyph="opacity"]')).toBeInTheDocument();
        });

        it("draws a capital letter from the closed set", () => {
            const { container } = renderRow(
                <CompoundRow
                    label="Graph size, nodes and edges"
                    segments={[
                        { glyph: "N", value: "20", grow: true },
                        { glyph: "E", value: "34" },
                    ]}
                />,
            );

            expect(container.querySelector('[data-letter="N"]')).toHaveTextContent("N");
            expect(container.querySelector('[data-letter="E"]')).toHaveTextContent("E");
        });

        it("draws a node, such as the colour swatch", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { glyph: swatch(), value: "4A7EE8", mono: true, grow: true },
                        { value: "100", unit: "%" },
                    ]}
                />,
            );

            expect(screen.getByTestId("swatch")).toBeInTheDocument();
        });

        it("draws a slot only for the segments that have a glyph", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { glyph: swatch(), value: "4A7EE8", mono: true, grow: true },
                        { value: "100", unit: "%" },
                    ]}
                />,
            );

            expect(screen.getAllByTestId("compound-segment-slot")).toHaveLength(1);
        });

        it("draws no slot at all when no segment has a glyph", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(screen.queryByTestId("compound-segment-slot")).toBeNull();
        });

        it("holds the leading value ink at the 24px inset", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { glyph: swatch(), value: "4A7EE8", grow: true },
                        { value: "100", unit: "%" },
                    ]}
                />,
            );

            // The 16px glyph slot plus 8px of inline padding is the 24px inset
            // every other row in the panel starts its value at. The padding is
            // asserted logically because that is how it is written; the physical
            // `padding` shorthand this used to assert no longer exists.
            const [leading] = screen.getAllByTestId("compound-segment");
            expect(leading.style.paddingInline).toBe("8px");
            expect(leading.getAttribute("style")).toContain("padding-block: 0");
            expect(screen.getByTestId("compound-segment-slot")).toHaveStyle({ width: "16px" });
        });
    });

    describe("grow -- which value is the main one", () => {
        it("gives the remaining width to the segment that asks for it", () => {
            renderRow(
                <CompoundRow
                    label="Node opacity and colour"
                    segments={[{ value: "100", unit: "%" }, { value: "4A7EE8", grow: true }]}
                />,
            );

            const segments = screen.getAllByTestId("compound-segment");
            expect(segments[0]).toHaveAttribute("data-grow", "false");
            expect(segments[1]).toHaveAttribute("data-grow", "true");
        });

        it("grows the leading segment when no segment claims the width", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[{ value: "4A7EE8" }, { value: "100", unit: "%" }]}
                />,
            );

            const segments = screen.getAllByTestId("compound-segment");
            expect(segments[0]).toHaveAttribute("data-grow", "true");
            expect(segments[1]).toHaveAttribute("data-grow", "false");
        });

        it("grows exactly one segment even when several claim the width", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { value: "4A7EE8", grow: true },
                        { value: "100", unit: "%", grow: true },
                    ]}
                />,
            );

            const growing = screen
                .getAllByTestId("compound-segment")
                .filter((segment) => segment.getAttribute("data-grow") === "true");
            expect(growing).toHaveLength(1);
        });
    });

    describe("mono", () => {
        it("draws a hex in the monospace face", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { value: "4A7EE8", mono: true, grow: true },
                        { value: "100", unit: "%" },
                    ]}
                />,
            );

            const [hex, percentage] = screen.getAllByTestId("compound-segment-value");
            expect(hex).toHaveAttribute("data-mono", "true");
            expect(hex.getAttribute("style")).toContain("var(--mantine-font-family-monospace)");
            expect(percentage).toHaveAttribute("data-mono", "false");
            expect(percentage.getAttribute("style")).not.toContain("monospace");
        });
    });

    // Contract section 2.4, text expansion: an ellipsised value has to stay
    // reachable, and a title alone is not enough because it cannot be reached
    // by keyboard or by touch.
    describe("a value that has been shortened", () => {
        it("takes the full text from the value itself when the value is already text", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const [hex] = screen.getAllByTestId("compound-segment-value");
            expect(hex).toHaveAttribute("title", "4A7EE8");
            expect(hex).not.toHaveAttribute("aria-hidden");
        });

        it("takes the full text from a number value", () => {
            renderRow(
                <CompoundRow
                    label="Graph size, nodes and edges"
                    segments={[{ value: 20, grow: true }, { value: 34 }]}
                />,
            );

            const [nodes] = screen.getAllByTestId("compound-segment-value");
            expect(nodes).toHaveAttribute("title", "20");
        });

        it("puts the caller's full text in the tooltip", () => {
            renderRow(
                <CompoundRow
                    label="Node identifier and degree"
                    segments={[
                        { value: "graph-2f9a...", fullValue: "graph-2f9a41c6-88b0-4f2e-9a17-3d5c", grow: true },
                        { value: "12" },
                    ]}
                />,
            );

            const [identifier] = screen.getAllByTestId("compound-segment-value");
            expect(identifier).toHaveAttribute("title", "graph-2f9a41c6-88b0-4f2e-9a17-3d5c");
        });

        it("announces the full text instead of the shortened drawing", () => {
            renderRow(
                <CompoundRow
                    label="Node identifier and degree"
                    segments={[
                        { value: "graph-2f9a...", fullValue: "graph-2f9a41c6-88b0-4f2e-9a17-3d5c", grow: true },
                        { value: "12" },
                    ]}
                />,
            );

            // The drawing steps out of the accessibility tree so that the full
            // text is not read out twice, once shortened and once whole.
            const [identifier] = screen.getAllByTestId("compound-segment-value");
            expect(identifier).toHaveAttribute("aria-hidden", "true");

            const box = screen.getByTestId("compound-row-box");
            expect(within(box).getByText("graph-2f9a41c6-88b0-4f2e-9a17-3d5c")).toBeInTheDocument();
        });

        it("puts the full text into the accessible name of an interactive row", () => {
            renderRow(
                <CompoundRow
                    label="Node identifier and degree"
                    segments={[
                        { value: "graph-2f9a...", fullValue: "graph-2f9a41c6-88b0-4f2e-9a17-3d5c", grow: true },
                        { value: "12" },
                    ]}
                    onClick={vi.fn()}
                />,
            );

            const box = screen.getByTestId("compound-row-box");
            expect(box).toHaveAccessibleName(/graph-2f9a41c6-88b0-4f2e-9a17-3d5c/);
            expect(box).not.toHaveAccessibleName(/graph-2f9a\.\.\./);
        });

        it("leaves a drawn value with no text of its own out of the tooltip", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[{ value: swatch(), grow: true }, { value: "100", unit: "%" }]}
                />,
            );

            const [drawn] = screen.getAllByTestId("compound-segment-value");
            expect(drawn).not.toHaveAttribute("title");
        });
    });

    // The read-only form is a WAI-ARIA group, the container role for "these
    // values belong together". The interactive form is the APG Button pattern,
    // https://www.w3.org/WAI/ARIA/apg/patterns/button/.
    describe("the read-only form", () => {
        it("is a group named by the label when the name is nowhere on the page", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const box = screen.getByTestId("compound-row-box");
            expect(box).toHaveAttribute("role", "group");
            expect(box).toHaveAttribute("aria-label", "Node colour and opacity");
            expect(box).not.toHaveAttribute("aria-labelledby");
        });

        it("announces the values as well as the name", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const box = screen.getByRole("group", { name: "Node colour and opacity" });
            expect(box).toHaveTextContent("4A7EE8");
            expect(box).toHaveTextContent("100");
        });

        it("stays out of the tab order, because it holds no value of its own", async () => {
            const user = userEvent.setup();
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            await user.tab();

            expect(screen.getByTestId("compound-row-box")).not.toHaveFocus();
        });

        it("is not a button", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(screen.queryByRole("button")).toBeNull();
        });
    });

    describe("the interactive form", () => {
        it("is a real button, so the platform supplies the keyboard and the focus ring", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={vi.fn()} />);

            const box = screen.getByTestId("compound-row-box");
            expect(box.tagName).toBe("BUTTON");
            expect(box).toHaveAttribute("type", "button");
            expect(box).toHaveAttribute("data-interactive", "true");
        });

        it("takes its accessible name from its content, so the values are announced too", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={vi.fn()} />);

            const box = screen.getByTestId("compound-row-box");
            // An aria-label here would replace the values with the label, which
            // is the defect this row exists not to have.
            expect(box).not.toHaveAttribute("aria-label");
            expect(box).toHaveAccessibleName(/Node colour and opacity/);
            expect(box).toHaveAccessibleName(/4A7EE8/);
            expect(box).toHaveAccessibleName(/100/);
        });

        it("clears the 24px minimum target size in both widths", () => {
            renderRow(
                <CompoundRow
                    label="Label colour and opacity"
                    segments={colourAndOpacity()}
                    width={108}
                    onClick={vi.fn()}
                />,
            );

            const box = screen.getByTestId("compound-row-box");
            expect(box).toHaveStyle({ width: "108px", height: "24px" });
        });

        it("hands the pointer event to the caller", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={onClick} />,
            );

            await user.click(screen.getByTestId("compound-row-box"));

            expect(onClick).toHaveBeenCalledTimes(1);
            const [event] = onClick.mock.calls[0] as [React.MouseEvent];
            expect(event.type).toBe("click");
            expect(typeof event.preventDefault).toBe("function");
        });

        it("reports the modifier keys, so a caller can extend a selection", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={onClick} />,
            );

            await user.keyboard("{Shift>}");
            await user.click(screen.getByTestId("compound-row-box"));
            await user.keyboard("{/Shift}");

            const [event] = onClick.mock.calls[0] as [React.MouseEvent];
            expect(event.shiftKey).toBe(true);
            expect(event.altKey).toBe(false);
        });

        it("lets the caller work out which value was clicked", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={onClick} />,
            );

            const [, opacity] = screen.getAllByTestId("compound-segment-value");
            await user.click(opacity);

            const [event] = onClick.mock.calls[0] as [React.MouseEvent];
            const segment = (event.target as Element).closest("[data-segment-index]");
            expect(segment).toHaveAttribute("data-segment-index", "1");
        });

        it("activates on Enter", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={onClick} />,
            );

            await user.tab();
            expect(screen.getByTestId("compound-row-box")).toHaveFocus();

            await user.keyboard("{Enter}");
            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("activates on Space", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={onClick} />,
            );

            await user.tab();
            await user.keyboard(" ");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("reaches the box before the trailing control", async () => {
            const user = userEvent.setup();
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={colourAndOpacity()}
                    onClick={vi.fn()}
                    trailing={<DoorButton label="Node colour options" onClick={vi.fn()} />}
                />,
            );

            await user.tab();
            expect(screen.getByTestId("compound-row-box")).toHaveFocus();

            await user.tab();
            expect(screen.getByRole("button", { name: "Node colour options" })).toHaveFocus();
        });

        it("forwards focus and blur rather than swallowing them", async () => {
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={colourAndOpacity()}
                    onClick={vi.fn()}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    trailing={<DoorButton label="Node colour options" onClick={vi.fn()} />}
                />,
            );

            await user.tab();
            expect(onFocus).toHaveBeenCalledTimes(1);

            await user.tab();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });
    });

    // Contract section 3, aria-live: a compound whose values arrive from a
    // background run announces itself when the run finishes.
    describe("busy", () => {
        it("is silent about a row that says nothing about being busy", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const box = screen.getByTestId("compound-row-box");
            expect(box).not.toHaveAttribute("aria-live");
            expect(box).not.toHaveAttribute("aria-busy");
        });

        it("becomes a live region as soon as the caller declares the row asynchronous", () => {
            renderRow(
                <CompoundRow label="Graph size, nodes and edges" segments={colourAndOpacity()} busy={false} />,
            );

            // The region has to exist before the values change, or the change
            // is announced by nothing at all.
            const box = screen.getByTestId("compound-row-box");
            expect(box).toHaveAttribute("aria-live", "polite");
            expect(box).toHaveAttribute("aria-atomic", "true");
            expect(box).toHaveAttribute("aria-busy", "false");
        });

        it("holds the announcement back while the work is still going on", () => {
            renderRow(<CompoundRow label="Graph size, nodes and edges" segments={colourAndOpacity()} busy />);

            expect(screen.getByTestId("compound-row-box")).toHaveAttribute("aria-busy", "true");
        });

        it("carries the row's name into the announcement", () => {
            renderRow(<CompoundRow label="Graph size, nodes and edges" segments={colourAndOpacity()} busy={false} />);

            // The announcement is atomic, so the name has to be inside the
            // region rather than only on it.
            const box = screen.getByTestId("compound-row-box");
            expect(within(box).getByText("Graph size, nodes and edges")).toBeInTheDocument();
            expect(box).toHaveAccessibleName("Graph size, nodes and edges");
        });

        it("marks an interactive row busy as well", () => {
            renderRow(
                <CompoundRow
                    label="Graph size, nodes and edges"
                    segments={colourAndOpacity()}
                    busy
                    onClick={vi.fn()}
                />,
            );

            const box = screen.getByTestId("compound-row-box");
            expect(box).toHaveAttribute("aria-busy", "true");
            expect(box).toHaveAttribute("aria-live", "polite");
        });
    });

    describe("the trailing slot", () => {
        it("draws the slot even when the row has nothing to put there", () => {
            renderRow(
                <CompoundRow
                    label="Edge colour and opacity"
                    segments={[
                        { value: "48525C", grow: true },
                        { value: "60", unit: "%" },
                    ]}
                />,
            );

            expect(screen.getByTestId("trailing-slot")).toBeInTheDocument();
            expect(screen.queryByRole("button")).toBeNull();
        });

        it("gives an icon-only settings button an accessible name equal to its title", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={colourAndOpacity()}
                    trailing={
                        <DoorButton
                            label="Show node colour on canvas"
                            icon={<UiGlyph name="eye" />}
                            onClick={vi.fn()}
                        />
                    }
                />,
            );

            const door = screen.getByRole("button", { name: "Show node colour on canvas" });
            expect(door).toHaveAttribute("title", "Show node colour on canvas");
        });

        it("opens the settings on click", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={colourAndOpacity()}
                    trailing={<DoorButton label="Node colour options" onClick={onClick} />}
                />,
            );

            await user.click(screen.getByRole("button", { name: "Node colour options" }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("opens the settings from the keyboard when the box itself is read-only", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={colourAndOpacity()}
                    trailing={<DoorButton label="Node colour options" onClick={onClick} />}
                />,
            );

            await user.tab();
            expect(screen.getByRole("button", { name: "Node colour options" })).toHaveFocus();

            await user.keyboard("{Enter}");
            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("the showLabels preference", () => {
        it("spends no label column by default", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(screen.queryByTestId("compound-row-label")).toBeNull();
        });

        it("moves the row's one name into the 76px column when labels are on", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <CompoundRow label="Node colour" segments={colourAndOpacity()} />
                </PanelLabelsProvider>,
            );

            const word = screen.getByTestId("compound-row-label");
            expect(word).toHaveTextContent("Node colour");
            expect(word.getAttribute("style")).toContain("76px");
            expect(word.style.color).toBe(PANEL_INK.CHROME);
        });

        it("lets the box fill the rest of the band in label mode", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <CompoundRow label="Node colour" segments={colourAndOpacity()} />
                </PanelLabelsProvider>,
            );

            expect(screen.getByTestId("compound-row-box").style.width).toBe("");
        });

        it("does not label the segments individually", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <CompoundRow label="Node colour" segments={colourAndOpacity()} />
                </PanelLabelsProvider>,
            );

            expect(screen.getAllByTestId("compound-row-label")).toHaveLength(1);
        });

        it("names the read-only box from the word on the page rather than from a second copy of it", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <CompoundRow label="Node colour" segments={colourAndOpacity()} />
                </PanelLabelsProvider>,
            );

            // Naming by reference is what keeps the announced name and the drawn
            // word the same string (WCAG 2.2, 2.5.3 Label in Name).
            const box = screen.getByTestId("compound-row-box");
            const word = screen.getByTestId("compound-row-label");
            expect(box).not.toHaveAttribute("aria-label");
            expect(box.getAttribute("aria-labelledby")).toBe(word.id);
            expect(word.id).not.toBe("");
            expect(word).not.toHaveAttribute("aria-hidden");
            expect(box).toHaveAccessibleName("Node colour");
        });

        it("hides the drawn word from assistive technology when the box carries the name itself", () => {
            renderRow(
                <PanelLabelsProvider showLabels>
                    <CompoundRow label="Node colour" segments={colourAndOpacity()} onClick={vi.fn()} />
                </PanelLabelsProvider>,
            );

            // The button's name is its content, which already includes the row's
            // name; leaving the column visible to a screen reader would announce
            // it twice.
            expect(screen.getByTestId("compound-row-label")).toHaveAttribute("aria-hidden", "true");
            expect(screen.getByTestId("compound-row-box")).toHaveAccessibleName(/Node colour/);
        });
    });

    // Contract section 2.3, logical properties: nothing along the inline axis is
    // written physically, so the row lays itself out correctly under dir="rtl".
    describe("right-to-left layout", () => {
        it("pads a segment along the inline axis rather than left and right", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { glyph: swatch(), value: "4A7EE8", grow: true },
                        { value: "100", unit: "%" },
                    ]}
                />,
            );

            const [leading] = screen.getAllByTestId("compound-segment");
            expect(leading.style.paddingInline).toBe("8px");
            expect(leading.style.paddingLeft).toBe("");
            expect(leading.style.paddingRight).toBe("");
        });

        it("sets the unit's gap on the inline start rather than the left", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const unit = screen.getByTestId("compound-segment-unit");
            expect(unit.style.marginInlineStart).toBe("2px");
            expect(unit.style.marginLeft).toBe("");
        });

        it("aligns the box's text to the inline start rather than to the left", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} onClick={vi.fn()} />);

            expect(screen.getByTestId("compound-row-box").style.textAlign).toBe("start");
        });

        it("isolates each value, so a hex is not rearranged by the paragraph around it", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            const [hex] = screen.getAllByTestId("compound-segment-value");
            expect(hex.style.unicodeBidi).toBe("isolate");
        });
    });

    describe("the development warnings", () => {
        it("says nothing about a compound of two with one main value", () => {
            renderRow(<CompoundRow label="Node colour and opacity" segments={colourAndOpacity()} />);

            expect(warn).not.toHaveBeenCalled();
        });

        it("says nothing about a compound of three with one main value", () => {
            renderRow(
                <CompoundRow
                    label="Node colour, red green and blue"
                    segments={[{ value: "74", grow: true }, { value: "126" }, { value: "232" }]}
                />,
            );

            expect(warn).not.toHaveBeenCalled();
        });

        it("warns when one value is dressed as a compound", () => {
            renderRow(<CompoundRow label="Node opacity" segments={[{ value: "100", unit: "%", grow: true }]} />);

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]?.[0])).toContain("was given 1 segment, and it holds two or three");
        });

        it("warns when a fourth value turns the box into a table", () => {
            renderRow(
                <CompoundRow
                    label="Node colour, red green blue and alpha"
                    segments={[{ value: "74", grow: true }, { value: "126" }, { value: "232" }, { value: "255" }]}
                />,
            );

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]?.[0])).toContain("was given 4 segments, and it holds two or three");
        });

        it("warns when no segment is the main value", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[{ value: "4A7EE8" }, { value: "100", unit: "%" }]}
                />,
            );

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]?.[0])).toContain("was given 0 segments that set grow, and exactly one should");
        });

        it("warns when every segment claims to be the main value", () => {
            renderRow(
                <CompoundRow
                    label="Node colour and opacity"
                    segments={[
                        { value: "4A7EE8", grow: true },
                        { value: "100", unit: "%", grow: true },
                    ]}
                />,
            );

            expect(warn).toHaveBeenCalledTimes(1);
            expect(String(warn.mock.calls[0]?.[0])).toContain("was given 2 segments that set grow, and exactly one should");
        });

        it("names the offending row in the warning", () => {
            renderRow(<CompoundRow label="Chonky_Boy colour" segments={[{ value: "4A7EE8" }]} />);

            expect(String(warn.mock.calls[0]?.[0])).toContain("Chonky_Boy colour");
        });

        it("says nothing a stranger cannot act on", () => {
            renderRow(<CompoundRow label="Node opacity" segments={[{ value: "100", unit: "%" }]} />);

            // Contract section 7.2: a console warning is read by a developer who
            // has never heard of this project's internal vocabulary.
            const text = warn.mock.calls.map((call) => String(call[0])).join("\n");
            for (const jargon of ["RT-", "VOCAB", "DECISIONS", "COMPACTION", "the floor", "the door", "chrome ink"]) {
                expect(text).not.toContain(jargon);
            }

            expect(text).toContain("PanelField");
        });

        it("says nothing in production, where the reader cannot act on it", () => {
            const original = process.env.NODE_ENV;
            process.env.NODE_ENV = "production";

            try {
                renderRow(<CompoundRow label="Node opacity" segments={[{ value: "100", unit: "%" }]} />);
                expect(warn).not.toHaveBeenCalled();
            } finally {
                process.env.NODE_ENV = original;
            }
        });
    });
});
