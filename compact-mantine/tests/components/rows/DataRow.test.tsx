import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { DataRow, DataRowHeader, RankChip } from "../../../src/components/rows/DataRow";
import { AdvancedButton } from "../../../src/components/rows/TrailingSlot";
import { PANEL_INK } from "../../../src/constants/panel";
import { LabelsProvider } from "../../../src/i18n";
import { FieldGlyph } from "../../../src/icons";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside the compact theme and one named locale, for the numbers a row
 * formats.
 * @param ui - The element under test
 * @param locale - The BCP 47 language tag to format numbers for
 * @returns The testing-library render result
 */
function renderInLocale(ui: React.ReactElement, locale: string): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme}>
            <LabelsProvider locale={locale}>{ui}</LabelsProvider>
        </MantineProvider>,
    );
}

describe("DataRow", () => {
    it("draws the user's own string", () => {
        renderRow(<DataRow name="Mr_Whiskers" />);

        expect(screen.getByText("Mr_Whiskers")).toBeInTheDocument();
    });

    it("carries the whole string as a title, because the name ellipsises", () => {
        renderRow(<DataRow name="Mrs_Henderson_from_the_house_on_the_corner" />);

        const label = screen.getByTestId("data-row-name");
        expect(label).toHaveAttribute("title", "Mrs_Henderson_from_the_house_on_the_corner");
        expect(label).toHaveStyle({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
    });

    it("keeps the whole string as its accessible name, ellipsis or not", () => {
        renderRow(<DataRow name="Mrs_Henderson_from_the_house_on_the_corner" value="4" onClick={vi.fn()} />);

        // The ellipsis is a drawing: the element's text is still the whole
        // string, so a title is a convenience for a pointer rather than the
        // only way to the full name.
        expect(
            screen.getByRole("button", { name: "Mrs_Henderson_from_the_house_on_the_corner 4" }),
        ).toBeInTheDocument();
    });

    it("keeps the 28px data pitch and the 4px radius", () => {
        renderRow(<DataRow name="Chonky_Boy" value="3" />);

        const row = screen.getByTestId("data-row");
        expect(row).toHaveStyle({ height: "28px", paddingInline: "8px" });
        expect(row.style.borderRadius).toContain("radius-sm");
    });

    it("spends its padding on the inline axis, so a right-to-left panel insets the same edges", () => {
        renderRow(<DataRow name="Chonky_Boy" value="3" onClick={vi.fn()} />);

        // The row is laid out in logical properties throughout: nothing here
        // names a left or a right, so the whole row mirrors with the text
        // rather than being pinned to one edge of the screen.
        const style = screen.getByTestId("data-row").getAttribute("style") ?? "";
        expect(style).toContain("padding-inline");
        expect(style).not.toContain("padding-left");
        expect(style).not.toContain("padding-right");
        expect(screen.getByRole("button")).toHaveStyle({ textAlign: "start" });
    });

    describe("the value", () => {
        it("draws bare, at the secondary text colour", () => {
            renderRow(<DataRow name="Mr_Whiskers" value="4" />);

            const value = screen.getByTestId("data-row-value");
            expect(value).toHaveTextContent("4");
            expect(value.style.color).toBe(PANEL_INK.CHROME);
            expect(value.style.fontSize).toContain("font-size-sm");
        });

        it("is omitted when there is none", () => {
            renderRow(<DataRow name="Mr_Whiskers" />);

            expect(screen.queryByTestId("data-row-value")).toBeNull();
        });

        it("is omitted when it is null", () => {
            renderRow(<DataRow name="Mr_Whiskers" value={null} />);

            expect(screen.queryByTestId("data-row-value")).toBeNull();
        });

        it("can be a rank chip", () => {
            renderRow(<DataRow name="Mrs_Henderson" value={<RankChip>#6</RankChip>} />);

            expect(screen.getByTestId("rank-chip")).toHaveTextContent("#6");
        });
    });

    describe("the leading icon", () => {
        it("draws in a 16px slot at the secondary colour when the row has a type", () => {
            renderRow(<DataRow name="Betweenness" icon={<FieldGlyph name="attribute" />} value="Number" />);

            const slot = screen.getByTestId("data-row-icon");
            expect(slot).toHaveStyle({ width: "16px", height: "16px" });
            expect(slot.style.color).toBe(PANEL_INK.CHROME);
        });

        it("is decorative, so it never joins the row's accessible name", () => {
            const { container } = renderRow(<DataRow name="Age" icon={<FieldGlyph name="attribute" />} />);

            const glyph = container.querySelector('[data-glyph="attribute"]');
            expect(glyph).toHaveAttribute("aria-hidden", "true");
        });

        it("is omitted when there is none", () => {
            renderRow(<DataRow name="Age" />);

            expect(screen.queryByTestId("data-row-icon")).toBeNull();
        });

        it("is omitted when it is null", () => {
            renderRow(<DataRow name="Age" icon={null} />);

            expect(screen.queryByTestId("data-row-icon")).toBeNull();
        });
    });

    describe("selection", () => {
        it("draws an unselected row on no ground at all", () => {
            renderRow(<DataRow name="Chonky_Boy" value="3" />);

            const row = screen.getByTestId("data-row");
            expect(row).not.toHaveAttribute("data-selected");
            expect(row).toHaveStyle({ background: "transparent" });
        });

        it("draws the selected row on the accent tint", () => {
            renderRow(<DataRow name="Mrs_Henderson" value="4" selected />);

            const row = screen.getByTestId("data-row");
            expect(row).toHaveAttribute("data-selected", "true");
            expect(row.style.background).toContain("primary-color-light");
        });

        it("marks exactly one row of a run as the current one", () => {
            renderRow(
                <>
                    <DataRow name="Mr_Whiskers" value="4" onClick={vi.fn()} />
                    <DataRow name="Mrs_Henderson" value="4" selected onClick={vi.fn()} />
                    <DataRow name="Chonky_Boy" value="3" onClick={vi.fn()} />
                </>,
            );

            const current = screen
                .getAllByRole("button")
                .filter((button) => button.getAttribute("aria-current") !== null);
            expect(current).toHaveLength(1);
            expect(current[0]).toHaveTextContent("Mrs_Henderson");
        });

        it("tells a reader the row is selected, rather than only tinting it", () => {
            renderRow(<DataRow name="Mrs_Henderson" value="4" selected />);

            // The inert row is not a button, so the state has to ride on the
            // body it does render.
            expect(screen.getByTestId("data-row-body")).toHaveAttribute("aria-current", "true");
        });

        it("does not write aria-selected outside a listbox, where it means nothing", () => {
            renderRow(<DataRow name="Mrs_Henderson" value="4" selected onClick={vi.fn()} />);

            expect(screen.getByRole("button")).not.toHaveAttribute("aria-selected");
        });

        describe("inside a listbox", () => {
            it("becomes an option that reports itself as selected", () => {
                renderRow(
                    <div role="listbox" aria-label="Cats" aria-multiselectable>
                        <DataRow name="Mr_Whiskers" value="4" role="option" onClick={vi.fn()} />
                        <DataRow name="Mrs_Henderson" value="4" role="option" selected onClick={vi.fn()} />
                    </div>,
                );

                const options = screen.getAllByRole("option");
                expect(options).toHaveLength(2);
                expect(options[0]).toHaveAttribute("aria-selected", "false");
                expect(options[1]).toHaveAttribute("aria-selected", "true");
            });

            it("drops aria-current, which says something different", () => {
                renderRow(
                    <div role="listbox" aria-label="Cats">
                        <DataRow name="Mrs_Henderson" value="4" role="option" selected onClick={vi.fn()} />
                    </div>,
                );

                expect(screen.getByRole("option")).not.toHaveAttribute("aria-current");
            });

            it("is an option even when the row itself is not clickable", () => {
                renderRow(
                    <div role="listbox" aria-label="Cats">
                        <DataRow name="Mr_Whiskers" value="4" role="option" selected />
                    </div>,
                );

                expect(screen.getByRole("option")).toHaveAttribute("aria-selected", "true");
            });
        });
    });

    describe("when it is interactive", () => {
        it("is a real button", () => {
            renderRow(<DataRow name="Mr_Whiskers" value="4" onClick={vi.fn()} />);

            const button = screen.getByRole("button", { name: /Mr_Whiskers/ });
            expect(button.tagName).toBe("BUTTON");
            expect(button).toHaveAttribute("type", "button");
        });

        it("reports the selected row as the current one", () => {
            renderRow(<DataRow name="Mrs_Henderson" value="4" selected onClick={vi.fn()} />);

            expect(screen.getByRole("button", { name: /Mrs_Henderson/ })).toHaveAttribute("aria-current", "true");
        });

        it("does not claim to be current when it is not selected", () => {
            renderRow(<DataRow name="Mrs_Henderson" value="4" onClick={vi.fn()} />);

            expect(screen.getByRole("button", { name: /Mrs_Henderson/ })).not.toHaveAttribute("aria-current");
        });

        it("selects on click", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.click(screen.getByRole("button", { name: /Chonky_Boy/ }));

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("selects from the keyboard with Enter", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.tab();
            expect(screen.getByRole("button", { name: /Chonky_Boy/ })).toHaveFocus();

            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("selects from the keyboard with Space", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onClick).toHaveBeenCalledTimes(1);
        });

        it("lights up under the pointer", async () => {
            const user = userEvent.setup();
            renderRow(<DataRow name="Mr_Whiskers" value="4" onClick={vi.fn()} />);

            const row = screen.getByTestId("data-row");
            expect(row).toHaveStyle({ background: "transparent" });

            await user.hover(row);
            expect(row.style.background).toBe(PANEL_INK.SURFACE);

            await user.unhover(row);
            expect(row).toHaveStyle({ background: "transparent" });
        });

        it("keeps the selected ground while hovered, because selection outranks hover", async () => {
            const user = userEvent.setup();
            renderRow(<DataRow name="Mrs_Henderson" value="4" selected onClick={vi.fn()} />);

            const row = screen.getByTestId("data-row");
            await user.hover(row);

            expect(row.style.background).toContain("primary-color-light");
        });
    });

    describe("the event a selection needs", () => {
        it("hands the click itself to the consumer, not a bare call", async () => {
            // React clears an event's currentTarget once the handler returns,
            // so what the consumer was given is recorded while it still holds
            // it rather than read back from the spy afterwards.
            const activations: { canPreventDefault: boolean; target: EventTarget | null }[] = [];
            const user = userEvent.setup();
            renderRow(
                <DataRow
                    name="Chonky_Boy"
                    value="3"
                    onClick={(event): void => {
                        activations.push({
                            canPreventDefault: typeof event.preventDefault === "function",
                            target: event.currentTarget,
                        });
                    }}
                />,
            );

            await user.click(screen.getByRole("button"));

            expect(activations).toHaveLength(1);
            expect(activations[0].canPreventDefault).toBe(true);
            expect(activations[0].target).toBe(screen.getByRole("button"));
        });

        it("carries Shift, so a consumer can extend a range", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.keyboard("{Shift>}");
            await user.click(screen.getByRole("button"));
            await user.keyboard("{/Shift}");

            expect(onClick.mock.calls[0][0].shiftKey).toBe(true);
        });

        it("carries Control and Command, so a consumer can toggle one row", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.keyboard("{Control>}");
            await user.click(screen.getByRole("button"));
            await user.keyboard("{/Control}");

            await user.keyboard("{Meta>}");
            await user.click(screen.getByRole("button"));
            await user.keyboard("{/Meta}");

            expect(onClick.mock.calls[0][0].ctrlKey).toBe(true);
            expect(onClick.mock.calls[1][0].metaKey).toBe(true);
        });

        it("says a click came from a pointer", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.click(screen.getByRole("button"));

            expect(onClick.mock.calls[0][1]).toEqual({ source: "pointer" });
        });

        it("says an Enter came from the keyboard, though the browser calls it a click", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.tab();
            await user.keyboard("{Enter}");

            expect(onClick.mock.calls[0][1]).toEqual({ source: "keyboard" });
        });

        it("says a Space came from the keyboard too", async () => {
            const onClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" value="3" onClick={onClick} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onClick.mock.calls[0][1]).toEqual({ source: "keyboard" });
        });

        it("reports a double click, with the clicks that made it", async () => {
            const onClick = vi.fn();
            const onDoubleClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Force directed" onClick={onClick} onDoubleClick={onDoubleClick} />);

            await user.dblClick(screen.getByRole("button"));

            expect(onDoubleClick).toHaveBeenCalledTimes(1);
            expect(onClick).toHaveBeenCalledTimes(2);
        });

        it("reports a double click on an inert row as well", async () => {
            const onDoubleClick = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Force directed" onDoubleClick={onDoubleClick} />);

            await user.dblClick(screen.getByTestId("data-row"));

            expect(onDoubleClick).toHaveBeenCalledTimes(1);
        });

        it("reports a right click anywhere along the row", async () => {
            const onContextMenu = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <DataRow
                    name="Force directed"
                    onClick={vi.fn()}
                    onContextMenu={onContextMenu}
                    trailing={<AdvancedButton label="Force directed options" onClick={vi.fn()} />}
                />,
            );

            await user.pointer({ keys: "[MouseRight]", target: screen.getByTestId("data-row") });
            await user.pointer({ keys: "[MouseRight]", target: screen.getByRole("button", { name: /options/ }) });

            expect(onContextMenu).toHaveBeenCalledTimes(2);
        });

        it("catches the menu the keyboard raises on the focused body", () => {
            const onContextMenu = vi.fn();
            renderRow(<DataRow name="Force directed" onClick={vi.fn()} onContextMenu={onContextMenu} />);

            // The context-menu key and Shift+F10 fire on whatever holds focus,
            // which is the row's own button; the handler sits on the row so it
            // catches the event on its way up.
            fireEvent.contextMenu(screen.getByRole("button"));

            expect(onContextMenu).toHaveBeenCalledTimes(1);
        });

        it("forwards focus and blur rather than swallowing them", async () => {
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" onClick={vi.fn()} onFocus={onFocus} onBlur={onBlur} />);

            await user.tab();
            expect(onFocus).toHaveBeenCalledTimes(1);

            await user.tab();
            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("forwards focus and blur from an inert row that was made focusable", async () => {
            const onFocus = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRow name="Chonky_Boy" tabIndex={0} onFocus={onFocus} />);

            await user.tab();

            expect(screen.getByTestId("data-row-body")).toHaveFocus();
            expect(onFocus).toHaveBeenCalledTimes(1);
        });

        it("takes itself out of the tab order when the list manages focus", async () => {
            const user = userEvent.setup();
            renderRow(
                <div role="listbox" aria-label="Cats">
                    <DataRow name="Mr_Whiskers" role="option" tabIndex={-1} onClick={vi.fn()} />
                    <DataRow name="Mrs_Henderson" role="option" tabIndex={0} selected onClick={vi.fn()} />
                </div>,
            );

            await user.tab();

            // A roving tab stop: Tab enters the list once and the arrow keys,
            // which belong to the listbox the consumer wrapped these in, move
            // between the rows.
            expect(screen.getByRole("option", { name: /Mrs_Henderson/ })).toHaveFocus();
        });
    });

    describe("when it is inert", () => {
        it("is not a button and takes no focus", async () => {
            const user = userEvent.setup();
            renderRow(<DataRow name="Mr_Whiskers" value="4" />);

            expect(screen.queryByRole("button")).toBeNull();
            expect(screen.getByTestId("data-row-body")).toBeInTheDocument();

            await user.tab();
            expect(document.body).toHaveFocus();
        });

        it("does not light up under the pointer", async () => {
            const user = userEvent.setup();
            renderRow(<DataRow name="Mr_Whiskers" value="4" />);

            const row = screen.getByTestId("data-row");
            await user.hover(row);

            expect(row).toHaveStyle({ background: "transparent" });
        });
    });

    describe("the trailing slot", () => {
        it("is drawn only when something is put in it", () => {
            renderRow(<DataRow name="Force directed" />);

            expect(screen.queryByTestId("trailing-slot")).toBeNull();
        });

        it("is not drawn for a null trailing", () => {
            renderRow(<DataRow name="Force directed" trailing={null} />);

            expect(screen.queryByTestId("trailing-slot")).toBeNull();
        });

        it("is not drawn for a conditional trailing button that did not render", () => {
            const showAdvanced = false;

            renderRow(
                <DataRow
                    name="Force directed"
                    trailing={showAdvanced && <AdvancedButton label="Force directed options" onClick={vi.fn()} />}
                />,
            );

            expect(screen.queryByTestId("trailing-slot")).toBeNull();
        });

        it("holds the row's advanced settings button at its full 24px", () => {
            renderRow(
                <DataRow
                    name="Force directed"
                    trailing={<AdvancedButton label="Force directed options" onClick={vi.fn()} />}
                />,
            );

            expect(screen.getByTestId("trailing-slot")).toHaveStyle({ width: "24px" });
        });

        it("names the icon-only button for a reader", () => {
            renderRow(
                <DataRow
                    name="Hierarchical"
                    trailing={<AdvancedButton label="Hierarchical options" onClick={vi.fn()} />}
                />,
            );

            const advanced = screen.getByRole("button", { name: "Hierarchical options" });
            expect(advanced).toHaveAttribute("title", "Hierarchical options");
        });

        it("keeps the slot out of the row's own button, so it is separately reachable", async () => {
            const select = vi.fn();
            const open = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <DataRow
                    name="Radial"
                    onClick={select}
                    trailing={<AdvancedButton label="Radial options" onClick={open} />}
                />,
            );

            await user.click(screen.getByRole("button", { name: "Radial options" }));

            expect(open).toHaveBeenCalledTimes(1);
            expect(select).not.toHaveBeenCalled();
        });
    });
});

describe("DataRowHeader", () => {
    it("names the column", () => {
        renderRow(<DataRowHeader label="Most connected" unit="links" />);

        expect(screen.getByTestId("data-row-header-label")).toHaveTextContent("Most connected");
    });

    it("carries the unit word the rows below must not repeat", () => {
        renderRow(<DataRowHeader label="Most connected" unit="links" />);

        expect(screen.getByTestId("data-row-header-unit")).toHaveTextContent("links");
    });

    it("omits the unit when the rows carry words rather than numbers", () => {
        renderRow(<DataRowHeader label="Attributes" />);

        expect(screen.queryByTestId("data-row-header-unit")).toBeNull();
    });

    it("is a 20px caption, both halves at the secondary colour", () => {
        renderRow(<DataRowHeader label="Highest betweenness" unit="score" />);

        const header = screen.getByTestId("data-row-header");
        expect(header).toHaveStyle({ height: "20px", paddingInline: "8px" });
        expect(header.style.color).toBe(PANEL_INK.CHROME);
        expect(header.style.fontSize).toContain("font-size-sm");
    });

    it("spends its padding on the inline axis, like the rows it heads", () => {
        renderRow(<DataRowHeader label="Most connected" unit="links" />);

        const style = screen.getByTestId("data-row-header").getAttribute("style") ?? "";
        expect(style).toContain("padding-inline");
        expect(style).not.toContain("padding-left");
    });

    describe("when nothing sorts it", () => {
        it("is a plain caption: no button, and no table furniture", () => {
            renderRow(<DataRowHeader label="Attributes" />);

            expect(screen.queryByRole("button")).toBeNull();
            expect(screen.getByTestId("data-row-header")).not.toHaveAttribute("role");
            expect(screen.getByTestId("data-row-header")).not.toHaveAttribute("aria-sort");
        });

        it("draws no direction arrow", () => {
            renderRow(<DataRowHeader label="Attributes" />);

            expect(screen.queryByTestId("data-row-header-sort-glyph")).toBeNull();
        });

        it("still reports a column somebody else sorted", () => {
            renderRow(<DataRowHeader label="Most connected" unit="links" defaultSortDirection="descending" />);

            const header = screen.getByTestId("data-row-header");
            expect(header).toHaveAttribute("role", "columnheader");
            expect(header).toHaveAttribute("aria-sort", "descending");
            expect(screen.queryByRole("button")).toBeNull();
        });
    });

    describe("when it sorts", () => {
        it("becomes a button named by the column it heads", () => {
            renderRow(<DataRowHeader label="Most connected" unit="links" onSortChange={vi.fn()} />);

            const button = screen.getByRole("button", { name: "Most connected links" });
            expect(button.tagName).toBe("BUTTON");
            expect(button).toHaveAttribute("type", "button");
        });

        it("reports the sort state on the column header, where aria-sort is defined", () => {
            renderRow(<DataRowHeader label="Most connected" onSortChange={vi.fn()} />);

            const header = screen.getByTestId("data-row-header");
            expect(header).toHaveAttribute("role", "columnheader");
            expect(header).toHaveAttribute("aria-sort", "none");
        });

        it("cycles to ascending first, and hands over the event that asked", async () => {
            const onSortChange = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRowHeader label="Most connected" onSortChange={onSortChange} />);

            await user.click(screen.getByRole("button"));

            expect(onSortChange).toHaveBeenCalledTimes(1);
            const [direction, event] = onSortChange.mock.calls[0];
            expect(direction).toBe("ascending");
            expect(typeof event.preventDefault).toBe("function");
            expect(screen.getByTestId("data-row-header")).toHaveAttribute("aria-sort", "ascending");
        });

        it("cycles ascending and descending, and never back to unsorted", async () => {
            const onSortChange = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRowHeader label="Most connected" onSortChange={onSortChange} />);

            const button = screen.getByRole("button");
            await user.click(button);
            await user.click(button);
            await user.click(button);

            expect(onSortChange.mock.calls.map(([direction]) => direction)).toEqual([
                "ascending",
                "descending",
                "ascending",
            ]);
        });

        it("carries Shift, so a consumer can sort by several columns", async () => {
            const onSortChange = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRowHeader label="Most connected" onSortChange={onSortChange} />);

            await user.keyboard("{Shift>}");
            await user.click(screen.getByRole("button"));
            await user.keyboard("{/Shift}");

            expect(onSortChange.mock.calls[0][1].shiftKey).toBe(true);
        });

        it("sorts from the keyboard", async () => {
            const onSortChange = vi.fn();
            const user = userEvent.setup();
            renderRow(<DataRowHeader label="Most connected" onSortChange={onSortChange} />);

            await user.tab();
            expect(screen.getByRole("button")).toHaveFocus();

            await user.keyboard("{Enter}");
            await user.keyboard(" ");

            expect(onSortChange.mock.calls.map(([direction]) => direction)).toEqual(["ascending", "descending"]);
        });

        it("follows the direction it is given, when the consumer holds the state", async () => {
            const onSortChange = vi.fn();
            const user = userEvent.setup();
            renderRow(
                <DataRowHeader label="Most connected" sortDirection="descending" onSortChange={onSortChange} />,
            );

            expect(screen.getByTestId("data-row-header")).toHaveAttribute("aria-sort", "descending");

            await user.click(screen.getByRole("button"));

            // Controlled: the caption asks for the next direction and leaves
            // the state alone until the consumer sends it back.
            expect(onSortChange).toHaveBeenCalledWith("ascending", expect.anything());
            expect(screen.getByTestId("data-row-header")).toHaveAttribute("aria-sort", "descending");
        });

        it("draws the sorted column's name in the primary text colour", () => {
            renderRow(<DataRowHeader label="Most connected" sortDirection="ascending" onSortChange={vi.fn()} />);

            expect(screen.getByTestId("data-row-header-label").style.color).toBe(PANEL_INK.VALUE);
        });

        it("leaves an unsorted column's name at the secondary colour of the caption", () => {
            renderRow(<DataRowHeader label="Most connected" onSortChange={vi.fn()} />);

            expect(screen.getByTestId("data-row-header-label").style.color).toBe("");
        });

        it("turns the one chevron over rather than keeping a second drawing", () => {
            const { rerender } = renderRow(
                <DataRowHeader label="Most connected" sortDirection="descending" onSortChange={vi.fn()} />,
            );

            const glyph = screen.getByTestId("data-row-header-sort-glyph");
            expect(glyph).toHaveAttribute("data-direction", "descending");
            expect(glyph.style.transform).toBe("");

            rerender(
                <MantineProvider theme={compactTheme}>
                    <DataRowHeader label="Most connected" sortDirection="ascending" onSortChange={vi.fn()} />
                </MantineProvider>,
            );

            const turned = screen.getByTestId("data-row-header-sort-glyph");
            expect(turned).toHaveAttribute("data-direction", "ascending");
            expect(turned.style.transform).toBe("rotate(180deg)");
        });

        it("draws no arrow while the column is unsorted", () => {
            renderRow(<DataRowHeader label="Most connected" onSortChange={vi.fn()} />);

            expect(screen.queryByTestId("data-row-header-sort-glyph")).toBeNull();
        });
    });

    describe("the multi-column sort position", () => {
        it("draws where this column comes in the sort", () => {
            renderRow(
                <DataRowHeader
                    label="Most connected"
                    sortDirection="descending"
                    sortPriority={2}
                    onSortChange={vi.fn()}
                />,
            );

            expect(screen.getByTestId("rank-chip")).toHaveTextContent("2");
        });

        it("is redundant to a reader, so it is hidden from them", () => {
            renderRow(
                <DataRowHeader
                    label="Most connected"
                    sortDirection="descending"
                    sortPriority={2}
                    onSortChange={vi.fn()}
                />,
            );

            // Every sorted column announces its own direction through
            // aria-sort, so the position chip is a drawing for the eye only.
            expect(screen.getByTestId("rank-chip").closest("[aria-hidden='true']")).not.toBeNull();
        });

        it("is not drawn on a column nothing is sorted by", () => {
            renderRow(<DataRowHeader label="Most connected" sortPriority={2} onSortChange={vi.fn()} />);

            expect(screen.queryByTestId("rank-chip")).toBeNull();
        });

        it("is written in the digits of the active locale", () => {
            renderInLocale(
                <DataRowHeader
                    label="Most connected"
                    sortDirection="descending"
                    sortPriority={2}
                    onSortChange={vi.fn()}
                />,
                "ar-EG",
            );

            expect(screen.getByTestId("rank-chip")).toHaveTextContent("٢");
        });
    });
});

describe("RankChip", () => {
    it("draws the short spelling of a rank", () => {
        renderRow(<RankChip>#6</RankChip>);

        expect(screen.getByTestId("rank-chip")).toHaveTextContent("#6");
    });

    it("is Mantine's Badge, sized by the compact theme rather than by hand", () => {
        renderRow(<RankChip>#1</RankChip>);

        const chip = screen.getByTestId("rank-chip");
        expect(chip).toHaveClass("mantine-Badge-root");
        // The 14px height, 9px face and 4px padding this chip used to retype
        // now arrive as the theme's own Badge variables.
        expect(chip.style.getPropertyValue("--badge-height")).toBe("14px");
        expect(chip.style.getPropertyValue("--badge-fz")).toBe("9px");
        expect(chip.style.getPropertyValue("--badge-padding-x")).toBe("4px");
    });

    it("is a span, so it is valid inside a row's button and inside a caption", () => {
        renderRow(<RankChip>#1</RankChip>);

        expect(screen.getByTestId("rank-chip").tagName).toBe("SPAN");
    });

    it("undoes the status-tag typography a badge would otherwise shout in", () => {
        renderRow(<RankChip>#318</RankChip>);

        const chip = screen.getByTestId("rank-chip");
        expect(chip).toHaveStyle({ fontWeight: "500", textTransform: "none", letterSpacing: "normal" });
    });

    it("is drawn on the raised surface, labelled in the primary text colour", () => {
        renderRow(<RankChip>#1</RankChip>);

        const chip = screen.getByTestId("rank-chip");
        expect(chip.style.background).toBe(PANEL_INK.RAISED);
        // The secondary colour measures 4.43:1 on this ground, under the 4.5:1
        // WCAG AA asks of text; the primary colour measures 7.33:1.
        expect(chip.style.color).toBe(PANEL_INK.VALUE);
    });
});
