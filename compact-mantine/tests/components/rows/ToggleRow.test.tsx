import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { compactTheme } from "../../../src";
import { AdvancedButton } from "../../../src/components/rows/TrailingSlot";
import { ToggleRow, ToggleRowGroup } from "../../../src/components/rows/ToggleRow";
import { PANEL_GRID, PANEL_INK } from "../../../src/constants/panel";

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside the compact theme with text running right to left.
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
 * A change handler typed the way the component declares it, so the event
 * argument can be read back without casting.
 * @returns A mock of the component's own change handler
 */
function changeSpy(): ReturnType<typeof vi.fn<(checked: boolean, event?: React.SyntheticEvent) => void>> {
    return vi.fn<(checked: boolean, event?: React.SyntheticEvent) => void>();
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("ToggleRow", () => {
    describe("anatomy", () => {
        it("names itself with the label, which is the only word on the row", () => {
            renderRow(<ToggleRow label="Labels" />);

            expect(screen.getByRole("checkbox", { name: "Labels" })).toBeInTheDocument();
        });

        it("puts no words of its own on the row, so there is nothing to translate", () => {
            renderRow(<ToggleRow label="Labels" />);

            // Every word on this row is the caller's. Nothing here reads from
            // the label set, and this assertion is what keeps it that way: an
            // English word added to the component later fails here rather than
            // shipping untranslatable.
            expect(screen.getByTestId("toggle-row")).toHaveTextContent(/^Labels$/u);
        });

        it("packs at the toggle pitch, not the row pitch", () => {
            renderRow(<ToggleRow label="Labels" />);

            expect(screen.getByTestId("toggle-row")).toHaveStyle({
                height: `${String(PANEL_GRID.TOGGLE_PITCH)}px`,
            });
            expect(PANEL_GRID.TOGGLE_PITCH).toBeLessThan(PANEL_GRID.ROW_PITCH);
        });

        it("draws a checkbox by default", () => {
            renderRow(<ToggleRow label="Labels" />);

            expect(screen.getByTestId("toggle-row")).toHaveAttribute("data-control", "checkbox");
            expect(screen.getByRole("checkbox", { name: "Labels" })).toBeInTheDocument();
            expect(screen.queryByRole("switch")).not.toBeInTheDocument();
        });

        it("draws a switch when the boolean is a live mode", () => {
            renderRow(<ToggleRow label="Physics" control="switch" />);

            expect(screen.getByTestId("toggle-row")).toHaveAttribute("data-control", "switch");
            expect(screen.getByRole("switch", { name: "Physics" })).toBeInTheDocument();
            expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
        });

        it("keeps the 24px trailing slot even when it holds nothing", () => {
            renderRow(<ToggleRow label="Labels" />);

            const slot = screen.getByTestId("trailing-slot");
            expect(slot).toBeInTheDocument();
            expect(slot).toHaveStyle({ width: `${String(PANEL_GRID.TRAIL)}px` });
            expect(slot).toBeEmptyDOMElement();
        });

        it("renders a trailing control under its own accessible name", () => {
            renderRow(
                <ToggleRow label="Labels" trailing={<AdvancedButton label="Label options" onClick={vi.fn()} />} />,
            );

            const button = screen.getByRole("button", { name: "Label options" });
            expect(button).toHaveAttribute("title", "Label options");
            expect(screen.getByTestId("trailing-slot")).toContainElement(button);
        });

        it("lets a trailing control state its own changed setting", () => {
            renderRow(
                <ToggleRow
                    label="Labels"
                    trailing={<AdvancedButton label="Label options" changed onClick={vi.fn()} />}
                />,
            );

            // The wording of the changed state belongs to the button and comes
            // from the label set, so the row asserts only that the button's
            // own name still names these settings and that the state is
            // exposed as more than a colour.
            const button = screen.getByRole("button", { name: /Label options/u });
            expect(button).toHaveAttribute("data-changed", "true");
            expect(screen.getByTestId("trailing-slot")).toContainElement(button);
        });
    });

    describe("uncontrolled", () => {
        it("is off when nothing says otherwise", () => {
            renderRow(<ToggleRow label="Labels" />);

            expect(screen.getByRole("checkbox", { name: "Labels" })).not.toBeChecked();
            expect(screen.getByTestId("toggle-row")).toHaveAttribute("data-checked", "false");
        });

        it("starts from defaultChecked", () => {
            renderRow(<ToggleRow label="Labels" defaultChecked />);

            expect(screen.getByRole("checkbox", { name: "Labels" })).toBeChecked();
            expect(screen.getByTestId("toggle-row")).toHaveAttribute("data-checked", "true");
        });

        it("holds its own state and reports every change", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Labels" onChange={onChange} />);

            const box = screen.getByRole("checkbox", { name: "Labels" });
            await user.click(box);

            expect(onChange).toHaveBeenCalledWith(true, expect.objectContaining({ type: "change" }));
            expect(box).toBeChecked();

            await user.click(box);

            expect(onChange).toHaveBeenLastCalledWith(false, expect.objectContaining({ type: "change" }));
            expect(box).not.toBeChecked();
        });

        it("toggles from the label word as well as the box", async () => {
            const user = userEvent.setup();
            renderRow(<ToggleRow label="Transitions" />);

            await user.click(screen.getByText("Transitions"));

            expect(screen.getByRole("checkbox", { name: "Transitions" })).toBeChecked();
        });

        it("toggles a switch too", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Physics" control="switch" defaultChecked onChange={onChange} />);

            await user.click(screen.getByRole("switch", { name: "Physics" }));

            expect(onChange).toHaveBeenCalledWith(false, expect.objectContaining({ type: "change" }));
            expect(screen.getByRole("switch", { name: "Physics" })).not.toBeChecked();
        });
    });

    describe("the change event", () => {
        it("hands the caller the event that caused the change", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Labels" onChange={onChange} />);

            await user.click(screen.getByRole("checkbox", { name: "Labels" }));

            const event = onChange.mock.calls[0]?.[1];
            expect(event?.type).toBe("change");
            expect(event?.nativeEvent).toBeInstanceOf(Event);
        });

        it("carries the modifier keys the pointer was held with", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Labels" onChange={onChange} />);

            await user.keyboard("{Shift>}");
            await user.click(screen.getByRole("checkbox", { name: "Labels" }));
            await user.keyboard("{/Shift}");

            const native = onChange.mock.calls[0]?.[1]?.nativeEvent;
            expect(native).toBeInstanceOf(MouseEvent);
            expect(native instanceof MouseEvent ? native.shiftKey : false).toBe(true);
        });

        it("still works for a handler that only wants the value", async () => {
            const user = userEvent.setup();
            const seen: boolean[] = [];
            renderRow(
                <ToggleRow
                    label="Labels"
                    onChange={(next: boolean): void => {
                        seen.push(next);
                    }}
                />,
            );

            await user.click(screen.getByRole("checkbox", { name: "Labels" }));

            expect(seen).toEqual([true]);
        });

        it("forwards focus and blur instead of swallowing them", async () => {
            const user = userEvent.setup();
            const onFocus = vi.fn();
            const onBlur = vi.fn();
            renderRow(
                <ToggleRowGroup label="Render options">
                    <ToggleRow label="Labels" onFocus={onFocus} onBlur={onBlur} />
                    <ToggleRow label="Arrows" />
                </ToggleRowGroup>,
            );

            await user.tab();

            expect(screen.getByRole("checkbox", { name: "Labels" })).toHaveFocus();
            expect(onFocus).toHaveBeenCalledTimes(1);
            expect(onBlur).not.toHaveBeenCalled();

            await user.tab();

            expect(onBlur).toHaveBeenCalledTimes(1);
        });

        it("forwards focus and blur from the switch as well", async () => {
            const user = userEvent.setup();
            const onFocus = vi.fn();
            renderRow(<ToggleRow label="Physics" control="switch" onFocus={onFocus} />);

            await user.tab();

            expect(onFocus).toHaveBeenCalledTimes(1);
        });
    });

    describe("controlled", () => {
        it("shows the caller's value", () => {
            renderRow(<ToggleRow label="Labels" checked onChange={vi.fn()} />);

            expect(screen.getByRole("checkbox", { name: "Labels" })).toBeChecked();
        });

        it("reports the change but does not move on its own", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Labels" checked={false} onChange={onChange} />);

            const box = screen.getByRole("checkbox", { name: "Labels" });
            await user.click(box);

            expect(onChange).toHaveBeenCalledWith(true, expect.objectContaining({ type: "change" }));
            expect(box).not.toBeChecked();
        });

        it("follows the caller when the caller changes its mind", () => {
            const { rerender } = renderRow(<ToggleRow label="Labels" checked={false} onChange={vi.fn()} />);

            expect(screen.getByRole("checkbox", { name: "Labels" })).not.toBeChecked();

            rerender(
                <MantineProvider theme={compactTheme}>
                    <ToggleRow label="Labels" checked onChange={vi.fn()} />
                </MantineProvider>,
            );

            expect(screen.getByRole("checkbox", { name: "Labels" })).toBeChecked();
        });
    });

    describe("the keyboard route", () => {
        it("is reachable by Tab and toggled by Space", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Labels" onChange={onChange} />);

            await user.tab();

            const box = screen.getByRole("checkbox", { name: "Labels" });
            expect(box).toHaveFocus();

            await user.keyboard(" ");

            expect(onChange).toHaveBeenCalledWith(true, expect.objectContaining({ type: "change" }));
            expect(box).toBeChecked();
        });

        it("toggles a switch from the keyboard as well", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Physics" control="switch" onChange={onChange} />);

            await user.tab();
            await user.keyboard(" ");

            expect(onChange).toHaveBeenCalledWith(true, expect.objectContaining({ type: "change" }));
        });

        it("reaches the trailing control after the toggle", async () => {
            const user = userEvent.setup();
            const onClick = vi.fn();
            renderRow(
                <ToggleRow label="Labels" trailing={<AdvancedButton label="Label options" onClick={onClick} />} />,
            );

            await user.tab();
            await user.tab();

            expect(screen.getByRole("button", { name: "Label options" })).toHaveFocus();

            await user.keyboard("{Enter}");

            expect(onClick).toHaveBeenCalledTimes(1);
        });
    });

    describe("the label word", () => {
        it("gives the word a pointer target as tall as the row", () => {
            renderRow(<ToggleRow label="Labels" />);

            const word = screen.getByText("Labels");
            expect(word.style.height).toBe(`${String(PANEL_GRID.TOGGLE_PITCH)}px`);
            expect(word.style.lineHeight).toBe(`${String(PANEL_GRID.TOGGLE_PITCH)}px`);
            expect(PANEL_GRID.TOGGLE_PITCH).toBeGreaterThanOrEqual(24);
        });

        it("shortens a word too long for the row rather than breaking the pitch", () => {
            renderRow(<ToggleRow label="Beschriftungen der Knotenpunkte" />);

            const word = screen.getByText("Beschriftungen der Knotenpunkte");
            expect(word.style.whiteSpace).toBe("nowrap");
            expect(word.style.overflow).toBe("hidden");
            expect(word.style.textOverflow).toBe("ellipsis");
        });

        it("keeps the whole word reachable when it is shortened", () => {
            renderRow(<ToggleRow label="Beschriftungen der Knotenpunkte" />);

            // The ellipsis is drawn by CSS, so the accessible name is still the
            // whole string; the title repeats it for a sighted pointer user.
            expect(screen.getByRole("checkbox", { name: "Beschriftungen der Knotenpunkte" })).toBeInTheDocument();
            expect(screen.getByTitle("Beschriftungen der Knotenpunkte")).toContainElement(
                screen.getByRole("checkbox", { name: "Beschriftungen der Knotenpunkte" }),
            );
        });

        it("spaces the word from the control on the inline axis, not the left", () => {
            renderRow(<ToggleRow label="Labels" />);

            const style = screen.getByText("Labels").getAttribute("style") ?? "";
            expect(style).toContain("padding-inline-start");
            expect(style).not.toContain("padding-left");
        });

        it("reads the same way round when text runs right to left", async () => {
            const user = userEvent.setup();
            renderRtl(
                <ToggleRowGroup label="Render options">
                    <ToggleRow label="Labels" />
                    <ToggleRow label="Arrows" />
                </ToggleRowGroup>,
            );

            const box = screen.getByRole("checkbox", { name: "Labels" });
            await user.click(box);

            expect(box).toBeChecked();
            const style = screen.getByText("Labels").getAttribute("style") ?? "";
            expect(style).toContain("padding-inline-start");
        });

        it("writes no physical side into any style the row sets", () => {
            renderRow(
                <ToggleRow
                    label="Labels"
                    trailing={<AdvancedButton label="Label options" onClick={vi.fn()} />}
                />,
            );

            // jsdom has no layout, so a mirrored row cannot be measured here.
            // What can be checked is the thing that makes mirroring work: every
            // side this component names is an inline-axis side, so the browser
            // -- rather than the component -- decides which edge that is.
            const styled = [screen.getByTestId("toggle-row"), screen.getByText("Labels")];

            for (const element of styled) {
                const style = element.getAttribute("style") ?? "";
                expect(style).not.toMatch(/(?:padding|margin|border)-(?:left|right)/u);
                expect(style).not.toMatch(/(?:^|;)\s*(?:left|right)\s*:/u);
                expect(style).not.toMatch(/text-align:\s*(?:left|right)/u);
            }
        });
    });

    describe("disabled", () => {
        it("marks the row and the input", () => {
            renderRow(<ToggleRow label="Bridges" disabled />);

            expect(screen.getByTestId("toggle-row")).toHaveAttribute("data-disabled", "true");
            expect(screen.getByRole("checkbox", { name: "Bridges" })).toBeDisabled();
        });

        it("does not report a change", async () => {
            const user = userEvent.setup();
            const onChange = changeSpy();
            renderRow(<ToggleRow label="Bridges" disabled onChange={onChange} />);

            await user.click(screen.getByRole("checkbox", { name: "Bridges" }));

            expect(onChange).not.toHaveBeenCalled();
        });

        it("draws the word in the disabled ink, not the placeholder ink", () => {
            renderRow(<ToggleRow label="Bridges" disabled />);

            expect(screen.getByText("Bridges").style.color).toBe(PANEL_INK.DISABLED);
            expect(PANEL_INK.DISABLED).not.toBe(PANEL_INK.PLACEHOLDER);
        });

        it("draws the word in the primary text colour when it is live", () => {
            renderRow(<ToggleRow label="Labels" />);

            expect(screen.getByText("Labels").style.color).toBe(PANEL_INK.VALUE);
        });

        it("disables the switch form too", () => {
            renderRow(<ToggleRow label="Physics" control="switch" disabled />);

            expect(screen.getByRole("switch", { name: "Physics" })).toBeDisabled();
        });

        it("carries no data-disabled when it is enabled", () => {
            renderRow(<ToggleRow label="Labels" />);

            expect(screen.getByTestId("toggle-row")).not.toHaveAttribute("data-disabled");
        });
    });
});

describe("ToggleRowGroup", () => {
    it("renders its rows in a column", () => {
        renderRow(
            <ToggleRowGroup>
                <ToggleRow label="Labels" />
                <ToggleRow label="Transitions" />
            </ToggleRowGroup>,
        );

        const group = screen.getByRole("group");
        expect(group).toHaveStyle({ flexDirection: "column" });
        expect(screen.getAllByTestId("toggle-row")).toHaveLength(2);
    });

    it("counts the rows it holds", () => {
        renderRow(
            <ToggleRowGroup>
                <ToggleRow label="Labels" />
                <ToggleRow label="Transitions" />
                <ToggleRow label="Arrows" />
            </ToggleRowGroup>,
        );

        expect(screen.getByTestId("toggle-row-group")).toHaveAttribute("data-rows", "3");
    });

    describe("its name", () => {
        it("takes a name of its own when nothing on the screen supplies one", () => {
            renderRow(
                <ToggleRowGroup label="Render options">
                    <ToggleRow label="Labels" />
                    <ToggleRow label="Arrows" />
                </ToggleRowGroup>,
            );

            expect(screen.getByRole("group", { name: "Render options" })).toBeInTheDocument();
        });

        it("prefers the heading already on the screen", () => {
            renderRow(
                <div>
                    <h3 id="render-options">Render options</h3>
                    <ToggleRowGroup labelledBy="render-options" label="Ignored">
                        <ToggleRow label="Labels" />
                        <ToggleRow label="Arrows" />
                    </ToggleRowGroup>
                </div>,
            );

            const group = screen.getByRole("group", { name: "Render options" });
            expect(group).toHaveAttribute("aria-labelledby", "render-options");
            expect(group).not.toHaveAttribute("aria-label");
        });

        it("is still a group when it is not named", () => {
            renderRow(
                <ToggleRowGroup>
                    <ToggleRow label="Labels" />
                    <ToggleRow label="Arrows" />
                </ToggleRowGroup>,
            );

            const group = screen.getByRole("group");
            expect(group).not.toHaveAttribute("aria-label");
            expect(group).not.toHaveAttribute("aria-labelledby");
        });
    });

    it("says nothing when it holds two or more rows", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        renderRow(
            <ToggleRowGroup>
                <ToggleRow label="Labels" />
                <ToggleRow label="Transitions" />
            </ToggleRowGroup>,
        );

        expect(warn).not.toHaveBeenCalled();
    });

    it("warns in development when it holds a lone boolean", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        renderRow(
            <ToggleRowGroup>
                <ToggleRow label="Minimap" />
            </ToggleRowGroup>,
        );

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0]?.[0]).toContain("trailing slot");
    });

    it("warns in words a stranger can act on, with no in-house shorthand", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        renderRow(
            <ToggleRowGroup>
                <ToggleRow label="Minimap" />
            </ToggleRowGroup>,
        );

        const message = warn.mock.calls[0]?.[0] as string;
        expect(message).toContain("ToggleRowGroup");
        expect(message).not.toMatch(/VOCAB|DECISIONS|COMPACTION|RT-\d|Phase \d/u);
    });

    it("warns when it holds nothing at all", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

        renderRow(<ToggleRowGroup>{null}</ToggleRowGroup>);

        expect(warn).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId("toggle-row-group")).toHaveAttribute("data-rows", "0");
    });

    it("renders the lone row anyway, because refusing to draw helps nobody", () => {
        vi.spyOn(console, "warn").mockImplementation(() => undefined);

        renderRow(
            <ToggleRowGroup>
                <ToggleRow label="Minimap" defaultChecked />
            </ToggleRowGroup>,
        );

        expect(screen.getByRole("checkbox", { name: "Minimap" })).toBeChecked();
    });

    it("stays quiet in a production build", () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = "production";

        try {
            renderRow(
                <ToggleRowGroup>
                    <ToggleRow label="Minimap" />
                </ToggleRowGroup>,
            );

            expect(warn).not.toHaveBeenCalled();
        } finally {
            process.env.NODE_ENV = previous;
        }
    });
});
