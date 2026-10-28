/**
 * The node and edge chip: its icon keeps 3:1 against every panel ground it is drawn on, in both
 * schemes, its text 4.5:1, a screen reader hears the kind, and with onClick it is a button a real
 * click activates.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { EntityChip } from "../../src";
import { part, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

type Rgba = [number, number, number, number];

/** A computed color as 0-255 channels and an alpha; reads rgb(), rgba() and color(srgb ...). */
function parse(color: string): Rgba {
    const numbers = (color.match(/[\d.]+/g) ?? []).map(Number);
    if (color.startsWith("color(")) {
        const [r, g, b, a = 1] = numbers;
        return [r * 255, g * 255, b * 255, a];
    }
    const [r, g, b, a = 1] = numbers;
    return [r, g, b, a];
}

/** A translucent color over an opaque one. */
function over(top: Rgba, ground: Rgba): Rgba {
    return [0, 1, 2].map((i) => top[i] * top[3] + ground[i] * (1 - top[3])).concat(1) as Rgba;
}

function luminance([r, g, b]: Rgba): number {
    const [lr, lg, lb] = [r, g, b].map((c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrast(a: Rgba, b: Rgba): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe("EntityChip", () => {
    for (const scheme of ["light", "dark"] as const) {
        for (const ground of ["--cm-bg", "--cm-bg-secondary"]) {
            it(`${scheme} on ${ground}: icon 3:1 on the panel and the tint, text 4.5:1`, async () => {
                const { container } = await renderThemed(
                    <div className="ground" style={{ background: `var(${ground})`, padding: 8 }}>
                        <EntityChip kind="node">60</EntityChip>
                        <EntityChip kind="edge">120</EntityChip>
                    </div>,
                    { scheme },
                );
                const panel = parse(getComputedStyle(part(container, ".ground")).backgroundColor);
                for (const kind of ["node", "edge"]) {
                    const chip = part(container, `.cm-entity-chip[data-kind="${kind}"]`);
                    const tint = over(parse(getComputedStyle(chip).backgroundColor), panel);
                    const icon = parse(getComputedStyle(part(chip, ".cm-entity-icon")).color);
                    const text = over(parse(getComputedStyle(part(chip, ".cm-entity-text")).color), tint);
                    expect(tint, `${kind} draws a tint`).not.toEqual(panel);
                    expect(contrast(icon, panel), `${kind} icon on the panel`).toBeGreaterThanOrEqual(3);
                    expect(contrast(icon, tint), `${kind} icon on its tint`).toBeGreaterThanOrEqual(3);
                    expect(contrast(text, tint), `${kind} text`).toBeGreaterThanOrEqual(4.5);
                }
            });
        }
    }

    it("draws node and edge in different colors", async () => {
        const { container } = await renderThemed(
            <>
                <EntityChip kind="node">1</EntityChip>
                <EntityChip kind="edge">1</EntityChip>
            </>,
        );
        const [node, edge] = [...container.querySelectorAll(".cm-entity-icon")].map((el) => getComputedStyle(el).color);
        expect(node).not.toBe(edge);
    });

    it("speaks the kind before the content", async () => {
        await renderThemed(
            <>
                <EntityChip kind="node">60</EntityChip>
                <EntityChip kind="edge">TP53 - MDM2</EntityChip>
            </>,
        );
        await expect.element(page.getByText("Node 60")).toBeInTheDocument();
        await expect.element(page.getByText("Edge TP53 - MDM2")).toBeInTheDocument();
    });

    it("is a span without onClick, and a button a click activates with it", async () => {
        const onClick = vi.fn();
        const { container } = await renderThemed(
            <>
                <EntityChip kind="node">5</EntityChip>
                <EntityChip kind="node" onClick={onClick}>
                    140 of 900
                </EntityChip>
            </>,
        );
        expect(container.querySelector("span.cm-entity-chip")).not.toBeNull();
        await userEvent.click(page.getByRole("button", { name: "Node 140 of 900" }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
