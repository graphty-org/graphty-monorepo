import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { compactTheme, RampRow } from "../../../src";
// AdvancedButton is the trailing control a caller reaches for; it is imported
// from its own module because the package entry point is owned by a later pass
// and still exports it only under its former name.
import { AdvancedButton } from "../../../src/components/rows/TrailingSlot";
import { PANEL_INK } from "../../../src/constants/panel";
import { LabelsProvider } from "../../../src/i18n";
import {
    type ActivationEvent,
    type ActivationHandler,
    type ActivationMeta,
    getActivationMeta,
} from "../../../src/types/events";

/**
 * The gradient a caller passes for the colour form, spelled the way the panel
 * spells colours: scheme-aware variables, never a hardcoded hex.
 */
const GRADIENT = "linear-gradient(to right, var(--mantine-color-default), var(--mantine-color-green-6))";

/**
 * The transform, its glyph and the English word the library ships for it.
 */
const CURVES = [
    ["sqrt", "scaleSqrt", "Square root scale"],
    ["linear", "scaleLinear", "Linear scale"],
    ["log", "scaleLog", "Logarithmic scale"],
] as const;

/**
 * Render inside the compact theme, the way the package is consumed.
 * @param ui - The element under test
 * @returns The testing-library render result
 */
function renderRow(ui: React.ReactElement): ReturnType<typeof render> {
    return render(<MantineProvider theme={compactTheme}>{ui}</MantineProvider>);
}

/**
 * Render inside the compact theme with the text direction reversed.
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
 * The text the row actually draws, with the parts that exist only to be
 * announced removed.
 *
 * Both of those parts are clipped by a stylesheet the test environment does not
 * load, so they cannot be told apart by their computed style; they are told
 * apart by the test hooks the row puts on them.
 * @param row - The row element
 * @returns The drawn text, with nothing hidden included
 */
function drawnText(row: HTMLElement): string {
    const copy = row.cloneNode(true);

    if (!(copy instanceof HTMLElement)) {
        throw new Error("cloning an element does not return an element");
    }

    for (const announced of copy.querySelectorAll("[data-testid^='ramp-row-a11y']")) {
        announced.remove();
    }

    return copy.textContent ?? "";
}

/**
 * What an activation handler saw, recorded while the event was still live.
 */
interface SeenActivation {
    /** The handler to hand to the component. */
    handler: ActivationHandler;
    /** How many times the handler has been called. */
    calls: number;
    /** Whether Shift was held down at the moment of activation. */
    shiftKey: boolean;
    /** The element the handler was attached to. */
    currentTarget: EventTarget | null;
    /** Whether the activation came from a pointer or from the keyboard. */
    source: ActivationMeta["source"] | undefined;
}

/**
 * An activation handler that records what it was given.
 *
 * React empties an event's `currentTarget` once the handler returns, so what
 * matters has to be read inside the handler rather than out of a recorded call.
 * @returns The handler, and the facts it recorded
 */
function readActivation(): SeenActivation {
    const seen: SeenActivation = {
        handler: (): void => undefined,
        calls: 0,
        shiftKey: false,
        currentTarget: null,
        source: undefined,
    };

    seen.handler = (event: ActivationEvent): void => {
        seen.calls += 1;
        seen.shiftKey = event.shiftKey;
        seen.currentTarget = event.currentTarget;
        seen.source = getActivationMeta(event).source;
    };

    return seen;
}

describe("RampRow", () => {
    describe("anatomy", () => {
        it("draws the two endpoint values and nothing else", () => {
            renderRow(<RampRow min="45" max="68" scale="sqrt" />);

            expect(screen.getByTestId("ramp-row-min")).toHaveTextContent("45");
            expect(screen.getByTestId("ramp-row-max")).toHaveTextContent("68");
        });

        it("carries no sentence anywhere on the row", () => {
            renderRow(<RampRow label="Node size by age" min="45" max="68" scale="sqrt" onScaleClick={vi.fn()} />);

            // The whole point of the type: the only text drawn is the two
            // endpoints. The phrase naming the mapping and the transform's word
            // are announced, never drawn.
            expect(drawnText(screen.getByTestId("ramp-row"))).toBe("4568");
        });

        it("takes exactly one row pitch", () => {
            renderRow(<RampRow min="45" max="68" />);

            expect(screen.getByTestId("ramp-row")).toHaveStyle({ height: "32px" });
        });

        it("draws the ramp at glyph height", () => {
            renderRow(<RampRow min="45" max="68" />);

            expect(screen.getByTestId("ramp-row-ramp")).toHaveStyle({ height: "14px" });
        });

        it("draws the endpoints at the small size in the secondary ink", () => {
            renderRow(<RampRow min="45" max="68" />);

            const low = screen.getByTestId("ramp-row-min");
            expect(low.style.color).toBe(PANEL_INK.CHROME);
            // Mantine's Text carries its size as a custom property rather than
            // as a font-size declaration; the compact theme resolves sm to 11px.
            expect(low).toHaveAttribute("data-size", "sm");
            expect(low.style.getPropertyValue("--text-fz")).toBe("var(--mantine-font-size-sm)");
            expect(compactTheme.fontSizes?.sm).toBe("11px");
        });

        it("never wraps or truncates an endpoint, however long the value", () => {
            renderRow(<RampRow min="1 234 567,89" max="9 876 543,21" />);

            // A truncated number is a wrong number, so the endpoints hold their
            // full text and the drawing gives up width instead.
            const low = screen.getByTestId("ramp-row-min");
            expect(low).toHaveTextContent("1 234 567,89");
            expect(low).toHaveStyle({ whiteSpace: "nowrap" });
            expect(low.style.textOverflow).toBe("");
        });

        it("accepts nodes as endpoints, not only strings", () => {
            renderRow(
                <RampRow min={<span data-testid="low">1 link</span>} max={<span data-testid="high">47 links</span>} />,
            );

            expect(screen.getByTestId("low")).toBeInTheDocument();
            expect(screen.getByTestId("high")).toBeInTheDocument();
        });

        it("keeps the drawing itself out of the accessibility tree", () => {
            renderRow(<RampRow min="45" max="68" />);

            // The shape is a mark of the image around it, and the image is what
            // carries the name.
            expect(screen.getByTestId("ramp-row-ramp")).toHaveAttribute("aria-hidden", "true");
        });

        it("renders the trailing slot even when it holds nothing", () => {
            renderRow(<RampRow min="45" max="68" />);

            const slot = screen.getByTestId("trailing-slot");
            expect(slot).toHaveStyle({ width: "24px" });
            expect(slot.children).toHaveLength(0);
        });
    });

    describe("the size form", () => {
        it("is the default", () => {
            renderRow(<RampRow min="45" max="68" />);

            expect(screen.getByTestId("ramp-row-ramp")).toHaveAttribute("data-variant", "size");
        });

        it("clips a wedge from 4px to 14px", () => {
            renderRow(<RampRow min="45" max="68" variant="size" />);

            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp.style.clipPath).toBe("polygon(0 calc(100% - 4px), 100% 0, 100% 100%, 0 100%)");
        });

        it("paints the wedge in the secondary ink", () => {
            renderRow(<RampRow min="45" max="68" variant="size" />);

            expect(screen.getByTestId("ramp-row-ramp").style.background).toBe(PANEL_INK.CHROME);
        });

        it("wears neither a border nor a radius", () => {
            renderRow(<RampRow min="45" max="68" variant="size" />);

            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp.style.border).toBe("");
            expect(ramp.style.borderRadius).toBe("");
        });

        it("ignores a gradient", () => {
            renderRow(<RampRow min="45" max="68" variant="size" gradient={GRADIENT} />);

            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp.style.background).not.toContain("linear-gradient");
            expect(ramp.style.clipPath).toContain("polygon");
        });
    });

    describe("the colour form", () => {
        it("paints the caller's gradient", () => {
            renderRow(<RampRow min="0.00" max="0.42" variant="color" gradient={GRADIENT} />);

            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp).toHaveAttribute("data-variant", "color");
            expect(ramp.style.background).toBe(GRADIENT);
        });

        it("falls back to a ramp from the surface to the accent", () => {
            renderRow(<RampRow min="0.00" max="0.42" variant="color" />);

            const { background } = screen.getByTestId("ramp-row-ramp").style;
            expect(background).toContain("linear-gradient");
            expect(background).toContain("--mantine-primary-color-filled");
        });

        it("is a bar at 2px radius on a 1px border, not a wedge", () => {
            renderRow(<RampRow min="0.00" max="0.42" variant="color" gradient={GRADIENT} />);

            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp.style.borderRadius).toBe("var(--mantine-radius-xs)");
            expect(ramp.style.border).toBe(`1px solid ${PANEL_INK.BORDER}`);
            expect(ramp.style.clipPath).toBe("");
        });
    });

    describe("right to left", () => {
        it("draws the wedge unmirrored where text runs left to right", () => {
            renderRow(<RampRow min="45" max="68" />);

            expect(screen.getByTestId("ramp-row-ramp").style.transform).toBe("");
        });

        it("mirrors the wedge where text runs right to left", () => {
            renderRtl(<RampRow min="45" max="68" />);

            // The endpoints swap ends with the text direction, so a wedge that
            // did not turn round would grow towards the low value. The clip
            // path is one polygon in the drawing's own coordinates and cannot
            // be written in logical terms, so the whole box turns round.
            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp.style.transform).toBe("scaleX(-1)");
            expect(ramp.style.clipPath).toBe("polygon(0 calc(100% - 4px), 100% 0, 100% 100%, 0 100%)");
        });

        it("draws a colour bar unmirrored where text runs left to right", () => {
            renderRow(<RampRow min="0.00" max="0.42" variant="color" gradient={GRADIENT} />);

            expect(screen.getByTestId("ramp-row-ramp").style.transform).toBe("");
        });

        it("mirrors the caller's gradient where text runs right to left, without rewriting it", () => {
            renderRtl(<RampRow min="0.00" max="0.42" variant="color" gradient={GRADIENT} />);

            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp.style.transform).toBe("scaleX(-1)");
            // Mirrored once, not twice: the caller's own "to right" is left
            // exactly as it was written, and turning the box round is what
            // makes it run from the low value to the high one.
            expect(ramp.style.background).toBe(GRADIENT);
        });

        it("mirrors the default gradient the same way", () => {
            renderRtl(<RampRow min="0" max="12" variant="color" />);

            const ramp = screen.getByTestId("ramp-row-ramp");
            expect(ramp.style.transform).toBe("scaleX(-1)");
            expect(ramp.style.background).toContain("to right");
        });

        it("mirrors the drawing only, never the values beside it", () => {
            renderRtl(<RampRow min="45" max="68" scale="sqrt" />);

            // A mirrored value would be drawn back to front. The values follow
            // the text direction because they are laid out in document order.
            expect(screen.getByTestId("ramp-row-min").style.transform).toBe("");
            expect(screen.getByTestId("ramp-row-max").style.transform).toBe("");
        });

        it("keeps the low value first in document order in both directions", () => {
            const { unmount } = renderRow(<RampRow min="45" max="68" />);
            const ltr = screen.getByTestId("ramp-row-figure").textContent;
            unmount();

            renderRtl(<RampRow min="45" max="68" />);
            const rtl = screen.getByTestId("ramp-row-figure").textContent;

            // The row states the low value first and lets the direction decide
            // which end that is, which is what the mirrored drawing follows.
            expect(ltr).toBe("4568");
            expect(rtl).toBe("4568");
        });

        it("puts the trail gap on a logical margin, so it follows the direction", () => {
            renderRtl(<RampRow min="45" max="68" />);

            const wrapper = screen.getByTestId("trailing-slot").parentElement;
            expect(wrapper).not.toBeNull();
            expect(wrapper).toHaveStyle({ marginInlineStart: "4px" });
            expect(wrapper?.style.marginLeft).toBe("");
        });
    });

    describe("the transform's word", () => {
        it.each(CURVES)("draws %s as the %s glyph and names it %s in English", (scale, glyph, name) => {
            const { container } = renderRow(<RampRow min="45" max="68" scale={scale} />);

            expect(container.querySelector(`[data-glyph="${glyph}"]`)).toBeInTheDocument();
            expect(screen.getByTestId("ramp-row-scale")).toHaveAttribute("title", name);
            expect(screen.getByTestId("ramp-row-a11y-scale")).toHaveTextContent(name);
        });

        it.each(CURVES)("takes the %s word from the label set", (scale, _glyph, english) => {
            renderRow(
                <LabelsProvider
                    labels={{
                        scaleSqrt: "Echelle racine carree",
                        scaleLinear: "Echelle lineaire",
                        scaleLog: "Echelle logarithmique",
                    }}
                >
                    <RampRow label="Taille" min="45" max="68" scale={scale} />
                </LabelsProvider>,
            );

            const translated = screen.getByTestId("ramp-row-a11y-scale").textContent ?? "";
            expect(translated).toMatch(/^Echelle/);
            expect(translated).not.toBe(english);
            expect(screen.getByTestId("ramp-row-scale")).toHaveAttribute("title", translated);
            expect(screen.getByRole("img")).toHaveAccessibleName(`Taille 45 68 ${translated}`);
        });

        it("translates the name of the curve when it is a button", async () => {
            renderRow(
                <LabelsProvider labels={{ scaleLog: "Echelle logarithmique" }}>
                    <RampRow min="1" max="47" scale="log" onScaleClick={vi.fn()} />
                </LabelsProvider>,
            );

            expect(await screen.findByRole("button", { name: "Echelle logarithmique" })).toBeInTheDocument();
        });

        it("leaves the other two words English when only one is replaced", () => {
            renderRow(
                <LabelsProvider labels={{ scaleLog: "Echelle logarithmique" }}>
                    <RampRow min="45" max="68" scale="linear" />
                </LabelsProvider>,
            );

            expect(screen.getByTestId("ramp-row-a11y-scale")).toHaveTextContent("Linear scale");
        });
    });

    describe("the accessible name of the drawing", () => {
        it("is one image, not a loose pair of numbers", () => {
            renderRow(<RampRow min="45" max="68" />);

            expect(screen.getAllByRole("img")).toHaveLength(1);
            expect(screen.getByRole("img")).toHaveAccessibleName("45 68");
        });

        it("reads the phrase naming the mapping first", () => {
            renderRow(<RampRow label="Node size by age" min="45" max="68" />);

            expect(screen.getByRole("img")).toHaveAccessibleName("Node size by age 45 68");
        });

        it("reads the transform last", () => {
            renderRow(<RampRow label="Node size by age" min="45" max="68" scale="sqrt" />);

            expect(screen.getByRole("img")).toHaveAccessibleName("Node size by age 45 68 Square root scale");
        });

        it("names the range even when the endpoints are nodes rather than strings", () => {
            renderRow(<RampRow label="Bridges" min={<span>1 link</span>} max={<span>47 links</span>} scale="log" />);

            expect(screen.getByRole("img")).toHaveAccessibleName("Bridges 1 link 47 links Logarithmic scale");
        });

        it("never draws the phrase naming the mapping", () => {
            renderRow(<RampRow label="Node size by age" min="45" max="68" />);

            expect(drawnText(screen.getByTestId("ramp-row"))).toBe("4568");
        });

        it("keeps the transform in the name when a caller's control replaces the curve", () => {
            renderRow(
                <RampRow
                    label="Node size by age"
                    min="45"
                    max="68"
                    scale="sqrt"
                    trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />}
                />,
            );

            // The mapping is still in force even though its curve is no longer
            // drawn, so it is still announced.
            expect(screen.getByRole("img")).toHaveAccessibleName("Node size by age 45 68 Square root scale");
        });
    });

    describe("values that arrive later", () => {
        it("is silent by default", () => {
            renderRow(<RampRow label="Node color by betweenness" min="0.00" max="0.42" />);

            const figure = screen.getByTestId("ramp-row-figure");
            expect(figure).not.toHaveAttribute("aria-live");
            expect(figure).not.toHaveAttribute("aria-busy");
        });

        it("becomes a polite region as soon as the row says it can be busy", () => {
            renderRow(<RampRow label="Node color by betweenness" min="--" max="--" busy={false} />);

            const figure = screen.getByTestId("ramp-row-figure");
            // Registered while the row is still idle, because a live region has
            // to exist before the change it announces.
            expect(figure).toHaveAttribute("aria-live", "polite");
            expect(figure).toHaveAttribute("aria-atomic", "true");
            expect(figure).toHaveAttribute("aria-busy", "false");
        });

        it("marks the drawing busy while the values are being computed", () => {
            renderRow(<RampRow label="Node color by betweenness" min="--" max="--" busy />);

            expect(screen.getByTestId("ramp-row-figure")).toHaveAttribute("aria-busy", "true");
        });

        it("announces the whole range once, not one value at a time", () => {
            const { rerender } = renderRow(
                <MantineProvider theme={compactTheme}>
                    <RampRow label="Node color by betweenness" min="--" max="--" busy />
                </MantineProvider>,
            );

            rerender(
                <MantineProvider theme={compactTheme}>
                    <RampRow label="Node color by betweenness" min="0.00" max="0.42" busy={false} />
                </MantineProvider>,
            );

            const figure = screen.getByTestId("ramp-row-figure");
            expect(figure).toHaveAttribute("aria-atomic", "true");
            expect(figure).toHaveAttribute("aria-busy", "false");
            expect(screen.getByRole("img")).toHaveAccessibleName("Node color by betweenness 0.00 0.42");
        });
    });

    describe("the curve as a control", () => {
        it("is a picture, not a control, when there is nothing to open", () => {
            renderRow(<RampRow min="45" max="68" scale="sqrt" />);

            expect(screen.queryByRole("button")).not.toBeInTheDocument();
            // Its word is already in the drawing's name, so announcing the
            // picture again would say everything twice.
            expect(screen.getByTestId("ramp-row-scale")).toHaveAttribute("aria-hidden", "true");
        });

        it.each(CURVES)("opens the choice of transforms from the %s curve", async (scale, _glyph, name) => {
            const onScaleClick = vi.fn();
            renderRow(<RampRow min="45" max="68" scale={scale} onScaleClick={onScaleClick} />);

            await userEvent.click(screen.getByRole("button", { name }));

            expect(onScaleClick).toHaveBeenCalledTimes(1);
        });

        it("hands the consumer the event, with its modifier keys", async () => {
            const user = userEvent.setup();
            const seen = readActivation();
            renderRow(<RampRow min="45" max="68" scale="sqrt" onScaleClick={seen.handler} />);

            const button = screen.getByRole("button", { name: "Square root scale" });
            await user.keyboard("{Shift>}");
            await user.click(button);
            await user.keyboard("{/Shift}");

            // Shift-clicking a curve is how a consumer applies one transform to
            // every ramp at once, and it is impossible unless the event is
            // handed over.
            expect(seen.shiftKey).toBe(true);
            expect(seen.currentTarget).toBe(button);
            expect(seen.source).toBe("pointer");
        });

        it("reaches the curve by Tab and opens it with Enter, reporting a keyboard activation", async () => {
            const user = userEvent.setup();
            const seen = readActivation();
            renderRow(<RampRow min="45" max="68" scale="sqrt" onScaleClick={seen.handler} />);

            await user.tab();
            expect(screen.getByRole("button", { name: "Square root scale" })).toHaveFocus();

            await user.keyboard("{Enter}");

            expect(seen.calls).toBe(1);
            expect(seen.source).toBe("keyboard");
        });

        it("opens the curve with Space", async () => {
            const onScaleClick = vi.fn();
            renderRow(<RampRow min="45" max="68" scale="linear" onScaleClick={onScaleClick} />);

            await userEvent.tab();
            await userEvent.keyboard(" ");

            expect(onScaleClick).toHaveBeenCalledTimes(1);
        });

        it("puts nothing in the tab order when the curve is only a picture", async () => {
            renderRow(<RampRow min="45" max="68" scale="sqrt" />);

            await userEvent.tab();

            expect(document.body).toHaveFocus();
        });

        it("never reports a changed setting: the transform is shown, not hidden", () => {
            renderRow(<RampRow min="45" max="68" scale="log" onScaleClick={vi.fn()} />);

            expect(screen.getByTestId("advanced-button")).toHaveAttribute("data-changed", "false");
        });

        it("draws no curve when the ramp names no transform", () => {
            const { container } = renderRow(<RampRow min="45" max="68" />);

            expect(container.querySelector("[data-glyph]")).toBeNull();
            expect(screen.queryByTestId("ramp-row-scale")).not.toBeInTheDocument();
            expect(screen.queryByTestId("ramp-row-a11y-scale")).not.toBeInTheDocument();
        });
    });

    describe("the trailing slot", () => {
        it("replaces the curve with the caller's own control", () => {
            const onClick = vi.fn();
            const { container } = renderRow(
                <RampRow
                    min="45"
                    max="68"
                    scale="sqrt"
                    trailing={<AdvancedButton label="Range and scale" onClick={onClick} />}
                />,
            );

            expect(screen.getByRole("button", { name: "Range and scale" })).toBeInTheDocument();
            expect(container.querySelector('[data-glyph="scaleSqrt"]')).toBeNull();
        });

        it("falls back to the curve when a conditional trailing control resolves to false", () => {
            const hasChanges = false;
            const { container } = renderRow(
                <RampRow
                    min="45"
                    max="68"
                    scale="sqrt"
                    trailing={hasChanges && <AdvancedButton label="Range and scale" onClick={vi.fn()} />}
                />,
            );

            // `trailing={condition && <Button />}` is the common conditional
            // form, and false has to mean "nothing of my own" rather than
            // "leave the slot empty".
            expect(container.querySelector('[data-glyph="scaleSqrt"]')).toBeInTheDocument();
        });

        it("falls back to the curve when a trailing control resolves to null", () => {
            const { container } = renderRow(<RampRow min="45" max="68" scale="linear" trailing={null} />);

            expect(container.querySelector('[data-glyph="scaleLinear"]')).toBeInTheDocument();
        });

        it("holds the caller's control on a ramp that names no transform", () => {
            renderRow(
                <RampRow min="45" max="68" trailing={<AdvancedButton label="Range and scale" onClick={vi.fn()} />} />,
            );

            expect(screen.getByRole("button", { name: "Range and scale" })).toBeInTheDocument();
        });

        it("lands one trail gap from the drawing", () => {
            renderRow(<RampRow min="45" max="68" />);

            const wrapper = screen.getByTestId("trailing-slot").parentElement;
            // 4px row gap plus a 4px margin is the 8px trail gap of the grid.
            expect(wrapper).not.toBeNull();
            expect(wrapper).toHaveStyle({ marginInlineStart: "4px" });
        });
    });
});
