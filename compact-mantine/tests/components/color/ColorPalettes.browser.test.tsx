import { composeStories, setProjectAnnotations } from "@storybook/react";
import { screen, within } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import preview from "../../../.storybook/preview";
import { CompactColorInput, PopoutManager } from "../../../src";
import { type ColorPalette, PaletteBrowser } from "../../../src/components/color/PaletteBrowser";
import * as ColorPalettes from "../../../stories/components/color/ColorPalettes.stories";
import { axeFindings } from "../../a11y/axe";
import { renderThemed, resetHarness } from "../../harness/measure";

const OKABE = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#000000"];
const THREE: ColorPalette[] = [
    { id: "okabe", name: "Okabe Ito", colors: OKABE },
    { id: "warm", name: "Warm", colors: ["#7F0000", "#D7301F", "#FC8D59"] },
    { id: "blues", name: "Blues", colors: ["#DEEBF7", "#4292C6", "#08519C"] },
];
const TWELVE: ColorPalette[] = [
    ...THREE,
    ...["Greens", "Grays", "Purples", "Earth tones", "Pastel", "Bold primaries", "Night sky", "Deep sea", "Sunset"].map(
        (name) => ({ id: name.toLowerCase(), name, colors: ["#111111", "#888888"] }),
    ),
];

afterEach(async () => {
    await resetHarness();
});

/**
 * Open the picker from its chit.
 * @returns the pop-out panel
 */
async function openPicker(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: /^pick/i }));
    return screen.findByRole("dialog");
}

/**
 * The swatch buttons' colors, in order, read from their names ("orange E69F00").
 * @param panel - the pop-out panel
 * @returns the hex of each swatch, upper case with "#"
 */
function swatchColors(panel: HTMLElement): string[] {
    const group = within(panel).getByRole("group", { name: "Swatches" });
    return within(group)
        .getAllByRole("button")
        .map((button) => `#${/([0-9A-F]{6})/.exec(button.getAttribute("aria-label") ?? "")?.[1] ?? ""}`);
}

describe("CompactColorInput Palettes tab", () => {
    it("without palettes the header is a title and there is no tablist", async () => {
        await renderThemed(
            <PopoutManager>
                <CompactColorInput label="Fill" defaultColor="#3373E5" />
            </PopoutManager>,
        );
        const panel = await openPicker();
        assert.isNull(within(panel).queryByRole("tablist"));
        assert.strictEqual(within(panel).getByRole("heading").textContent, "Fill");
    });

    it("a picked palette goes to onSwatchesChange and becomes the swatches on Custom", async () => {
        const onSwatchesChange = vi.fn();
        await renderThemed(
            <PopoutManager>
                <CompactColorInput
                    label="Fill"
                    defaultColor="#3373E5"
                    palettes={THREE}
                    onSwatchesChange={onSwatchesChange}
                />
            </PopoutManager>,
        );
        const panel = await openPicker();
        await userEvent.click(within(panel).getByRole("tab", { name: "Palettes" }));
        await userEvent.click(within(panel).getByRole("button", { name: "Okabe Ito, 8 colors" }));
        assert.deepEqual(onSwatchesChange.mock.calls, [[OKABE]]);
        // The tab stays on Palettes with the row marked.
        assert.strictEqual(
            within(panel).getByRole("button", { name: "Okabe Ito, 8 colors" }).getAttribute("aria-pressed"),
            "true",
        );
        await userEvent.click(within(panel).getByRole("tab", { name: "Custom" }));
        assert.deepEqual(swatchColors(panel), OKABE);
    });

    it("keeps the loaded swatches itself without onSwatchesChange", async () => {
        await renderThemed(
            <PopoutManager>
                <CompactColorInput label="Fill" defaultColor="#3373E5" palettes={THREE} />
            </PopoutManager>,
        );
        const panel = await openPicker();
        await userEvent.click(within(panel).getByRole("tab", { name: "Palettes" }));
        await userEvent.click(within(panel).getByRole("button", { name: "Warm, 3 colors" }));
        await userEvent.click(within(panel).getByRole("tab", { name: "Custom" }));
        assert.deepEqual(swatchColors(panel), ["#7F0000", "#D7301F", "#FC8D59"]);
    });

    it("the caller's stored swatches mark their palette as chosen", async () => {
        /**
         * A caller that stores the swatches.
         * @returns the field
         */
        function Stored(): React.JSX.Element {
            const [swatches, setSwatches] = useState<readonly string[]>(THREE[2].colors);
            return (
                <CompactColorInput
                    label="Fill"
                    defaultColor="#3373E5"
                    palettes={THREE}
                    swatches={swatches}
                    onSwatchesChange={setSwatches}
                />
            );
        }
        await renderThemed(
            <PopoutManager>
                <Stored />
            </PopoutManager>,
        );
        const panel = await openPicker();
        await userEvent.click(within(panel).getByRole("tab", { name: "Palettes" }));
        assert.strictEqual(
            within(panel)
                .getByRole("button", { name: /^Blues/ })
                .getAttribute("aria-pressed"),
            "true",
        );
        await userEvent.click(within(panel).getByRole("button", { name: /^Warm/ }));
        assert.strictEqual(within(panel).getByRole("button", { name: /^Warm/ }).getAttribute("aria-pressed"), "true");
        assert.strictEqual(
            within(panel)
                .getByRole("button", { name: /^Blues/ })
                .getAttribute("aria-pressed"),
            "false",
        );
    });

    it("the keyboard reaches and picks a palette", async () => {
        const onSwatchesChange = vi.fn();
        await renderThemed(
            <PopoutManager>
                <CompactColorInput
                    label="Fill"
                    defaultColor="#3373E5"
                    palettes={THREE}
                    onSwatchesChange={onSwatchesChange}
                />
            </PopoutManager>,
        );
        screen.getByRole("button", { name: /^pick/i }).focus();
        await userEvent.keyboard("{Enter}");
        const panel = await screen.findByRole("dialog");
        within(panel).getByRole("tab", { name: "Custom" }).focus();
        await userEvent.keyboard("{ArrowRight}");
        await expect
            .poll(() => within(panel).getByRole("tab", { name: "Palettes" }).getAttribute("aria-selected"))
            .toBe("true");
        // From the tab, Tab moves past the close button into the list.
        const okabe = within(panel).getByRole("button", { name: /^Okabe Ito/ });
        const stops: Element[] = [];
        for (let step = 0; step < 4 && document.activeElement !== okabe; step++) {
            await userEvent.tab();
            stops.push(document.activeElement ?? document.body);
        }
        assert.strictEqual(
            document.activeElement,
            okabe,
            `Tab stops: ${stops.map((e) => e.outerHTML.slice(0, 80)).join(" | ")}`,
        );
        await userEvent.keyboard("{ArrowDown}");
        assert.strictEqual(document.activeElement, within(panel).getByRole("button", { name: /^Warm/ }));
        await userEvent.keyboard("{Enter}");
        assert.deepEqual(onSwatchesChange.mock.calls, [[THREE[1].colors]]);
    });
});

describe("PaletteBrowser", () => {
    it("searches by word start from searchFrom palettes", async () => {
        await renderThemed(<PaletteBrowser palettes={TWELVE} onPick={vi.fn()} />);
        await userEvent.type(screen.getByRole("searchbox", { name: "Find palette" }), "to");
        const list = screen.getByRole("group", { name: "Palettes" });
        assert.deepEqual(
            within(list)
                .getAllByRole("button")
                .map((b) => b.textContent),
            ["Earth tones"],
        );
        await userEvent.clear(screen.getByRole("searchbox", { name: "Find palette" }));
        await userEvent.type(screen.getByRole("searchbox", { name: "Find palette" }), "zz");
        assert.strictEqual(screen.getByRole("status").textContent, 'No palette matches "zz"');
    });

    it("has no search box under searchFrom", async () => {
        await renderThemed(<PaletteBrowser palettes={THREE} onPick={vi.fn()} />);
        assert.isNull(screen.queryByRole("searchbox"));
    });

    it("draws each palette's colors as equal segments of its strip", async () => {
        await renderThemed(<PaletteBrowser palettes={THREE} onPick={vi.fn()} />);
        const row = screen.getByRole("button", { name: /^Okabe Ito/ });
        const segments = Array.from(row.querySelectorAll<HTMLElement>(".cm-palettes-strip > span"));
        assert.strictEqual(segments.length, OKABE.length);
        const widths = new Set(segments.map((s) => Math.round(s.getBoundingClientRect().width)));
        assert.strictEqual(widths.size, 1);
        assert.strictEqual(getComputedStyle(segments[0]).backgroundColor, "rgb(230, 159, 0)");
    });

    it("keeps a long name inside the 240px list, cut short", async () => {
        const long = { id: "long", name: "A palette with a name far too long for its row", colors: OKABE };
        await renderThemed(<PaletteBrowser palettes={[long]} onPick={vi.fn()} />);
        assert.strictEqual(screen.getByTestId("palette-browser").getBoundingClientRect().width, 240);
        const row = screen.getByRole("button", { name: /^A palette/ });
        assert.isAtMost(row.getBoundingClientRect().width, 240);
        const name = row.querySelector<HTMLElement>(".cm-palettes-name");
        assert.isNotNull(name);
        assert.isAbove(name.scrollWidth, name.clientWidth);
    });
});

setProjectAnnotations(preview);

describe("ColorPalettes stories have no axe violations", () => {
    const stories = composeStories(ColorPalettes, { initialGlobals: { theme: "light", contrast: "high" } });
    it.each(Object.entries(stories))("%s", async (_name, Story) => {
        const canvasElement = document.createElement("div");
        document.body.appendChild(canvasElement);
        await Story.run({ canvasElement });
        const chit = within(canvasElement).queryByRole("button", { name: /^pick/i });
        if (chit !== null) {
            await userEvent.click(chit);
            await userEvent.click(await screen.findByRole("tab", { name: "Palettes" }));
        }
        assert.deepEqual(await axeFindings("high"), []);
        document.body.innerHTML = "";
    });
});
