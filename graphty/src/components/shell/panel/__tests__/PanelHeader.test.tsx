import { PANEL_INK } from "@graphty/compact-mantine";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { keyChipFor } from "../../bindings";
import { KEEP_OPEN_LABEL, PANEL_HEADER_HEIGHT } from "../../constants";
import type { PanelOverflowItem } from "../../types";
import { CLOSE_PANEL_LABEL, MORE_LABEL, PanelHeader } from "../PanelHeader";

const glyph = <svg data-testid="glyph" />;

/** The 3:1 WCAG 2.2 (1.4.11) minimum for the boundary that distinguishes a state. */
const STATE_BOUNDARY_MIN_CONTRAST = 3;

/**
 * Resolves a `PANEL_INK` token to the `rgb(...)` this browser paints for it.
 *
 * The tokens are CSS variables behind `light-dark()`, so the only honest way to read one
 * is to let the browser resolve it. These boards run in real Chromium, so they can.
 * @param token - the token to resolve.
 * @returns the resolved colour, as the computed-style string.
 */
function resolveColor(token: string): string {
    const probe = document.createElement("div");

    probe.style.color = token;
    document.body.append(probe);

    const resolved = window.getComputedStyle(probe).color;

    probe.remove();

    return resolved;
}

/** WCAG 2.x relative luminance of an `rgb(...)` / `rgba(...)` string. */
function relativeLuminance(color: string): number {
    const [red, green, blue] = (color.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
    const channel = (value: number): number => {
        const srgb = value / 255;

        return srgb <= 0.039_28 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
    };

    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

/** WCAG 2.x contrast ratio between two opaque colours. */
function contrastRatio(first: string, second: string): number {
    const one = relativeLuminance(first);
    const two = relativeLuminance(second);

    return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

/**
 * Composites a possibly translucent colour over an opaque ground.
 *
 * Mantine's `light` ground is an `rgba()` at 15% alpha, and a contrast ratio may only be
 * taken between two OPAQUE colours: reading the tint's own channels would report the
 * contrast of a colour nothing paints.
 * @param color - the colour to composite, opaque or not.
 * @param ground - the opaque colour behind it.
 * @returns the colour the reader actually sees.
 */
function over(color: string, ground: string): string {
    const parts = (color.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(Number);
    const [red, green, blue] = parts;
    const alpha = parts.length > 3 ? parts[3] : 1;
    const [groundRed, groundGreen, groundBlue] = (ground.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
    const mix = (channel: number, behind: number): number => Math.round(channel * alpha + behind * (1 - alpha));

    return `rgb(${mix(red, groundRed)}, ${mix(green, groundGreen)}, ${mix(blue, groundBlue)})`;
}

function expectedCloseTooltip() {
    const chip = keyChipFor("togglePanel");

    return chip === null ? CLOSE_PANEL_LABEL : `${CLOSE_PANEL_LABEL} (${chip})`;
}

describe("PanelHeader", () => {
    describe("geometry", () => {
        it("is exactly 36 tall", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ height: `${PANEL_HEADER_HEIGHT}px` });
        });

        it("takes its 8px trailing pad when no More is drawn", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingRight: "8px" });
        });

        it("takes its 12px trailing pad when a More is drawn", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                    onClose={vi.fn()}
                />,
            );

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingRight: "12px" });
        });

        it("draws its 16px leading pad on every board", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header")).toHaveStyle({ paddingLeft: "16px" });
        });
    });

    describe("the leading cluster", () => {
        it("draws the activity glyph and hides it from the accessibility tree", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByTestId("panel-header-glyph")).toHaveAttribute("aria-hidden", "true");
        });

        it("draws the activity name as the panel's heading", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByRole("heading", { name: "Explore" })).toBeInTheDocument();
        });

        it("carries no panel-level info circle, ever", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                    onClose={vi.fn()}
                />,
            );

            expect(screen.queryByTestId("info-circle")).not.toBeInTheDocument();
        });
    });

    describe("the trailing cluster", () => {
        it("titles the close control with the verb and the chip from the one table", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            const close = screen.getByRole("button", { name: CLOSE_PANEL_LABEL });
            expect(close).toBeInTheDocument();
            expect(expectedCloseTooltip()).toContain(CLOSE_PANEL_LABEL);
        });

        it("names the close control without its key chip", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.getByRole("button", { name: CLOSE_PANEL_LABEL })).toHaveAccessibleName(CLOSE_PANEL_LABEL);
        });

        it("draws no More when the panel has no overflow rows", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.queryByRole("button", { name: MORE_LABEL })).not.toBeInTheDocument();
        });

        it("draws no More when the overflow list is empty", () => {
            render(<PanelHeader title="Explore" glyph={glyph} overflowItems={[]} onClose={vi.fn()} />);

            expect(screen.queryByRole("button", { name: MORE_LABEL })).not.toBeInTheDocument();
        });
    });

    describe("the Keep open latch", () => {
        it("draws the latch left of More and the X, where a region supplies it", () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "a", label: "Expand all sections", onSelect: vi.fn() }]}
                    keptOpen={false}
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            const names = Array.from(screen.getByTestId("panel-header").querySelectorAll("button")).map((button) =>
                button.getAttribute("aria-label"),
            );

            expect(names).toEqual([KEEP_OPEN_LABEL, MORE_LABEL, CLOSE_PANEL_LABEL]);
        });

        it("draws no latch where the region supplies none", () => {
            render(<PanelHeader title="Explore" glyph={glyph} onClose={vi.fn()} />);

            expect(screen.queryByRole("button", { name: KEEP_OPEN_LABEL })).not.toBeInTheDocument();
        });

        it("reports its state as a pressed toggle rather than renaming itself", () => {
            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            const latch = screen.getByRole("button", { name: KEEP_OPEN_LABEL });

            expect(latch).toHaveAttribute("aria-pressed", "true");
            expect(latch).toHaveAccessibleName(KEEP_OPEN_LABEL);
        });

        it("asks for the state it does not hold", () => {
            const onKeepOpenChange = vi.fn();

            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen={false}
                    onKeepOpenChange={onKeepOpenChange}
                    onClose={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: KEEP_OPEN_LABEL }));

            expect(onKeepOpenChange).toHaveBeenCalledWith(true);
        });

        it("draws the latched state with a ground of its own, so the state is not ink alone", () => {
            /* 2026-09-13: the two states used to differ by one step of the grey ramp and
               nothing else -- no ground, no border, same drawing -- which the product owner
               could not read. Latched now takes the shell's own pressed treatment, Mantine's
               `light` variant: a tinted ground plus an accent glyph, exactly as the top bar
               draws an active control. The word and the drawing stay put. */
            const { rerender } = render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen={false}
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            const unlatched = screen.getByRole("button", { name: KEEP_OPEN_LABEL });
            const unlatchedGround = window.getComputedStyle(unlatched).backgroundColor;

            expect(unlatched).toHaveAttribute("data-variant", "subtle");
            expect(unlatchedGround).toBe("rgba(0, 0, 0, 0)");

            rerender(
                <PanelHeader title="Explore" glyph={glyph} keptOpen onKeepOpenChange={vi.fn()} onClose={vi.fn()} />,
            );

            const latched = screen.getByRole("button", { name: KEEP_OPEN_LABEL });

            expect(latched).toHaveAttribute("data-variant", "light");
            expect(window.getComputedStyle(latched).backgroundColor).not.toBe(unlatchedGround);
            expect(latched).toHaveAccessibleName(KEEP_OPEN_LABEL);
            expect(latched.querySelector('[data-glyph="keepOpen"]')).not.toBeNull();
        });

        it("draws a latched boundary that meets WCAG 1.4.11's 3:1 on both of its sides", () => {
            /* 2026-09-13, second pass: the tinted ground measured 1.21:1 against this
               header's ground, where 1.4.11 asks 3:1 of the visual boundary that
               distinguishes a control's state, and the file's comment claimed the state
               "does not rest on colour alone" while the ground was the only thing drawing
               it. The ring is the boundary now, and this board is the measurement rather
               than the claim: it is taken against BOTH colours the ring sits between --
               the header ground outside it and the tint it encloses -- which is what
               ruled out the filled accent, at 2.59:1 on the inner side. */
            render(
                <PanelHeader title="Explore" glyph={glyph} keptOpen onKeepOpenChange={vi.fn()} onClose={vi.fn()} />,
            );

            const latch = screen.getByTestId("panel-header-keep-open");
            const ring = window.getComputedStyle(latch).boxShadow;

            expect(ring).toContain("inset");

            const ringColor = /rgba?\([^)]*\)/.exec(ring)?.[0];

            expect(ringColor).toBeDefined();

            const ground = resolveColor(PANEL_INK.PANEL);
            const tint = over(window.getComputedStyle(latch).backgroundColor, ground);

            expect(contrastRatio(ringColor as string, ground)).toBeGreaterThanOrEqual(STATE_BOUNDARY_MIN_CONTRAST);
            expect(contrastRatio(ringColor as string, tint)).toBeGreaterThanOrEqual(STATE_BOUNDARY_MIN_CONTRAST);
        });

        it("draws no ring at all when it is not latched, so the ring is the state and not the control", () => {
            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen={false}
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            expect(window.getComputedStyle(screen.getByTestId("panel-header-keep-open")).boxShadow).not.toContain(
                "inset",
            );
        });

        it("rests in the register's own secondary ink, which the inspector's latch also rests in", () => {
            // The two headers stand side by side and their latches are one control drawn
            // twice: the inspector's used Mantine's `color="gray"` until 2026-09-13, which
            // resolved to a different grey from this one.
            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen={false}
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            expect(window.getComputedStyle(screen.getByTestId("panel-header-keep-open")).color).toBe(
                resolveColor(PANEL_INK.CHROME),
            );
        });

        it("is not the comparison pin: it draws the padlock, never the pushpin", () => {
            render(
                <PanelHeader
                    title="Explore"
                    glyph={glyph}
                    keptOpen={false}
                    onKeepOpenChange={vi.fn()}
                    onClose={vi.fn()}
                />,
            );

            const latch = screen.getByRole("button", { name: KEEP_OPEN_LABEL });

            expect(latch.querySelector('[data-glyph="keepOpen"]')).not.toBeNull();
            expect(latch.querySelector('[data-glyph="pin"]')).toBeNull();
        });
    });

    describe("the overflow rows", () => {
        it("renders the rows it is given, in order", async () => {
            const rows: PanelOverflowItem[] = [
                { id: "one", label: "Expand all sections", onSelect: vi.fn() },
                { id: "two", label: "Collapse all sections", onSelect: vi.fn() },
            ];

            render(<PanelHeader title="Data" glyph={glyph} overflowItems={rows} onClose={vi.fn()} />);

            fireEvent.click(screen.getByRole("button", { name: MORE_LABEL }));

            const items = await screen.findAllByRole("menuitem");
            expect(items.map((item) => item.textContent)).toEqual(["Expand all sections", "Collapse all sections"]);
        });

        it("states a disabled row's reason in its title", async () => {
            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[
                        {
                            id: "close",
                            label: "Close dataset. Starts a new session",
                            disabled: true,
                            disabledReason: "Load data first",
                            onSelect: vi.fn(),
                        },
                    ]}
                    onClose={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: MORE_LABEL }));

            const row = await screen.findByRole("menuitem", { name: "Close dataset. Starts a new session" });
            expect(row).toHaveAttribute("title", "Load data first");
        });

        it("runs the row it is asked to run", async () => {
            const onSelect = vi.fn();

            render(
                <PanelHeader
                    title="Data"
                    glyph={glyph}
                    overflowItems={[{ id: "one", label: "Expand all sections", onSelect }]}
                    onClose={vi.fn()}
                />,
            );

            fireEvent.click(screen.getByRole("button", { name: MORE_LABEL }));
            fireEvent.click(await screen.findByRole("menuitem", { name: "Expand all sections" }));

            expect(onSelect).toHaveBeenCalledTimes(1);
        });
    });

    describe("closing", () => {
        it("reports the close", () => {
            const onClose = vi.fn();

            render(<PanelHeader title="Explore" glyph={glyph} onClose={onClose} />);

            fireEvent.click(screen.getByRole("button", { name: CLOSE_PANEL_LABEL }));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});
